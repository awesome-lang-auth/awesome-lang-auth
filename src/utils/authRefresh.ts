/**
 * Shared auth-refresh utilities used by all wiki pages/components.
 *
 * Key design:  refreshOnce() prevents duplicate POST /auth/refresh calls through
 * three complementary mechanisms:
 *
 *  1. Delegation to auth.js — when the library's auth.js is loaded as a <script>
 *     in <head>, refreshOnce() delegates to window.AwesomeNodeAuth.refresh() which
 *     shares the same in-flight promise with auth.js's own fetch interceptor.
 *     This is the single source of truth for refresh state across ALL callers.
 *
 *  2. Window-scoped singleton — state is stored on window.__nodeAuthRefresh instead
 *     of module-level variables.  Docusaurus code-splits async chunks and may
 *     instantiate this module in more than one chunk, giving each chunk its own
 *     module scope.  window storage is always a true singleton regardless of
 *     bundler behaviour.
 *
 *  3. Post-success cooldown — after a refresh succeeds, any further call within
 *     REFRESH_COOLDOWN_MS returns Promise.resolve(true) immediately, covering
 *     the "slightly offset" race where two callers see a 403 but their
 *     me-responses arrive milliseconds apart.
 */

/**
 * Read the CSRF double-submit token from cookies.
 * awesome-node-auth v1.3+ prefixes the cookie with `__Host-` or `__Secure-` for
 * cookie-tossing protection.  We check all three names in priority order so this
 * works in both development (plain `csrf-token`) and production (prefixed variants).
 */
export function getCsrfToken(): string {
  const get = (name: string) =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1] ?? '';
  return get('__Host-csrf-token') || get('__Secure-csrf-token') || get('csrf-token');
}

/**
 * How long (ms) after a successful refresh to skip new refresh attempts.
 * 10 seconds is safe: access tokens are valid for minutes, and within 10 s of
 * issuing a new token pair there is no reason to rotate again.
 */
const REFRESH_COOLDOWN_MS = 10_000;

/** Namespace key for the window-scoped singleton state. */
const NS = '__nodeAuthRefresh';

interface RefreshState {
  /** In-flight refresh promise, or null when idle. */
  p: Promise<boolean> | null;
  /** Timestamp (Date.now()) of the last successful refresh.  0 = never. */
  t: number;
}

/** Minimal shape of window.AwesomeNodeAuth we depend on. */
interface AwesomeNodeAuthGlobal {
  refresh?: () => Promise<boolean>;
}

declare global {
  interface Window {
    [NS]: RefreshState;
    AwesomeNodeAuth?: AwesomeNodeAuthGlobal;
  }
}

/**
 * Returns the shared mutable state object from window.
 * Mutations on the returned object are immediately visible to all callers in
 * the same browser tab because they all reference the same window property.
 */
function s(): RefreshState {
  if (!window[NS]) window[NS] = { p: null, t: 0 };
  return window[NS];
}

/**
 * POST /auth/refresh at most once per REFRESH_COOLDOWN_MS window.
 * Returns true if the session was (or recently was) refreshed, false otherwise.
 *
 * Guarantees:
 *  - When the library's auth.js is loaded as a <script> in <head>, delegates to
 *    window.AwesomeNodeAuth.refresh() — the single authoritative singleton.
 *  - Concurrent callers share the same in-flight promise via window state (no
 *    parallel HTTP calls even when this module is duplicated across bundles).
 *  - Callers within REFRESH_COOLDOWN_MS of the last success return true
 *    immediately without an HTTP call.
 */
export function refreshOnce(apiBase: string): Promise<boolean> {
  // 1. Delegate to auth.js when it is loaded — its refreshToken() is the
  //    single source of truth shared with the global fetch interceptor.
  if (typeof window.AwesomeNodeAuth?.refresh === 'function') {
    return window.AwesomeNodeAuth.refresh();
  }

  const state = s();

  // 2. Post-success cooldown: new cookies are already in the browser.
  if (Date.now() - state.t < REFRESH_COOLDOWN_MS) {
    return Promise.resolve(true);
  }

  // 3. In-flight dedup: share the pending promise with any concurrent caller.
  if (state.p) return state.p;

  state.p = fetch(`${apiBase}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': getCsrfToken() },
  })
    .then((r) => {
      if (r.ok) s().t = Date.now();
      return r.ok;
    })
    .catch(() => false)
    .finally(() => {
      s().p = null;
    });

  return state.p;
}
