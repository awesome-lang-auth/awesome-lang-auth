---
id: extending-interfaces
title: Extending BaseUser and Auth Interfaces in TypeScript
description: >-
  Add your own fields to BaseUser, BaseTenant and Session while keeping full TypeScript type safety across stores, callbacks and JWT payloads.
sidebar_label: Extending Interfaces
---

# Extending awesome-node-auth interfaces

This guide explains how to extend the base interfaces provided by `awesome-node-auth` (like `BaseUser`, `BaseTenant`, or `Session`) to include your application's custom fields while maintaining full type-safety and library compatibility.

## The Challenge

Libraries often define "closed" models to ensure internal consistency. However, every application has unique requirements—such as adding a `priviledge` bitmask or `lastLogin` timestamp to the user entity.

In TypeScript, simply extending the class or interface in your code is often not enough if the library's internal functions still expect the original, limited type.

## The Solution: Module Augmentation

TypeScript allows **Declaration Merging**, which lets you "inject" new properties into existing interfaces defined in external modules without modifying the original source code.

### 1. Create a Declaration File

Create a file named `node-auth.d.ts` (the name doesn't matter, but the `.d.ts` extension does) in your source directory (e.g., `src/types/`).

```typescript
import '@awesome-lang-auth/node';

declare module '@awesome-lang-auth/node' {
  // Augment the BaseUser interface
  interface BaseUser {
    priviledge?: number;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    customMetadata?: Record<string, any>;
  }

  // You can also augment other models
  interface BaseTenant {
    planType?: 'free' | 'pro' | 'enterprise';
  }
}
```

### 2. Why this is a Best Practice

- **IDE Support**: Your IDE (VS Code, etc.) will immediately show the new fields in autocompletion when working with `BaseUser`.
- **No Type Casting**: You no longer need to use `(user as any).myField`.
- **Library Compatibility**: Any function in `node-auth` that returns or accepts a `BaseUser` will now correctly recognize your custom fields.
- **Single Source of Truth**: You maintain a single `User` entity that traces directly back to the library's foundations.

## Implementation in Stores

When implementing a custom store (e.g., `SqliteUserStore`), you should define a local `User` interface that extends the augmented `BaseUser`:

```typescript
import { BaseUser, IUserStore } from '@awesome-lang-auth/node';

export interface User extends BaseUser {
  // The fields from .d.ts are automatically inherited here
}

export class MyUserStore implements IUserStore {
  async findById(id: string): Promise<User | null> {
    const row = await db.get('SELECT * FROM users WHERE id = ?', id);
    return this.mapRowToUser(row);
  }

  private mapRowToUser(row: any): User {
    return {
      ...row,
      // Map snake_case DB columns to camelCase properties
      firstName: row.first_name,
      priviledge: row.priviledge, // Now type-safe!
    };
  }
}
```

## Summary for the Wiki

Module Augmentation is the standard TypeScript way to extend a library's domain model. It keeps your codebase clean, avoids any hacks, and ensures that your custom database schema and your code's type definitions stay perfectly in sync.

## Related

- [Database-agnostic auth with IUserStore](/docs/database) — the interfaces you implement
- [User metadata without schema changes](/docs/advanced/user-metadata) — extra fields without extending types
- [Custom JWT claims](/docs/advanced/custom-claims) — surface your custom fields in the token
- [Multi-tenant authentication](/docs/advanced/multi-tenancy) — extending BaseTenant
