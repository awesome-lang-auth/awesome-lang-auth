import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
// Load .env so the optional GOOGLE_ANALYTICS_ID is available at dev/build time
// (the Docker build gets it the same way: .env is part of the build context)
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
    'a store interface. Also ships real-time SSE, webhooks, API keys, telemetry ' +
    'and SMS OTP, with Python, Dart and Rust backend ports.',
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

  customFields: {
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
          // and the site uses trailingSlash: true — so '/demo-live' alone would
          // not match the generated '/demo-live/' route, and a page that
          // robots.txt disallows would stay in the sitemap (a sitemap/robots
          // conflict in Search Console). Keep every variant listed.
          ignorePatterns: [
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
