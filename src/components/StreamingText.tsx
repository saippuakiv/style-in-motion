'use client';

/* ---------------------------------------------------------------
   StreamingText
   Simulates LLM streaming output by revealing short phrases one
   at a time. Each phrase fades in (opacity only) using the token
   bezier curve and durationScale. Auto-plays once on mount; stops
   on completion until replay is triggered.

   usage (inside a preview cell):
     <StreamingText
       bezier={[0.16, 1, 0.3, 1]}
       durationScale={1}
       onReplayReady={(fn) => setReplay(() => fn)}
     />
   --------------------------------------------------------------- */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useMotionSafe } from '../motion';
import { useMotionTokens } from '../lib/MotionTokensContext';

export interface StreamingTextProps {
  /** Called once on mount with a replay function the parent can invoke. */
  onReplayReady?: (replay: () => void) => void;
}

/* 6 phrases split at punctuation / natural 3-5 word boundaries */
const PHRASES = [
  'Based on your prompt, ',
  'I generated a warm editorial palette ',
  'with confident red-orange accents, ',
  'soft paper backgrounds, ',
  'and rounded corners ',
  'that feel approachable yet refined.',
];

const BASE_INTERVAL_MS = 400;
const JITTER_MS = 80;

export function StreamingText({ onReplayReady }: StreamingTextProps) {
  const { bezier, durationScale } = useMotionTokens();
  const safe = useMotionSafe();
  const [count, setCount] = useState(0);
  const [key, setKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout>>();

  const done = count >= PHRASES.length;
  const phraseDuration = 0.4 * durationScale;

  const stop = useCallback(() => {
    if (intervalRef.current) clearTimeout(intervalRef.current);
  }, []);

  const replay = useCallback(() => {
    stop();
    setCount(0);
    setKey((k) => k + 1);
  }, [stop]);

  /* Expose replay to parent */
  useEffect(() => {
    onReplayReady?.(replay);
  }, [onReplayReady, replay]);

  /* Stream phrases one at a time with random jitter; stop when done */
  useEffect(() => {
    if (done) return;
    const jitter = (Math.random() * 2 - 1) * JITTER_MS * durationScale;
    const delay = BASE_INTERVAL_MS * durationScale + jitter;
    intervalRef.current = setTimeout(() => setCount((c) => c + 1), delay);
    return stop;
  }, [count, done, durationScale, stop]);

  /* Reset stream when key changes (replay) */
  useEffect(() => {
    setCount(0);
  }, [key]);

  return (
    <div
      style={{
        width: '100%',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        lineHeight: 1.6,
        color: 'var(--color-text)',
      }}
    >
      <span key={key}>
        {PHRASES.slice(0, count).map((phrase, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0,  }}
            animate={{ opacity: 1,  }}
            transition={safe({
              type: 'tween',
              duration: phraseDuration,
              ease: bezier as unknown as number[],
            })}
          >
            {phrase}
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
