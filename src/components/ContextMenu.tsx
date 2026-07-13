'use client';

/* ---------------------------------------------------------------
   ContextMenuPreview
   Displays a single-line text strip with a highlighted phrase.
   Right-click anywhere opens a positioned context menu.
   Autoplay: open menu → hover Translate → show submenu → dismiss.
   --------------------------------------------------------------- */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionTokens } from '../lib/MotionTokensContext';

/* ── Constants ── */

const FIRST_LEVEL = ['Explain', 'Summarize', 'Translate'] as const;
const SECOND_LEVEL = ['English', 'Chinese', 'Japanese', 'French'] as const;

const MENU_WIDTH = 160;
const SUBMENU_WIDTH = 148;
const ITEM_H = 28; // 7+7 vertical padding + 14px text
const VPAD = 4; // menu card top/bottom padding
const MENU_H = VPAD * 2 + FIRST_LEVEL.length * ITEM_H; // 92
const SUBMENU_H = VPAD * 2 + SECOND_LEVEL.length * ITEM_H; // 120
const TRANSLATE_IDX = 2;
const SUB_Y_OFFSET = VPAD + TRANSLATE_IDX * ITEM_H; // 60

// functional-primary: TIMING stays constant regardless of style tokens —
// only entrance curve (bezier) and spring texture adapt.
const INIT_DELAY_MS    = 800;  // pause before menu opens
const STEP_MS          = 160;  // between first-level highlight steps (fast, even)
const HOVER_INTENT_MS  = 400;  // pause after landing on submenu item before it opens
const SUB_STEP_MS      = 180;  // between sub-item highlight steps
const HOLD_AFTER_MS    = 600;  // hold after last sub-item before close
const CLOSE_GAP_MS     = 180;  // gap between submenu exit and menu exit

interface Pos {
  x: number;
  y: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/* ── Sub-components ── */

function MenuCard({
  width,
  children,
}: {
  width: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: `${VPAD}px 0`,
        width,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

function MenuItem({
  label,
  hasSubmenu = false,
  active = false,
  onMouseEnter,
  onClick,
}: {
  label: string;
  hasSubmenu?: boolean;
  active?: boolean;
  onMouseEnter?: () => void;
  onClick?: () => void;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 10px',
        margin: '0 4px',
        borderRadius: 'var(--radius-xs)',
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
        background: active
          ? 'color-mix(in srgb, var(--color-text) 6%, transparent)'
          : 'transparent',
        transition: 'background 80ms',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <span>{label}</span>
      {hasSubmenu && (
        <span
          style={{ color: 'var(--color-muted)', fontSize: 13, lineHeight: 1 }}
        >
          ›
        </span>
      )}
    </div>
  );
}

/* ── Main component ── */

export interface ContextMenuPreviewProps {
  onReplayReady?: (replay: () => void) => void;
}

export function ContextMenuPreview({ onReplayReady }: ContextMenuPreviewProps) {
  const { bezier, spring } = useMotionTokens();
  // responsiveness floor — functional-primary must always feel instant, never loose
  const s = Math.max(300, spring.stiffness);
  const d = Math.max(spring.damping, 0.9 * 2 * Math.sqrt(s * spring.mass));
  // Entrance character follows bezier; duration stays hardcoded (functional-primary)
  const menuTransition = { type: 'tween' as const, duration: 0.12, ease: bezier };
  // Entrance open spring — texture adapts to style, responsiveness floor applied
  const menuSpring = { type: 'spring' as const, stiffness: s, damping: d, mass: spring.mass };

  const [menuPos, setMenuPos] = useState<Pos | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [activeSubItem, setActiveSubItem] = useState<string | null>(null);
  const [submenuOpen, setSubmenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const userTookOver = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const closeMenu = useCallback(() => {
    setMenuPos(null);
    setActiveItem(null);
    setActiveSubItem(null);
    setSubmenuOpen(false);
  }, []);

  /* Place menu clamped to container bounds */
  const placeMenu = useCallback((rawX: number, rawY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setMenuPos({
      x: clamp(rawX, 4, width - MENU_WIDTH - 4),
      y: clamp(rawY, 4, height - MENU_H - 4),
    });
    setActiveItem(null);
    setSubmenuOpen(false);
  }, []);

  const startAutoplay = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const mx = width * 0.35;
    const my = height * 0.35;

    // Timeline: open → step Explain → step Summarize → step Translate (hover-intent) →
    //           submenu opens → step English → step Chinese → hold → submenu closes → menu closes
    let t = INIT_DELAY_MS;

    const push = (fn: () => void, delay: number) => {
      t += delay;
      timers.current.push(
        setTimeout(() => {
          if (userTookOver.current) return;
          fn();
        }, t),
      );
    };

    timers.current = [];

    // 1. Open menu
    timers.current.push(
      setTimeout(() => {
        if (userTookOver.current) return;
        placeMenu(mx, my);
      }, t),
    );

    // 2. Step through first-level items
    push(() => setActiveItem('Explain'), STEP_MS);
    push(() => setActiveItem('Summarize'), STEP_MS);
    // 3. Land on Translate — hover-intent pause before submenu opens
    push(() => setActiveItem('Translate'), STEP_MS);
    push(() => setSubmenuOpen(true), HOVER_INTENT_MS);

    // 4. Step through submenu items
    push(() => setActiveSubItem('English'), SUB_STEP_MS);
    push(() => setActiveSubItem('Chinese'), SUB_STEP_MS);

    // 5. Hold, then close submenu, then close menu
    push(() => setSubmenuOpen(false), HOLD_AFTER_MS);
    push(() => closeMenu(), CLOSE_GAP_MS);
  }, [placeMenu, closeMenu]);

  useEffect(() => {
    startAutoplay();
    return clearTimers;
  }, [startAutoplay, clearTimers]);

  useEffect(() => {
    if (!onReplayReady) return;
    const replay = () => {
      clearTimers();
      userTookOver.current = false;
      closeMenu();
      timers.current = [setTimeout(startAutoplay, 50)];
    };
    onReplayReady(replay);
  }, [onReplayReady, clearTimers, startAutoplay, closeMenu]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      userTookOver.current = true;
      clearTimers();
      const rect = containerRef.current!.getBoundingClientRect();
      placeMenu(e.clientX - rect.left, e.clientY - rect.top);
    },
    [clearTimers, placeMenu],
  );

  const handleClick = useCallback(() => {
    if (menuPos) closeMenu();
  }, [menuPos, closeMenu]);

  /* Submenu position: right of first menu unless that would overflow, then left */
  const showSubmenu = submenuOpen && menuPos != null;
  const submenuPos: Pos | null = (() => {
    if (!menuPos || !containerRef.current) return null;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const fitsRight = menuPos.x + MENU_WIDTH + SUBMENU_WIDTH + 8 <= width;

    const idealY = menuPos.y + SUB_Y_OFFSET;
    const maxY = height - SUBMENU_H - 20;
    const subY = Math.min(idealY, maxY);

    return {
      x: fitsRight ? menuPos.x + MENU_WIDTH + 4 : menuPos.x - SUBMENU_WIDTH - 4,
      y: clamp(subY, 4, maxY),
    };
  })();

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 200,
        overflow: 'hidden',
        cursor: 'context-menu',
        /* No padding — full dimensions available for menu clamping */
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: '24px',
      }}
    >
      {/* multi-line text strip with edge fade */}
      <div
        style={{
          width: '100%',
          overflow: 'hidden',
          textAlign: 'center',
          padding: '0 16px',
          maskImage:
            'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            display: 'inline',
            whiteSpace: 'normal',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text)',
            lineHeight: 1.6,
          }}
        >
          Motion in AI interfaces serves a functional role beyond aesthetics —
          it communicates system state,{' '}
          <span
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
              borderRadius: 'var(--radius-xs)',
              padding: '1px 0',
            }}
          >
            reduces perceived latency
          </span>
          , and builds trust through transparency of process.
        </span>
      </div>

      {/* First-level menu */}
      <AnimatePresence>
        {menuPos && (
          <motion.div
            key='ctx-menu'
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, transition: menuSpring }}
            exit={{ opacity: 0, scale: 0.95, transition: menuTransition }}
            style={{
              position: 'absolute',
              top: menuPos.y,
              left: menuPos.x,
              transformOrigin: 'top left',
              zIndex: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuCard width={MENU_WIDTH}>
              {FIRST_LEVEL.map((item) => (
                <MenuItem
                  key={item}
                  label={item}
                  hasSubmenu={item === 'Translate'}
                  active={activeItem === item}
                  onMouseEnter={() => {
                    userTookOver.current = true;
                    clearTimers();
                    setActiveItem(item);
                    setSubmenuOpen(item === 'Translate');
                  }}
                  onClick={() => {
                    if (item !== 'Translate') closeMenu();
                  }}
                />
              ))}
            </MenuCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submenu */}
      <AnimatePresence>
        {showSubmenu && submenuPos && (
          <motion.div
            key='ctx-submenu'
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, transition: menuSpring }}
            exit={{ opacity: 0, scale: 0.95, transition: menuTransition }}
            style={{
              position: 'absolute',
              top: submenuPos.y,
              left: submenuPos.x,
              transformOrigin: 'top left',
              zIndex: 11,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuCard width={SUBMENU_WIDTH}>
              {SECOND_LEVEL.map((item) => (
                <MenuItem
                  key={item}
                  label={item}
                  active={activeSubItem === item}
                  onMouseEnter={() => setActiveSubItem(item)}
                  onClick={() => {
                    closeMenu();
                  }}
                />
              ))}
            </MenuCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
