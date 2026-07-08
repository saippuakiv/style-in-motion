"use client";

/* ---------------------------------------------------------------
   Badge
   Inline label with an accent-tinted background. Spring-driven
   hover and press scale via spring.snappy. Color transitions
   respond to the easing curve.

   usage:
     <Badge>Design</Badge>
     <Badge>Motion</Badge>
   --------------------------------------------------------------- */

import { motion } from "framer-motion";
import { spring, useMotionSafe } from "../motion";

export interface BadgeProps {
  children: React.ReactNode;
}

export function Badge({ children }: BadgeProps) {
  const safe = useMotionSafe();

  return (
    <motion.span
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      transition={safe(spring.snappy)}
      style={{
        display: "inline-block",
        padding: "var(--space-1) var(--space-3)",
        fontSize: 12,
        fontWeight: 500,
        borderRadius: "var(--radius-sm)",
        background:
          "color-mix(in srgb, var(--color-accent) 10%, transparent)",
        color: "var(--color-accent)",
        fontFamily: "var(--font-sans)",
        cursor: "default",
        transition:
          "background-color var(--duration-base) var(--ease-out), " +
          "color var(--duration-base) var(--ease-out)",
      }}
    >
      {children}
    </motion.span>
  );
}
