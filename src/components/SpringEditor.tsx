'use client';

/* ---------------------------------------------------------------
   SpringEditor
   Three sliders (stiffness, damping, mass) with a spring-animated
   preview track. Shares track geometry with BezierEditor's tween
   track so unit ticks align vertically.
   --------------------------------------------------------------- */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';
import {
  TRACK_0_PCT,
  TRACK_1_PCT,
  BALL_D,
  BALL_R,
  BALL_PAD,
  TRACK_H,
} from './trackGeometry';

export interface SpringParams {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface SpringEditorProps {
  value: SpringParams;
  onChange: (value: SpringParams) => void;
}

/* ── Slider styling ── */
const SLIDER_CSS = `
.spring-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 2px;
  border-radius: 1px;
  outline: none;
  cursor: pointer;
  /* filled portion set via inline style */
}
.spring-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--shell-ink);
  border: none;
  cursor: grab;
}
.spring-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--shell-ink);
  border: none;
  cursor: grab;
}
.spring-slider:active::-webkit-slider-thumb { cursor: grabbing; }
.spring-slider:active::-moz-range-thumb { cursor: grabbing; }
`;

export function SpringEditor({ value, onChange }: SpringEditorProps) {
  const [replayKey, setReplayKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const scheduleReplay = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setReplayKey((k) => k + 1), 150);
  }, []);

  const set = useCallback(
    (field: keyof SpringParams, v: number) => {
      onChange({ ...value, [field]: v });
      scheduleReplay();
    },
    [value, onChange, scheduleReplay],
  );

  return (
    <div>
      <style>{SLIDER_CSS}</style>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SliderRow
          label='stiffness'
          value={value.stiffness}
          min={1}
          max={1000}
          step={5}
          onChange={(v) => set('stiffness', v)}
        />
        <SliderRow
          label='damping'
          value={value.damping}
          min={1}
          max={100}
          step={1}
          onChange={(v) => set('damping', v)}
        />
        <SliderRow
          label='mass'
          value={value.mass}
          min={0.5}
          max={5}
          step={0.1}
          format={(v) => v.toFixed(1)}
          onChange={(v) => set('mass', v)}
        />
      </div>

      {/* Replay */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 10,
          marginBottom: 10,
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

      {/* Spring preview track */}
      <div
        style={{
          height: TRACK_H,
          position: 'relative',
          background: 'var(--shell-track)',
          borderRadius: TRACK_H / 2,
          cursor: 'pointer',
        }}
        onClick={() => setReplayKey((k) => k + 1)}
      >
        <div
          style={{
            position: 'absolute',
            left: `calc(${TRACK_0_PCT}% - 0.5px)`,
            top: 0,
            width: 1,
            height: TRACK_H,
            background: 'var(--shell-grid)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${TRACK_1_PCT}% - 0.5px)`,
            top: 0,
            width: 1,
            height: TRACK_H,
            background: 'var(--shell-grid)',
          }}
        />
        <SpringBall
          key={replayKey}
          stiffness={value.stiffness}
          damping={value.damping}
          mass={value.mass}
        />
      </div>
    </div>
  );
}

/* ── Spring-animated ball ── */

function SpringBall({
  stiffness,
  damping,
  mass,
}: {
  stiffness: number;
  damping: number;
  mass: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const target = useMotionValue(0);
  const springVal = useSpring(target, { stiffness, damping, mass });

  useEffect(() => {
    const unsub = springVal.on('change', (v) => {
      if (!elRef.current) return;
      const pct = TRACK_0_PCT + v * (TRACK_1_PCT - TRACK_0_PCT);
      elRef.current.style.left = `calc(${pct}% - ${BALL_R}px)`;
    });
    return unsub;
  }, [springVal]);

  useEffect(() => {
    target.set(1);
  }, [target]);

  return (
    <div
      ref={elRef}
      style={{
        position: 'absolute',
        top: BALL_PAD,
        width: BALL_D,
        height: BALL_D,
        borderRadius: '50%',
        background: 'var(--shell-ink)',
        left: `calc(${TRACK_0_PCT}% - ${BALL_R}px)`,
      }}
    />
  );
}

/* ── Slider row ── */

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const fillPct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'var(--shell-text-muted)',
            fontFamily: 'var(--shell-font-mono)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--shell-text-dim)',
            fontFamily: 'var(--shell-font-mono)',
            minWidth: 32,
            textAlign: 'right',
          }}
        >
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type='range'
        className='spring-slider'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--shell-track-active) ${fillPct}%, var(--shell-track) ${fillPct}%)`,
        }}
      />
    </div>
  );
}
