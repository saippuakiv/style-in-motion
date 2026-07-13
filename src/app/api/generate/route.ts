import { NextResponse } from 'next/server';
import { SKILL_PROMPT } from './skill';

/* ── Defaults (used for missing-field repair) ── */

const ROUTE_DEFAULTS = {
  bg: '#faf8f3',
  surface: '#ffffff',
  text: '#16150f',
  muted: '#6b6862',
  border: '#e6e2d8',
  accent: '#e54d2e',
  accentText: '#ffffff',
  primary: '#3d6b53',
  secondary: '#8b4e2f',
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',
  fontSans: 'DM Sans',
  fontSizeScale: 1,
  springStiffness: 260,
  springDamping: 28,
  springMass: 1,
  bezier: [0.16, 1, 0.3, 1],
  durationScale: 1,
  entranceDistance: 60,
  staggerDelay: 0.06,
  revealGranularity: 'phrase',
  thinkingPosture: 'pulse',
  noOvershoot: false,
} as const;

/* ── Helpers ── */

/** sRGB luminance of a hex color string (#rrggbb). */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length !== 6) return 1; // unparseable → treat as light (safe)
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(parseInt(h.slice(0, 2), 16));
  const g = toLinear(parseInt(h.slice(2, 4), 16));
  const b = toLinear(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const PURE_BLACK_FLOOR = luminance('#0a0a0a'); // ~0.00118

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/* ── postProcess ──────────────────────────────────────────────────────────
   Pure function. Never throws. Takes raw model output, returns repaired
   tokens. All repairs are logged with console.warn.
   ──────────────────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function postProcess(raw: Record<string, any>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: Record<string, any> = { ...raw };

  /* 1. Field presence — fill any missing field with a neutral default */
  for (const [key, def] of Object.entries(ROUTE_DEFAULTS)) {
    if (t[key] === undefined || t[key] === null) {
      console.warn(`[postProcess] missing field "${key}" — using default`);
      t[key] = def;
    }
  }

  /* 2. Numeric sanity */
  const positiveFields = [
    'springStiffness',
    'springDamping',
    'springMass',
    'durationScale',
    'fontSizeScale',
  ] as const;
  for (const f of positiveFields) {
    if (typeof t[f] !== 'number' || t[f] <= 0) {
      console.warn(`[postProcess] "${f}" invalid (${t[f]}) — using default`);
      t[f] = ROUTE_DEFAULTS[f];
    }
  }

  for (const f of ['entranceDistance', 'staggerDelay'] as const) {
    if (typeof t[f] !== 'number' || t[f] < 0) {
      console.warn(`[postProcess] "${f}" invalid (${t[f]}) — clamping to 0`);
      t[f] = 0;
    }
  }

  if (
    !Array.isArray(t.bezier) ||
    t.bezier.length !== 4 ||
    t.bezier.some((v: unknown) => typeof v !== 'number')
  ) {
    console.warn(`[postProcess] bezier invalid — using default`);
    t.bezier = [...ROUTE_DEFAULTS.bezier];
  } else {
    // x1 and x2 must be in [0,1]
    const [x1, y1, x2, y2] = t.bezier as number[];
    const cx1 = clamp(x1, 0, 1);
    const cx2 = clamp(x2, 0, 1);
    if (cx1 !== x1 || cx2 !== x2) {
      console.warn(`[postProcess] bezier x values out of [0,1] — clamping`);
      t.bezier = [cx1, y1, cx2, y2];
    }
  }

  /* 3. Enum validation */
  const REVEAL_VALID = new Set(['character', 'word', 'phrase']);
  if (!REVEAL_VALID.has(t.revealGranularity)) {
    console.warn(
      `[postProcess] revealGranularity "${t.revealGranularity}" invalid — falling back to "word"`,
    );
    t.revealGranularity = 'word';
  }

  const POSTURE_VALID = new Set(['breathe', 'pulse', 'bounce']);
  if (!POSTURE_VALID.has(t.thinkingPosture)) {
    console.warn(
      `[postProcess] thinkingPosture "${t.thinkingPosture}" invalid — falling back to "pulse"`,
    );
    t.thinkingPosture = 'pulse';
  }

  /* 4. Near-black floor — forbid bg/surface below luminance of #0a0a0a.
        Judgment of WHETHER to go dark stays in the skill; code only
        prevents the pure-black floor. */
  for (const f of ['bg', 'surface'] as const) {
    if (typeof t[f] === 'string' && luminance(t[f]) < PURE_BLACK_FLOOR) {
      console.warn(
        `[postProcess] "${f}" (${t[f]}) too dark — replacing with #0a0a12`,
      );
      t[f] = '#0a0a12';
    }
  }

  /* 5. Physics: if noOvershoot, enforce critical damping.
        springDamping = max(springDamping, 2·sqrt(stiffness·mass)).
        Scale-invariant: scaledSpring preserves damping ratio, so enforcing
        at generation time covers all durationScale values. */
  if (t.noOvershoot === true) {
    const critical = 2 * Math.sqrt(t.springStiffness * t.springMass);
    if (t.springDamping < critical) {
      console.warn(
        `[postProcess] noOvershoot: springDamping ${t.springDamping.toFixed(2)} < critical ${critical.toFixed(2)} — raising`,
      );
      t.springDamping = critical;
    }
  }

  return t;
}

/* ── Inline unit tests (run at module load in dev; silent in prod) ──────── */

if (process.env.NODE_ENV !== 'production') {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`[postProcess test] FAIL: ${msg}`);
  };

  // T1: missing field → filled from defaults
  {
    const out = postProcess({ bg: '#ffffff' });
    assert(out.springStiffness === 260, 'T1: missing springStiffness filled');
    assert(out.revealGranularity === 'phrase', 'T1: missing revealGranularity filled');
  }

  // T2: invalid revealGranularity → "word"
  {
    const out = postProcess({ ...ROUTE_DEFAULTS, revealGranularity: 'letter' });
    assert(out.revealGranularity === 'word', 'T2: bad revealGranularity → word');
  }

  // T3: invalid thinkingPosture → "pulse"
  {
    const out = postProcess({ ...ROUTE_DEFAULTS, thinkingPosture: 'float' });
    assert(out.thinkingPosture === 'pulse', 'T3: bad thinkingPosture → pulse');
  }

  // T4: bg too dark → #0a0a12
  {
    const out = postProcess({ ...ROUTE_DEFAULTS, bg: '#000000' });
    assert(out.bg === '#0a0a12', 'T4: pure black bg replaced');
  }

  // T5: noOvershoot + underdamped → critical damping
  {
    const out = postProcess({
      ...ROUTE_DEFAULTS,
      springStiffness: 180,
      springDamping: 27,
      springMass: 1.6,
      noOvershoot: true,
    }) as { springDamping: number };
    const critical = 2 * Math.sqrt(180 * 1.6);
    assert(
      Math.abs(out.springDamping - critical) < 0.01,
      `T5: noOvershoot raised damping to critical (expected ${critical.toFixed(2)}, got ${out.springDamping.toFixed(2)})`,
    );
  }

  // T6: negative numeric field → clamped/defaulted
  {
    const out = postProcess({ ...ROUTE_DEFAULTS, entranceDistance: -10 });
    assert(out.entranceDistance === 0, 'T6: negative entranceDistance → 0');
  }

  // T7: bezier with out-of-range x → clamped
  {
    const out = postProcess({ ...ROUTE_DEFAULTS, bezier: [-0.1, 1.2, 1.5, 0.9] }) as {
      bezier: number[];
    };
    assert(out.bezier[0] === 0 && out.bezier[2] === 1, 'T7: bezier x clamped to [0,1]');
  }

  // T8: clean input passes through byte-identical (except noOvershoot already false)
  {
    const clean = { ...ROUTE_DEFAULTS } as Record<string, unknown>;
    const out = postProcess({ ...clean });
    for (const key of Object.keys(clean)) {
      if (key === 'bezier') continue; // array ref equality not meaningful
      assert(
        JSON.stringify(out[key]) === JSON.stringify(clean[key]),
        `T8: clean input mutated at "${key}"`,
      );
    }
  }
}

/* ── API route ── */

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SKILL_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.log('Anthropic error:', errorBody);
    return NextResponse.json(
      { error: 'Token generation failed', detail: errorBody },
      { status: res.status },
    );
  }

  const data = await res.json();
  const raw = data.content.map((b: { text?: string }) => b.text || '').join('');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) {
    console.log('No JSON object found in response:', raw);
    return NextResponse.json({ error: 'No JSON in response' }, { status: 500 });
  }
  const tokens = JSON.parse(raw.slice(start, end + 1));

  return NextResponse.json(postProcess(tokens));
}
