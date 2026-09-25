---
id: sqlite
title: SQLite Authentication Store (better-sqlite3)
description: >-
  A production-ready SQLite IUserStore for awesome-node-auth built on better-sqlite3, with the schema, queries and wiring needed to persist users.
sidebar_label: SQLite
---

# SQLite with better-sqlite3

A production-ready SQLite implementation using `better-sqlite3`.

## Install

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

## Setup

```typescript
import Database from 'better-sqlite3';
import { SqliteUserStore } from './examples/sqlite-user-store.example';

const db = new Database('app.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const userStore = new SqliteUserStore(db); // creates `users` table automatically
const auth = new AuthConfigurator(config, userStore);
```

The `SqliteUserStore` from `examples/sqlite-user-store.example.ts` automatically creates the `users` table on first run.

## Schema

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  name TEXT,
  role TEXT DEFAULT 'user',
  loginProvider TEXT DEFAULT 'local',
  providerAccountId TEXT,
  refreshToken TEXT,
  refreshTokenExpiry TEXT,
  resetToken TEXT,
  resetTokenExpiry TEXT,
  totpSecret TEXT,
  isTotpEnabled INTEGER DEFAULT 0,
  magicLinkToken TEXT,
  magicLinkTokenExpiry TEXT,
  smsCode TEXT,
  smsCodeExpiry TEXT,
  isEmailVerified INTEGER DEFAULT 0,
  phoneNumber TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Related

- [Database-agnostic auth with IUserStore](/docs/database) — the interface this store implements
- [PostgreSQL authentication store](/docs/database/postgresql) — when SQLite stops being enough
- [Extending BaseUser and auth interfaces](/docs/advanced/extending-interfaces) — add your own columns safely
- [Session management and token revocation](/docs/advanced/sessions) — persist sessions alongside users
