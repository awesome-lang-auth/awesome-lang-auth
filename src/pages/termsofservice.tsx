import React from 'react';
import Layout from '@theme/Layout';

export default function TermsOfServicePage(): React.ReactElement {
  return (
    <Layout
      title="Terms of Service"
      description="node-auth library Terms of Service"
    >
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1>Terms of Service</h1>
        <p style={{ color: '#64748b' }}>Last updated: {new Date().getFullYear()}</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the <strong>awesome-node-auth</strong> documentation
          site and its associated services ("Service") you agree to be bound by
          these Terms of Service. If you do not agree, please do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          The Service provides documentation, a live demo, and an AI assistant for
          the <strong>awesome-node-auth</strong> library — a database-agnostic JWT
          authentication toolkit for Node.js. The library can be integrated into any
          Node.js application and configured via code or through the companion MCP
          server, which allows AI development tools to scaffold authentication
          configuration via natural language.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          Access to the Service requires authentication via an OAuth provider
          (Google or GitHub). You are responsible for:
        </p>
        <ul>
          <li>Keeping your API keys confidential.</li>
          <li>All activity that occurs under your account.</li>
          <li>Immediately revoking any keys you believe have been compromised.</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Violate any applicable law or regulation.</li>
          <li>Transmit malware, spam, or other harmful content.</li>
          <li>Attempt to gain unauthorised access to the Service or its infrastructure.</li>
          <li>Abuse rate limits or circumvent usage quotas.</li>
          <li>Resell or sublicense access to the Service without permission.</li>
        </ul>

        <h2>5. Service Plans and Limits</h2>
        <p>
          The Service is offered under different plans (Free, Pro, Enterprise)
          with associated rate limits and quotas. Exceeding plan limits may
          result in throttling or temporary suspension of API access. Plan
          details are subject to change with reasonable notice.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          The awesome-node-auth library and MCP server are open-source software released
          under the{' '}
          <a href="https://github.com/nik2208/awesome-node-auth/blob/main/LICENSE" target="_blank" rel="noreferrer">
            MIT License
          </a>. The documentation and associated content are copyright © nik2208.
        </p>

        <h2>7. Privacy</h2>
        <p>
          Your use of the Service is also governed by our{' '}
          <a href="/awesome-node-auth/privacy">Privacy Policy</a>, which is incorporated
          into these Terms by reference.
        </p>

        <h2>8. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND,
          EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED OR ERROR-FREE.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL
          NIK2208 BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER
          INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL,
          OR OTHER INTANGIBLE LOSSES.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Material
          changes will be announced via the project's GitHub repository. Your
          continued use of the Service after the effective date of any changes
          constitutes acceptance of the new Terms.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with
          applicable law. Any disputes arising from these Terms shall be resolved
          through good-faith negotiation before resorting to formal proceedings.
        </p>

        <h2>12. Contact</h2>
        <p>
          For questions about these Terms please open an issue on{' '}
          <a href="https://github.com/nik2208/awesome-node-auth/issues" target="_blank" rel="noreferrer">
            GitHub
          </a>.
        </p>
      </div>
    </Layout>
  );
}
