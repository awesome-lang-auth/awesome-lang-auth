/**
 * Minimal GDPR cookie consent notice.
 * Only shows once (stored in localStorage). As unobtrusive as possible:
 * a slim banner at the bottom of the page.
 */
import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'awesome-node-auth-cookie-consent';

export default function CookieConsent(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage blocked (private browsing etc.) — don't show banner
    }
  }, []);

  const dismiss = () => {
    try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(15,23,42,0.92)',
        color: '#cbd5e1',
        fontSize: '0.78rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '0.45rem 1rem',
        backdropFilter: 'blur(4px)',
      }}
    >
      <span>
        We use strictly-necessary cookies for authentication.{' '}
        <a href="/privacy" style={{ color: '#38bdf8' }}>Privacy Policy</a>
        {' · '}
        <a href="/termsofservice" style={{ color: '#38bdf8' }}>Terms</a>
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss cookie notice"
        style={{
          background: 'none',
          border: '1px solid #475569',
          borderRadius: 4,
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '0.72rem',
          padding: '0.15rem 0.6rem',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Got it
      </button>
    </div>
  );
}
