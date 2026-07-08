"use client";

/* ---------------------------------------------------------------
   Card
   Surface container with a subtle spring-driven hover lift.
   Background and border transitions respond to token changes via
   the CSS easing curve.

   usage:
     <Card>
       <h3>Title</h3>
       <p>Content here</p>
     </Card>
   --------------------------------------------------------------- */

import { motion } from "framer-motion";
import { spring, useMotionSafe } from "../motion";

export interface CardProps {
  children: React.ReactNode;
}

export function Card({ children }: CardProps) {
  const safe = useMotionSafe();

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={safe(spring.smooth)}
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        transition:
          "background-color var(--duration-base) var(--ease-out), " +
          "border-color var(--duration-base) var(--ease-out)",
      }}
    >
      {children}
    </motion.div>
  );
}
