---
id: mongodb
title: MongoDB Authentication Store for Node.js
description: >-
  Use MongoDB as the user store for awesome-node-auth: collection layout, indexes and a full IUserStore implementation on the official driver.
sidebar_label: MongoDB
---

# MongoDB

## Install

```bash
npm install mongodb
```

## Setup

```typescript
import { MongoClient } from 'mongodb';
import { MongoDbUserStore } from './examples/mongodb-user-store.example';

const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();

const userStore = new MongoDbUserStore(client.db('myapp'));
await userStore.init(); // creates indexes automatically
const auth = new AuthConfigurator(config, userStore);
```

## Collection Schema

```typescript
interface UserDocument {
  _id: string;         // same as BaseUser.id
  email: string;
  password?: string;
  name?: string;
  role: string;
  loginProvider: string;
  providerAccountId?: string;
  refreshToken?: string | null;
  refreshTokenExpiry?: Date | null;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
  totpSecret?: string | null;
  isTotpEnabled: boolean;
  magicLinkToken?: string | null;
  magicLinkTokenExpiry?: Date | null;
  smsCode?: string | null;
  smsCodeExpiry?: Date | null;
  isEmailVerified: boolean;
  phoneNumber?: string;
  createdAt: Date;
}
```

## Indexes

The `init()` method creates:
- Unique index on `email`
- Index on `refreshToken`
- Index on `resetToken`
- Index on `magicLinkToken`

## Related

- [Database-agnostic auth with IUserStore](/docs/database) — the interface this store implements
- [PostgreSQL authentication store](/docs/database/postgresql) — the SQL counterpart of this adapter
- [User metadata without schema changes](/docs/advanced/user-metadata) — store extra fields per user
- [Extending BaseUser and auth interfaces](/docs/advanced/extending-interfaces) — type-safe custom documents
