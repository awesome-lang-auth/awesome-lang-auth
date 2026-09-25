---
id: multi-tenancy
title: Multi-Tenant Authentication for SaaS Apps
description: >-
  Serve many organisations from one auth backend: ITenantStore adds tenant records, memberships and tenant-scoped roles to awesome-node-auth.
sidebar_label: Multi-Tenancy
---

# Multi-Tenancy

`ITenantStore` provides multi-tenant support for applications that serve multiple organizations.

## Interface

```typescript
import { ITenantStore, Tenant } from '@awesome-lang-auth/node';

export class MyTenantStore implements ITenantStore {
  async createTenant(data: Omit<Tenant, 'id'>): Promise<Tenant> { /* ... */ }
  async getTenantById(id: string): Promise<Tenant | null> { /* ... */ }
  async getAllTenants(): Promise<Tenant[]> { /* ... */ }
  async updateTenant(id: string, data: Partial<Omit<Tenant, 'id'>>): Promise<void> { /* ... */ }
  async deleteTenant(id: string): Promise<void> { /* ... */ }

  async associateUserWithTenant(userId: string, tenantId: string): Promise<void> { /* ... */ }
  async disassociateUserFromTenant(userId: string, tenantId: string): Promise<void> { /* ... */ }
  async getTenantsForUser(userId: string): Promise<Tenant[]> { /* ... */ }
  async getUsersForTenant(tenantId: string): Promise<string[]> { /* ... */ }
}
```

## Tenant Model

```typescript
interface Tenant {
  id:        string;
  name:      string;
  isActive?: boolean;
  config?:   Record<string, unknown>;
  createdAt?: Date;
}
```

## Usage

```typescript
// Onboarding
const tenant = await tenants.createTenant({ name: 'Acme Corp', isActive: true });
await tenants.associateUserWithTenant(userId, tenant.id);

// Embed tenants in JWT
buildTokenPayload: async (user) => ({
  tenants: (await tenants.getTenantsForUser(user.id)).map(t => t.id),
}),
```

## Related

- [Role-based access control (RBAC)](/docs/advanced/roles-permissions) — tenant-scoped roles and permissions
- [Custom JWT claims](/docs/advanced/custom-claims) — carry the tenant id inside the token
- [Built-in admin panel](/docs/advanced/admin) — manage tenants and memberships
- [Extending BaseUser and auth interfaces](/docs/advanced/extending-interfaces) — add fields to BaseTenant
