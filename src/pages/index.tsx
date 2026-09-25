import type { ReactNode } from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import HomeHero from '@site/src/components/HomeHero';
import RuntimeIcon from '@site/src/components/RuntimeIcon';
import CopyButton from '@site/src/components/CopyButton';
import ExternalIcon from '@site/src/components/ExternalIcon';
import { CLIENTS, MATURITY_INFO, SERVERS, type Runtime, type RuntimeId } from '@site/src/data/runtimes';
import styles from './index.module.css';

// Homepage <title>, written out instead of Layout's `title` prop (which would
// append " | awesome-node-auth"). At most 65 characters, keyword first.
const HOME_TITLE = 'Multi-language self-hosted authentication | awesome-lang-auth';

// The home's own meta and og description (the sitewide one in
// docusaurus.config.ts still describes the Node.js library).
const HOME_DESCRIPTION =
  'awesome-lang-auth: self-hosted authentication for Node.js, Go, AWS Lambda, Python, Rust ' +
  'and Dart servers, with Angular, React and Flutter clients. MIT.';

const LAMBDA_EXAMPLES = 'https://github.com/awesome-lang-auth/awesome-lambda-auth/tree/main/examples';

// ── Recipes ──────────────────────────────────────────────────────────────────

interface RecipeItem {
  icon?: string;
  runtime?: RuntimeId;
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
    description: 'Forward auth events to external services with HMAC-signed outgoing webhooks and scripted inbound webhooks.',
    href: '/docs/advanced/webhooks',
  },
  {
    icon: '📊',
    title: 'Telemetry',
    description: 'Persist every auth event to any database via ITelemetryStore and query the history through the tools router.',
    href: '/docs/advanced/telemetry',
  },
  {
    icon: '🚀',
    title: 'Cloud Scalable',
    description: 'Stateless architecture by design. Use ISseDistributor and Redis to scale real-time SSE across any number of instances.',
    href: '/docs/advanced/sse-scaling',
  },
  {
    runtime: 'python',
    title: 'Python / FastAPI',
    description: 'Official Python backend library — same auth flows, CSRF, IdP mode, RBAC, and multi-tenancy as the Node.js library.',
    href: '/docs/frameworks/python',
  },
  {
    runtime: 'dart',
    title: 'Dart / Shelf backend',
    description: 'Official Dart backend for Shelf and Dart Frog, with the same auth model as Node.js: cookies, CSRF, OAuth, magic link, RBAC, and IdP mode.',
    href: '/docs/frameworks/dart',
  },
  {
    runtime: 'rust',
    title: 'Rust backend',
    description: 'Official Rust crate for Axum, Actix-web, and Warp — same auth model, RBAC, tenancy, event bus, API keys, and IdP/JWKS support.',
    href: '/docs/frameworks/rust',
  },
  {
    runtime: 'flutter',
    title: 'Flutter client',
    description: 'Official Flutter/Dart client — automatic cookie+CSRF on web/WASM and Bearer on native. Zero token-management boilerplate.',
    href: '/docs/frameworks/flutter',
  },
];

// ── Comparison ───────────────────────────────────────────────────────────────

interface CompareRow {
  feature: string;
  ours: string;
  others: string;
}

const compareRows: CompareRow[] = [
  { feature: 'Database support', ours: 'Any DB via store interfaces (Lambda: DynamoDB)', others: 'Specific DBs only' },
  { feature: 'Auth strategies', ours: '5+ built-in recipes', others: 'Varies' },
  { feature: 'Self-hosted', ours: '✅ Always', others: 'Paid tier or limited' },
  { feature: 'JWT tokens', ours: '✅ Access + refresh pair', others: 'Often session-only' },
  { feature: 'Official backend libraries', ours: 'Node · Go · Python · Rust · Dart, plus an AWS Lambda stack', others: '❌ or third-party only' },
  { feature: 'Official frontend libraries', ours: 'Angular · React · Flutter · auth.js + served UI (any framework, headless/headful)', others: '❌ or third-party only' },
  { feature: 'License', ours: 'MIT', others: 'Mixed' },
];

// ── Components ───────────────────────────────────────────────────────────────

function Maturity({ runtime }: { runtime: Runtime }): ReactNode {
  const info = MATURITY_INFO[runtime.maturity];
  return (
    <span className={styles.maturity} data-maturity={runtime.maturity} title={info.description}>
      {info.label}
    </span>
  );
}

function EcosystemCard({ runtime }: { runtime: Runtime }): ReactNode {
  return (
    <div className={styles.ecosystemCard}>
      <div className={styles.ecosystemCardHeader}>
        <RuntimeIcon id={runtime.id} className={styles.ecosystemIcon} />
        <div className={styles.ecosystemTitle}>
          <Link to={runtime.docs} className={styles.ecosystemName}>
            {runtime.pkg}
          </Link>
          <span className={styles.ecosystemMeta}>
            <Maturity runtime={runtime} />
            <span>{runtime.version ? `v${runtime.version}` : 'from git'}</span>
            <a href={runtime.registryUrl} target="_blank" rel="noopener noreferrer" className={styles.ecosystemRegistry}>
              {runtime.registryLabel} <ExternalIcon />
            </a>
            {runtime.registryUrl !== runtime.repo ? (
              <a href={runtime.repo} target="_blank" rel="noopener noreferrer" className={styles.ecosystemRegistry}>
                GitHub <ExternalIcon />
              </a>
            ) : null}
          </span>
        </div>
      </div>
      <p className={styles.ecosystemDescription}>
        {runtime.description}
        {runtime.note ? <em className={styles.ecosystemNote}> {runtime.note}</em> : null}
      </p>
      <div className={styles.ecosystemInstall}>
        <code>{runtime.command}</code>
        <CopyButton text={runtime.command} label={`Copy the ${runtime.label} install command`} />
      </div>
    </div>
  );
}

/** The one frontend that is not a package: the script the Node.js built-in UI serves. */
function AuthJsCard(): ReactNode {
  const snippet = '<script src="{API_ORIGIN}/auth/ui/auth.js"></script>';
  return (
    <div className={styles.ecosystemCard}>
      <div className={styles.ecosystemCardHeader}>
        <span className={styles.ecosystemEmoji} aria-hidden="true">
          🌍
        </span>
        <div className={styles.ecosystemTitle}>
          <Link to="/docs/advanced/browser-client" className={styles.ecosystemName}>
            auth.js (served by the built-in UI)
          </Link>
          <span className={styles.ecosystemMeta}>
            <span>any web framework</span>
          </span>
        </div>
      </div>
      <p className={styles.ecosystemDescription}>
        Works with any web framework or library in the browser, in headful mode (built-in UI pages) or headless mode. Replace{' '}
        <code>{'{API_ORIGIN}'}</code> with your auth backend origin (e.g. https://api.example.com).
      </p>
      <div className={styles.ecosystemInstall}>
        <code>{snippet}</code>
        <CopyButton text={snippet} label="Copy the auth.js script tag" />
      </div>
    </div>
  );
}

function RecipeCard({ icon, runtime, title, description, href }: RecipeItem): ReactNode {
  return (
    <Link to={href} className={styles.recipeCard}>
      <div className={styles.recipeIcon}>{runtime ? <RuntimeIcon id={runtime} /> : <span>{icon}</span>}</div>
      <h3 className={styles.recipeTitle}>{title}</h3>
      <p className={styles.recipeDescription}>{description}</p>
      <span className={styles.recipeLink}>View docs →</span>
    </Link>
  );
}

function RuntimePill({ runtime }: { runtime: Runtime }): ReactNode {
  return (
    <li className={styles.mixPill}>
      <RuntimeIcon id={runtime.id} className={styles.mixPillIcon} />
      <span>{runtime.label}</span>
    </li>
  );
}

function MixAndMatch(): ReactNode {
  return (
    <section className={styles.mixSection}>
      <div className={styles.container}>
        <h2 className={styles.sectionHeading}>Mix and match: any server, any client</h2>
        <p className={styles.sectionSubtitle}>
          Every server in the family serves the same wire protocol, and every client speaks it. Pick a server for your stack and a
          client for your app: only the base URL changes.
        </p>
        <div className={styles.mixGrid}>
          <div className={styles.mixColumn}>
            <h3 className={styles.mixColumnHeading}>Servers</h3>
            <ul className={styles.mixList}>
              {SERVERS.map((r) => (
                <RuntimePill key={r.id} runtime={r} />
              ))}
            </ul>
          </div>
          <div className={styles.mixWire} aria-hidden="true">
            <svg viewBox="0 0 120 24" className={styles.mixWireLine} preserveAspectRatio="none">
              <path d="M6 12h108" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" fill="none" />
              <path d="M12 5 5 12l7 7M108 5l7 7-7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={styles.mixWireLabel}>one wire protocol</span>
          </div>
          <div className={styles.mixColumn}>
            <h3 className={styles.mixColumnHeading}>Clients</h3>
            <ul className={styles.mixList}>
              {CLIENTS.map((r) => (
                <RuntimePill key={r.id} runtime={r} />
              ))}
            </ul>
          </div>
        </div>
        <pre className={styles.mixCode}>
          <code>
            <span className={styles.mixComment}>{'// Angular: ng-awesome-node-auth'}</span>
            {"\nprovideAuth({ apiPrefix: '/api/auth' })\n\n"}
            <span className={styles.mixComment}>{'// React: @awesome-lang-auth/react'}</span>
            {"\n<AwesomeAuthProvider options={{ apiPrefix: '/api/auth' }}>\n\n"}
            <span className={styles.mixComment}>{'// Flutter: awesome_node_auth_flutter'}</span>
            {"\nAuthClient(AuthOptions(apiPrefix: '/api/auth'))"}
          </code>
        </pre>
        <p className={styles.mixNote}>
          <code>apiPrefix</code> is the only line that knows which server answers. In the browser the clients use HttpOnly cookies
          and a CSRF header, so serve the API from your app&apos;s origin (a reverse-proxy rule is enough); native apps use bearer
          tokens. Checked end to end: the{' '}
          <a href={LAMBDA_EXAMPLES} target="_blank" rel="noopener noreferrer">
            awesome-lambda-auth examples
          </a>{' '}
          run the unmodified Angular and Flutter clients against a deployed Lambda stack.
        </p>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Home(): ReactNode {
  return (
    <Layout description={HOME_DESCRIPTION}>
      <Head>
        <title>{HOME_TITLE}</title>
        <meta property="og:title" content={HOME_TITLE} />
      </Head>
      <HomeHero
        subtitle={
          <>
            One self-hosted auth model for your servers and your clients: JWT sessions with refresh-token rotation, OAuth2, magic
            links and two-factor authentication, on your own infrastructure, with no per-user pricing.
          </>
        }
      />
      <main>
        <MixAndMatch />

        {/* ── Ecosystem ─────────────────────────────────────────────────── */}
        <section className={styles.ecosystemSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionHeading}>One auth system. Backend + frontend ecosystem.</h2>
            <p className={styles.sectionSubtitle}>
              Server libraries for Node.js, Go, Python, Rust and Dart, a deployable AWS Lambda stack, and client libraries for
              Angular, React and Flutter, plus auth.js and the served UI for any web framework. The badge says how far each one is
              today.
            </p>
            <h3 className={styles.ecosystemGroupHeading}>Servers</h3>
            <div className={styles.ecosystemGrid}>
              {SERVERS.map((r) => (
                <EcosystemCard key={r.id} runtime={r} />
              ))}
            </div>
            <h3 className={styles.ecosystemGroupHeading}>Clients and browser script</h3>
            <div className={styles.ecosystemGrid}>
              {CLIENTS.map((r) => (
                <EcosystemCard key={r.id} runtime={r} />
              ))}
              <AuthJsCard />
            </div>
            <dl className={styles.maturityLegend}>
              {(Object.keys(MATURITY_INFO) as (keyof typeof MATURITY_INFO)[]).map((m) => (
                <div key={m} className={styles.maturityLegendItem}>
                  <dt>
                    <span className={styles.maturity} data-maturity={m}>
                      {MATURITY_INFO[m].label}
                    </span>
                  </dt>
                  <dd>{MATURITY_INFO[m].description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Why + comparison ─────────────────────────────────────────── */}
        <section className={styles.compareSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionHeading}>Why awesome-lang-auth?</h2>

            <div className={styles.whyBox}>
              <p>
                <strong>awesome-lang-auth</strong> started as <strong>awesome-node-auth</strong>, the simple answer to the
                management complexity and enterprise subscriptions often required for best-practice authentication, and has since
                grown into a <strong>multi-language family</strong>.
              </p>
              <p>
                The same auth model and wire protocol now span <strong>Node.js</strong> (the reference), <strong>Go</strong>,{' '}
                <strong>Python/FastAPI</strong>, <strong>Rust</strong> and <strong>Dart/Shelf</strong> backends, plus a{' '}
                <strong>serverless AWS Lambda</strong> stack built on the Go core. On the client side there are{' '}
                <strong>Angular</strong>, <strong>React</strong> and <strong>Flutter</strong> libraries, and any browser framework
                can use <strong>auth.js</strong> and the built-in served UI.
              </p>
              <p>
                Solutions like <em>Supertokens</em> are extremely complex, paid if managed, and limited or hard to maintain if
                self-hosted. <em>Supabase</em> is heavy, packed with features you&apos;re forced to carry along even if you don&apos;t
                need them, and similarly limited when self-hosted.
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>awesome-lang-auth</strong> gives you the same enterprise-grade features without the architectural bloat or
                vendor lock-in of cloud platforms, in your language of choice.
              </p>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th className={styles.highlightCol}>awesome-lang-auth</th>
                    <th>Others</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td className={styles.highlightCol}>{row.ours}</td>
                      <td>{row.others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Recipes ───────────────────────────────────────────────────── */}
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

        {/* ── Footer note ──────────────────────────────────────────────── */}
        <section className={styles.footerNote}>
          <p>Node.js · Go · AWS Lambda · Python · Rust · Dart · Angular · React · Flutter · any web framework via auth.js · MIT License</p>
          <p className={styles.sponsorLine}>
            If awesome-lang-auth saves you time, consider{' '}
            <a href="https://github.com/sponsors/nik2208" className={styles.sponsorLink}>
              sponsoring the project
            </a>
            . It helps keep it maintained and growing.
          </p>
        </section>
      </main>
    </Layout>
  );
}
