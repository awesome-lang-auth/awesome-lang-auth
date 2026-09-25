---
id: python
title: "Python FastAPI Authentication: awesome-python-auth"
description: >-
  awesome-python-auth is the FastAPI port of awesome-node-auth: the same endpoints, JWT model and client compatibility, for Python backends.
sidebar_label: Python / FastAPI
---

# Python Integration — `awesome-python-auth`

:::tip Official Python library
**For Python backends, use [`awesome-python-auth`](https://pypi.org/project/awesome-python-auth/)** — the official FastAPI library that brings the same auth model as `awesome-node-auth` to Python. Its [parity audit](https://github.com/awesome-lang-auth/awesome-python-auth/issues/10) tracks the details.

It provides:
- All the same auth flows: local, OAuth, magic link, SMS OTP, TOTP 2FA
- Cookie + CSRF support for Angular and Flutter web clients
- Bearer token support for Flutter native / mobile
- `AuthEventBus`, `AuthTools`, SSE, webhooks, telemetry
- IdP mode (RS256/JWKS) and Resource Server validation
- RBAC, multi-tenancy, API keys, admin router, bundled UI
:::

---

## Installation

```bash
pip install awesome-python-auth
```

**Requirements:** Python ≥ 3.11, FastAPI ≥ 0.115.0

---

## Quickstart

```python
import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from awesome_python_auth import (
    AuthConfig, AuthConfigurator, CsrfMiddleware, require_auth,
)
from awesome_python_auth.models import AuthUser, InMemoryUserStore

user_store = InMemoryUserStore()

config = AuthConfig(
    api_prefix="/api/auth",
    access_token_secret=os.environ["JWT_SECRET"],
    cookie_secure=False,  # True in production (HTTPS)
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # your frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-CSRF-Token", "X-Auth-Strategy"],
)
app.add_middleware(CsrfMiddleware, api_prefix="/api/auth", cookie_secure=False)

configurator = AuthConfigurator(config, user_store)
app.include_router(configurator.router())

@app.get("/api/todos")
async def todos(user: AuthUser = Depends(require_auth)):
    return {"todos": [], "user": user.email}
```

Run with:

```bash
uvicorn main:app --reload
```

---

## Configuration — `AuthConfig`

All options are keyword arguments to the `AuthConfig` dataclass:

```python
from awesome_python_auth import AuthConfig

config = AuthConfig(
    # ── Core ──────────────────────────────────────────────────────────────────
    api_prefix="/api/auth",             # Must match the client's apiPrefix
    access_token_secret="...",          # JWT signing secret (HS256)
    access_token_expires_in=900,        # Seconds — default 15 min
    refresh_token_expires_in=604800,    # Seconds — default 7 days

    # ── Cookies ───────────────────────────────────────────────────────────────
    cookie_secure=True,                 # False for local HTTP dev only
    cookie_same_site="lax",             # "lax" | "strict" | "none"
    cookie_domain=None,                 # Set for subdomain sharing
    cookie_prefix=None,                 # "__Host-" | "__Secure-" | None

    # ── Features ──────────────────────────────────────────────────────────────
    totp_issuer="My App",               # Shown in authenticator apps
    ui_config=None,                     # Dict returned by GET /api/auth/ui/config
    session_check_on="none",            # "none" | "refresh" | "allcalls"

    # ── Email hooks (implement at least one for email-based features) ──────────
    on_forgot_password=None,            # async (user, token) -> None
    on_send_verification_email=None,    # async (user, token) -> None
    on_request_email_change=None,       # async (user, new_email, token) -> None
    on_magic_link_send=None,            # async (email, temp_token, mode) -> None
    on_magic_link_verify=None,          # async (token, mode) -> user_id | None

    # ── SMS hooks ─────────────────────────────────────────────────────────────
    on_sms_send=None,                   # async (email, temp_token, mode) -> None
    on_sms_verify=None,                 # async (user_id, temp_token, code, mode) -> user_id | None

    # ── OAuth hooks ───────────────────────────────────────────────────────────
    on_oauth_start=None,                # async (provider, request) -> redirect_url
    on_oauth_callback=None,             # async (provider, request) -> user_id | dict | StoredUser | None

    # ── Account linking hooks ─────────────────────────────────────────────────
    on_link_request=None,               # async (email, provider, current_user) -> None
    on_link_verify=None,                # async (token, provider, login_after_linking) -> user_id | None

    # ── Registration hook ─────────────────────────────────────────────────────
    on_register=None,                   # async (stored_user) -> StoredUser | None

    # ── Plugin instances (see dedicated sections below) ───────────────────────
    mailer=None,                        # MailerConfig
    tools=None,                         # AuthTools
    api_key_store=None,                 # ApiKeyStore
    roles_permissions_store=None,       # RolesPermissionsStore
    tenant_store=None,                  # TenantStore
    id_provider=None,                   # IdProviderConfig
    resource_server=None,               # ResourceServerConfig
)
```

---

## User Store

Implement `UserStore` to connect your database. All auth endpoints delegate user lookup and persistence to this store.

### Abstract interface

```python
from awesome_python_auth.models import UserStore, StoredUser, StoredSession
from abc import abstractmethod

class MyUserStore(UserStore):
    # ── Required ──────────────────────────────────────────────────────────────
    async def get_by_email(self, email: str) -> StoredUser | None: ...
    async def get_by_id(self, user_id: str) -> StoredUser | None: ...
    async def create(self, user: StoredUser) -> StoredUser: ...
    async def update(self, user: StoredUser) -> StoredUser: ...
    async def delete(self, user_id: str) -> None: ...

    # ── Sessions (optional — enables device-aware session management) ─────────
    async def create_session(self, session: StoredSession) -> StoredSession: ...
    async def get_sessions_for_user(self, user_id: str) -> list[StoredSession]: ...
    async def get_session_by_handle(self, handle: str) -> StoredSession | None: ...
    async def update_session(self, session: StoredSession) -> None: ...
    async def delete_session(self, handle: str) -> None: ...
    async def delete_sessions_for_user(self, user_id: str) -> None: ...

    # ── Admin (optional — enables user listing in admin panel) ────────────────
    async def list_all_users(self, offset: int = 0, limit: int = 50) -> list[StoredUser]: ...
    async def count_users(self) -> int: ...
    async def list_all_sessions(self, offset: int = 0, limit: int = 50) -> list[StoredSession]: ...
    async def count_active_sessions(self) -> int: ...

    # ── Token finders (optional — enables specific endpoints) ─────────────────
    async def find_by_reset_token(self, token_hash: str) -> StoredUser | None: ...
    async def find_by_verification_token(self, token_hash: str) -> StoredUser | None: ...
    async def find_by_pending_email_token(self, token_hash: str) -> StoredUser | None: ...
```

### Built-in in-memory store (for development / testing)

```python
from awesome_python_auth.models import InMemoryUserStore

user_store = InMemoryUserStore()
```

### `StoredUser` fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str \| None` | Database ID |
| `email` | `str` | Email address |
| `hashed_password` | `str \| None` | bcrypt hash |
| `first_name` | `str \| None` | First name |
| `last_name` | `str \| None` | Last name |
| `is_email_verified` | `bool` | Email verification status |
| `is_totp_enabled` | `bool` | TOTP 2FA enabled |
| `totp_secret` | `str \| None` | TOTP secret |
| `phone_number` | `str \| None` | Phone number |
| `role` | `str \| None` | Primary role string |
| `roles` | `list[str] \| None` | Role list |
| `permissions` | `list[str] \| None` | Permission list |
| `is_admin` | `bool \| None` | Admin flag |
| `tenant_id` | `str \| None` | Multi-tenancy tenant ID |
| `metadata` | `dict \| None` | Arbitrary key-value metadata |

---

## FastAPI Dependency Functions

Use these as `Depends(...)` in your route functions:

```python
from awesome_python_auth import get_current_user, require_auth, require_roles, require_admin
from awesome_python_auth.models import AuthUser
from fastapi import Depends

# Optional auth — returns None if unauthenticated
@app.get("/public-or-private")
async def example(user: AuthUser | None = Depends(get_current_user)):
    if user:
        return {"hello": user.email}
    return {"hello": "anonymous"}

# Required auth — raises HTTP 401 if unauthenticated
@app.get("/private")
async def private(user: AuthUser = Depends(require_auth)):
    return {"user": user.email}

# Role-based access — raises HTTP 403 if user lacks all listed roles
@app.get("/admin-area")
async def admin_area(user: AuthUser = Depends(require_roles(["admin"]))):
    return {"user": user.email}

# Admin flag — raises HTTP 403 if user.is_admin is not True
@app.get("/super-admin")
async def super_admin(user: AuthUser = Depends(require_admin())):
    return {"admin": True}
```

Token extraction priority: `Authorization: Bearer` header → `access-token` HttpOnly cookie.

---

## CSRF Middleware

Required for **Angular and Flutter web** clients that use the cookie-based auth mode:

```python
from awesome_python_auth import CsrfMiddleware

app.add_middleware(
    CsrfMiddleware,
    api_prefix="/api/auth",     # Must match AuthConfig.api_prefix
    cookie_secure=True,         # False for local HTTP dev only
    cookie_same_site="lax",
)
```

The middleware:
- Sets a `csrf-token` cookie on every response
- Validates the `X-CSRF-Token` request header on all mutating requests (`POST`, `PATCH`, `PUT`, `DELETE`) to endpoints under `api_prefix`

---

## API Endpoints

All endpoints are mounted under `api_prefix` (default `/api/auth`):

### Account

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/login` | ❌ | Login with email + password |
| `POST` | `/register` | ❌ | Create a new account |
| `POST` | `/logout` | ✅ | Logout and clear session |
| `POST` | `/refresh` | ❌ | Refresh the access token |
| `GET` | `/me` | ✅ | Return current user |
| `PATCH` | `/profile` | ✅ | Update first/last name |
| `DELETE` | `/account` | ✅ | Delete own account |

### Password

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/forgot-password` | Request password reset email |
| `POST` | `/reset-password` | Reset password with token |
| `POST` | `/change-password` | Change password (authenticated) |
| `POST` | `/send-verification-email` | Resend verification email |
| `GET` | `/verify-email?token=` | Confirm email address |
| `POST` | `/change-email/request` | Request email change |
| `POST` | `/change-email/confirm` | Confirm email change |

### TOTP 2FA

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/2fa/setup` | Begin TOTP setup — returns QR + secret |
| `POST` | `/2fa/verify-setup` | Confirm TOTP setup with code |
| `POST` | `/2fa/verify` | Verify TOTP code during login |
| `POST` | `/2fa/disable` | Disable TOTP |

### Magic Link

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/magic-link/send` | Send magic-link email |
| `POST` | `/magic-link/verify` | Verify magic-link token |

### SMS / OTP

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sms/send` | Send SMS OTP |
| `POST` | `/sms/verify` | Verify SMS OTP |
| `POST` | `/add-phone` | Add phone number to account |

### Sessions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/sessions` | List all active sessions |
| `DELETE` | `/sessions/{handle}` | Revoke a specific session |

### OAuth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/oauth/{provider}` | Start provider OAuth flow |
| `GET` | `/oauth/{provider}/callback` | Complete OAuth callback |

### Account Linking

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/link-request` | Initiate account linking by email |
| `POST` | `/link-verify` | Verify linking token |
| `GET` | `/linked-accounts` | List linked OAuth providers |
| `DELETE` | `/linked-accounts/{provider}/{id}` | Unlink a provider |

### Utilities

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/ui/config` | UI feature flags and theme config |
| `GET` | `/tools/stream` | Server-Sent Events stream |

---

## Bearer Token Mode (Flutter native / mobile)

For Flutter native clients (iOS, Android, Desktop), the package sends `X-Auth-Strategy: bearer`. Your server automatically detects this header and returns tokens in the JSON body instead of cookies:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

No extra server configuration is needed — the detection is automatic. Ensure `X-Auth-Strategy` is listed in your CORS `allow_headers`.

---

## Email Hooks

Implement the hooks you need and pass them to `AuthConfig`:

```python
async def send_forgot_password(user, token: str):
    reset_url = f"https://myapp.com/reset-password?token={token}"
    await mailer.send(to=user.email, subject="Password reset", body=reset_url)

async def send_verification_email(user, token: str):
    verify_url = f"https://myapp.com/verify-email?token={token}"
    await mailer.send(to=user.email, subject="Verify your email", body=verify_url)

async def send_magic_link(email: str, temp_token: str, mode: str):
    link_url = f"https://myapp.com/magic-link?token={temp_token}&mode={mode}"
    await mailer.send(to=email, subject="Your magic link", body=link_url)

async def verify_magic_link(token: str, mode: str) -> str | None:
    # Look up the token in your store; return user_id or None
    user = await user_store.find_by_magic_token(token)
    return user.id if user else None

config = AuthConfig(
    on_forgot_password=send_forgot_password,
    on_send_verification_email=send_verification_email,
    on_magic_link_send=send_magic_link,
    on_magic_link_verify=verify_magic_link,
)
```

---

## SMS Hooks

```python
async def send_sms(email: str, temp_token: str, mode: str):
    user = await user_store.get_by_email(email)
    otp = generate_otp()
    await store_otp(user.id, otp, temp_token)
    await sms_client.send(to=user.phone_number, body=f"Your code: {otp}")

async def verify_sms(user_id: str, temp_token: str, code: str, mode: str) -> str | None:
    if await validate_otp(user_id, temp_token, code):
        return user_id
    return None

config = AuthConfig(
    on_sms_send=send_sms,
    on_sms_verify=verify_sms,
)
```

---

## OAuth Hooks

```python
from starlette.requests import Request

async def oauth_start(provider: str, request: Request) -> str:
    # Build and return the OAuth redirect URL for the given provider
    return f"https://{provider}.com/oauth/authorize?client_id=...&redirect_uri=..."

async def oauth_callback(provider: str, request: Request):
    # Exchange the code, find or create the user, return user_id
    code = request.query_params.get("code")
    # ... exchange with provider ...
    user = await user_store.get_by_email(profile_email)
    if not user:
        user = await user_store.create(StoredUser(email=profile_email, ...))
    return user.id

config = AuthConfig(
    on_oauth_start=oauth_start,
    on_oauth_callback=oauth_callback,
)
```

---

## `AuthEventBus`

Subscribe to auth lifecycle events anywhere in your app:

```python
from awesome_python_auth import AuthEventBus, AuthEventNames

bus = AuthEventBus()

# Sync or async handlers are both supported
async def on_login(payload: dict):
    print(f"User logged in: {payload['userId']}")

bus.on_event(AuthEventNames.AUTH_LOGIN_SUCCESS, on_login)
bus.on_event("*", lambda p: print("Event:", p))  # wildcard — receives ALL events

# Unsubscribe
bus.off_event(AuthEventNames.AUTH_LOGIN_SUCCESS, on_login)

# Publish manually
bus.publish(AuthEventNames.USER_CREATED, {"userId": "u1"})
```

Pass `bus` to `AuthTools` so the tools layer can publish events automatically.

### Event names reference

| Constant | Event string |
|----------|-------------|
| `AUTH_LOGIN_SUCCESS` | `identity.auth.login.success` |
| `AUTH_LOGIN_FAILED` | `identity.auth.login.failed` |
| `AUTH_LOGOUT` | `identity.auth.logout` |
| `AUTH_OAUTH_SUCCESS` | `identity.auth.oauth.success` |
| `AUTH_OAUTH_CONFLICT` | `identity.auth.oauth.conflict` |
| `USER_CREATED` | `identity.user.created` |
| `USER_DELETED` | `identity.user.deleted` |
| `USER_EMAIL_VERIFIED` | `identity.user.email.verified` |
| `USER_PASSWORD_CHANGED` | `identity.user.password.changed` |
| `USER_2FA_ENABLED` | `identity.user.2fa.enabled` |
| `USER_2FA_DISABLED` | `identity.user.2fa.disabled` |
| `USER_LINKED` | `identity.user.linked` |
| `USER_UNLINKED` | `identity.user.unlinked` |
| `SESSION_CREATED` | `identity.session.created` |
| `SESSION_REVOKED` | `identity.session.revoked` |
| `SESSION_EXPIRED` | `identity.session.expired` |
| `SESSION_ROTATED` | `identity.session.rotated` |
| `ROLE_ASSIGNED` | `identity.role.assigned` |
| `ROLE_REVOKED` | `identity.role.revoked` |
| `PERMISSION_GRANTED` | `identity.permission.granted` |
| `PERMISSION_REVOKED` | `identity.permission.revoked` |
| `TENANT_CREATED` | `identity.tenant.created` |
| `TENANT_DELETED` | `identity.tenant.deleted` |
| `TENANT_USER_ADDED` | `identity.tenant.user.added` |
| `TENANT_USER_REMOVED` | `identity.tenant.user.removed` |

---

## `AuthTools` — Multi-Channel Notifications

`AuthTools` wraps SSE, email, and SMS into a single `notify()` call and integrates with `AuthEventBus` for automatic telemetry:

```python
from awesome_python_auth import AuthTools, SseManager
from awesome_python_auth.mailer import MailerConfig
from awesome_python_auth.notification import SmsConfig

sse = SseManager()

tools = AuthTools(
    sse=sse,
    email_config=MailerConfig(
        endpoint="https://mailer.example.com/send",
        api_key=os.environ["MAILER_API_KEY"],
        from_address="no-reply@example.com",
    ),
    sms_config=SmsConfig(
        endpoint="https://sms.example.com/send",
        api_key=os.environ["SMS_API_KEY"],
    ),
    user_store=user_store,   # required for email/sms channels
    event_bus=bus,           # optional — publishes telemetry events
)

config = AuthConfig(tools=tools)

# Mount the tools router for SSE + telemetry endpoints
from awesome_python_auth import build_tools_router
app.include_router(build_tools_router(tools))
```

### `tools.notify()` — send to one or more channels

```python
# SSE only (default)
await tools.notify("user:123", type="ping", data={"msg": "Hello!"})

# SSE + email
await tools.notify(
    "user:123",
    type="subscription_expiring",
    data={"days_left": 3},
    user_id="123",
    channels=["sse", "email"],
    email_subject="Your subscription expires soon",
)

# All channels: SSE + email + SMS
await tools.notify(
    "user:123",
    type="security_alert",
    data="Unusual login detected",
    user_id="123",
    channels=["sse", "email", "sms"],
    email_subject="Security alert",
    sms_message="Unusual login detected on your account",
)

# Telemetry tracking (also publishes to event bus)
await tools.track(AuthEventNames.AUTH_LOGIN_SUCCESS, user_id="u1")
```

---

## Identity Provider (IdP) Mode

Signs JWTs with **RS256** and exposes `GET /.well-known/jwks.json` for downstream services:

```python
import os
from awesome_python_auth.idp import IdProviderConfig

config = AuthConfig(
    api_prefix="/api/auth",
    access_token_secret=os.environ["JWT_SECRET"],
    id_provider=IdProviderConfig(
        enabled=True,
        private_key=os.environ.get("IDP_PRIVATE_KEY"),  # PEM RSA private key
        issuer="https://auth.myplatform.com",
        token_expiry=2592000,           # 30 days
        refresh_token_expiry=7776000,   # 90 days
        jwks_path="/.well-known/jwks.json",
    ),
)
```

Generate an RSA keypair:

```python
from awesome_python_auth import JwksService

private_key, public_key = JwksService.generate_keypair()
# Store private_key securely in IDP_PRIVATE_KEY env var
```

:::note
If `private_key` is omitted, an ephemeral RSA-2048 keypair is auto-generated at startup. Tokens are invalidated on restart — use only for development.
:::

---

## Resource Server Mode

Validate JWTs issued by a remote IdP via JWKS:

```python
from awesome_python_auth.idp import ResourceServerConfig

config = AuthConfig(
    access_token_secret="not-used-when-resource-server-is-enabled",
    resource_server=ResourceServerConfig(
        enabled=True,
        jwks_url="https://auth.myplatform.com/api/auth/.well-known/jwks.json",
        issuer="https://auth.myplatform.com",  # optional — rejects wrong iss
        jwks_cache_ttl=3600,       # cache JWKS for 1 hour
        jwks_fetch_timeout=5.0,    # seconds
    ),
)
```

The `get_current_user`, `require_auth`, and `require_roles` dependencies switch automatically to JWKS-based RS256 verification when `resource_server.enabled` is `True`.

---

## RBAC — Roles & Permissions

```python
from awesome_python_auth import RolesPermissionsStore, InMemoryRolesPermissionsStore

rbac_store = InMemoryRolesPermissionsStore()

config = AuthConfig(roles_permissions_store=rbac_store)
```

Protect routes with roles:

```python
from awesome_python_auth import require_roles

@app.get("/billing")
async def billing(user = Depends(require_roles(["admin", "billing"]))):
    return {"access": "granted"}
```

---

## Multi-Tenancy

```python
from awesome_python_auth import TenantStore, InMemoryTenantStore

tenant_store = InMemoryTenantStore()
config = AuthConfig(tenant_store=tenant_store)
```

The `user.tenant_id` field in the JWT payload is set during registration/login. Use it to scope all queries:

```python
@app.get("/api/data")
async def data(user: AuthUser = Depends(require_auth)):
    return await db.find(tenant_id=user.tenant_id)
```

---

## M2M API Keys

```python
from awesome_python_auth import ApiKeyService, ApiKeyStore, InMemoryApiKeyStore

api_key_store = InMemoryApiKeyStore()
api_key_service = ApiKeyService(api_key_store)

config = AuthConfig(api_key_store=api_key_store)

# Create a key programmatically
key = await api_key_service.create_key(
    name="ci-bot",
    scopes=["read:users", "write:events"],
)
print(key.raw_key)  # store securely — not recoverable later
```

---

## Admin Router

Mount the built-in Admin UI for user management, sessions, RBAC, tenants, and telemetry:

```python
from awesome_python_auth import build_admin_router

app.include_router(build_admin_router(user_store, config))
# Admin UI available at /admin
```

---

## Built-in UI Router

Mount the bundled authentication SPA (login, register, password reset pages):

```python
from awesome_python_auth import build_ui_router

app.include_router(build_ui_router(config))
# UI available at /api/auth/ui/login, /api/auth/ui/register, etc.
```

---

## Cross-Origin Setup (Flutter web / Angular)

When your frontend is on a different domain, configure `CORSMiddleware` with `allow_credentials=True` and set `cookie_same_site="none"` with `cookie_secure=True`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-CSRF-Token", "X-Auth-Strategy"],
)
app.add_middleware(
    CsrfMiddleware,
    api_prefix="/api/auth",
    cookie_secure=True,
    cookie_same_site="none",  # required for cross-origin cookies
)

config = AuthConfig(
    cookie_secure=True,
    cookie_same_site="none",
)
```

---

## Connecting Flutter clients

The Flutter package (`awesome_node_auth_flutter`) works with `awesome-python-auth` as a drop-in replacement for the Node.js backend. Set the Flutter client's `apiPrefix` option to match your Python server's `api_prefix`:

```dart
import 'package:awesome_node_auth_flutter/awesome_node_auth_flutter.dart';

final auth = AuthClient(
  AuthOptions(
    apiPrefix: 'http://localhost:3000/api/auth',  // matches api_prefix in Python
    headless: true,
  ),
);
```

See the [Flutter integration guide](/docs/frameworks/flutter) for the full client-side setup.

---

## `AuthUser` model

The authenticated user decoded from the JWT:

| Field | Type | Description |
|-------|------|-------------|
| `sub` | `str` | Stable unique user ID (JWT subject) |
| `email` | `str` | Email address |
| `is_email_verified` | `bool` | Email verification status |
| `id` | `str \| None` | Database ID |
| `first_name` | `str \| None` | First name |
| `last_name` | `str \| None` | Last name |
| `name` | `str \| None` | Display name |
| `phone_number` | `str \| None` | Phone number |
| `role` | `str \| None` | Primary role string |
| `login_provider` | `str \| None` | OAuth provider name |
| `is_totp_enabled` | `bool \| None` | TOTP 2FA status |
| `has_password` | `bool \| None` | Whether a password is set |
| `roles` | `list[str] \| None` | List of roles |
| `permissions` | `list[str] \| None` | List of permissions |
| `is_admin` | `bool \| None` | Admin flag |
| `tenant_id` | `str \| None` | Multi-tenancy tenant ID |
| `metadata` | `dict \| None` | Arbitrary key-value metadata |
