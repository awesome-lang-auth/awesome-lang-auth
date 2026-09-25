---
id: live-demo
title: Live Node.js Authentication Demos on StackBlitz
description: >-
  Try awesome-node-auth in the browser: Express, NestJS, Next.js and Angular SSR authentication demos running on StackBlitz with no local setup.
sidebar_position: 2
---

# Live Demos

Fully-functional, in-browser demos powered by [StackBlitz WebContainers](https://stackblitz.com).
Each example uses an **in-memory store** so everything works out-of-the-box — no database setup required.
Fill in the `.env.example` values to connect a real database or enable email/SMS features.

---

## Express (Basic)

The simplest integration: Express + `awesome-node-auth` with HttpOnly JWT cookies, bcrypt password hashing, and an admin panel.

| | |
|---|---|
| **Stack** | Node.js · Express · Vanilla HTML/JS |
| **Auth** | Register · Login · Logout · `/auth/me` · Refresh token |
| **Database** | In-memory |
| **Start** | `npm start` |

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/nik2208/awesome-node-auth/tree/main/demo/express-vanilla?title=awesome-node-auth%20Express%20Demo&startScript=start)

---

## NestJS Fullstack

NestJS application with `AuthModule.forRoot()`, `JwtAuthGuard`, `@CurrentUser()` decorator, and a static HTML frontend.

| | |
|---|---|
| **Stack** | Node.js · NestJS · TypeScript · ts-node · Vanilla HTML/JS |
| **Auth** | Register · Login · Logout · `/auth/me` · Refresh · Protected endpoint |
| **Database** | In-memory |
| **Start** | `npm start` |

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/nik2208/awesome-node-auth/tree/main/demo/nestjs-fullstack?title=awesome-node-auth%20NestJS%20Demo&startScript=start)

---

## Next.js Fullstack (Pages Router)

Full-stack Next.js application with a catch-all `/api/auth/[...auth]` route, Edge Middleware route protection, and a login + dashboard UI.

| | |
|---|---|
| **Stack** | Node.js · Next.js 15 · TypeScript · React |
| **Auth** | Register · Login · Logout · Dashboard (protected) · Middleware redirect |
| **Database** | In-memory |
| **Start** | `npm start` (runs `next dev`) |

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/nik2208/awesome-node-auth/tree/main/demo/nextjs-fullstack?title=awesome-node-auth%20Next.js%20Demo&startScript=start)

---

## Angular SSR (with Guards & Interceptors)

Angular 19 application with Server-Side Rendering, a full auth layer, and all production-ready patterns:

- **`AuthService`** — user state, login/logout/refresh via HttpOnly cookies
- **`authInterceptor`** — CSRF header + automatic token-refresh queue (handles concurrent 401s)
- **`authGuard`, `guestGuard`, `roleGuard`** — route protection
- **`APP_INITIALIZER`** — silent session restore on page reload
- **`ssrCookieInterceptor`** — forwards browser cookies to the API server during SSR

| | |
|---|---|
| **Stack** | Node.js · Angular 19 SSR · Express (node-auth API) · TypeScript |
| **Dev mode** | `npm start` → API server (port 3000) + `ng serve` (port 4200) with proxy |
| **Production** | `npm run build && npm run serve:ssr` |
| **Database** | In-memory |

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/nik2208/awesome-node-auth/tree/main/demo/angular-ssr?title=awesome-node-auth%20Angular%20SSR%20Demo&startScript=start)

---

## Express + Angular SPA

Separate Express API (node-auth) on port 3000 and Angular SPA on port 4200. Angular proxies `/auth/*` and `/admin/*` to Express during development.

Same auth patterns as the Angular SSR demo (guards, interceptors, `APP_INITIALIZER`) — without SSR complexity. In production, Express serves the compiled Angular build.

| | |
|---|---|
| **Stack** | Node.js · Angular 19 · Express (node-auth API) · TypeScript |
| **Dev mode** | `npm start` → API server (port 3000) + `ng serve` (port 4200) with proxy |
| **Production** | `npm run build && npm run serve:prod` |
| **Database** | In-memory |

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/nik2208/awesome-node-auth/tree/main/demo/express-angular-spa?title=awesome-node-auth%20Express%20%2B%20Angular%20SPA&startScript=start)

---

## Using your own database

All demos use `InMemoryUserStore` by default. To connect a real database, replace it with one of the ready-made stores:

| Database | Guide |
|----------|-------|
| SQLite | [docs/database/sqlite](/docs/database/sqlite) |
| MySQL | [docs/database/mysql](/docs/database/mysql) |
| PostgreSQL | [docs/database/postgresql](/docs/database/postgresql) |
| MongoDB | [docs/database/mongodb](/docs/database/mongodb) |

Copy the `.env.example` → `.env` (or `.env.local` for Next.js) and set `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and your database connection string.

:::tip In-memory data resets on restart
The in-memory store is ephemeral — all registered users are lost when the server restarts. This is intentional for the demos. In production, use a persistent database.
:::

## Related

- [Runnable Express authentication demo](/demo) — the same demo as copy-paste code to run locally
- [Node.js authentication quickstart](/docs/intro) — go from the demo to your own app
- [Express authentication](/docs/frameworks/express) — how the demo server is wired
- [Database-agnostic auth with IUserStore](/docs/database) — swap the in-memory store for a real database
