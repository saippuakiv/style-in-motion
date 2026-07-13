'use client';

/* ---------------------------------------------------------------
   Toast (preview)
   expression-primary: motion values come from MotionTokensContext.
   Toasts appear only via the "Show toast" trigger button.
   --------------------------------------------------------------- */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionSafe } from '../motion';
import { useMotionTokens } from '../lib/MotionTokensContext';
import { Stage } from './Stage';

/* ── Types ── */

interface ToastData {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: string;
  enterDelay: number;
}

/* ── Sample messages ── */

const SAMPLES: Omit<ToastData, 'id' | 'enterDelay'>[] = [
  { message: 'Tokens generated', type: 'success' },
  { message: 'Request timed out', type: 'error', action: 'Retry' },
  { message: 'Copied to clipboard', type: 'info' },
];

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

/* ── Component ── */

export function ToastPreview() {
  const { scaledSpring, bezier, durationScale, entranceDistance, staggerDelay } =
    useMotionTokens();
  const safe = useMotionSafe();

  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextId = useRef(0);
  const sampleIdx = useRef(0);
  const lastAddTime = useRef(0);

  /* Timer bookkeeping */
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const remaining = useRef<Map<number, number>>(new Map());
  const started = useRef<Map<number, number>>(new Map());
  const paused = useRef(false);

  /* ── Dismiss ── */
  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    remaining.current.delete(id);
    started.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /* ── Start / restart a single timer ── */
  const startTimer = useCallback(
    (id: number, ms: number) => {
      remaining.current.set(id, ms);
      started.current.set(id, Date.now());
      timers.current.set(id, setTimeout(() => dismiss(id), ms));
    },
    [dismiss],
  );

  /* ── Add toast ── */
  const addToast = useCallback(() => {
    const now = Date.now();
    const gap = now - lastAddTime.current;
    lastAddTime.current = now;
    const enterDelay = gap < 200 ? staggerDelay : 0;

    const sample = SAMPLES[sampleIdx.current % SAMPLES.length];
    sampleIdx.current++;
    const id = nextId.current++;

    setToasts((prev) => {
      const next = [{ ...sample, id, enterDelay }, ...prev];
      return next.slice(0, MAX_TOASTS);
    });

    if (!paused.current) {
      startTimer(id, AUTO_DISMISS_MS);
    } else {
      remaining.current.set(id, AUTO_DISMISS_MS);
    }
  }, [staggerDelay, startTimer]);

  /* ── Autoplay: fire 3 toasts on mount via the same path as the button ── */
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  useEffect(() => {
    const handles = [0, 600, 1200].map((delay) =>
      setTimeout(() => addToastRef.current(), delay),
    );
    return () => handles.forEach(clearTimeout);
  }, []);

  /* Clean up timers for evicted toasts */
  useEffect(() => {
    const active = new Set(toasts.map((t) => t.id));
    timers.current.forEach((timer, id) => {
      if (!active.has(id)) {
        clearTimeout(timer);
        timers.current.delete(id);
        remaining.current.delete(id);
        started.current.delete(id);
      }
    });
  }, [toasts]);

  /* Unmount cleanup */
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  /* ── Hover pause / resume ── */
  const pauseAll = useCallback(() => {
    paused.current = true;
    timers.current.forEach((timer, id) => {
      clearTimeout(timer);
      const s = started.current.get(id) ?? Date.now();
      const r = remaining.current.get(id) ?? AUTO_DISMISS_MS;
      remaining.current.set(id, Math.max(0, r - (Date.now() - s)));
    });
    timers.current.clear();
  }, []);

  const resumeAll = useCallback(() => {
    paused.current = false;
    remaining.current.forEach((ms, id) => startTimer(id, ms));
  }, [startTimer]);

  /* ── Derived motion values ── */
  const exitDuration = 0.15 * durationScale;

  return (
    <Stage>
      {/* Trigger */}
      <button
        type='button'
        onClick={addToast}
        style={{
          position: 'absolute',
          bottom: 'var(--space-3)',
          left: 'var(--space-3)',
          padding: 'var(--space-2) var(--space-3)',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text)',
          cursor: 'pointer',
          transition: 'border-color var(--duration-fast) var(--ease-out)',
        }}
      >
        Show toast
      </button>

      {/* Stack */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--space-2)',
          right: 'var(--space-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
          maxWidth: '70%',
        }}
        onMouseEnter={pauseAll}
        onMouseLeave={resumeAll}
      >
        <AnimatePresence mode='popLayout'>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout='position'
              variants={{
                enter: {
                  x: 0,
                  opacity: 1,
                  transition: safe({
                    x: {
                      type: 'spring',
                      stiffness: scaledSpring.stiffness,
                      damping: scaledSpring.damping,
                      mass: scaledSpring.mass,
                      delay: toast.enterDelay,
                    },
                    opacity: {
                      duration: 0.2 * durationScale,
                      ease: bezier as unknown as number[],
                      delay: toast.enterDelay,
                    },
                    layout: {
                      type: 'spring',
                      stiffness: scaledSpring.stiffness,
                      damping: scaledSpring.damping,
                      mass: scaledSpring.mass,
                    },
                  }),
                },
                exit: {
                  x: entranceDistance * 0.5,
                  opacity: 0,
                  transition: safe({
                    duration: exitDuration,
                    ease: bezier as unknown as number[],
                  }),
                },
              }}
              initial={{ x: entranceDistance, opacity: 0 }}
              animate='enter'
              exit='exit'
              onClick={() => dismiss(toast.id)}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontFamily: 'var(--font-sans)',
                transition:
                  'background-color var(--duration-base) var(--ease-out), ' +
                  'border-color var(--duration-base) var(--ease-out)',
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {toast.message}
              </span>
              {toast.action && (
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(toast.id);
                  }}
                  style={{
                    padding: '2px var(--space-2)',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                    background: 'var(--color-accent)',
                    color: 'var(--color-accent-text)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition:
                      'background-color var(--duration-fast) var(--ease-out)',
                  }}
                >
                  {toast.action}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Stage>
  );
}
