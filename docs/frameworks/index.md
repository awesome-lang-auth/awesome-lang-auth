---
id: frameworks
title: Framework Integrations for Node.js Auth
description: >-
  Where awesome-node-auth plugs in: Express, NestJS, Next.js and any Node HTTP framework on the server, plus Angular, React, Flutter, iOS and Android clients.
sidebar_position: 7
---

# Framework Integrations

awesome-node-auth works with any Node.js framework and any client platform. See the `examples/` directory for complete server-side implementations.

## Server-side frameworks

| Framework / Platform | Guide |
|----------------------|-------|
| [Express.js](/docs/frameworks/express) | Minimal setup, drop-in router |
| [NestJS](/docs/frameworks/nestjs) | Module, guard, controller, DI |
| [Next.js](/docs/frameworks/nextjs) | App Router, middleware & SSR |
| [Angular (SSR)](/docs/frameworks/angular) | Standalone + SSR, interceptors, guards (manual wiring) |
| [Python / FastAPI](/docs/frameworks/python) | **Official Python library** — `awesome-python-auth`; all auth flows, CSRF, IdP/RBAC, multi-tenancy |
| [Dart](/docs/frameworks/dart) | **Official Dart backend library** — `awesome-dart-auth` |
| [Go](/docs/frameworks/go) | **Official Go backend library** — `awesome-go-auth` |
| [AWS Lambda](/docs/frameworks/lambda) | **Deployable product (preview)** — `awesome-lambda-auth`; the Go core on Lambda and DynamoDB, in your own AWS account |
| [Rust](/docs/frameworks/rust) | **Official Rust backend library** — `awesome-rust-auth` |
| [Framework-Agnostic](/docs/frameworks/framework-agnostic) | Neutral `AuthRequest`/`AuthResponse` types + adapter pattern |

## Client-side platforms

| Platform | Guide |
|----------|-------|
| [Angular — ng-awesome-node-auth](/docs/frameworks/ng-awesome-node-auth) | **Official Angular library** — Guards, Interceptors, session signals, CSRF, SSR-safe; moves to `@awesome-lang-auth/angular` |
| [React](/docs/frameworks/react) | **Official React library (early, 0.1.0)** — `@awesome-lang-auth/react`; provider, hooks, route gates, cookie or bearer transport |
| [Vanilla JS / Browser Client](/docs/advanced/browser-client) | Zero-config `window.AwesomeNodeAuth` via `auth.js` — works with any JS framework |
| [Flutter](/docs/frameworks/flutter) | **Official Flutter package** — `awesome_node_auth_flutter`, moving to `awesome_flutter_auth`; web (cookie+CSRF), native (Bearer), WASM |
| [iOS (Swift)](/docs/frameworks/ios) | URLSession, Keychain, SwiftUI |
| [Android (Kotlin)](/docs/frameworks/android) | Retrofit, EncryptedSharedPreferences, Compose |

## Porting & parity status

The official ports and client libraries each track parity against this reference implementation, through a dedicated audit issue or a status table in their own repository. The audits are structured checklists covering the full feature surface (auth strategies, sessions, RBAC, multi-tenancy, IdP, events, admin panel, etc.) plus the documentation and release tasks needed to ship a parity-aligned version.

### Server-side ports

| Language | Repository | Parity status |
|---|---|---|
| Go | [`awesome-go-auth`](https://github.com/awesome-lang-auth/awesome-go-auth) | [audit #5](https://github.com/awesome-lang-auth/awesome-go-auth/issues/5) |
| AWS Lambda | [`awesome-lambda-auth`](https://github.com/awesome-lang-auth/awesome-lambda-auth) | [PROGRESS.md](https://github.com/awesome-lang-auth/awesome-lambda-auth/blob/main/docs/PROGRESS.md) |
| Rust | [`awesome-rust-auth`](https://github.com/awesome-lang-auth/awesome-rust-auth) | [parity snapshot](https://github.com/awesome-lang-auth/awesome-rust-auth#parity-snapshot-vs-awesome-node-auth) · [audit #13](https://github.com/awesome-lang-auth/awesome-rust-auth/issues/13) |
| Python | [`awesome-python-auth`](https://github.com/awesome-lang-auth/awesome-python-auth) | [audit #10](https://github.com/awesome-lang-auth/awesome-python-auth/issues/10) |
| Dart (server) | [`awesome-dart-auth`](https://github.com/awesome-lang-auth/awesome-dart-auth) | [parity snapshot](https://github.com/awesome-lang-auth/awesome-dart-auth#parity-snapshot-vs-awesome-node-auth) · [audit #13](https://github.com/awesome-lang-auth/awesome-dart-auth/issues/13) |

### Client libraries

| Framework | Repository | API parity audit |
|---|---|---|
| Angular | [`awesome-angular-auth`](https://github.com/awesome-lang-auth/awesome-angular-auth) | [audit #6](https://github.com/awesome-lang-auth/awesome-angular-auth/issues/6) |
| Flutter / Dart | [`awesome-flutter-auth`](https://github.com/awesome-lang-auth/awesome-flutter-auth) | [audit #19](https://github.com/awesome-lang-auth/awesome-flutter-auth/issues/19) |
