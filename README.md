# motion-ui

A small, motion-first React component library, plus a Claude skill that
keeps everything built on top of it consistent.

Two layers, on purpose:

- **The library** (`src/`) shows the craft: a real token system, a shared
  motion system, and components where the motion is considered, not bolted
  on. This is the portfolio piece.
- **The skill** (`.claude/skills/motion-ui/`) makes the design system
  AI-consumable. With it installed, asking Claude to add a component
  produces something that uses these exact tokens, springs, and
  conventions, instead of inventing its own. This is the part that maps to
  the "make the design system an AI-readable asset" idea.

## Layout

```
motion-ui/
├── src/
│   ├── tokens.css          design + motion tokens (the system)
│   ├── motion.ts           springs, easings, variants, reduced-motion
│   └── components/
│       └── Switch.tsx      reference motion component
└── .claude/
    └── skills/
        └── motion-ui/
            ├── SKILL.md        rules + workflow for building on-system
            └── COMPONENTS.md   inventory + per-component checklist
```

## Using the skill in Claude Code

The skill is project-scoped: it lives in `.claude/skills/` inside the repo,
so Claude Code discovers it automatically when you work in this folder. Open
the repo, then ask for a component:

> add a Tooltip

Claude reads `SKILL.md`, pulls in `tokens.css` and `motion.ts`, looks at
`Switch.tsx` for the shape, and produces a Tooltip that matches. Try the same
prompt in a folder without the skill to feel the difference: you get a
generic tooltip with hard-coded values and no reduced-motion handling.

## Stack

React + TypeScript + Framer Motion. Imports use `framer-motion`; the package
is now also published as `motion` (`motion/react`) if you prefer the newer
name.

## Notes

- The color and type tokens in `tokens.css` are placeholders. The visual
  personality is the thing to make your own.
- Motion principles followed throughout: short durations, spring physics for
  physical motion, transform/opacity only, exit animations, and
  reduced-motion as a default rather than an add-on.
