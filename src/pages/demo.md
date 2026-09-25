---
title: Runnable Express Authentication Demo
description: Copy-paste Express authentication demo for Node.js — in-memory storage, email/password login, JWT cookie sessions and an admin panel, running in two minutes.
---

# 🚀 Runnable Express authentication demo

:::tip Want to try it without any setup?
**[→ Open the Live Interactive Demo](/demo-live)** — register, login, and explore the API right in your browser. No installation needed.
:::

A **complete, self-contained** Express server you can run locally in under two minutes.  
No database. No cloud. No environment variables to configure — just copy, install, and go.

:::note Data resets on restart
This demo uses in-memory storage. All registered users vanish when the server stops —
perfect for exploring the library without any setup.
:::

---

## 1 · Install dependencies

```bash
npm install awesome-node-auth express cookie-parser
npm install -D typescript ts-node @types/node @types/express @types/cookie-parser
```

---

## 2 · Complete demo server

Save the file below as **`server.ts`** and run it — everything is self-contained.

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import {
  AuthConfigurator,
  createAdminRouter,
  PasswordService,
  IUserStore,
  BaseUser,
  ISettingsStore,
  AuthSettings,
} from 'awesome-node-auth';

// ── 1. In-memory user store ───────────────────────────────────────────────────
//  Stores users in a plain Map<string, BaseUser>.
//  All data is lost when the server restarts — do not use in production.

class InMemoryUserStore implements IUserStore {
  private users = new Map<string, BaseUser>();
  private nextId = 1;

  async findByEmail(email: string) {
    return [...this.users.values()].find(u => u.email === email) ?? null;
  }
  async findById(id: string) { return this.users.get(id) ?? null; }

  async create(data: Partial<BaseUser>): Promise<BaseUser> {
    const id = String(this.nextId++);
    const user: BaseUser = { id, email: data.email ?? '', ...data };
    this.users.set(id, user);
    return user;
  }

  async updateRefreshToken(id: string, token: string | null, expiry: Date | null) {
    const u = this.users.get(id);
    if (u) { u.refreshToken = token; u.refreshTokenExpiry = expiry; }
  }
  async updateLastLogin(id: string) {
    const u = this.users.get(id); if (u) u.lastLogin = new Date();
  }
  async updateResetToken(id: string, token: string | null, expiry: Date | null) {
    const u = this.users.get(id);
    if (u) { u.resetToken = token; u.resetTokenExpiry = expiry; }
  }
  async updatePassword(id: string, hashed: string) {
    const u = this.users.get(id); if (u) u.password = hashed;
  }
  async updateTotpSecret(id: string, secret: string | null) {
    const u = this.users.get(id);
    if (u) { u.totpSecret = secret; u.isTotpEnabled = secret !== null; }
  }
  async updateMagicLinkToken(id: string, token: string | null, expiry: Date | null) {
    const u = this.users.get(id);
    if (u) { u.magicLinkToken = token; u.magicLinkTokenExpiry = expiry; }
  }
  async updateSmsCode(id: string, code: string | null, expiry: Date | null) {
    const u = this.users.get(id);
    if (u) { u.smsCode = code; u.smsCodeExpiry = expiry; }
  }

  // Required for the admin panel users table and user deletion:
  async listUsers(limit: number, offset: number) {
    return [...this.users.values()].slice(offset, offset + limit);
  }
  async deleteUser(id: string) { this.users.delete(id); }
}

// ── 2. In-memory settings store ───────────────────────────────────────────────
//  Enables the ⚙️ Control tab in the admin panel (email verification policy,
//  mandatory 2FA toggle, lazy grace-period days, etc.).

class InMemorySettingsStore implements ISettingsStore {
  private settings: AuthSettings = {};
  async getSettings() { return { ...this.settings }; }
  async updateSettings(updates: Partial<AuthSettings>) {
    this.settings = { ...this.settings, ...updates };
  }
}

// ── 3. Wire everything together ───────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(cookieParser());  // needed to read/write JWT cookies

const userStore     = new InMemoryUserStore();
const settingsStore = new InMemorySettingsStore();
const passwordService = new PasswordService();

const config = {
  accessTokenSecret:    'demo-access-secret-change-in-production',
  refreshTokenSecret:   'demo-refresh-secret-change-in-production',
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  cookieOptions: { secure: false, sameSite: 'lax' as const },
};

const auth = new AuthConfigurator(config, userStore);

// ── 4. Auth routes ────────────────────────────────────────────────────────────
//  POST /auth/register  — create a new account
//  POST /auth/login     — email + password → sets HttpOnly JWT cookies
//  GET  /auth/me        — return the authenticated user's profile
//  POST /auth/logout    — clear JWT cookies
//  POST /auth/refresh   — rotate the access token using the refresh cookie

app.use('/auth', auth.router({
  onRegister: async (data) => {
    const hashed = await passwordService.hash(data.password as string);
    return userStore.create({
      email:    data.email    as string,
      password: hashed,
      role:     'user',
    });
  },
}));

// ── 5. A custom protected route ───────────────────────────────────────────────
//  auth.middleware() verifies the access-token cookie (or Bearer header).
//  req.user contains { sub, email, role, ... } from the JWT payload.

app.get('/profile', auth.middleware(), (req, res) => {
  res.json({ message: 'You are authenticated!', user: req.user });
});

// ── 6. Admin panel ────────────────────────────────────────────────────────────
//  Browse to http://localhost:3000/admin and enter the password below.
//  The built-in UI lets you list/delete users and tweak auth settings.

app.use('/admin', createAdminRouter(userStore, {
  adminSecret: '1234',     // ← change this in production!
  settingsStore,
}));

// ── 7. Start ──────────────────────────────────────────────────────────────────

app.listen(3000, () => {
  console.log('');
  console.log('  Demo running  →  http://localhost:3000');
  console.log('  Admin panel   →  http://localhost:3000/admin   (password: 1234)');
  console.log('');
});
```

---

## 3 · Run it

```bash
npx ts-node server.ts
```

---

## 4 · Available endpoints

| Method | Path | Auth required | Description |
|--------|------|:---:|-------------|
| `POST` | `/auth/register` | — | Register a new user (`email` + `password` in body) |
| `POST` | `/auth/login` | — | Login → sets `accessToken` + `refreshToken` HttpOnly cookies |
| `GET` | `/auth/me` | ✓ | Return the authenticated user's profile |
| `POST` | `/auth/logout` | ✓ | Clear the JWT cookies |
| `POST` | `/auth/refresh` | — | Rotate the access token using the refresh cookie |
| `GET` | `/profile` | ✓ | Custom protected route example |
| `GET` | `/admin` | — | Admin panel UI (password: `1234`) |

---

## 5 · Try it with curl

**Register an account:**
```bash
curl -c cookies.txt -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq
```

**Login:**
```bash
curl -c cookies.txt -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq
```

**Fetch your profile (reads the saved cookies):**
```bash
curl -b cookies.txt -s http://localhost:3000/auth/me | jq
```

**Hit the custom protected route:**
```bash
curl -b cookies.txt -s http://localhost:3000/profile | jq
```

**Refresh tokens:**
```bash
curl -b cookies.txt -c cookies.txt -s -X POST http://localhost:3000/auth/refresh | jq
```

**Logout:**
```bash
curl -b cookies.txt -c cookies.txt -s -X POST http://localhost:3000/auth/logout
```

---

## 6 · Admin panel

Open **`http://localhost:3000/admin`** in your browser.

When the login dialog appears enter:

> **Password: `1234`**

The built-in admin dashboard gives you:

- 👤 **Users tab** — list all registered users, view details, delete accounts
- ⚙️ **Control tab** — toggle email verification policy (`none` / `lazy` / `strict`), enforce mandatory 2FA globally

---

:::tip Production checklist
Before going live replace every placeholder with real values:

```bash
# Use strong random secrets (e.g. openssl rand -hex 32)
ACCESS_TOKEN_SECRET=...
REFRESH_TOKEN_SECRET=...
```

Also set `cookieOptions.secure: true` and `sameSite: 'strict'` (or `'none'` for
cross-origin with HTTPS).
:::
