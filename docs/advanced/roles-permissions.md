---
id: roles-permissions
title: Role-Based Access Control (RBAC) in Node.js
description: >-
  Add roles and permissions to awesome-node-auth with IRolesPermissionsStore, optionally scoped per tenant, and guard routes on permission checks.
sidebar_label: Roles & Permissions
---

# Roles & Permissions (RBAC)

`IRolesPermissionsStore` provides role-based access control with optional tenant scoping.

## Interface

```typescript
import { IRolesPermissionsStore } from 'awesome-node-auth';

export class MyRbacStore implements IRolesPermissionsStore {
  async addRoleToUser(userId: string, role: string, tenantId?: string): Promise<void> { /* ... */ }
  async removeRoleFromUser(userId: string, role: string, tenantId?: string): Promise<void> { /* ... */ }
  async getRolesForUser(userId: string, tenantId?: string): Promise<string[]> { /* ... */ }

  async createRole(role: string, permissions?: string[]): Promise<void> { /* ... */ }
  async deleteRole(role: string): Promise<void> { /* ... */ }

  async addPermissionToRole(role: string, permission: string): Promise<void> { /* ... */ }
  async removePermissionFromRole(role: string, permission: string): Promise<void> { /* ... */ }
  async getPermissionsForRole(role: string): Promise<string[]> { /* ... */ }

  async getPermissionsForUser(userId: string, tenantId?: string): Promise<string[]> { /* ... */ }
  async userHasPermission(userId: string, permission: string, tenantId?: string): Promise<boolean> { /* ... */ }
}
```

## Usage

```typescript
// Setup
await rbac.createRole('editor', ['posts:read', 'posts:write']);
await rbac.addRoleToUser(userId, 'editor', 'tenant-acme');

// Protect a route
app.delete('/posts/:id', auth.middleware(), async (req, res) => {
  const allowed = await rbac.userHasPermission(req.user!.sub, 'posts:write');
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  // ... delete post
});
```

## Embed in JWT

```typescript
buildTokenPayload: async (user) => ({
  roles:       await rbac.getRolesForUser(user.id),
  permissions: await rbac.getPermissionsForUser(user.id),
}),
```

Pass `rbacStore` to `auth.router()` to include roles/permissions in `GET /auth/me`.

## Related

- [Multi-tenant authentication](/docs/advanced/multi-tenancy) — scope roles per organisation
- [Custom JWT claims](/docs/advanced/custom-claims) — put roles in the access token
- [Built-in admin panel](/docs/advanced/admin) — assign roles from the dashboard
- [API keys and service tokens](/docs/advanced/api-keys) — apply the same permissions to machines
