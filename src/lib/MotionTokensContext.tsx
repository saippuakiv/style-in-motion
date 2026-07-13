'use client';

/* ---------------------------------------------------------------
   MotionTokensContext
   Provides live motion token values to expression-primary components
   so they can consume spring, bezier, durationScale, entranceDistance,
   and staggerDelay without prop drilling.

   Functional-primary components (CommandPalette, ContextMenu) selectively
   consume this context — bezier curve and spring texture adapt, but all
   durations and stagger stay hardcoded so they always feel instant.
   --------------------------------------------------------------- */

import { createContext, useContext } from 'react';

export interface MotionTokens {
  spring: { stiffness: number; damping: number; mass: number };
  bezier: [number, number, number, number];
  durationScale: number;
  entranceDistance: number;
  staggerDelay: number;
  revealGranularity: 'character' | 'word' | 'phrase';
  /** Posture of the thinking/loading state. Derived from style qualities, not names. */
  thinkingPosture: 'breathe' | 'pulse' | 'bounce';
  /**
   * Time-scaled spring: stiffness ÷ durationScale², damping ÷ durationScale.
   * Preserves damping ratio (character unchanged, tempo scaled).
   * durationScale > 1 → slower → lower stiffness/damping.
   * Expression-primary components use this; functional-primary use raw spring.
   */
  scaledSpring: { stiffness: number; damping: number; mass: number };
}

const MOTION_DEFAULTS: MotionTokens = {
  spring: { stiffness: 260, damping: 28, mass: 1 },
  bezier: [0.16, 1, 0.3, 1],
  durationScale: 1,
  entranceDistance: 60,
  staggerDelay: 0.06,
  revealGranularity: 'phrase',
  thinkingPosture: 'breathe',
  scaledSpring: { stiffness: 260, damping: 28, mass: 1 }, // durationScale=1 → identity
};

const MotionTokensContext = createContext<MotionTokens>(MOTION_DEFAULTS);

/* MotionTokensInput is what App passes in — scaledSpring is derived here,
   not supplied by the caller. */
type MotionTokensInput = Omit<MotionTokens, 'scaledSpring'>;

export function MotionTokensProvider({
  value,
  children,
}: {
  value: MotionTokensInput;
  children: React.ReactNode;
}) {
  /* Time-scales the spring by durationScale while preserving damping ratio
     (character unchanged, tempo scaled). Computed here so it stays
     co-located with the definition, and App.tsx needs no extra math. */
  const scaledSpring = {
    stiffness: value.spring.stiffness / (value.durationScale * value.durationScale),
    damping: value.spring.damping / value.durationScale,
    mass: value.spring.mass,
  };
  return (
    <MotionTokensContext.Provider value={{ ...value, scaledSpring }}>
      {children}
    </MotionTokensContext.Provider>
  );
}

export function useMotionTokens(): MotionTokens {
  return useContext(MotionTokensContext);
}
