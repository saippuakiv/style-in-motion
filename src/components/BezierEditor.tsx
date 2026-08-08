'use client';

/* ---------------------------------------------------------------
   BezierEditor
   Interactive cubic-bezier curve editor with draggable SVG control
   points, a preview ball animation, and preset buttons.

   The SVG canvas maps x∈[0,1] to the full inner width (minus
   point-radius padding). The tween preview track below uses
   separate shared track geometry from trackGeometry.ts.

   The curve graph defaults to COLLAPSED so the panel's spring
   and expression sliders fit on the first screen. The value
   readout and preset chips stay visible when collapsed.
   --------------------------------------------------------------- */

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BALL_D, BALL_R, BALL_PAD, TRACK_H } from './trackGeometry';

export type Bezier = [number, number, number, number];

export interface BezierEditorProps {
  value: Bezier;
  onChange: (value: Bezier) => void;
  // future: header label is a prop so a skill-derived parameter-importance
  // hint can populate it later (primary/secondary). Neutral default until
  // that field exists.
  label?: string;
}

/* ── SVG canvas coordinate system ──
   x∈[0,1] sits inside the extended range [X_MIN, X_MAX] with
   margins on both sides. The tween track below shares the same
   proportions so its tick marks align with the dashed lines.
   y∈[Y_MIN, Y_MAX] maps to full inner height. */
const W = 200;
const CANVAS_H = 280;
const X_MIN = -0.15;
const X_MAX = 1.15;
const X_RANGE = X_MAX - X_MIN; // 1.3
const Y_MIN = -0.3;
const Y_MAX = 1.3;
const Y_RANGE = Y_MAX - Y_MIN;

const PAD = 8;
const INNER_W = W - 2 * PAD;
const INNER_H = CANVAS_H - 2 * PAD;

/* Tween track tick positions — derived from same x mapping as canvas */
const TWEEN_0_PCT = ((PAD + ((0 - X_MIN) / X_RANGE) * INNER_W) / W) * 100;
const TWEEN_1_PCT = ((PAD + ((1 - X_MIN) / X_RANGE) * INNER_W) / W) * 100;

const toSvg = (bx: number, by: number): [number, number] => [
  PAD + ((bx - X_MIN) / X_RANGE) * INNER_W,
  PAD + ((Y_MAX - by) / Y_RANGE) * INNER_H,
];
const fromSvg = (sx: number, sy: number): [number, number] => [
  Math.min(1, Math.max(0, ((sx - PAD) / INNER_W) * X_RANGE + X_MIN)),
  Math.min(Y_MAX, Math.max(Y_MIN, Y_MAX - ((sy - PAD) / INNER_H) * Y_RANGE)),
];

const PRESETS: Record<string, Bezier> = {
  snappy: [0.16, 1, 0.3, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  bounce: [0.34, 1.56, 0.64, 1],
  gentle: [0.4, 0, 0.2, 1],
};

export function BezierEditor({
  value,
  onChange,
  label = 'Easing curve',
}: BezierEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const p1 = toSvg(value[0], value[1]);
  const p2 = toSvg(value[2], value[3]);
  const start = toSvg(0, 0);
  const end = toSvg(1, 1);
  const path = `M ${start[0]} ${start[1]} C ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${end[0]} ${end[1]}`;

  const onPointerDown = (idx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = idx;
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging.current === null) return;
      const svg = svgRef.current!;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        ctm.inverse(),
      );
      const [bx, by] = fromSvg(pt.x, pt.y);
      const next: Bezier = [value[0], value[1], value[2], value[3]];
      if (dragging.current === 0) {
        next[0] = bx;
        next[1] = by;
      } else {
        next[2] = bx;
        next[3] = by;
      }
      onChange(next);
    },
    [value, onChange],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const bezierStr = `cubic-bezier(${value.map((v) => v.toFixed(2)).join(', ')})`;

  return (
    <div>
      {/* Value display — always visible */}
      <div
        style={{
          padding: '6px 8px',
          background: 'var(--shell-surface)',
          borderRadius: 6,
          fontFamily: 'var(--shell-font-mono)',
          fontSize: 11,
          color: 'var(--shell-text-dim)',
          wordBreak: 'break-all',
        }}
      >
        {bezierStr}
      </div>

      {/* Presets — always visible */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {Object.entries(PRESETS).map(([name, val]) => (
          <button
            key={name}
            onClick={() => onChange(val)}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              background: 'var(--shell-surface)',
              border: '1px solid var(--shell-border)',
              borderRadius: 'var(--shell-radius-sm)',
              color: 'var(--shell-text-muted)',
              cursor: 'pointer',
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Tween preview track — always visible */}
      <div
        style={{
          height: TRACK_H,
          position: 'relative',
          background: 'var(--shell-track)',
          borderRadius: TRACK_H / 2,
          cursor: 'pointer',
          marginTop: 8,
        }}
        onClick={() => setReplayKey((k) => k + 1)}
      >
        <div
          style={{
            position: 'absolute',
            left: `calc(${TWEEN_0_PCT}% - 0.5px)`,
            top: 0,
            width: 1,
            height: TRACK_H,
            background: 'var(--shell-grid)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${TWEEN_1_PCT}% - 0.5px)`,
            top: 0,
            width: 1,
            height: TRACK_H,
            background: 'var(--shell-grid)',
          }}
        />
        <div
          key={`${bezierStr}-${replayKey}`}
          style={{
            position: 'absolute',
            top: BALL_PAD,
            left: `calc(${TWEEN_0_PCT}% - ${BALL_R}px)`,
            width: BALL_D,
            height: BALL_D,
            borderRadius: '50%',
            background: 'var(--shell-ink)',
            animation: `ballSlide 2s ${bezierStr} forwards`,
          }}
        />
      </div>
      <style>{`@keyframes ballSlide {
        from { left: calc(${TWEEN_0_PCT}% - ${BALL_R}px); }
        to   { left: calc(${TWEEN_1_PCT}% - ${BALL_R}px); }
      }`}</style>

      {/* Replay — always visible */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 6,
        }}
      >
        <button
          onClick={() => setReplayKey((k) => k + 1)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            background: 'none',
            border: '1px solid var(--shell-border)',
            borderRadius: 'var(--shell-radius-sm)',
            color: 'var(--shell-text-muted)',
            cursor: 'pointer',
          }}
        >
          replay
        </button>
      </div>

      {/* Expand/collapse toggle for the curve graph */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          padding: '5px 8px',
          marginTop: 8,
          background: 'var(--shell-surface)',
          border: '1px solid var(--shell-border)',
          borderRadius: 'var(--shell-radius-sm)',
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 500,
          color: 'var(--shell-text-muted)',
          fontFamily: 'var(--shell-font-mono)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: 7,
            lineHeight: 1,
            transition: 'transform 0.2s ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ▶
        </span>
        {label}
      </button>

      {/* Curve graph — collapsed by default to reclaim vertical space */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${CANVAS_H}`}
              width='100%'
              style={{
                display: 'block',
                marginTop: 6,
                cursor: dragging.current !== null ? 'grabbing' : 'default',
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <defs>
                <clipPath id='canvas-clip'>
                  <rect x={0} y={0} width={W} height={CANVAS_H} />
                </clipPath>
              </defs>

              {/* Unit boundary lines at x=0 and x=1 */}
              <line
                x1={toSvg(0, 0)[0]}
                y1={0}
                x2={toSvg(0, 0)[0]}
                y2={CANVAS_H}
                stroke='var(--shell-grid)'
                strokeDasharray='2 4'
              />
              <line
                x1={toSvg(1, 0)[0]}
                y1={0}
                x2={toSvg(1, 0)[0]}
                y2={CANVAS_H}
                stroke='var(--shell-grid)'
                strokeDasharray='2 4'
              />

              {/* Unit boundary lines at y=0 and y=1 */}
              <line
                x1={0}
                y1={toSvg(0, 0)[1]}
                x2={W}
                y2={toSvg(0, 0)[1]}
                stroke='var(--shell-grid)'
                strokeDasharray='2 4'
              />
              <line
                x1={0}
                y1={toSvg(0, 1)[1]}
                x2={W}
                y2={toSvg(0, 1)[1]}
                stroke='var(--shell-grid)'
                strokeDasharray='2 4'
              />

              {/* Clipped group: handles, curve, anchors */}
              <g clipPath='url(#canvas-clip)'>
                <line
                  x1={start[0]}
                  y1={start[1]}
                  x2={p1[0]}
                  y2={p1[1]}
                  stroke='var(--shell-handle)'
                  strokeWidth={1}
                />
                <line
                  x1={end[0]}
                  y1={end[1]}
                  x2={p2[0]}
                  y2={p2[1]}
                  stroke='var(--shell-handle)'
                  strokeWidth={1}
                />

                <path
                  d={path}
                  fill='none'
                  stroke='var(--shell-ink)'
                  strokeWidth={0.8}
                />

                <circle
                  cx={start[0]}
                  cy={start[1]}
                  r={3}
                  fill='var(--shell-ink)'
                />
                <circle
                  cx={end[0]}
                  cy={end[1]}
                  r={3}
                  fill='var(--shell-ink)'
                />
              </g>

              {/* Draggable control points */}
              <circle
                cx={p1[0]}
                cy={p1[1]}
                r={6}
                fill='var(--shell-accent)'
                stroke='var(--shell-bg)'
                strokeWidth={1.5}
                style={{ cursor: 'grab' }}
                onPointerDown={onPointerDown(0)}
              />
              <circle
                cx={p2[0]}
                cy={p2[1]}
                r={6}
                fill='var(--shell-accent)'
                stroke='var(--shell-bg)'
                strokeWidth={1.5}
                style={{ cursor: 'grab' }}
                onPointerDown={onPointerDown(1)}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
