"use client";

/* ---------------------------------------------------------------
   Button
   Primary / secondary / ghost variants with spring-driven hover
   and press feedback. Color transitions respond to the easing
   curve configured in the playground's BezierEditor.

   usage:
     <Button variant="primary" onClick={handleClick}>Label</Button>
     <Button variant="secondary" disabled>Disabled</Button>
   --------------------------------------------------------------- */

import { motion } from "framer-motion";
import { spring, useMotionSafe } from "../motion";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = "primary",
  disabled,
  children,
  onClick,
}: ButtonProps) {
  const safe = useMotionSafe();

  const fills: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--color-accent)",
      color: "var(--color-accent-text)",
      borderColor: "transparent",
    },
    secondary: {
      background: "transparent",
      color: "var(--color-accent)",
      borderColor: "var(--color-accent)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-muted)",
      borderColor: "transparent",
    },
  };

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={safe(spring.snappy)}
      style={{
        padding: "var(--space-3) var(--space-5)",
        fontWeight: 600,
        fontSize: "var(--text-sm)",
        border: "1.5px solid",
        borderRadius: "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        fontFamily: "var(--font-sans)",
        outlineOffset: 2,
        WebkitTapHighlightColor: "transparent",
        transition:
          "background-color var(--duration-base) var(--ease-out), " +
          "border-color var(--duration-base) var(--ease-out), " +
          "color var(--duration-base) var(--ease-out)",
        ...fills[variant!],
      }}
    >
      {children}
    </motion.button>
  );
}
