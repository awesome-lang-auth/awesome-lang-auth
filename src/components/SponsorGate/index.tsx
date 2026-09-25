/**
 * SponsorGate — client-side overlay that blocks the Advanced Docs section
 * for users who are not GitHub sponsors.
 *
 * Security notes:
 *   - When the gate is active the underlying <article> content is blurred and
 *     pointer-events / user-select are disabled so hiding the overlay via the
 *     browser dev-tools still leaves the content unreadable.
 *   - A close/back button lets the user navigate back without pressing the
 *     browser back button.
 *
 * Logic:
 *   1. If the current path does NOT start with /docs/advanced → render nothing.
 *   2. Call /auth/me to check login status.
 *   3. If logged in, call /account/api/subscription to get the plan.
 *   4. If plan !== 'free' (i.e. the user is a sponsor) → render nothing.
 *   5. Otherwise render a full-viewport overlay with an engaging teaser and a
 *      "Sponsor on GitHub" CTA.
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

// A representative (non-exhaustive) teaser of what lives in the Advanced section.
// Enough to spark curiosity without spoiling the full content.
const TEASER_FEATURES = [
  { icon: '🏢', label: 'Multi-Tenancy & RBAC', desc: 'Tenant-scoped roles and permissions for SaaS products' },
  { icon: '⚡', label: 'Real-time SSE & Webhooks', desc: 'Push live events to browsers and forward them to external services' },
  { icon: '🔑', label: 'API Keys (M2M auth)', desc: 'Machine-to-machine keys with scopes, IP allowlists and bcrypt storage' },
  { icon: '📊', label: 'Telemetry & Audit Trail', desc: 'Persist and query every identity event with ITelemetryStore' },
  { icon: '🛡️', label: 'Admin Panel', desc: 'Self-contained dashboard for users, sessions, roles and webhook governance' },
  { icon: '🔗', label: 'Account Linking & Custom Claims', desc: 'Connect multiple OAuth providers to one account; inject any payload into JWTs' },
];

type GateStatus = 'loading' | 'sponsor' | 'free' | 'anonymous';

/** CSS class added to the <article> element when the gate is blocking access. */
const BLUR_CLASS = 'sponsor-gate-blur';

/** Inject the blur rule once into the document head. */
function ensureBlurStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('sponsor-gate-style')) return;
  const style = document.createElement('style');
  style.id = 'sponsor-gate-style';
  style.textContent =
    '.sponsor-gate-blur { filter: blur(10px) !important; pointer-events: none !important; user-select: none !important; }';
  document.head.appendChild(style);
}

function setContentBlur(enabled: boolean) {
  if (typeof document === 'undefined') return;
  ensureBlurStyle();
  // Target the Docusaurus article / main doc container
  const targets = document.querySelectorAll<HTMLElement>(
    'article, .theme-doc-markdown, main .container',
  );
  targets.forEach((el) => {
    if (enabled) {
      el.classList.add(BLUR_CLASS);
    } else {
      el.classList.remove(BLUR_CLASS);
    }
  });
}

export default function SponsorGate(): React.JSX.Element | null {
  const { pathname } = useLocation();
  const { siteConfig } = useDocusaurusContext();
  const accountApiUrl =
    ((siteConfig.customFields ?? {}) as { accountApiUrl?: string }).accountApiUrl ?? '';

  const [status, setStatus] = useState<GateStatus>('loading');

  const isAdvancedPath = pathname.startsWith('/docs/advanced');

  useEffect(() => {
    if (!isAdvancedPath) return;
    setStatus('loading');

    const check = async () => {
      try {
        const meRes = await fetch(`${accountApiUrl}/auth/me`, { credentials: 'include' });
        if (!meRes.ok) {
          // Anonymous user — check the public wiki-settings endpoint to see if the
          // admin has globally unlocked the advanced section for everyone.
          try {
            const settingsRes = await fetch(`${accountApiUrl}/wiki-settings`);
            if (settingsRes.ok) {
              const settings = (await settingsRes.json()) as { wikiAdvancedLocked?: boolean };
              if (settings.wikiAdvancedLocked === false) {
                setStatus('sponsor'); // gate bypassed globally — let anonymous users through
                return;
              }
            }
          } catch { /* ignore — fall through to anonymous gate */ }
          setStatus('anonymous');
          return;
        }
        const subRes = await fetch(`${accountApiUrl}/account/api/subscription`, {
          credentials: 'include',
        });
        if (!subRes.ok) {
          setStatus('free');
          return;
        }
        const sub = (await subRes.json()) as { plan: string; wikiAdvancedLocked?: boolean };
        // If the admin has globally unlocked the advanced section, bypass the gate
        // for all logged-in users regardless of their plan.
        if (sub.wikiAdvancedLocked === false) {
          setStatus('sponsor');
          return;
        }
        setStatus(sub.plan !== 'free' ? 'sponsor' : 'free');
      } catch {
        // Network failure / CORS — treat as anonymous (safe default)
        setStatus('anonymous');
      }
    };

    check();
  }, [pathname, accountApiUrl, isAdvancedPath]);

  // Apply / remove blur on the underlying article whenever the gate status changes.
  useEffect(() => {
    const isGated = isAdvancedPath && (status === 'free' || status === 'anonymous');
    setContentBlur(isGated);
    // Clean up when navigating away from an advanced page
    return () => {
      if (isGated) setContentBlur(false);
    };
  }, [isAdvancedPath, status]);

  // Do not block non-advanced pages, still-loading state, or confirmed sponsors
  if (!isAdvancedPath || status === 'loading' || status === 'sponsor') return null;

  const isAnon = status === 'anonymous';

  const handleBack = () => {
    if (typeof window !== 'undefined') window.history.back();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Sponsor-only content">
      <div className={styles.card}>
        {/* ── Top bar: close button + lock badge ── */}
        <div className={styles.topBar}>
          <div className={styles.lockBadge}>
            <span className={styles.lockIcon}>🔒</span>
            <span className={styles.lockLabel}>Sponsor-only</span>
          </div>
          <button
            className={styles.closeBtn}
            onClick={handleBack}
            aria-label="Go back"
            title="Go back"
          >
            ← Back
          </button>
        </div>

        <h2 className={styles.title}>Advanced Docs</h2>
        <p className={styles.subtitle}>
          The <strong>Advanced</strong> section covers the full production-grade feature set of
          <code> awesome-node-auth</code> — from enterprise multi-tenancy to real-time event
          pipelines. Access is reserved for GitHub sponsors as a thank-you for keeping the
          project alive and growing.
        </p>

        {/* ── Feature teaser ── */}
        <ul className={styles.featureList}>
          {TEASER_FEATURES.map(({ icon, label, desc }) => (
            <li key={label} className={styles.featureItem}>
              <span className={styles.featureIcon}>{icon}</span>
              <span className={styles.featureText}>
                <strong>{label}</strong>
                <span className={styles.featureDesc}> — {desc}</span>
              </span>
            </li>
          ))}
          <li className={styles.featureItem}>
            <span className={styles.featureIcon}>✨</span>
            <span className={styles.featureText}>
              <strong>…and much more</strong>
              <span className={styles.featureDesc}> including CSRF protection, Swagger/OpenAPI spec, SSE horizontal scaling, mailer templates, and account deletion flows</span>
            </span>
          </li>
        </ul>

        {/* ── CTAs ── */}
        <div className={styles.actions}>
          <a
            className={styles.btnSponsor}
            href="https://github.com/sponsors/nik2208"
            target="_blank"
            rel="noopener noreferrer"
          >
            ❤️ Sponsor on GitHub
          </a>

          {isAnon && (
            <a
              className={styles.btnSignIn}
              href="/account"
            >
              👤 Sign in to verify sponsorship
            </a>
          )}
          {!isAnon && (
            <p className={styles.alreadyNote}>
              Already sponsored?{' '}
              <a href="https://github.com/sponsors/nik2208" target="_blank" rel="noopener noreferrer">
                GitHub matches your account automatically
              </a>{' '}
              — sign out and back in to refresh your status.
            </p>
          )}
        </div>

        {/* ── Footer note ── */}
        <p className={styles.footerNote}>
          Sponsorship is recognised automatically once your GitHub account (used to log in) is
          linked to an active sponsorship. Monthly tiers start at{' '}
          <strong>$2/month</strong>.
        </p>
      </div>
    </div>
  );
}
