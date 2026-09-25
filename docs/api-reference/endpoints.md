---
id: endpoints
title: Auth API Endpoints Reference
description: >-
  Every endpoint on the awesome-node-auth auth router: register, login, refresh, logout, password reset, email verification, 2FA, OAuth and account.
sidebar_label: Endpoints
---

# Endpoint Reference

This page documents the endpoints exposed by the **Auth Router** (typically mounted at `/auth`). 
For the other parts of the 360-degree layer, see:
- **Tools Router** (SSE, Webhooks, Telemetry): [Tools Router Endpoints](/docs/advanced/swagger#tools-router-endpoints)
- **Admin Router** (User, Role, and Tenant management): [Admin REST API](/docs/advanced/admin#rest-api-reference)
- **API Keys**: [API Keys Guide](/docs/advanced/api-keys)

:::info Authentication
Protected endpoints require either a valid `accessToken` **HttpOnly cookie** (set automatically on login) or an `Authorization: Bearer <accessToken>` header.
:::

:::info Token delivery
By default, token-issuing endpoints (`/login`, `/refresh`, `/2fa/verify`, `/magic-link/verify`, `/sms/verify`) set **HttpOnly cookies** and return `{ "success": true }`. To receive tokens in the JSON response body instead (for native/mobile clients), add the `X-Auth-Strategy: bearer` request header. See [Bearer Token Mode](/docs/advanced/bearer-token) for details.
:::

---

## Authentication

### `POST` /auth/login

**Request body:**
```json
{ "email": "user@example.com", "password": "secret" }
```

**Response `200` (cookie mode — default):**
```json
{ "success": true }
```
HttpOnly cookies `accessToken`, `refreshToken` (and `csrf-token` if CSRF is enabled) are set automatically.

**Response `200` (bearer mode — `X-Auth-Strategy: bearer`):**
```json
{ "success": true, "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

**Response `200` (2FA required):**
```json
{ "requiresTwoFactor": true, "tempToken": "eyJ...", "available2faMethods": ["totp", "sms"] }
```

---

### `POST` /auth/register

Requires `onRegister` callback in router options.

**Request body:**
```json
{ "email": "user@example.com", "password": "secret", "name": "Jane" }
```

**Response `201`:**
```json
{ "success": true, "userId": "123" }
```

---

### `POST` /auth/logout

Clears the refresh token server-side. Requires valid access token (cookie or bearer).

**Response `200`:**
```json
{ "success": true }
```

---

### `POST` /auth/refresh

Uses the refresh token (from HttpOnly cookie or from `refreshToken` in request body) to issue new tokens.

**Response `200` (cookie mode — default):**
```json
{ "success": true }
```
New `accessToken` and `refreshToken` cookies are set automatically.

**Response `200` (bearer mode — `X-Auth-Strategy: bearer`):**
```json
{ "success": true, "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

---

### `GET` /auth/me

Returns the current user's full profile. Requires authentication.

**Response `200`:**
```json
{
  "sub": "123",
  "email": "user@example.com",
  "role": "user",
  "loginProvider": "local",
  "isEmailVerified": true,
  "isTotpEnabled": false,
  "metadata": { "theme": "dark" },
  "roles": ["editor"],
  "permissions": ["posts:read", "posts:write"]
}
```

---

## Password Management

### `POST` /auth/forgot-password

**Request body:**
```json
{ "email": "user@example.com" }
```

### `POST` /auth/reset-password

**Request body:**
```json
{ "token": "reset-token-from-email", "newPassword": "newpassword123" }
```

### `POST` /auth/change-password

Requires authentication.

**Request body:**
```json
{ "currentPassword": "old", "newPassword": "new" }
```

---

## Email Verification

### `POST` /auth/send-verification-email

Sends a verification email to the authenticated user. Requires authentication.

### `GET` /auth/verify-email?token=...

Verifies the email token from the link. Redirects on success.

---

## Email Change

### `POST` /auth/change-email/request

Sends a confirmation email to the new address. Requires authentication.

**Request body:**
```json
{ "newEmail": "newemail@example.com" }
```

### `POST` /auth/change-email/confirm

Confirms the email change using the token from the confirmation email.

**Request body:**
```json
{ "token": "token-from-email" }
```

---

## Magic Link

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/magic-link/send` | Request magic link. Body: `{ email }` for login; `{ tempToken, mode: '2fa' }` for 2FA second factor |
| `POST` | `/auth/magic-link/verify` | Verify token → set session cookies (or return tokens in bearer mode). Body: `{ token, mode?, tempToken? }` |

---

## SMS OTP

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/sms/send` | Send OTP. Body: `{ email }` or `{ userId }` for login; `{ tempToken, mode: '2fa' }` for 2FA |
| `POST` | `/auth/sms/verify` | Verify OTP → set session cookies (or return tokens in bearer mode). Body: `{ userId, code }` for login; `{ tempToken, code, mode: '2fa' }` for 2FA |

---

## TOTP (Two-Factor Authentication)

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `POST` | `/auth/2fa/setup` | ✅ | Generate TOTP secret and QR code data URI |
| `POST` | `/auth/2fa/verify-setup` | ✅ | Confirm TOTP enrollment. Body: `{ token, secret }` |
| `POST` | `/auth/2fa/verify` | — (temp token) | Complete 2FA login. Body: `{ tempToken, totpCode }` |
| `POST` | `/auth/2fa/disable` | ✅ | Disable TOTP for the current user |

---

## OAuth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/oauth/:provider` | Redirect to provider |
| `GET` | `/auth/oauth/:provider/callback` | Handle OAuth callback |

---

## Sessions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/sessions/cleanup` | Delete expired sessions (requires `sessionStore.deleteExpiredSessions`) |

Active session listing and per-session revocation are available through the [Admin Panel](/docs/advanced/admin) at `/admin/api/sessions`.

---

## Account Linking

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/auth/linked-accounts` | ✅ | List linked OAuth accounts for the current user |
| `DELETE` | `/auth/linked-accounts/:provider/:id` | ✅ | Unlink an OAuth account |
| `POST` | `/auth/link-request` | ✅ | Request to link a new email address (sends verification email) |
| `POST` | `/auth/link-verify` | ❌ | Complete linking using token from email |

---

## Account

### `DELETE` /auth/account

Deletes the authenticated user's account and all associated data.
