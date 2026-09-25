---
id: php-crud-api
title: Authentication on Top of PHP-CRUD-API
description: >-
  Put awesome-node-auth in front of PHP-CRUD-API: a zero-config REST layer over MySQL, PostgreSQL or SQL Server used as the IUserStore backend.
sidebar_label: PHP-CRUD-API
---

# PHP-CRUD-API Integration

Just like PostgREST, you don't need to write raw SQL to use `node-auth`. The `IUserStore` interface allows you to implement your storage layer using RESTful APIs like [PHP-CRUD-API](https://github.com/mevdschee/php-crud-api).

This approach allows you to deploy a lightweight, zero-configuration API layer over your MySQL, PostgreSQL, or SQL Server database, while `node-auth` handles the complex authentication, cryptography, and OAuth integrations.

## IUserStore Implementation

Below is a complete example of how to implement the `IUserStore` interface using the native `fetch` API against a PHP-CRUD-API backend.

> **Note:** PHP-CRUD-API uses a query parameter format like `?filter=field,eq,value` for filtering and returns the actual record in the body. Ensure your table structure matches `BaseUser`.

```typescript
import { IUserStore, BaseUser } from 'awesome-node-auth';

export class PhpCrudApiUserStore implements IUserStore {
  constructor(
    private readonly apiUrl: string, // e.g., 'http://localhost/api.php/records/'
  ) {}

  private get headers() {
    return {
      'Content-Type': 'application/json',
      // 'X-API-Key': 'your-secret-key-if-configured'
    };
  }

  // ---- Core CRUD -----------------------------------------------------------

  async findByEmail(email: string): Promise<BaseUser | null> {
    const res = await fetch(`${this.apiUrl}users?filter=email,eq,${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: this.headers,
    });
    const data = await res.json();
    return data.records?.[0] || null;
  }

  async findById(id: string): Promise<BaseUser | null> {
    const res = await fetch(`${this.apiUrl}users/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: this.headers,
    });
    
    if (res.status === 404) return null;
    return await res.json();
  }

  async create(data: Partial<BaseUser>): Promise<BaseUser> {
    const res = await fetch(`${this.apiUrl}users`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      throw new Error(`Failed to create user: ${await res.text()}`);
    }

    // PHP-CRUD-API returns the ID of the new record (usually an integer, depending on your DB)
    const newId = await res.json();
    
    // Fetch the complete created user to satisfy the interface
    const createdUserRes = await fetch(`${this.apiUrl}users/${newId}`, {
      method: 'GET',
      headers: this.headers
    });
    return await createdUserRes.json();
  }

  // ---- Token field updates ------------------------------------------------

  private async updateField(userId: string, updates: Partial<BaseUser>): Promise<void> {
    const res = await fetch(`${this.apiUrl}users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
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
    const res = await fetch(`${this.apiUrl}users?filter=resetToken,eq,${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: this.headers,
    });
    const data = await res.json();
    return data.records?.[0] || null;
  }

  async findByMagicLinkToken(token: string): Promise<BaseUser | null> {
    const res = await fetch(`${this.apiUrl}users?filter=magicLinkToken,eq,${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: this.headers,
    });
    const data = await res.json();
    return data.records?.[0] || null;
  }

  async findByProviderAccount(provider: string, providerAccountId: string): Promise<BaseUser | null> {
    const res = await fetch(`${this.apiUrl}users?filter=loginProvider,eq,${encodeURIComponent(provider)}&filter=providerAccountId,eq,${encodeURIComponent(providerAccountId)}`, {
      method: 'GET',
      headers: this.headers,
    });
    const data = await res.json();
    return data.records?.[0] || null;
  }
}
```

## Setup

1. Make sure your PHP-CRUD-API backend is running and exposes a `users` table that matches the `BaseUser` properties.
2. Initialize the store in your Node.js application:

```typescript
import { AuthConfigurator } from 'awesome-node-auth';
import { PhpCrudApiUserStore } from './php-crud-api-user-store';

const userStore = new PhpCrudApiUserStore(
  'http://localhost:8080/api.php/records/'
);

const auth = new AuthConfigurator(config, userStore);
```

## Related

- [Authentication on top of PostgREST](/docs/database/postgrest) — the same pattern for PostgreSQL
- [MySQL and MariaDB authentication store](/docs/database/mysql) — talk to MySQL directly instead
- [Database-agnostic auth with IUserStore](/docs/database) — the interface a REST store implements
- [Extending BaseUser and auth interfaces](/docs/advanced/extending-interfaces) — type your REST payloads
