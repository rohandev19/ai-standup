import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';
import { Button } from '@/components/Button/Button';

export const metadata: Metadata = {
  title: 'AI Standup | Automate your daily standups with AI',
  description: 'Replace boring Zoom meetings. Async team standups with AI-powered summaries and blocker detection.',
  openGraph: {
    title: 'AI Standup | Automate your daily standups with AI',
    description: 'Replace boring Zoom meetings. Async team standups with AI-powered summaries and blocker detection.',
    type: 'website',
  }
};

export default function LandingPage() {
  const faqs = [
    {
      q: 'How does the AI summary work?',
      a: 'When your team\'s submission window closes each day, our AI (powered by Claude) reads all standup entries and generates a concise narrative summary highlighting key progress, blockers, and patterns — so managers don\'t have to read every entry individually.',
    },
    {
      q: 'Is my team\'s data private?',
      a: 'Absolutely. Every workspace is fully isolated — your data is never visible to other workspaces. Standup content is only sent to our AI provider (Anthropic Claude) for summarization and is not stored by them. See our Privacy Policy for full details.',
    },
    {
      q: 'Do we need to install anything?',
      a: 'No. AI Standup is a web app that works in any modern browser. No desktop app, no browser extension, no Slack bot required. Just open the URL, log in, and submit your standup.',
    },
    {
      q: 'Can team members submit at different times?',
      a: 'Yes — that\'s the whole point! Each workspace has a configurable submission window (e.g., 8 AM to 11 AM). Members can submit anytime within that window, or even outside it (marked as "Late"). No more scheduling conflicts.',
    },
    {
      q: 'What happens if someone forgets to submit?',
      a: 'Members get an automated reminder 30 minutes before the window closes. If they still don\'t submit, their status is marked as "Missed" on the dashboard. Managers can see participation trends in the Analytics view.',
    },
  ];

  return (
    <main className={styles.main}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className="text-gradient">AI Standup</span>
        </div>
        <div className={styles.navLinks}>
          <Link href="#features" className={styles.link}>Features</Link>
          <Link href="#pricing" className={styles.link}>Pricing</Link>
          <Link href="/login" className={styles.link}>Login</Link>
          <Link href="/register">
            <Button variant="glass">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={`${styles.heroContent} animate-slide-up`}>
          <h1 className={styles.title}>
            Automate your daily standups with <span className="text-gradient">AI.</span>
          </h1>
          <p className={styles.subtitle}>
            Replace boring Zoom meetings. Team members drop quick async updates, 
            and our AI summarizes progress, highlights blockers, and delivers a daily digest.
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/register">
              <Button variant="primary">Start for free</Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="secondary">Learn more</Button>
            </Link>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className={styles.heroImageWrapper}>
          <div className={styles.dashboardMockup}>
            <div className={styles.mockupHeader}>
              <div className={styles.mockupDots}>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
              </div>
              <div className={styles.mockupUrl}>app.aistandup.com</div>
            </div>
            <div className={styles.mockupBody}>
              <div className={styles.mockupSidebar}>
                <div className={styles.mockupSidebarItem}></div>
                <div className={styles.mockupSidebarItem}></div>
                <div className={styles.mockupSidebarItem}></div>
              </div>
              <div className={styles.mockupContent}>
                <div className={styles.mockupTitle}>Today&apos;s AI Summary</div>
                <div className={styles.mockupStats}>
                  <div className={styles.mockupStatCard}></div>
                  <div className={styles.mockupStatCard}></div>
                  <div className={styles.mockupStatCard}></div>
                </div>
                <div className={styles.mockupTextLine}></div>
                <div className={styles.mockupTextLine}></div>
                <div className={styles.mockupTextLine} style={{width: '60%'}}></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Background Elements */}
        <div className={styles.glowBlob1}></div>
        <div className={styles.glowBlob2}></div>
      </section>

      {/* Features Preview */}
      <section id="features" className={styles.features}>
        <div className={`${styles.featureCard} animate-slide-up`} style={{ animationDelay: '0.2s' }}>
          <div className={styles.featureIcon}>⚡</div>
          <h3>Async Updates</h3>
          <p>Drop your updates anytime within your team&apos;s submission window. No more timezone conflicts or delayed meetings.</p>
        </div>
        <div className={`${styles.featureCard} animate-slide-up`} style={{ animationDelay: '0.4s' }}>
          <div className={styles.featureIcon}>🤖</div>
          <h3>AI Summaries</h3>
          <p>Get instant daily digests and weekly reports generated by AI. Managers read one summary instead of 10+ updates.</p>
        </div>
        <div className={`${styles.featureCard} animate-slide-up`} style={{ animationDelay: '0.6s' }}>
          <div className={styles.featureIcon}>🚀</div>
          <h3>Blocker Detection</h3>
          <p>AI automatically detects blockers from text, assigns severity, and notifies managers in real-time.</p>
        </div>
        <div className={`${styles.featureCard} animate-slide-up`} style={{ animationDelay: '0.8s' }}>
          <div className={styles.featureIcon}>📊</div>
          <h3>Team Analytics</h3>
          <p>Track submission rates, blocker trends, and team health scores. Spot participation issues early.</p>
        </div>
        <div className={`${styles.featureCard} animate-slide-up`} style={{ animationDelay: '1.0s' }}>
          <div className={styles.featureIcon}>🔔</div>
          <h3>Smart Reminders</h3>
          <p>Automatic reminders 30 minutes before the window closes. No one forgets to submit again.</p>
        </div>
        <div className={`${styles.featureCard} animate-slide-up`} style={{ animationDelay: '1.2s' }}>
          <div className={styles.featureIcon}>🔒</div>
          <h3>Multi-Tenant Isolation</h3>
          <p>Every workspace is fully isolated. Your team&apos;s data is never visible to other organizations.</p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>How It Works</span>
          <h2 className={styles.sectionTitle}>Three steps to better standups</h2>
          <p className={styles.sectionSubtitle}>
            Replace your daily standup meeting with a simple async workflow that takes less than 2 minutes.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepIconLg}>📝</div>
            <h3>Team Members Submit</h3>
            <p>Each member answers three simple questions: What did you do yesterday? What will you do today? Any blockers?</p>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepIconLg}>🤖</div>
            <h3>AI Summarizes</h3>
            <p>When the window closes, AI reads all entries and generates a concise team summary with blocker severity analysis.</p>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepIconLg}>📈</div>
            <h3>Managers Review</h3>
            <p>One summary replaces 10+ individual reads. Blockers are flagged, trends are tracked, weekly digests arrive automatically.</p>
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className={styles.testimonials}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>What Teams Say</span>
          <h2 className={styles.sectionTitle}>Trusted by remote teams</h2>
        </div>

        <div className={styles.testimonialGrid}>
          <div className={styles.testimonialCard}>
            <p className={styles.testimonialText}>
              &ldquo;We switched from Zoom standups and saved 25 minutes per day for the entire team. The AI summary is surprisingly accurate.&rdquo;
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>AR</div>
              <div>
                <strong>Andi Raharjo</strong>
                <span>Engineering Lead, 12-person team</span>
              </div>
            </div>
          </div>
          <div className={styles.testimonialCard}>
            <p className={styles.testimonialText}>
              &ldquo;The blocker detection caught a dependency issue that would have cost us 3 days. It flagged it the same morning it was reported.&rdquo;
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>SW</div>
              <div>
                <strong>Siti Wulandari</strong>
                <span>Product Manager, distributed team</span>
              </div>
            </div>
          </div>
          <div className={styles.testimonialCard}>
            <p className={styles.testimonialText}>
              &ldquo;Finally, a standup tool that doesn&apos;t require a Slack bot or complex setup. My team was onboarded in under 5 minutes.&rdquo;
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>BK</div>
              <div>
                <strong>Budi Kurniawan</strong>
                <span>CTO, startup with 3 timezone coverage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Pricing</span>
          <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
          <p className={styles.sectionSubtitle}>
            Start free with all features. Upgrade when you need more.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          <div className={styles.pricingCard}>
            <div className={styles.pricingHeader}>
              <h3>Free</h3>
              <div className={styles.pricingAmount}>
                <span className={styles.pricingCurrency}>$</span>
                <span className={styles.pricingValue}>0</span>
                <span className={styles.pricingPeriod}>/month</span>
              </div>
              <p className={styles.pricingDesc}>Perfect for small teams getting started</p>
            </div>
            <ul className={styles.pricingFeatures}>
              <li>Up to 30 team members</li>
              <li>AI daily summaries</li>
              <li>AI blocker detection</li>
              <li>Real-time presence dashboard</li>
              <li>Weekly digest reports</li>
              <li>Team analytics</li>
              <li>Email notifications</li>
            </ul>
            <Link href="/register">
              <Button variant="primary" fullWidth>Get started free</Button>
            </Link>
          </div>

          <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
            <div className={styles.comingSoonBadge}>Coming Soon</div>
            <div className={styles.pricingHeader}>
              <h3>Pro</h3>
              <div className={styles.pricingAmount}>
                <span className={styles.pricingCurrency}>$</span>
                <span className={styles.pricingValue}>8</span>
                <span className={styles.pricingPeriod}>/user/month</span>
              </div>
              <p className={styles.pricingDesc}>For growing teams that need more power</p>
            </div>
            <ul className={styles.pricingFeatures}>
              <li>Everything in Free</li>
              <li>Custom standup questions</li>
              <li>Slack integration</li>
              <li>Voice input (AI transcription)</li>
              <li>Advanced analytics</li>
              <li>Priority support</li>
              <li>Data export (CSV, JSON)</li>
            </ul>
            <Button variant="secondary" fullWidth disabled>Notify me</Button>
          </div>

          <div className={styles.pricingCard}>
            <div className={styles.pricingHeader}>
              <h3>Enterprise</h3>
              <div className={styles.pricingAmount}>
                <span className={styles.pricingValue} style={{ fontSize: '1.75rem' }}>Custom</span>
              </div>
              <p className={styles.pricingDesc}>For large organizations with specific needs</p>
            </div>
            <ul className={styles.pricingFeatures}>
              <li>Everything in Pro</li>
              <li>SSO / SAML login</li>
              <li>Jira / GitHub / Linear integrations</li>
              <li>Dedicated instance</li>
              <li>SLA guarantee</li>
              <li>Custom AI model configuration</li>
              <li>Onboarding assistance</li>
            </ul>
            <Button variant="secondary" fullWidth disabled>Contact sales</Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>FAQ</span>
          <h2 className={styles.sectionTitle}>Frequently asked questions</h2>
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
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to transform your standups?</h2>
          <p className={styles.ctaSubtitle}>
            Join teams who replaced their daily meetings with a 2-minute async workflow.
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/register">
              <Button variant="primary">Start for free — no credit card</Button>
            </Link>
          </div>
        </div>
        <div className={styles.glowBlob3}></div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className="text-gradient" style={{ fontSize: '1.25rem', fontWeight: 700 }}>AI Standup</span>
            <p>Async team standups with AI-powered summaries and blocker detection.</p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerColumn}>
              <h4>Product</h4>
              <Link href="#features">Features</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="#how-it-works">How It Works</Link>
            </div>
            <div className={styles.footerColumn}>
              <h4>Legal</h4>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
            </div>
            <div className={styles.footerColumn}>
              <h4>Account</h4>
              <Link href="/login">Login</Link>
              <Link href="/register">Sign Up</Link>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} AI Standup. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
