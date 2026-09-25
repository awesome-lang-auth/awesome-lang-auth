import { useCallback, useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import { CLIENTS, GROUP_INFO, MATURITY_INFO, RUNTIMES, SERVERS, type Runtime, type RuntimeId } from '@site/src/data/runtimes';
import RuntimeIcon from '@site/src/components/RuntimeIcon';
import CopyButton from '@site/src/components/CopyButton';
import ExternalIcon from '@site/src/components/ExternalIcon';
import LangTitle from './LangTitle';
import { pickEffect, type EffectName } from './effects';
import styles from './styles.module.css';

// How long each state holds before the next word (ms).
const DWELL_PLACEHOLDER = 2400;
const DWELL_WORD = 2000;

/** The rotation: ${lang}, then every runtime in order, then ${lang} again. */
function nextTarget(current: RuntimeId | null): RuntimeId | null {
  if (current === null) return RUNTIMES[0].id;
  const i = RUNTIMES.findIndex((r) => r.id === current);
  return i + 1 < RUNTIMES.length ? RUNTIMES[i + 1].id : null;
}

function MaturityBadge({ runtime }: { runtime: Runtime }): ReactNode {
  const info = MATURITY_INFO[runtime.maturity];
  return (
    <span className={styles.badge} data-maturity={runtime.maturity} title={info.description}>
      {info.label}
    </span>
  );
}

function RuntimeCard({ runtime, active }: { runtime: Runtime; active: boolean }): ReactNode {
  return (
    <div
      className={clsx(styles.card, active && styles.cardActive)}
      aria-hidden={active ? undefined : true}
      inert={!active}
      id={`runtime-card-${runtime.id}`}
    >
      <div className={styles.cardHeader}>
        <RuntimeIcon id={runtime.id} className={styles.cardIcon} />
        <span className={styles.cardPkg}>{runtime.pkg}</span>
        {runtime.version ? <span className={styles.cardVersion}>v{runtime.version}</span> : <span className={styles.cardVersion}>git</span>}
        <MaturityBadge runtime={runtime} />
        <span className={styles.cardLabel}>{runtime.label}</span>
      </div>
      <div className={styles.command}>
        <code>
          <span className={styles.prompt} aria-hidden="true">$ </span>
          {runtime.command}
        </code>
        <CopyButton text={runtime.command} label={`Copy the ${runtime.label} install command`} />
      </div>
      <p className={styles.feature}>
        {runtime.feature}
        {runtime.note ? <span className={styles.note}> {runtime.note}</span> : null}
      </p>
      <div className={styles.cardLinks}>
        <Link to={runtime.docs} className={styles.cardLink}>
          {runtime.label} docs →
        </Link>
        <a href={runtime.repo} className={styles.cardLink} target="_blank" rel="noopener noreferrer">
          GitHub <ExternalIcon />
        </a>
      </div>
    </div>
  );
}

export default function HomeHero({ subtitle }: { subtitle: ReactNode }): ReactNode {
  // Title state. SSR and the first client render show ${lang} with no effect.
  const [target, setTarget] = useState<RuntimeId | null>(null);
  const [settled, setSettled] = useState<RuntimeId | null | undefined>(undefined);
  const [effect, setEffect] = useState<EffectName | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [mounted, setMounted] = useState(false);

  // What stops the rotation.
  const [pinned, setPinned] = useState(false); // first chip click: for good
  const [userPaused, setUserPaused] = useState(false); // the pause button
  // Hover and focus hold the card separately: a pointer leaving the card must
  // not release a keyboard focus that is still inside it (the card would go
  // inert under the focused button and focus would drop to <body>).
  const [cardHovered, setCardHovered] = useState(false);
  const [cardFocused, setCardFocused] = useState(false);
  const cardHeld = cardHovered || cardFocused;
  const [offscreen, setOffscreen] = useState(false); // hero out of view or tab hidden

  // The card follows the title; it keeps the last runtime while ${lang} shows.
  const [cardId, setCardId] = useState<RuntimeId>(RUNTIMES[0].id);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(query.matches);
    apply();
    setEffect(pickEffect());
    query.addEventListener?.('change', apply);
    return () => query.removeEventListener?.('change', apply);
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    let visible = true;
    let tabVisible = document.visibilityState !== 'hidden';
    const update = () => setOffscreen(!visible || !tabVisible);
    const onVisibility = () => {
      tabVisible = document.visibilityState !== 'hidden';
      update();
    };
    document.addEventListener('visibilitychange', onVisibility);
    let observer: IntersectionObserver | undefined;
    if (hero && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        update();
      });
      observer.observe(hero);
    }
    // A tab opened in the background starts hidden, gets no rendering steps
    // (so no observer callback) and no visibilitychange until it is shown.
    update();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, []);

  const rotating = mounted && !reducedMotion && !pinned;
  const running = rotating && !userPaused && !cardHeld && !offscreen && effect !== null;

  useEffect(() => {
    if (!running || settled !== target) return undefined;
    const timer = window.setTimeout(
      () => {
        const next = nextTarget(target);
        setTarget(next);
        if (next) setCardId(next);
      },
      target === null ? DWELL_PLACEHOLDER : DWELL_WORD,
    );
    return () => window.clearTimeout(timer);
  }, [running, settled, target]);

  const onSettled = useCallback((value: string | null) => setSettled(value as RuntimeId | null), []);

  const choose = (id: RuntimeId) => {
    setPinned(true);
    setTarget(id);
    setCardId(id);
  };

  const holdCard = {
    onMouseEnter: () => setCardHovered(true),
    onMouseLeave: () => setCardHovered(false),
    onFocus: () => setCardFocused(true),
    onBlur: (e: FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCardFocused(false);
    },
  };

  // The group holds the chips only: `extra` (the pause button, which controls
  // the H1) sits next to it, so it is not announced as one of the chips.
  const chipRow = (group: 'server' | 'client', runtimes: readonly Runtime[], extra?: ReactNode) => (
    <div className={styles.chipRow}>
      <span className={styles.chipRowLabel} id={`chips-${group}`}>
        {GROUP_INFO[group].label}
      </span>
      <div className={styles.chipLine}>
        <div className={styles.chips} role="group" aria-labelledby={`chips-${group}`}>
          {runtimes.map((r) => (
            <button
              key={r.id}
              type="button"
              className={clsx(styles.chip, r.id === cardId && styles.chipActive)}
              aria-pressed={r.id === cardId}
              aria-controls={`runtime-card-${r.id}`}
              onClick={() => choose(r.id)}
            >
              <RuntimeIcon id={r.id} className={styles.chipIcon} />
              <span className={styles.chipName}>{r.id}</span>
              <MaturityBadge runtime={r} />
            </button>
          ))}
        </div>
        {extra}
      </div>
    </div>
  );

  const paused = userPaused;
  // Kept in the layout (visibility, not display) so it appearing after
  // hydration does not move the chips; disabled when there is nothing to pause.
  const pauseButton = (
    <button
      type="button"
      className={clsx(styles.pauseButton, !rotating && styles.pauseButtonIdle)}
      disabled={!rotating}
      aria-label={paused ? 'Resume the rotating runtime name' : 'Pause the rotating runtime name'}
      title={paused ? 'Resume the rotation' : 'Pause the rotation'}
      onClick={() => setUserPaused((p) => !p)}
    >
      {paused ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="6.5" y="5.5" width="3.8" height="13" rx="1" fill="currentColor" />
          <rect x="13.7" y="5.5" width="3.8" height="13" rx="1" fill="currentColor" />
        </svg>
      )}
    </button>
  );

  // A <section>, not a <header>: the page renders it inside <main>, so the H1
  // is in the main landmark and "Skip to main content" does not jump past it.
  return (
    <section className={styles.hero} ref={heroRef}>
      <div className={styles.heroInner}>
        <div className={styles.heroBadge}>
          <span>Open source</span>
          <span aria-hidden="true">·</span>
          <span>MIT License</span>
          <span aria-hidden="true">·</span>
          <span>Self-hosted</span>
        </div>

        <LangTitle target={target} effect={reducedMotion ? null : effect} live={running} onSettled={onSettled} />

        <p className={styles.subtitle}>{subtitle}</p>

        <div className={styles.picker}>
          {chipRow('server', SERVERS)}
          {chipRow('client', CLIENTS, pauseButton)}
        </div>

        <div className={styles.cardStack} {...holdCard}>
          {RUNTIMES.map((r) => (
            <RuntimeCard key={r.id} runtime={r} active={r.id === cardId} />
          ))}
        </div>

        <div className={styles.ctas}>
          <Link className={clsx('button', styles.ctaPrimary)} to="/docs/intro/">
            Get started →
          </Link>
          <Link className={clsx('button', styles.ctaSecondary)} to="https://github.com/awesome-lang-auth">
            GitHub
          </Link>
          <Link className={clsx('button', styles.ctaLive)} to="/demo-live/">
            Live demo
          </Link>
        </div>
      </div>
    </section>
  );
}
