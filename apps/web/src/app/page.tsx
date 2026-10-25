import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { Button } from '@/components/Button/Button';
import { LandingNav } from '@/components/LandingNav';
import { WaveBackground } from '@/components/WaveBackground';
import { DashboardMockup } from '@/components/DashboardMockup';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck
} from 'lucide-react';


export const metadata: Metadata = {
  title: 'AI Standup | Async Team Standups and AI Summaries',
  description: 'Async team standups with automated AI summaries and real-time blocker detection for remote engineering teams.',
  openGraph: {
    title: 'AI Standup | Async Team Standups and AI Summaries',
    description: 'Async team standups with automated AI summaries and real-time blocker detection for remote engineering teams.',
    type: 'website',
  }
};

export default function LandingPage() {
  const faqs = [
    {
      q: 'How does the AI summary work?',
      a: 'When your team submission window closes each day, our AI reads all standup entries and generates a concise narrative summary highlighting accomplishments, blockers, and participation metrics. Leads read one synthesized digest instead of chasing individual updates.',
    },
    {
      q: 'Is my team data private?',
      a: 'Yes. Every workspace is completely isolated at the database level. Your data is never accessible to other organizations. Standup entries are processed strictly for summarization under enterprise data protection standards.',
    },
    {
      q: 'Do we need to install browser extensions or bots?',
      a: 'No. AI Standup works entirely in any modern browser. There are no bots to configure, no extensions to maintain, and no complex integrations required to get started.',
    },
    {
      q: 'Can teammates submit at different times?',
      a: 'Yes. Each workspace defines a custom window (for example, 08:00 to 11:00 AM in your team timezone). Teammates submit whenever they start their day, and any late submissions are clearly tagged without blocking the team.',
    },
    {
      q: 'What happens if someone forgets to submit?',
      a: 'Members receive an automated reminder 30 minutes before the window closes. If they still do not submit, their status is marked as Missed on the live presence board, giving leads clear visibility without manual check-ins.',
    },
  ];

  return (
    <div className={styles.container}>
      <LandingNav />

      {/* Hero Section */}
      <div className={styles.heroWrapper}>
        <WaveBackground />
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>
              Async daily standups with automated summaries and blocker detection.
            </h1>
            <p className={styles.subtitle}>
              Replace synchronous status calls. Team members share quick updates on their own schedule, and AI generates daily digests and flags blockers in real time.
            </p>
            <div className={styles.ctaGroup}>
              <Link href="/register">
                <Button variant="primary">Start for free</Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="secondary">See how it works</Button>
              </Link>
            </div>
          </div>

          {/* Authentic Dashboard Browser Mockup */}
          <div className={styles.heroMockupWrapper}>
            <DashboardMockup />
          </div>
        </section>

        {/* Smooth Bottom Separators */}
        <div className={styles.heroBottomFade} aria-hidden="true" />
        <div className={styles.heroBottomDivider} aria-hidden="true" />
      </div>


      {/* Core Capabilities */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionHeading}>Built for async teams</h2>
          <p className={styles.sectionLead}>
            Status, daily summaries, and blocker triage in one place.
          </p>
        </div>

        <div className={styles.bentoGrid}>
          {/* Column 1: Stacked Left Cards */}
          <div className={styles.bentoColLeft}>
            {/* Card 1: Live WebSocket Sync */}
            <div className={styles.bentoCard}>
              <div>
                <h3 className={styles.bentoCardTitle}>Sub-second live sync</h3>
                <p className={styles.bentoCardText}>
                  Updates broadcast instantly across your team without manual page refresh.
                </p>
              </div>

              <div className={styles.bentoStreamBar}>
                <div className={styles.bentoStreamBadge}>
                  <span className={styles.bentoStreamDot} />
                  <span>WebSocket live</span>
                </div>
                <span className={styles.bentoStreamPing}>&lt; 20ms sync</span>
              </div>
            </div>

            {/* Card 2: Cost-Controlled AI */}
            <div className={styles.bentoCard}>
              <div>
                <div className={styles.bentoStatNumber}>1 Call</div>
                <div className={styles.bentoStatLabel}>Zero token waste</div>
                <p className={styles.bentoCardText}>
                  All updates are batched into a single daily AI briefing once the window closes.
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: Center Tall Phone Mockup */}
          <div className={styles.bentoColCenter}>
            <div className={styles.mockupPhone}>
              <div className={styles.mockupHeader}>
                <span className={styles.mockupHeaderTitle}>Daily Standup</span>
                <span className={styles.mockupHeaderTime}>09:00 - 11:00</span>
              </div>

              <div className={styles.mockupQuestion}>
                <span className={styles.mockupLabel}>Yesterday</span>
                <div className={styles.mockupInput}>Merged database indexes &amp; verified latency</div>
              </div>

              <div className={styles.mockupQuestion}>
                <span className={styles.mockupLabel}>Today</span>
                <div className={styles.mockupInput}>WebSocket presence gateway &amp; review PRs</div>
              </div>

              <div className={styles.mockupQuestion}>
                <span className={styles.mockupLabel}>Blockers</span>
                <div className={styles.mockupInput}>None · Ready for deployment</div>
              </div>

              <div className={styles.mockupPresenceStack}>
                <div className={styles.mockupPresenceRow}>
                  <span className={styles.mockupPresenceName}>Alex Chen</span>
                  <span className={styles.mockupPresenceStatus}>Submitted</span>
                </div>
                <div className={styles.mockupPresenceRow}>
                  <span className={styles.mockupPresenceName}>Sara Jenkins</span>
                  <span className={styles.mockupPresenceStatus}>Submitted</span>
                </div>
                <div className={styles.mockupPresenceRow}>
                  <span className={styles.mockupPresenceName}>Marcus Vance</span>
                  <span className={styles.mockupPresenceStatusLate}>Late</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Right Tall Card with Radar Concentric Pulse */}
          <div className={styles.bentoColRight}>
            <div>
              <h3 className={styles.bentoCardTitle}>Instant blocker triage</h3>
              <p className={styles.bentoCardText}>
                AI detects impediments and alerts leads before the sprint derails.
              </p>
            </div>

            {/* Concentric Radar Pulse Visual */}
            <div className={styles.radarContainer}>
              <div className={styles.radarRing3} />
              <div className={styles.radarRing2} />
              <div className={styles.radarRing1} />
              <div className={styles.radarCenter}>
                <AlertTriangle size={18} color="var(--sev-high)" />
                <span>1 High</span>
              </div>
            </div>

            <div className={styles.triageStack}>
              <div className={styles.triageRow}>
                <span>OAuth token expired</span>
                <span className={styles.triageTagHigh}>High</span>
              </div>
              <div className={styles.triageRow}>
                <span>Upload URL timeout</span>
                <span className={styles.triageTagMedium}>Medium</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Minimal Horizontal Flow */}
      <section id="how-it-works" className={styles.sectionAlt}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionHeading}>How it works</h2>
          <p className={styles.sectionLead}>
            Three asynchronous steps taking under two minutes a day.
          </p>
        </div>

        <div className={styles.stepsFlow}>
          <div className={styles.stepColumn}>
            <div className={styles.stepMeta}>
              <span className={styles.stepNum}>01</span>
            </div>
            <h3 className={styles.stepTitle}>Submit updates within your window</h3>
            <p className={styles.stepDesc}>
              Teammates post three quick answers: yesterday, today, and blockers on their own schedule.
            </p>
          </div>

          <div className={styles.stepColumn}>
            <div className={styles.stepMeta}>
              <span className={styles.stepNum}>02</span>
            </div>
            <h3 className={styles.stepTitle}>Presence updates in real time</h3>
            <p className={styles.stepDesc}>
              Live board tracks check-ins instantly over WebSockets. Late submissions are flagged without blocking the team.
            </p>
          </div>

          <div className={styles.stepColumn}>
            <div className={styles.stepMeta}>
              <span className={styles.stepNum}>03</span>
            </div>
            <h3 className={styles.stepTitle}>AI generates the workspace digest</h3>
            <p className={styles.stepDesc}>
              AI synthesizes entries into a 30-second briefing and triages blockers by severity as the window closes.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionHeading}>Simple, transparent plans</h2>
          <p className={styles.sectionLead}>
            Currently in public beta. All core features are free for early adopting teams.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {/* Free Tier */}
          <div className={styles.pricingCard}>
            <div className={styles.pricingTop}>
              <h3 className={styles.planName}>Free</h3>
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>$0</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
              <p className={styles.planDesc}>Ideal for small teams exploring async standups</p>
            </div>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Up to 5 team members</li>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Daily standup submissions</li>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Real-time presence dashboard</li>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Email reminders & notifications</li>
            </ul>
            <Link href="/register">
              <Button variant="secondary" fullWidth>Get started free</Button>
            </Link>
          </div>

          {/* Pro Tier */}
          <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
            <div className={styles.pricingBadge}>Free during beta</div>
            <div className={styles.pricingTop}>
              <h3 className={styles.planName}>Pro</h3>
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>$0</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
              <p className={styles.planDesc}>For growing engineering teams requiring AI summaries</p>
            </div>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Unlimited team members</li>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Automated AI daily summaries</li>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> AI blocker detection & severity tagging</li>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Team health and participation analytics</li>
            </ul>
            <Link href="/register">
              <Button variant="primary" fullWidth>Get started free</Button>
            </Link>
          </div>

          {/* Enterprise Tier */}
          <div className={styles.pricingCard}>
            <div className={styles.pricingTop}>
              <h3 className={styles.planName}>Enterprise</h3>
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>Custom</span>
              </div>
              <p className={styles.planDesc}>For organizations with specific compliance requirements</p>
            </div>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Everything in Pro</li>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Weekly synthesized AI digests</li>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Full CSV data export capabilities</li>
              <li><CheckCircle2 size={16} color="var(--status-submitted)" /> Dedicated priority support</li>
            </ul>
            <Link href="/register">
              <Button variant="secondary" fullWidth>Get started free</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.sectionAlt}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionHeading}>Frequently asked questions</h2>
        </div>

        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <details key={index} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>{faq.q}</summary>
              <p className={styles.faqAnswer}>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <h2 className={styles.finalCtaTitle}>Replace status calls with a 2-minute async flow</h2>
          <p className={styles.finalCtaSubtitle}>
            Give your engineers uninterrupted focus time while keeping leadership fully informed.
          </p>
          <Link href="/register">
            <Button variant="primary">Start for free without a credit card</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>AI Standup</span>
            <p className={styles.footerTagline}>
              Async team standups with automated summaries and blocker detection.
            </p>
            <div className={styles.securityBadge}>
              <ShieldCheck size={16} /> Multi-tenant isolated workspace
            </div>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerColumn}>
              <p className={styles.footerColumnTitle}>Product</p>
              <Link href="#features">Features</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="#how-it-works">How it works</Link>
            </div>
            <div className={styles.footerColumn}>
              <p className={styles.footerColumnTitle}>Legal</p>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
            </div>
            <div className={styles.footerColumn}>
              <p className={styles.footerColumnTitle}>Account</p>
              <Link href="/login">Log in</Link>
              <Link href="/register">Create account</Link>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} AI Standup. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
