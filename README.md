# Style in Motion

A motion-first React component playground. Type a style prompt, and an AI generates a complete set of design tokens — color, typography, radius, and motion parameters — that eight preview components consume live.

Built with Next.js, Framer Motion, and the Anthropic API.

## How it works

```
Style prompt (e.g. "dark luxury, gold on obsidian")
  → POST /api/generate
  → Anthropic API returns design tokens as JSON
  → Tokens become CSS custom properties + React context
  → Eight preview components re-render with the new style
```

The left panel provides a prompt input and manual controls (bezier curve editor, spring sliders, expression sliders) for fine-tuning. The right panel displays the eight live preview components.

## Preview components

| Component | Motion class |
|---|---|
| Command Palette | functional-primary |
| Context Menu | functional-primary |
| Toast | split (trigger = functional, entrance = expressive) |
| Drawer | expression-primary |
| Skeleton → Content | expression-primary |
| Multi-step Dialog | expression-primary |
| Streaming Text | expression-primary |
| Thinking Indicator | expression-primary |

**Functional-primary** components stay fast and responsive across all styles — speed is clamped, only texture varies.

**Expression-primary** components fully consume all motion tokens, including time-scaled springs, stagger, and entrance distance.

## Design tokens

Each generation produces ~25 tokens across four categories:

- **Color** — bg, surface, text, muted, border, accent, primary, secondary
- **Typography** — Google Fonts family, font size scale (x-height compensation)
- **Radius** — sm / md / lg
- **Motion** — spring (stiffness, damping, mass), bezier curve, duration scale, entrance distance, stagger delay, reveal granularity (character/word/phrase), thinking posture (breathe/pulse/bounce), overshoot control

A `rationale` array accompanies each generation: structured `{summary, decision, why}` entries explaining the design reasoning behind the token choices.

## Getting started

```bash
# Install dependencies
npm install

# Set up your Anthropic API key
echo "ANTHROPIC_API_KEY=your-key-here" > .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npx tsc --noEmit` | Type-check without building |

## Tech stack

- **Next.js 14** — app router, API routes
- **React 18** + **Framer Motion 11** — animation engine
- **Anthropic API** (Claude) — token generation with a design-judgment system prompt
- **TypeScript** — strict types for the full token pipeline

## Architecture

Two token scopes, strictly separated:

- **Generated tokens** (`--color-*`, `--radius-*`, `--font-*`, `--duration-*`) — AI-produced, style-dependent, consumed by preview components
- **Shell tokens** (`--shell-*`) — static chrome for the control panel, never changes with generation

Motion tokens flow through `MotionTokensProvider` (React context). Expression-primary components receive `scaledSpring` (time-scaled: `stiffness/s²`, `damping/s`, preserving damping ratio). Functional-primary components clamp speed (stiffness floor at 300) but pass through texture via a damping ratio band [0.6, 1.05].

A `postProcess` layer in the API route repairs malformed generations (field defaults, numeric clamping, enum fallbacks, near-black floor, critical-damping enforcement) — it never rejects, only repairs.
