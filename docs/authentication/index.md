---
id: authentication
title: Authentication Methods for Node.js
description: >-
  Compare the authentication strategies awesome-node-auth supports: email and password, OAuth2 social login, magic links, TOTP 2FA and SMS one-time codes.
sidebar_position: 3
---

# Authentication Strategies

node-auth supports multiple authentication strategies that can be combined:

| Strategy | Description |
|----------|-------------|
| [Local](/docs/authentication/local) | Email/password with bcrypt hashing |
| [OAuth 2.0](/docs/authentication/oauth) | Google, GitHub, or any custom provider |
| [Magic Link](/docs/authentication/magic-link) | Passwordless email authentication |
| [TOTP 2FA](/docs/authentication/totp) | Time-based one-time passwords |
| [SMS OTP](/docs/authentication/sms) | Phone number verification codes |

All strategies are plug-in — only configure what you need.
