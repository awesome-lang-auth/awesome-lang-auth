---
id: angular
title: Angular SSR Authentication — Manual Wiring
description: >-
  Wire Angular to an awesome-node-auth backend by hand: HttpClient interceptors, route guards, CSRF headers and SSR-safe session bootstrapping.
sidebar_label: Angular (manual wiring)
---

:::tip Prefer the official Angular library
**For new projects, use [`ng-awesome-node-auth`](/docs/frameworks/ng-awesome-node-auth)** — the official Angular library that provides Guards, Interceptors, reactive session signals, CSRF support, and SSR wiring out of the box with a single `provideAuth()` call.

This page documents the **manual wiring approach** for teams that want full control over the Angular auth layer or need to integrate into an existing codebase.
:::

# Angular Integration — Manual Wiring (SSR)

This guide covers a **production-ready** Angular 17+ standalone application that integrates with awesome-node-auth. It includes:

- Cookie-based auth — awesome-node-auth manages **access token**, **refresh token**, and **CSRF token** automatically via HttpOnly cookies; no manual token storage needed
- HTTP interceptor with **CSRF header** support and **concurrent-refresh queue** (handles multiple simultaneous 401s)
- `authGuard`, `guestGuard`, `roleGuard`, and `canMatchGuard`
- `APP_INITIALIZER` for silent session restore on page reload
- Full **SSR** wiring that forwards browser cookies to the API server

:::info Cookie-based vs Bearer Token
By default, awesome-node-auth sets `accessToken`, `refreshToken`, and `csrf-token` as **HttpOnly cookies** on every login/refresh response. The Angular app does **not** need to read, store, or attach these tokens manually — the browser handles them automatically when `withCredentials: true` is set.

Bearer-token mode (where tokens are returned in the response body and managed manually) is intended for **native/mobile clients**. See the [Bearer Token](/docs/advanced/bearer-token) guide for that approach.
:::

## Project structure

```
src/app/
├── auth/
│   ├── auth.service.ts          # user state + login/logout/refresh
│   ├── auth.interceptor.ts      # CSRF header + handle 401 + refresh queue
│   ├── auth.guard.ts            # authGuard, guestGuard, roleGuard, canMatchGuard
│   ├── auth.initializer.ts      # APP_INITIALIZER – silent restore on reload
│   └── ssr-cookie.interceptor.ts  # SSR: forward browser cookies to API
├── app.config.ts                # browser providers
├── app.config.server.ts         # server-side providers (SSR)
├── app.routes.ts                # full route config
└── pages/
    ├── login/login.component.ts
    └── dashboard/dashboard.component.ts
```

---

## Installation

```bash
# Angular 17+ built-in SSR scaffold
ng new my-app --ssr
cd my-app

# or add SSR to an existing project
ng add @angular/ssr
```

---

## Step 1 — Auth Service

The service owns all user state. Because awesome-node-auth delivers tokens via **HttpOnly cookies**, the Angular app never reads or stores tokens directly — it simply calls the auth endpoints with `withCredentials: true` and fetches user data from `GET /auth/me`.

```typescript
// src/app/auth/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';

export interface AuthUser {
  sub: string;
  email: string;
  role?: string;
  tenantId?: string;
  /** Additional custom claims added via `config.buildTokenPayload`. */
  [key: string]: unknown;
}

/** Shape returned by GET /auth/sessions (requires ISessionStore on the server). */
export interface SessionInfo {
  sessionHandle: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date | string;
  lastActiveAt?: Date | string;
  expiresAt?: Date | string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private _user$ = new BehaviorSubject<AuthUser | null>(null);

  readonly user$ = this._user$.asObservable();

  get currentUser(): AuthUser | null { return this._user$.value; }
  get isLoggedIn(): boolean          { return this._user$.value !== null; }

  // ── Login ──────────────────────────────────────────────────────────────────
  // awesome-node-auth sets accessToken + refreshToken + csrf-token cookies on success.
  // We then call /auth/me to get the current user's profile.

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<void>('/auth/login', { email, password }, { withCredentials: true })
      .pipe(switchMap(() => this.fetchCurrentUser()));
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  logout(): Observable<void> {
    return this.http
      .post<void>('/auth/logout', {}, { withCredentials: true })
      .pipe(
        tap(() => this._user$.next(null)),
        catchError(() => { this._user$.next(null); return of(void 0); }),
      );
  }

  // ── Refresh ────────────────────────────────────────────────────────────────
  // The refreshToken HttpOnly cookie is sent automatically — no manual token
  // handling required.  After a successful refresh, new cookies are set and
  // we re-fetch the user profile.

  refresh(): Observable<AuthUser> {
    return this.http
      .post<void>('/auth/refresh', {}, { withCredentials: true })
      .pipe(switchMap(() => this.fetchCurrentUser()));
  }

  // ── Silent restore (called by APP_INITIALIZER) ─────────────────────────────
  // Tries to silently refresh the session using the stored refresh cookie.
  // Returns true on success, false if no valid session exists.

  tryRestoreSession(): Observable<boolean> {
    return this.refresh().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  // ── Fetch current user ─────────────────────────────────────────────────────

  fetchCurrentUser(): Observable<AuthUser> {
    return this.http
      .get<AuthUser>('/auth/me', { withCredentials: true })
      .pipe(tap((user) => this._user$.next(user)));
  }

  // ── Active sessions (device management) ───────────────────────────────────
  // Lists all active sessions for the current user ("Manage devices" screen).
  // Requires ISessionStore configured on the server.

  getActiveSessions(): Observable<SessionInfo[]> {
    return this.http
      .get<{ sessions: SessionInfo[] }>('/auth/sessions', { withCredentials: true })
      .pipe(map(res => res.sessions));
  }

  /** Revoke a specific session by handle (removes from store + logs out that device). */
  revokeSession(sessionHandle: string): Observable<void> {
    return this.http
      .delete<void>(`/auth/sessions/${encodeURIComponent(sessionHandle)}`, { withCredentials: true });
  }
}
```

---

## Step 2 — HTTP Interceptor (CSRF + refresh queue)

node-auth uses the **double-submit cookie pattern** for CSRF protection when `csrf.enabled` is `true`. The `csrf-token` cookie is readable by JavaScript (not HttpOnly). In awesome-node-auth v1.3+, the cookie is prefixed with `__Host-` (or `__Secure-`) when `cookieOptions.secure` is `true` to prevent cookie-tossing attacks. The interceptor reads the cookie (checking all three name variants in priority order) and sends it as an `X-CSRF-Token` header on **POST, PUT, PATCH, and DELETE** requests.

A naive interceptor that simply retries on 401 breaks when **multiple requests fire concurrently** — each would trigger its own refresh call, causing race conditions.  
The implementation below uses a **refresh queue**: the first 401 starts a single refresh; all subsequent 401s wait for that same refresh to complete.

```typescript
// src/app/auth/auth.interceptor.ts
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, throwError, Observable } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Module-level state so the queue survives across calls
let isRefreshing          = false;
const refreshDone$        = new BehaviorSubject<boolean>(false);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const auth = inject(AuthService);

  // Add X-CSRF-Token header to state-changing requests (CSRF double-submit pattern)
  const modified = addCsrfHeader(req);

  return next(modified).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('/auth/refresh')) {
        return throwError(() => err);
      }
      // SESSION_REVOKED is a permanent failure — the server has killed the
      // session, so attempting a refresh would only waste a round-trip and
      // could cause a loop.  Force an immediate local logout instead.
      if ((err.error as { code?: string } | null)?.code === 'SESSION_REVOKED') {
        auth.logout().subscribe();
        return throwError(() => err);
      }
      return handle401(req, next, auth);
    }),
  );
};

// ── CSRF header ───────────────────────────────────────────────────────────────

function addCsrfHeader(req: HttpRequest<unknown>): HttpRequest<unknown> {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return req;
  const token = getCsrfCookie();
  if (!token) return req;
  return req.clone({ setHeaders: { 'X-CSRF-Token': token } });
}

function getCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  // awesome-node-auth v1.3+ uses __Host- / __Secure- prefixes for cookie-tossing protection.
  // Check all three names in priority order so this works in both dev and production.
  const names = ['__Host-csrf-token', '__Secure-csrf-token', 'csrf-token'];
  for (const name of names) {
    const val = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1];
    if (val) return decodeURIComponent(val);
  }
  return null;
}

// ── 401 handler with queue ────────────────────────────────────────────────────

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
): Observable<unknown> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshDone$.next(false);

    return auth.refresh().pipe(
      switchMap(() => {
        isRefreshing = false;
        refreshDone$.next(true);     // unblock queued requests
        return next(addCsrfHeader(req));
      }),
      catchError((refreshErr) => {
        isRefreshing = false;
        refreshDone$.next(false);
        auth.logout().subscribe();
        return throwError(() => refreshErr);
      }),
    );
  }

  // Another refresh is already in-flight — wait for it to complete
  return refreshDone$.pipe(
    filter((done) => done === true),
    take(1),
    switchMap(() => next(addCsrfHeader(req))),
  );
}
```

---

## Step 3 — Guards

### `authGuard` — require login

```typescript
// src/app/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

/** Redirect unauthenticated users to /login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  return auth.user$.pipe(
    take(1),
    map((user) =>
      user ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};

/** Same check for canMatch (lazy-loaded feature modules). */
export const authCanMatch: CanMatchFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  return auth.user$.pipe(
    take(1),
    map((user): boolean | UrlTree => user ? true : router.createUrlTree(['/login'])),
  );
};
```

### `guestGuard` — redirect already-logged-in users away from /login

```typescript
/** Redirect authenticated users away from the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  return auth.user$.pipe(
    take(1),
    map((user) => user ? router.createUrlTree(['/dashboard']) : true),
  );
};
```

### `roleGuard` — role-based access control

```typescript
/** Require a specific role. Usage: canActivate: [roleGuard('admin')] */
export function roleGuard(requiredRole: string): CanActivateFn {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    return auth.user$.pipe(
      take(1),
      map((user): boolean | UrlTree => {
        if (!user)            return router.createUrlTree(['/login']);
        if (user.role !== requiredRole) return router.createUrlTree(['/403']);
        return true;
      }),
    );
  };
}
```

---

## Step 4 — Route Configuration

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, authCanMatch, guestGuard, roleGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Public — redirect to /dashboard if already logged in
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component'),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.component'),
  },

  // Protected — requires authentication
  {
    path: 'dashboard',
    canActivate: [authGuard],
    canMatch:    [authCanMatch],
    loadComponent: () => import('./pages/dashboard/dashboard.component'),
  },

  // Protected — requires admin role
  {
    path: 'admin',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  { path: '403', loadComponent: () => import('./pages/forbidden/forbidden.component') },
  { path: '**',  loadComponent: () => import('./pages/not-found/not-found.component') },
];
```

---

## Step 5 — APP_INITIALIZER (silent session restore)

When the user reloads the page, the `AuthService` user state is lost, but the **refresh token HttpOnly cookie** is still in the browser. `APP_INITIALIZER` runs before the app renders, calls `POST /auth/refresh` (which sets fresh cookies server-side), then fetches the user profile so the user stays logged in.

```typescript
// src/app/auth/auth.initializer.ts
import { inject } from '@angular/core';
import { APP_INITIALIZER, EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from './auth.service';

function initializeAuth(auth: AuthService, platformId: object) {
  return () => {
    // Skip on server — the SSR context handles its own auth (see Step 7)
    if (!isPlatformBrowser(platformId)) return Promise.resolve();
    return auth.tryRestoreSession().toPromise();
  };
}

/** Drop this into the `providers` array of `appConfig`. */
export function provideAuthInitializer(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService, platformId: object) => initializeAuth(auth, platformId),
      deps: [AuthService, PLATFORM_ID],
      multi: true,
    },
  ]);
}
```

---

## Step 6 — App Configuration (browser)

```typescript
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { authInterceptor } from './auth/auth.interceptor';
import { provideAuthInitializer } from './auth/auth.initializer';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(
      withFetch(),                          // required for SSR — uses native fetch
      withInterceptors([authInterceptor]),
    ),
    provideAuthInitializer(),
  ],
};
```

---

## Step 7 — SSR Wiring

### `app.config.server.ts`

```typescript
// src/app/app.config.server.ts
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { appConfig } from './app.config';
import { ssrCookieInterceptor } from './auth/ssr-cookie.interceptor';
import { authInterceptor } from './auth/auth.interceptor';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    // Override HttpClient for SSR: add the cookie-forwarding interceptor
    provideHttpClient(
      withFetch(),
      withInterceptors([ssrCookieInterceptor, authInterceptor]),
    ),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

### `src/server.ts` (Express wrapper for SSR)

```typescript
// src/server.ts  (generated by ng add @angular/ssr, shown for reference)
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './main.server';

export function app(): express.Express {
  const server  = express();
  const __dir   = dirname(fileURLToPath(import.meta.url));
  const browser = resolve(__dir, '../browser');

  server.set('view engine', 'html');
  server.set('views', browser);
  server.use(express.static(browser, { maxAge: '1y' }));

  const engine = new CommonEngine();

  server.get('**', (req, res, next) => {
    engine
      .render({
        bootstrap,
        documentFilePath: join(browser, 'index.html'),
        url: req.originalUrl,
        publicPath: browser,
        providers: [
          { provide: APP_BASE_HREF, useValue: req.baseUrl },
          // Pass the incoming request so the SSR cookie interceptor can forward cookies
          { provide: 'REQUEST',  useValue: req },
          { provide: 'RESPONSE', useValue: res },
        ],
      })
      .then((html) => res.send(html))
      .catch(next);
  });

  return server;
}
```

### `ssr-cookie.interceptor.ts` — forward browser cookies to the API

During SSR, `withCredentials: true` has no effect because there is no browser cookie jar. Instead, this interceptor reads the `Cookie` header from the incoming Express `Request` and forwards it to every outgoing API call, so the awesome-node-auth server receives the user's auth cookies correctly.

```typescript
// src/app/auth/ssr-cookie.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID, InjectionToken } from '@angular/core';
import { isPlatformServer } from '@angular/common';

export const REQUEST = new InjectionToken<{ headers?: { cookie?: string } }>('REQUEST');

export const ssrCookieInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const request    = inject(REQUEST, { optional: true });

  if (!isPlatformServer(platformId) || !request) {
    return next(req);
  }

  const cookieHeader = request.headers?.cookie;
  if (!cookieHeader) return next(req);

  // Forward the browser's cookies verbatim so awesome-node-auth can read them server-side
  return next(req.clone({ setHeaders: { Cookie: cookieHeader } }));
};
```

---

## Step 8 — Page Components

### Login

```typescript
// src/app/pages/login/login.component.ts
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="email"    type="email"    placeholder="Email"    autocomplete="email" />
      <input formControlName="password" type="password" placeholder="Password" autocomplete="current-password" />
      <p *ngIf="error" class="error">{{ error }}</p>
      <button type="submit" [disabled]="form.invalid || loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  `,
})
export default class LoginComponent {
  private auth  = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private fb     = inject(FormBuilder);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  loading = false;
  error   = '';

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error   = '';
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (e) => {
        this.error   = e.error?.message ?? 'Login failed';
        this.loading = false;
      },
    });
  }
}
```

### Register

```typescript
// src/app/pages/register/register.component.ts
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="name"     type="text"     placeholder="Full name" />
      <input formControlName="email"    type="email"    placeholder="Email" />
      <input formControlName="password" type="password" placeholder="Password" />
      <p *ngIf="error" class="error">{{ error }}</p>
      <button type="submit" [disabled]="form.invalid || loading">
        {{ loading ? 'Creating account…' : 'Create account' }}
      </button>
    </form>
  `,
})
export default class RegisterComponent {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private fb     = inject(FormBuilder);

  form = this.fb.group({
    name:     ['', Validators.required],
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  loading = false;
  error   = '';

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.http.post('/auth/register', this.form.value).subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: (e) => { this.error = e.error?.message ?? 'Registration failed'; this.loading = false; },
    });
  }
}
```

### Navbar with logout

```typescript
// src/app/components/navbar/navbar.component.ts
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AsyncPipe, NgIf } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [RouterLink, AsyncPipe, NgIf],
  template: `
    <nav>
      <a routerLink="/">Home</a>
      <ng-container *ngIf="auth.user$ | async as user; else guestLinks">
        <span>{{ user.email }}</span>
        <button (click)="logout()">Logout</button>
      </ng-container>
      <ng-template #guestLinks>
        <a routerLink="/login">Sign in</a>
        <a routerLink="/register">Register</a>
      </ng-template>
    </nav>
  `,
})
export class NavbarComponent {
  readonly auth   = inject(AuthService);
  private  router = inject(Router);

  logout() {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
```

---

## Step 9 — TOTP / 2FA flow

When the server responds with `{ requiresTwoFactor: true, tempToken, available2faMethods }` on login, store the `tempToken` and show the TOTP input. Then call `/auth/2fa/verify` with the TOTP code.

```typescript
// auth.service.ts — extend login() to handle 2FA
interface TwoFactorChallenge {
  requiresTwoFactor: true;
  tempToken: string;
  available2faMethods: string[];
}

login(email: string, password: string): Observable<AuthUser | TwoFactorChallenge> {
  return this.http
    .post<{ requiresTwoFactor?: boolean; tempToken?: string; available2faMethods?: string[] }>(
      '/auth/login', { email, password }, { withCredentials: true },
    )
    .pipe(
      switchMap((res) => {
        if (res.requiresTwoFactor) {
          return of(res as TwoFactorChallenge);
        }
        // Cookies set by awesome-node-auth — fetch the user profile
        return this.fetchCurrentUser();
      }),
    );
}

verify2FA(tempToken: string, totpCode: string): Observable<AuthUser> {
  return this.http
    .post<void>('/auth/2fa/verify', { tempToken, totpCode }, { withCredentials: true })
    .pipe(switchMap(() => this.fetchCurrentUser()));
}
```

---

## Summary: what each piece does

| File | Role |
|------|------|
| `auth.service.ts` | Single source of truth for user state; no token storage — cookies are managed by the browser |
| `auth.interceptor.ts` | Adds `X-CSRF-Token` header to state-changing requests; handles 401 with a refresh queue |
| `auth.guard.ts` | `authGuard` (login required), `guestGuard` (redirect if logged in), `roleGuard(role)` (RBAC), `authCanMatch` (lazy modules) |
| `auth.initializer.ts` | `APP_INITIALIZER` — silent refresh on page reload |
| `ssr-cookie.interceptor.ts` | SSR only: forwards the browser's `Cookie` header to the API server |
| `app.config.ts` | Registers `provideHttpClient(withFetch(), withInterceptors([...]))` |
| `app.config.server.ts` | Adds `provideServerRendering()` and the SSR cookie interceptor |
| `server.ts` | Express wrapper — injects `REQUEST`/`RESPONSE` tokens so the SSR interceptor can read cookies |

:::tip SSR and absolute URLs
When Angular runs on the server it uses Node.js `fetch` which cannot resolve relative paths like `/auth/login`. Configure a base URL in the server config:
```typescript
// app.config.server.ts — add to providers:
{ provide: 'BASE_URL', useValue: 'http://localhost:4000' }
```
Then prefix all API calls in `AuthService` with this token when `isPlatformServer()` is true.
:::
