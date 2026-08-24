'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';

export default function NewStandupPage() {
  const [yesterdayText, setYesterdayText] = useState('');
  const [todayText, setTodayText] = useState('');
  const [blockerText, setBlockerText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) {
      setError('No active workspace selected.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Submitting standup to:', `/workspaces/${activeWorkspace.id}/standups`);
      const res = await api.post(`/workspaces/${activeWorkspace.id}/standups`, {
        yesterdayText,
        todayText,
        blockerText
      });
      console.log('Standup response:', res.data);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string | string[] } }, message?: string };
      const errMsg = errorResponse.response?.data?.message;
      console.log('Submit standup error:', errMsg || errorResponse.message);
      setError(Array.isArray(errMsg) ? errMsg.join(', ') : (errMsg || errorResponse.message || 'Failed to submit standup'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Submit Standup</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Update your team on your progress and any blockers.</p>
      </div>

      <Card glow>
        {error && <div style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              1. What did you do yesterday?
            </label>
            <textarea 
              required
              value={yesterdayText}
              onChange={(e) => setYesterdayText(e.target.value)}
              placeholder="E.g., I completed the API endpoints for user authentication..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                fontSize: '1rem',
                resize: 'vertical',
                transition: 'all 0.2s ease',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              2. What will you do today?
            </label>
            <textarea 
              required
              value={todayText}
              onChange={(e) => setTodayText(e.target.value)}
              placeholder="E.g., I plan to integrate the new API endpoints into the frontend..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                fontSize: '1rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              3. Any blockers? (Optional)
            </label>
            <textarea 
              value={blockerText}
              onChange={(e) => setBlockerText(e.target.value)}
              placeholder="E.g., I'm waiting on design assets for the dashboard..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                fontSize: '1rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => router.push('/dashboard')}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Submit Standup
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
