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
          This site has no accounts and no forms, and it never asks you for
          personal information.
        </p>
        <p>
          The only personal data it handles is the standard technical log of
          its web server: for each request, the IP address, the time, the page
          requested and the browser's user agent. The log is kept for security
          and operations and is deleted after a limited period.
        </p>
        <p>
          Nothing else is collected, and nothing is sold or shared.
        </p>

        <h2>3. External Services</h2>
        <p>Your browser also contacts two external services:</p>
        <ul>
          <li>
            <strong>Umami</strong> web analytics, self-hosted at{' '}
            <code>umami.applikat.it</code>, which every page loads. It counts
            visits anonymously: it sets no cookies and does not store IP
            addresses. It records the page viewed, the referring page, and
            general details such as browser, operating system, device type,
            screen size, language and an approximate location (country, region,
            city) derived from the IP address.
          </li>
          <li>
            <strong>StackBlitz</strong>. When you open the{' '}
            <Link to="/demo-live/">interactive demo</Link>, the StackBlitz
            project embedded in that page loads its code from StackBlitz, and
            StackBlitz may set its own cookies and browser storage. The{' '}
            <Link to="/docs/live-demo/">live demos</Link> page loads its
            "Open in StackBlitz" button images from StackBlitz. No other page
            loads anything from StackBlitz. What StackBlitz does with this data
            is governed by its{' '}
            <a href="https://stackblitz.com/privacy-policy" target="_blank" rel="noreferrer">
              privacy policy
            </a>.
          </li>
        </ul>

        <h2>4. Cookies</h2>
        <p>
          This site sets no cookies of its own. Your browser's local storage
          keeps a few display preferences, such as the colour theme or a closed
          announcement bar, and they never leave your browser. Only the
          StackBlitz demo described above may set cookies.
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
