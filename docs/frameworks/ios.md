---
id: ios
title: iOS Swift Authentication with Keychain
description: >-
  Call an awesome-node-auth backend from iOS with URLSession, store access and refresh tokens in the Keychain, and refresh them transparently.
sidebar_label: iOS (Swift)
---

# iOS Integration (Swift)

This guide shows how to integrate your awesome-node-auth backend in an iOS app using `URLSession` and Apple's **Keychain** for secure token storage.

## Step 1 — Keychain Helper

Store tokens in the Keychain, which is encrypted by the Secure Enclave and wiped when the app is uninstalled.

```swift
// Sources/Auth/KeychainHelper.swift
import Foundation
import Security

enum KeychainHelper {
    private static let service = Bundle.main.bundleIdentifier ?? "com.myapp"

    static func save(_ value: String, forKey key: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String:            kSecClassGenericPassword,
            kSecAttrService as String:      service,
            kSecAttrAccount as String:      key,
            kSecValueData as String:        data,
            kSecAttrAccessible as String:   kSecAttrAccessibleAfterFirstUnlock,
        ]
        SecItemDelete(query as CFDictionary)            // remove any existing item
        SecItemAdd(query as CFDictionary, nil)
    }

    static func load(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String:            kSecClassGenericPassword,
            kSecAttrService as String:      service,
            kSecAttrAccount as String:      key,
            kSecReturnData as String:       true,
            kSecMatchLimit as String:       kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
```

## Step 2 — Auth Service

:::info Bearer mode required
iOS is a native client and cannot use browser cookies. The `X-Auth-Strategy: bearer` header must be sent on all token-issuing requests (`/auth/login`, `/auth/refresh`, etc.) so the server returns tokens in the JSON body.
:::

```swift
// Sources/Auth/AuthService.swift
import Foundation

struct AuthTokens: Decodable {
    let accessToken:  String
    let refreshToken: String
}

struct JwtUser: Decodable {
    let sub:      String
    let email:    String
    let role:     String
    let tenantId: String?
}

actor AuthService {
    static let shared = AuthService()

    private let baseURL = URL(string: "https://your-api.example.com")!
    private let accessKey  = "access_token"
    private let refreshKey = "refresh_token"

    // MARK: – Token accessors

    var accessToken: String?  { KeychainHelper.load(forKey: accessKey) }
    var refreshToken: String? { KeychainHelper.load(forKey: refreshKey) }

    private func saveTokens(_ tokens: AuthTokens) {
        KeychainHelper.save(tokens.accessToken,  forKey: accessKey)
        KeychainHelper.save(tokens.refreshToken, forKey: refreshKey)
    }

    func clearTokens() {
        KeychainHelper.delete(forKey: accessKey)
        KeychainHelper.delete(forKey: refreshKey)
    }

    // MARK: – Login

    func login(email: String, password: String) async throws -> AuthTokens {
        var request = URLRequest(url: baseURL.appendingPathComponent("/auth/login"))
        request.httpMethod  = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("bearer", forHTTPHeaderField: "X-Auth-Strategy")
        request.httpBody    = try JSONEncoder().encode(["email": email, "password": password])

        let (data, _) = try await URLSession.shared.data(for: request)
        let tokens = try JSONDecoder().decode(AuthTokens.self, from: data)
        saveTokens(tokens)
        return tokens
    }

    // MARK: – Logout

    func logout() async throws {
        var request = URLRequest(url: baseURL.appendingPathComponent("/auth/logout"))
        request.httpMethod = "POST"
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        _ = try? await URLSession.shared.data(for: request)
        clearTokens()
    }

    // MARK: – Refresh
    func refresh() async throws -> String {
        guard let rt = refreshToken else { throw AuthError.notAuthenticated }
        var request = URLRequest(url: baseURL.appendingPathComponent("/auth/refresh"))
        request.httpMethod  = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("bearer", forHTTPHeaderField: "X-Auth-Strategy")
        request.httpBody    = try JSONEncoder().encode(["refreshToken": rt])

        let (data, _) = try await URLSession.shared.data(for: request)
        struct RefreshResponse: Decodable { let accessToken: String; let refreshToken: String }
        let res = try JSONDecoder().decode(RefreshResponse.self, from: data)
        KeychainHelper.save(res.accessToken,  forKey: accessKey)
        KeychainHelper.save(res.refreshToken, forKey: refreshKey)
        return res.accessToken
    }

    // MARK: – Authenticated request helper

    func request(
        path: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> Data {
        var token = accessToken ?? (try await refresh())

        func makeRequest(with bearerToken: String) throws -> URLRequest {
            var req = URLRequest(url: baseURL.appendingPathComponent(path))
            req.httpMethod = method
            req.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if let body {
                req.httpBody = try JSONEncoder().encode(body)
            }
            return req
        }

        let (data, response) = try await URLSession.shared.data(for: makeRequest(with: token))

        if (response as? HTTPURLResponse)?.statusCode == 401 {
            token = try await refresh()   // one refresh attempt
            let (retryData, _) = try await URLSession.shared.data(for: makeRequest(with: token))
            return retryData
        }
        return data
    }

    // MARK: – Profile

    func getProfile() async throws -> JwtUser {
        let data = try await request(path: "/auth/me")
        return try JSONDecoder().decode(JwtUser.self, from: data)
    }
}

enum AuthError: Error {
    case notAuthenticated
    case serverError(Int)
}
```

## Step 3 — SwiftUI Login View

```swift
// Sources/Views/LoginView.swift
import SwiftUI

struct LoginView: View {
    @State private var email    = ""
    @State private var password = ""
    @State private var loading  = false
    @State private var errorMsg: String?
    @EnvironmentObject private var appState: AppState

    var body: some View {
        VStack(spacing: 20) {
            Text("Sign In").font(.largeTitle).bold()

            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .textFieldStyle(.roundedBorder)

            SecureField("Password", text: $password)
                .textContentType(.password)
                .textFieldStyle(.roundedBorder)

            if let msg = errorMsg {
                Text(msg).foregroundColor(.red).font(.caption)
            }

            Button(action: login) {
                if loading {
                    ProgressView()
                } else {
                    Text("Sign In").frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(loading || email.isEmpty || password.isEmpty)
        }
        .padding(32)
    }

    private func login() {
        loading  = true
        errorMsg = nil
        Task {
            do {
                _ = try await AuthService.shared.login(email: email, password: password)
                await MainActor.run { appState.isLoggedIn = true }
            } catch {
                await MainActor.run { errorMsg = error.localizedDescription }
            }
            await MainActor.run { loading = false }
        }
    }
}
```

## Step 4 — App State + Root View

```swift
// Sources/AppState.swift
import SwiftUI

@MainActor
final class AppState: ObservableObject {
    @Published var isLoggedIn: Bool

    init() {
        // Restore session on launch — check if access token exists
        isLoggedIn = KeychainHelper.load(forKey: "access_token") != nil
    }
}
```

```swift
// MyApp.swift
import SwiftUI

@main
struct MyApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            if appState.isLoggedIn {
                DashboardView()
                    .environmentObject(appState)
            } else {
                LoginView()
                    .environmentObject(appState)
            }
        }
    }
}
```

## OAuth / Social Login

For OAuth, open the authorization URL in `ASWebAuthenticationSession` and capture the deep-link callback:

```swift
import AuthenticationServices

func loginWithOAuth(provider: String) async throws {
    let authURL = URL(string: "https://your-api.example.com/auth/oauth/\(provider)")!
    let callbackScheme = "myapp"

    return try await withCheckedThrowingContinuation { continuation in
        let session = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: callbackScheme
        ) { callbackURL, error in
            if let error { return continuation.resume(throwing: error) }
            guard let url = callbackURL,
                  let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let accessToken  = components.queryItems?.first(where: { $0.name == "accessToken" })?.value,
                  let refreshToken = components.queryItems?.first(where: { $0.name == "refreshToken" })?.value
            else { return continuation.resume(throwing: AuthError.notAuthenticated) }

            KeychainHelper.save(accessToken,  forKey: "access_token")
            KeychainHelper.save(refreshToken, forKey: "refresh_token")
            continuation.resume()
        }
        session.presentationContextProvider = self as? ASWebAuthenticationPresentationContextProviding
        session.prefersEphemeralWebBrowserSession = false
        session.start()
    }
}
```

Add `myapp` as a URL scheme in `Info.plist` under **URL Types**.

## Security Notes

- ✅ Tokens stored in **Keychain** (`kSecAttrAccessibleAfterFirstUnlock`) — survives app restart but wiped on uninstall
- ✅ Access token kept in memory via `AuthService.accessToken` (reads from Keychain on demand)
- ✅ Auto-refresh on 401 with a single retry
- ✅ App Transport Security (ATS) enforces HTTPS by default

## Related

- [Bearer token mode for mobile apps](/docs/advanced/bearer-token) — why native clients skip cookies
- [Android Kotlin authentication](/docs/frameworks/android) — the same flow on Android
- [Flutter authentication client](/docs/frameworks/flutter) — one codebase for both platforms
- [TOTP two-factor authentication](/docs/authentication/totp) — 2FA from a native app
