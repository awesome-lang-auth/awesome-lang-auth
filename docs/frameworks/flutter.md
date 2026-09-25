---
id: flutter
title: Flutter Authentication Client (and WASM)
description: >-
  Authenticate a Flutter app against awesome-node-auth with the official awesome_node_auth_flutter package, including secure token storage and WASM.
sidebar_label: Flutter / WASM
---

# Flutter & WASM Integration

:::tip Use the official Flutter package
**For new projects, use [`awesome_node_auth_flutter`](https://pub.dev/packages/awesome_node_auth_flutter)** — the official Flutter/Dart client for awesome-node-auth.

It handles:
- **Cookie + CSRF** automatically on web/WASM
- **Bearer token** automatically on native (iOS, Android, Desktop)
- Concurrent-refresh deduplication, session revocation, reactive state stream
- Zero token-management boilerplate

This page documents the official package. For the raw manual approach (no package), see the [Advanced / Bearer Token](/docs/advanced/bearer-token) guide.
:::

## Platform behaviour

| Platform | Auth mode | Token management | CSRF | WASM |
|----------|-----------|-----------------|------|------|
| Web | Cookie (HttpOnly) | Automatic | Auto-injected | ✅ |
| WASM | Cookie (HttpOnly) | Automatic | Auto-injected | ✅ |
| iOS | Bearer | Pluggable `TokenStorage` | n/a | n/a |
| Android | Bearer | Pluggable `TokenStorage` | n/a | n/a |
| Desktop | Bearer | Pluggable `TokenStorage` | n/a | n/a |

The package detects the platform at runtime — you do not choose the mode.

:::info Python backend
`awesome_node_auth_flutter` works with both the **Node.js** (`awesome-node-auth`) and the **Python** (`awesome-python-auth`) backends. Set `apiPrefix` to match your server's `api_prefix` (default `/api/auth` in Python vs `/auth` in Node.js). See the [Python / FastAPI guide](/docs/frameworks/python) for server-side setup.
:::

---

## Installation

```yaml
# pubspec.yaml
dependencies:
  awesome_node_auth_flutter: ^1.9.4
```

```bash
flutter pub get
```

---

## Setup

Create an `AuthClient` with `AuthOptions`:

```dart
import 'package:awesome_node_auth_flutter/awesome_node_auth_flutter.dart';

final auth = AuthClient(
  AuthOptions(
    apiPrefix: 'http://localhost:3000/auth',
    loginUrl: '/login',         // redirect after logout (headless: false)
    headless: true,             // true → you control routing manually
    initializeOnStartup: true,  // calls checkSession() before first frame
  ),
);
```

`initializeOnStartup: true` calls `checkSession()` automatically during initialization so the reactive state stream emits the current user before your first widget build.

---

## Reactive state — `StreamBuilder`

`auth.state.userStream` is a broadcast stream that **replays the current value** to new subscribers, making it safe to use in `StreamBuilder` without a flash of unauthenticated UI:

```dart
StreamBuilder<AuthUser?>(
  stream: auth.state.userStream,
  builder: (context, snapshot) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return const CircularProgressIndicator();
    }
    if (snapshot.data != null) {
      return HomeScreen(user: snapshot.data!);
    }
    return const LoginScreen();
  },
);
```

---

## Events

Subscribe to `auth.events` to react to auth lifecycle changes. This is the recommended integration point for GoRouter / AutoRoute redirects:

```dart
auth.events.listen((event) {
  switch (event.type) {
    case AuthEventType.loggedIn:
      router.go('/dashboard');
    case AuthEventType.loggedOut:
      router.go('/login');
    case AuthEventType.sessionExpired:
      router.go('/login');
    case AuthEventType.sessionRevoked:
      router.go('/login');
    case AuthEventType.tokenRefreshed:
      // optional — tokens refreshed silently
      break;
    case AuthEventType.userUpdated:
      // profile changed
      break;
  }
});
```

---

## Login + 2FA flow

```dart
// Simple login
final result = await auth.login(email, password);

if (result.success && !result.requires2fa) {
  // Logged in — auth.state.userStream emits the user automatically
  context.go('/dashboard');
} else if (result.requires2fa) {
  // 2FA required — navigate to the 2FA screen
  context.go('/2fa', extra: result);
} else if (result.requires2FASetup) {
  // 2FA enrollment required
  context.go('/2fa/setup', extra: result);
} else {
  showError(result.error ?? 'Login failed');
}
```

On the 2FA screen, `result.tempToken` and `result.availableMethods` are available to drive the UI.

---

## 2FA — TOTP

```dart
// ── Setup (generate QR code) ──────────────────────────────────────────────
final setup = await auth.setupTotp();
// setup.qrCodeUrl  → display in a QR widget
// setup.secret     → show as text fallback

// ── Verify during enrollment ──────────────────────────────────────────────
await auth.verifyTotp(totpCode);

// ── Validate during login 2FA step ───────────────────────────────────────
final loginResult = await auth.validate2fa(
  result.tempToken!,
  totpCode,
);
```

---

## 2FA — SMS OTP

```dart
// ── SMS login (passwordless) ──────────────────────────────────────────────
await auth.sendSmsLogin(email);

// Verify OTP code sent to the user's phone
final loginResult = await auth.verifySmsLogin(userId, otpCode);

// ── SMS 2FA (second factor during login) ─────────────────────────────────
// 1. First receive result.tempToken from auth.login()
await auth.send2faSms(result.tempToken!);

// 2. User receives OTP on their phone
final loginResult = await auth.validate2fa(
  result.tempToken!,
  otpCode,
  method: 'sms',
);
```

---

## 2FA — Magic Link

```dart
// ── Request magic link ────────────────────────────────────────────────────
await auth.sendMagicLink(email);

// ── Validate token from the link (deep link handler) ─────────────────────
final loginResult = await auth.verifyMagicLink(token);
```

---

## Password

```dart
// Change password (authenticated)
await auth.changePassword(currentPassword, newPassword);

// Request password reset (unauthenticated)
await auth.forgotPassword(email);

// Complete reset with token from email link
await auth.resetPassword(newPassword, resetToken);
```

---

## Email

```dart
// Request email change (authenticated)
await auth.requestEmailChange(newEmail);

// Confirm with token from email link
await auth.confirmEmailChange(confirmationToken);

// Resend verification email
await auth.resendVerificationEmail();

// Verify email address with token from email link
await auth.verifyEmail(verificationToken);
```

---

## Profile

```dart
// Get current user
final user = auth.state.currentUser; // sync, from cache

// Refresh from server
final user = await auth.fetchProfile();

// Update profile fields
await auth.updateProfile({'displayName': 'Alice', 'avatarUrl': '...'});
```

---

## Sessions

```dart
// List active sessions
final sessions = await auth.getActiveSessions();

// Revoke a specific session
await auth.revokeSession(sessionHandle);
```

---

## Account linking

```dart
// Initiate linking by sending an email to the other account
await auth.requestLinkingEmail(otherEmail, provider);

// Confirm the link using the token from the email
await auth.verifyLinkingToken(token, provider);

// List all linked providers
final accounts = await auth.getLinkedAccounts();

// Unlink a specific provider account
await auth.unlinkAccount(provider, providerAccountId);
```

---

## UI Config

Load backend feature flags to drive adaptive UI (e.g., hide magic-link button when the server has it disabled):

```dart
final config = await auth.loadUiConfig();
if (config?.magicLinkEnabled == true) {
  // Show magic-link option in the login screen
}
```

---

## Authenticated HTTP calls

`auth.httpClient` is a pre-configured HTTP client that automatically attaches the correct auth credentials (cookies on web, `Authorization: Bearer` on native) and transparently refreshes tokens on 401 responses:

```dart
// GET with automatic auth — no manual token handling needed
final response = await auth.httpClient.get(
  Uri.parse('https://api.example.com/todos'),
);

// POST with body
final response = await auth.httpClient.post(
  Uri.parse('https://api.example.com/todos'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'title': 'Buy milk'}),
);
```

---

## Custom `TokenStorage`

On native platforms the package stores tokens in memory by default. For persistence across restarts, provide a `TokenStorage` implementation backed by `flutter_secure_storage`:

:::note
`flutter_secure_storage` is **not** a dependency of `awesome_node_auth_flutter`. Add it yourself if you need persistent token storage on native.
:::

```yaml
# pubspec.yaml — add only for native persistence
dependencies:
  awesome_node_auth_flutter: ^1.9.4
  flutter_secure_storage: ^9.0.0
```

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:awesome_node_auth_flutter/awesome_node_auth_flutter.dart';

class SecureTokenStorage implements TokenStorage {
  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

// Pass to AuthOptions
final auth = AuthClient(
  AuthOptions(
    apiPrefix: 'http://localhost:3000/auth',
    tokenStorage: SecureTokenStorage(),
    headless: true,
  ),
);
```

---

## Comportamento interno — refresh e deduplicazione

- **Deduplicazione concorrente**: se più chiamate API ricevono un 401 contemporaneamente, il package esegue un solo refresh e mette in coda le altre fino al completamento.
- **`SESSION_REVOKED`**: se il server risponde con `{ code: "SESSION_REVOKED" }`, il package emette `AuthEventType.sessionRevoked` e non ritenta il refresh (evita loop infiniti).
- **Endpoint esclusi dal retry**: `/auth/login`, `/auth/register`, `/auth/refresh` non vengono mai ritentati dopo un 401.
- **Web vs nativo**: su web il refresh usa i cookie HttpOnly; su nativo invia il `refreshToken` nel corpo della richiesta.

---

## Headless mode

With `headless: true`, the package does **not** perform any automatic redirects. You control all navigation via the events stream — ideal with GoRouter or AutoRoute:

```dart
// main.dart
final auth = AuthClient(
  AuthOptions(
    apiPrefix: 'http://localhost:3000/auth',
    headless: true,
    initializeOnStartup: false, // call checkSession() manually
  ),
);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await auth.checkSession(); // restore session before first frame
  runApp(const MyApp());
}

// GoRouter redirect
redirect: (context, state) {
  final isAuth = auth.state.isAuthenticated;
  final isInit = auth.state.isInitialized;
  if (!isInit) return null; // still loading — don't redirect
  if (!isAuth && !publicPaths.contains(state.matchedLocation)) {
    return '/login';
  }
  return null;
},
```

---

## WASM

The package is fully WASM-compatible. Build with:

```bash
flutter build web --wasm
```

The package uses `package:web` and `package:http` exclusively — no `dart:html` or `dart:io` calls — so it compiles to WASM without modifications.

---

## AuthService wrapper (recommended)

For larger apps, wrap `AuthClient` in a singleton service to decouple it from the widget tree:

```dart
// lib/services/auth_service.dart
import 'package:awesome_node_auth_flutter/awesome_node_auth_flutter.dart';

class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  final AuthClient client = AuthClient(
    AuthOptions(
      apiPrefix: 'http://localhost:3000/auth',
      headless: true,
    ),
  );

  AuthState get state  => client.state;
  Stream<AuthEvent> get events => client.events;
}
```

```dart
// main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.instance.client.checkSession();
  runApp(const MyApp());
}
```

---

<details>
<summary>Migration from manual integration (previous approach)</summary>

The previous version of this page documented a manual integration using `flutter_secure_storage`, the `http` package, and the `X-Auth-Strategy: bearer` header. Below is a quick before/after comparison.

| Before (manual) | After (`awesome_node_auth_flutter`) |
|----------------|-------------------------------------|
| `http` + manual `X-Auth-Strategy: bearer` header | Handled automatically by the package |
| `flutter_secure_storage` for token persistence | Built-in `TokenStorage` interface; bring your own storage |
| Manual 401 retry with refresh | Built-in concurrent deduplication |
| No web/WASM support | Full web + WASM support via cookie mode |
| No reactive state | `auth.state.userStream` — replay stream |
| No event bus | `auth.events` — `AuthEventType` enum |

To migrate:
1. Add `awesome_node_auth_flutter: ^1.9.4` to `pubspec.yaml`.
2. Remove `http` and the manual `AuthService` if they were only used for auth.
3. Replace all `_bearerHeaders` / `_authedRequest` calls with `AuthClient` methods.
4. If you need persistent tokens on native, implement `TokenStorage` with `flutter_secure_storage` (see [Custom TokenStorage](#custom-tokenstorage) above).

</details>
