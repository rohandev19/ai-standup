import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/Button/Button';
import { Check } from 'lucide-react';
import styles from './pricing.module.css';

export const metadata: Metadata = {
  title: 'Pricing | AI Standup',
  description: 'Simple, transparent pricing for AI Standup. Start free with all core features during public beta.',
};

export default function PricingPage() {
  const faqs = [
    {
      q: 'Is the Free plan really free?',
      a: 'Yes. The Free plan includes all core standup features without a time limit. We believe in letting teams experience the product before considering paid plans.',
    },
    {
      q: 'What happens when Pro launches?',
      a: 'Your Free plan stays free. Pro will add enterprise features like custom question workflows and Slack integrations. Free workspaces retain full functionality.',
    },
    {
      q: 'Can I switch plans later?',
      a: 'Yes. When paid tiers open, you can upgrade or downgrade at any time. Your standup history is preserved.',
    },
    {
      q: 'Is there a limit on team members?',
      a: 'The Free tier supports up to 5 members per workspace. Pro plans support growing teams with higher limits.',
    },
  ];

  return (
    <div className={styles.pricingPage}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          AI Standup
        </Link>
        <div className={styles.navLinks}>
          <Link href="/#features" className={styles.link}>Features</Link>
          <Link href="/login" className={styles.link}>Log in</Link>
          <Link href="/register">
            <Button variant="primary">Get started</Button>
          </Link>
        </div>
      </nav>

      <section className={styles.heroSection}>
        <h1 className={styles.title}>Simple, transparent plans</h1>
        <p className={styles.subtitle}>
          Start free with all core capabilities during our public beta. No credit card required.
        </p>
      </section>

      <section className={styles.cardsSection}>
        <div className={styles.pricingGrid}>
          {/* Free */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Free</h3>
              <div className={styles.amount}>
                <span className={styles.currency}>$</span>
                <span className={styles.value}>0</span>
                <span className={styles.period}>/month</span>
              </div>
              <p className={styles.cardDesc}>Everything you need for a small team</p>
            </div>
            <ul className={styles.featureList}>
              <li><Check size={16} className={styles.checkIcon} /> Up to 5 team members</li>
              <li><Check size={16} className={styles.checkIcon} /> Daily standup submissions</li>
              <li><Check size={16} className={styles.checkIcon} /> Real-time presence dashboard</li>
              <li><Check size={16} className={styles.checkIcon} /> Email reminders & notifications</li>
              <li><Check size={16} className={styles.checkIcon} /> Standup history & search</li>
            </ul>
            <Link href="/register">
              <Button variant="secondary" fullWidth>Get started free</Button>
            </Link>
          </div>

          {/* Pro */}
          <div className={`${styles.card} ${styles.cardFeatured}`}>
            <div className={styles.badge}>Free during beta</div>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Pro</h3>
              <div className={styles.amount}>
                <span className={styles.currency}>$</span>
                <span className={styles.value}>0</span>
                <span className={styles.period}>/month</span>
              </div>
              <p className={styles.cardDesc}>For growing engineering teams requiring AI synthesis</p>
            </div>
            <ul className={styles.featureList}>
              <li><Check size={16} className={styles.checkIcon} /> Everything in Free</li>
              <li><Check size={16} className={styles.checkIcon} /> Unlimited team members</li>
              <li><Check size={16} className={styles.checkIcon} /> AI daily summaries (Claude)</li>
              <li><Check size={16} className={styles.checkIcon} /> AI blocker detection & severity</li>
              <li><Check size={16} className={styles.checkIcon} /> Team health & participation metrics</li>
            </ul>
            <Link href="/register">
              <Button variant="primary" fullWidth>Get started free</Button>
            </Link>
          </div>

          {/* Enterprise */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Enterprise</h3>
              <div className={styles.amount}>
                <span className={styles.value} style={{ fontSize: '2.5rem' }}>Custom</span>
              </div>
              <p className={styles.cardDesc}>For organizations with specific compliance requirements</p>
            </div>
            <ul className={styles.featureList}>
              <li><Check size={16} className={styles.checkIcon} /> Everything in Pro</li>
              <li><Check size={16} className={styles.checkIcon} /> Weekly synthesized AI digests</li>
              <li><Check size={16} className={styles.checkIcon} /> Full CSV data exports</li>
              <li><Check size={16} className={styles.checkIcon} /> Priority technical support</li>
            </ul>
            <Link href="/register">
              <Button variant="secondary" fullWidth>Contact team</Button>
            </Link>
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
