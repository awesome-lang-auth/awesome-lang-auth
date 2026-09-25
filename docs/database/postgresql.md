---
id: postgresql
title: PostgreSQL Authentication Store (node-postgres)
description: >-
  Store awesome-node-auth users in PostgreSQL with the pg driver: table schema, parameterised queries and a complete IUserStore implementation.
sidebar_label: PostgreSQL
---

# PostgreSQL with pg

## Install

```bash
npm install pg
npm install -D @types/pg
```

## Setup

```typescript
import { Pool } from 'pg';
import { IUserStore, BaseUser } from 'awesome-node-auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export class PgUserStore implements IUserStore {
  async findByEmail(email: string): Promise<BaseUser | null> {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<BaseUser | null> {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  }

  async create(data: Partial<BaseUser>): Promise<BaseUser> {
    const { rows } = await pool.query(
      `INSERT INTO users (id, email, password, name, role, login_provider)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [crypto.randomUUID(), data.email, data.password, data.name, data.role ?? 'user', data.loginProvider ?? 'local']
    );
    return rows[0];
  }

  async updateRefreshToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    await pool.query(
      'UPDATE users SET refresh_token = $1, refresh_token_expiry = $2 WHERE id = $3',
      [token, expiry, userId]
    );
  }

  // ... implement remaining methods
}
```

## Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  login_provider VARCHAR(50) DEFAULT 'local',
  provider_account_id VARCHAR(255),
  refresh_token TEXT,
  refresh_token_expiry TIMESTAMPTZ,
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMPTZ,
  totp_secret VARCHAR(255),
  is_totp_enabled BOOLEAN DEFAULT false,
  magic_link_token VARCHAR(255),
  magic_link_token_expiry TIMESTAMPTZ,
  sms_code VARCHAR(10),
  sms_code_expiry TIMESTAMPTZ,
  is_email_verified BOOLEAN DEFAULT false,
  phone_number VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Related

- [Database-agnostic auth with IUserStore](/docs/database) — the interface this store implements
- [Authentication on top of PostgREST](/docs/database/postgrest) — same database, no raw SQL
- [MySQL and MariaDB authentication store](/docs/database/mysql) — the other SQL adapter
- [Session management and token revocation](/docs/advanced/sessions) — persist sessions alongside users
