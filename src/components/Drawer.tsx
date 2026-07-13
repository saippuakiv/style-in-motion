'use client';

/* ---------------------------------------------------------------
   DrawerPreview
   Right-anchored detail panel inside the demo card.
   Starts off-screen, slides into expanded state on mount.
   Drag left/right with velocity-aware snap to expanded/collapsed.
   Collapsed state shows a 22px strip with status icons.
   --------------------------------------------------------------- */

import { useEffect, useCallback } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { useMotionTokens } from '../lib/MotionTokensContext';

const DRAWER_WIDTH = 260;
const STRIP_WIDTH = 22;
const COLLAPSED_X = DRAWER_WIDTH - STRIP_WIDTH; // 238 — only strip visible
// Drag snap uses a fixed responsive spring — functional interaction, not expressive.
const SNAP_SPRING = { type: 'spring', stiffness: 400, damping: 35 } as const;
const VEL_THRESHOLD = 400;

type Status = 'done' | 'progress' | 'waiting';

const STEPS: { id: number; label: string; status: Status }[] = [
  { id: 1, label: 'Data analysis', status: 'done' },
  { id: 2, label: 'Insight extraction', status: 'done' },
  { id: 3, label: 'Summary generation', status: 'progress' },
  { id: 4, label: 'Output formatting', status: 'waiting' },
];

/* ── Status icons ── */

function StatusIcon({ status }: { status: Status }) {
  if (status === 'done') {
    return (
      <svg
        width={12}
        height={12}
        viewBox='0 0 12 12'
        fill='none'
        style={{ flexShrink: 0 }}
      >
        <path
          d='M2.5 6l2.5 2.5 4.5-5'
          stroke='var(--color-accent)'
          strokeWidth={1.5}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    );
  }

  if (status === 'progress') {
    return (
      <motion.svg
        width={12}
        height={12}
        viewBox='0 0 12 12'
        fill='none'
        style={{ flexShrink: 0 }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      >
        {/* Track */}
        <circle
          cx={6}
          cy={6}
          r={4.5}
          stroke='var(--color-border)'
          strokeWidth={1.5}
        />
        {/* Arc */}
        <path
          d='M6 1.5A4.5 4.5 0 0 1 10.5 6'
          stroke='var(--color-accent)'
          strokeWidth={1.5}
          strokeLinecap='round'
        />
      </motion.svg>
    );
  }

  /* waiting */
  return (
    <motion.svg
      width={12}
      height={12}
      viewBox='0 0 12 12'
      fill='none'
      style={{ flexShrink: 0 }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
    >
      <circle
        cx={6}
        cy={6}
        r={4.5}
        stroke='var(--color-muted)'
        strokeWidth={1.5}
      />
    </motion.svg>
  );
}

/* ── Main component ── */

export function DrawerPreview() {
  const { scaledSpring, entranceDistance, durationScale } = useMotionTokens();
  // Start beyond the fully-collapsed position by entranceDistance so the
  // entrance travel is token-driven rather than fixed to the drawer width.
  const startX = COLLAPSED_X + entranceDistance;
  const x = useMotionValue(startX);

  const snapTo = useCallback(
    (target: number) => animate(x, target, SNAP_SPRING),
    [x],
  );

  /* Slide in to expanded on mount using expression-primary spring from context */
  useEffect(() => {
    const entranceSpring = {
      type: 'spring' as const,
      stiffness: scaledSpring.stiffness,
      damping: scaledSpring.damping,
      mass: scaledSpring.mass,
    };
    const t = setTimeout(() => animate(x, 0, entranceSpring), 400 * durationScale);
    return () => clearTimeout(t);
  }, [x, scaledSpring.stiffness, scaledSpring.damping, scaledSpring.mass, entranceDistance, durationScale]);

  const handleDragEnd = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      const currentX = x.get();
      const vx = info.velocity.x;

      if (vx > VEL_THRESHOLD) {
        snapTo(COLLAPSED_X);
      } else if (vx < -VEL_THRESHOLD) {
        snapTo(0);
      } else {
        snapTo(currentX > COLLAPSED_X / 2 ? COLLAPSED_X : 0);
      }
    },
    [x, snapTo],
  );

  return (
    /* Stage: relative + overflow:hidden clips the sliding drawer */
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 244,
        overflow: 'hidden',
      }}
    >
      <motion.div
        style={{
          x,
          position: 'absolute',
          top: 12,
          right: 0,
          width: DRAWER_WIDTH,
          height: 220,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderTopLeftRadius: 'var(--radius-md)',
          borderBottomLeftRadius: 'var(--radius-md)',
          borderRight: 'none',
          display: 'flex',
          overflow: 'hidden',
        }}
        drag='x'
        dragConstraints={{ left: 0, right: COLLAPSED_X }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        {/* ── Strip (leftmost 22px, always the visible handle when collapsed) ── */}
        <div
          onClick={() => snapTo(0)}
          style={{
            width: STRIP_WIDTH,
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            /*
             * Match the content area's layout so each icon lines up with its row:
             *   14px (content paddingTop) + 22px (header height) + 18px (header marginBottom) = 54px
             */
            paddingTop: 54,
            gap: 14,
            cursor: 'w-resize',
          }}
        >
          {STEPS.map((s) => (
            /* 20px slot height matches content row height (text at --text-sm with lineHeight 20px) */
            <div
              key={s.id}
              style={{
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StatusIcon status={s.status} />
            </div>
          ))}
        </div>

        {/* ── Main content (header + step list) ── */}
        <div
          style={{
            flex: 1,
            padding: '14px 14px',
            overflow: 'hidden',
            cursor: 'grab',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
              }}
            >
              Progress
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                snapTo(COLLAPSED_X);
              }}
              style={{
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'color-mix(in srgb, var(--color-text) 5%, transparent)',
                border: 'none',
                borderRadius: 11,
                cursor: 'pointer',
                color: 'var(--color-muted)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>

          {/* Step rows */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              paddingLeft: 8,
            }}
          >
            {STEPS.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-sans)',
                    lineHeight: '20px', // explicit height to match strip icon slots
                    color:
                      s.status === 'done'
                        ? 'var(--color-muted)'
                        : 'var(--color-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
