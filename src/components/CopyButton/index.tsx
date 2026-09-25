import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

type CopyState = 'idle' | 'copied' | 'failed';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // No clipboard API (insecure context, old browser, denied permission).
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Icon button that copies `text`, with a polite live region announcing the result. */
export default function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  /** Accessible name, e.g. "Copy the install command". */
  label: string;
  className?: string;
}): ReactNode {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return undefined;
    const timer = window.setTimeout(() => setState('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <>
      <button
        type="button"
        className={clsx(styles.copyButton, state === 'copied' && styles.copied, className)}
        aria-label={label}
        title={label}
        onClick={async () => setState((await copyText(text)) ? 'copied' : 'failed')}
      >
        {state === 'copied' ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="8.5" y="8.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M15.5 5.5v-.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {state === 'copied' ? 'Copied to the clipboard' : state === 'failed' ? 'Copy failed: select the command and copy it by hand' : ''}
      </span>
    </>
  );
}
