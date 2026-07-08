"use client";

/* ---------------------------------------------------------------
   Input
   Text input with animated border and focus glow. Color transitions
   use the CSS easing curve from tokens so they respond to the
   playground's BezierEditor.

   usage:
     <Input label="Email" placeholder="you@example.com" id="email" />
     <Input disabled placeholder="read-only" />
   --------------------------------------------------------------- */

import { useState } from "react";

export interface InputProps {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function Input({ label, placeholder, disabled, id }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-muted)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          padding: "var(--space-3)",
          border: "1.5px solid",
          borderColor: focused
            ? "var(--color-accent)"
            : "var(--color-border)",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--text-sm)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          outlineOffset: 2,
          fontFamily: "var(--font-sans)",
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? "not-allowed" : "text",
          transition:
            "border-color var(--duration-base) var(--ease-out), " +
            "box-shadow var(--duration-base) var(--ease-out)",
          boxShadow: focused
            ? "0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent)"
            : "none",
        }}
      />
    </div>
  );
}
