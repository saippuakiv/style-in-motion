'use client';

/* ---------------------------------------------------------------
   MotionTokensContext
   Provides live motion token values to expression-primary components
   so they can consume spring, bezier, durationScale, entranceDistance,
   and staggerDelay without prop drilling.

   Functional-primary components (CommandPalette, ContextMenu) deliberately
   do NOT consume this context — their motion stays constant regardless of
   style tokens.
   --------------------------------------------------------------- */

import { createContext, useContext } from 'react';

export interface MotionTokens {
  spring: { stiffness: number; damping: number; mass: number };
  bezier: [number, number, number, number];
  durationScale: number;
  entranceDistance: number;
  staggerDelay: number;
}

const MOTION_DEFAULTS: MotionTokens = {
  spring: { stiffness: 260, damping: 28, mass: 1 },
  bezier: [0.16, 1, 0.3, 1],
  durationScale: 1,
  entranceDistance: 60,
  staggerDelay: 0.06,
};

const MotionTokensContext = createContext<MotionTokens>(MOTION_DEFAULTS);

export function MotionTokensProvider({
  value,
  children,
}: {
  value: MotionTokens;
  children: React.ReactNode;
}) {
  return (
    <MotionTokensContext.Provider value={value}>
      {children}
    </MotionTokensContext.Provider>
  );
}

export function useMotionTokens(): MotionTokens {
  return useContext(MotionTokensContext);
}
