'use client';

/* ---------------------------------------------------------------
   ThinkingIndicator
   Represents the model actively working. Three color blocks
   breathe independently (staggered) to evoke a palette being
   considered; cycling text phrases name the internal state with
   a per-character brightness wave that sweeps left→right→left.

   Exception to the autoplay-once rule: thinking is a persistent
   state with no natural end point. The blocks and text cycle
   indefinitely to signal ongoing activity.
   --------------------------------------------------------------- */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useMotionTokens } from '../lib/MotionTokensContext';

const PHRASES = ['thinking', 'reasoning', 'almost there'] as const;

const BLOCK_COLORS = [
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-secondary)',
] as const;

const BLOCK_SIZE = 8;
const BLOCK_GAP = 6;

export function ThinkingIndicator() {
  const { bezier, durationScale, staggerDelay } = useMotionTokens();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [waveIdx, setWaveIdx] = useState(0);
  const waveForward = useRef(true);

  const ease = bezier as unknown as number[];
  const halfCycle = 0.75 * durationScale;
  const cycleDuration = 1.5 * durationScale;
  const enterDuration = 0.25 * durationScale;
  const exitDuration = 0.2 * durationScale;
  const charDuration = 1.5 * durationScale;

  const phrase = PHRASES[index % PHRASES.length];

  /* Text cycle: advance phrase at block 1's opacity peak, then every
     full block cycle. */
  useEffect(() => {
    if (reduce) return;
    const block1Peak = (staggerDelay * 2 + halfCycle) * 1000;
    const cycleMs = cycleDuration * 1000;
    let timeout: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;

    timeout = setTimeout(() => {
      setIndex((i) => i + 1);
      interval = setInterval(() => setIndex((i) => i + 1), cycleMs);
    }, block1Peak);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [reduce, staggerDelay, halfCycle, cycleDuration]);

  /* Wave: advance one character every staggerDelay ms, reversing at each
     end to create a continuous left→right→left brightness sweep. */

  useEffect(() => {
    if (reduce) return;
    const n = phrase.length;

    const id = setInterval(() => {
      setWaveIdx((prev) => {
        const atEnd = waveForward.current ? prev >= n - 1 : prev <= 0;
        if (atEnd) waveForward.current = !waveForward.current;
        return waveForward.current ? prev + 1 : prev - 1;
      });
    }, staggerDelay * 1000);

    return () => clearInterval(id);
  }, [phrase, reduce, staggerDelay]);

  /* Reset wave to the start when the phrase changes */
  useEffect(() => {
    setWaveIdx(0);
    waveForward.current = true;
  }, [phrase]);

  /* Reduced motion: three static blocks + static text */
  if (reduce) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
      >
        <div style={{ display: 'flex', gap: BLOCK_GAP }}>
          {BLOCK_COLORS.map((color, i) => (
            <div
              key={i}
              style={{
                width: BLOCK_SIZE,
                height: BLOCK_SIZE,
                borderRadius: 'var(--radius-xs)',
                background: color,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text)',
          }}
        >
          thinking
        </span>
      </div>
    );
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
    >
      {/* Color blocks — loops indefinitely, see file header comment.
          Each block has a fixed phase offset so they never pulse in unison. */}
      <div style={{ display: 'flex', gap: BLOCK_GAP }}>
        {BLOCK_COLORS.map((color, i) => (
          <motion.div
            key={i}
            style={{
              width: BLOCK_SIZE,
              height: BLOCK_SIZE,
              borderRadius: 'var(--radius-xs)',
              background: color,
            }}
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: 1.2, opacity: 1 }}
            transition={{
              duration: halfCycle,
              ease,
              repeat: Infinity,
              repeatType: 'mirror',
              delay: i * staggerDelay * 2,
            }}
          />
        ))}
      </div>

      {/* Text area: fixed width prevents layout shift across phrase lengths.
          overflow: hidden clips phrase enter/exit transitions. */}
      <div
        style={{
          position: 'relative',
          width: '7em',
          height: '1.6em',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode='wait'>
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { type: 'tween', duration: enterDuration, ease },
            }}
            exit={{
              opacity: 0,
              transition: { type: 'tween', duration: exitDuration, ease },
            }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {/* Per-character brightness wave.
                Only opacity varies — always var(--color-text), never
                a saturated color. The wave cursor position (waveIdx) is
                the one bright character; all others are dim at 0.4. */}
            {[...phrase].map((char, i) =>
              char === ' ' ? (
                /* Non-breaking space so whitespace isn't collapsed between inline spans */
                <span key={i} style={{ color: 'var(--color-text)' }}>
                  &nbsp;
                </span>
              ) : (
                <motion.span
                  key={i}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: i === waveIdx ? 1 : 0.4 }}
                  transition={{ type: 'tween', duration: charDuration, ease }}
                  style={{ display: 'inline', color: 'var(--color-text)' }}
                >
                  {char}
                </motion.span>
              ),
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
