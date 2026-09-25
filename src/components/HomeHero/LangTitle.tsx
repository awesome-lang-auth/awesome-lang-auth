import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { EFFECTS, PLACEHOLDER, segments, type EffectContext, type EffectName, type View, type WidthMotion } from './effects';
import styles from './styles.module.css';

const BRAND = 'awesome-lang-auth';
/** Width of the typewriter caret plus its gap; must match .caret in styles.module.css. */
const CARET_ROOM = '0.12em';

class Cancelled extends Error {}

interface Props {
  /** Word to show in the slot; null shows the `${lang}` placeholder. */
  target: string | null;
  /** Transition to use; null swaps words without animation (reduced motion). */
  effect: EffectName | null;
  /** Called once the slot shows `target`. */
  onSettled: (target: string | null) => void;
}

/**
 * The H1. Its DOM text is always exactly "awesome-lang-auth" (crawlers read
 * that; screen readers get the same string from aria-label). What you see in
 * the slot is CSS generated content (`content: attr(data-t)`), so the
 * rotation never changes the heading's text, and SSR renders `${lang}`.
 */
export default function LangTitle({ target, effect, onSettled }: Props): ReactNode {
  const slotRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const widths = useRef(new Map<string, number>());
  const shown = useRef(PLACEHOLDER);
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;
  // The typewriter caret sits inside the slot, so the slot is that much wider.
  const caretRoom = useRef(false);
  caretRoom.current = effect === 'typewriter';

  const [view, setView] = useState<View>({ text: PLACEHOLDER, noise: '', caret: false, fx: null });
  const [ready, setReady] = useState(false);

  const measure = useCallback((text: string): number => {
    const cached = widths.current.get(text);
    if (cached !== undefined) return cached;
    const el = measureRef.current;
    if (!el) return 0;
    el.setAttribute('data-t', text);
    const width = Math.ceil(el.getBoundingClientRect().width);
    widths.current.set(text, width);
    return width;
  }, []);

  const setWidth = useCallback(
    (text: string, motion: WidthMotion) => {
      const slot = slotRef.current;
      if (!slot) return;
      slot.dataset.motion = motion;
      const px = measure(text);
      slot.style.width = caretRoom.current ? `calc(${px}px + ${CARET_ROOM})` : `${px}px`;
    },
    [measure],
  );

  const show = useCallback((next: Partial<View> & { text: string }) => {
    shown.current = next.text;
    setView({ text: next.text, noise: next.noise ?? '', caret: next.caret ?? false, fx: next.fx ?? null });
  }, []);

  // Measure once the web fonts are in, then pin the slot to an explicit width
  // (the same as its natural one, so nothing moves). Re-measure on resize:
  // the title's font size follows the viewport.
  useEffect(() => {
    let alive = true;
    const pin = () => {
      widths.current.clear();
      setWidth(shown.current, 'none');
    };
    (async () => {
      try {
        await document.fonts?.ready;
      } catch {
        // measure with whatever font is there
      }
      if (!alive) return;
      pin();
      setReady(true);
    })();
    window.addEventListener('resize', pin);
    return () => {
      alive = false;
      window.removeEventListener('resize', pin);
    };
  }, [setWidth]);

  // Drive the slot to `target` with the chosen effect.
  useEffect(() => {
    if (!ready) return undefined;
    const to = target ?? PLACEHOLDER;
    let cancelled = false;
    const timers = new Set<number>();
    const ctx: EffectContext = {
      show: (next) => {
        if (!cancelled) show(next);
      },
      width: (text, motion) => {
        if (!cancelled) setWidth(text, motion);
      },
      wait: (ms) =>
        new Promise<void>((resolve, reject) => {
          if (cancelled) {
            reject(new Cancelled());
            return;
          }
          const id = window.setTimeout(() => {
            timers.delete(id);
            if (cancelled) reject(new Cancelled());
            else resolve();
          }, ms);
          timers.add(id);
        }),
    };

    (async () => {
      const from = shown.current;
      if (from === to) {
        show({ text: to, caret: effect === 'typewriter' });
        setWidth(to, 'none');
      } else if (!effect) {
        show({ text: to });
        setWidth(to, 'none');
      } else {
        await EFFECTS[effect](ctx, from, to);
      }
      if (!cancelled) settledRef.current(target);
    })().catch((err) => {
      if (!(err instanceof Cancelled)) throw err;
    });

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [target, effect, ready, show, setWidth]);

  return (
    <h1 className={styles.title} aria-label={BRAND}>
      {'awesome-'}
      <span ref={slotRef} className={styles.slot} data-motion="none">
        {/* The real text: always "lang", visually hidden, so the H1 reads awesome-lang-auth. */}
        <span className={styles.srOnly}>lang</span>
        <span className={styles.view} data-fx={view.fx ?? undefined} aria-hidden="true">
          {segments(view.text).map((seg, i) => (
            <span key={i} className={seg.brace ? styles.brace : styles.word} data-t={seg.t} />
          ))}
          {view.noise ? <span className={styles.noise} data-t={view.noise} /> : null}
          {view.caret ? <span className={styles.caret} /> : null}
        </span>
        <span ref={measureRef} className={styles.measure} data-t={PLACEHOLDER} aria-hidden="true" />
      </span>
      {'-auth'}
    </h1>
  );
}
