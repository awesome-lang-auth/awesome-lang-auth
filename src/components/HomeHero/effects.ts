/**
 * The three ways the H1 slot changes word. Each effect drives the view
 * through an EffectContext and resolves when the new word is in place;
 * `wait` rejects when the transition is cancelled (a chip click, unmount).
 */

export const PLACEHOLDER = '${lang}';

export type EffectName = 'elastic' | 'typewriter' | 'decode';

export const EFFECT_NAMES: readonly EffectName[] = ['elastic', 'typewriter', 'decode'];

/** How the slot width follows the text: a spring, a quick linear follow, or a jump. */
export type WidthMotion = 'spring' | 'follow' | 'none';

export interface View {
  /** Resolved text. A prefix of PLACEHOLDER renders its `${` and `}` as decoration. */
  text: string;
  /** Random glyphs after the resolved text (decode). */
  noise: string;
  /** Typewriter caret. */
  caret: boolean;
  /** Elastic: 'out' fades and blurs the word away. */
  fx: 'out' | null;
}

export interface EffectContext {
  show(view: Partial<View> & { text: string }): void;
  /** Animate the slot to the width of `text`. */
  width(text: string, motion: WidthMotion): void;
  wait(ms: number): Promise<void>;
}

type Effect = (ctx: EffectContext, from: string, to: string) => Promise<void>;

const elastic: Effect = async (c, from, to) => {
  c.show({ text: from, fx: 'out' });
  await c.wait(170);
  c.width(to, 'spring');
  c.show({ text: to });
  await c.wait(720);
};

const typewriter: Effect = async (c, from, to) => {
  for (let n = from.length - 1; n >= 0; n--) {
    const text = from.slice(0, n);
    c.show({ text, caret: true });
    c.width(text, 'follow');
    await c.wait(38);
  }
  await c.wait(180);
  for (let n = 1; n <= to.length; n++) {
    const text = to.slice(0, n);
    c.width(text, 'follow');
    c.show({ text, caret: true });
    if (n < to.length) await c.wait(62 + Math.random() * 56);
  }
};

// No `$`, `{` or `}`: those belong to the placeholder's decoration.
const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789#%&*+=?<>/';
const noise = (length: number) =>
  Array.from({ length }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join('');

const decode: Effect = async (c, _from, to) => {
  c.width(to, 'spring');
  const LEAD_FRAMES = 4; // pure noise before the first character resolves
  const FRAMES_PER_CHAR = 1.6;
  for (let frame = 0; ; frame++) {
    const resolved = Math.max(0, Math.min(to.length, Math.floor((frame - LEAD_FRAMES) / FRAMES_PER_CHAR)));
    c.show({ text: to.slice(0, resolved), noise: noise(to.length - resolved) });
    if (resolved === to.length) return;
    await c.wait(42);
  }
};

export const EFFECTS: Record<EffectName, Effect> = { elastic, typewriter, decode };

const STORAGE_KEY = 'awesome-lang-auth:home-title-effect';

/**
 * A random effect for this page load, never the one of the previous visit.
 * `?title-effect=<name>` forces one (for reviewing each effect) and is not stored.
 * If storage throws (private mode, blocked), any of the three.
 */
export function pickEffect(): EffectName {
  try {
    const forced = new URLSearchParams(window.location.search).get('title-effect');
    if (forced && (EFFECT_NAMES as readonly string[]).includes(forced)) return forced as EffectName;
  } catch {
    // ignore a malformed URL
  }
  const any = () => EFFECT_NAMES[Math.floor(Math.random() * EFFECT_NAMES.length)];
  let previous: string | null;
  try {
    previous = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return any();
  }
  const pool = EFFECT_NAMES.filter((name) => name !== previous);
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  try {
    window.localStorage.setItem(STORAGE_KEY, chosen);
  } catch {
    // quota or blocked storage: the next visit may repeat, which is harmless
  }
  return chosen;
}

/** Split a view text into decoration (`${`, `}`) and word, for the placeholder only. */
export function segments(text: string): { t: string; brace: boolean }[] {
  if (!text || !PLACEHOLDER.startsWith(text)) return text ? [{ t: text, brace: false }] : [];
  const parts = [
    { t: text.slice(0, 2), brace: true },
    { t: text.slice(2, PLACEHOLDER.length - 1), brace: false },
    { t: text.slice(PLACEHOLDER.length - 1), brace: true },
  ];
  return parts.filter((p) => p.t);
}
