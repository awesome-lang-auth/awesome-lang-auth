---
id: user-metadata
title: User Metadata Without Schema Changes
description: >-
  Attach arbitrary key/value data to users through IUserMetadataStore, without touching BaseUser or adding columns to your users table.
sidebar_label: User Metadata
---

# User Metadata

`IUserMetadataStore` attaches arbitrary key/value metadata to users without changing `BaseUser` or your users table.

## Interface

```typescript
import { IUserMetadataStore } from 'awesome-node-auth';

export class MyUserMetadataStore implements IUserMetadataStore {
  async getMetadata(userId: string): Promise<Record<string, unknown>> {
    const row = await db('user_metadata').where({ userId }).first();
    return row ? JSON.parse(row.data) : {};
  }

  async updateMetadata(userId: string, metadata: Record<string, unknown>): Promise<void> {
    const existing = await this.getMetadata(userId);
    const merged = { ...existing, ...metadata };
    await db('user_metadata')
      .insert({ userId, data: JSON.stringify(merged) })
      .onConflict('userId').merge();
  }

  async clearMetadata(userId: string): Promise<void> {
    await db('user_metadata').where({ userId }).delete();
  }
}
```

## Usage

```typescript
const metaStore = new MyUserMetadataStore();

// Store preferences after login
await metaStore.updateMetadata(userId, { theme: 'dark', lang: 'it' });

// Read them back
const meta = await metaStore.getMetadata(userId);
console.log(meta.theme); // 'dark'
```

Pass `metadataStore` to `auth.router()` to include metadata in `GET /auth/me`.

## Related

- [Extending BaseUser and auth interfaces](/docs/advanced/extending-interfaces) — the typed alternative
- [Custom JWT claims](/docs/advanced/custom-claims) — expose metadata in the access token
- [Database-agnostic auth with IUserStore](/docs/database) — where metadata is persisted
- [Built-in admin panel](/docs/advanced/admin) — view and edit metadata per user
