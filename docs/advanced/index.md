---
id: advanced
title: Advanced Authentication Features
description: >-
  Multi-tenancy, RBAC, sessions, API keys, webhooks, SSE, telemetry and the admin panel — the advanced half of awesome-node-auth.
sidebar_position: 6
---

# Advanced Features

`awesome-node-auth` provides optional interfaces and hooks for advanced functionality. Every feature is opt-in — only configure what you need.

| Feature | Guide | Description |
|---------|-------|-------------|
| [Sessions](/docs/advanced/sessions) | `ISessionStore` | External persistence for auditing and admin-level revocation |
| [IdP Mode](/docs/advanced/idp-mode) | `IdProviderConfig` | RS256-signed JWTs + JWKS endpoint — act as a central Identity Provider |
| [Roles & Permissions](/docs/advanced/roles-permissions) | `IRolesPermissionsStore` | RBAC — assign roles, permissions, tenant-scoped |
| [Multi-Tenancy](/docs/advanced/multi-tenancy) | `ITenantStore` | Tenant CRUD, user↔tenant association |
| [CSRF Protection](/docs/advanced/csrf) | `AuthConfig.csrf` | Double-submit cookie pattern |
| [User Metadata](/docs/advanced/user-metadata) | `IUserMetadataStore` | Arbitrary per-user key/value data |
| [Account Linking](/docs/advanced/account-linking) | `ILinkedAccountsStore` | Link multiple OAuth providers to one account |
| [Admin Panel](/docs/advanced/admin) | `createAdminRouter()` | Built-in admin dashboard (HTML UI + REST API) |
| [Dynamic Inbound Webhooks](/docs/advanced/webhooks#dynamic-inbound-execution) | `@webhookAction`, `ActionRegistry`, `vm` sandbox | Govern and execute JS scripts on inbound webhooks via the admin UI |
| [Bearer Token](/docs/advanced/bearer-token) | — | Mobile/native clients: token storage, interceptors |
| [Mailer (HTTP)](/docs/advanced/mailer) | `MailerConfig` | Built-in HTTP email transport with bilingual templates |
| [Email Verification](/docs/advanced/email-verification) | `emailVerificationMode` | `none` / `lazy` / `strict` verification enforcement |
| [Change Email](/docs/advanced/change-email) | — | Two-step email address change with confirmation link |
| [Account Deletion](/docs/advanced/account-deletion) | — | `DELETE /auth/account` + tenant cleanup |
| [Custom JWT Claims](/docs/advanced/custom-claims) | `buildTokenPayload` | Embed tenant IDs, permissions, feature flags in JWT |
| [AuthEventBus](/docs/advanced/auth-event-bus) | `AuthEventBus` | Central event bus — subscribe to 26 standardised identity events |
| [API Keys](/docs/advanced/api-keys) | `ApiKeyService`, `IApiKeyStore` | Machine-to-machine API key authentication with bcrypt hashing |
| [AuthTools](/docs/advanced/auth-tools) | `AuthTools` | Unified entry point for telemetry, SSE, and webhooks |
| [SSE](/docs/advanced/sse) | `SseManager` | Real-time Server-Sent Events streaming by topic |
| [Scaling SSE](/docs/advanced/sse-scaling) | Redis pub/sub adapter | Broadcast SSE events across multiple instances or a Kubernetes cluster |
| [Real-time Decorators](/docs/advanced/sse-notify-decorator) | `@sseNotify` | Fire real-time notifications from any service or store method |
| [Webhooks](/docs/advanced/webhooks) | `WebhookSender`, `IWebhookStore` | Outgoing webhooks with HMAC signing and retry |
| [Telemetry](/docs/advanced/telemetry) | `ITelemetryStore` | Persist and query identity events |
| [Swagger / OpenAPI](/docs/advanced/swagger) | `createToolsRouter()` | Auto-generated OpenAPI 3.0 spec + Swagger UI |
| [Browser Client](/docs/advanced/browser-client) | `window.AwesomeNodeAuth` | Zero-config JS client shipped as `auth.js` — CSRF, auto-refresh, guards, all auth methods |
| [Built-in UI](/docs/advanced/built-in-ui) | `buildUiRouter()` | Server-rendered login/register pages — activation, CSS variables, full customization guide |
| [CORS & Dynamic siteUrl](/docs/advanced/cors) | `AuthConfig.cors` | Cross-domain setups and per-caller `siteUrl` resolution for emails and redirects |
| [Extending Interfaces](/docs/advanced/extending-interfaces) | `BaseUser`, `BaseTenant`, `Session` | Add custom fields to the base types with full TypeScript safety |
