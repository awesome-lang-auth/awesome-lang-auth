import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
// Load wiki/.env so AI_LLM_ENDPOINT etc. are available at dev/build time
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
dotenv.config();

// ── Constants ──────────────────────────────────────────────────────────────────
const SITE_URL = 'https://www.awesomenodeauth.com';
const SOCIAL_CARD_URL = `${SITE_URL}/img/docusaurus-social-card.jpg`;

/**
 * Single source of truth for the sitewide meta description.
 * Kept at ~155 characters so Google renders it whole, and reused by the
 * homepage (src/pages/index.tsx) and by the JSON-LD blocks below so the
 * snippet, the social card and the structured data never drift apart.
 */
const SITE_DESCRIPTION =
  'awesome-node-auth is a self-hosted, database-agnostic authentication library ' +
  'for Node.js: JWT, OAuth2, magic link, TOTP 2FA, RBAC and multi-tenancy.';

// Read version from root package.json so there is a single source of truth.
// __dirname is the wiki/ directory in the jiti-transpiled CJS context.
const LIB_VERSION: string = (() => {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
    return pkg.version as string;
  } catch {
    return '';
  }
})();
const CHANGELOG_URL = 'https://github.com/nik2208/awesome-node-auth/releases';

/**
 * Validated account API origin (protocol + host + port, no path/query/fragment).
 * Returns empty string when ACCOUNT_API_URL is absent or not a valid http/https URL.
 * Using only the URL origin prevents any environment-variable injection into
 * <script src> or inline script attributes at build time.
 */
const ACCOUNT_API_ORIGIN = (() => {
  const raw = process.env.ACCOUNT_API_URL ?? '';
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return parsed.origin; // e.g. "https://api.example.com"
  } catch {
    return '';
  }
})();

// JSON-LD structured data — injected into every page <head>
const JSON_LD_SOFTWARE: object = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'awesome-node-auth',
  // Most people type the brand with spaces; declaring both spellings helps
  // search engines and AI assistants resolve them to the same entity.
  alternateName: ['Awesome Node Auth', 'awesome node auth'],
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Cross-platform',
  description:
    `${SITE_DESCRIPTION} ` +
    'Works with Express, NestJS, Next.js and Fastify, and with any database through ' +
    'a store interface. Also ships real-time SSE, webhooks, API keys, telemetry, ' +
    'SMS OTP and an MCP server, with Python, Dart and Rust backend ports.',
  url: SITE_URL,
  // Free and open source — stated explicitly so it is machine-readable.
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  downloadUrl: 'https://www.npmjs.com/package/awesome-node-auth',
  author: {
    '@type': 'Person',
    name: 'nik2208',
    url: 'https://github.com/nik2208',
  },
  license: 'https://opensource.org/licenses/MIT',
  keywords: 'authentication, JWT, Node.js, TypeScript, OAuth2, multi-tenancy, RBAC, 2FA, webhooks',
  sameAs: [
    'https://github.com/nik2208/awesome-node-auth',
    'https://www.npmjs.com/package/awesome-node-auth',
  ],
};

// NOTE: no SearchAction here on purpose. There is no search plugin installed,
// so /search returns 404 — declaring a SearchAction that points at a dead URL
// is a false structured-data claim. Re-add it together with a search plugin.
const JSON_LD_WEBSITE: object = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'awesome-node-auth',
  alternateName: 'Awesome Node Auth',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: 'en',
};

const config: Config = {
  title: 'awesome-node-auth',
  tagline: 'Self-hosted auth ecosystem for Node.js, Python, Dart and Rust',
  favicon: 'img/favicon.ico',

  url: SITE_URL,
  baseUrl: '/',

  organizationName: 'awesomenodeauth',
  projectName: 'awesome-node-auth',
  trailingSlash: true,

  onBrokenLinks: 'warn',

  // ── Structured data (JSON-LD) injected into every page ─────────────────────
  headTags: [
    // ── awesome-node-auth global script ──────────────────────────────────────
    // Load the library's auth.js before React so it patches window.fetch early.
    // This gives AiAssistant and account.tsx a single shared refresh singleton
    // (window.AwesomeNodeAuth.refresh()) instead of each firing their own HTTP
    // refresh request — which with token rotation causes a 401 on the second call.
    //
    // The MCP server mounts auth.js in headless mode, which means:
    //   - auth.js is served at /auth/ui/auth.js
    //   - the /auth/ui/config endpoint reports { headless: true }
    //   - auth.js automatically installs no-op onSessionExpired / onLogout /
    //     onRefreshFail handlers so it never redirects away from Docusaurus pages
    //
    // Only injected when ACCOUNT_API_URL is set (cross-domain deployment).
    // For same-domain deployments the wiki components reach /auth/… via relative
    // paths and the window-scoped singleton in authRefresh.ts deduplicates calls.
    ...(ACCOUNT_API_ORIGIN
      ? ([
          {
            tagName: 'script',
            attributes: {
              src: `${ACCOUNT_API_ORIGIN}/auth/ui/auth.js`,
              crossorigin: 'anonymous',
            },
          },
          {
            tagName: 'script',
            attributes: {},
            // Configure the API prefix and enable headless mode immediately.
            // headless:true installs no-op onSessionExpired/onLogout/onRefreshFail
            // handlers right away (before AuthService.init() fetches the config) so
            // auth.js never redirects window.location away from Docusaurus pages.
            innerHTML: `if(window.AwesomeNodeAuth){window.AwesomeNodeAuth.init({apiPrefix:${JSON.stringify(`${ACCOUNT_API_ORIGIN}/auth`)},headless:true});}`,
          },
        ] as object[])
      : []),
    {
      tagName: 'script',
      attributes: {
        async: 'true',
        defer: 'true',
        src: 'https://umami.applikat.it/script.js',
        'data-website-id': 'cdc08b1e-82c9-4956-97ba-65df932e42a6',
      },
    },
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify(JSON_LD_SOFTWARE),
    },
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify(JSON_LD_WEBSITE),
    },
  ],

  // Inject AI assistant config from environment variables at build time.
  // See wiki/.env.example for all available variables.
  customFields: {
    aiEndpoint: process.env.AI_LLM_ENDPOINT ?? '',
    aiModel: process.env.AI_MODEL ?? '',
    aiTemperature: process.env.AI_TEMPERATURE ?? '',
    aiMaxTokens: process.env.AI_MAX_TOKENS ?? '',
    aiSystemPrompt: process.env.AI_SYSTEM_PROMPT ?? '',
    accountApiUrl: ACCOUNT_API_ORIGIN,
    // Read by src/pages/index.tsx so the homepage meta description and the
    // JSON-LD description stay the same string.
    siteDescription: SITE_DESCRIPTION,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    }
  },

  themes: ['@docusaurus/theme-mermaid'],

  // ── Plugins ────────────────────────────────────────────────────────────────
  // Google Analytics — only loaded when GOOGLE_ANALYTICS_ID is set at build time
  plugins: [
    ...(process.env.GOOGLE_ANALYTICS_ID
      ? [[
          '@docusaurus/plugin-google-gtag',
          { trackingID: process.env.GOOGLE_ANALYTICS_ID, anonymizeIP: true },
        ]]
      : []),
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Feeds <lastmod> in sitemap.xml (see the sitemap block below) and
          // shows the update date on the page. Requires git history at build
          // time: the Docker build copies the working tree without .git, so
          // when building the image the dates fall back to nothing — build on a
          // real checkout if you want lastmod populated.
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        // ── Sitemap ──────────────────────────────────────────────────────────
        // Automatically generated at /sitemap.xml on each build.
        // Submit this URL in Google Search Console:
        //   https://search.google.com/search-console → Sitemaps
        sitemap: {
          lastmod: 'date',
          // Google ignores changefreq and priority, so omit them to keep the
          // sitemap lean. The plugin accepts null to suppress the fields entirely.
          changefreq: null,
          priority: null,
          // Exclude pages that are not useful to index.
          // These are glob patterns matched against the generated route paths,
          // and the site uses trailingSlash: true — so '/account' alone never
          // matched '/account/' and both pages kept showing up in the sitemap
          // while robots.txt disallowed them (a sitemap/robots conflict in
          // Search Console). Keep every variant listed.
          ignorePatterns: [
            '/account',
            '/account/',
            '/account/**',
            '/demo-live',
            '/demo-live/',
            '/demo-live/**',
            '/search',
            '/search/',
            '/search/**',
          ],
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // ── Global meta tags appended to every page ───────────────────────────
    // These provide sitewide Open Graph, Twitter Card, and verification defaults.
    // Per-page title/description still override og:title / og:description.
    metadata: [
      // Open Graph
      { name: 'og:type',       content: 'website' },
      { name: 'og:image',      content: SOCIAL_CARD_URL },
      { name: 'og:site_name',  content: 'awesome-node-auth' },
      // Twitter / X Card
      { name: 'twitter:card',  content: 'summary_large_image' },
      { name: 'twitter:image', content: SOCIAL_CARD_URL },
      // SEO keywords (supplementary signal — not a primary ranking factor)
      {
        name: 'keywords',
        content:
          'node.js authentication, JWT auth, typescript auth library, express authentication, ' +
          'nestjs authentication, oauth2, multi-tenancy, rbac, role-based access control, ' +
          '2fa totp, magic link login, api key authentication, awesome-node-auth',
      },
      // Google Search Console — backup verification alongside the static HTML file
      { name: 'google-site-verification', content: '635c063a344579f7' },
    ],

    announcementBar: {
      content: '⭐ If you like awesome-node-auth, give it a star on <a href="https://github.com/nik2208/awesome-node-auth">GitHub</a>!',
      backgroundColor: '#00a87a',
      textColor: '#fff',
      isCloseable: true,
    },
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'awesome-node-auth',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/live-demo',
          label: '▶ Live Demo',
          position: 'left',
        },
        {
          to: '/docs/api-reference',
          label: 'API Reference',
          position: 'left',
        },
        {
          to: '/account',
          label: '👤 My Account',
          position: 'right',
        },
        // Version badge — links to GitHub Releases (single source of truth for changelog)
        ...(LIB_VERSION
          ? ([{
              type: 'html',
              position: 'right',
              value: `<a href="${CHANGELOG_URL}" target="_blank" rel="noopener noreferrer" class="navbar-version-badge" aria-label="Changelog v${LIB_VERSION}">v${LIB_VERSION}</a>`,
            }] as object[])
          : []),
        // GitHub icon link (no text label)
        {
          type: 'html',
          position: 'right',
          value: `<a href="https://github.com/nik2208/awesome-node-auth" target="_blank" rel="noopener noreferrer" class="navbar-github-link" aria-label="GitHub repository"></a>`,
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/intro' },
            { label: 'Installation & Configuration', to: '/docs/installation' },
            { label: 'API Reference', to: '/docs/api-reference' },
            { label: 'AI Setup (MCP)', to: '/docs/mcp-server' },
            { label: '▶ Live Demo', to: '/docs/live-demo' },
          ],
        },
        // Sitewide links to the four cluster index pages. Without these the
        // cluster hubs were reachable only from the docs sidebar, so no page
        // outside /docs linked to them.
        {
          title: 'Guides',
          items: [
            { label: 'Authentication methods', to: '/docs/authentication' },
            { label: 'Framework integrations', to: '/docs/frameworks' },
            { label: 'Database adapters', to: '/docs/database' },
            { label: 'Advanced features', to: '/docs/advanced' },
          ],
        },
        {
          title: 'Open Source',
          items: [
            { label: 'GitHub', href: 'https://github.com/nik2208/awesome-node-auth' },
            { label: 'npm Package', href: 'https://www.npmjs.com/package/awesome-node-auth' },
            { label: 'GitHub Discussions', href: 'https://github.com/nik2208/awesome-node-auth/discussions' },
            { label: 'Changelog', href: 'https://github.com/nik2208/awesome-node-auth/releases' },
          ],
        },
        {
          title: 'Legal',
          items: [
            { label: 'Privacy Policy', to: '/privacy' },
            { label: 'Terms of Service', to: '/termsofservice' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} nik2208 — awesome-node-auth is released under the MIT License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['typescript', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
