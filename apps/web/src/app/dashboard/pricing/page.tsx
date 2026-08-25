'use client';
import { Button } from '@/components/Button/Button';
import styles from './page.module.css';

export default function PricingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Workspace Billing & Plans</h2>
        <p className={styles.subtitle}>
          Manage your subscription. Currently in Beta: All features are 100% free.
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
            <li>Max 5 team members</li>
            <li>Daily Standup submissions</li>
            <li>Real-time presence dashboard</li>
            <li>Email notifications</li>
          </ul>
          <Button variant="secondary" fullWidth disabled>Active Plan</Button>
        </div>

        <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
          <div className={styles.comingSoonBadge}>100% Free During Beta</div>
          <div className={styles.pricingHeader}>
            <h3>Pro</h3>
            <div className={styles.pricingAmount}>
              <span className={styles.pricingCurrency}>$</span>
              <span className={styles.pricingValue}>
                <s style={{opacity: 0.5, fontSize: '2rem'}}>12</s> 0
              </span>
              <span className={styles.pricingPeriod}>/month</span>
            </div>
            <p className={styles.pricingDesc}>For growing teams that need more power</p>
          </div>
          <ul className={styles.pricingFeatures}>
            <li>Unlimited team members</li>
            <li>AI Daily Summaries</li>
            <li>AI Blocker Detection</li>
            <li>Basic Team Analytics</li>
          </ul>
          <Button variant="primary" fullWidth disabled>Active Plan</Button>
        </div>

        <div className={styles.pricingCard}>
          <div className={styles.pricingHeader}>
            <h3>Enterprise</h3>
            <div className={styles.pricingAmount}>
              <span className={styles.pricingCurrency}>$</span>
              <span className={styles.pricingValue}>
                <s style={{opacity: 0.5, fontSize: '2rem'}}>29</s> 0
              </span>
              <span className={styles.pricingPeriod}>/month</span>
            </div>
            <p className={styles.pricingDesc}>For organizations with specific needs</p>
          </div>
          <ul className={styles.pricingFeatures}>
            <li>Everything in Pro</li>
            <li>Weekly AI Digests</li>
            <li>CSV Data Exports</li>
            <li>Priority support</li>
          </ul>
          <Button variant="secondary" fullWidth disabled>Active Plan</Button>
        </div>
      </div>
    </div>
  );
}
