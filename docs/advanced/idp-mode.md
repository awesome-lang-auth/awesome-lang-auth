---
id: idp-mode
title: "Identity Provider Mode: RS256 JWTs and JWKS"
description: >-
  Run awesome-node-auth as a central identity provider: RS256-signed tokens and a public JWKS endpoint so resource servers verify without shared secrets.
sidebar_label: IdP Mode
---

# Identity Provider (IdP) Mode

`awesome-node-auth` can act as a **central Identity Provider** — generating RS256-signed JWTs and exposing a public JWKS endpoint so downstream **Resource Servers** can verify tokens without sharing a secret.

All existing HS256 (cookie / bearer) behaviour is preserved and the two modes can coexist in the same instance.

---

## Overview

```
┌─────────────────────────────┐        ┌─────────────────────────────┐
│   IdP (awesome-node-auth)   │        │   Resource Server (any app) │
│                             │        │                             │
│  POST /auth/login           │──RS256 tokens──►  Protected APIs    │
│  GET  /.well-known/jwks.json│◄──fetch JWKS───  Validate with JWKS │
└─────────────────────────────┘        └─────────────────────────────┘
```

---

## Configuration

```typescript
import { createAuthRouter } from 'awesome-node-auth';

const auth = createAuthRouter({
  // …standard config…
  idProvider: {
    enabled: true,

    // PEM-encoded RSA-2048 private key (inject via environment variable).
    // If omitted, an ephemeral keypair is auto-generated at startup (dev only).
    privateKey: process.env.IDP_PRIVATE_KEY,

    // `iss` claim embedded in every IdP-issued JWT.
    // Resource Servers validate this claim.
    issuer: 'https://auth.myplatform.com',

    // Access token TTL (default: '30d')
    tokenExpiry: '30d',

    // Refresh token TTL (default: '90d', falls back to refreshTokenExpiresIn)
    refreshTokenExpiry: '90d',

    // Path for the JWKS endpoint (default: '/.well-known/jwks.json')
    jwksPath: '/.well-known/jwks.json',
  },
});
```

### Configuration reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable IdP mode. Also activated when `privateKey` is set. |
| `privateKey` | `string` | — | PEM-encoded RSA-2048 private key. Auto-generated if omitted (dev only). |
| `publicKey` | `string` | — | PEM-encoded RSA public key. Auto-derived from `privateKey` if omitted. |
| `issuer` | `string` | — | `iss` claim embedded in every JWT. Omit to suppress the claim. |
| `tokenExpiry` | `string` | `'30d'` | Access token expiry. Overrides `accessTokenExpiresIn`. |
| `refreshTokenExpiry` | `string` | `'90d'` | Refresh token expiry. Falls back to `refreshTokenExpiresIn`. |
| `jwksPath` | `string` | `'/.well-known/jwks.json'` | Path at which the JWKS endpoint is exposed. |
| `jwksCorsOrigins` | `string \| string[]` | `'*'` | CORS origins allowed to fetch the JWKS endpoint. |

---

## Token structure

### JWT header

In IdP mode every token is signed with **RS256**. The JOSE header carries the `kid` parameter so Resource Servers can select the correct public key from the JWKS document:

```json
{
  "alg": "RS256",
  "kid": "provisioner-key-1"
}
```

:::info kid is a JOSE header parameter
`kid` (Key ID) is defined by [RFC 7515 §4.1.4](https://www.rfc-editor.org/rfc/rfc7515#section-4.1.4) as a **JOSE header parameter**, not a JWT payload claim.
`awesome-node-auth` sets it via the `keyid` option of `jwt.sign()` so it appears in the header — exactly where third-party validators and JWKS libraries expect it.
:::

### JWT payload (access token)

```typescript
interface AccessTokenPayload {
  sub:   string;             // user ID
  email: string;
  role?: string;
  loginProvider?: string;
  isEmailVerified?: boolean;
  isTotpEnabled?: boolean;
  iss:   string;             // issuer — present when `idProvider.issuer` is set
  iat:   number;             // issued-at  (set by jsonwebtoken)
  exp:   number;             // expiry     (set by jsonwebtoken)
  // …any custom claims from buildTokenPayload
}
```

### Refresh token

In IdP mode the **refresh token is also RS256-signed** using the same private key, with a longer expiry (`refreshTokenExpiry ?? refreshTokenExpiresIn ?? '90d'`).

Signing the refresh token with RS256 ensures consistent key management and prevents a downgrade scenario where an HS256-signed refresh token could be used to obtain an RS256-signed access token, potentially bypassing issuer validation.

---

## JWKS endpoint

The JWKS endpoint is automatically registered at `idProvider.jwksPath` (default `/.well-known/jwks.json`):

```bash
curl https://auth.myplatform.com/.well-known/jwks.json
```

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "provisioner-key-1",
      "n": "…",
      "e": "AQAB"
    }
  ]
}
```

---

## Resource Server validation

A downstream service validates incoming tokens against the IdP's JWKS endpoint:

```typescript
import { JwksService, TokenService } from 'awesome-node-auth';

const tokenService = new TokenService();
const jwksClient = JwksService.createRemoteClient(
  'https://auth.myplatform.com/.well-known/jwks.json'
);

// In your auth middleware:
const payload = await tokenService.verifyWithJwks(
  token,
  jwksClient,
  'https://auth.myplatform.com', // expected issuer
);
// payload.sub, payload.email, etc.
```

`verifyWithJwks` reads `kid` from the **JWT header**, fetches the matching key from the JWKS document, and verifies the RS256 signature — including issuer validation when `expectedIssuer` is provided.

---

## Key rotation

1. Generate a new RSA keypair.
2. Update `idProvider.privateKey` (and `publicKey`) in your config.
3. Publish the new key in your JWKS endpoint alongside the old key until all tokens signed with the old key have expired.
4. Remove the old key from the JWKS document.

`JwksService.generateKeypair()` is a convenience helper for step 1:

```typescript
import { JwksService } from 'awesome-node-auth';

const { privateKey, publicKey } = JwksService.generateKeypair();
```

---

## Security checklist

- ✅ Inject `privateKey` via an environment variable — never commit it to source control
- ✅ Always set `idProvider.issuer` and validate it on the Resource Server
- ✅ Use HTTPS in production
- ✅ Keep access token TTL short (`tokenExpiry: '15m'` for sensitive APIs)
- ✅ Rotate keys periodically and overlap old / new keys in the JWKS document during rollover

## Related

- [Custom JWT claims](/docs/advanced/custom-claims) — what resource servers read from the token
- [Session management and token revocation](/docs/advanced/sessions) — revocation with stateless RS256 tokens
- [API keys and service tokens](/docs/advanced/api-keys) — machine credentials next to user tokens
- [Auth API endpoints reference](/docs/api-reference/endpoints) — the JWKS and token routes
