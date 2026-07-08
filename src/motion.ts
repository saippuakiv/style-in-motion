"use client";

import { useReducedMotion } from "framer-motion";
import type { Transition, Variants } from "framer-motion";

/* ---------------------------------------------------------------
   Motion system.
   The single source of truth for how things move in this library.
   Components import from here instead of inventing their own
   transitions, so motion feels consistent across the whole system.
   --------------------------------------------------------------- */

/* Spring presets. Use these for anything physical: toggles, thumbs,
   drag, layout shifts. Springs read more natural than duration-based
   tweens because they respond to where the element actually is. */
export const spring = {
  /* Quick and decisive. Switches, small toggles, button feedback. */
  snappy: { type: "spring", stiffness: 500, damping: 32, mass: 1 },
  /* Balanced. Most enter / exit and layout animations. */
  smooth: { type: "spring", stiffness: 260, damping: 28, mass: 1 },
  /* Soft landing. Larger surfaces, sheets, modals. */
  gentle: { type: "spring", stiffness: 170, damping: 26, mass: 1 },
} satisfies Record<string, Transition>;

/* Duration-based tweens, for opacity / color where a spring would
   overshoot oddly. Kept in sync with tokens.css. */
export const tween = {
  fast: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
  base: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  slow: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
} satisfies Record<string, Transition>;

/* Shared variants. Animate transform + opacity only (GPU-friendly);
   never animate width / height / top / left directly. Use layout
   animations for size changes. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: spring.smooth },
  exit: { opacity: 0, y: 4, transition: tween.fast },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: spring.smooth },
  exit: { opacity: 0, scale: 0.98, transition: tween.fast },
};

/* Stagger a list of children on enter. */
export const stagger = (gap = 0.04): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: gap } },
});

/* Reduced-motion helper.
   Returns transitions that collapse to "instant" when the user has
   prefers-reduced-motion set. Wrap any transition you pass to a
   component with this so accessibility is the default, not an
   afterthought.

   usage:
     const t = useMotionSafe();
     <motion.div transition={t(spring.snappy)} />
*/
export function useMotionSafe() {
  const reduce = useReducedMotion();
  return (transition: Transition): Transition =>
    reduce ? { duration: 0 } : transition;
}
