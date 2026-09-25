---
id: postgrest
title: Authentication on Top of PostgREST (No Raw SQL)
description: >-
  Keep Postgres behind PostgREST and still run awesome-node-auth: implement IUserStore against the REST API instead of writing raw SQL queries.
sidebar_label: PostgREST
---

# PostgREST Integration

You don't need to write raw SQL to use `node-auth`. Because the library is entirely database-agnostic through the `IUserStore` interface, you can implement your storage layer using RESTful APIs like [PostgREST](https://postgrest.org/) (the engine behind Supabase).

This approach allows you to keep your database tightly secured behind PostgREST's API layer while `node-auth` handles the complex JWT flows, session management, and OAuth integrations.

## IUserStore Implementation

Below is a complete example of how to implement the `IUserStore` interface using the native `fetch` API against a PostgREST server.

```typescript
import { IUserStore, BaseUser } from 'awesome-node-auth';

export class PostgRestUserStore implements IUserStore {
  constructor(
    private readonly apiUrl: string,
    private readonly serviceKey: string // API key with bypass-RLS permissions
  ) {}

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.serviceKey}`,
      'Prefer': 'return=representation'
    };
  }

  // ---- Core CRUD -----------------------------------------------------------

  async findByEmail(email: string): Promise<BaseUser | null> {
    const res = await fetch(`${this.apiUrl}/users?email=eq.${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: this.headers,
    });
    const users = await res.json();
    return users[0] || null;
  }

  async findById(id: string): Promise<BaseUser | null> {
    const res = await fetch(`${this.apiUrl}/users?id=eq.${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: this.headers,
    });
    const users = await res.json();
    return users[0] || null;
  }

  async create(data: Partial<BaseUser>): Promise<BaseUser> {
    const res = await fetch(`${this.apiUrl}/users`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      throw new Error(`Failed to create user: ${await res.text()}`);
    }

    const users = await res.json();
    return users[0];
  }

  // ---- Token field updates ------------------------------------------------

  private async updateField(userId: string, updates: Partial<BaseUser>): Promise<void> {
    const res = await fetch(`${this.apiUrl}/users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      throw new Error(`Failed to update user: ${await res.text()}`);
    }
  }

  async updateRefreshToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    await this.updateField(userId, { refreshToken: token, refreshTokenExpiry: expiry });
  }

  async updateResetToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    await this.updateField(userId, { resetToken: token, resetTokenExpiry: expiry });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.updateField(userId, { password: hashedPassword });
  }

  async updateTotpSecret(userId: string, secret: string | null): Promise<void> {
    await this.updateField(userId, { totpSecret: secret, isTotpEnabled: !!secret });
  }

  async updateMagicLinkToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    await this.updateField(userId, { magicLinkToken: token, magicLinkTokenExpiry: expiry });
  }

  async updateSmsCode(userId: string, code: string | null, expiry: Date | null): Promise<void> {
    await this.updateField(userId, { smsCode: code, smsCodeExpiry: expiry });
  }

  // ---- Optional finders ---------------------------------------------------

  async findByResetToken(token: string): Promise<BaseUser | null> {
    const res = await fetch(`${this.apiUrl}/users?resetToken=eq.${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: this.headers,
    });
    const users = await res.json();
    return users[0] || null;
  }

  async findByMagicLinkToken(token: string): Promise<BaseUser | null> {
    const res = await fetch(`${this.apiUrl}/users?magicLinkToken=eq.${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: this.headers,
    });
    const users = await res.json();
    return users[0] || null;
  }

  async findByProviderAccount(provider: string, providerAccountId: string): Promise<BaseUser | null> {
    const res = await fetch(`${this.apiUrl}/users?loginProvider=eq.${encodeURIComponent(provider)}&providerAccountId=eq.${encodeURIComponent(providerAccountId)}`, {
      method: 'GET',
      headers: this.headers,
    });
    const users = await res.json();
    return users[0] || null;
  }
}
```

## Setup

1. Make sure your PostgREST instance exposes a `users` table or view that matches the `BaseUser` interface.
2. Initialize the store in your application:

```typescript
import { AuthConfigurator } from 'awesome-node-auth';
import { PostgRestUserStore } from './postgrest-user-store';

const userStore = new PostgRestUserStore(
  'http://localhost:3000', // URL to PostgREST
  process.env.POSTGREST_SERVICE_KEY!
);

const auth = new AuthConfigurator(config, userStore);
```

## Related

- [PostgreSQL authentication store](/docs/database/postgresql) — the direct-SQL alternative
- [Authentication on top of PHP-CRUD-API](/docs/database/php-crud-api) — the same pattern for MySQL and SQL Server
- [Database-agnostic auth with IUserStore](/docs/database) — the interface a REST store implements
- [Extending BaseUser and auth interfaces](/docs/advanced/extending-interfaces) — type your REST payloads
