"use client";

/* ---------------------------------------------------------------
   Slider
   Custom fill bar layered over a native <input type="range"> for
   full keyboard and assistive-tech support. The fill tracks the
   value directly; color transitions respond to token changes via
   the CSS easing curve.

   usage:
     <Slider label="Volume" defaultValue={65} />
     <Slider min={0} max={200} disabled />
   --------------------------------------------------------------- */

import { useState } from "react";

export interface SliderProps {
  label?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  disabled?: boolean;
  onChange?: (value: number) => void;
}

export function Slider({
  label,
  min = 0,
  max = 100,
  defaultValue = 50,
  disabled,
  onChange,
}: SliderProps) {
  const [value, setValue] = useState(defaultValue);
  const pct = ((value - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = +e.target.value;
    setValue(v);
    onChange?.(v);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--color-muted)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <span>{label}</span>
          <span>{value}%</span>
        </div>
      )}
      <div
        style={{
          position: "relative",
          height: 6,
          background: "var(--color-border)",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: "var(--color-accent)",
            borderRadius: "var(--radius-full)",
            transition:
              "background-color var(--duration-base) var(--ease-out)",
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        style={{
          width: "100%",
          accentColor: "var(--color-accent)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      />
    </div>
  );
}
