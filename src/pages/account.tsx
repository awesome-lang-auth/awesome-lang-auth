/**
 * Account Area — pagina Docusaurus che serve la UI self-service per:
 *  - Login via OAuth (Google / GitHub)
 *  - Dashboard: info utente, piano, quick-start snippet MCP
 *  - API Keys: genera, copia, revoca token MCP
 *  - Subscription: piano attivo, limiti, cards di upgrade
 *
 * Tutte le chiamate usano `credentials: 'include'` per inviare i cookie
 * JWT impostati dal server dopo l'OAuth callback.
 * La variabile d'ambiente ACCOUNT_API_URL configura il base-URL del server
 * REST; se vuota (default) le chiamate sono relative (stesso dominio).
 */

import React, { useState, useEffect, useCallback } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './account.module.css';
import { getCsrfToken, refreshOnce } from '../utils/authRefresh';

// ── Tipi ─────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  role?: string;
  loginProvider?: string;
  firstName?: string;
  lastName?: string;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

interface PlanLimits {
  maxApiKeys: number;
  maxRequestsPerMonth: number;
  multiTenantEnabled: boolean;
}

interface Subscription {
  plan: 'free' | 'sponsor' | 'pro' | 'enterprise';
  limits: PlanLimits;
  usage: { requestCount: number; periodStart: string; periodEnd: string } | null;
  preferences?: { newsletterOptIn: boolean };
  creditType?: 'monthly' | 'lifetime' | 'combined';
  // Granular two-bucket fields
  monthlyLimit?: number;
  monthlyUsage?: number;
  lifetimeCredit?: number;
  lifetimeUsage?: number;
}

type Tab = 'dashboard' | 'keys' | 'subscription' | 'options';

// ── Helper ────────────────────────────────────────────────────────────────────

function fmt(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function planColor(plan: string): string {
  return plan === 'enterprise' ? '#7c3aed' : (plan === 'sponsor' || plan === 'pro') ? '#0ea5e9' : '#64748b';
}

const PROVIDER_LABELS: Record<string, string> = {
  google: '🔵 Google',
  github: '⚫ GitHub',
};

type EditorTab = 'vscode' | 'cursor' | 'windsurf' | 'claude' | 'antigravity';

const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: 'vscode',      label: 'VS Code'        },
  { id: 'cursor',      label: 'Cursor'         },
  { id: 'windsurf',    label: 'Windsurf'       },
  { id: 'claude',      label: 'Claude Desktop' },
  { id: 'antigravity', label: 'Antigravity'    },
];

function buildMcpSnippet(serverOrigin: string, keyValue: string, editor: EditorTab): string {
  const url = `${serverOrigin}/mcp`;
  switch (editor) {
    case 'vscode':
      return (
        `// .vscode/mcp.json\n` +
        `{\n` +
        `  "servers": {\n` +
        `    "awesome-node-auth": {\n` +
        `      "type": "http",\n` +
        `      "url": "${url}",\n` +
        `      "headers": {\n` +
        `        "Authorization": "Bearer ${keyValue}"\n` +
        `      }\n` +
        `    }\n` +
        `  }\n` +
        `}`
      );
    case 'cursor':
      return (
        `// ~/.cursor/mcp.json  (or .cursor/mcp.json for project-level)\n` +
        `{\n` +
        `  "mcpServers": {\n` +
        `    "awesome-node-auth": {\n` +
        `      "url": "${url}",\n` +
        `      "headers": {\n` +
        `        "Authorization": "Bearer ${keyValue}"\n` +
        `      }\n` +
        `    }\n` +
        `  }\n` +
        `}`
      );
    case 'windsurf':
      return (
        `// ~/.codeium/windsurf/mcp_config.json\n` +
        `{\n` +
        `  "mcpServers": {\n` +
        `    "awesome-node-auth": {\n` +
        `      "serverUrl": "${url}",\n` +
        `      "headers": {\n` +
        `        "Authorization": "Bearer ${keyValue}"\n` +
        `      }\n` +
        `    }\n` +
        `  }\n` +
        `}`
      );
    case 'claude':
      return (
        `// macOS: ~/Library/Application Support/Claude/claude_desktop_config.json\n` +
        `// Windows: %APPDATA%\\Claude\\claude_desktop_config.json\n` +
        `{\n` +
        `  "mcpServers": {\n` +
        `    "awesome-node-auth": {\n` +
        `      "url": "${url}",\n` +
        `      "headers": {\n` +
        `        "Authorization": "Bearer ${keyValue}"\n` +
        `      }\n` +
        `    }\n` +
        `  }\n` +
        `}`
      );
    case 'antigravity':
      return (
        `Name:        awesome-node-auth\n` +
        `URL:         ${url}\n` +
        `Auth header: Authorization: Bearer ${keyValue}`
      );
  }
}

// ── Main component (browser-only) ─────────────────────────────────────────────

function AccountArea({ apiBase }: { apiBase: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['mcp:read']);
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [newsletter, setNewsletter] = useState(false);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('vscode');

  const api = useCallback(
    async (method: string, path: string, body?: unknown, isRetry = false): Promise<any> => {
      const csrfHeaders = method !== 'GET'
        ? { 'X-CSRF-Token': getCsrfToken() }
        : {};

      const exec = async () => fetch(`${apiBase}${path}`, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      let res = await exec();

      // If unauthorized and this is not a retry, attempt to refresh the token.
      // refreshOnce() deduplicates concurrent refresh calls (race condition guard)
      // — the same singleton pattern used by the library's auth.js interceptor.
      if ((res.status === 401 || res.status === 403) && !isRetry && path !== '/auth/refresh') {
        const refreshed = await refreshOnce(apiBase);
        if (refreshed) {
          // Token refreshed, retry original request
          res = await exec();
        }
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.status === 204 ? {} : res.json();
    },
    [apiBase],
  );

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── bootstrap: check if the user is already logged in ─────────────────────

  useEffect(() => {
    api('GET', '/auth/me')
      .then((data) => setUser(data as User))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [api]);

  // ── sse: real-time updates for usage ──────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    let es: EventSource | null = null;
    let cancelled = false;

    // Fetch the token once when the user is set (not on every auth re-check)
    api('GET', '/auth/mcp-token').then((res) => {
      if (cancelled || !res.token) return;
      const sseUrl = `${apiBase}/tools/stream?token=${encodeURIComponent(res.token)}`;
      es = new EventSource(sseUrl);

      es.addEventListener('mcp.request.completed', () => {
        setSub((prev) => {
          if (!prev || !prev.usage) return prev;
          const newMonthlyUsage = (prev.monthlyUsage ?? 0) + 1;
          const mLimit = prev.monthlyLimit ?? prev.limits?.maxRequestsPerMonth ?? 1000;
          // Increment the lifetime bucket only when the monthly bucket is already full
          const newLifetimeUsage = newMonthlyUsage > mLimit
            ? (prev.lifetimeUsage ?? 0) + 1
            : (prev.lifetimeUsage ?? 0);
          return {
            ...prev,
            monthlyUsage: newMonthlyUsage,
            lifetimeUsage: newLifetimeUsage,
            usage: { ...prev.usage, requestCount: newMonthlyUsage },
          };
        });
      });
    }).catch(() => {/* non-fatal */ });

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [user, apiBase, api]);

  // ── load data when tab changes ────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    if (tab === 'keys') {
      api('GET', '/account/api/keys')
        .then((d) => setKeys(Array.isArray(d) ? d as ApiKey[] : (d as { keys: ApiKey[] }).keys))
        .catch(() => showToast('Failed to load API keys', false));
    }
    if (tab === 'subscription') {
      api('GET', '/account/api/subscription')
        .then((d) => setSub(d as Subscription))
        .catch(() => showToast('Failed to load subscription', false));
    }
    if (tab === 'dashboard') {
      api('GET', '/account/api/subscription')
        .then((d) => setSub(d as Subscription))
        .catch(() => {/* non-fatal */ });
      api('GET', '/account/api/keys')
        .then((d) => setKeys(Array.isArray(d) ? d as ApiKey[] : (d as { keys: ApiKey[] }).keys))
        .catch(() => {/* non-fatal */ });
    }
    if (tab === 'options') {
      api('GET', '/account/api/subscription')
        .then((s) => {
          if ((s as Subscription).preferences) {
            setNewsletter((s as Subscription).preferences!.newsletterOptIn);
          }
        })
        .catch(() => showToast('Failed to load preferences', false));
    }
  }, [tab, user, api]);

  const toggleNewsletter = async () => {
    setUpdatingPrefs(true);
    try {
      const next = !newsletter;
      const r = await api('PUT', '/account/api/preferences', { newsletterOptIn: next });
      if (r.ok || r) { // Some of our API results wrap 'ok'
        setNewsletter(next);
        showToast(next ? 'Subscribed to mailing list' : 'Unsubscribed from mailing list');
      }
    } catch (e) {
      showToast('Error updating preferences', false);
    } finally {
      setUpdatingPrefs(false);
    }
  };

  // ── logout ────────────────────────────────────────────────────────────────

  const logout = async () => {
    await api('POST', '/auth/logout').catch(() => { });
    setUser(null);
  };

  // ── create new API key ────────────────────────────────────────────────────

  const createKey = async () => {
    if (!newKeyName.trim()) { showToast('Please enter a key name', false); return; }
    setCreating(true);
    try {
      // Convert expiry date to a relative duration string (e.g. '30d')
      let expiresIn: string | undefined;
      if (newKeyExpiry) {
        const diffMs = new Date(newKeyExpiry).getTime() - Date.now();
        const diffDays = Math.max(1, Math.ceil(diffMs / 86_400_000));
        expiresIn = `${diffDays}d`;
      }
      const data = await api('POST', '/account/api/keys', {
        name: newKeyName.trim(),
        scopes: newKeyScopes,
        expiresIn,
      }) as { record: ApiKey; rawKey: string };
      setKeys((prev) => [data.record, ...prev]);
      setRawKey(data.rawKey);
      setNewKeyName('');
      setNewKeyExpiry('');
      setNewKeyScopes(['mcp:read']);
      showToast('API key created — copy it now, it won\'t be shown again!');
    } catch (e) {
      showToast((e as Error).message, false);
    } finally {
      setCreating(false);
    }
  };

  // ── revoke API key ────────────────────────────────────────────────────────

  const revokeKey = async (id: string) => {
    setRevoking(id);
    try {
      await api('DELETE', `/account/api/keys/${id}`);
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, isActive: false } : k));
      showToast('API key revoked');
    } catch (e) {
      showToast((e as Error).message, false);
    } finally {
      setRevoking(null);
    }
  };

  // ── copy to clipboard ─────────────────────────────────────────────────────

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
  };

  // ── rendering ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage apiBase={apiBase} />;
  }

  const activeKeys = keys.filter((k) => k.isActive);
  const planLabel = sub?.plan ?? 'free';
  const limits = sub?.limits;
  const usage = sub?.usage;
  const usedReqs = sub?.monthlyUsage ?? usage?.requestCount ?? 0;
  const maxReqs = sub?.monthlyLimit ?? limits?.maxRequestsPerMonth ?? 1000;
  const usePct = maxReqs > 0 ? Math.min(100, (usedReqs / maxReqs) * 100) : 0;
  const lifetimeCredit = sub?.lifetimeCredit ?? 0;
  const lifetimeUsage = sub?.lifetimeUsage ?? 0;
  const lifetimePct = lifetimeCredit > 0 ? Math.min(100, (lifetimeUsage / lifetimeCredit) * 100) : 0;

  const serverOrigin = apiBase || (typeof window !== 'undefined' ? window.location.origin : '');
  const keyValue = rawKey ?? (activeKeys.length > 0 ? 'ak_••••••••…' : null);
  const mcpSnippet = keyValue
    ? buildMcpSnippet(serverOrigin, keyValue, editorTab)
    : null;

  return (
    <div className={styles.wrapper}>
      {/* ── Toast ── */}
      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>
            {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
          </div>
          <div>
            <div className={styles.userName}>
              {user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.email}
            </div>
            <div className={styles.userEmail}>{user.email}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.planBadge} style={{ background: planColor(planLabel) }}>
            {planLabel.toUpperCase()}
          </span>
          {user.loginProvider && (
            <span className={styles.providerBadge}>
              {PROVIDER_LABELS[user.loginProvider] ?? user.loginProvider}
            </span>
          )}
          <button className={styles.btnOutline} onClick={logout}>Sign out</button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {(['dashboard', 'keys', 'subscription', 'options'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'dashboard' ? '📊 Dashboard' : t === 'keys' ? '🔑 API Keys' : t === 'subscription' ? '💳 Plan' : '⚙️ Options'}
          </button>
        ))}
      </div>

      {/* ── Dashboard ── */}
      {tab === 'dashboard' && (
        <div className={styles.section}>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{activeKeys.length}</div>
              <div className={styles.statLabel}>Active API Keys</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{usedReqs.toLocaleString()}</div>
              <div className={styles.statLabel}>Requests this month</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue} style={{ color: planColor(planLabel) }}>
                {planLabel.charAt(0).toUpperCase() + planLabel.slice(1)}
              </div>
              <div className={styles.statLabel}>Active plan</div>
            </div>
          </div>

          {maxReqs > 0 && (
            <div className={styles.usageBar}>
              <div className={styles.usageLabel}>
                <span>Monthly MCP requests</span>
                <span>{usedReqs.toLocaleString()} / {maxReqs.toLocaleString()}</span>
              </div>
              <div className={styles.barBg}>
                <div
                  className={styles.barFill}
                  role="progressbar"
                  aria-valuenow={usedReqs}
                  aria-valuemin={0}
                  aria-valuemax={maxReqs}
                  aria-label={`Monthly MCP requests: ${usedReqs} of ${maxReqs} used${usePct > 85 ? ' — limit nearly reached' : usePct > 60 ? ' — over 60% used' : ''}`}
                  style={{
                    width: `${usePct}%`,
                    background: usePct > 85 ? '#ef4444' : usePct > 60 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
              {lifetimeCredit > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div className={styles.usageLabel}>
                    <span>📦 One-time credits</span>
                    <span style={{ color: '#8b5cf6' }}>{lifetimeUsage.toLocaleString()} / {lifetimeCredit.toLocaleString()}</span>
                  </div>
                  <div className={styles.barBg}>
                    <div
                      className={styles.barFill}
                      role="progressbar"
                      aria-valuenow={lifetimeUsage}
                      aria-valuemin={0}
                      aria-valuemax={lifetimeCredit}
                      aria-label={`One-time lifetime credits: ${lifetimeUsage} of ${lifetimeCredit} consumed${lifetimePct > 85 ? ' — nearly exhausted' : ''}`}
                      style={{
                        width: `${lifetimePct}%`,
                        background: lifetimePct > 85 ? '#ef4444' : lifetimePct > 60 ? '#a78bfa' : '#8b5cf6',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8b5cf6', marginTop: '0.35rem' }}>
                    Consumed after your monthly credits run out each month.
                  </div>
                </div>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)', marginTop: '0.75rem', textAlign: 'center' }}>
                💡 <em>Note: A single AI chat message may consume multiple requests if the model needs to call several tools.</em>
              </div>
            </div>
          )}

          {keyValue && (
            <div className={styles.snippetBox}>
              <div className={styles.snippetHeader}>
                <span>🚀 Configure your AI editor</span>
                <button className={styles.btnCopy} onClick={() => copy(mcpSnippet || '')}>
                  📋 Copy
                </button>
              </div>
              {/* Editor selector tabs */}
              <div className={styles.snippetEditorTabs}>
                {EDITOR_TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    className={`${styles.snippetEditorTab} ${editorTab === id ? styles.snippetEditorTabActive : ''}`}
                    onClick={() => setEditorTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <pre className={styles.snippet}>{mcpSnippet}</pre>
              {rawKey && (
                <p className={styles.rawKeyWarning}>
                  ⚠️ This is the only time this key will be shown. Copy it now!
                </p>
              )}
            </div>
          )}

          {activeKeys.length === 0 && !rawKey && (
            <div className={styles.emptyState}>
              <p>You don't have any API keys yet. Go to <button className={styles.linkBtn} onClick={() => setTab('keys')}>🔑 API Keys</button> to create one.</p>
            </div>
          )}
        </div>
      )}

      {/* ── API Keys ── */}
      {tab === 'keys' && (
        <div className={styles.section}>
          {/* Create form */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>New MCP API Key</h3>
            <div className={styles.formRow}>
              <input
                className={styles.input}
                placeholder="Name (e.g. VS Code Token)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                maxLength={80}
              />
              <input
                type="date"
                className={styles.input}
                value={newKeyExpiry}
                onChange={(e) => setNewKeyExpiry(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                title="Optional expiry date"
              />
            </div>
            <button
              className={styles.btnPrimary}
              onClick={createKey}
              disabled={creating}
            >
              {creating ? 'Generating…' : '+ Generate Key'}
            </button>
          </div>

          {/* Newly created key */}
          {rawKey && (
            <div className={styles.newKeyAlert}>
              <strong>🔑 Copy your API key now — it won't be shown again!</strong>
              <div className={styles.rawKeyRow}>
                <code className={styles.rawKey}>{rawKey}</code>
                <button className={styles.btnCopy} onClick={() => copy(rawKey)}>📋</button>
              </div>
              <button className={styles.btnOutline} onClick={() => setRawKey(null)} style={{ marginTop: '0.5rem' }}>
                ✓ Saved, dismiss
              </button>
            </div>
          )}

          {/* Tabella keys */}
          {keys.length === 0 ? (
            <div className={styles.emptyState}>No API keys found.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th><th>Prefix</th>
                    <th>Created</th><th>Expires</th><th>Last used</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} style={{ opacity: k.isActive ? 1 : 0.5 }}>
                      <td><strong>{k.name}</strong></td>
                      <td><code>{k.keyPrefix}…</code></td>
                      <td>{fmt(k.createdAt)}</td>
                      <td>{fmt(k.expiresAt)}</td>
                      <td>{fmt(k.lastUsedAt)}</td>
                      <td>
                        {!k.isActive
                          ? <span className={styles.badgeRed}>Revoked</span>
                          : k.expiresAt && new Date(k.expiresAt) < new Date()
                            ? <span className={styles.badgeGray}>Expired</span>
                            : <span className={styles.badgeGreen}>Active</span>}
                      </td>
                      <td>
                        {k.isActive && (
                          <button
                            className={styles.btnDanger}
                            disabled={revoking === k.id}
                            onClick={() => revokeKey(k.id)}
                          >
                            {revoking === k.id ? '…' : 'Revoke'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Subscription ── */}
      {tab === 'subscription' && (
        <div className={styles.section}>
          {sub ? (
            <>
              <div className={styles.currentPlan}>
                <div>
                  <div className={styles.planName} style={{ color: planColor(sub.plan) }}>
                    {sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} Plan
                  </div>
                  {sub.usage && (
                    <div className={styles.planMeta}>
                      Period: {fmt(sub.usage.periodStart)} → {fmt(sub.usage.periodEnd)}
                    </div>
                  )}
                </div>
                <div className={styles.planStats}>
                  <div><strong>{sub.limits.maxApiKeys}</strong> API Keys</div>
                  <div>
                    <strong>
                      {sub.limits.maxRequestsPerMonth === 0
                        ? '∞'
                        : sub.limits.maxRequestsPerMonth.toLocaleString()}
                    </strong> req/month
                  </div>
                  <div>{sub.limits.multiTenantEnabled ? '✅ Multi-tenant' : '—'}</div>
                </div>
              </div>

              {/* ── Sponsorship model ────────────────────────────────────────── */}
              <div className={styles.sponsorSection}>
                <h3 className={styles.sponsorTitle}>💚 Support & unlock more</h3>
                <p className={styles.sponsorDesc}>
                  The free tier includes <strong>20 requests/month</strong> (via AI chat and API key combined).
                  <em> Note: A single chat message might consume multiple requests since the LLM can call several tools at once.</em><br /><br />
                  Sponsoring the project on GitHub increases your limit automatically by <strong>10 extra requests for every $1</strong> sponsored:
                </p>
                <table className={styles.sponsorTable}>
                  <thead>
                    <tr>
                      <th>Sponsorship</th>
                      <th>Extra requests</th>
                      <th>Total/month</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>$2 / month</td>
                      <td>+20</td>
                      <td><strong>40 / month</strong></td>
                      <td>🔄 Renewable</td>
                    </tr>
                    <tr>
                      <td>$5 / month</td>
                      <td>+50</td>
                      <td><strong>70 / month</strong></td>
                      <td>🔄 Renewable</td>
                    </tr>
                    <tr>
                      <td>$10 one-time</td>
                      <td>+100</td>
                      <td><strong>100 total credit</strong></td>
                      <td>📦 Consumed once</td>
                    </tr>
                  </tbody>
                </table>

                {/* ── Advanced docs benefit ── */}
                <div className={styles.advancedBenefit}>
                  <div className={styles.advancedBenefitHeader}>
                    <span className={styles.advancedBenefitIcon}>🔓</span>
                    <strong>Unlock the Advanced Docs section</strong>
                  </div>
                  <p className={styles.advancedBenefitDesc}>
                    All sponsors get exclusive access to the{' '}
                    <strong>Advanced</strong> section of the documentation — the complete
                    production-grade playbook covering multi-tenancy, RBAC, real-time SSE &amp;
                    webhooks, API key M2M auth, telemetry, the built-in admin panel, custom JWT
                    claims, and more. It&apos;s the section where the library truly shines for
                    large-scale applications.
                  </p>
                </div>

                <p className={styles.sponsorNote}>
                  Sponsor recognition is automatic — once your GitHub account (used to log in) is matched
                  to a sponsorship the increased limit applies immediately. One-time credits are consumed
                  until exhausted, then the account returns to the free tier.
                </p>
                <a
                  className={styles.btnPrimary}
                  href="https://github.com/sponsors/nik2208"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', textAlign: 'center' }}
                >
                  ❤️ Sponsor on GitHub
                </a>
              </div>

              {/*
               * Pro / Enterprise plan cards — kept for future use.
               * The interface is complete and can be reactivated when
               * a payment provider (Stripe, Paddle, etc.) is integrated.
               *
               * To re-enable: remove this comment block and restore the
               * plansGrid below.
               *
               * <div className={styles.plansGrid}>
               *   { plan: 'pro',        price: '$19/mo',  keys: 20,  reqs: '100,000', tenants: true  }
               *   { plan: 'enterprise', price: 'Custom',  keys: 200, reqs: '∞',       tenants: true  }
               * </div>
               */}
            </>
          ) : (
            <div className={styles.emptyState}>Loading plan…</div>
          )}
        </div>
      )}

      {/* ── Options ── */}
      {tab === 'options' && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>General Settings</div>
          <div className={styles.preferenceItem}>
            <div className={styles.preferenceText}>
              <div className={styles.preferenceLabel}>Mailing List</div>
              <div className={styles.preferenceDesc}>Receive updates about new features, improvements, and community news.</div>
            </div>
            <button
              className={`${styles.toggle} ${newsletter ? styles.toggleActive : ''}`}
              onClick={toggleNewsletter}
              disabled={updatingPrefs}
            >
              <div className={styles.toggleThumb} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Login page ─────────────────────────────────────────────────────────────────

function LoginPage({ apiBase }: { apiBase: string }) {
  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div className={styles.loginLogo}>🔐</div>
        <h2 className={styles.loginTitle}>Sign in to your account</h2>
        <p className={styles.loginSub}>
          Manage your MCP API keys{/*, subscription plan,*/} and integrations.
        </p>

        <div className={styles.oauthBtns}>
          {/* <a
            href={`${apiBase}/auth/oauth/google`}
            className={styles.oauthBtn}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
              <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </a> */}

          <a
            href={`${apiBase}/auth/oauth/github`}
            className={styles.oauthBtn}
            style={{ background: '#24292e', color: '#fff', borderColor: '#24292e' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }}>
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
            </svg>
            Continue with GitHub
          </a>
        </div>

        <p className={styles.loginNote}>
          By signing in, you agree to the{' '}
          <a href="/termsofservice">Terms of Service</a>{' '}
          and the{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

// ── Docusaurus wrapper ─────────────────────────────────────────────────────────

export default function AccountPage(): React.ReactElement {
  const { siteConfig } = useDocusaurusContext();
  const accountApiUrl = ((siteConfig.customFields ?? {}) as { accountApiUrl?: string }).accountApiUrl ?? '';

  return (
    <Layout
      title="My Account"
      description="Manage your MCP API keys{/*, subscription plan,*/} and integrations"
      noFooter={false}
    >
      <BrowserOnly fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#64748b' }}>
          Loading account area…
        </div>
      }>
        {() => <AccountArea apiBase={accountApiUrl} />}
      </BrowserOnly>
    </Layout>
  );
}
