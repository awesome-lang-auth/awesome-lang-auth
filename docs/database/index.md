---
id: database
title: "Database-Agnostic Auth: The IUserStore Interface"
description: >-
  awesome-node-auth stores nothing itself: implement IUserStore for SQL, NoSQL or a REST API and pass it to AuthConfigurator to use any database.
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Database Integration

node-auth is completely **database-agnostic**. Implement the `IUserStore` interface for your database and pass the instance to `AuthConfigurator`.

:::info Any database
As long as you implement `IUserStore`, awesome-node-auth works with any storage backend — SQL, NoSQL, or even in-memory for tests.
:::

## IUserStore Interface

```typescript
import { IUserStore, BaseUser } from '@awesome-lang-auth/node';

export class MyUserStore implements IUserStore {
  // Core CRUD
  async findByEmail(email: string): Promise<BaseUser | null> { /* ... */ }
  async findById(id: string): Promise<BaseUser | null> { /* ... */ }
  async create(data: Partial<BaseUser>): Promise<BaseUser> { /* ... */ }

  // Token field updates
  async updateRefreshToken(userId: string, token: string | null, expiry: Date | null): Promise<void> { /* ... */ }
  async updateLastLogin(userId: string): Promise<void> { /* ... */ }
  async updateResetToken(userId: string, token: string | null, expiry: Date | null): Promise<void> { /* ... */ }
  async updatePassword(userId: string, hashedPassword: string): Promise<void> { /* ... */ }
  async updateTotpSecret(userId: string, secret: string | null): Promise<void> { /* ... */ }
  async updateMagicLinkToken(userId: string, token: string | null, expiry: Date | null): Promise<void> { /* ... */ }
  async updateSmsCode(userId: string, code: string | null, expiry: Date | null): Promise<void> { /* ... */ }

  // Important optional methods
  async findByResetToken(token: string): Promise<BaseUser | null> { /* ... */ }
  async findByMagicLinkToken(token: string): Promise<BaseUser | null> { /* ... */ }
  async findByProviderAccount(provider: string, providerAccountId: string): Promise<BaseUser | null> { /* ... */ }
  async updateProfile(userId: string, data: { firstName?: string | null; lastName?: string | null }): Promise<void> { /* ... */ }
}
```

## Required Methods by Feature

| Method | Required For |
|--------|-------------|
| `findByEmail` | Login, magic link, password reset |
| `findById` | Token refresh, 2FA, SMS |
| `create` | OAuth strategies, registration |
| `updateRefreshToken` | Login, logout, refresh |
| `updateResetToken` | Password reset flow |
| `updatePassword` | Change/reset password |
| `updateTotpSecret` | TOTP setup |
| `updateMagicLinkToken` | Magic link flow |
| `updateSmsCode` | SMS OTP flow |
| `findByResetToken` | `POST /auth/reset-password` |
| `findByMagicLinkToken` | `POST /auth/magic-link/verify` |
| `findByProviderAccount` | OAuth (recommended) |

## BaseUser

```typescript
interface BaseUser {
  id: string;
  email: string;
  password?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
  loginProvider?: string | null;
  providerAccountId?: string | null;
  refreshToken?: string | null;
  refreshTokenExpiry?: Date | null;
  lastLogin?: Date | null;
  // ... other fields for 2FA, Magic Link, SMS
}
```

## Available Implementations

<Tabs>
  <TabItem value="memory" label="In-Memory" default>

Perfect for testing and prototyping. No setup required.

[View docs →](/docs/database/in-memory)

  </TabItem>
  <TabItem value="sqlite" label="SQLite">

Uses `better-sqlite3`. Great for small apps and local development.

[View docs →](/docs/database/sqlite)

  </TabItem>
  <TabItem value="mysql" label="MySQL">

Uses `mysql2`. Production-ready relational database.

[View docs →](/docs/database/mysql)

  </TabItem>
  <TabItem value="mongodb" label="MongoDB">

Uses the `mongodb` driver. Flexible document storage.

[View docs →](/docs/database/mongodb)

  </TabItem>
  <TabItem value="postgresql" label="PostgreSQL">

Uses `pg`. Robust SQL with full ACID compliance.

[View docs →](/docs/database/postgresql)

  </TabItem>
  <TabItem value="postgrest" label="PostgREST">

Use `fetch` to talk to a REST API. Write no SQL.

[View docs →](/docs/database/postgrest)

  </TabItem>
  <TabItem value="php-crud-api" label="PHP-CRUD-API">

Use `fetch` to talk to a REST API. Write no SQL.

[View docs →](/docs/database/php-crud-api)

  </TabItem>
</Tabs>
