# motion-ui — Project Status

Last updated: 2026-07-12

## Architecture snapshot (stable, updated occasionally)

- **Product shape**: style prompt in the left panel → Anthropic API generates design tokens (color / type / radius / motion) → eight preview components apply them live; the panel also offers manual refinement (bezier editor, spring sliders, three expression sliders).
- **Two skills, two jobs**: `.claude/skills/motion-ui/` (Skill A) governs how CC writes components; `src/app/api/generate/skill.ts` (Skill B) governs what tokens get generated at runtime. On design-judgment conflicts, Skill B wins.
- **Token system**: continuous tokens (spring triple, bezier, durationScale, entranceDistance, staggerDelay, fontSizeScale) + two discrete semantic tokens (revealGranularity: character/word/phrase; thinkingPosture: breathe/pulse/bounce). Selection rules derive from style qualities, never from style-name lookup.
- **Deliberate non-consumption must be declared**: when a component intentionally does not consume a token (Thinking Indicator ↛ entranceDistance — loops have no entrance; Skeleton's 800ms content-reading stagger ↛ staggerDelay — wrong time scale), the code carries a `// deliberate:` comment stating why. Silent hardcoding is indistinguishable from a bug.
- **entranceDistance and durationScale are independent axes**: what the eye reads is their ratio (velocity = distance / duration). Calm = long distance ÷ long duration (low velocity); mechanical = short distance ÷ short duration (short throw); playful = long distance ÷ short duration. Short distance + long duration reads as _hesitant_, not calm — that is the failure mode.
- **Engine choice is a design decision, not a default**: spring for objects that travel under force (Drawer, Dialog, Toast); tween + bezier for things that _materialize_ (text). Text must not overshoot, so Streaming Text uses no spring at all.
- **Token unit is scale-relative**: `entranceDistance` is a panel-scale px token. Text-scale consumers must convert it to em (anchored to the line), never clamp it in px — clamping hardcodes taste back into the component.
- **Two-layer motion architecture**: expression-primary components consume all motion tokens (via `useMotionTokens()`, springs time-scaled by durationScale as `scaledSpring` — verified in Drawer/Dialog/Toast, damping ratio preserved); functional-primary components consume selectively — texture yes (bezier + clamped spring, stiffness ≥ 300), timing no (durationScale/staggerDelay/entranceDistance), using the raw spring. Verified in Command Palette & Context Menu. Known ceiling: scaledSpring aligns spring and tween _approximately_; per-component the eye accepted it (Drawer). If a component can't tolerate the residual desync, the escalation path is single-engine (Streaming Text precedent).
- **Auto-replay**: debounced motionKey; expression-primary components re-enter 300ms after the last parameter change.

## Component progress

| Component          | Class              | Status                               | Key decisions                                                                                                                                                                                                                                                                 |
| ------------------ | ------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Command Palette    | functional-primary | done; selective consumption verified | timing-independent (0 durationScale refs); texture via bezier + stiffness ≥ 300 clamp                                                                                                                                                                                         |
| Toast              | split              | done                                 | trigger path = functional; entrance orchestration = expressive, reuses the real trigger path one by one, no replay button                                                                                                                                                     |
| Context Menu       | functional-primary | done; selective consumption verified | clamp was computed but never applied (dead variables) — CC half-done pattern caught by asking "who consumes it"; now wired to the open spring; highlight color consumes color tokens                                                                                          |
| Drawer             | expression-primary | done                                 | right-side detail panel, drag-to-dismiss                                                                                                                                                                                                                                      |
| Skeleton → Content | expression-primary | done; luxury lift verified           | content reveals with a y lift (entranceDistance normalized to card scale, ≤10px, tween+bezier shared with opacity); 800ms content-reading stagger deliberately does NOT consume staggerDelay (declared in code)                                                               |
| Multi-step Dialog  | expression-primary | done                                 | popLayout ghosting fixed (position: relative parent); slide distance in percentages (Emil pattern)                                                                                                                                                                            |
| Streaming Text     | expression-primary | done; luxury verified floating       | three granularities live; per-granularity interval basis (staggerDelay dropped — wrong scale); fadeDuration derived from interval via an overlap ratio (phrase 0.8 / word 0.6 / character 0); y is tween+bezier, no spring; yOffset in em                                     |
| Thinking Indicator | expression-primary | done; three postures verified        | consumes thinkingPosture (breathe: luminance + scale ≤1.06 / pulse: sequential lighting, strictly even, zero displacement / bounce: y hop, amplitude = posture constant, deliberately not entranceDistance); all tweens, no spring; staggerDelay = phase offset (correct use) |

## Open issues

None. (Panel type-size fix visually verified 2026-07-12.)

## Todo (by priority)

1. route.ts post-processing layer: enforce damping ≥ critical for heavy styles in code (judgment to AI, math to code)
2. Full acceptance pass: generate all four suggestions, check the five judgments (no black backgrounds / type carries style / playful has layered color / brutalist pen-line feel / motion follows style while functional components stay fast)
3. Seven-parameter extreme-value survey → token × component impact matrix (portfolio material)
4. "Fixed motion" badge on functional-primary cells (turn deliberate stillness from a suspected bug into a declared stance)
5. Confirm skill.ts section 4 is synced to the selective-consumption wording
6. Reconcile COMPONENTS.md against the code; code wins
7. (Later) Tokens-area IA restructure: merge Color & Type and Motion under a unified Tokens hierarchy

## Lessons & methodology (append-only, one or two lines each)

- Use rolling model aliases (claude-sonnet-4-6), never dated snapshots — AI-generated code's correctness has a timestamp
- Commit before every CC change; git is the acceptance gate for AI output
- Motion requests to CC: lock onto an existing path ("call the same function") instead of describing a new animation
- CC over-generalizes constraints ("don't consume tokens" leaked into highlight colors) — functional constraints govern timing only; visuals always consume tokens
- When CC's "done" can't be trusted, demand evidence (paste the exact lines consuming the tokens)
- Judgment is concrete: reacting to a specific cliché ("I would / wouldn't") beats defining aesthetics in the abstract
- Skills encode methodology (quality → parameter derivation), never lookup tables (style name → parameters)
- LLMs are unreliable at executing math constraints (critical damping) — judgment to AI, math to code post-processing
- popLayout requires a position: relative parent
- Mechanical feel requires strictly even intervals: even reads as intent, uneven reads as lag
- x-height differences need size compensation: classical serifs get fontSizeScale 1.05–1.15
- **Diagnose by computing the derived quantity, not by inspecting single token values.** Every token in Streaming Text looked "wired" and correct; the bug only appeared once fadeDuration/interval (6.44), yOffset (1.8px) and damping ratio (0.796) were written down as numbers.
- **A token name is not its semantics.** `staggerDelay` (90ms) is correct list offsetting and catastrophic text rhythm — the same number, two incompatible time scales. Text reveal intervals must come from _how long a unit takes to read_, not from a list-offset token.
- **Continuous tokens collapse too, and more invisibly than discrete ones.** The model bound `entranceDistance` to energy, so distance and duration became inversely correlated, velocity stayed constant, and every style differed only in speed. Symptom: calm 14 vs. mechanical 12 — a three-way axis behaving as a binary.
- **A discrete token's failure mode is the middle value silently defaulting.** Three enum values do not mean three behaviours; the three must be samples of one real axis, or the middle one collapses. (revealGranularity's true axis: _how much of the generation process the style admits to_ — character = old machine, word = an LLM's honest output unit, phrase = finished thought, labour hidden.)
- **Two animation channels on two engines never land together.** opacity on a tween + y on a spring is a permanent desync; if the thing shouldn't overshoot, use one engine for both and they share a duration and a curve by construction.
- **Deleting a clamp is not enough — replace the unit.** Re-adding a "minimum lift" would have hardcoded taste back into the component; converting to em anchored the displacement to the text's own scale and let the token stay dimensionless.
- **Easing is perceived through displacement, not brightness.** With yOffset at 1.8px, `bezier` was generated, consumed, and completely invisible — a live token with zero perceptual effect.
- **When two styles need to animate _different properties_, parameterization has hit its ceiling — promote to a discrete token.** Continuous tokens tune "how much"; discrete tokens choose "which kind". A breathing loop cannot become a bounce by adjusting durationScale; thinkingPosture had to exist.
- **A loop has no entrance.** entranceDistance is entrance semantics; a continuous state's amplitude is a posture constant. "Expression-primary consumes all motion tokens" is a lazy rule — the real rule is "consumes every token that has semantics for this component."
- **The same symptom, opposite diseases.** Skeleton and Thinking Indicator both "didn't respond to styles": Skeleton failed to consume a token it needed (wiring problem); Thinking Indicator had no token that could express the difference (design problem — a missing axis). Near-identical diagnostic reports, entirely different fixes.
- **Deliberate non-consumption without a declaration is indistinguishable from a bug.** Every intentional "this component ignores token X" now carries a `// deliberate:` comment with the reason.
- **"Computed but never applied" is CC's subtlest half-done pattern.** The ContextMenu clamp existed as dead variables; searching "does the clamp exist" passes, asking "who consumes it" fails. Verification must trace a value to its consumer, not just to its definition.
- **Backlog before features.** Two fixes sat "sent but unverified" across multiple sessions while new work kept jumping the queue; both turned out one command away from closable. Unverified fixes are liabilities, not progress.

## Interview narrative lines (append-only)

- Two skills, two jobs: dev-time rules for how AI writes code + runtime rules for how AI makes design decisions = two concrete instances of "the design system as an AI-readable, AI-consumable, AI-generatable asset"
- Two-layer motion: the functional layer stays constant (a component opened a hundred times a day must never slow down), the expressive layer carries style; "functional components consume texture selectively" is one level finer than all-or-nothing
- Anti-cliché mechanism: the skill encodes a derive-from-the-core methodology rather than a style lookup table, so it handles arbitrary input ("the loneliness of a late-night convenience store")
- Spring time-scaling: durationScale can't act on a spring's physics, solved with a damping-ratio-preserving transform (stiffness/s², damping/s) — design perception, system diagnosis, and math resolution in one chain
- Judgment to AI, math to code: the post-processing split
- Discrete semantic tokens (revealGranularity): an enum is the executor's vocabulary, not a taxonomy — the intelligence lives in the mapping layer, not the option count
- **The Streaming Text case — one symptom, four bugs on four different layers.** "Luxury feels like thud-thud-thud" turned out to be: (1) a _token-semantics_ bug — `staggerDelay` reused as text rhythm, two orders of magnitude off; (2) a _unit_ bug — a panel-scale px token consumed by text, clamped to 1.8px, so the motion was effectively off; (3) an _engine_ bug — opacity on a tween and y on a spring, two time engines that cannot land together, plus an underdamped spring waiting to overshoot; (4) a _generation_ bug — the skill had bound distance to energy, so distance and duration were inversely correlated and every style ended up at the same velocity. Each layer looked healthy in isolation. The method that found them was refusing to trust "wired = working" and computing the derived quantities instead.
- **Velocity is what the eye reads, not distance or duration.** Calm is a long distance crossed slowly — short distance plus long duration reads as _hesitation_. Getting that into the skill was the single change that made luxury float; no component code was involved.
- **Engine selection as design judgment.** Text materializes; it does not travel under force. Removing the spring from Streaming Text wasn't a simplification — it's the claim that a spring's whole value is its ability to overshoot, and text must never overshoot. Springs stay where objects move (Drawer, Dialog); tweens go where things appear.
- **The eye is the acceptance gate; the numbers are only the diagnosis.** Every fix in this round was found in arithmetic and confirmed in one sentence: "does luxury float?"
- **thinkingPosture: knowing when to promote from continuous to discrete.** The Thinking Indicator consumed every relevant token and still couldn't express mechanical vs. serene — because breathe and bounce animate _different properties_. The judgment "parameterization has a ceiling, and this is where it is" is design judgment encoded as architecture; the enum's middle value (pulse = sequential lighting) was designed to hold its own semantics so it cannot silently collapse.
- **Two components, one symptom, opposite root causes.** Skeleton wasn't consuming a token it needed; Thinking Indicator needed a token that didn't exist. The diagnostic method (compute derived quantities, demand pasted evidence) distinguished a wiring bug from a missing design axis — the reports looked the same, the fixes shared nothing.
- **Declared stillness.** Every deliberate non-consumption (loop amplitude ↛ entranceDistance, reading rhythm ↛ staggerDelay) is annotated in code with its reason — turning "suspiciously hardcoded" into "a stated design position." The system's completeness includes knowing, and saying, where tokens must _not_ reach.
