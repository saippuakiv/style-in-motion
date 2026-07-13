'use client';

/* ---------------------------------------------------------------
   StreamingText
   Simulates LLM streaming output by revealing text unit by unit.
   Granularity (character / word / phrase) is driven by the
   revealGranularity token from MotionTokensContext:

   - character  Each char steps at a strictly even interval via
                setInterval — regularity is the aesthetic. Pairs
                naturally with mechanical/brutalist styles.
   - word       Word-by-word; reveals at a readable pace.
   - phrase     Whole phrases surface with slow fades (default).

   Interval is per-granularity × durationScale. fadeDuration is a
   ratio of interval, so the two channels can never desync.
   entranceDistance is consumed directly (expression-primary).
   y and opacity share one tween — bezier easing is visible through
   displacement, not brightness.

   Character mode uses a single setInterval stepping an index counter
   rather than scheduling 100+ individual timeouts.
   --------------------------------------------------------------- */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useMotionSafe } from '../motion';
import { useMotionTokens } from '../lib/MotionTokensContext';

export interface StreamingTextProps {
  /** Called once on mount with a replay function the parent can invoke. */
  onReplayReady?: (replay: () => void) => void;
}

const FULL_TEXT =
  'Based on your prompt, I generated a warm editorial palette ' +
  'with confident red-orange accents, soft paper backgrounds, ' +
  'and rounded corners that feel approachable yet refined.';

/* Phrase-mode units — split at natural 3-5 word / punctuation boundaries */
const PHRASES = [
  'Based on your prompt, ',
  'I generated a warm editorial palette ',
  'with confident red-orange accents, ',
  'soft paper backgrounds, ',
  'and rounded corners ',
  'that feel approachable yet refined.',
];

function splitUnits(granularity: 'character' | 'word' | 'phrase'): string[] {
  if (granularity === 'phrase') return PHRASES;
  if (granularity === 'word') return FULL_TEXT.match(/\S+\s*/g) ?? [];
  return FULL_TEXT.split(''); // character — spaces are their own units
}

/* How long a unit takes to READ, per granularity.
   This is the reveal rhythm — not a list-offset stagger. */
const BASE_INTERVAL_S: Record<'character' | 'word' | 'phrase', number> = {
  character: 0.04,
  word: 0.20,
  phrase: 0.65,
};

/* Fade duration as a multiplier of interval. overlap > 0 means units
   bleed into each other, reading as flow. overlap 0 means strictly
   sequential — each character finishes exactly as the next begins. */
const OVERLAP: Record<'character' | 'word' | 'phrase', number> = {
  character: 0,
  word: 0.6,
  phrase: 0.8,
};

export function StreamingText({ onReplayReady }: StreamingTextProps) {
  const {
    bezier,
    durationScale,
    entranceDistance,
    revealGranularity,
  } = useMotionTokens();
  const safe = useMotionSafe();

  const units = splitUnits(revealGranularity);
  const [count, setCount] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  /* Ref keeps interval callback in sync with units.length without a closure
     re-create — important for character mode where the array can be 170+ items. */
  const unitsLenRef = useRef(units.length);
  unitsLenRef.current = units.length;

  const done = count >= units.length;

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== undefined) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const replay = useCallback(() => {
    stopInterval();
    setCount(0);
    setReplayKey((k) => k + 1);
  }, [stopInterval]);

  /* Expose replay to parent */
  useEffect(() => {
    onReplayReady?.(replay);
  }, [onReplayReady, replay]);

  /* Single setInterval steps count forward until all units are revealed.
     Perfectly even spacing — essential for character mode where regularity
     is the aesthetic, not a side effect. */
  useEffect(() => {
    setCount(0);
    const ms = BASE_INTERVAL_S[revealGranularity] * durationScale * 1000;
    intervalRef.current = setInterval(() => {
      setCount((c) => {
        const next = c + 1;
        if (next >= unitsLenRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
        }
        return next;
      });
    }, ms);
    return stopInterval;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey, stopInterval]);

  /* ── Entrance transition ── */
  // interval and fadeDuration are derived together so they can never desync
  const interval = BASE_INTERVAL_S[revealGranularity] * durationScale;
  const fadeDuration = interval * (1 + OVERLAP[revealGranularity]);

  // y offset: map panel-scale entranceDistance (0–80px) onto a text-relative em range.
  // Words move relative to their line, not the viewport — so the displacement
  // stays proportional to the type size regardless of fontSizeScale.
  const MAX_TEXT_SHIFT_EM = 0.6; // ~60% of one em — visible lift, still in-line
  const yOffsetEm = Math.min(entranceDistance / 80, 1) * MAX_TEXT_SHIFT_EM;

  // opacity and y share one tween so bezier easing is perceived through
  // displacement (not brightness) and both channels always land together
  const unitTransition = safe({
    type: 'tween' as const,
    duration: fadeDuration,
    ease: bezier as unknown as number[],
  });

  return (
    <div
      style={{
        width: '100%',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        lineHeight: 1.6,
        color: 'var(--color-text)',
        /* pre-wrap preserves spaces as rendered characters — required for
           character mode where each space is its own inline span. */
        whiteSpace: 'pre-wrap',
      }}
    >
      <span key={replayKey}>
        {units.slice(0, count).map((unit, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: `${yOffsetEm}em` }}
            animate={{ opacity: 1, y: 0 }}
            transition={unitTransition}
          >
            {unit}
          </motion.span>
        ))}
        {/* Blinking cursor while streaming */}
        {!done && (
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: '1em',
              verticalAlign: 'text-bottom',
              background: 'var(--color-accent)',
              marginLeft: 1,
              animation: 'cursorBlink 1s steps(2) infinite',
            }}
          />
        )}
      </span>

      <style>{`@keyframes cursorBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }`}</style>
    </div>
  );
}
