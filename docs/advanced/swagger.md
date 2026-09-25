---
id: swagger
title: Swagger UI and OpenAPI 3.0 Spec for Auth
description: >-
  awesome-node-auth ships an OpenAPI 3.0 spec for the auth, admin and tools routers, served through Swagger UI and enabled outside production.
sidebar_label: Swagger / OpenAPI
---

# Swagger / OpenAPI

node-auth ships a built-in OpenAPI 3.0 spec covering every endpoint on the auth router, admin router, and tools router. Swagger UI is served automatically and enabled by default outside production.

---

## Auth router — Swagger UI

Mount the auth router and the spec is available at:

```
GET /auth/docs         — Swagger UI
GET /auth/openapi.json — raw OpenAPI 3.0 spec
```

Enable/disable explicitly:

```typescript
const auth = new AuthConfigurator(config, userStore);
app.use('/auth', auth.router());
// swagger is auto-enabled when NODE_ENV !== 'production'
```

---

## Tools router — Swagger UI

```typescript
import { createToolsRouter } from '@awesome-lang-auth/node';

app.use('/tools', createToolsRouter(tools, {
  swagger: 'auto',         // default — enabled outside production
  swaggerBasePath: '/tools',
}));
```

Endpoints:

```
GET /tools/docs         — Swagger UI
GET /tools/openapi.json — raw OpenAPI 3.0 spec
```

---

## Admin router — Swagger UI

```typescript
import { createAdminRouter } from '@awesome-lang-auth/node';

app.use('/admin', createAdminRouter(userStore, {
  accessPolicy: 'first-user',
  jwtSecret: process.env.ACCESS_TOKEN_SECRET!,
}));
// GET /admin/docs  — Swagger UI (auto-enabled outside production)
```

---

## Disabling in production

The `swagger` option accepts:

| Value | Behaviour |
|-------|-----------|
| `'auto'` (default) | Enabled when `NODE_ENV !== 'production'` |
| `true` | Always enabled |
| `false` | Always disabled |

```typescript
app.use('/tools', createToolsRouter(tools, { swagger: false }));
```

---

## Tools router endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/tools/track/:eventName` | Track a telemetry event |
| `POST` | `/tools/notify/:target` | Send an SSE notification |
| `GET` | `/tools/stream` | SSE stream endpoint |
| `POST` | `/tools/webhook/:provider` | Receive an inbound webhook |
| `GET` | `/tools/telemetry` | Query persisted telemetry (if store provides `query`) |
| `GET` | `/tools/docs` | Swagger UI |
| `GET` | `/tools/openapi.json` | Raw OpenAPI 3.0 spec |

---

## Using the OpenAPI spec

Import the spec into any API tool — Postman, Insomnia, Stoplight, etc.:

```
https://your-server.example.com/auth/openapi.json
https://your-server.example.com/tools/openapi.json
https://your-server.example.com/admin/openapi.json
```

## Related

- [Auth API endpoints reference](/docs/api-reference/endpoints) — the same routes in prose
- [API reference: auth, admin and tools routers](/docs/api-reference) — what the spec covers
- [Built-in admin panel](/docs/advanced/admin) — the admin routes documented in the spec
- [AuthTools: telemetry, SSE and webhooks](/docs/advanced/auth-tools) — the tools router endpoints
