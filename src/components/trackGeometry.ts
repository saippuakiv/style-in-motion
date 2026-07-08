/* ── Shared track geometry ──
   Both the tween and spring preview tracks share these constants
   so their unit ticks (0 and 1) align vertically. The positions
   mirror the original bezier canvas mapping (X_MIN=-0.15,
   X_MAX=1.15 with PAD=8 in a 200-wide viewBox). */

const W = 200;
const PAD = 8;
const INNER_W = W - 2 * PAD;
const X_MIN = -0.15;
const X_RANGE = 1.3; // 1.15 - (-0.15)

export const TRACK_0_PCT =
  ((PAD + ((0 - X_MIN) / X_RANGE) * INNER_W) / W) * 100;
export const TRACK_1_PCT =
  ((PAD + ((1 - X_MIN) / X_RANGE) * INNER_W) / W) * 100;

export const BALL_D = 12;
export const BALL_R = BALL_D / 2;
export const BALL_PAD = 2;
export const TRACK_H = BALL_D + BALL_PAD * 2;
