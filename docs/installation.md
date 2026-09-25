---
id: installation
title: Install awesome-node-auth in a Node.js App
description: >-
  Install awesome-node-auth from npm and configure JWT secrets, cookies, CORS, mailer and the user store before mounting the auth router in your app.
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Installation & Configuration

## **Step 1**: Install the package

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm install awesome-node-auth
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn add awesome-node-auth
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm add awesome-node-auth
```

  </TabItem>
</Tabs>

:::info TypeScript
node-auth is written in TypeScript and ships with its own type declarations — no `@types/` package needed.
:::

---

## **Step 2**: Configure AuthConfigurator

Create an `AuthConfig` object and pass it to `AuthConfigurator` along with your `IUserStore` implementation:

```typescript
import { AuthConfigurator, AuthConfig } from 'awesome-node-auth';
import { MyUserStore } from './my-user-store';

const config: AuthConfig = {
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
};

const auth = new AuthConfigurator(config, new MyUserStore());
```

### AuthConfig Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `accessTokenSecret` | `string` | ✅ | — | Secret for signing access tokens |
| `refreshTokenSecret` | `string` | ✅ | — | Secret for signing refresh tokens |
| `accessTokenExpiresIn` | `string` | ❌ | `'15m'` | Access token TTL (e.g. `'15m'`) |
| `refreshTokenExpiresIn` | `string` | ❌ | `'7d'` | Refresh token TTL (e.g. `'7d'`) |
| `buildTokenPayload` | `(user) => object` | ❌ | — | Inject custom claims into JWT |
| `csrf.enabled` | `boolean` | ❌ | `false` | Enable CSRF double-submit cookie |
| `emailVerificationMode`| `'none'\|'lazy'\|'strict'` | ❌ | `'none'` | Email verification enforcement mode |
| `requireEmailVerification`| `boolean` | ❌ | `false` | (Deprecated) Use `emailVerificationMode` instead |

---

## **Step 3**: Mount the router

```typescript
import express from 'express';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

app.use('/auth', auth.router({
  rateLimiter: limiter,
  onRegister: async (data, config) => {
    return userStore.create(data);
  },
}));

app.listen(3000);
```

---

## Complete Configuration Example

```typescript
import express from 'express';
import rateLimit from 'express-rate-limit';
import { AuthConfigurator, AuthConfig } from 'awesome-node-auth';
import { MyUserStore } from './stores/user-store';
import { MySessionStore } from './stores/session-store';
import { MyRbacStore } from './stores/rbac-store';

const app = express();
app.use(express.json());

const config: AuthConfig = {
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  emailVerificationMode: 'lazy',
  csrf: { enabled: true },
  buildTokenPayload: async (user) => ({
    tenantId: user.tenantId,
    plan: user.plan,
  }),
};

const userStore = new MyUserStore();
const sessionStore = new MySessionStore();
const rbacStore = new MyRbacStore();

const auth = new AuthConfigurator(config, userStore);

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

app.use('/auth', auth.router({
  rateLimiter: limiter,
  sessionStore,
  rbacStore,
  onRegister: async (data, config) => {
    return userStore.create(data);
  },
}));

app.listen(3000);
```

## Related

- [Node.js authentication quickstart](/docs/intro) — the shortest path from install to a working login
- [Authentication methods for Node.js](/docs/authentication) — pick email/password, OAuth2, magic link, TOTP or SMS
- [Database-agnostic auth with IUserStore](/docs/database) — wire the library to your own database
- [Framework integrations](/docs/frameworks) — Express, NestJS, Next.js and any other Node HTTP server
- [Auth API endpoints reference](/docs/api-reference/endpoints) — every route the auth router mounts
