"use client";

import { motion } from "framer-motion";
import { spring, useMotionSafe } from "../motion";

/* ---------------------------------------------------------------
   Switch
   Reference implementation for this library. Every interactive
   component should follow the same shape:
     - all states present (default / hover / focus / pressed / disabled)
     - spring-driven physical motion, not duration tweens
     - reduced-motion handled via useMotionSafe
     - accessible by default (role, keyboard, aria)
     - colors / radii from tokens, never hard-coded
   --------------------------------------------------------------- */

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

const WIDTH = 44;
const HEIGHT = 26;
const PAD = 3;
const THUMB = HEIGHT - PAD * 2;

export function Switch({ checked, onChange, disabled, label, id }: SwitchProps) {
  const safe = useMotionSafe();

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        padding: 0,
        border: "none",
        borderRadius: "var(--radius-full)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        outlineOffset: 2,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Track: color crosses over as the value changes. */}
      <motion.span
        aria-hidden
        animate={{
          backgroundColor: checked
            ? "var(--color-accent)"
            : "var(--color-track-off)",
        }}
        transition={safe({ duration: 0.18, ease: [0.16, 1, 0.3, 1] })}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "var(--radius-full)",
        }}
      />

      {/* Thumb: springs across, and squishes slightly while pressed. */}
      <motion.span
        aria-hidden
        layout
        initial={false}
        animate={{ x: checked ? WIDTH - THUMB - PAD : PAD }}
        whileTap={disabled ? undefined : { scaleX: 1.15 }}
        transition={safe(spring.snappy)}
        style={{
          position: "absolute",
          top: PAD,
          left: 0,
          width: THUMB,
          height: THUMB,
          borderRadius: "var(--radius-full)",
          background: "var(--color-surface)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
        }}
      />
    </button>
  );
}
