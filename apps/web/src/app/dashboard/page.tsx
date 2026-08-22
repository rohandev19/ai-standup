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
      
    };

    fetchData();
  }, [activeWorkspace]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>Loading dashboard data...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
      
      {/* AI Summary Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 10px var(--accent-green)' }}></div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Today's AI Summary</h2>
        </div>
        <Card glow>
          {summary ? (
            <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {summary.content}
            </p>
          ) : (
            <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              No summary available yet for today. Standups are still being collected.
            </p>
          )}
        </Card>
      </section>

      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Latest Submissions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          
          {standups.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No standups submitted today.</p>
          ) : (
            standups.map((standup: any) => (
              <Card key={standup.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
                      {standup.user?.name?.charAt(0) || standup.user?.email?.charAt(0) || '?'}
                    </div>
                    <span style={{ fontWeight: 500 }}>{standup.user?.name || standup.user?.email}</span>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {new Date(standup.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Yesterday</span>
                    <span>{standup.yesterdayText}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Today</span>
                    <span>{standup.todayText}</span>
                  </div>
                  {standup.blockerText && (
                    <div>
                      <span style={{ color: 'var(--accent-red)', display: 'block', marginBottom: '0.25rem' }}>Blocker</span>
                      <span>{standup.blockerText}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}

        </div>
      </section>

    </div>
  );
}
