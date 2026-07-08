'use client';

/* ---------------------------------------------------------------
   SkeletonCard
   A single card with three blocks (title / body / tag).
   On mount: all blocks show shimmer skeletons.
   Autoplay sequence: title → body → tag each cross-fades from
   skeleton to content (200ms fade, 400ms between blocks).
   Replay resets all blocks back to skeleton and restarts.
   --------------------------------------------------------------- */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useMotionTokens } from '../lib/MotionTokensContext';

const BASE_FADE = 0.4;   // seconds, scaled by durationScale
const BASE_STAGGER = 800; // ms, scaled by durationScale

/* minHeight of each block's container (accommodates both skeleton and content) */
const H_TITLE = 20;
const H_BODY = 80;
const H_TAG = 22;

/* Shimmer bar — a skeleton placeholder rectangle */
function SkeletonBar({
  width = '100%',
  height = 12,
  pill = false,
}: {
  width?: string | number;
  height?: number;
  pill?: boolean;
}) {
  return (
    <div
      style={{
        width,
        height,
        background:
          'linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shine) 50%, var(--skeleton-base) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite linear',
        borderRadius: pill ? 999 : 4,
        flexShrink: 0,
      }}
    />
  );
}

/* Block: fixed-height container with skeleton and content both absolutely
   positioned so they overlap cleanly during the cross-fade. */
function Block({
  skeleton,
  content,
  revealed,
  minHeight,
  fadeDuration,
}: {
  skeleton: React.ReactNode;
  content: React.ReactNode;
  revealed: boolean;
  minHeight: number;
  fadeDuration: number;
}) {
  return (
    <div style={{ position: 'relative', minHeight }}>
      {/* Skeleton — fades out when revealed */}
      <motion.div
        animate={{ opacity: revealed ? 0 : 1 }}
        transition={{ duration: fadeDuration }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {skeleton}
      </motion.div>

      {/* Content — fades in when revealed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: fadeDuration }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {content}
      </motion.div>
    </div>
  );
}

export interface SkeletonCardProps {
  onReplayReady?: (replay: () => void) => void;
}

export function SkeletonCard({ onReplayReady }: SkeletonCardProps) {
  const { durationScale } = useMotionTokens();
  const fadeDuration = BASE_FADE * durationScale;
  const stagger = BASE_STAGGER * durationScale;

  const [titleRevealed, setTitleRevealed] = useState(false);
  const [bodyRevealed, setBodyRevealed] = useState(false);
  const [tagRevealed, setTagRevealed] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const startSequence = useCallback(() => {
    timers.current = [
      setTimeout(() => setTitleRevealed(true), 1200), // wait 1.2s for skeleton
      setTimeout(() => setBodyRevealed(true), 1200 + stagger),
      setTimeout(() => setTagRevealed(true), 1200 + stagger * 2),
    ];
  }, [stagger]);

  useEffect(() => {
    startSequence();
    return clearTimers;
  }, [startSequence, clearTimers]);

  useEffect(() => {
    if (!onReplayReady) return;
    const replay = () => {
      clearTimers();
      setTitleRevealed(false);
      setBodyRevealed(false);
      setTagRevealed(false);
      /* One frame delay lets React flush the reset before typing restarts */
      timers.current = [setTimeout(startSequence, 50)];
    };
    onReplayReady(replay);
  }, [onReplayReady, clearTimers, startSequence]);

  return (
    <div
      style={{
        width: '100%',
        padding: '16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* ── Title ── */}
      <Block
        revealed={titleRevealed}
        minHeight={H_TITLE}
        fadeDuration={fadeDuration}
        skeleton={<SkeletonBar width='65%' height={H_TITLE} />}
        content={
          <div
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1,
            }}
          >
            Q2 Product Insights
          </div>
        }
      />

      {/* ── Body ── */}
      <Block
        revealed={bodyRevealed}
        minHeight={H_BODY}
        fadeDuration={fadeDuration}
        skeleton={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '100%',
            }}
          >
            <SkeletonBar width='100%' height={12} />
            <SkeletonBar width='100%' height={12} />
            <SkeletonBar width='60%' height={12} />
          </div>
        }
        content={
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-muted)',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.6,
            }}
          >
            AI usage grew 40% quarter-over-quarter. Three key themes emerged:
            speed, reliability, and personalization. Teams reported higher
            satisfaction with async workflows.
          </div>
        }
      />

      {/* ── Tag ── */}
      <Block
        revealed={tagRevealed}
        minHeight={H_TAG}
        fadeDuration={fadeDuration}
        skeleton={<SkeletonBar width={96} height={H_TAG} pill />}
        content={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 8px',
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 999,
              background:
                'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              color: 'var(--color-accent)',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap',
            }}
          >
            Generated by AI
          </span>
        }
      />
    </div>
  );
}
