---
id: api-reference
title: "API Reference: Auth, Admin and Tools Routers"
description: >-
  The three routers awesome-node-auth exposes — auth, admin and tools — what each one mounts, and how to combine them in a single Node.js application.
sidebar_position: 5
---

# API Reference

**node-auth** is a 360-degree communication and access control layer that exposes its functionality through **three core routers**. You can mount any combination of these routers depending on your application's needs.

## 1. Auth Router (Default: `/auth`)
Handles all user-facing authentication flows (login, registration, password resets, 2FA, OAuth, etc).

## 2. Tools Router (Default: `/tools`)
Handles machine-to-machine communication, telemetry, Server-Sent Events (SSE), and inbound/outgoing dynamic webhooks. See [Tools Router Endpoints](/docs/advanced/swagger#tools-router-endpoints) for the full list.

## 3. Admin Router (Default: `/admin/api`)
Provides a secure REST API (and a built-in UI) for administrative tasks like user management, role assignments, UI webhooks, settings, and session revocation. See [Admin REST API](/docs/advanced/admin#rest-api-reference) for the full list.

---

## Auth Router Endpoints Overview

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| `POST` | `/auth/login` | Email/password login | ❌ |
| `POST` | `/auth/register` | Register new user (requires `onRegister`) | ❌ |
| `POST` | `/auth/logout` | Log out | ✅ |
| `POST` | `/auth/refresh` | Refresh tokens | ❌ (refresh token) |
| `GET` | `/auth/me` | Get current user profile | ✅ |
| `POST` | `/auth/forgot-password` | Request password reset | ❌ |
| `POST` | `/auth/reset-password` | Reset with token | ❌ |
| `POST` | `/auth/change-password` | Change password | ✅ |
| `POST` | `/auth/send-verification-email` | Send email verification | ✅ |
| `GET` | `/auth/verify-email` | Verify email token | ❌ |
| `POST` | `/auth/change-email/request` | Request email change | ✅ |
| `POST` | `/auth/change-email/confirm` | Confirm email change | ❌ |
| `POST` | `/auth/magic-link/send` | Send magic link | ❌ |
| `POST` | `/auth/magic-link/verify` | Verify magic link | ❌ |
| `POST` | `/auth/sms/send` | Send SMS OTP | ❌ |
| `POST` | `/auth/sms/verify` | Verify SMS OTP | ❌ |
| `POST` | `/auth/2fa/setup` | Get TOTP secret + QR code | ✅ |
| `POST` | `/auth/2fa/verify-setup` | Activate TOTP | ✅ |
| `POST` | `/auth/2fa/verify` | Complete 2FA login | ❌ (temp token) |
| `POST` | `/auth/2fa/disable` | Disable 2FA | ✅ |
| `GET` | `/auth/oauth/:provider` | OAuth redirect | ❌ |
| `GET` | `/auth/oauth/:provider/callback` | OAuth callback | ❌ |
| `POST` | `/auth/sessions/cleanup` | Delete expired sessions | ❌ |
| `GET` | `/auth/linked-accounts` | List linked OAuth accounts | ✅ |
| `DELETE` | `/auth/linked-accounts/:provider/:id` | Unlink OAuth account | ✅ |
| `POST` | `/auth/link-request` | Link new email address | ✅ |
| `POST` | `/auth/link-verify` | Confirm account link | ❌ |
| `DELETE` | `/auth/account` | Delete account | ✅ |

See [Endpoints](/docs/api-reference/endpoints) for full request/response documentation.

## Related

- [Auth API endpoints reference](/docs/api-reference/endpoints) — request and response bodies for every route
- [ITemplateStore: custom emails and UI i18n](/docs/api-reference/template-store) — override transactional emails and UI strings
- [Swagger UI and OpenAPI 3.0 spec](/docs/advanced/swagger) — the machine-readable version of this reference
- [Built-in admin panel](/docs/advanced/admin) — the admin router's own REST API
