'use client';

/* ---------------------------------------------------------------
   CommandPalettePreview
   Autoplay: types "open", pauses 1.5 s, auto-selects the first
   match, then holds. User takeover stops autoplay permanently.
   Replay button resets and re-runs the sequence.
   --------------------------------------------------------------- */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionTokens } from '../lib/MotionTokensContext';

const GROUPS = [
  {
    label: 'COMMANDS',
    actions: [
      { id: 1, label: 'Create new project' },
      { id: 2, label: 'Open settings' },
      { id: 3, label: 'Switch theme' },
    ],
  },
  {
    label: 'SUGGESTIONS',
    actions: [
      { id: 4, label: 'Switch workspace' },
      { id: 5, label: 'Change theme' },
      { id: 6, label: 'Open shortcuts' },
    ],
  },
];

const BASE_TYPE_MS = 135;
const JITTER_MS = 20;
const PAUSE_MS = 1500;

// functional-primary: TIMING stays constant regardless of style tokens —
// only entrance curve (bezier) and spring texture adapt.
/* 80 ms max for item enter/exit opacity */
const OPACITY_FAST = { duration: 0.08 } as const;
/* Group labels pop in/out with zero delay */
const OPACITY_INSTANT = { duration: 0 } as const;

export interface CommandPalettePreviewProps {
  onReplayReady?: (replay: () => void) => void;
}

export function CommandPalettePreview({
  onReplayReady,
}: CommandPalettePreviewProps) {
  const { bezier, spring } = useMotionTokens();
  // responsiveness floor — functional-primary must always feel instant, never loose
  const s = Math.max(300, spring.stiffness);
  const d = Math.max(spring.damping, 0.9 * 2 * Math.sqrt(s * spring.mass));
  // Entrance character follows bezier; duration stays hardcoded (functional-primary)
  const paletteTransition = { type: 'tween' as const, duration: 0.15, ease: bezier };
  const highlightSpring = { type: 'spring' as const, stiffness: s, damping: d, mass: spring.mass };

  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dimmed, setDimmed] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout>>();
  const userTookOver = useRef(false);

  const filteredGroups = GROUPS.map((g) => ({
    ...g,
    actions: g.actions.filter((a) =>
      a.label.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter((g) => g.actions.length > 0);

  const flatActions = filteredGroups.flatMap((g) => g.actions);

  useEffect(() => {
    setSelectedIdx((i) => Math.min(i, Math.max(0, flatActions.length - 1)));
  }, [flatActions.length]);

  const clearAuto = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
  }, []);

  const startAutoplay = useCallback(() => {
    const word = 'open';
    let pos = 0;

    function typeStep() {
      if (userTookOver.current) return;
      pos++;
      setQuery(word.slice(0, pos));
      if (pos < word.length) {
        const jitter = (Math.random() * 2 - 1) * JITTER_MS;
        autoTimer.current = setTimeout(typeStep, BASE_TYPE_MS + jitter);
      } else {
        /* Typing done — pause, then auto-select first match */
        autoTimer.current = setTimeout(() => {
          if (userTookOver.current) return;
          setQuery('Open settings');
          setSelectedIdx(0);
          setDimmed(true);
        }, PAUSE_MS);
      }
    }

    autoTimer.current = setTimeout(() => {
      typeStep();
    }, 800);
  }, []);

  useEffect(() => {
    startAutoplay();
    return clearAuto;
  }, [startAutoplay, clearAuto]);

  /* Expose replay — small delay lets blank state render before typing starts */
  useEffect(() => {
    if (!onReplayReady) return;
    const replay = () => {
      clearAuto();
      userTookOver.current = false;
      setQuery('');
      setDimmed(false);
      setSelectedIdx(0);
      setOpen(true);
      autoTimer.current = setTimeout(startAutoplay, 50);
    };
    onReplayReady(replay);
  }, [onReplayReady, clearAuto, startAutoplay]);

  const handleUserTakeover = useCallback(() => {
    if (userTookOver.current) return;
    userTookOver.current = true;
    clearAuto();
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [clearAuto]);

  const handleClose = useCallback(() => setOpen(false), []);

  const selectAction = useCallback((label: string) => {
    setQuery(label);
    setDimmed(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIdx((i) => Math.min(i + 1, flatActions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIdx((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          if (flatActions[selectedIdx])
            selectAction(flatActions[selectedIdx].label);
          break;
        case 'Escape':
          handleClose();
          break;
      }
    },
    [flatActions, selectedIdx, handleClose, selectAction],
  );

  return (
    /* Stage: overflow:hidden clips all palette content strictly */
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 260,
        overflow: 'hidden',
      }}
      onClick={() => {
        if (!open) {
          setOpen(true);
          handleUserTakeover();
        }
      }}
    >
      {/* Centering wrapper — no animation, keeps Framer transforms clean */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 32px)',
          zIndex: 1,
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={paletteTransition}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                // boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                /* overflow:hidden is the hard clip boundary for all exits */
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleUserTakeover();
              }}
            >
              <input
                ref={inputRef}
                type='text'
                value={query}
                onChange={(e) => {
                  handleUserTakeover();
                  setQuery(e.target.value);
                  setDimmed(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder='Type a command or search...'
                autoComplete='off'
                spellCheck={false}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--color-text)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                }}
              />

              {/* Results — overflow:hidden clips exits at card edge */}
              <motion.div
                animate={{ opacity: dimmed ? 0.35 : 1 }}
                transition={{ duration: 0.15 }}
                style={{ padding: '4px 0', overflow: 'hidden' }}
              >
                <AnimatePresence mode='popLayout' initial={false}>
                  {filteredGroups.flatMap((group) => [
                    /* Group label: layout-spring for position, instant opacity */
                    <motion.div
                      key={`label-${group.label}`}
                      layout
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        layout: highlightSpring,
                        opacity: OPACITY_INSTANT,
                      }}
                      style={{
                        padding: '6px 12px 2px',
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase' as const,
                        color: 'var(--color-muted)',
                        fontFamily: 'var(--font-sans)',
                        userSelect: 'none' as const,
                      }}
                    >
                      {group.label}
                    </motion.div>,

                    /* Action items: 80ms opacity, layout spring for movement */
                    ...group.actions.map((action) => {
                      const flatIdx = flatActions.indexOf(action);
                      return (
                        <motion.div
                          key={action.id}
                          layoutId={String(action.id)}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            layout: highlightSpring,
                            opacity: OPACITY_FAST,
                          }}
                          onMouseEnter={() => setSelectedIdx(flatIdx)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserTakeover();
                            selectAction(action.label);
                          }}
                          style={{
                            padding: '5px 12px',
                            fontSize: 'var(--text-sm)',
                            fontFamily: 'var(--font-sans)',
                            color:
                              flatIdx === selectedIdx
                                ? 'var(--color-accent)'
                                : 'var(--color-muted)',
                            background:
                              flatIdx === selectedIdx
                                ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
                                : 'transparent',
                            cursor: 'pointer',
                            userSelect: 'none' as const,
                            borderRadius: 'var(--radius-xs)',
                            margin: '0 4px',
                          }}
                        >
                          {action.label}
                        </motion.div>
                      );
                    }),
                  ])}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
