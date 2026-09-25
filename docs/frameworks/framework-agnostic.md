---
id: framework-agnostic
title: Framework-Agnostic Auth for Any Node HTTP Server
description: >-
  Use awesome-node-auth outside Express: framework-neutral HTTP interfaces let you adapt the auth router to Fastify, Koa, Hono or a raw Node server.
sidebar_label: Framework-Agnostic
---

# Framework-Agnostic Usage

awesome-node-auth ships with **framework-neutral HTTP type interfaces** so that
the core library can be wired into any Node.js HTTP framework — Express,
Fastify, Koa, NestJS, Next.js Route Handlers, or a plain `http.Server` — using
the same public API.

:::info Express is still the default
The built-in routers (`createAuthRouter`, `createAdminRouter`, `buildUiRouter`)
are implemented with Express and return Express `Router` objects.  This page
describes the **type-level** framework-agnostic surface that was introduced in
**v1.7** so that non-Express consumers get a clean, typed integration path.
:::

---

## Architecture overview

```
awesome-node-auth
├── src/http-types.ts        Framework-neutral interfaces
│   ├── AuthRequest          Minimal request shape (headers, cookies, body, …)
│   ├── AuthResponse         Minimal response shape (status, json, cookie, …)
│   ├── AuthNextFunction     (err?: unknown) => void
│   ├── AuthRequestHandler   (req, res, next) => void | Promise<void>
│   └── AuthRouter           Route-registration interface
│
└── src/adapters/
    └── express.ts           Express adapter
        ├── re-exports Router, RequestHandler, Request, Response, NextFunction
        └── expressAdapter() — cast AuthRequestHandler → Express RequestHandler
```

The neutral types live in **`src/http-types.ts`** and are exported directly
from the main package entry point:

```typescript
import type {
  AuthRequest,
  AuthResponse,
  AuthNextFunction,
  AuthRequestHandler,
  AuthRouter,
} from 'awesome-node-auth';
```

---

## Express (default — zero changes required)

Existing Express code continues to compile without modification.
`AuthRequestHandler` uses `any` for its parameter types — a deliberate choice
that makes every Express `RequestHandler` directly assignable without a cast.

:::note Why `any` and not `AuthRequest`?
TypeScript enforces *contravariance* on function parameter types
(`strictFunctionTypes`).  If the parameters were typed as `AuthRequest`,
then `(req: Express.Request) => void` would **not** be assignable to
`(req: AuthRequest) => void` — because `Express.Request` is a *subtype* of
`AuthRequest`, and subtype parameters fail contravariant checks.
Using `any` bypasses this check, making Express, Fastify, Koa, and all
third-party middleware directly assignable without an explicit cast.
:::

```typescript
import express from 'express';
import rateLimit from 'express-rate-limit';
import { AuthConfigurator } from 'awesome-node-auth';

const auth = new AuthConfigurator(config, userStore);

// rateLimiter now typed as AuthRequestHandler — Express RequestHandler still works
app.use('/auth', auth.router({
  rateLimiter: rateLimit({ windowMs: 60_000, max: 20 }),
}));
```

---

## Writing framework-neutral middleware

When you write custom middleware that should work across frameworks, target the
neutral `AuthRequestHandler` type.  On Express, pass it through
`expressAdapter()` to get the correct Express typing for `app.use()`:

```typescript
import type { AuthRequestHandler } from 'awesome-node-auth';
import { expressAdapter } from 'awesome-node-auth';

// Typed against the neutral interface
const requestLogger: AuthRequestHandler = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

// Mount on Express (no cast needed — expressAdapter is a zero-overhead helper)
app.use(expressAdapter(requestLogger));
```

---

## NestJS

In a NestJS application you use `AuthConfigurator` directly inside a service or
guard.  NestJS decorates its own `ExecutionContext`-based request objects, but
the `AuthRequest` interface is broad enough to accommodate them:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { AuthRequest } from 'awesome-node-auth';

@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    return !!req.user;
  }
}
```

See the full [NestJS integration guide](/docs/frameworks/nestjs) for a
complete DI-based setup.

---

## Next.js App Router

Next.js App Router uses `NextRequest` / `NextResponse` which do **not** extend
Express types.  Map them onto `AuthRequest` / `AuthResponse` to use
awesome-node-auth's token service directly:

```typescript
// app/api/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from 'awesome-node-auth';
import type { AuthRequest } from 'awesome-node-auth';

const tokenService = new TokenService();

export async function GET(request: NextRequest) {
  // Map NextRequest to AuthRequest
  const authReq: AuthRequest = {
    headers: Object.fromEntries(request.headers.entries()),
    cookies: Object.fromEntries(
      request.cookies.getAll().map(({ name, value }) => [name, value])
    ),
    method: request.method,
    url: request.url,
  };

  const token = authReq.cookies?.['accessToken'];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Validate token using the framework-neutral service
  const payload = tokenService.verifyAccessToken(token, config.accessTokenSecret);
  return NextResponse.json(payload);
}
```

See the full [Next.js integration guide](/docs/frameworks/nextjs) for a
complete App Router setup including middleware.

---

## Implementing your own adapter

If you are integrating with a framework not listed here, implement the
`AuthRequest` and `AuthResponse` interfaces for your framework's native objects
and pass the resulting handler to your framework's router:

```typescript
import type { AuthRequest, AuthResponse, AuthNextFunction } from 'awesome-node-auth';
import { createAuthMiddleware } from 'awesome-node-auth';

// 1. Create the framework-neutral middleware
const authMiddleware = createAuthMiddleware(config, sessionStore);

// 2. Wrap it for your framework (example: Koa)
koaRouter.use(async (ctx, next) => {
  const req: AuthRequest = {
    headers: ctx.headers as Record<string, string | string[] | undefined>,
    cookies: ctx.cookies ? Object.fromEntries(
      Object.entries(ctx.cookies) as [string, string][]
    ) : undefined,
    method: ctx.method,
    path: ctx.path,
    url: ctx.url,
    ip: ctx.ip,
  };

  const res: AuthResponse = {
    status(code) { ctx.status = code; return this; },
    json(body) { ctx.body = body; return this; },
    send(body) { ctx.body = body; return this; },
    end() { /* handled by Koa */ },
    cookie(name, value, options) { ctx.cookies.set(name, value, options as any); return this; },
    clearCookie(name, options) { ctx.cookies.set(name, '', { maxAge: 0, ...options as any }); return this; },
    redirect(urlOrStatus: string | number, url?: string) {
      ctx.redirect(typeof urlOrStatus === 'string' ? urlOrStatus : url!);
    },
    setHeader(name, value) {
      ctx.set(name, Array.isArray(value) ? value.join(', ') : value);
      return this;
    },
  };

  await new Promise<void>((resolve, reject) => {
    authMiddleware(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
  });

  await next();
});
```

---

## Exported symbols reference

| Symbol | Kind | Description |
|--------|------|-------------|
| `AuthRequest` | `interface` | Minimal request shape (headers, cookies, body, …) |
| `AuthResponse` | `interface` | Minimal response shape (status, json, cookie, …) |
| `AuthNextFunction` | `type` | `(err?: unknown) => void` |
| `AuthRequestHandler` | `type` | `(req, res, next) => void \| Promise<void>` |
| `AuthRouter` | `interface` | Route-registration interface |
| `expressAdapter` | `function` | Cast `AuthRequestHandler` → Express `RequestHandler` |
