'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/Card/Card';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';

interface StandupEntry {
  id: string;
  yesterdayText: string;
  todayText: string;
  blockerText: string | null;
  status: string;
  standupDate: string;
  submittedAt: string;
}

export default function StandupsPage() {
  const { activeWorkspace } = useWorkspace();
  const [standups, setStandups] = useState<StandupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyStandups = async () => {
      if (!activeWorkspace) return;
      try {
        setIsLoading(true);
        const res = await api.get(`/workspaces/${activeWorkspace.id}/standups/me`);
        setStandups(res.data);
      } catch (err) {
        console.error('Failed to fetch standups:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyStandups();
  }, [activeWorkspace]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    // Calculate days ago
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days ago`;
  };

  if (!activeWorkspace) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>My Standups</h2>
        <p style={{ color: 'var(--text-secondary)' }}>View your previous standup submissions.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Loading your standups...
          </div>
        ) : standups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>No standups yet</h3>
            <p style={{ color: 'var(--text-secondary)' }}>You haven&apos;t submitted any standups in this workspace.</p>
          </div>
        ) : (
          standups.map((entry, index) => (
            <Card key={entry.id} glow={index === 0}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600 }}>
                  {getDateLabel(entry.standupDate)}
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                    ({new Date(entry.standupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                  </span>
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {new Date(entry.submittedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>What did you do yesterday?</h4>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{entry.yesterdayText}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>What will you do today?</h4>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{entry.todayText}</p>
                </div>
                {entry.blockerText && (
                  <div>
                    <h4 style={{ fontSize: '0.875rem', color: '#ef4444', marginBottom: '0.25rem' }}>Any blockers?</h4>
                    <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{entry.blockerText}</p>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
