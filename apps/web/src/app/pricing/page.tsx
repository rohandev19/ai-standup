import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/Button/Button';
import styles from './pricing.module.css';

export const metadata: Metadata = {
  title: 'Pricing | AI Standup',
  description: 'Simple, transparent pricing for AI Standup. Start free with all features. Upgrade when your team grows.',
};

export default function PricingPage() {
  const faqs = [
    {
      q: 'Is the Free plan really free forever?',
      a: 'Yes. The Free plan includes all current features with no time limit. We believe in letting teams experience the full product before considering an upgrade.',
    },
    {
      q: 'What happens when Pro launches?',
      a: 'Your Free plan stays free. Pro will add advanced features like custom standup questions, Slack integration, and voice input. Free users will not lose any existing functionality.',
    },
    {
      q: 'Can I switch plans later?',
      a: 'Absolutely. When paid plans launch, you\'ll be able to upgrade or downgrade at any time. Your data is always preserved regardless of plan changes.',
    },
    {
      q: 'Is there a limit on team members?',
      a: 'The Free plan supports up to 30 members per workspace. If you need more, the upcoming Pro and Enterprise plans will offer higher limits.',
    },
  ];

  return (
    <div className={styles.pricingPage}>
      <nav className={styles.nav}>
        <Link href="/">
          <span className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>AI Standup</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/#features" className={styles.link}>Features</Link>
          <Link href="/login" className={styles.link}>Login</Link>
          <Link href="/register">
            <Button variant="glass">Get Started</Button>
          </Link>
        </div>
      </nav>

      <section className={styles.heroSection}>
        <span className={styles.label}>Pricing</span>
        <h1 className={styles.title}>Simple, transparent pricing</h1>
        <p className={styles.subtitle}>
          Start free with every feature. No credit card required. Upgrade when paid plans launch.
        </p>
      </section>

      <section className={styles.cardsSection}>
        <div className={styles.pricingGrid}>
          {/* Free */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>Free</h3>
              <div className={styles.amount}>
                <span className={styles.currency}>$</span>
                <span className={styles.value}>0</span>
                <span className={styles.period}>/month</span>
              </div>
              <p className={styles.cardDesc}>Everything you need for a small team</p>
            </div>
            <ul className={styles.featureList}>
              <li>Up to 30 team members</li>
              <li>AI daily summaries (Claude-powered)</li>
              <li>AI blocker detection &amp; severity</li>
              <li>Real-time presence dashboard</li>
              <li>Automatic weekly digests</li>
              <li>Team analytics &amp; health score</li>
              <li>Email notifications &amp; reminders</li>
              <li>Standup history &amp; search</li>
              <li>Data export (CSV)</li>
              <li>Activity audit log</li>
            </ul>
            <Link href="/register">
              <Button variant="primary" fullWidth>Start for free</Button>
            </Link>
          </div>

          {/* Pro */}
          <div className={`${styles.card} ${styles.cardFeatured}`}>
            <div className={styles.badge}>Coming Soon</div>
            <div className={styles.cardHeader}>
              <h3>Pro</h3>
              <div className={styles.amount}>
                <span className={styles.currency}>$</span>
                <span className={styles.value}>8</span>
                <span className={styles.period}>/user/month</span>
              </div>
              <p className={styles.cardDesc}>Advanced features for growing teams</p>
            </div>
            <ul className={styles.featureList}>
              <li>Everything in Free</li>
              <li className={styles.featureNew}>Custom standup questions</li>
              <li className={styles.featureNew}>Slack &amp; Microsoft Teams integration</li>
              <li className={styles.featureNew}>Voice input with AI transcription</li>
              <li className={styles.featureNew}>Multi-language AI summaries</li>
              <li className={styles.featureNew}>Advanced analytics &amp; trends</li>
              <li className={styles.featureNew}>Priority email support</li>
              <li>Unlimited team members</li>
            </ul>
            <Button variant="secondary" fullWidth disabled>Notify me when available</Button>
          </div>

          {/* Enterprise */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>Enterprise</h3>
              <div className={styles.amount}>
                <span className={styles.value} style={{ fontSize: '2rem' }}>Custom</span>
              </div>
              <p className={styles.cardDesc}>For organizations with specific requirements</p>
            </div>
            <ul className={styles.featureList}>
              <li>Everything in Pro</li>
              <li className={styles.featureNew}>SSO / SAML authentication</li>
              <li className={styles.featureNew}>Jira, GitHub &amp; Linear integrations</li>
              <li className={styles.featureNew}>Dedicated instance</li>
              <li className={styles.featureNew}>Custom AI model configuration</li>
              <li className={styles.featureNew}>SLA guarantee (99.9%)</li>
              <li className={styles.featureNew}>Dedicated onboarding &amp; support</li>
              <li className={styles.featureNew}>Custom data retention policies</li>
            </ul>
            <Button variant="secondary" fullWidth disabled>Contact sales</Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.faqSection}>
        <h2 className={styles.faqTitle}>Frequently asked questions</h2>
        <div className={styles.faqList}>
          {faqs.map((faq, i) => (
            <details key={i} className={styles.faqItem}>
              <summary className={styles.faqQ}>{faq.q}</summary>
              <p className={styles.faqA}>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer mini */}
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} AI Standup. <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></p>
      </footer>
    </div>
  );
}
