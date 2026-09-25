---
id: lambda
title: "AWS Lambda Authentication: awesome-lambda-auth"
description: >-
  awesome-lambda-auth is a self-hosted alternative to AWS Cognito: the awesome-go-auth core deployed as a Lambda and DynamoDB stack in your own AWS account.
sidebar_label: AWS Lambda
---

# AWS Lambda — `awesome-lambda-auth`

:::caution Preview
`awesome-lambda-auth` is in **preview**. The stack deploys, and the two official clients, unmodified, register, log in, refresh with CSRF, enrol TOTP, complete a 2FA login and revoke sessions against it. What is wired today and what is still gated is tracked in [docs/PROGRESS.md](https://github.com/awesome-lang-auth/awesome-lambda-auth/blob/main/docs/PROGRESS.md).
:::

## What it is

`awesome-lambda-auth` is the serverless member of the family: an open-source, self-hosted alternative to AWS Cognito, deployed as a stack in your own AWS account. MIT, no per-MAU pricing, no phone-home.

It is **not a language port**. It imports the auth core from [awesome-go-auth](/docs/frameworks/go) unchanged, keeps the wire contract compatible with the reference, and replaces every long-lived-process assumption with a serverless primitive:

| Area | In `awesome-lambda-auth` |
|------|--------------------------|
| Events | API Gateway HTTP API (v2) and REST (v1), Lambda Function URL, ALB |
| Storage | One DynamoDB table with TTL: users, sessions with refresh-token families, single-use tokens, TOTP, linked accounts, pending links |
| Email and SMS | SES for mail, SNS for SMS, or a signed delivery webhook that takes every credential channel instead |
| Secrets | Secrets Manager, then SSM, then the environment |
| Identity provider | OIDC issuer (JWKS, discovery, authorize, token, userinfo) signed by an AWS KMS key or a PEM; session tokens stay HS256 |

It is a **deployable product**, configured by file and environment and extended through webhooks and OIDC, not a library you compile against. There is no package to install: you clone the repository, build the artifact and deploy the stack.

## Configuration

Two sources, layered:

1. A JSON document, from `AWESOME_AUTH_CONFIG_FILE=<path>` or inline in `AWESOME_AUTH_CONFIG_JSON`. Neither set means defaults.
2. `AWESOME_AUTH_*` environment variables, one per knob, on top of the document.

Secrets are never values in the document: a secret knob is a reference to Secrets Manager or SSM, resolved at cold start, and a plaintext secret in the document refuses to start.

Configuration domains that the schema accepts but the binary does not act on yet are **refused at start**, never silently ignored. At the time of writing these are `admin` and `tools`, so the admin console and the tools router are not available on this stack yet. The hosted UI is wired behind `ui.enabled`, which is off by default. Its admin dashboard calls routes this build does not mount, so the project's configuration reference says to leave it off on a deployed stack until the admin surface lands.

What the binary reads is documented in [docs/config-reference.md](https://github.com/awesome-lang-auth/awesome-lambda-auth/blob/main/docs/config-reference.md), and the full schema with every default in [docs/spec/config-schema.md](https://github.com/awesome-lang-auth/awesome-lambda-auth/blob/main/docs/spec/config-schema.md).

## Deploy outline

You need **Docker**, to build the Lambda binary in a pinned Go container, and the **AWS CLI v2** with a named profile that can create IAM roles, Lambda functions, API Gateway APIs, DynamoDB tables, Secrets Manager secrets and an S3 bucket. The SAM CLI is not needed: the template's transform runs server-side in CloudFormation.

```bash
git clone https://github.com/awesome-lang-auth/awesome-lambda-auth
cd awesome-lambda-auth
./scripts/build-lambda.sh                                   # dist/auth-lambda.zip, reproducible
./scripts/deploy.sh --profile <profile> --region <region>   # package + deploy with the AWS CLI, no SAM CLI
```

`--profile` and `--region` are required and have no defaults. The stack is one HTTP API, one Lambda function (`provided.al2023`, arm64) for the whole auth router, one DynamoDB table, a log group with 14-day retention by default, the JWT signing secrets, which AWS generates in Secrets Manager so you never handle their values, and, by default, nine CloudWatch alarms. A CloudFront distribution and a KMS signing key for the identity provider are optional. `scripts/teardown.sh` removes the stack and names what outlives it. The template, its parameters and the IAM policy are documented in [infra/sam/README.md](https://github.com/awesome-lang-auth/awesome-lambda-auth/blob/main/infra/sam/README.md).

To check a deployment, run the contract suite against it:

```bash
AWESOME_AUTH_CONTRACT_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com \
AWESOME_AUTH_CONTRACT_REQUIRE=register,csrf,secure-cookies,sessions,totp \
./scripts/toolchain.sh go test -count=1 -v ./test/contract/...
```

`REQUIRE` turns "capability absent" from a skip into a failure, so a deployment that lost a feature cannot pass by skipping it.

## Wire compatibility

- **One contract.** The HTTP contract is extracted from the reference source into [docs/spec/wire-contract.md](https://github.com/awesome-lang-auth/awesome-lambda-auth/blob/main/docs/spec/wire-contract.md), which the stack is forbidden to break.
- **One test suite for both.** The contract suite in `test/contract` is black-box and parametrised on a base URL: it runs against this stack or against the reference Express app.
- **The official clients, unmodified.** `examples/angular-client` uses `ng-awesome-node-auth` from npm and `examples/flutter-client` uses `awesome_node_auth_flutter` from pub.dev. The API prefix defaults to `/auth`, as in awesome-node-auth, so the clients keep their usual `apiPrefix`.
- **Browser clients need one origin.** The session cookies are `SameSite=Lax` and the CSRF double-submit needs the page to read the CSRF cookie, so the examples serve the app and rewrite `/auth/*` to the API from the same origin.
- **Rate limiting, on by default.** The reference ships no limiter. This stack allows 10 requests per 60-second window, keyed by account, over the five credential flows, and refuses the rest with `429 RATE_LIMITED` and a `Retry-After`.

Every place where the stack differs from the reference is indexed in [docs/deviations.md](https://github.com/awesome-lang-auth/awesome-lambda-auth/blob/main/docs/deviations.md).

## Resources

- GitHub repository: [awesome-lang-auth/awesome-lambda-auth](https://github.com/awesome-lang-auth/awesome-lambda-auth)
- Status: [docs/PROGRESS.md](https://github.com/awesome-lang-auth/awesome-lambda-auth/blob/main/docs/PROGRESS.md)
- Compared with Cognito: [docs/cognito-comparison.md](https://github.com/awesome-lang-auth/awesome-lambda-auth/blob/main/docs/cognito-comparison.md)

## Related

- [Go backend authentication](/docs/frameworks/go) — the core this stack imports
- [Angular auth library](/docs/frameworks/ng-awesome-node-auth) — the Angular client the examples run unmodified
- [Flutter authentication client](/docs/frameworks/flutter) — the Flutter client the examples run unmodified
- [Framework integrations](/docs/frameworks) — every supported backend and client
- [Auth API endpoints reference](/docs/api-reference/endpoints) — the contract the ports target
