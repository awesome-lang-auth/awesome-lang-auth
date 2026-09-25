import React, { useState, useRef, useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './demo-live.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DemoUser {
  id: string;
  email: string;
  _pw: string;           // plaintext — demo only, never do this in production
  role: string;
  createdAt: string;
  lastLogin: string | null;
}

interface ApiResp {
  method: string;
  path: string;
  status: number;
  body: unknown;
}

type Tab = 'register' | 'login' | 'profile' | 'admin';

const STATUS_TEXT: Record<number, string> = {
  200: 'OK', 201: 'Created', 400: 'Bad Request',
  401: 'Unauthorized', 403: 'Forbidden', 409: 'Conflict',
};

// ── Simulated token helpers ───────────────────────────────────────────────────
// These produce base64-JSON blobs, NOT real JWTs. Demo only.

function makeToken(user: DemoUser): string {
  return btoa(JSON.stringify({ sub: user.id, email: user.email, role: user.role }));
}
function readToken(tok: string): { sub: string } | null {
  try { return JSON.parse(atob(tok)); } catch { return null; }
}

// ── Component ─────────────────────────────────────────────────────────────────

// StackBlitz GitHub-import URL for the demo/ project in this repo.
// When the PR is merged to main, StackBlitz will boot a real Node.js server
// from demo/server.js using WebContainers and show the running app preview.
const STACKBLITZ_URL =
  'https://stackblitz.com/github/nik2208/awesome-node-auth/tree/main/demo/express-vanilla' +
  '?embed=1&view=preview&startScript=start&hideNavigation=1&ctl=1';

export default function DemoLive(): JSX.Element {
  // SSR guard — btoa / atob don't exist in Node.js
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Page mode: live server embed or browser simulator
  const [mode, setMode] = useState<'live' | 'simulator'>('live');

  // In-memory user store
  const [users, setUsers] = useState<DemoUser[]>([]);
  const nextId = useRef(1);

  // Auth session
  const [token, setToken]           = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<DemoUser | null>(null);

  // UI state
  const [tab, setTab]               = useState<Tab>('register');
  const [resp, setResp]             = useState<ApiResp | null>(null);
  const [adminAuthed, setAdminAuthed] = useState(false);

  // Form fields
  const [rEmail, setREmail] = useState('alice@example.com');
  const [rPass,  setRPass]  = useState('secret123');
  const [lEmail, setLEmail] = useState('alice@example.com');
  const [lPass,  setLPass]  = useState('secret123');
  const [adminPwd, setAdminPwd] = useState('');

  // ── Simulated endpoints ───────────────────────────────────────────────────

  const register = () => {
    const email = rEmail.trim().toLowerCase();
    if (!email || !rPass) {
      setResp({ method: 'POST', path: '/auth/register', status: 400,
        body: { error: 'email and password are required' } });
      return;
    }
    if (users.some(u => u.email === email)) {
      setResp({ method: 'POST', path: '/auth/register', status: 409,
        body: { error: 'Email already registered', code: 'EMAIL_EXISTS' } });
      return;
    }
    const user: DemoUser = {
      id: String(nextId.current++), email, _pw: rPass,
      role: 'user', createdAt: new Date().toISOString(), lastLogin: null,
    };
    setUsers(prev => [...prev, user]);
    const tok = makeToken(user);
    setToken(tok);
    setActiveUser(user);
    setResp({
      method: 'POST', path: '/auth/register', status: 201,
      body: {
        user: { id: user.id, email: user.email, role: user.role,
          createdAt: user.createdAt, isEmailVerified: false },
        accessToken: tok,
        refreshToken: '← set as HttpOnly cookie in real usage',
        message: 'Registration successful',
      },
    });
    setTab('profile');
  };

  const login = () => {
    const email = lEmail.trim().toLowerCase();
    const found = users.find(u => u.email === email);
    if (!found || found._pw !== lPass) {
      setResp({ method: 'POST', path: '/auth/login', status: 401,
        body: { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
      return;
    }
    const updated: DemoUser = { ...found, lastLogin: new Date().toISOString() };
    setUsers(prev => prev.map(u => u.id === found.id ? updated : u));
    const tok = makeToken(updated);
    setToken(tok);
    setActiveUser(updated);
    setResp({
      method: 'POST', path: '/auth/login', status: 200,
      body: {
        user: { id: updated.id, email: updated.email, role: updated.role,
          lastLogin: updated.lastLogin, isEmailVerified: false },
        accessToken: tok,
        refreshToken: '← set as HttpOnly cookie in real usage',
      },
    });
    setTab('profile');
  };

  const getMe = () => {
    if (!token) {
      setResp({ method: 'GET', path: '/auth/me', status: 403,
        body: { error: 'No access token provided' } });
      return;
    }
    const payload = readToken(token);
    const user = payload ? users.find(u => u.id === payload.sub) : null;
    if (!user) {
      setResp({ method: 'GET', path: '/auth/me', status: 403,
        body: { error: 'Invalid or expired token' } });
      return;
    }
    setResp({
      method: 'GET', path: '/auth/me', status: 200,
      body: {
        id: user.id, email: user.email, role: user.role,
        createdAt: user.createdAt, lastLogin: user.lastLogin,
        isEmailVerified: false, isTotpEnabled: false, require2FA: false,
      },
    });
  };

  const logout = () => {
    setToken(null);
    setActiveUser(null);
    setResp({ method: 'POST', path: '/auth/logout', status: 200,
      body: { message: 'Logged out successfully' } });
    setTab('login');
  };

  const adminLogin = () => {
    if (adminPwd !== '1234') {
      setResp({ method: 'GET', path: '/admin/api/users', status: 403,
        body: { error: 'Forbidden' } });
      return;
    }
    setAdminAuthed(true);
    setResp({
      method: 'GET', path: '/admin/api/users', status: 200,
      body: {
        users: users.map(u => ({ id: u.id, email: u.email, role: u.role,
          createdAt: u.createdAt, lastLogin: u.lastLogin })),
        total: users.length,
      },
    });
  };

  const deleteUser = (id: string) => {
    const next = users.filter(u => u.id !== id);
    setUsers(next);
    if (activeUser?.id === id) { setToken(null); setActiveUser(null); }
    setResp({
      method: 'DELETE', path: `/admin/api/users/${id}`, status: 200,
      body: { message: 'User deleted',
        users: next.map(u => ({ id: u.id, email: u.email, role: u.role })),
        total: next.length },
    });
  };

  const reset = () => {
    setUsers([]); setToken(null); setActiveUser(null); setResp(null);
    setAdminAuthed(false); setAdminPwd('');
    nextId.current = 1; setTab('register');
  };

  const isAuthed = !!token && !!activeUser;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout
      title="Live Demo"
      description="Try awesome-node-auth right in your browser — register, login, JWT cookies, admin panel."
    >
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerInner}>
          <span className={styles.liveBadge}>
            <span className={styles.livePulse} />
            LIVE
          </span>
          <h1 className={styles.pageTitle}>Interactive Demo</h1>
          <p className={styles.pageSubtitle}>
            A real Express + awesome-node-auth server running with in-memory storage.
            Try it live in your browser — no install needed.
          </p>
          <div className={styles.headerLinks}>
            <Link to="/demo" className={styles.headerLink}>📄 See the code</Link>
            {mode === 'simulator' && (
              <button className={styles.resetBtn} onClick={reset}>↺ Reset</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Mode switcher ── */}
      <div className={styles.modeSwitcher}>
        <button
          className={`${styles.modeBtn} ${mode === 'live' ? styles.modeBtnOn : ''}`}
          onClick={() => setMode('live')}
        >
          🖥️ Live Server
          <span className={styles.modeBadge}>WebContainers</span>
        </button>
        <button
          className={`${styles.modeBtn} ${mode === 'simulator' ? styles.modeBtnOn : ''}`}
          onClick={() => setMode('simulator')}
        >
          🧪 Browser Simulator
          <span className={styles.modeBadge}>no server</span>
        </button>
      </div>

      {!mounted ? (
        <div className={styles.wrapper}>
          <div className={styles.loading}>Loading demo…</div>
        </div>
      ) : mode === 'live' ? (
        /* ── Live Server mode: StackBlitz WebContainers embed ── */
        <div className={styles.sbWrapper}>
          <div className={styles.sbInfo}>
            <strong>⚡ WebContainers</strong> — StackBlitz boots a real Node.js server
            (<code>demo/express-vanilla/server.js</code>) directly in your browser using{' '}
            <strong>bcryptjs</strong> for password hashing, <strong>jsonwebtoken</strong>{' '}
            for JWT cookies, and <strong>in-memory storage</strong> — the real{' '}
            <code>awesome-node-auth</code> library.
            The Admin Panel (password: <code>1234</code>) is available inside the preview.
          </div>
          <div className={styles.sbFrame}>
            <iframe
              src={STACKBLITZ_URL}
              title="node-auth live demo (StackBlitz WebContainers)"
              className={styles.sbIframe}
              allow="cross-origin-isolated"
              loading="lazy"
            />
          </div>
          <div className={styles.sbFallback}>
            Can't see the embed?{' '}
            <a
              href="https://stackblitz.com/github/nik2208/awesome-node-auth/tree/main/demo/express-vanilla?startScript=start"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open directly on StackBlitz ↗
            </a>
          </div>
        </div>
      ) : (
        <div className={styles.wrapper}>

          {/* ── Auth status bar ── */}
          <div className={`${styles.statusBar} ${isAuthed ? styles.statusOn : styles.statusOff}`}>
            <span className={styles.statusDot} />
            {isAuthed
              ? <><strong>{activeUser.email}</strong> is logged in · role: <code>{activeUser.role}</code></>
              : <>Not authenticated — register or login to get a token</>}
          </div>

          {/* ── Main two-column layout ── */}
          <div className={styles.grid}>

            {/* ── Left: form panel ── */}
            <div className={styles.formCard}>
              <nav className={styles.tabs}>
                {([
                  ['register', '📝 Register'],
                  ['login',    '🔑 Login'],
                  ['profile',  '👤 Profile'],
                  ['admin',    '🛡️ Admin'],
                ] as [Tab, string][]).map(([t, label]) => (
                  <button
                    key={t}
                    className={`${styles.tab} ${tab === t ? styles.tabOn : ''}`}
                    onClick={() => { setTab(t); setResp(null); }}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className={styles.formArea}>

                {/* Register */}
                {tab === 'register' && (
                  <>
                    <p className={styles.endpointTag}>POST /auth/register</p>
                    <label className={styles.lbl}>Email</label>
                    <input className={styles.inp} type="email" value={rEmail}
                      onChange={e => setREmail(e.target.value)} placeholder="user@example.com" />
                    <label className={styles.lbl}>Password</label>
                    <input className={styles.inp} type="password" value={rPass}
                      onChange={e => setRPass(e.target.value)} placeholder="password"
                      onKeyDown={e => e.key === 'Enter' && register()} />
                    <button className={styles.btnGreen} onClick={register}>Register →</button>
                  </>
                )}

                {/* Login */}
                {tab === 'login' && (
                  <>
                    <p className={styles.endpointTag}>POST /auth/login</p>
                    <label className={styles.lbl}>Email</label>
                    <input className={styles.inp} type="email" value={lEmail}
                      onChange={e => setLEmail(e.target.value)} placeholder="user@example.com" />
                    <label className={styles.lbl}>Password</label>
                    <input className={styles.inp} type="password" value={lPass}
                      onChange={e => setLPass(e.target.value)} placeholder="password"
                      onKeyDown={e => e.key === 'Enter' && login()} />
                    <button className={styles.btnGreen} onClick={login}>Login →</button>
                    {users.length === 0 && (
                      <p className={styles.hint}>
                        No accounts yet.{' '}
                        <button className={styles.inlineLink} onClick={() => setTab('register')}>
                          Register first →
                        </button>
                      </p>
                    )}
                  </>
                )}

                {/* Profile */}
                {tab === 'profile' && (
                  <>
                    <p className={styles.endpointTag}>GET /auth/me</p>
                    {isAuthed ? (
                      <>
                        <div className={styles.cookiePreview}>
                          <span className={styles.cookieLabel}>Cookie: accessToken (HttpOnly in real usage)</span>
                          <code className={styles.cookieVal}>{token!.slice(0, 36)}…</code>
                        </div>
                        <button className={styles.btnGreen} onClick={getMe}>GET /auth/me →</button>
                        <button className={styles.btnOutline} onClick={logout}>
                          POST /auth/logout
                        </button>
                      </>
                    ) : (
                      <div className={styles.guestMsg}>
                        Not logged in.
                        <button className={styles.btnOutline} onClick={() => setTab('login')}>
                          Go to Login →
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Admin */}
                {tab === 'admin' && (
                  <>
                    <p className={styles.endpointTag}>
                      GET /admin · Authorization: Bearer &lt;adminSecret&gt;
                    </p>
                    {!adminAuthed ? (
                      <>
                        <label className={styles.lbl}>Admin Password</label>
                        <input className={styles.inp} type="password" value={adminPwd}
                          onChange={e => setAdminPwd(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && adminLogin()}
                          placeholder="Enter admin password" />
                        <p className={styles.hint}>
                          Hint: the password is <code>1234</code>
                        </p>
                        <button className={styles.btnGreen} onClick={adminLogin}>
                          Access Admin Panel →
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={styles.adminBar}>
                          <span className={styles.adminTag}>✓ Admin authenticated</span>
                          <button className={styles.btnDanger}
                            onClick={() => { setAdminAuthed(false); setAdminPwd(''); }}>
                            Logout
                          </button>
                        </div>
                        <p className={styles.lbl}>Registered users ({users.length})</p>
                        {users.length === 0 ? (
                          <p className={styles.hint}>
                            No users yet — register some accounts first.
                          </p>
                        ) : (
                          <div className={styles.tableWrap}>
                            <table className={styles.tbl}>
                              <thead>
                                <tr>
                                  <th>#</th><th>Email</th><th>Role</th>
                                  <th>Last login</th><th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {users.map(u => (
                                  <tr key={u.id}>
                                    <td><code>{u.id}</code></td>
                                    <td>{u.email}</td>
                                    <td><span className={styles.rolePill}>{u.role}</span></td>
                                    <td className={styles.dateCell}>
                                      {u.lastLogin
                                        ? new Date(u.lastLogin).toLocaleTimeString()
                                        : '—'}
                                    </td>
                                    <td>
                                      <button className={styles.btnDanger}
                                        onClick={() => deleteUser(u.id)}>✕</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

              </div>
            </div>

            {/* ── Right: response viewer ── */}
            <div className={styles.responseCard}>
              <div className={styles.responseHdr}>
                {resp ? (
                  <div className={styles.responseTitle}>
                    <span className={`${styles.methodPill} ${styles[`m${resp.method}`]}`}>
                      {resp.method}
                    </span>
                    <code className={styles.respPath}>{resp.path}</code>
                    <span className={`${styles.statusPill} ${
                      resp.status < 300 ? styles.s2xx :
                      resp.status < 500 ? styles.s4xx : styles.s5xx
                    }`}>
                      {resp.status} {STATUS_TEXT[resp.status] ?? ''}
                    </span>
                  </div>
                ) : (
                  <span className={styles.responseHdrLabel}>Response</span>
                )}
              </div>
              <div className={styles.responseBody}>
                {resp ? (
                  <pre className={styles.json}>
                    {JSON.stringify(resp.body, null, 2)}
                  </pre>
                ) : (
                  <div className={styles.respEmpty}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <p>Send a request to see the response</p>
                  </div>
                )}
              </div>
            </div>

          </div>{/* /grid */}

          {/* ── Simulation note ── */}
          <div className={styles.note}>
            <strong>⚠️ Simulation note</strong> — This demo runs entirely in your browser.
            Tokens are base64 JSON, not real JWTs. Passwords are not hashed.
            In production, awesome-node-auth handles all of this server-side with{' '}
            <code>bcryptjs</code> + <code>jsonwebtoken</code> + HttpOnly cookies.{' '}
            <Link to="/demo">See the real server code →</Link>
          </div>

        </div>
      )}
    </Layout>
  );
}
