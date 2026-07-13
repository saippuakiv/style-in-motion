# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Project status

@docs/PROGRESS.md — tracks current project status, open issues, and prioritized todos. Read this at the start of every session to understand where the project stands.

When any of the following happens, prompt me to update `docs/PROGRESS.md` or update it directly:
- An open issue is resolved — remove it from "Open issues" and compress it to one line in "Lessons & methodology"
- A new architectural decision is made
- A component reaches done status

Make incremental edits only; preserve the existing document structure. Do not rewrite the whole file.

## Commands

```bash
npm run dev      # start Next.js dev server (localhost:3000)
npm run build    # production build
npm run start    # serve production build
```

No test runner or linter is configured. TypeScript is checked implicitly by Next.js on build; `tsc --noEmit` will surface type errors without building.

Requires `ANTHROPIC_API_KEY` in `.env.local` for the token-generation API route to work.

## What this project is

A motion-first React component playground. A user types a style prompt → the Anthropic API returns design tokens (color, type, radius, motion params) → eight preview components re-render live using those tokens.

Two parallel layers:
- **`src/`** — the running Next.js app (the portfolio piece)
- **`.claude/skills/motion-ui/`** — AI-readable design system rules that Claude reads before writing any component

## Architecture

### Token flow (end-to-end)

```
User prompt
  → POST /api/generate (src/app/api/generate/route.ts)
      uses SKILL_PROMPT from skill.ts as the system message
  → Anthropic API returns JSON matching DesignTokens (src/lib/api.ts)
  → App.tsx merges with DEFAULTS, stores in state
  → tokenVars() converts to CSS custom properties, scoped to <main>
  → MotionTokensProvider passes motion values to all components via context
```

### Two token scopes — never mix them

| Scope | Variables | Used by |
|---|---|---|
| Generated design system | `--color-*`, `--radius-*`, `--font-*`, `--text-*`, `--space-*`, `--duration-*`, `--ease-*` | Preview components (`src/components/`) |
| Shell/chrome | `--shell-*` | `App.tsx` sidebar, `BezierEditor`, `SpringEditor` |

`tokens.css` defines both. `shell.css` adds shell-only variables. Neither file should be edited when changing component visual style — use CSS variables only.

### MotionTokensContext (`src/lib/MotionTokensContext.tsx`)

The live motion token feed. Components call `useMotionTokens()` to get:
- `spring` — raw spring params from the user's sliders/generated tokens
- `scaledSpring` — time-scaled version: `stiffness / durationScale²`, `damping / durationScale`. **Expression-primary components use this**; functional-primary use clamped raw `spring`
- `bezier`, `durationScale`, `entranceDistance`, `staggerDelay`, `revealGranularity`

`scaledSpring` is computed inside `MotionTokensProvider` from the input values — callers (App.tsx) do not supply it.

### Component motion classification

**Functional-primary** (Command Palette, Context Menu, Toast trigger path):
- MAY consume: `bezier` (entrance curve), clamped `spring` (stiffness floored at 300)
- MUST NOT consume: `durationScale`, `staggerDelay`, `entranceDistance`, `scaledSpring`
- Durations stay hardcoded in the fast range; no stagger
- Comment this deliberate constraint in the code

**Expression-primary** (Streaming Text, Thinking Indicator, Skeleton, Drawer, Multi-step Dialog, Toast entrance):
- Consume all tokens; use `scaledSpring` not raw `spring`
- `revealGranularity` controls StreamingText reveal unit (character/word/phrase)

### `debouncedMotionKey` (App.tsx)

A debounced string joining all motion token values. Every preview component — including the two functional-primary ones — receives `key={debouncedMotionKey}` so they remount and replay when tokens change. The 300ms debounce prevents thrashing on slider drag.

### Autoplay convention

Preview components auto-play once on mount, then hold final state. They expose `onReplayReady(fn)` → parent stores `fn` and wires it to the "replay" button. A remount counts as a fresh mount and plays again (this is why `debouncedMotionKey` drives all keys).

### `src/motion.ts`

Static motion primitives: `spring` presets (`snappy`/`smooth`/`gentle`), `tween` presets, shared Framer Motion variants, and `useMotionSafe()` — the reduced-motion hook. All components should wrap their transitions in `useMotionSafe()`. This file is the source of truth for non-context motion; components import from here rather than inventing their own transitions.

### `src/app/api/generate/skill.ts`

The system prompt used at runtime for token generation. Contains the design-judgment spec: color principles, typography rules, motion classification, field ranges, and worked examples. **When design judgment in `.claude/skills/motion-ui/SKILL.md` and this file conflict, `skill.ts` wins** — it is the authoritative design spec.

## Motion rules (enforced in code review)

- Animate `transform` and `opacity` only. Use `layout` for size changes. Never animate `width`/`height`/`top`/`left`.
- `popLayout` requires a `position: relative` parent — otherwise exiting elements ghost outside their card.
- `useMotionSafe()` wraps every Framer Motion transition so it collapses to `{ duration: 0 }` under `prefers-reduced-motion`.
- `ease-in` is banned on UI elements. It delays movement at the moment the user is watching most.
- UI animations stay under 300ms (except expression-primary theatrical effects).
- Stagger (30–80ms) on list entrances; character-mode StreamingText uses `setInterval`, not chained `setTimeout`.

## Skills in this repo

| Skill | What it does |
|---|---|
| `.claude/skills/motion-ui/` | Component building and review rules — read SKILL.md + COMPONENTS.md before touching any component |
| `.agents/skills/emil-design-eng/` | Emil Kowalski's UI polish and animation decision framework |
| `.agents/skills/review-animations/` | Animation-specific code review against a strict craft bar — outputs a findings table + Block/Approve verdict |
