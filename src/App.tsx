'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { SpringEditor, SliderRow, type SpringParams } from './components/SpringEditor';
import { CommandPalettePreview } from './components/CommandPalette';
import { Switch } from './components/Switch';
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

export function App() {
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
  const [cmdReplay,    setCmdReplay]    = useState<(() => void) | null>(null);
  const [skelReplay,   setSkelReplay]   = useState<(() => void) | null>(null);
  const [ctxReplay,    setCtxReplay]    = useState<(() => void) | null>(null);

  /* Stable callbacks — inline arrow functions in JSX re-create every render,
     causing onReplayReady useEffects in children to loop infinitely. */
  const onStreamReplayReady = useCallback((fn: () => void) => setStreamReplay(() => fn), []);
  const onCmdReplayReady    = useCallback((fn: () => void) => setCmdReplay(() => fn), []);
  const onSkelReplayReady   = useCallback((fn: () => void) => setSkelReplay(() => fn), []);
  const onCtxReplayReady    = useCallback((fn: () => void) => setCtxReplay(() => fn), []);

  useEffect(() => {
    loadFont(DEFAULTS.fontSans);
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

  /* Generated-token overrides scoped to the preview panel */
  const vars = tokenVars(tokens, bezier);

  function renderCell(name: string) {
    switch (name) {
      case 'Command Palette':
        return <CommandPalettePreview onReplayReady={onCmdReplayReady} />;
      case 'Toast':
        return <ToastPreview />;
      case 'Streaming Text':
        return <StreamingText onReplayReady={onStreamReplayReady} />;
      case 'Skeleton':
        return <SkeletonCard onReplayReady={onSkelReplayReady} />;
      case 'Context Menu':
        return (
          <ContextMenuPreview onReplayReady={onCtxReplayReady} />
        );
      case 'Drawer':
        return <DrawerPreview />;
      case 'Multi-step Dialog':
        return <OnboardingDialog />;
      case 'Thinking Indicator':
        return <ThinkingIndicator />;
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
          padding: 'var(--space-5) var(--space-4)',
          overflowY: 'auto',
          borderRight: '1px solid var(--shell-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          background: 'var(--shell-bg-left)',
        }}
      >
        {/* Header */}
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--shell-text)',
              marginBottom: 2,
            }}
          >
            motion-ui
          </div>
          <div style={{ fontSize: 12, color: 'var(--shell-text-dim)' }}>
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
              display: 'flex',
              flexWrap: 'wrap',
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
                }}
              >
                {s.length > 32 ? s.slice(0, 32) + '\u2026' : s}
              </button>
            ))}
          </div>
          <button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            style={{
              width: '100%',
              padding: 'var(--space-3) 0',
              fontSize: 13,
              fontWeight: 600,
              background: loading
                ? 'var(--shell-disabled)'
                : 'var(--shell-accent)',
              color: 'var(--shell-accent-fg)',
              border: 'none',
              borderRadius: 'var(--shell-radius)',
              cursor: loading ? 'wait' : 'pointer',
              opacity: !prompt.trim() && !loading ? 0.4 : 1,
            }}
          >
            {loading ? 'Generating\u2026' : 'Generate Tokens'}
          </button>
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
                          fontSize: 10,
                          color: 'var(--shell-text-muted)',
                          fontFamily: 'var(--shell-font-mono)',
                          lineHeight: 1.2,
                        }}
                      >
                        {name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
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
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--shell-text-muted)',
                      fontFamily: 'var(--shell-font-mono)',
                      flexShrink: 0,
                    }}
                  >
                    fontSans
                  </span>
                  <span
                    style={{
                      fontSize: 11,
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
                    style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--shell-text-muted)',
                        fontFamily: 'var(--shell-font-mono)',
                        flexShrink: 0,
                      }}
                    >
                      {name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
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
              onChange={(v) => setTokens((prev) => ({ ...prev, durationScale: v }))}
            />
            <SliderRow
              label='entranceDistance'
              value={tokens.entranceDistance}
              min={0}
              max={100}
              step={2}
              format={(v) => `${Math.round(v)}px`}
              onChange={(v) => setTokens((prev) => ({ ...prev, entranceDistance: v }))}
            />
            <SliderRow
              label='staggerDelay'
              value={tokens.staggerDelay}
              min={0}
              max={0.15}
              step={0.005}
              format={(v) => v.toFixed(3)}
              onChange={(v) => setTokens((prev) => ({ ...prev, staggerDelay: v }))}
            />
          </div>
        </section>

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
