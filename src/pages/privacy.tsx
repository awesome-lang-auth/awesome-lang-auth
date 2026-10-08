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
          The site is hosted on <strong>GitHub Pages</strong>. Every page,
          image and file of the site is requested from GitHub's servers, so
          GitHub receives the technical details of every request, such as your
          IP address, the page requested and your browser's user agent, and
          logs and stores your IP address for security purposes. GitHub
          handles this data under the{' '}
          <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">
            GitHub General Privacy Statement
          </a>.
        </p>
        <p>
          The owner's server keeps the standard technical log of the requests
          it receives for two addresses: for each request, the IP address, the
          time, the address requested, the referring page and the browser's
          user agent. The logs are kept for security and operations and are
          deleted after a limited period.
        </p>
        <ul>
          <li>
            The redirect server of the site's old address,{' '}
            <code>awesomenodeauth.com</code>. A request there only gets a
            redirect to the same page on <code>awesomelangauth.com</code>.
          </li>
          <li>
            The proxy in front of the Umami statistics server,{' '}
            <code>umami.applikat.it</code> (see below). Umami itself does not
            store IP addresses.
          </li>
        </ul>
        <p>
          Apart from these logs and the Umami statistics described below, no
          personal data is collected, and the owner sells or shares none of
          it.
        </p>

        <h2>3. External Services</h2>
        <p>
          Every page loads one external service, Umami. StackBlitz loads only
          when you click.
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
            <strong>StackBlitz</strong>, only when you click. The{' '}
            <Link to="/demo-live/">interactive demo</Link> loads nothing from
            StackBlitz until you click "Load the interactive demo". Then it
            loads a page from StackBlitz that runs the demo. That page belongs
            to StackBlitz: it loads StackBlitz's code and the analytics
            services StackBlitz uses (at the time of writing, Google Tag
            Manager and Segment), and StackBlitz and those services may set
            their own cookies and browser storage. The "Open in StackBlitz"
            links, on that page and on the{' '}
            <Link to="/docs/live-demo/">live demos</Link> page, open StackBlitz
            itself. No page of this site loads anything from StackBlitz before
            you click. What StackBlitz and these services do with this data is
            governed by StackBlitz's{' '}
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
          showed last; they never leave your browser. Only StackBlitz may set
          cookies, and only once you click to load or open a demo:
          StackBlitz's own and those of the services it loads.
        </p>

        <h2>5. Security</h2>
        <p>
          The pages of this site, and the statistics requests they make, use
          HTTPS (TLS). A request to a plain <code>http://</code> address, of
          this site or of its old address, only receives a redirect to the{' '}
          <code>https://</code> address; that first request, including the
          address requested, is not encrypted.
        </p>

        <h2>6. Changes to This Policy</h2>
        <p>
          We may update this policy occasionally. The "Last updated" date at
          the top of this page reflects the most recent revision.
        </p>

        <h2>7. Contact</h2>
        <p>
          For privacy-related questions, including about the server logs, please
          open an issue on{' '}
          <a href="https://github.com/awesome-lang-auth/awesome-node-auth/issues" target="_blank" rel="noreferrer">
            GitHub
          </a>.
        </p>
      </div>
    </Layout>
  );
}
