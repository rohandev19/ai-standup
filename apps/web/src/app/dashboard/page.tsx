'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/Card/Card';
import styles from './dashboard.module.css';
import { useSocket } from '@/hooks/useSocket';

export default function DashboardPage() {
  const { latestEvent } = useSocket('ws-123'); // Mock workspace ID
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (latestEvent) {
      if (latestEvent.type === 'new_daily_summary') {
        setToast('✨ New AI Daily Summary generated!');
      } else if (latestEvent.type === 'blocker_detected') {
        setToast('🚨 New blocker detected by AI!');
      } else if (latestEvent.type === 'new_standup_submitted') {
        setToast('📝 A team member just submitted a standup.');
      }
      
      // Auto hide toast
      setTimeout(() => setToast(null), 5000);
    }
  }, [latestEvent]);

  return (
    <div className={styles.dashboard}>
      {toast && (
        <div className={`${styles.toast} animate-slide-up`}>
          {toast}
        </div>
      )}
      
      {/* Stats Row */}
      <div className={styles.statsGrid}>
        <Card>
          <h3 className={styles.statLabel}>Team Members</h3>
          <p className={styles.statValue}>12</p>
        </Card>
        <Card>
          <h3 className={styles.statLabel}>Standups Today</h3>
          <p className={styles.statValue}>8 <span className={styles.statMuted}>/ 12</span></p>
        </Card>
        <Card glow>
          <h3 className={styles.statLabel}>Active Blockers</h3>
          <p className={styles.statValueError}>2</p>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainGrid}>
        {/* Left Column: AI Summary */}
        <div className={styles.summaryColumn}>
          <div className={styles.sectionHeader}>
            <h2>✨ Today's AI Summary</h2>
            <span className={styles.badge}>Live</span>
          </div>
          
          <Card className={styles.aiCard} glow>
            <div className={styles.aiContent}>
              <p>The team is making great progress on Phase 3. <strong>Frontend team</strong> completed the dashboard layout. <strong>Backend team</strong> is slightly delayed due to a Redis connection issue, but expected to resolve it by EOD.</p>
              
              <div className={styles.blockerAlert}>
                <h4>🚨 Action Required</h4>
                <ul>
                  <li>Sarah is blocked on AWS permissions for the new S3 bucket.</li>
                  <li>John needs code review on the auth module.</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Recent Standups */}
        <div className={styles.feedColumn}>
          <div className={styles.sectionHeader}>
            <h2>Recent Updates</h2>
          </div>
          
          <div className={styles.feedList}>
            {[1,2,3].map(i => (
              <Card key={i} className={styles.feedItem}>
                <div className={styles.feedHeader}>
                  <div className={styles.feedAvatar}>U</div>
                  <div>
                    <h4 className={styles.feedName}>User {i}</h4>
                    <span className={styles.feedTime}>2 hours ago</span>
                  </div>
                </div>
                <div className={styles.feedText}>
                  <p><strong>Did:</strong> Finished the UI mockups.</p>
                  <p><strong>Doing:</strong> Starting implementation of the Button component.</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
