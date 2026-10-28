'use client';

import React from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import styles from './page.module.css';
import { Button } from '@/components/Button/Button';
import { LandingNav } from '@/components/LandingNav';
import { WaveBackground } from '@/components/WaveBackground';
import { DashboardMockup } from '@/components/DashboardMockup';
import { 
  AlertTriangle, 
  Check, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

const heroStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const heroFadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const sectionStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardFadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const scaleFadeIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const viewportConfig = { once: false, amount: 0.15 };

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

export function LandingPageClient() {
  return (
    <div className={styles.container}>
      <LandingNav />

      {/* Hero Section */}
      <div className={styles.heroWrapper}>
        <WaveBackground />
        <section className={styles.hero}>
          <motion.div
            className={styles.heroContent}
            variants={heroStagger}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 className={styles.title} variants={heroFadeUp}>
              Async daily standups with automated summaries and blocker detection.
            </motion.h1>
            <motion.p className={styles.subtitle} variants={heroFadeUp}>
              Replace synchronous status calls. Team members share quick updates on their own schedule, and AI generates daily digests and flags blockers in real time.
            </motion.p>
            <motion.div className={styles.ctaGroup} variants={heroFadeUp}>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link href="/register">
                  <Button variant="primary">Start for free</Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link href="#how-it-works">
                  <Button variant="secondary">See how it works</Button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Authentic Dashboard Browser Mockup */}
          <motion.div
            className={styles.heroMockupWrapper}
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <DashboardMockup />
          </motion.div>
        </section>

        {/* Smooth Bottom Separators */}
        <div className={styles.heroBottomFade} aria-hidden="true" />
        <div className={styles.heroBottomDivider} aria-hidden="true" />
      </div>

      {/* Core Capabilities */}
      <section id="features" className={styles.section}>
        <motion.div
          className={styles.sectionHeader}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={cardFadeUp}
        >
          <h2 className={styles.sectionHeading}>Built for async teams</h2>
          <p className={styles.sectionLead}>
            Status, daily summaries, and blocker triage in one place.
          </p>
        </motion.div>

        <motion.div
          className={styles.bentoGrid}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={sectionStagger}
        >
          {/* Column 1: Stacked Left Cards */}
          <div className={styles.bentoColLeft}>
            {/* Card 1: Live WebSocket Sync */}
            <motion.div
              className={styles.bentoCard}
              variants={cardFadeUp}
              whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
            >
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
            </motion.div>

            {/* Card 2: Cost-Controlled AI */}
            <motion.div
              className={styles.bentoCard}
              variants={cardFadeUp}
              whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
            >
              <div>
                <div className={styles.bentoStatNumber}>1 Call</div>
                <div className={styles.bentoStatLabel}>Zero token waste</div>
                <p className={styles.bentoCardText}>
                  All updates are batched into a single daily AI briefing once the window closes.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Column 2: Center Tall Phone Mockup */}
          <motion.div
            className={styles.bentoColCenter}
            variants={scaleFadeIn}
            whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
          >
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
                <div className={styles.mockupInput}>None: ready for deployment</div>
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
          </motion.div>

          {/* Column 3: Right Tall Card with Radar Concentric Pulse */}
          <motion.div
            className={styles.bentoColRight}
            variants={cardFadeUp}
            whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
          >
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
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works - 3 Cards Flow (Matching Reference Design) */}
      <section id="how-it-works" className={styles.sectionAlt}>
        <motion.div
          className={styles.sectionHeader}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={cardFadeUp}
        >
          <h2 className={styles.sectionHeading}>How it works</h2>
          <p className={styles.sectionLead}>
            Three asynchronous steps taking under two minutes a day.
          </p>
        </motion.div>

        <motion.div
          className={styles.stepsFlow}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={sectionStagger}
        >
          {/* Card 01 */}
          <motion.div
            className={styles.stepCard}
            variants={cardFadeUp}
            whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
          >
            <div className={styles.stepVisual}>
              <div className={styles.stepCheckinCard}>
                <div className={styles.stepCheckinHeader}>
                  <div className={styles.stepCheckinIcon} />
                  <div className={styles.stepCheckinPill} />
                </div>
                <div className={styles.stepCheckinText}>
                  Daily check-in: yesterday, today, blockers
                </div>
                <div className={styles.stepCheckinProgress}>
                  <div className={styles.stepCheckinProgressFill} />
                </div>
              </div>
            </div>
            <div className={styles.stepMeta}>
              <span className={styles.stepNum}>01</span>
            </div>
            <h3 className={styles.stepTitle}>Submit updates within your window</h3>
            <p className={styles.stepDesc}>
              Teammates post three quick answers: yesterday, today, and blockers on their own schedule.
            </p>
          </motion.div>

          {/* Card 02 (Active / Featured) */}
          <motion.div
            className={`${styles.stepCard} ${styles.stepCardFeatured}`}
            variants={cardFadeUp}
            whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
          >
            <div className={styles.stepVisual}>
              <div className={styles.stepPresenceStack}>
                {/* Row 1: Top avatar + bar */}
                <div className={styles.stepPresenceRow}>
                  <div className={styles.stepAvatarPurpleRing} />
                  <div className={styles.stepPresenceBar} />
                </div>

                {/* Row 2: Active avatar + signal bars + cyan waveform */}
                <div className={styles.stepPresenceRow}>
                  <div className={styles.stepAvatarPhoto}>
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80"
                      alt="Active teammate"
                    />
                  </div>
                  <div className={styles.stepSignalBars}>
                    <span className={styles.stepSignalBar1} />
                    <span className={styles.stepSignalBar2} />
                    <span className={styles.stepSignalBar3} />
                  </div>
                  <div className={styles.stepWaveform}>
                    <svg width="48" height="16" viewBox="0 0 48 16" fill="none">
                      <path
                        d="M0 8H8L11 4L14 13L17 1L20 15L23 5L26 11L29 8H48"
                        stroke="#38bdf8"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Row 3: Bottom avatar + bar */}
                <div className={styles.stepPresenceRow}>
                  <div className={styles.stepAvatarPhoto}>
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                      alt="Teammate check-in"
                    />
                  </div>
                  <div className={styles.stepPresenceBar} />
                </div>
              </div>
            </div>
            <div className={styles.stepMeta}>
              <span className={styles.stepNum}>02</span>
            </div>
            <h3 className={styles.stepTitle}>Presence updates in real time</h3>
            <p className={styles.stepDesc}>
              Live board tracks check-ins instantly over WebSockets. Late submissions are flagged without blocking the team.
            </p>
          </motion.div>

          {/* Card 03 */}
          <motion.div
            className={styles.stepCard}
            variants={cardFadeUp}
            whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
          >
            <div className={styles.stepVisual}>
              <div className={styles.stepDocCard}>
                <div className={styles.stepDocBadge}>
                  <Sparkles size={16} color="#ffffff" strokeWidth={2.2} />
                </div>
                <div className={styles.stepDocLineTitle} />
                <div className={styles.stepDocLine} style={{ width: '88%' }} />
                <div className={styles.stepDocLine} style={{ width: '80%' }} />
                <div className={styles.stepDocLine} style={{ width: '84%' }} />
                <div className={styles.stepDocLine} style={{ width: '72%' }} />
                <div className={styles.stepDocLine} style={{ width: '40%' }} />
              </div>
            </div>
            <div className={styles.stepMeta}>
              <span className={styles.stepNum}>03</span>
            </div>
            <h3 className={styles.stepTitle}>AI generates the workspace digest</h3>
            <p className={styles.stepDesc}>
              AI synthesizes entries into a 30-second briefing and triages blockers by severity as the window closes.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={styles.section}>
        <motion.div
          className={styles.sectionHeader}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={cardFadeUp}
        >
          <h2 className={styles.sectionHeading}>Simple, transparent plans</h2>
          <p className={styles.sectionLead}>
            Currently in public beta. All core features are free for early adopting teams.
          </p>
        </motion.div>

        <motion.div
          className={styles.pricingGrid}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={sectionStagger}
        >
          {/* Free Tier */}
          <motion.div
            className={styles.pricingCard}
            variants={cardFadeUp}
            whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
          >
            <div className={styles.pricingTop}>
              <h3 className={styles.planName}>Free</h3>
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>$0</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
              <p className={styles.planDesc}>Ideal for small teams exploring async standups</p>
            </div>
            <ul className={styles.featureList}>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Up to 5 team members</li>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Daily standup submissions</li>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Real-time presence dashboard</li>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Email reminders &amp; notifications</li>
            </ul>
            <Link href="/register">
              <Button variant="secondary" fullWidth>Get started free</Button>
            </Link>
          </motion.div>

          {/* Pro Tier (Featured) */}
          <motion.div
            className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}
            variants={cardFadeUp}
            whileHover={{ y: -8, scale: 1.01, transition: { duration: 0.25, ease: 'easeOut' } }}
          >
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
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Unlimited team members</li>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Automated AI daily summaries</li>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> AI blocker detection &amp; severity tagging</li>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Team health and participation analytics</li>
            </ul>
            <Link href="/register">
              <Button variant="primary" fullWidth>Get started free</Button>
            </Link>
          </motion.div>

          {/* Enterprise Tier */}
          <motion.div
            className={styles.pricingCard}
            variants={cardFadeUp}
            whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
          >
            <div className={styles.pricingTop}>
              <h3 className={styles.planName}>Enterprise</h3>
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>Custom</span>
              </div>
              <p className={styles.planDesc}>For organizations with specific compliance requirements</p>
            </div>
            <ul className={styles.featureList}>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Everything in Pro</li>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Weekly synthesized AI digests</li>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Full CSV data export capabilities</li>
              <li><Check size={16} strokeWidth={2.8} color="var(--status-submitted)" /> Dedicated priority support</li>
            </ul>
            <Link href="/register">
              <Button variant="secondary" fullWidth>Get started free</Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section className={styles.sectionAlt}>
        <motion.div
          className={styles.sectionHeader}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={cardFadeUp}
        >
          <h2 className={styles.sectionHeading}>Frequently asked questions</h2>
        </motion.div>

        <motion.div
          className={styles.faqList}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={sectionStagger}
        >
          {faqs.map((faq, index) => (
            <motion.details key={index} className={styles.faqItem} variants={cardFadeUp}>
              <summary className={styles.faqQuestion}>{faq.q}</summary>
              <p className={styles.faqAnswer}>{faq.a}</p>
            </motion.details>
          ))}
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <motion.div
          className={styles.finalCtaInner}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={scaleFadeIn}
        >
          <h2 className={styles.finalCtaTitle}>Replace status calls with a 2-minute async flow</h2>
          <p className={styles.finalCtaSubtitle}>
            Give your engineers uninterrupted focus time while keeping leadership fully informed.
          </p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} style={{ display: 'inline-block' }}>
            <Link href="/register">
              <Button variant="primary">Start for free without a credit card</Button>
            </Link>
          </motion.div>
        </motion.div>
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
