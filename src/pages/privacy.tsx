import React from 'react';
import Layout from '@theme/Layout';

export default function PrivacyPage(): React.ReactElement {
  return (
    <Layout
      title="Privacy Policy"
      description="Privacy Policy of the awesome-lang-auth documentation site"
    >
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1>Privacy Policy</h1>
        <p style={{ color: '#64748b' }}>Last updated: 2026-09-25</p>

        <h2>1. Who We Are</h2>
        <p>
          This service is operated by <strong>nik2208</strong> and provides the
          documentation of <strong>awesome-lang-auth</strong>, a family of
          self-hosted authentication libraries for Node.js and other languages.
        </p>

        <h2>2. Data We Collect</h2>
        <p>
          We do <strong>not</strong> collect passwords or payment information.
        </p>

        <h2>3. How We Use Your Data</h2>
        <p>
          We do <strong>not</strong> sell, rent, or share your personal data
          with third parties for marketing purposes.
        </p>

        <h2>4. Cookies</h2>
        <p>
          No tracking or analytics cookies are used.
        </p>

        <h2>5. Your Rights (GDPR)</h2>
        <p>
          If you are located in the European Economic Area you have the
          following rights:
        </p>
        <ul>
          <li><strong>Access</strong> — request a copy of the data we hold about you.</li>
          <li><strong>Rectification</strong> — ask us to correct inaccurate data.</li>
          <li><strong>Erasure</strong> — ask us to delete your data ("right to be forgotten").</li>
          <li><strong>Portability</strong> — receive your data in a machine-readable format.</li>
          <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
        </ul>
        <p>
          To exercise any of these rights open an issue on{' '}
          <a href="https://github.com/awesome-lang-auth/awesome-node-auth/issues" target="_blank" rel="noreferrer">
            GitHub
          </a>{' '}
          or contact us directly.
        </p>

        <h2>6. Security</h2>
        <p>
          All data in transit is encrypted with TLS.
        </p>

        <h2>7. Changes to This Policy</h2>
        <p>
          We may update this policy occasionally. The "Last updated" date at
          the top of this page reflects the most recent revision. Continued use
          of the service after changes constitutes acceptance of the updated
          policy.
        </p>

        <h2>8. Contact</h2>
        <p>
          For privacy-related questions please open an issue on{' '}
          <a href="https://github.com/awesome-lang-auth/awesome-node-auth/issues" target="_blank" rel="noreferrer">
            GitHub
          </a>.
        </p>
      </div>
    </Layout>
  );
}
