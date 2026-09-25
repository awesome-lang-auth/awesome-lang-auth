import type { ReactNode } from 'react';
import clsx from 'clsx';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import styles from './index.module.css';

// Homepage <title>. Written out in full instead of using Layout's `title` prop,
// which would append " | awesome-node-auth" and push the tag past the ~60
// characters Google renders. Keyword first, brand last.
const HOME_TITLE = 'Self-Hosted Node.js Authentication Library | awesome-node-auth';

interface RecipeItem {
  icon?: string;
  iconPath?: string;
  iconLabel?: string;
  title: string;
  description: string;
  href: string;
}

const recipes: RecipeItem[] = [
  {
    icon: '🔑',
    title: 'Email / Password',
    description: 'Classic email and password authentication with bcrypt hashing and password reset flow.',
    href: '/docs/authentication/local',
  },
  {
    icon: '🌐',
    title: 'OAuth / Social',
    description: 'Sign in with Google, GitHub, or any custom OAuth 2.0 provider using GenericOAuthStrategy.',
    href: '/docs/authentication/oauth',
  },
  {
    icon: '🪄',
    title: 'Magic Link',
    description: 'Passwordless login via email. First magic-link login counts as email verification.',
    href: '/docs/authentication/magic-link',
  },
  {
    icon: '📱',
    title: 'SMS OTP',
    description: 'One-time password codes delivered via SMS for phone verification or 2FA.',
    href: '/docs/authentication/sms',
  },
  {
    icon: '🔐',
    title: 'TOTP 2FA',
    description: 'Time-based one-time passwords compatible with Google Authenticator and Authy.',
    href: '/docs/authentication/totp',
  },
  {
    icon: '🏢',
    title: 'Multi-Tenancy',
    description: 'Isolate users and data across multiple tenants with tenant-aware RBAC.',
    href: '/docs/advanced/multi-tenancy',
  },
  {
    icon: '⚙️',
    title: 'Admin Panel',
    description: 'Self-contained admin dashboard: user management, sessions, roles, tenants, and policy controls.',
    href: '/docs/advanced/admin',
  },
  {
    icon: '🔗',
    title: 'Account Linking',
    description: 'Link multiple OAuth providers to one account. Safe conflict resolution via IPendingLinkStore.',
    href: '/docs/advanced/account-linking',
  },
  {
    icon: '📡',
    title: 'Event Bus & Tracking',
    description: 'Publish and subscribe to auth events (login, signup, failure…) with AuthEventBus. Track telemetry with a single tools.track() call.',
    href: '/docs/advanced/auth-event-bus',
  },
  {
    icon: '🔔',
    title: 'Real-time SSE',
    description: 'Push live notifications to connected browsers via Server-Sent Events. No WebSocket server needed.',
    href: '/docs/advanced/sse',
  },
  {
    icon: '🪝',
    title: 'Webhooks',
    description: 'Forward auth events to external services with HMAC-signed outgoing webhooks, or execute dynamic inbound scripts in a secure vm sandbox.',
    href: '/docs/advanced/webhooks',
  },
  {
    icon: '📊',
    title: 'Telemetry',
    description: 'Persist every auth event to any database via ITelemetryStore and query the history through the tools router.',
    href: '/docs/advanced/telemetry',
  },
  {
    iconPath: '/img/icons/mcp.svg',
    iconLabel: 'Model Context Protocol',
    title: 'AI Setup (MCP)',
    description: 'Configure the entire library via natural language using the companion MCP server — works with VS Code Copilot, Cursor, and Claude.',
    href: '/docs/mcp-server',
  },
  {
    icon: '🚀',
    title: 'Cloud Scalable',
    description: 'Stateless architecture by design. Use ISseDistributor and Redis to scale real-time SSE across any number of instances.',
    href: '/docs/advanced/sse-scaling',
  },
  {
    iconPath: '/img/icons/python.svg',
    iconLabel: 'Python',
    title: 'Python / FastAPI',
    description: 'Official Python backend library — same auth flows, CSRF, IdP mode, RBAC, and multi-tenancy as the Node.js library.',
    href: '/docs/frameworks/python',
  },
  {
    iconPath: '/img/icons/dart.svg',
    iconLabel: 'Dart',
    title: 'Dart / Shelf backend',
    description: 'Official Dart backend for Shelf and Dart Frog — full feature parity with Node.js: cookies, CSRF, OAuth, magic link, RBAC, and IdP mode.',
    href: '/docs/frameworks/dart',
  },
  {
    iconPath: '/img/icons/rust.svg',
    iconLabel: 'Rust',
    title: 'Rust backend',
    description: 'Official Rust crate for Axum, Actix-web, and Warp — same auth model, RBAC, tenancy, event bus, API keys, and IdP/JWKS support.',
    href: '/docs/frameworks/rust',
  },
  {
    iconPath: '/img/icons/flutter.svg',
    iconLabel: 'Flutter',
    title: 'Flutter client',
    description: 'Official Flutter/Dart client — automatic cookie+CSRF on web/WASM and Bearer on native. Zero token-management boilerplate.',
    href: '/docs/frameworks/flutter',
  },
];

interface CompareRow {
  feature: string;
  nodeAuth: string;
  others: string;
}

const compareRows: CompareRow[] = [
  { feature: 'Database support', nodeAuth: 'Any DB via interface', others: 'Specific DBs only' },
  { feature: 'Auth strategies', nodeAuth: '5+ built-in recipes', others: 'Varies' },
  { feature: 'Self-hosted', nodeAuth: '✅ Always', others: 'Paid tier or limited' },
  { feature: 'JWT tokens', nodeAuth: '✅ Access + refresh pair', others: 'Often session-only' },
  { feature: 'Official backend libraries', nodeAuth: 'Node · Python · Dart · Rust', others: '❌ or third-party only' },
  { feature: 'Official frontend libraries', nodeAuth: 'Angular · Flutter · auth.js + served UI (any framework, headless/headful)', others: '❌ or third-party only' },
  { feature: 'AI-assisted setup', nodeAuth: '✅ MCP server included', others: '❌' },
  { feature: 'License', nodeAuth: 'MIT', others: 'Mixed' },
];

interface EcosystemCard {
  icon?: string;
  iconPath?: string;
  iconLabel?: string;
  name: string;
  registry: string;
  registryUrl: string;
  install: string;
  description: string;
  href: string;
}

const backendEcosystemCards: EcosystemCard[] = [
  {
    iconPath: '/img/icons/nodejs.svg',
    iconLabel: 'Node.js',
    name: 'awesome-node-auth',
    registry: 'npm',
    registryUrl: 'https://www.npmjs.com/package/awesome-node-auth',
    install: 'npm install awesome-node-auth',
    description: 'The core Node.js backend library. Drop-in auth router for Express, NestJS, Next.js, and Angular SSR.',
    href: '/docs/intro',
  },
  {
    iconPath: '/img/icons/python.svg',
    iconLabel: 'Python',
    name: 'awesome-python-auth',
    registry: 'PyPI',
    registryUrl: 'https://pypi.org/project/awesome-python-auth/',
    install: 'pip install awesome-python-auth',
    description: 'Full Python/FastAPI equivalent — every feature of the Node.js library, native to the Python ecosystem.',
    href: '/docs/frameworks/python',
  },
  {
    iconPath: '/img/icons/dart.svg',
    iconLabel: 'Dart',
    name: 'awesome-dart-auth',
    registry: 'GitHub',
    registryUrl: 'https://github.com/nik2208/awesome-dart-auth',
    install: "dependencies: awesome_dart_auth: { git: 'https://github.com/nik2208/awesome-dart-auth.git' }",
    description: 'Official Dart backend library aligned with the same auth model and features. Add this entry under dependencies in pubspec.yaml.',
    href: '/docs/frameworks/dart',
  },
  {
    iconPath: '/img/icons/rust.svg',
    iconLabel: 'Rust',
    name: 'awesome-rust-auth',
    registry: 'GitHub',
    registryUrl: 'https://github.com/nik2208/awesome-rust-auth',
    install: 'awesome-rust-auth = { git = "https://github.com/nik2208/awesome-rust-auth" }',
    description: 'Official Rust backend library for the same authentication architecture. Use the Git dependency in Cargo.toml.',
    href: '/docs/frameworks/rust',
  },
];

const frontendEcosystemCards: EcosystemCard[] = [
  {
    iconPath: '/img/icons/angular.svg',
    iconLabel: 'Angular',
    name: 'ng-awesome-node-auth',
    registry: 'npm',
    registryUrl: 'https://www.npmjs.com/package/ng-awesome-node-auth',
    install: 'npm install ng-awesome-node-auth',
    description: 'Official Angular frontend library with guards, interceptors, signals, and SSR-safe setup.',
    href: '/docs/frameworks/ng-awesome-node-auth',
  },
  {
    iconPath: '/img/icons/flutter.svg',
    iconLabel: 'Flutter',
    name: 'awesome_node_auth_flutter',
    registry: 'pub.dev',
    registryUrl: 'https://pub.dev/packages/awesome_node_auth_flutter',
    install: 'awesome_node_auth_flutter: ^1.9.4',
    description: 'Official Flutter/Dart client. Automatic cookie+CSRF on web/WASM, Bearer on native. Zero boilerplate.',
    href: '/docs/frameworks/flutter',
  },
  {
    icon: '🌍',
    name: 'auth.js (served by built-in UI)',
    registry: 'Docs',
    registryUrl: '/docs/advanced/browser-client',
    install: '<script src="{API_ORIGIN}/auth/ui/auth.js"></script>',
    description: 'Natively compatible with any web framework/library in the browser. Use auth.js in headful mode (built-in UI pages) or headless mode. Replace {API_ORIGIN} with your auth backend origin (e.g. https://api.example.com).',
    href: '/docs/advanced/browser-client',
  },
];

function HeroSection(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const nodeIcon = useBaseUrl('/img/icons/nodejs.svg');
  const pythonIcon = useBaseUrl('/img/icons/python.svg');
  const dartIcon = useBaseUrl('/img/icons/dart.svg');
  const rustIcon = useBaseUrl('/img/icons/rust.svg');
  const angularIcon = useBaseUrl('/img/icons/angular.svg');
  const flutterIcon = useBaseUrl('/img/icons/flutter.svg');
  const mcpIcon = useBaseUrl('/img/icons/mcp.svg');
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroBadge}>
          <span>MIT License</span>
          <span>·</span>
          <img src={nodeIcon} alt="" aria-hidden="true" className={styles.heroBadgeIcon} />
          <span>Node</span>
          <img src={pythonIcon} alt="" aria-hidden="true" className={styles.heroBadgeIcon} />
          <span>Python</span>
          <img src={dartIcon} alt="" aria-hidden="true" className={styles.heroBadgeIcon} />
          <span>Dart</span>
          <img src={rustIcon} alt="" aria-hidden="true" className={styles.heroBadgeIcon} />
          <span>Rust backends</span>
          <img src={angularIcon} alt="" aria-hidden="true" className={styles.heroBadgeIcon} />
          <span>Angular</span>
          <img src={flutterIcon} alt="" aria-hidden="true" className={styles.heroBadgeIcon} />
          <span>Flutter clients</span>
        </div>
        {/*
          The H1 keeps the brand at full size but carries the descriptor too:
          "awesome-node-auth" alone told search engines nothing about what the
          page is for. The suffix is inside the H1 on purpose — one H1 per page.
        */}
        <h1 className={styles.heroTitle}>
          {siteConfig.title}
          <span className={styles.heroTitleSuffix}>
            Self-hosted authentication library for Node.js
          </span>
        </h1>
        <p className={styles.heroTagline}>{siteConfig.tagline}</p>

        {/* ── MCP server highlight ─────────────────────────────────── */}
        <div className={styles.mcpBanner}>
          <div className={styles.mcpBannerIcon}>
            <img src={mcpIcon} alt="" aria-hidden="true" className={styles.mcpIconImg} />
          </div>
          <div className={styles.mcpBannerText}>
            <span className={styles.mcpBannerLabel}>✨ AI-powered setup</span>
            <span className={styles.mcpBannerDesc}>
              The <strong>awesome-node-auth MCP server</strong> lets your AI assistant configure the entire ecosystem using natural language — Node, Python, Dart, or Rust backend + Angular, Flutter, or any web framework/library through auth.js and the served UI (headless/headful).<br />
              <a href="./docs/mcp-server" className={styles.mcpBannerLink}>
                Try the AI assistant →
              </a>
            </span>
          </div>
        </div>

        <div className={styles.heroButtons}>
          <Link className={clsx('button', styles.primaryButton)} to="/docs/intro">
            Quickstart →
          </Link>
          <Link className={clsx('button', styles.liveButton)} to="/demo-live">
            🎮 Live Demo
          </Link>
          <Link className={clsx('button', styles.demoButton)} to="/demo">
            📄 Code Demo
          </Link>
          <Link
            className={clsx('button', styles.secondaryButton)}
            to="https://github.com/nik2208/awesome-node-auth"
          >
            GitHub
          </Link>
          <Link
            className={clsx('button', styles.sponsorButton)}
            to="https://github.com/sponsors/nik2208"
          >
            ❤️ Sponsor
          </Link>
        </div>
        <div className={styles.heroInstall}>
          <code>npm install awesome-node-auth</code>
        </div>
        <div className={styles.proudNote}>
          Both this Wiki and the MCP server proudly feature <strong>awesome-node-auth</strong> to power secure communication — part of a growing multi-language ecosystem.
        </div>
      </div>
    </header>
  );
}

function EcosystemCard({ icon, iconPath, iconLabel, name, registry, registryUrl, install, description, href }: EcosystemCard): ReactNode {
  const iconUrl = iconPath ? useBaseUrl(iconPath) : null;
  return (
    <div className={styles.ecosystemCard}>
      <div className={styles.ecosystemCardHeader}>
        <span className={styles.ecosystemIcon}>
          {iconUrl ? (
            <img src={iconUrl} alt="" aria-hidden="true" className={styles.ecosystemIconImg} />
          ) : (
            <span>{icon}</span>
          )}
        </span>
        <div>
          <Link to={href} className={styles.ecosystemName}>{name}</Link>
          <a href={registryUrl} target="_blank" rel="noopener noreferrer" className={styles.ecosystemRegistry}>
            {registry} ↗
          </a>
        </div>
      </div>
      <p className={styles.ecosystemDescription}>{description}</p>
      <code className={styles.ecosystemInstall}>{install}</code>
    </div>
  );
}

function RecipeCard({ icon, iconPath, iconLabel, title, description, href }: RecipeItem): ReactNode {
  const iconUrl = iconPath ? useBaseUrl(iconPath) : null;
  return (
    <Link to={href} className={styles.recipeCard}>
      <div className={styles.recipeIcon}>
        {iconUrl ? (
          <img src={iconUrl} alt="" aria-hidden="true" className={styles.recipeIconImg} />
        ) : (
          <span>{icon}</span>
        )}
      </div>
      <h3 className={styles.recipeTitle}>{title}</h3>
      <p className={styles.recipeDescription}>{description}</p>
      <span className={styles.recipeLink}>View docs →</span>
    </Link>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const siteDescription = siteConfig.customFields?.siteDescription as string;

  return (
    <Layout description={siteDescription}>
      <Head>
        <title>{HOME_TITLE}</title>
        <meta property="og:title" content={HOME_TITLE} />
      </Head>
      <HeroSection />
      <main>
        {/* ── What it is ───────────────────────────────────────────────── */}
        <section className={styles.definitionSection}>
          <div className={styles.container}>
            <p className={styles.definitionText}>
              <strong>awesome-node-auth</strong> is an open-source, self-hosted authentication
              library for Node.js. You install it as an npm package inside your own application
              and it adds JWT sessions with refresh-token rotation, OAuth2 social login, magic
              links, TOTP and SMS two-factor authentication, role-based access control and
              multi-tenancy — running on your own infrastructure, with your own database, and no
              per-user pricing. The same auth model is available for{' '}
              <Link to="/docs/frameworks/python">Python</Link>,{' '}
              <Link to="/docs/frameworks/dart">Dart</Link> and{' '}
              <Link to="/docs/frameworks/rust">Rust</Link> backends, with{' '}
              <Link to="/docs/frameworks/angular">Angular</Link> and{' '}
              <Link to="/docs/frameworks/flutter">Flutter</Link> client libraries.
            </p>
          </div>
        </section>

        {/* ── Ecosystem strip ──────────────────────────────────────────── */}
        <section className={styles.ecosystemSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionHeading}>One auth system. Backend + frontend ecosystem.</h2>
            <p className={styles.sectionSubtitle}>
              Official backend libraries for Node, Python, Dart, and Rust — plus official frontend libraries for Angular and Flutter, and native browser compatibility for any web framework/library via auth.js and the served UI (headless or headful mode).
            </p>
            <h3 className={styles.ecosystemGroupHeading}>Backend libraries</h3>
            <div className={styles.ecosystemGrid}>
              {backendEcosystemCards.map((card) => (
                <EcosystemCard key={card.name} {...card} />
              ))}
            </div>
            <h3 className={styles.ecosystemGroupHeading}>Frontend libraries and browser client</h3>
            <div className={styles.ecosystemGrid}>
              {frontendEcosystemCards.map((card) => (
                <EcosystemCard key={card.name} {...card} />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.compareSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionHeading} style={{ textAlign: 'center' }}>Why awesome-node-auth?</h2>

            <div className={styles.whyBox}>
              <p>
                <strong>awesome-node-auth</strong> started as the simple answer to the management complexity and enterprise subscriptions often required for best-practice authentication — and has since grown into a full <strong>multi-language ecosystem</strong>.
              </p>
              <p>
                The same auth model, feature set, and client library compatibility now spans <strong>Node.js</strong> (core), <strong>Python/FastAPI</strong>, <strong>Dart/Shelf</strong>, and <strong>Rust</strong> backends — all compatible with Angular and Flutter clients out of the box, plus natively ready for any browser framework/library through <strong>auth.js</strong> and the built-in served UI.
              </p>
              <p>
                Solutions like <em>Supertokens</em> are extremely complex, paid if managed, and limited or hard to maintain if self-hosted. <em>Supabase</em> is heavy, packed with features you're forced to carry along even if you don't need them, and similarly limited when self-hosted.
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>awesome-node-auth</strong> gives you the same enterprise-grade features without the architectural bloat or vendor lock-in of cloud platforms — and in your language of choice.
              </p>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th className={styles.highlightCol}>awesome-node-auth</th>
                    <th>Others</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td className={styles.highlightCol}>{row.nodeAuth}</td>
                      <td>{row.others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={styles.recipesSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionHeading}>Choose your recipe</h2>
            <p className={styles.sectionSubtitle}>
              Pick the authentication strategy that fits your app. Mix and match multiple recipes.
            </p>
            <div className={styles.recipesGrid}>
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.title} {...recipe} />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.footerNote}>
          <p style={{ textAlign: 'center' }}>Works with any database · Node.js · Python · Dart · Rust · Angular · Flutter · Any web framework/library via auth.js · MIT License</p>
          <p style={{ textAlign: 'center', marginTop: '10px' }}>
            If awesome-node-auth saves you time, consider{' '}
            <Link to="https://github.com/sponsors/nik2208" style={{ color: '#ff6482', fontWeight: 600 }}>
              ❤️ sponsoring the project
            </Link>
            {' '}— it helps keep it maintained and growing.
          </p>
        </section>
      </main>
    </Layout>
  );
}
