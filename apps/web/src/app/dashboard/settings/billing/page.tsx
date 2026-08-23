'use client';
import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../../../contexts/WorkspaceContext';
import styles from './billing.module.css';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock');

export default function BillingPage() {
  const { activeWorkspace: currentWorkspace } = useWorkspace();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (tier: 'PRO' | 'ENTERPRISE') => {
    if (!currentWorkspace) return;
    setLoadingTier(tier);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/workspaces/${currentWorkspace.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': currentWorkspace.id,
        },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingTier(null);
    }
  };

  if (!currentWorkspace) return <div>Loading...</div>;

  // Assuming currentWorkspace object might not have subscriptionTier populated if API isn't updated to return it.
  // We'll mock it or rely on the backend.
  const currentTier = (currentWorkspace as any).subscriptionTier || 'FREE';

  return (
    <div className={styles.container}>
      <h1>Billing & Subscriptions</h1>
      <p className={styles.subtitle}>Manage your workspace plan and features.</p>
      
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.currentPlan}>
        <h2>Current Plan: <span className={styles.badge}>{currentTier}</span></h2>
      </div>

      <div className={styles.pricingGrid}>
        {/* FREE */}
        <div className={`${styles.pricingCard} ${currentTier === 'FREE' ? styles.activeCard : ''}`}>
          <h3>Free</h3>
          <p className={styles.price}>$0<span>/mo</span></p>
          <ul className={styles.features}>
            <li>Max 5 members</li>
            <li>Daily Standups</li>
            <li>Basic Notifications</li>
          </ul>
          {currentTier === 'FREE' ? (
            <button className={styles.currentBtn} disabled>Current Plan</button>
          ) : null}
        </div>

        {/* PRO */}
        <div className={`${styles.pricingCard} ${styles.proCard} ${currentTier === 'PRO' ? styles.activeCard : ''}`}>
          <div className={styles.popularBadge}>Most Popular</div>
          <h3>Pro</h3>
          <p className={styles.price}>$12<span>/mo</span></p>
          <ul className={styles.features}>
            <li>Unlimited members</li>
            <li>AI Daily Summaries</li>
            <li>Blocker Detection</li>
            <li>Basic Analytics</li>
          </ul>
          {currentTier === 'PRO' ? (
            <button className={styles.currentBtn} disabled>Current Plan</button>
          ) : (
            <button 
              className={styles.upgradeBtn} 
              onClick={() => handleUpgrade('PRO')}
              disabled={loadingTier !== null}
            >
              {loadingTier === 'PRO' ? 'Processing...' : 'Upgrade to Pro'}
            </button>
          )}
        </div>

        {/* ENTERPRISE */}
        <div className={`${styles.pricingCard} ${currentTier === 'ENTERPRISE' ? styles.activeCard : ''}`}>
          <h3>Enterprise</h3>
          <p className={styles.price}>$29<span>/mo</span></p>
          <ul className={styles.features}>
            <li>Everything in Pro</li>
            <li>Weekly AI Digests</li>
            <li>CSV Data Exports</li>
            <li>Priority Support</li>
          </ul>
          {currentTier === 'ENTERPRISE' ? (
            <button className={styles.currentBtn} disabled>Current Plan</button>
          ) : (
            <button 
              className={styles.upgradeBtn} 
              onClick={() => handleUpgrade('ENTERPRISE')}
              disabled={loadingTier !== null}
            >
              {loadingTier === 'ENTERPRISE' ? 'Processing...' : 'Upgrade to Enterprise'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
