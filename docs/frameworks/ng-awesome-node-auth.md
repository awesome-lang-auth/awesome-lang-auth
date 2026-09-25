---
id: ng-awesome-node-auth
title: "Angular Auth Library: ng-awesome-node-auth"
description: >-
  The official Angular library for awesome-node-auth: guards, HttpClient interceptors, reactive session signals, CSRF support and SSR hydration.
sidebar_label: Angular (ng-awesome-node-auth)
---

# Angular Integration — `ng-awesome-node-auth`

`ng-awesome-node-auth` is the official Angular library for frontends backed by `awesome-node-auth`. It provides Guards, Interceptors, reactive session signals, CSRF support, and optional UI theme synchronization — all tree-shakable and SSR-safe.

:::info Why not use auth.js?
`auth.js` (the built-in browser client) uses plain `fetch()` intercept and global `window` APIs that are not compatible with Angular's `HttpClient` pipeline, zone.js change detection, or SSR hydration. Use `ng-awesome-node-auth` instead.
:::

---

## Installation

```bash
npm install ng-awesome-node-auth
```

---

## Quick start

### 1 — Configure providers (`app.config.ts`)

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAuth, provideAuthUi } from 'ng-awesome-node-auth';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),

    // Core auth — adds session management, HTTP interceptor, and CSRF support
    provideAuth({ apiPrefix: '/api/auth' }),

    // Optional — fetches backend feature flags and keeps CSS theme in sync with the admin panel
    provideAuthUi(),
  ],
};
```

### 2 — Protect routes (`app.routes.ts`)

```typescript
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from 'ng-awesome-node-auth';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard],  // redirect to /dashboard if already authenticated
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],   // redirect to /login if not authenticated
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
];
```

### 3 — Use session signals in components

```typescript
import { Component, inject } from '@angular/core';
import { AuthService } from 'ng-awesome-node-auth';

@Component({
  selector: 'app-dashboard',
  template: `
    <div *ngIf="auth.isAuthenticated()">
      <p>Welcome, {{ auth.user()?.email }}!</p>
      <button (click)="logout()">Logout</button>
    </div>
  `,
})
export class DashboardComponent {
  auth = inject(AuthService);

  logout() {
    this.auth.logout().subscribe();
  }
}
```

---

## `provideAuth(config)` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiPrefix` | `string` | `'/auth'` | Base URL of the `awesome-node-auth` REST API |

### What `provideAuth()` does

1. Registers `AuthService` (session signals, login/logout/refresh)
2. Injects the **HTTP interceptor** that:
   - Reads `__Host-csrf-token` → `__Secure-csrf-token` → `csrf-token` in order (cookie-tossing protection)
   - Adds `X-CSRF-Token` header to every `POST` / `PUT` / `PATCH` / `DELETE` request
   - Queues concurrent 401 responses behind a single token-refresh attempt
   - Calls `auth.logout()` when refresh fails

---

## `AuthService` API

```typescript
// Injected via inject(AuthService) or constructor injection

// ── Reactive signals ────────────────────────────────────────────────────
user(): AuthUser | null           // current user or null
isAuthenticated(): boolean        // true when user is logged in
isInitialized(): boolean          // true after the first checkSession() completes

// ── Methods ─────────────────────────────────────────────────────────────
checkSession(): Observable<AuthUser | null>   // GET /auth/me — restores session on page reload
login(email, password): Observable<LoginResult>
logout(): Observable<void>
refreshToken(): Observable<void>   // POST /auth/refresh — usually called automatically by interceptor

// Returned by login() when 2FA is required
interface LoginResult {
  success: boolean;
  requires2fa?: boolean;
  tempToken?: string;
  availableMethods?: string[];
  error?: string;
}
```

### Session restore on app startup (`APP_INITIALIZER`)

```typescript
import { APP_INITIALIZER, inject } from '@angular/core';
import { AuthService } from 'ng-awesome-node-auth';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const authInitializer = {
  provide: APP_INITIALIZER,
  useFactory: () => {
    const auth = inject(AuthService);
    return () => firstValueFrom(auth.checkSession().pipe(catchError(() => of(null))));
  },
  multi: true,
};
```

---

## Guards

| Guard | Behaviour |
|-------|-----------|
| `authGuard` | Redirect to `/login` if not authenticated |
| `guestGuard` | Redirect to `/dashboard` if already authenticated |

Both guards call `checkSession()` if the session has not been initialized yet.

---

## CSRF protection

The built-in interceptor reads the CSRF token **in priority order** to guard against cookie-tossing attacks:

```
__Host-csrf-token  (most secure — requires Secure + Path=/ + no Domain)
__Secure-csrf-token
csrf-token         (plain — development / non-HTTPS)
```

This matches the prefix selection logic in `awesome-node-auth`'s `TokenService`, which applies `__Host-` automatically when `cookieOptions.secure: true` (default in production).

No manual CSRF setup is needed. Enable it on the server:

```typescript
const authConfig: AuthConfig = {
  csrf: { enabled: true },
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
};
```

---

## `provideAuthUi()` — Theme synchronization

When included, `provideAuthUi()` registers `UiConfigService`, which:

1. Fetches `GET /auth/ui/config` on startup to retrieve backend feature flags and theme
2. Syncs CSS variables (primary colour, background, etc.) with the running Angular app in real time — useful when the admin panel changes the theme

### Feature flags

```typescript
import { inject } from '@angular/core';
import { UiConfigService } from 'ng-awesome-node-auth';

@Component({ /* … */ })
export class NavComponent {
  uiConfig = inject(UiConfigService);

  // Feature flags mirror what awesome-node-auth has configured on the backend
  showRegister    = this.uiConfig.hasFeature('register');
  showMagicLink   = this.uiConfig.hasFeature('magicLink');
  showForgotPw    = this.uiConfig.hasFeature('forgotPassword');
  showGoogleLogin = this.uiConfig.hasFeature('google');
  showGithubLogin = this.uiConfig.hasFeature('github');
  show2FA         = this.uiConfig.hasFeature('twoFactor');
}
```

---

## Full example — login component

```typescript
// src/app/pages/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'ng-awesome-node-auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form (ngSubmit)="submit()">
      <input type="email"    [(ngModel)]="email"    name="email"    required />
      <input type="password" [(ngModel)]="password" name="password" required />
      <button type="submit" [disabled]="loading()">Login</button>
      <p *ngIf="error()">{{ error() }}</p>
    </form>

    <!-- 2FA challenge -->
    <div *ngIf="requires2fa()">
      <input type="text" [(ngModel)]="otpCode" placeholder="Enter OTP" />
      <button (click)="submit2fa()">Confirm</button>
    </div>
  `,
})
export class LoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  email    = '';
  password = '';
  otpCode  = '';

  loading    = signal(false);
  error      = signal<string | null>(null);
  requires2fa = signal(false);
  tempToken  = signal<string | null>(null);

  submit() {
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.email, this.password).subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.requires2fa) {
          this.requires2fa.set(true);
          this.tempToken.set(result.tempToken ?? null);
        } else if (result.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.error.set(result.error ?? 'Login failed');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('An unexpected error occurred');
      },
    });
  }

  submit2fa() {
    // POST /auth/2fa/totp/validate { tempToken, code }
    // handled by your own HTTP call or a future AuthService method
  }
}
```

---

## SSR wiring

`ng-awesome-node-auth` is SSR-safe. The `AuthService` and `UiConfigService` use Angular's `isPlatformBrowser` checks internally to avoid calling browser-only APIs during server-side rendering.

For SSR apps, forward the browser's cookies to the API server in `app.config.server.ts`:

```typescript
// src/app/auth/ssr-cookie.interceptor.ts
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { REQUEST } from '@angular/core';

export const ssrCookieInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformServer(platformId)) return next(req);

  const request = inject(REQUEST, { optional: true });
  const cookies  = request?.headers?.get('cookie') ?? '';
  if (!cookies) return next(req);

  return next(req.clone({ setHeaders: { Cookie: cookies } }));
};
```

```typescript
// src/app/app.config.server.ts
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRoutesConfig } from '@angular/ssr';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { ssrCookieInterceptor } from './auth/ssr-cookie.interceptor';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRoutesConfig(serverRoutes),
    // Use withInterceptors (functional interceptors — same style as provideAuth())
    provideHttpClient(withFetch(), withInterceptors([ssrCookieInterceptor])),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

---

## Breaking SSR routing loops

When Angular SSR handles all routes, an unauthenticated hit to `/dashboard` triggers a guard redirect to `/login`. If `/login` is also an Angular route, this can cause redirect loops.

**Solution:** intercept auth paths in the Express server before the Angular engine:

```typescript
// server.ts
const authPages = ['login', 'register', 'forgot-password', 'reset-password', '2fa', 'verify-email'];

authPages.forEach(page => {
  // Redirect Angular routes to the backend-served UI pages
  app.get(`/${page}`, (req, res) => {
    const qs = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
    res.redirect(`/api/auth/ui/${page}${qs}`);
  });
});
```

> Alternatively, remove those paths from Angular's routes entirely and let `awesome-node-auth`'s built-in UI handle them.

---

## Preventing Angular build hangs

When `ng build` imports your server module for route extraction, your `app.listen()` call would hang the build. Fix:

```typescript
import { isMainModule } from '@angular/ssr/node';

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] ?? 4200;
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
}
```

---

## Full-stack wiring — reference architecture

```
Browser / SSR
 └─ Angular App
     ├─ provideAuth({ apiPrefix: '/api/auth' })  ← ng-awesome-node-auth
     ├─ authGuard / guestGuard
     └─ AuthService.user() / isAuthenticated()

Express Server
 ├─ GET /api/auth/*   ← awesome-node-auth REST API
 ├─ GET /api/auth/ui/*← awesome-node-auth Built-in UI (optional)
 ├─ GET /admin/auth/* ← awesome-node-auth Admin Panel (optional)
 └─ **               ← Angular SSR engine
```

---

## Links

- **npm**: [`ng-awesome-node-auth`](https://www.npmjs.com/package/ng-awesome-node-auth)
- **GitHub**: [nik2208/ng-awesome-node-auth](https://github.com/nik2208/ng-awesome-node-auth)
- **Backend docs**: [Built-in UI guide](/docs/advanced/built-in-ui) · [Browser Client](/docs/advanced/browser-client)
- **Manual Angular wiring** (without the library): [Angular (manual)](/docs/frameworks/angular)
