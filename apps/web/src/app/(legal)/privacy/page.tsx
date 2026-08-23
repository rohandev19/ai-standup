import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | AI Standup',
  description: 'How AI Standup collects, uses, and protects your personal data. Learn about our AI processing practices and your data rights.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.legalPage}>
      <nav className={styles.legalNav}>
        <Link href="/">
          <span className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>AI Standup</span>
        </Link>
        <Link href="/terms">Terms of Service</Link>
      </nav>

      <div className={styles.legalContent}>
        <h1>Privacy Policy</h1>
        <p className={styles.lastUpdated}>Last updated: August 2026</p>

        <p>
          AI Standup (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting the privacy and security of
          your personal data. This Privacy Policy describes what data we collect, how we use it, and your rights
          regarding that data — in accordance with Indonesia&apos;s Personal Data Protection Law (UU PDP No. 27/2022)
          and international best practices.
        </p>

        <h2>1. Data We Collect</h2>

        <h3>1.1 Account Information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Full name (display name)</li>
          <li>Email address</li>
          <li>Password (stored as a bcrypt hash — we never store plaintext passwords)</li>
          <li>Profile avatar (optional)</li>
          <li>Timestamp of your consent to this policy</li>
        </ul>

        <h3>1.2 Standup Content</h3>
        <p>When you submit a daily standup, we store:</p>
        <ul>
          <li>Your &ldquo;yesterday&rdquo; text</li>
          <li>Your &ldquo;today&rdquo; text</li>
          <li>Your &ldquo;blocker&rdquo; text (optional)</li>
          <li>Submission timestamp and status (submitted, late, missed)</li>
        </ul>

        <h3>1.3 Usage Data</h3>
        <p>We automatically collect basic usage information:</p>
        <ul>
          <li>Browser timezone (for workspace timezone detection)</li>
          <li>Login timestamps and IP addresses (for security — rate limiting and abuse prevention)</li>
          <li>WebSocket connection events (for real-time dashboard functionality)</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <p>We use your personal data solely for the following purposes:</p>
        <ul>
          <li><strong>Providing the Service:</strong> Displaying your standups on the workspace dashboard, generating presence status, and managing workspace membership</li>
          <li><strong>AI Summarization:</strong> Your standup text is processed by an external AI service (see Section 3) to generate daily summaries, weekly digests, and blocker severity analysis</li>
          <li><strong>Notifications:</strong> Sending email reminders, blocker alerts, and summary digests based on your notification preferences</li>
          <li><strong>Security:</strong> Rate limiting, abuse prevention, and audit logging of administrative actions within workspaces</li>
        </ul>

        <h2>3. AI Processing Disclosure</h2>
        <p>
          <strong>This is important:</strong> Your standup content (yesterday, today, and blocker text) is sent to
          <strong> Anthropic&apos;s Claude API</strong> for AI-powered summarization and blocker detection. Specifically:
        </p>
        <ul>
          <li>Standup entries are batched per workspace per day and sent as a single API call</li>
          <li>Anthropic processes this data according to their <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a></li>
          <li>We do <strong>not</strong> send your data to any other third-party AI or analytics service</li>
          <li>AI-generated summaries and blocker analyses are stored within your workspace&apos;s isolated data boundary</li>
        </ul>

        <h2>4. Data Isolation &amp; Security</h2>
        <p>
          AI Standup is a multi-tenant platform. Every workspace is fully isolated — your team&apos;s data
          (standup entries, summaries, blocker flags, member lists, audit logs) is <strong>never visible to or
          accessible by other workspaces</strong>. We enforce this at the database query level, API authorization
          level, and WebSocket channel level.
        </p>

        <h2>5. Data Retention</h2>
        <ul>
          <li><strong>Standup entries &amp; AI summaries:</strong> Retained permanently in the current version</li>
          <li><strong>Audit logs:</strong> Retained for a minimum of 1 year</li>
          <li><strong>In-app notifications:</strong> Automatically purged after 30 days</li>
          <li><strong>Expired invite tokens:</strong> Soft-deleted after 30 days</li>
          <li><strong>Password reset tokens:</strong> Hard-deleted after 1-hour expiry</li>
        </ul>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access</strong> your personal data through your profile and standup history</li>
          <li><strong>Export</strong> your workspace data as CSV (available to Workspace Owners)</li>
          <li><strong>Delete</strong> your account and all associated personal data — contact us at <a href="mailto:privacy@aistandup.com">privacy@aistandup.com</a> to request full data deletion</li>
          <li><strong>Withdraw consent</strong> at any time by deleting your account</li>
          <li><strong>Control notifications</strong> — you can mute email reminders per workspace without affecting other members</li>
        </ul>

        <h2>7. Cookies &amp; Local Storage</h2>
        <p>We use:</p>
        <ul>
          <li><strong>HttpOnly cookies</strong> for refresh token storage (authentication only, not tracking)</li>
          <li><strong>Browser localStorage</strong> for auto-saving draft standup text (stays on your device, never sent to our servers unless you submit)</li>
        </ul>
        <p>We do <strong>not</strong> use any third-party tracking cookies, analytics scripts, or advertising cookies.</p>

        <h2>8. Children&apos;s Privacy</h2>
        <p>
          AI Standup is not intended for use by individuals under 16 years of age. We do not knowingly collect
          personal data from children.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we will notify
          registered users via email. The &ldquo;Last updated&rdquo; date at the top of this page indicates when
          this policy was last revised.
        </p>

        <h2>10. Contact</h2>
        <p>
          For privacy-related questions or data deletion requests, contact us at{' '}
          <a href="mailto:privacy@aistandup.com">privacy@aistandup.com</a>.
        </p>
      </div>
    </div>
  );
}
