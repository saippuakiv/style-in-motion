'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  type DesignTokens,
  DEFAULTS,
  SUGGESTIONS,
  generateTokens,
  loadFont,
  tokenVars,
} from './lib/api';
import { MotionTokensProvider } from './lib/MotionTokensContext';
import { BezierEditor, type Bezier } from './components/BezierEditor';
import {
  SpringEditor,
  SliderRow,
  type SpringParams,
} from './components/SpringEditor';
import { CommandPalettePreview } from './components/CommandPalette';
import { ToastPreview } from './components/Toast';
import { StreamingText } from './components/StreamingText';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { SkeletonCard } from './components/SkeletonCard';
import { ContextMenuPreview } from './components/ContextMenu';
import { OnboardingDialog } from './components/OnboardingDialog';
import { DrawerPreview } from './components/Drawer';

/* The 8 preview cells. Components that exist render live;
   the rest show an empty placeholder. */
const CELLS = [
  'Command Palette',
  'Toast',
  'Context Menu',
  'Drawer',
  'Skeleton',
  'Multi-step Dialog',
  'Streaming Text',
  'Thinking Indicator',
] as const;

/* Generate-button breathe constants — fixed chrome, never token-driven.
   #d9d4c8 = --shell-disabled; #e2ddd1 is +8% HSL lightness (eye-set:
   perceptible slow pulse against the static white label, never a flicker). */
const BREATHE_BASE = '#085203';
const BREATHE_LIGHT = '#119405';
const BREATHE_PERIOD_S = 1.4; // single source of truth for the loading cadence
const DOT_FLOOR = 0.2; // dots never fully vanish (elegant, non-flickery)
// must match --shell-accent in shell.css (double-write for Framer Motion interpolation)
const SHELL_ACCENT = '#0C7605';

export function App() {
  const reduceMotion = useReducedMotion();
  const [tokens, setTokens] = useState<DesignTokens>(DEFAULTS);
  const [bezier, setBezier] = useState<Bezier>([0.16, 1, 0.3, 1]);
  const [spring, setSpring] = useState<SpringParams>({
    stiffness: DEFAULTS.springStiffness,
    damping: DEFAULTS.springDamping,
    mass: DEFAULTS.springMass,
  });
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [switchOn, setSwitchOn] = useState(true);
  const [streamReplay, setStreamReplay] = useState<(() => void) | null>(null);
  const [cmdReplay, setCmdReplay] = useState<(() => void) | null>(null);
  const [skelReplay, setSkelReplay] = useState<(() => void) | null>(null);
  const [ctxReplay, setCtxReplay] = useState<(() => void) | null>(null);

  /* Stable callbacks — inline arrow functions in JSX re-create every render,
     causing onReplayReady useEffects in children to loop infinitely. */
  const onStreamReplayReady = useCallback(
    (fn: () => void) => setStreamReplay(() => fn),
    [],
  );
  const onCmdReplayReady = useCallback(
    (fn: () => void) => setCmdReplay(() => fn),
    [],
  );
  const onSkelReplayReady = useCallback(
    (fn: () => void) => setSkelReplay(() => fn),
    [],
  );
  const onCtxReplayReady = useCallback(
    (fn: () => void) => setCtxReplay(() => fn),
    [],
  );

  useEffect(() => {
    loadFont(DEFAULTS.fontSans);
    loadFont('Diplomata');
    loadFont('El Messiri');
  }, []);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const t = await generateTokens(prompt);
      const merged = { ...DEFAULTS, ...t };
      setTokens(merged);
      setSpring({
        stiffness: merged.springStiffness,
        damping: merged.springDamping,
        mass: merged.springMass,
      });
      if (merged.bezier) setBezier(merged.bezier);
      if (merged.fontSans) loadFont(merged.fontSans);
      setHasGenerated(true);
    } catch {
      setError('Generation failed \u2014 try again');
    }
    setLoading(false);
  };

  const reset = () => {
    setTokens(DEFAULTS);
    setPrompt('');
    setBezier([0.16, 1, 0.3, 1]);
    setSpring({
      stiffness: DEFAULTS.springStiffness,
      damping: DEFAULTS.springDamping,
      mass: DEFAULTS.springMass,
    });
    setHasGenerated(false);
  };

  const handleSpringChange = (s: SpringParams) => {
    setSpring(s);
    setTokens((prev) => ({
      ...prev,
      springStiffness: s.stiffness,
      springDamping: s.damping,
      springMass: s.mass,
    }));
  };

  /* Motion key — changes whenever any motion value changes.
     Debounced so slider dragging doesn't remount on every tick. */
  const motionKey = [
    spring.stiffness,
    spring.damping,
    spring.mass,
    ...bezier,
    tokens.durationScale,
    tokens.entranceDistance,
    tokens.staggerDelay,
    tokens.revealGranularity,
    tokens.thinkingPosture,
  ].join('-');

  const [debouncedMotionKey, setDebouncedMotionKey] = useState(motionKey);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => setDebouncedMotionKey(motionKey),
      300,
    );
    return () => clearTimeout(debounceRef.current);
  }, [motionKey]);

  /* Generated-token overrides scoped to the preview panel */
  const vars = tokenVars(tokens, bezier);

  function renderCell(name: string) {
    switch (name) {
      case 'Command Palette':
        return (
          <CommandPalettePreview
            key={debouncedMotionKey}
            onReplayReady={onCmdReplayReady}
          />
        );
      case 'Toast':
        return <ToastPreview key={debouncedMotionKey} />;
      case 'Streaming Text':
        return (
          <StreamingText
            key={debouncedMotionKey}
            onReplayReady={onStreamReplayReady}
          />
        );
      case 'Skeleton':
        return (
          <SkeletonCard
            key={debouncedMotionKey}
            onReplayReady={onSkelReplayReady}
          />
        );
      case 'Context Menu':
        return (
          <ContextMenuPreview
            key={debouncedMotionKey}
            onReplayReady={onCtxReplayReady}
          />
        );
      case 'Drawer':
        return <DrawerPreview key={debouncedMotionKey} />;
      case 'Multi-step Dialog':
        return <OnboardingDialog key={debouncedMotionKey} />;
      case 'Thinking Indicator':
        return <ThinkingIndicator key={debouncedMotionKey} />;
      default:
        return null;
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        color: 'var(--shell-text)',
        fontFamily: 'var(--shell-font)',
      }}
    >
      {/* ─── Sidebar ─── */}
      <aside
        style={{
          width: 'var(--shell-panel-width)',
          minWidth: 'var(--shell-panel-width)',
          padding: 'var(--space-6) var(--space-4)',
          overflowY: 'auto',
          borderRight: '1px solid var(--shell-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          background: 'var(--shell-bg-left)',
        }}
      >
        {/* Header */}
        <div>
          {/* <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: SHELL_ACCENT,
              marginBottom: 2,
            }}
          >
            <span style={{ fontFamily: 'Diplomata, serif' }}>S</span>tyle{' '}
            <span style={{ fontFamily: 'El Messiri, sans-serif' }}>i</span>n{' '}
            <span style={{ fontFamily: 'El Messiri, sans-serif' }}>m</span>otion
          </div> */}
          <img src='/title.svg' alt='title' width={290.47} height={37.48} />
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--shell-text-dim)',
            }}
          >
            prompt &rarr; tokens &rarr; components
          </div>
        </div>

        {/* ── Style Prompt ── */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <ShellLabel>Style Prompt</ShellLabel>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={'e.g. "dark luxury, gold on obsidian"'}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) generate();
            }}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              fontSize: 13,
              resize: 'vertical',
              maxHeight: 120,
              background: 'var(--shell-surface)',
              border: '1px solid var(--shell-border)',
              borderRadius: 'var(--shell-radius)',
              color: 'var(--shell-text)',
              outline: 'none',
              fontFamily: 'var(--shell-font)',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-1)',
            }}
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                style={{
                  padding: 'var(--space-1) var(--space-2)',
                  fontSize: 10,
                  background: 'var(--shell-surface)',
                  border: '1px solid var(--shell-border)',
                  borderRadius: 'var(--shell-radius-sm)',
                  color: 'var(--shell-text-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {s}
              </button>
            ))}
          </div>
          {/* deliberate: generate button is fixed chrome, not a preview
              component — breathe is a constant, style-independent affordance
              and does NOT consume motion tokens. No new tokens exist
              mid-generation (the model is still computing them), and the
              control panel stays neutral so style signal is carried only by
              the eight previews. */}
          <motion.button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            animate={
              loading
                ? reduceMotion
                  ? { backgroundColor: BREATHE_LIGHT }
                  : {
                      backgroundColor: [
                        BREATHE_BASE,
                        BREATHE_LIGHT,
                        BREATHE_BASE,
                      ],
                    }
                : { backgroundColor: SHELL_ACCENT }
            }
            transition={
              loading && !reduceMotion
                ? {
                    duration: BREATHE_PERIOD_S,
                    ease: 'easeInOut',
                    repeat: Infinity,
                  }
                : { duration: 0.3 }
            }
            style={{
              width: '100%',
              padding: 'var(--space-3) 0',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: loading ? BREATHE_BASE : SHELL_ACCENT,
              color: 'var(--shell-accent-fg)',
              border: 'none',
              borderRadius: 'var(--shell-radius)',
              cursor: loading ? 'wait' : 'pointer',
              opacity: !prompt.trim() && !loading ? 0.4 : 1,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {/* Label crossfade: both labels stacked in the same grid cell.
                initial={false} ensures the animate value applies on mount
                with no entry transition — so on first load only "Generate
                Tokens" is visible (loading starts false). */}
            <motion.span
              key='idle'
              initial={false}
              animate={{ opacity: loading ? 0 : 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              style={{ gridArea: '1/1' }}
            >
              Generate Tokens
            </motion.span>
            <motion.span
              key='loading'
              initial={false}
              animate={{ opacity: loading ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              style={{ gridArea: '1/1' }}
            >
              Generating
              <span aria-hidden style={{ display: 'inline-flex' }}>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: DOT_FLOOR }}
                    animate={
                      loading && !reduceMotion
                        ? { opacity: [DOT_FLOOR, 1, DOT_FLOOR] }
                        : { opacity: 1 }
                    }
                    transition={
                      loading && !reduceMotion
                        ? {
                            duration: BREATHE_PERIOD_S,
                            ease: 'easeInOut',
                            repeat: Infinity,
                            delay: (i * BREATHE_PERIOD_S) / 3,
                          }
                        : { duration: 0 }
                    }
                    style={{
                      paddingInline: '0.06em',
                      fontSize: '1.4em',
                      lineHeight: 1,
                    }}
                  >
                    .
                  </motion.span>
                ))}
              </span>
            </motion.span>
          </motion.button>
          {error && (
            <div style={{ fontSize: 11, color: 'var(--shell-error)' }}>
              {error}
            </div>
          )}
        </section>

        {/* ── Color & Type ── */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <ShellLabel>Color &amp; Type</ShellLabel>
          <div
            style={{
              borderRadius: 'var(--shell-radius)',
              border: '1px dashed var(--shell-border)',
              ...(hasGenerated
                ? { padding: 'var(--space-3)' }
                : {
                    minHeight: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }),
            }}
          >
            {!hasGenerated ? (
              <span style={{ fontSize: 11, color: 'var(--shell-text-dim)' }}>
                Generate to see tokens
              </span>
            ) : (
              <>
                <SubLabel>Color</SubLabel>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--space-2)',
                    marginTop: 'var(--space-2)',
                  }}
                >
                  {(
                    [
                      ['bg', tokens.bg],
                      ['surface', tokens.surface],
                      ['text', tokens.text],
                      ['muted', tokens.muted],
                      ['border', tokens.border],
                      ['accent', tokens.accent],
                      ['accentText', tokens.accentText],
                      ['primary', tokens.primary],
                      ['secondary', tokens.secondary],
                    ] as [string, string][]
                  ).map(([name, hex]) => (
                    <div
                      key={name}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          background: hex,
                          border: '1px solid var(--shell-border)',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--shell-text-muted)',
                            fontFamily: 'var(--shell-font-mono)',
                            lineHeight: 1.2,
                          }}
                        >
                          {name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--shell-text-dim)',
                            fontFamily: 'var(--shell-font-mono)',
                            lineHeight: 1.2,
                          }}
                        >
                          {hex}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    borderTop: '1px dashed var(--shell-border)',
                    marginTop: 'var(--space-3)',
                    marginBottom: 'var(--space-3)',
                  }}
                />

                <SubLabel>Type &amp; Radius</SubLabel>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 'var(--space-2)',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--shell-text-muted)',
                        fontFamily: 'var(--shell-font-mono)',
                        flexShrink: 0,
                      }}
                    >
                      fontSans
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--shell-text)',
                        fontFamily: `"${tokens.fontSans}", system-ui, sans-serif`,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tokens.fontSans}
                    </span>
                  </div>
                  {(
                    [
                      ['radiusSm', tokens.radiusSm],
                      ['radiusMd', tokens.radiusMd],
                      ['radiusLg', tokens.radiusLg],
                    ] as [string, string][]
                  ).map(([name, val]) => (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--shell-text-muted)',
                          fontFamily: 'var(--shell-font-mono)',
                          flexShrink: 0,
                        }}
                      >
                        {name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--shell-text-dim)',
                          fontFamily: 'var(--shell-font-mono)',
                        }}
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Motion ── */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <ShellLabel>Motion</ShellLabel>

          <SubLabel>Tween</SubLabel>
          <BezierEditor value={bezier} onChange={setBezier} />

          <SubLabel style={{ marginTop: 8 }}>Spring</SubLabel>
          <SpringEditor value={spring} onChange={handleSpringChange} />

          <SubLabel style={{ marginTop: 8 }}>Expression</SubLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SliderRow
              label='durationScale'
              value={tokens.durationScale}
              min={0.6}
              max={1.6}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={(v) =>
                setTokens((prev) => ({ ...prev, durationScale: v }))
              }
            />
            <SliderRow
              label='entranceDistance'
              value={tokens.entranceDistance}
              min={0}
              max={100}
              step={2}
              format={(v) => `${Math.round(v)}px`}
              onChange={(v) =>
                setTokens((prev) => ({ ...prev, entranceDistance: v }))
              }
            />
            <SliderRow
              label='staggerDelay'
              value={tokens.staggerDelay}
              min={0}
              max={0.15}
              step={0.005}
              format={(v) => v.toFixed(3)}
              onChange={(v) =>
                setTokens((prev) => ({ ...prev, staggerDelay: v }))
              }
            />
          </div>
        </section>

        {/* ── Rationale (diagnostic) ── */}
        {hasGenerated && tokens.rationale.length > 0 && (
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--shell-text-dim)',
                fontFamily: 'var(--shell-font-mono)',
              }}
            >
              rationale (diagnostic)
            </div>
            <div
              style={{
                padding: 'var(--space-2)',
                border: '1px dashed var(--shell-border)',
                borderRadius: 'var(--shell-radius-sm)',
                fontSize: 10,
                fontFamily: 'var(--shell-font-mono)',
                color: 'var(--shell-text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {tokens.rationale.map((r, i) => (
                <div key={i}>
                  {r.summary && (
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 11,
                        color: 'var(--shell-text)',
                        fontFamily: 'var(--shell-font)',
                      }}
                    >
                      {r.summary}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: r.summary ? 2 : 0,
                      fontWeight: 500,
                      color: 'var(--shell-text-muted)',
                    }}
                  >
                    {r.decision}
                  </div>
                  <div style={{ marginTop: 1 }}>{r.why}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reset */}
        <button
          onClick={reset}
          style={{
            padding: 'var(--space-2) 0',
            fontSize: 12,
            background: 'transparent',
            border: '1px solid var(--shell-border)',
            borderRadius: 'var(--shell-radius-sm)',
            color: 'var(--shell-text-dim)',
            cursor: 'pointer',
          }}
        >
          Reset to defaults
        </button>
      </aside>

      {/* ─── Preview ─── */}
      <MotionTokensProvider
        value={{
          spring,
          bezier,
          durationScale: tokens.durationScale,
          entranceDistance: tokens.entranceDistance,
          staggerDelay: tokens.staggerDelay,
          revealGranularity: tokens.revealGranularity,
          thinkingPosture: tokens.thinkingPosture,
        }}
      >
        <main
          style={{
            ...(vars as React.CSSProperties),
            flex: 1,
            overflowY: 'auto',
            background: 'var(--shell-bg-right)',
            padding: 'var(--space-6)',
            fontFamily: 'var(--font-sans)',
            transition: 'background-color var(--duration-slow) var(--ease-out)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-4)',
            }}
          >
            {CELLS.map((name) => (
              <PreviewCell
                key={name}
                name={name}
                headerRight={(() => {
                  const fn =
                    name === 'Streaming Text'
                      ? streamReplay
                      : name === 'Command Palette'
                        ? cmdReplay
                        : name === 'Skeleton'
                          ? skelReplay
                          : name === 'Context Menu'
                            ? ctxReplay
                            : null;
                  return fn ? (
                    <button
                      type='button'
                      onClick={fn}
                      style={{
                        padding: 0,
                        fontSize: 10,
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-muted)',
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                      }}
                    >
                      replay
                    </button>
                  ) : undefined;
                })()}
              >
                {renderCell(name)}
              </PreviewCell>
            ))}
          </div>
        </main>
      </MotionTokensProvider>
    </div>
  );
}

/* ─── Shell helpers (app chrome, not design-system components) ─── */

function ShellLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--shell-text-dim)',
        fontFamily: 'var(--shell-font-mono)',
      }}
    >
      {children}
    </div>
  );
}

function SubLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--shell-text-dim)',
        fontFamily: 'var(--shell-font-mono)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Preview helpers (inside the generated-token scope) ─── */

function PreviewCell({
  name,
  headerRight,
  children,
}: {
  name: string;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        minHeight: 200,
        transition:
          'background-color var(--duration-base) var(--ease-out), ' +
          'border-color var(--duration-base) var(--ease-out)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-muted)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {name}
        </span>
        {headerRight}
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
