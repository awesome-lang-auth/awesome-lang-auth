---
id: frameworks
title: Framework Integrations for Node.js Auth
description: >-
  Where awesome-node-auth plugs in: Express, NestJS, Next.js and any Node HTTP framework on the server, plus Angular, Flutter, iOS and Android clients.
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
| [Rust](/docs/frameworks/rust) | **Official Rust backend library** — `awesome-rust-auth` |
| [Go](https://github.com/nik2208/awesome-go-auth) | **Official Go backend library** — `awesome-go-auth` |
| [Framework-Agnostic](/docs/frameworks/framework-agnostic) | Neutral `AuthRequest`/`AuthResponse` types + adapter pattern |

## Client-side platforms

| Platform | Guide |
|----------|-------|
| [Angular — ng-awesome-node-auth](/docs/frameworks/ng-awesome-node-auth) | **Official Angular library** — Guards, Interceptors, session signals, CSRF, SSR-safe |
| [Vanilla JS / Browser Client](/docs/advanced/browser-client) | Zero-config `window.AwesomeNodeAuth` via `auth.js` — works with any JS framework |
| [Flutter](/docs/frameworks/flutter) | **Official Flutter package** — `awesome_node_auth_flutter`; web (cookie+CSRF), native (Bearer), WASM |
| [iOS (Swift)](/docs/frameworks/ios) | URLSession, Keychain, SwiftUI |
| [Android (Kotlin)](/docs/frameworks/android) | Retrofit, EncryptedSharedPreferences, Compose |

## Porting & parity status

The official ports and client libraries each track parity against this reference implementation via a dedicated audit issue. The audits are structured checklists covering the full feature surface (auth strategies, sessions, RBAC, multi-tenancy, IdP, events, admin panel, etc.) plus the documentation and release tasks needed to ship a parity-aligned version.

### Server-side ports

| Language | Repository | Parity audit |
|---|---|---|
| Go | [`awesome-go-auth`](https://github.com/nik2208/awesome-go-auth) | [audit #5](https://github.com/nik2208/awesome-go-auth/issues/5) |
| Rust | [`awesome-rust-auth`](https://github.com/nik2208/awesome-rust-auth) | [audit #13](https://github.com/nik2208/awesome-rust-auth/issues/13) |
| Python | [`awesome-python-auth`](https://github.com/nik2208/awesome-python-auth) | [audit #10](https://github.com/nik2208/awesome-python-auth/issues/10) |
| Dart (server) | [`awesome-dart-auth`](https://github.com/nik2208/awesome-dart-auth) | [audit #13](https://github.com/nik2208/awesome-dart-auth/issues/13) |

### Client libraries

| Framework | Repository | API parity audit |
|---|---|---|
| Angular | [`ng-awesome-node-auth`](https://github.com/nik2208/ng-awesome-node-auth) | [audit #6](https://github.com/nik2208/ng-awesome-node-auth/issues/6) |
| Flutter / Dart | [`awesome-node-auth-flutter`](https://github.com/nik2208/awesome-node-auth-flutter) | [audit #19](https://github.com/nik2208/awesome-node-auth-flutter/issues/19) |
