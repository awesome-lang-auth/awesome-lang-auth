---
id: mysql
title: MySQL and MariaDB Authentication Store (mysql2)
description: >-
  Store awesome-node-auth users in MySQL or MariaDB with mysql2: table schema, connection pooling and a complete IUserStore implementation.
sidebar_label: MySQL / MariaDB
---

# MySQL / MariaDB with mysql2

## Install

```bash
npm install mysql2
```

## Setup

```typescript
import mysql from 'mysql2/promise';
import { MySqlUserStore } from './examples/mysql-user-store.example';

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const userStore = new MySqlUserStore(pool);
await userStore.init(); // creates the `users` table automatically
const auth = new AuthConfigurator(config, userStore);
```

## Schema

```sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  loginProvider VARCHAR(50) DEFAULT 'local',
  providerAccountId VARCHAR(255),
  refreshToken TEXT,
  refreshTokenExpiry DATETIME,
  resetToken VARCHAR(255),
  resetTokenExpiry DATETIME,
  totpSecret VARCHAR(255),
  isTotpEnabled TINYINT(1) DEFAULT 0,
  magicLinkToken VARCHAR(255),
  magicLinkTokenExpiry DATETIME,
  smsCode VARCHAR(10),
  smsCodeExpiry DATETIME,
  isEmailVerified TINYINT(1) DEFAULT 0,
  phoneNumber VARCHAR(20),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Related

- [Database-agnostic auth with IUserStore](/docs/database) — the interface this store implements
- [PostgreSQL authentication store](/docs/database/postgresql) — the other SQL adapter
- [Authentication on top of PHP-CRUD-API](/docs/database/php-crud-api) — reach MySQL over REST instead of SQL
- [Extending BaseUser and auth interfaces](/docs/advanced/extending-interfaces) — add your own columns safely
