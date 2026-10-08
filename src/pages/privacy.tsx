import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function PrivacyPage(): React.ReactElement {
  return (
    <Layout
      title="Privacy Policy"
      description="Privacy Policy of the awesome-lang-auth documentation site"
    >
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1>Privacy Policy</h1>
        <p style={{ color: '#64748b' }}>Last updated: 2026-10-08</p>

        <h2>1. Who We Are</h2>
        <p>
          This service is operated by <strong>nik2208</strong> and provides the
          documentation of <strong>awesome-lang-auth</strong>, a family of
          self-hosted authentication libraries for Node.js and other languages.
        </p>

        <h2>2. Data We Collect</h2>
        <p>
          This site has no accounts and never asks you for personal
          information. The sign-up and login forms of the interactive demo are
          part of the demo: nothing you type there is sent to this site.
        </p>
        <p>
          The only personal data it keeps is the standard technical log of its
          web server: for each request, the IP address, the time, the page
          requested, the referring page and the browser's user agent. The log
          is kept for security and operations and is deleted after a limited
          period.
        </p>
        <p>
          No other personal data is collected, and nothing is sold or shared.
        </p>

        <h2>3. External Services</h2>
        <p>
          Every page loads one external service, Umami. Two pages also load
          content from StackBlitz.
        </p>
        <ul>
          <li>
            <strong>Umami</strong> web analytics, self-hosted at{' '}
            <code>umami.applikat.it</code>. It counts visits anonymously: it
            sets no cookies, and Umami itself does not store IP addresses. It
            records the page viewed, the referring page, and general details
            such as browser, operating system, device type, screen size,
            language and an approximate location (country, region, city)
            derived from the IP address.
          </li>
          <li>
            <strong>StackBlitz</strong>. When you open the{' '}
            <Link to="/demo-live/">interactive demo</Link>, it loads a page
            from StackBlitz that runs the demo. That page belongs to
            StackBlitz: it loads StackBlitz's code and the analytics services
            StackBlitz uses (at the time of writing, Google Tag Manager and
            Segment), and StackBlitz and those services may set their own
            cookies and browser storage. The{' '}
            <Link to="/docs/live-demo/">live demos</Link> page loads its
            "Open in StackBlitz" button images from StackBlitz. No other page
            loads anything from StackBlitz. What StackBlitz and these services
            do with this data is governed by StackBlitz's{' '}
            <a href="https://stackblitz.com/privacy-policy" target="_blank" rel="noreferrer">
              privacy policy
            </a>.
          </li>
        </ul>

        <h2>4. Cookies</h2>
        <p>
          This site sets no cookies of its own. Your browser's local storage
          keeps a few display settings, such as the colour theme, whether you
          closed the announcement bar and which title animation the home page
          showed last; they never leave your browser. Only the StackBlitz page
          in the interactive demo may set cookies: StackBlitz's own and those
          of the services it loads.
        </p>

        <h2>5. Security</h2>
        <p>
          All data in transit is encrypted with TLS.
        </p>

        <h2>6. Changes to This Policy</h2>
        <p>
          We may update this policy occasionally. The "Last updated" date at
          the top of this page reflects the most recent revision.
        </p>

        <h2>7. Contact</h2>
        <p>
          For privacy-related questions, including about the server log, please
          open an issue on{' '}
          <a href="https://github.com/awesome-lang-auth/awesome-node-auth/issues" target="_blank" rel="noreferrer">
            GitHub
          </a>.
        </p>
      </div>
    </Layout>
  );
}
