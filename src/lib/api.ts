/* ---------------------------------------------------------------
   API utilities for AI-powered token generation.
   --------------------------------------------------------------- */

export interface DesignTokens {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentText: string;
  primary: string;
  secondary: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  fontSans: string;
  /** Spring stiffness. Range: 1–1000, step 5. */
  springStiffness: number;
  /** Spring damping. Range: 1–100, step 1. */
  springDamping: number;
  /** Spring mass. Range: 0.5–5, step 0.1. */
  springMass: number;
  /** Cubic-bezier control points [x1, y1, x2, y2], x clamped to [0,1], y clamped to [-0.3, 1.3]. */
  bezier: [number, number, number, number];
  /** Duration multiplier. 1 = default, <1 snappier, >1 more dramatic. */
  durationScale: number;
  /** Entrance slide distance in px. */
  entranceDistance: number;
  /** Stagger delay between rapid-fire entrances in seconds. */
  staggerDelay: number;
  /** Compensates for typeface x-height differences; 1 = neutral, range 0.9–1.15. */
  fontSizeScale: number;
  /** Text reveal granularity for streaming content. Derived from style qualities, not names. */
  revealGranularity: 'character' | 'word' | 'phrase';
  /** Posture of the thinking/loading state. Derived from style qualities,
      not names. breathe = still, only luminance moves; pulse = sequential
      lighting, strictly even, no displacement; bounce = physical y motion. */
  thinkingPosture: 'breathe' | 'pulse' | 'bounce';
  /** If true, route.ts enforces critical damping (ratio ≥ 1) so springs land
      without any overshoot. Set only for dead-landing qualities (severe,
      surgical, monumental). False for calm/heavy/luxury — slight mass is wanted. */
  noOvershoot: boolean;
  /** Structured reasoning entries from the generation skill. Diagnostic — not a design token. */
  rationale: { summary: string; decision: string; why: string }[];
}

export const DEFAULTS: DesignTokens = {
  bg: '#faf8f3',
  surface: '#ffffff',
  text: '#16150f',
  muted: '#6b6862',
  border: '#e6e2d8',
  accent: '#4a7a46',
  accentText: '#ffffff',
  primary: '#3d6b53',
  secondary: '#8b4e2f',
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',
  fontSans: 'DM Sans',
  springStiffness: 260,
  springDamping: 28,
  springMass: 1,
  bezier: [0.16, 1, 0.3, 1],
  durationScale: 1,
  entranceDistance: 60,
  staggerDelay: 0.06,
  fontSizeScale: 1,
  revealGranularity: 'phrase',
  thinkingPosture: 'breathe',
  noOvershoot: false,
  rationale: [],
};

export const SUGGESTIONS = [
  'warm editorial, like a literary magazine',
  'dark luxury, gold on obsidian',
  'brutalist tech, raw concrete palette',
  'soft pastel, gentle and rounded',
  'surgical precision, cold steel on white',
  'playful bounce, candy colors and rubber',
];

/* Only CSS-string tokens — spring params are handled separately. */
const TOKEN_TO_VAR: Partial<Record<keyof DesignTokens, string>> = {
  bg: '--color-bg',
  surface: '--color-surface',
  text: '--color-text',
  muted: '--color-muted',
  border: '--color-border',
  accent: '--color-accent',
  accentText: '--color-accent-text',
  primary: '--color-primary',
  secondary: '--color-secondary',
  radiusSm: '--radius-sm',
  radiusMd: '--radius-md',
  radiusLg: '--radius-lg',
  fontSans: '--font-sans',
};

/** Call the Next.js API route to generate design tokens. */
export async function generateTokens(
  prompt: string,
): Promise<Partial<DesignTokens>> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error('Generation failed');
  return res.json();
}

/** Load a Google Font by family name. */
export function loadFont(name: string): void {
  const id = `gf-${name.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@100..900&display=swap`;
  document.head.appendChild(link);
}

/** Build CSS custom-property overrides to scope on a container element. */
export function tokenVars(
  tokens: DesignTokens,
  bezier: readonly [number, number, number, number],
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(TOKEN_TO_VAR) as [
    keyof DesignTokens,
    string,
  ][]) {
    const value = tokens[key];
    vars[cssVar] =
      key === 'fontSans' ? `"${value}", system-ui, sans-serif` : String(value);
  }
  vars['--color-track-off'] = tokens.border;
  vars['--ease-out'] = `cubic-bezier(${bezier.join(',')})`;
  vars['--spring-stiffness'] = String(tokens.springStiffness);
  vars['--spring-damping'] = String(tokens.springDamping);
  vars['--spring-mass'] = String(tokens.springMass);
  vars['--font-size-scale'] = String(tokens.fontSizeScale);
  vars['--duration-scale'] = String(tokens.durationScale);
  vars['--entrance-distance'] = `${tokens.entranceDistance}px`;
  vars['--stagger-delay'] = `${tokens.staggerDelay}s`;
  return vars;
}
