---
id: react
title: "React Authentication Library: @awesome-lang-auth/react"
description: >-
  @awesome-lang-auth/react brings a provider, hooks and route gates to React: cookie sessions on the web, bearer tokens on React Native, one typed client.
sidebar_label: React
---

# React Integration — `@awesome-lang-auth/react`

:::tip Official React library
**For React apps, use [`@awesome-lang-auth/react`](https://www.npmjs.com/package/@awesome-lang-auth/react)**: one provider, one hook, two route gates, and a small typed client that speaks the awesome-node-auth wire protocol directly. Version **0.1.0** is its first release.
:::

The package depends on none of the backends, only on `react`. It is written for the protocol the family's backends serve: awesome-node-auth, awesome-go-auth, awesome-lambda-auth, and the Python, Rust and Dart ports.

- **Cookie on the web, bearer on React Native.** The transport is picked for you and can be overridden.
- **No global patching.** The served `auth.js` replaces `window.fetch`; this package never does. App calls that need the session go through `client.fetch`.
- **React 18 and 19.** State is read with `useSyncExternalStore`.
- **SSR-safe.** Server renders see `isLoading: true`, and the entry carries `'use client'` for the Next.js App Router.
- **Router-agnostic gates.** `<ProtectedRoute>` and `<AnonymousOnly>` render; you decide how to navigate.

---

## Installation

```bash
npm install @awesome-lang-auth/react
```

Peer dependency: `react` 18 or later (`react-dom` is optional, so React Native works too).

---

## Provider and hooks

Put one `AwesomeAuthProvider` at the root. `apiPrefix` is where the backend mounts its auth router: `/auth` by default, or an absolute URL such as `https://api.example.com/auth` when the backend is on another origin.

```tsx
import { useState } from 'react';
import { AwesomeAuthProvider, ProtectedRoute, AnonymousOnly, useAwesomeAuth } from '@awesome-lang-auth/react';

// One provider at the root; each page picks its gate.
export function App() {
  return (
    <AwesomeAuthProvider options={{ apiPrefix: '/auth' }}>
      {location.pathname === '/login' ? (
        <AnonymousOnly redirectTo="/">
          <LoginForm />
        </AnonymousOnly>
      ) : (
        <ProtectedRoute fallback={<Spinner />} redirectTo="/login">
          <Dashboard />
        </ProtectedRoute>
      )}
    </AwesomeAuthProvider>
  );
}

function LoginForm() {
  const { login } = useAwesomeAuth();
  const [step, setStep] = useState<{ tempToken: string } | null>(null);

  async function onSubmit(email: string, password: string) {
    const r = await login(email, password);
    if (r.requires2fa) setStep({ tempToken: r.tempToken! }); // then client.validate2fa(tempToken, code)
    else if (!r.success) alert(r.error);
  }
  // ...
}

function Dashboard() {
  const { user, logout } = useAwesomeAuth();
  return <button onClick={logout}>Sign out {user?.email}</button>;
}
```

| Export | What it gives you |
|--------|-------------------|
| `AwesomeAuthProvider` | The context. Pass `options` (an `apiPrefix`, a `mode`, a `storage`) or a `client` you created yourself |
| `useAwesomeAuth()` | `user`, `isAuthenticated`, `isLoading`, `error`, the actions `login`, `logout`, `refresh`, `checkSession`, and the `client` |
| `useAuthUser()` | Only the user, or `null`. Type your own claims with `useAuthUser<MyUser>()` |
| `useAuthClient()` | The underlying `AwesomeAuthClient` |
| `ProtectedRoute` | Renders its children for a signed-in user; optional `fallback`, `role`, `forbidden`, `redirectTo`, `onUnauthenticated` |
| `AnonymousOnly` | Renders its children for a signed-out visitor; optional `fallback`, `redirectTo`, `onAuthenticated` |

**The user** is the `GET /me` payload. Its id is `sub`, not `id`.

**Login with a second factor.** When the account has 2FA, `login` resolves to `{ success: true, requires2fa: true, tempToken, availableMethods }` and the user stays signed out. Complete it with `validate2fa(tempToken, code)` (TOTP), `send2faSms` + `validateSms`, or `send2faMagicLink`.

**React Router and Next.js.** Pass `onUnauthenticated={() => navigate('/login', { replace: true })}` to drive your router. With the Next.js App Router you can render the provider from the root layout; Server Components import `hasRole`, `SERVER_SNAPSHOT` and the types from `@awesome-lang-auth/react/server`, which has no client boundary.

---

## The client

`AwesomeAuthClient` is framework-free. Create one yourself to share it with non-React code, then hand it to the provider:

```ts
import { AwesomeAuthClient } from '@awesome-lang-auth/react';

export const auth = new AwesomeAuthClient({ apiPrefix: 'https://api.example.com/auth' });

// Authenticated app calls: credentials attached, one refresh-and-retry on 401/403.
const res = await auth.fetch('https://api.example.com/orders');

auth.on('sessionExpired', () => router.navigate('/login'));
```

```tsx
<AwesomeAuthProvider client={auth}>...</AwesomeAuthProvider>
```

Every action method resolves to `{ success, error?, code? }` (plus its payload) and never rejects on an HTTP error. The client covers sessions, login and registration, passwords, magic link, SMS, TOTP 2FA, email verification and change, account linking and account deletion.

---

## Cookie or bearer

| | `cookie` (web default) | `bearer` (React Native default) |
| --- | --- | --- |
| Tokens | HttpOnly cookies set by the backend | JSON body, kept in a `TokenStorage` |
| Requests | `credentials: 'include'` + `X-CSRF-Token` from the CSRF cookie | `X-Auth-Strategy: bearer` + `Authorization: Bearer` |
| Refresh | `POST /refresh` (cookie) | `POST /refresh` with `{ refreshToken }` |

Credentials, CSRF tokens and bearer tokens are attached **only to requests for the backend's origin**; a `client.fetch` to any other origin goes out untouched. Override the default with `mode`:

```ts
new AwesomeAuthClient({ apiPrefix: 'https://api.example.com/auth', mode: 'bearer', storage });
```

Bearer tokens live in memory by default, so the session ends when the app does. To persist them on React Native, pass a `storage` with `load`, `save` and `clear` (sync or async). On React Native, `apiPrefix` must be an absolute URL.

**Cross-origin setups.**

- **Cookie mode, backend on another site.** The CSRF cookie belongs to the backend host, so the page cannot read it and send it back. Serve both from one parent domain, or disable CSRF.
- **Bearer mode in a browser, backend on another origin.** The CORS preflight must allow the `X-Auth-Strategy` header. awesome-node-auth allows it when you configure `cors.origins`; the awesome-lambda-auth allow-list does not include it at the time of writing, so there use cookie mode from one origin. React Native has no CORS and is unaffected.

---

## Links

- **npm**: [`@awesome-lang-auth/react`](https://www.npmjs.com/package/@awesome-lang-auth/react)
- **GitHub**: [awesome-lang-auth/awesome-react-auth](https://github.com/awesome-lang-auth/awesome-react-auth)

## Related

- [Angular auth library](/docs/frameworks/ng-awesome-node-auth) — the Angular client for the same protocol
- [Browser client (`auth.js`)](/docs/advanced/browser-client) — the served script this package does not patch into `fetch`
- [Bearer token mode for mobile apps](/docs/advanced/bearer-token) — the transport React Native uses
- [Framework integrations](/docs/frameworks) — every supported backend and client
