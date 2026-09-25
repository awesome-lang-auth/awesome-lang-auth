---
id: intro
title: Node.js Authentication Quickstart
description: >-
  Add JWT authentication to any Node.js app in minutes: install awesome-node-auth, mount the auth router, choose a store and pick an auth recipe.
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Getting Started with awesome-node-auth

**node-auth** is a production-ready, database-agnostic JWT authentication and communication bus for Node.js written in TypeScript. It establishes a 360-degree communication and access control layer compatible with any Node.js framework (NestJS, Next.js, Express, Fastify, etc.) and any database through a simple interface pattern.

:::note Before you start
Make sure you have **Node.js 18+** and a package manager (npm / yarn / pnpm) installed.
:::

## Pick a recipe

Choose the authentication strategy that fits your application. You can combine multiple recipes.

| Recipe | Description |
|--------|-------------|
| [Email / Password](/docs/authentication/local) | Classic login with bcrypt hashing |
| [OAuth / Social](/docs/authentication/oauth) | Google, GitHub, custom providers |
| [Magic Link](/docs/authentication/magic-link) | Passwordless email login |
| [SMS OTP](/docs/authentication/sms) | Phone number verification |
| [TOTP 2FA](/docs/authentication/totp) | Google Authenticator-compatible |
| [API Keys](/docs/advanced/api-keys) | Machine-to-machine service tokens |
| [Multi-Tenancy](/docs/advanced/multi-tenancy) | Isolated tenant support |
| [Auth Tools & SSE](/docs/advanced/auth-tools) | Event bus, SSE streams, webhooks, telemetry |
| [Dynamic Email Templates & i18n](/docs/advanced/mailer#dynamic-templates-with-itemplatestore) | Custom email templates with per-language translations via `ITemplateStore` |
| [UI Internationalization (i18n)](/docs/advanced/built-in-ui#internationalization-i18n) | Translate built-in UI pages via `data-i18n` + `ITemplateStore` |

---

## **Step 1**: Install

```bash
npm install @awesome-lang-auth/node
```

---

## **Step 2**: Implement IUserStore

node-auth is database-agnostic. You connect it to your database by implementing the `IUserStore` interface:

```typescript
import { IUserStore, BaseUser } from '@awesome-lang-auth/node';

export class MyUserStore implements IUserStore {
  async findByEmail(email: string): Promise<BaseUser | null> {
    return db.users.findOne({ email });
  }
  async findById(id: string): Promise<BaseUser | null> {
    return db.users.findOne({ id });
  }
  async create(data: Partial<BaseUser>): Promise<BaseUser> {
    return db.users.insert(data);
  }
  async updateRefreshToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    await db.users.update({ id: userId }, { refreshToken: token, refreshTokenExpiry: expiry });
  }
  async updateLastLogin(userId: string): Promise<void> {
    await db.users.update({ id: userId }, { lastLogin: new Date() });
  }
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await db.users.update({ id: userId }, { password: hashedPassword });
  }
  async updateResetToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    await db.users.update({ id: userId }, { resetToken: token, resetTokenExpiry: expiry });
  }
  // ... implement other methods (2FA, Magic Link, SMS, etc.) as needed
}
```

:::tip
See [Database Integration](/docs/database) for ready-to-use implementations for SQLite, PostgreSQL, MySQL, and MongoDB.
:::

---

## **Step 3**: Configure AuthConfigurator

<Tabs>
  <TabItem value="express" label="Express" default>

```typescript
import express from 'express';
import { AuthConfigurator } from '@awesome-lang-auth/node';
import { MyUserStore } from './my-user-store';

const app = express();
app.use(express.json());

const auth = new AuthConfigurator(
  {
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
  },
  new MyUserStore()
);
```

  </TabItem>
  <TabItem value="nestjs" label="NestJS">

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { AuthConfigurator } from '@awesome-lang-auth/node';
import { MyUserStore } from './my-user-store';

const auth = new AuthConfigurator(
  {
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
  },
  new MyUserStore()
);

@Module({
  providers: [{ provide: 'AUTH', useValue: auth }],
  exports: ['AUTH'],
})
export class AuthModule {}
```

  </TabItem>
  <TabItem value="nextjs" label="Next.js">

```typescript
// lib/auth.ts
import { AuthConfigurator } from '@awesome-lang-auth/node';
import { MyUserStore } from './my-user-store';

export const auth = new AuthConfigurator(
  {
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
  },
  new MyUserStore()
);
```

  </TabItem>
</Tabs>

---

## **Step 4**: Mount the router

<Tabs>
  <TabItem value="express" label="Express" default>

```typescript
// Mount all auth endpoints under /auth
app.use('/auth', auth.router());

// Protect routes
app.get('/protected', auth.middleware(), (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000);
```

  </TabItem>
  <TabItem value="nestjs" label="NestJS">

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { auth } from './auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/auth', auth.router());
  await app.listen(3000);
}
bootstrap();
```

  </TabItem>
  <TabItem value="nextjs" label="Next.js App Router">

```typescript
// See the Next.js integration guide for the full catch-all route handler
// that bridges the App Router request/response to the Express-compatible router.
// https://your-wiki/docs/frameworks/nextjs
import { getAuth } from '@/lib/auth';

// Use auth.router() inside a catch-all API route handler.
// The auth singleton is created in lib/auth.ts:
//   export const auth = new AuthConfigurator(config, userStore);
```

  </TabItem>
</Tabs>

---

## Next Steps

- [Installation & Configuration](/docs/installation) – Full config options, CSRF, 2FA
- [Authentication Strategies](/docs/authentication) – All available recipes
- [Database Integration](/docs/database) – IUserStore implementations
- [API Reference](/docs/api-reference) – All endpoints
