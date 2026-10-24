import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { Button } from '@/components/Button/Button';
import { LandingNav } from '@/components/LandingNav';
import { 
  Users, 
  Bot, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ArrowRight,
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
      a: 'When your team submission window closes each day, Claude AI reads all standup entries and generates a concise narrative summary highlighting accomplishments, blockers, and participation metrics. Leads read one synthesized digest instead of chasing individual updates.',
    },
    {
      q: 'Is my team data private?',
      a: 'Yes. Every workspace is completely isolated at the database level. Your data is never accessible to other organizations. Standup entries are sent to Anthropic Claude strictly for summarization under enterprise data protection standards.',
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
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Async daily standups with automated summaries and blocker detection.
          </h1>
          <p className={styles.subtitle}>
            Replace synchronous status calls. Team members share quick updates on their own schedule, and Claude AI generates daily digests and flags blockers in real time.
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

        {/* Real Product Preview */}
        <div className={styles.productPreviewWrapper}>
          <div className={styles.productPreviewCard}>
            <div className={styles.previewHeader}>
              <div className={styles.previewTeamInfo}>
                <span className={styles.previewTeamName}>Platform Engineering</span>
                <span className={styles.previewMeta}>Window: 09:00 – 11:00 AM</span>
              </div>
              <div className={styles.liveIndicator}>
                <span className={styles.liveDot} /> Live
              </div>
            </div>

            <div className={styles.previewStats}>
              <div className={styles.previewStatItem}>
                <span className={styles.previewStatLabel}>Submissions</span>
                <span className={styles.previewStatValue}>4 of 5 (80%)</span>
              </div>
              <div className={styles.previewStatItem}>
                <span className={styles.previewStatLabel}>Active Blockers</span>
                <span className={styles.previewStatValue} style={{ color: 'var(--sev-high)' }}>1 High Severity</span>
              </div>
            </div>

            <div className={styles.previewGrid}>
              {/* Presence List */}
              <div className={styles.previewPresence}>
                <div className={styles.previewSectionTitle}>Team Presence</div>
                <div className={styles.previewPresenceItem}>
                  <div className={styles.previewAvatar}>AC</div>
                  <div className={styles.previewMemberInfo}>
                    <span className={styles.previewMemberName}>Alex Chen</span>
                    <span className={styles.previewMemberTime}>Submitted 09:14</span>
                  </div>
                  <span className={`${styles.statusChip} ${styles.statusSubmitted}`}>
                    <CheckCircle2 size={12} /> Submitted
                  </span>
                </div>
                <div className={styles.previewPresenceItem}>
                  <div className={styles.previewAvatar}>SJ</div>
                  <div className={styles.previewMemberInfo}>
                    <span className={styles.previewMemberName}>Sara Jenkins</span>
                    <span className={styles.previewMemberTime}>Submitted 09:42</span>
                  </div>
                  <span className={`${styles.statusChip} ${styles.statusSubmitted}`}>
                    <CheckCircle2 size={12} /> Submitted
                  </span>
                </div>
                <div className={styles.previewPresenceItem}>
                  <div className={styles.previewAvatar}>DK</div>
                  <div className={styles.previewMemberInfo}>
                    <span className={styles.previewMemberName}>David Kim</span>
                    <span className={styles.previewMemberTime}>Submitted 10:15</span>
                  </div>
                  <span className={`${styles.statusChip} ${styles.statusSubmitted}`}>
                    <CheckCircle2 size={12} /> Submitted
                  </span>
                </div>
                <div className={styles.previewPresenceItem}>
                  <div className={styles.previewAvatar}>MV</div>
                  <div className={styles.previewMemberInfo}>
                    <span className={styles.previewMemberName}>Marcus Vance</span>
                    <span className={styles.previewMemberTime}>Submitted 11:18</span>
                  </div>
                  <span className={`${styles.statusChip} ${styles.statusLate}`}>
                    <Clock size={12} /> Late
                  </span>
                </div>
                <div className={styles.previewPresenceItem}>
                  <div className={styles.previewAvatar}>ER</div>
                  <div className={styles.previewMemberInfo}>
                    <span className={styles.previewMemberName}>Elena Rostova</span>
                    <span className={styles.previewMemberTime}>Not submitted</span>
                  </div>
                  <span className={`${styles.statusChip} ${styles.statusMissed}`}>
                    <XCircle size={12} /> Missed
                  </span>
                </div>
              </div>

              {/* AI Summary Panel */}
              <div className={styles.previewAiPanel}>
                <div className={styles.previewSectionTitle}>
                  <Bot size={15} /> AI Daily Summary
                </div>
                <div className={styles.aiBadge}>AI-generated digest</div>
                <p className={styles.aiContent}>
                  The team made solid progress on database index tuning and WebSocket event testing. Alex and Sara completed PR reviews for the billing module.
                </p>
                <div className={styles.blockerCard}>
                  <div className={styles.blockerHeader}>
                    <AlertTriangle size={14} color="var(--sev-high)" />
                    <span className={styles.blockerTitle}>High Blocker: Marcus Vance</span>
                  </div>
                  <p className={styles.blockerDesc}>
                    Staging deployment is held up waiting on Auth0 token expiry config changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionHeading}>Built for async engineering teams</h2>
          <p className={styles.sectionLead}>
            Three focused tools that keep your team synchronized without scheduling friction.
          </p>
        </div>

        <div className={styles.capabilitiesGrid}>
          <div className={styles.capabilityCard}>
            <div className={styles.capabilityIcon}>
              <Users size={24} />
            </div>
            <h3 className={styles.capabilityTitle}>Live Team Presence</h3>
            <p className={styles.capabilityDesc}>
              A real-time dashboard showing who has submitted, who is running late, and who missed their window. WebSocket updates keep the status board fresh without refreshing.
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <div className={styles.capabilityIcon}>
              <Bot size={24} />
            </div>
            <h3 className={styles.capabilityTitle}>Automated Daily Summaries</h3>
            <p className={styles.capabilityDesc}>
              As soon as the submission window closes, Claude AI synthesizes all updates into a coherent, 30-second daily briefing. Leads review one clear summary instead of fragmented Slack threads.
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <div className={styles.capabilityIcon}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={styles.capabilityTitle}>Blocker Detection & Severity</h3>
            <p className={styles.capabilityDesc}>
              AI extracts impediments automatically, tags severity levels (High, Medium, Low), and highlights urgent bottlenecks so managers can unblock engineers immediately.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.sectionAlt}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionHeading}>How it works</h2>
          <p className={styles.sectionLead}>
            A simple 3-step workflow designed to take less than 2 minutes of each member day.
          </p>
        </div>

        <div className={styles.stepsTimeline}>
          <div className={styles.stepItem}>
            <div className={styles.stepBadge}>1</div>
            <h3 className={styles.stepTitle}>Submit updates within your window</h3>
            <p className={styles.stepDesc}>
              Each teammate answers three concise prompts: What did you accomplish yesterday? What are you working on today? Are there any blockers?
            </p>
          </div>

          <div className={styles.stepConnector}>
            <ArrowRight size={20} className={styles.connectorIcon} />
          </div>

          <div className={styles.stepItem}>
            <div className={styles.stepBadge}>2</div>
            <h3 className={styles.stepTitle}>Presence updates in real time</h3>
            <p className={styles.stepDesc}>
              Live presence chips turn from gray to green across the team dashboard. Submissions received after the deadline are tracked as Late.
            </p>
          </div>

          <div className={styles.stepConnector}>
            <ArrowRight size={20} className={styles.connectorIcon} />
          </div>

          <div className={styles.stepItem}>
            <div className={styles.stepBadge}>3</div>
            <h3 className={styles.stepTitle}>AI generates the workspace digest</h3>
            <p className={styles.stepDesc}>
              When the window closes, the workspace digest is ready. Blockers are categorized by severity and archived into searchable history.
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
