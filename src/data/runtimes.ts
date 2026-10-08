/**
 * The awesome-lang-auth family: the single source of truth for every runtime
 * the home page shows (chips, runtime card, ecosystem cards, rotating title)
 * and for scripts/check-runtimes.mjs, which queries each registry weekly.
 *
 * Constraints, because Node loads this file directly (type stripping):
 * - no imports of any kind;
 * - erasable TypeScript only: no enums, no namespaces, no parameter properties.
 *
 * Every command and version below was checked against its registry or repo
 * on 2026-09-25. When one changes, change it here and nowhere else.
 */

export type RuntimeId =
  | 'node'
  | 'go'
  | 'lambda'
  | 'python'
  | 'rust'
  | 'dart'
  | 'angular'
  | 'react'
  | 'flutter';

export type RuntimeGroup = 'server' | 'client';

export type Maturity = 'stable' | 'beta' | 'preview' | 'early';

/** What check-runtimes.mjs asks the registry, or the repo for git installs. */
export type RegistryRef =
  | { kind: 'npm'; name: string; version: string }
  | { kind: 'pypi'; name: string; version: string }
  | { kind: 'pub'; name: string; version: string }
  | { kind: 'go'; module: string; version: string }
  | { kind: 'crates'; name: string; version: string }
  | {
      kind: 'git';
      /** The URL `git clone` / `--git` / `--git-url` points at. */
      url: string;
      /** A manifest the command needs at the default branch, and the package name it must declare. */
      manifest?: { path: string; name: string };
    };

export interface Runtime {
  id: RuntimeId;
  /** Language or platform, as a person names it. */
  label: string;
  group: RuntimeGroup;
  maturity: Maturity;
  /** Package, module or repository name the command installs. */
  pkg: string;
  /** Released version the command resolves to today; absent for untagged git installs. */
  version?: string;
  /** One line that works today. */
  command: string;
  registry: RegistryRef;
  /** Human name and page of the registry (or the repo, for git installs). */
  registryLabel: string;
  registryUrl: string;
  /**
   * true: the command resolves today and check-runtimes.mjs fails when it
   * stops resolving. false: the page may already show the command, but the
   * check only reports whether it resolves yet.
   */
  available: boolean;
  /** Docs page on this site (trailing slash: the site uses trailingSlash: true). */
  docs: string;
  repo: string;
  /** One line for the runtime card in the hero. */
  feature: string;
  /** Two lines for the ecosystem card. */
  description: string;
  /** A rename or move the reader should know about. */
  note?: string;
}

export const MATURITY_INFO: Record<Maturity, { label: string; description: string }> = {
  stable: { label: 'stable', description: 'Released on its registry with 1.x versions' },
  beta: { label: 'beta', description: 'Released on its registry; 0.x, the API may still change' },
  preview: { label: 'preview', description: 'Installed from its git repository; no registry release yet' },
  early: { label: 'early', description: 'First 0.x release on its registry' },
};

export const GROUP_INFO: Record<RuntimeGroup, { label: string }> = {
  server: { label: 'Servers' },
  client: { label: 'Clients' },
};

export const RUNTIMES: readonly Runtime[] = [
  // ── Servers ────────────────────────────────────────────────────────────
  {
    id: 'node',
    label: 'Node.js',
    group: 'server',
    maturity: 'stable',
    pkg: '@awesome-lang-auth/node',
    version: '1.10.1',
    command: 'npm i @awesome-lang-auth/node',
    registry: { kind: 'npm', name: '@awesome-lang-auth/node', version: '1.10.1' },
    registryLabel: 'npm',
    registryUrl: 'https://www.npmjs.com/package/@awesome-lang-auth/node',
    available: true,
    docs: '/docs/intro/',
    repo: 'https://github.com/awesome-lang-auth/awesome-node-auth',
    feature: 'The reference implementation: a drop-in auth router for Express, NestJS and Next.js.',
    description:
      'The reference library, and the wire protocol every other member speaks. Drop-in auth router for Express, NestJS, Next.js and Angular SSR.',
    note: 'Formerly published as awesome-node-auth.',
  },
  {
    id: 'go',
    label: 'Go',
    group: 'server',
    maturity: 'beta',
    pkg: 'awesome-go-auth',
    version: '0.11.0',
    command: 'go get github.com/nik2208/awesome-go-auth@v0.11.0',
    registry: { kind: 'go', module: 'github.com/nik2208/awesome-go-auth', version: 'v0.11.0' },
    registryLabel: 'Go packages',
    registryUrl: 'https://pkg.go.dev/github.com/nik2208/awesome-go-auth',
    available: true,
    docs: '/docs/frameworks/go/',
    repo: 'https://github.com/awesome-lang-auth/awesome-go-auth',
    feature: 'The same endpoints and tokens in Go, with adapters for net/http, chi, gin and echo.',
    description:
      'Go port of the reference: the same auth endpoints and JWT contract, served through adapters for net/http, chi, gin and echo.',
    note: 'The module path moves to github.com/awesome-lang-auth/awesome-go-auth at v1.0.0.',
  },
  {
    id: 'lambda',
    label: 'AWS Lambda',
    group: 'server',
    maturity: 'preview',
    pkg: 'awesome-lambda-auth',
    command: 'git clone https://github.com/awesome-lang-auth/awesome-lambda-auth',
    registry: { kind: 'git', url: 'https://github.com/awesome-lang-auth/awesome-lambda-auth' },
    registryLabel: 'GitHub',
    registryUrl: 'https://github.com/awesome-lang-auth/awesome-lambda-auth',
    available: true,
    docs: '/docs/frameworks/lambda/',
    repo: 'https://github.com/awesome-lang-auth/awesome-lambda-auth',
    feature: 'A stack you deploy in your own AWS account: API Gateway, Lambda and DynamoDB.',
    description:
      'A self-hosted alternative to Amazon Cognito, deployed in your own AWS account. It runs the Go core unchanged and keeps the same wire protocol.',
  },
  {
    id: 'python',
    label: 'Python',
    group: 'server',
    maturity: 'stable',
    pkg: 'awesome-python-auth',
    version: '1.1.0',
    command: 'pip install awesome-python-auth',
    registry: { kind: 'pypi', name: 'awesome-python-auth', version: '1.1.0' },
    registryLabel: 'PyPI',
    registryUrl: 'https://pypi.org/project/awesome-python-auth/',
    available: true,
    docs: '/docs/frameworks/python/',
    repo: 'https://github.com/awesome-lang-auth/awesome-python-auth',
    feature: 'FastAPI library with cookie and bearer sessions, CSRF, IdP mode, RBAC and tenants.',
    description:
      'FastAPI library with the same auth flows as the reference: cookie and bearer sessions, CSRF, IdP mode, RBAC and multi-tenancy.',
  },
  {
    id: 'rust',
    label: 'Rust',
    group: 'server',
    maturity: 'preview',
    pkg: 'awesome-rust-auth',
    command: 'cargo add awesome-rust-auth --git https://github.com/awesome-lang-auth/awesome-rust-auth',
    registry: {
      kind: 'git',
      url: 'https://github.com/awesome-lang-auth/awesome-rust-auth',
      manifest: { path: 'Cargo.toml', name: 'awesome-rust-auth' },
    },
    registryLabel: 'GitHub',
    registryUrl: 'https://github.com/awesome-lang-auth/awesome-rust-auth',
    available: true,
    docs: '/docs/frameworks/rust/',
    repo: 'https://github.com/awesome-lang-auth/awesome-rust-auth',
    feature: 'Framework-agnostic crate, with Cargo features for Axum, Actix-web and Warp.',
    description:
      'Framework-agnostic crate with the same auth model: RBAC, tenancy, event bus, API keys and IdP/JWKS support. Features for Axum, Actix-web and Warp.',
  },
  {
    id: 'dart',
    label: 'Dart',
    group: 'server',
    maturity: 'preview',
    pkg: 'awesome_dart_auth',
    command:
      'dart pub add awesome_dart_auth --git-url https://github.com/awesome-lang-auth/awesome-dart-auth --git-path packages/awesome_dart_auth',
    registry: {
      kind: 'git',
      url: 'https://github.com/awesome-lang-auth/awesome-dart-auth',
      manifest: { path: 'packages/awesome_dart_auth/pubspec.yaml', name: 'awesome_dart_auth' },
    },
    registryLabel: 'GitHub',
    registryUrl: 'https://github.com/awesome-lang-auth/awesome-dart-auth',
    available: true,
    docs: '/docs/frameworks/dart/',
    repo: 'https://github.com/awesome-lang-auth/awesome-dart-auth',
    // The command adds the core package, whose AuthRouter serves Shelf directly;
    // Dart Frog needs packages/awesome_dart_auth_dart_frog on top of it.
    feature: 'The core package serves Shelf directly; Dart Frog adds an adapter package from the same repo.',
    description:
      'Server-side core that serves Shelf directly, with a Dart Frog adapter package in the same repository, and the same auth model as the reference: cookies and CSRF for the web, bearer for native apps.',
  },
  // ── Clients ────────────────────────────────────────────────────────────
  {
    id: 'angular',
    label: 'Angular',
    group: 'client',
    maturity: 'stable',
    pkg: 'ng-awesome-node-auth',
    version: '1.9.0',
    command: 'npm i ng-awesome-node-auth',
    registry: { kind: 'npm', name: 'ng-awesome-node-auth', version: '1.9.0' },
    registryLabel: 'npm',
    registryUrl: 'https://www.npmjs.com/package/ng-awesome-node-auth',
    available: true,
    // The library page; /docs/frameworks/angular/ documents manual wiring.
    docs: '/docs/frameworks/ng-awesome-node-auth/',
    repo: 'https://github.com/awesome-lang-auth/awesome-angular-auth',
    feature: 'Guards, interceptors, session signals and SSR-safe setup from one provideAuth() call.',
    description:
      'Angular library with guards, HttpClient interceptors, reactive session signals, CSRF support and SSR-safe setup.',
    note: 'Moves to @awesome-lang-auth/angular.',
  },
  {
    id: 'react',
    label: 'React',
    group: 'client',
    maturity: 'early',
    pkg: '@awesome-lang-auth/react',
    version: '0.1.0',
    command: 'npm i @awesome-lang-auth/react',
    registry: { kind: 'npm', name: '@awesome-lang-auth/react', version: '0.1.0' },
    registryLabel: 'npm',
    registryUrl: 'https://www.npmjs.com/package/@awesome-lang-auth/react',
    available: true,
    docs: '/docs/frameworks/react/',
    repo: 'https://github.com/awesome-lang-auth/awesome-react-auth',
    feature: 'One provider, one hook, two route gates: cookies on the web, bearer on React Native.',
    description:
      'React 18 and 19 bindings: one provider, one hook and two route gates, SSR-safe. Cookies on the web, bearer tokens on React Native.',
  },
  {
    id: 'flutter',
    label: 'Flutter',
    group: 'client',
    maturity: 'stable',
    pkg: 'awesome_node_auth_flutter',
    version: '1.10.0',
    command: 'flutter pub add awesome_node_auth_flutter',
    registry: { kind: 'pub', name: 'awesome_node_auth_flutter', version: '1.10.0' },
    registryLabel: 'pub.dev',
    registryUrl: 'https://pub.dev/packages/awesome_node_auth_flutter',
    available: true,
    docs: '/docs/frameworks/flutter/',
    repo: 'https://github.com/awesome-lang-auth/awesome-flutter-auth',
    feature: 'Cookies and CSRF on web and WASM, bearer tokens on iOS, Android and desktop.',
    description:
      'Flutter client with no token boilerplate: cookies and CSRF on web and WASM, bearer tokens on iOS, Android and desktop.',
    note: 'Moves to awesome_flutter_auth.',
  },
];

export const SERVERS: readonly Runtime[] = RUNTIMES.filter((r) => r.group === 'server');
export const CLIENTS: readonly Runtime[] = RUNTIMES.filter((r) => r.group === 'client');
