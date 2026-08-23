import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Terms of Service | AI Standup',
  description: 'Terms and conditions for using the AI Standup platform. Read about acceptable use, account policies, and service limitations.',
};

export default function TermsOfServicePage() {
  return (
    <div className={styles.legalPage}>
      <nav className={styles.legalNav}>
        <Link href="/">
          <span className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>AI Standup</span>
        </Link>
        <Link href="/privacy">Privacy Policy</Link>
      </nav>

      <div className={styles.legalContent}>
        <h1>Terms of Service</h1>
        <p className={styles.lastUpdated}>Last updated: August 2026</p>

        <p>
          Welcome to AI Standup. By creating an account or using our service, you agree to be bound by these
          Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, do not use the service.
        </p>

        <h2>1. Description of Service</h2>
        <p>
          AI Standup is an async team standup platform that allows team members to submit daily progress updates,
          and uses artificial intelligence to generate summaries, detect blockers, and provide team analytics.
          The service is provided as a multi-tenant SaaS application accessible via web browser.
        </p>

        <h2>2. Account Registration</h2>
        <ul>
          <li>You must provide a valid email address and create a password to register</li>
          <li>You must verify your email address before creating or joining a workspace</li>
          <li>You are responsible for maintaining the security of your account credentials</li>
          <li>You must be at least 16 years old to create an account</li>
          <li>One person may maintain only one account (no duplicate accounts)</li>
        </ul>

        <h2>3. Workspace &amp; Team Management</h2>
        <ul>
          <li>Each workspace has exactly one Owner, who has full administrative control</li>
          <li>Owners can appoint Admins and invite Members via email</li>
          <li>Workspace data (standup entries, summaries, member lists) is strictly isolated — no cross-workspace data access is permitted</li>
          <li>When a member is removed from a workspace, their historical standup data is retained (soft removal) for team continuity</li>
          <li>The Owner must transfer ownership before leaving a workspace</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You agree <strong>not</strong> to:</p>
        <ul>
          <li>Use the service for any unlawful purpose or to violate any applicable laws</li>
          <li>Submit content that is abusive, threatening, defamatory, or contains malware</li>
          <li>Attempt to access workspaces, data, or accounts that do not belong to you</li>
          <li>Circumvent rate limits, security measures, or access controls</li>
          <li>Use automated scripts or bots to interact with the service without prior authorization</li>
          <li>Resell or redistribute the service without our written consent</li>
        </ul>

        <h2>5. Content Ownership</h2>
        <ul>
          <li>You retain ownership of all content you submit (standup entries, profile information)</li>
          <li>By submitting content, you grant us a limited license to store, process, and display your content within your workspace&apos;s context</li>
          <li>You grant us permission to send your standup content to our AI provider (Anthropic Claude API) for the purpose of generating summaries and blocker analysis</li>
          <li>AI-generated content (summaries, blocker severity assessments) is created by the service and provided to your workspace</li>
        </ul>

        <h2>6. AI Processing</h2>
        <p>
          You acknowledge and consent that:
        </p>
        <ul>
          <li>Your standup text is processed by Anthropic&apos;s Claude API to generate AI summaries and blocker detection</li>
          <li>AI outputs are automated and may not always be perfectly accurate — they should be reviewed by humans before making critical decisions</li>
          <li>We batch AI API calls per workspace per day to optimize cost and performance</li>
          <li>We do not send your content to any AI service other than the configured provider</li>
        </ul>

        <h2>7. Data Export &amp; Portability</h2>
        <p>
          Workspace Owners can export standup entries and AI summaries as CSV files for offline use or data
          portability. Export requests are rate-limited to prevent abuse.
        </p>

        <h2>8. Account Termination</h2>
        <ul>
          <li><strong>By you:</strong> You may delete your account at any time by contacting us. Upon deletion, your personal data will be permanently removed. Historical standup entries in workspaces you belonged to will be anonymized</li>
          <li><strong>By us:</strong> We reserve the right to suspend or terminate accounts that violate these Terms, engage in abusive behavior, or pose a security risk to other users</li>
        </ul>

        <h2>9. Service Availability</h2>
        <ul>
          <li>We aim for high availability but do not guarantee 100% uptime</li>
          <li>The service is designed to degrade gracefully — if the AI API is unavailable, standup submissions continue to work normally</li>
          <li>We may perform scheduled maintenance with advance notice when possible</li>
        </ul>

        <h2>10. Limitation of Liability</h2>
        <p>
          AI Standup is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied.
          We are not liable for any indirect, incidental, or consequential damages arising from your use of
          the service, including but not limited to:
        </p>
        <ul>
          <li>Inaccuracies in AI-generated summaries or blocker assessments</li>
          <li>Service interruptions or data loss due to infrastructure failures</li>
          <li>Unauthorized access resulting from your failure to secure your account credentials</li>
        </ul>

        <h2>11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Material changes will be communicated via email to
          registered users at least 14 days before taking effect. Continued use of the service after changes
          take effect constitutes acceptance of the updated Terms.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with the laws of the Republic of Indonesia.
          Any disputes arising from these Terms will be resolved through the applicable courts in Indonesia.
        </p>

        <h2>13. Contact</h2>
        <p>
          For questions about these Terms, contact us at{' '}
          <a href="mailto:legal@aistandup.com">legal@aistandup.com</a>.
        </p>
      </div>
    </div>
  );
}
