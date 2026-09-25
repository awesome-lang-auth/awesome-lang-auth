---
id: in-memory
title: In-Memory User Store for Tests and Prototypes
description: >-
  Run awesome-node-auth with zero infrastructure: an in-memory IUserStore implementation for tests, prototypes and the runnable Express demo.
sidebar_label: In-Memory
---

# In-Memory Store

The in-memory store is ideal for testing, prototyping, and development. It's included in the `examples/` directory.

## Usage

```typescript
import { InMemoryUserStore } from './examples/in-memory-user-store';

const userStore = new InMemoryUserStore();
const auth = new AuthConfigurator(config, userStore);
```

## Example Implementation

```typescript
import { IUserStore, BaseUser } from '@awesome-lang-auth/node';

export class InMemoryUserStore implements IUserStore {
  private users: BaseUser[] = [];
  private nextId = 1;

  async findByEmail(email: string) {
    return this.users.find(u => u.email === email) ?? null;
  }

  async findById(id: string) {
    return this.users.find(u => u.id === id) ?? null;
  }

  async create(data: Partial<BaseUser>): Promise<BaseUser> {
    const user: BaseUser = {
      id: String(this.nextId++),
      email: data.email!,
      ...data,
    };
    this.users.push(user);
    return user;
  }

  async updateRefreshToken(userId: string, token: string | null, expiry: Date | null) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.refreshToken = token;
      user.refreshTokenExpiry = expiry;
    }
  }

  // ... other methods
}
```

## Related

- [Database-agnostic auth with IUserStore](/docs/database) — the interface this store implements
- [SQLite authentication store](/docs/database/sqlite) — the smallest persistent alternative
- [Live Node.js authentication demos](/docs/live-demo) — demos that run on this store
- [Express authentication](/docs/frameworks/express) — the server used in the runnable demo
