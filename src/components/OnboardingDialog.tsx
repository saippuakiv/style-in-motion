'use client';

/* ---------------------------------------------------------------
   OnboardingDialog
   Multi-step dialog rendered open in the demo card.
   Step 1: choose use case (4 cards)
   Step 2: choose response style (2 cards)
   Step 3: completion screen
   Forward: enters from right, exits to left
   Backward / reset: enters from left, exits to right
   --------------------------------------------------------------- */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionTokens } from '../lib/MotionTokensContext';

const USE_CASES = ['Writing', 'Coding', 'Research', 'Design'] as const;
type UseCase = (typeof USE_CASES)[number];
type ResponseStyle = 'Concise' | 'Detailed';

const DOT_SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;

const stepVariants = {
  enter: (dir: number) => ({ x: `${110 * dir}%`, opacity: 0 }),
  center: () => ({ x: '0%', opacity: 1 }),
  exit: (dir: number) => ({ x: `${-110 * dir}%`, opacity: 0 }),
};
/* ── Selectable option card (reused in step 1 & 2) ── */
function OptionCard({
  label,
  selected,
  flex = false,
  onClick,
}: {
  label: string;
  selected: boolean;
  flex?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: flex ? 1 : undefined,
        padding: '11px 12px',
        border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-sm)',
        background: selected
          ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
          : 'transparent',
        cursor: 'pointer',
        textAlign: 'center',
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
        transition: 'background 80ms, border-color 80ms',
        userSelect: 'none',
      }}
    >
      {label}
    </div>
  );
}

/* ── Step contents ── */

function Step1({
  useCase,
  setUseCase,
}: {
  useCase: UseCase | null;
  setUseCase: (uc: UseCase) => void;
}) {
  return (
    <div>
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-text)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        What will you use this for?
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {USE_CASES.map((uc) => (
          <OptionCard
            key={uc}
            label={uc}
            selected={useCase === uc}
            onClick={() => setUseCase(uc)}
          />
        ))}
      </div>
    </div>
  );
}

function Step2({
  style,
  setStyle,
}: {
  style: ResponseStyle;
  setStyle: (s: ResponseStyle) => void;
}) {
  return (
    <div>
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-text)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        How should AI respond?
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['Concise', 'Detailed'] as ResponseStyle[]).map((s) => (
          <OptionCard
            key={s}
            label={s}
            selected={style === s}
            flex
            onClick={() => setStyle(s)}
          />
        ))}
      </div>
    </div>
  );
}

function Step3() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '8px 0',
        textAlign: 'center',
      }}
    >
      <svg
        width={36}
        height={36}
        viewBox='0 0 36 36'
        fill='none'
        style={{ display: 'block' }}
      >
        <circle
          cx={18}
          cy={18}
          r={16.5}
          stroke='var(--color-accent)'
          strokeWidth={1.5}
        />
        <path
          d='M11 18.5l4.5 4.5 9-9'
          stroke='var(--color-accent)'
          strokeWidth={1.5}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-text)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        You're all set
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: 'var(--color-muted)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Your AI workspace is ready.
      </p>
    </div>
  );
}

/* ── Main component ── */

export function OnboardingDialog() {
  const { spring: sp } = useMotionTokens();
  const stepSpring = { type: 'spring' as const, stiffness: sp.stiffness, damping: sp.damping, mass: sp.mass };

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('Concise');

  const goNext = () => {
    if (step === 2) return; // Done — stay on completion screen
    setDir(1);
    setStep((s) => s + 1);
  };

  const goPrev = () => {
    setDir(-1);
    setStep((s) => s - 1);
  };

  /* Next is disabled on step 1 until a use case is chosen */
  const canNext = (step === 0 && useCase !== null) || step === 1;

  const btnBase: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '4px 8px',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    borderRadius: 'var(--radius-xs)',
    /* min-width keeps dots centered regardless of which side shows */
    minWidth: 52,
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 280,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          /* Clips horizontal slide animation at card edge */
          overflow: 'hidden',
        }}
      >
        {/* Step content area */}
        <div style={{ padding: '20px 20px 16px', overflow: 'hidden' }}>
          <AnimatePresence mode='popLayout' custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={stepVariants}
              initial='enter'
              animate='center'
              exit='exit'
              transition={stepSpring}
            >
              {step === 0 && (
                <Step1 useCase={useCase} setUseCase={setUseCase} />
              )}
              {step === 1 && (
                <Step2 style={responseStyle} setStyle={setResponseStyle} />
              )}
              {step === 2 && <Step3 />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Back — always rendered for layout; invisible on step 0 */}
          <button
            onClick={goPrev}
            style={{
              ...btnBase,
              color: 'var(--color-muted)',
              textAlign: 'left',
              visibility: step > 0 ? 'visible' : 'hidden',
            }}
          >
            Back
          </button>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === step ? 8 : 6,
                  height: i === step ? 8 : 6,
                  background:
                    i === step ? 'var(--color-accent)' : 'var(--color-border)',
                }}
                transition={DOT_SPRING}
                style={{ borderRadius: '50%' }}
              />
            ))}
          </div>

          {/* Next / Done */}
          <button
            onClick={goNext}
            disabled={!canNext}
            style={{
              ...btnBase,
              color: canNext ? 'var(--color-accent)' : 'var(--color-muted)',
              opacity: canNext ? 1 : 0.38,
              fontWeight: 500,
              textAlign: 'right',
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
