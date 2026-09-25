import React from 'react';
import Layout from '@theme/Layout';

export default function PrivacyPage(): React.ReactElement {
  return (
    <Layout
      title="Privacy Policy"
      description="node-auth library Privacy Policy"
    >
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1>Privacy Policy</h1>
        <p style={{ color: '#64748b' }}>Last updated: {new Date().getFullYear()}</p>

        <h2>1. Who We Are</h2>
        <p>
          This service is operated by <strong>nik2208</strong> and provides the
          <strong> awesome-node-auth</strong> library — a database-agnostic JWT
          authentication toolkit for Node.js. The library can be configured
          programmatically or via the companion MCP server using AI assistants
          (VS Code Copilot, Cursor, Claude Desktop, etc.).
        </p>

        <h2>2. Data We Collect</h2>
        <p>
          When you authenticate via OAuth (Google or GitHub) we receive and
          store the following data provided by the OAuth provider:
        </p>
        <ul>
          <li>Email address</li>
          <li>Display name (first and last name)</li>
          <li>Profile picture URL</li>
          <li>OAuth provider identifier (user ID from Google / GitHub)</li>
        </ul>
        <p>
          We also store:
        </p>
        <ul>
          <li>JWT refresh tokens (hashed) for session management</li>
          <li>API keys you create (stored as a bcrypt hash; the raw key is shown only once)</li>
          <li>Usage statistics (request counts per API key, per billing period)</li>
          <li>Timestamps: account creation, last login, last API key usage</li>
        </ul>
        <p>
          We do <strong>not</strong> collect passwords, payment information, or
          any data beyond what is necessary to operate the service.
        </p>

        <h2>3. How We Use Your Data</h2>
        <p>Your data is used exclusively to:</p>
        <ul>
          <li>Authenticate you and maintain your session (JWT cookies)</li>
          <li>Identify you when you make API calls with an API key</li>
          <li>Enforce plan limits (free / pro / enterprise)</li>
          <li>Display your profile in the account dashboard</li>
        </ul>
        <p>
          We do <strong>not</strong> sell, rent, or share your personal data
          with third parties for marketing purposes.
        </p>

        <h2>4. Cookies</h2>
        <p>
          We use the following cookies, all of which are strictly necessary for
          the service to function:
        </p>
        <ul>
          <li>
            <code>accessToken</code> — HttpOnly JWT cookie containing your
            short-lived session (15 minutes by default).
          </li>
          <li>
            <code>refreshToken</code> — HttpOnly JWT cookie used to obtain a new
            access token without re-authenticating (7 days by default).
          </li>
          <li>
            <code>csrf-token</code> — Non-HttpOnly CSRF double-submit cookie
            (only set when CSRF protection is enabled).
          </li>
        </ul>
        <p>
          These cookies are set only after you explicitly log in and are
          required for the service to work. No tracking or analytics cookies
          are used.
        </p>

        <h2>5. Data Retention</h2>
        <p>
          Your data is retained as long as your account is active. You can
          delete your account at any time via the Account page or by contacting
          us. Upon deletion all personal data is permanently removed from our
          database.
        </p>

        <h2>6. Your Rights (GDPR)</h2>
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
          <a href="https://github.com/nik2208/awesome-node-auth/issues" target="_blank" rel="noreferrer">
            GitHub
          </a>{' '}
          or contact us directly.
        </p>

        <h2>7. Security</h2>
        <p>
          All data in transit is encrypted with TLS. Raw API keys are never
          stored — only a bcrypt hash is persisted. JWT secrets are
          environment-variable-managed and never committed to source control.
        </p>

        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this policy occasionally. The "Last updated" date at
          the top of this page reflects the most recent revision. Continued use
          of the service after changes constitutes acceptance of the updated
          policy.
        </p>

        <h2>9. Contact</h2>
        <p>
          For privacy-related questions please open an issue on{' '}
          <a href="https://github.com/nik2208/awesome-node-auth/issues" target="_blank" rel="noreferrer">
            GitHub
          </a>.
        </p>
      </div>
    </Layout>
  );
}
