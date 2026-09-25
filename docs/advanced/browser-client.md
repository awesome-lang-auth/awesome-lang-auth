---
id: browser-client
title: auth.js Browser Client (window.AwesomeNodeAuth)
description: >-
  Drop auth.js into any web page for fetch-based session handling: automatic token refresh, login helpers and headless mode for custom frontends.
sidebar_label: Browser Client (auth.js)
---

# Browser Client — `window.AwesomeNodeAuth`

`awesome-node-auth` ships a zero-config browser authentication client as a static asset served at `/auth/ui/assets/auth.js`.

Include it once in your HTML to get a complete, framework-agnostic auth layer — no npm install, no build step, no configuration required.

```html
<!-- Add to <head> — works with Express, NestJS, Next.js, or any server -->
<script src="/auth/ui/assets/auth.js"></script>
```

> Replace `/auth` with your actual `apiPrefix` if different from the default.

---

## What it does automatically

| Capability | Details |
|-----------|---------|
| **CSRF injection** | Intercepts every `fetch()` call directed at the auth backend and adds `X-CSRF-Token` from the CSRF cookie (`__Host-csrf-token`, `__Secure-csrf-token`, or `csrf-token` — checked in that order to support cookie-tossing protection added in v1.3) |
| **Credentials propagation** | Forces `credentials: 'include'` on all requests to the **same origin as the auth backend**. The origin is derived from `apiPrefix`: if it is an absolute URL (e.g. `https://auth.example.com/auth`), only requests to that domain get credentials; if it is a relative path, all same-origin requests qualify. Requests to other origins (e.g. LiteLLM, OpenAI, Stripe) are left untouched, avoiding conflicts with `Access-Control-Allow-Origin: *` |
| **Token auto-refresh** | On any 401 or 403 from a non-auth endpoint, transparently calls `POST /auth/refresh` and retries; on failure, calls logout and redirects |
| **`apiPrefix` auto-detection** | Derives the backend base path from the page URL (e.g. `/auth` at `/auth/ui/login`) — **zero config needed** with built-in UI pages |

---

## Registered globals

| Global | Purpose |
|--------|---------|
| `window.AwesomeNodeAuth` | **Public API** — use from any JS/framework |
| `window.AuthService` | Internal helper used by the built-in HTML pages; available for low-level API calls |

---

## `AwesomeNodeAuth.init(options?)` — optional configuration

`init()` is not required. Call it only if you need to customise paths, lifecycle hooks, or override individual methods.

```javascript
// Zero config — works out of the box with built-in UI pages
// AwesomeNodeAuth.init() is not required

// Custom prefix + login URL
AwesomeNodeAuth.init({
  apiPrefix: '/api/v1/auth',
  loginUrl: '/sign-in',
  homeUrl: '/dashboard',
});

// Lifecycle hooks for SPA routing (no full-page redirect)
AwesomeNodeAuth.init({
  apiPrefix: '/api/auth',
  onSessionExpired: () => router.navigate('/login'),
  onLogout: () => { clearLocalStorage(); router.navigate('/login'); },
  onRefreshFail: () => console.warn('[auth] token refresh failed'),
  onRefreshSuccess: (result) => console.debug('[auth] refreshed', result),
});

// Override an individual auth method (e.g. add audit logging)
// Call AuthService.apiCall directly — calling AwesomeNodeAuth.login() here
// would recurse infinitely since this IS the login override.
AwesomeNodeAuth.init({
  login: async (email, password) => {
    console.log('[audit] login attempt for', email);
    return AuthService.apiCall('/login', 'POST', { email, password });
  },
});
```

### `init()` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiPrefix` | `string` | Derived from URL | Base path of the auth backend |
| `loginUrl` | `string` | `{apiPrefix}/ui/login` | Login page URL |
| `homeUrl` | `string` | `/` | Redirect target after successful login |
| `siteName` | `string` | `'Awesome Node Auth'` | Site name (used by built-in pages) |
| `headless` | `boolean` | `false` | When `true`, installs no-op `onSessionExpired`, `onLogout`, and `onRefreshFail` handlers immediately. Use when loading `auth.js` from a remote SPA (e.g. Docusaurus) that manages its own navigation — prevents `auth.js` from doing `window.location` redirects. Auto-applied when the backend config also has `ui.headless: true`. |
| `onLogout` | `Function` | Auto-redirect to `loginUrl` | Called after logout instead of redirect |
| `onSessionExpired` | `Function` | Auto-redirect to `loginUrl` | Called when token refresh fails instead of redirect |
| `onRefreshSuccess` | `Function(result)` | — | Called after a successful transparent token refresh |
| `onRefreshFail` | `Function` | Auto-logout | Called when token refresh fails (before logout fallback) |
| `login` | `Function` | Built-in | Override the `login()` implementation |
| `logout` | `Function` | Built-in | Override the `logout()` implementation |
| `register` | `Function` | Built-in | Override the `register()` implementation |
| _(any method)_ | `Function` | Built-in | Any public method can be overridden the same way |

---

## State

```javascript
AwesomeNodeAuth.isAuthenticated()  // → boolean
AwesomeNodeAuth.isInitialized()    // → boolean (true after first checkSession)
AwesomeNodeAuth.getUser()          // → user object or null
AwesomeNodeAuth.config             // → { apiPrefix, loginUrl, homeUrl, features, ui, … }
```

---

## Session & route guards

```javascript
// Verify current session (calls GET /auth/me)
const loggedIn = await AwesomeNodeAuth.checkSession();

// Redirect to login if not authenticated
await AwesomeNodeAuth.guardPage();
await AwesomeNodeAuth.guardPage('/custom-login');   // custom redirect target

// Redirect if user lacks the required role
await AwesomeNodeAuth.guardRole('admin');
await AwesomeNodeAuth.guardRole('editor', '/unauthorized');
```

---

## Auth methods

### Login & register

```javascript
// Login
const result = await AwesomeNodeAuth.login(email, password);
// result.success           → boolean
// result.error             → string | undefined
// result.requires2fa       → boolean (TOTP/SMS challenge required)
// result.tempToken         → string  (2FA flow token)
// result.availableMethods  → string[] (e.g. ['totp', 'sms'])
// result.requires2FASetup  → boolean (first-time 2FA enrollment required)

// Register
await AwesomeNodeAuth.register(email, password, firstName?, lastName?);

// Logout
await AwesomeNodeAuth.logout();
```

### Password management

```javascript
await AwesomeNodeAuth.forgotPassword(email);
await AwesomeNodeAuth.resetPassword(token, newPassword);
await AwesomeNodeAuth.changePassword(currentPassword, newPassword);
await AwesomeNodeAuth.setPassword(newPassword);  // OAuth accounts — no current password needed
```

### Magic link

```javascript
await AwesomeNodeAuth.sendMagicLink(email);
await AwesomeNodeAuth.verifyMagicLink(token);
```

### TOTP two-factor authentication

```javascript
// Enrolment
const { secret, qrCode } = await AwesomeNodeAuth.setup2fa();
await AwesomeNodeAuth.verify2faSetup(code, secret);

// Login challenge (after login returns requires2fa: true)
await AwesomeNodeAuth.validate2fa(tempToken, totpCode);
```

### SMS authentication

```javascript
// SMS-only login
await AwesomeNodeAuth.sendSmsLogin(email);
await AwesomeNodeAuth.verifySmsLogin(userId, code);

// SMS as 2FA step
await AwesomeNodeAuth.validateSms(tempToken, code);
```

### Email verification

```javascript
await AwesomeNodeAuth.resendVerificationEmail();
await AwesomeNodeAuth.verifyEmail(token);
```

### Email change

```javascript
await AwesomeNodeAuth.requestEmailChange(newEmail);
await AwesomeNodeAuth.confirmEmailChange(token);
```

### Account linking

```javascript
await AwesomeNodeAuth.requestLinkingEmail(email, provider);
await AwesomeNodeAuth.verifyLinkingToken(token, provider);
await AwesomeNodeAuth.verifyConflictLinkingToken(token);  // OAuth conflict resolution

const accounts = await AwesomeNodeAuth.getLinkedAccounts();  // → LinkedAccount[]
await AwesomeNodeAuth.unlinkAccount(provider, providerAccountId);
```

### Account deletion

```javascript
await AwesomeNodeAuth.deleteAccount();
```

---

## Framework integration examples

### Vanilla JS / HTML — no build step required

```html
<script src="/auth/ui/assets/auth.js"></script>
<script>
  // Configure once (optional)
  AwesomeNodeAuth.init({ homeUrl: '/dashboard' });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await AwesomeNodeAuth.login(
      document.getElementById('email').value,
      document.getElementById('password').value,
    );
    if (result.success) {
      window.location.href = AwesomeNodeAuth.config.homeUrl;
    } else {
      showError(result.error);
    }
  });
</script>
```

### React (without a build step)

```html
<script src="/auth/ui/assets/auth.js"></script>
<script type="module">
  // AwesomeNodeAuth is available globally — use it from any module
  import { useState } from 'https://esm.sh/react';

  export function useAuth() {
    const [user, setUser] = useState(AwesomeNodeAuth.getUser());

    async function login(email, password) {
      const result = await AwesomeNodeAuth.login(email, password);
      if (result.success) setUser(AwesomeNodeAuth.getUser());
      return result;
    }

    return { user, login, logout: AwesomeNodeAuth.logout.bind(AwesomeNodeAuth) };
  }
</script>
```

### Vue 3 (CDN / no build)

```html
<script src="/auth/ui/assets/auth.js"></script>
<script type="module">
  import { createApp, ref } from 'https://esm.sh/vue';

  createApp({
    setup() {
      const user = ref(AwesomeNodeAuth.getUser());

      async function login(email, password) {
        const result = await AwesomeNodeAuth.login(email, password);
        if (result.success) user.value = AwesomeNodeAuth.getUser();
        return result;
      }

      return { user, login };
    },
  }).mount('#app');
</script>
```

### Next.js / SSR frameworks

Include `auth.js` in your layout and use the global in any client component:

```html
<!-- app/layout.tsx or _app.tsx — add to <head> -->
<Script src="/auth/ui/assets/auth.js" strategy="beforeInteractive" />
```

```javascript
// In a client component
'use client';

await AwesomeNodeAuth.guardPage();          // redirects if not authenticated
const user = AwesomeNodeAuth.getUser();     // user after the last checkSession
```

### SPA with client-side routing (React Router, Vue Router, etc.)

Prevent full-page redirects by providing navigation callbacks via `init()`:

```javascript
AwesomeNodeAuth.init({
  onSessionExpired: () => router.push('/login'),
  onLogout: () => {
    clearApplicationState();
    router.push('/login');
  },
});
```

---

## SSR fast-path (`window.__AUTH_CONFIG__`)

When using `buildUiRouter`, the server injects a `window.__AUTH_CONFIG__` script block into every HTML page before it is sent to the browser. `auth.js` reads this at startup and skips the `/auth/ui/config` fetch — eliminating an extra round-trip and preventing a flash of unstyled content.

This is handled automatically; no action is required.

---

## Headless mode — loading `auth.js` from a remote SPA

When your frontend is a separate SPA (e.g. a Docusaurus wiki, Next.js site, or any bundler-split application) that communicates with a remote auth backend, load `auth.js` once in your page `<head>` and enable **headless mode**:

```html
<!-- Docusaurus / Next.js / any SPA -->
<script src="https://auth.example.com/auth/ui/auth.js" crossorigin="anonymous"></script>
<script>
  if (window.AwesomeNodeAuth) {
    window.AwesomeNodeAuth.init({
      apiPrefix: 'https://auth.example.com/auth',
      headless: true,   // ← prevents window.location redirects
    });
  }
</script>
```

In headless mode:

- **No redirects**: `window.location.href` is never changed. Session expiry, logout, and refresh failure are handled silently (no-op) unless you override them with explicit callbacks.
- **Fetch interceptor active**: Token auto-refresh on 401/403 still works. All components in the SPA share the single `window.AwesomeNodeAuth` refresh singleton — eliminating duplicate concurrent refresh calls that would break token rotation.
- **Selective credentials**: `credentials: 'include'` is added to requests whose origin matches the auth backend's origin (derived from `apiPrefix`). When `apiPrefix` is an absolute URL (cross-domain mode, e.g. `https://auth.example.com/auth`), only requests to `auth.example.com` are affected — calls to LiteLLM, OpenAI, Stripe, or any other domain are left completely untouched. When `apiPrefix` is a relative path (same-domain), all same-origin requests get credentials (as expected).

### How headless mode is activated

There are three activation paths (all idempotent):

| Path | When |
|------|------|
| `AwesomeNodeAuth.init({ headless: true })` | Inline `<script>` block — immediate, before any fetch |
| `window.__AUTH_CONFIG__ = { headless: true, … }` | SSR injection by the server |
| `/auth/ui/config` response has `headless: true` | Dynamic config fetch after `AuthService.init()` |

The server-side complement is `buildUiRouter({ authConfig: { ui: { headless: true } } })`, which:
- Returns 404 for HTML login/register pages (the SPA provides its own auth UI)
- Continues serving `auth.js` and CSS static assets
- Includes `{ headless: true }` in the `/config` JSON response

### Custom lifecycle callbacks

Override individual handlers without losing headless redirect protection:

```javascript
AwesomeNodeAuth.init({
  headless: true,
  onSessionExpired: () => {
    // e.g. show a login modal instead of a full-page redirect
    showLoginModal();
  },
  onRefreshFail: () => {
    // e.g. display a toast notification
    toast.warning('Your session has expired. Please log in again.');
  },
});
```

---

:::note Angular
Angular has a dedicated library (`awesome-node-auth-angular`) with Guards, Interceptors, and a typed `AuthService` — use that instead of `auth.js` for Angular projects.
:::
