---
id: account-deletion
title: Self-Service Account Deletion (GDPR)
description: >-
  Let users delete their own account with DELETE /auth/account: session cleanup, tenant membership removal and the hooks to erase related data.
sidebar_label: Account Deletion
---

# Account Deletion

Authenticated users can permanently delete their own account using `DELETE /auth/account`. The library clears the user's session and optionally removes tenant memberships if an `ITenantStore` is provided.

---

## Account deletion flow

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (authenticated)
    participant S as awesome-node-auth Router
    participant DB as IUserStore
    participant TS as ITenantStore (optional)
    participant SS as ISessionStore (optional)

    C->>S: DELETE /auth/account (accessToken cookie)
    S->>S: verifyAccessToken → get userId
    opt ITenantStore provided
        S->>TS: getTenantsForUser(userId)
        TS-->>S: [tenant1, tenant2]
        S->>TS: disassociateUserFromTenant(userId, tenant1)
        S->>TS: disassociateUserFromTenant(userId, tenant2)
    end
    opt ISessionStore provided
        S->>SS: revokeAllSessionsForUser(userId)
    end
    S->>DB: updateRefreshToken(userId, null, null)
    S->>S: clear cookies
    S-->>C: 200 {success: true} + cleared cookies

    Note over C,S: Your app must also delete the user record<br/>from IUserStore (e.g. in a post-hook or middleware)
```

:::caution User record deletion
`DELETE /auth/account` revokes sessions and disassociates tenants, but **does not call `IUserStore.delete`** — that method is not part of the interface. Add a post-hook or route middleware to delete the user record from your database after the endpoint responds.
:::

---

## Usage

Mount the standard auth router — the endpoint is always available:

```typescript
app.use('/auth', auth.router());
```

### With tenant cleanup

Pass `tenantStore` to also remove the user from all their tenants:

```typescript
app.use('/auth', auth.router({ tenantStore }));
```

### Client-side

```typescript
// Cookie mode
await fetch('/auth/account', {
  method: 'DELETE',
  credentials: 'include',
});

// Bearer mode
await fetch('/auth/account', {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

---

## Endpoint

| Method | Path | Auth | Description |
|--------|------|:---:|-------------|
| `DELETE` | `/auth/account` | ✅ | Revoke session + optional tenant cleanup |

### Post-deletion hook example (Express)

```typescript
// Middleware that deletes the user record after /auth/account responds
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (req.method === 'DELETE' && req.path === '/account' && (body as any)?.success) {
      const userId = (req as any).user?.sub;
      if (userId) userStore.deleteUser(userId).catch(console.error);
    }
    return originalJson(body);
  };
  next();
});
```

## Related

- [Change email flow](/docs/advanced/change-email) — the other self-service account operation
- [Multi-tenant authentication](/docs/advanced/multi-tenancy) — memberships removed on deletion
- [Session management and token revocation](/docs/advanced/sessions) — clearing sessions on delete
- [Auth API endpoints reference](/docs/api-reference/endpoints) — the DELETE /auth/account route
