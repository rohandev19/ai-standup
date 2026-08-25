'use client';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card } from '@/components/Card/Card';
import { Badge } from '@/components/Badge/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';
import styles from './dashboard.module.css';

interface DashboardState {
  stats: {
    submitted: number;
    totalMembers: number;
    activeBlockers: number;
    windowStatus: 'open' | 'closed';
    windowRemaining: string;
  };
  members: {
    id: string;
    name: string;
    avatarUrl: string | null;
    status: 'submitted' | 'late' | 'not_yet' | 'missed';
    time: string | null;
    yesterday: string | null;
    today: string | null;
    blocker: { id: string; text: string; isResolved: boolean } | null;
  }[];
}

export default function DashboardClient() {
  const { accessToken } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const activeWorkspaceId = activeWorkspace?.id;
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // 1. Initial State Fetch via REST
  const fetchDashboardState = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoading(true);
      const res = await api.get(`/workspaces/${activeWorkspaceId}/standups/dashboard-state`);
      setState(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardState();
  }, [activeWorkspaceId]);

  // 2. WebSocket Connection and Listeners
  useEffect(() => {
    if (!accessToken || !activeWorkspaceId) return;

    // Connect to proxy /socket.io or directly. For now, since Next.js rewrites /api, we should use the backend URL for socket.io if we don't have a rewrite for /socket.io.
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    const socket = io(backendUrl, {
      auth: { token: accessToken },
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      // 5.9 Auto-reconnect + resync full state via REST
      if (!loading) { 
        fetchDashboardState();
      }

      socket.emit('join_workspace', { workspaceId: activeWorkspaceId });
    });

    socket.on('presence_update', (data: { userId: string; status: string }) => {
      setState((prev) => {
        if (!prev) return prev;
        
        // Re-calculate stats and update member status
        const newMembers = prev.members.map((m) => {
          if (m.id === data.userId) {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            return {
              ...m,
              status: data.status === 'SUBMITTED' || data.status === 'PENDING_AI' ? 'submitted' : data.status as any,
              time: timeStr,
            };
          }
          return m;
        });

        const newSubmitted = newMembers.filter(m => m.status === 'submitted' || m.status === 'late').length;

        return {
          ...prev,
          stats: {
            ...prev.stats,
            submitted: newSubmitted,
          },
          members: newMembers,
        };
      });
    });

    socket.on('member_removed', (data: { userId: string }) => {
       setState((prev) => {
        if (!prev) return prev;
        const newMembers = prev.members.filter(m => m.id !== data.userId);
        return {
          ...prev,
          stats: {
            ...prev.stats,
            totalMembers: newMembers.length,
          },
          members: newMembers,
        };
       });
    });

    socket.on('member_joined', (data: { member: any }) => {
       fetchDashboardState(); 
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, activeWorkspaceId]);

  if (!activeWorkspaceId) {
    return <div style={{ padding: '2rem' }}>Please select a workspace.</div>;
  }

  if (loading && !state) {
    return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;
  }

  if (!state) return null;

  const submissionRate = Math.round((state.stats.submitted / (state.stats.totalMembers || 1)) * 100);

  const recentSubmissions = state.members
    .filter(m => m.status === 'submitted' || m.status === 'late')
    .sort((a, b) => (b.time || '').localeCompare(a.time || '')); 

  const mockSummary = "The team made strong progress today. AI summary feature is pending Phase 6 implementation.";
  
  const activeBlockersList = state.members.filter(m => m.blocker && !m.blocker.isResolved);

  return (
    <div className={styles.dashboard}>
      {/* Stats Row */}
      <div className={styles.statsGrid}>
        <Card>
          <div className={styles.statLabel}>Submission Rate</div>
          <div className={styles.statValue}>
            {submissionRate}<span className={styles.statMuted}>%</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {state.stats.submitted} of {state.stats.totalMembers} submitted
          </div>
        </Card>
        <Card>
          <div className={styles.statLabel}>Team Members</div>
          <div className={styles.statValue}>{state.stats.totalMembers}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Active this workspace
          </div>
        </Card>
        <Card>
          <div className={styles.statLabel}>Active Blockers</div>
          <div className={state.stats.activeBlockers > 0 ? styles.statValueError : styles.statValue}>
            {state.stats.activeBlockers}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Needs attention
          </div>
        </Card>
        <Card>
          <div className={styles.statLabel}>Window Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Badge variant={state.stats.windowStatus === 'open' ? 'success' : 'neutral'} dot>
               {state.stats.windowStatus === 'open' ? 'Active' : 'Closed'}
            </Badge>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {state.stats.windowRemaining} remaining
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* AI Summary */}
          <section>
            <div className={styles.sectionHeader}>
              <h2>Today&apos;s AI Summary</h2>
              <Badge variant="purple">AI Generated</Badge>
            </div>
            <Card glow className={styles.aiCard}>
              <div className={styles.aiContent}>
                <p>{mockSummary}</p>
              </div>

              {/* Blockers */}
              {activeBlockersList.length > 0 && (
                <div className={styles.blockerAlert}>
                  <h4>⚠ Active Blockers ({activeBlockersList.length})</h4>
                  <ul>
                    {activeBlockersList.map((m) => (
                      <li key={m.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <strong>{m.name}</strong>
                          <Badge variant="danger" size="sm">high</Badge>
                        </div>
                        {m.blocker?.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </section>

          {/* Recent Submissions */}
          <section>
            <div className={styles.sectionHeader}>
              <h2>Recent Submissions</h2>
              <Badge variant="success" dot>Live</Badge>
            </div>
            <div className={styles.feedList}>
              {recentSubmissions.map((s) => (
                <Card key={s.id} className={styles.feedItem}>
                  <div className={styles.feedHeader}>
                    <div className={styles.feedAvatar}>
                      {s.avatarUrl ? <img src={s.avatarUrl} alt={s.name} /> : s.name.charAt(0)}
                    </div>
                    <div>
                      <div className={styles.feedName}>{s.name}</div>
                      <div className={styles.feedTime}>{s.time}</div>
                    </div>
                  </div>
                  <div className={styles.feedText}>
                    {s.yesterday && <p><strong>Yesterday:</strong> {s.yesterday}</p>}
                    {s.today && <p><strong>Today:</strong> {s.today}</p>}
                    {s.blocker && <p style={{ color: '#f87171' }}><strong>Blocker:</strong> {s.blocker.text}</p>}
                  </div>
                </Card>
              ))}
              {recentSubmissions.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No submissions yet today.</div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column — Presence */}
        <div>
          <div className={styles.sectionHeader}>
            <h2>Team Presence</h2>
          </div>

          {/* Progress bar */}
          <Card style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
              <span style={{ fontWeight: 600 }}>{state.stats.submitted}/{state.stats.totalMembers}</span>
            </div>
            <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--border-glass)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${submissionRate}%`,
                  height: '100%',
                  background: 'var(--gradient-glow)',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </Card>

          {/* Member list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {state.members.map((m) => (
              <Card 
                key={m.id} 
                style={{ 
                  padding: '1rem 1.25rem',
                  transition: 'all 0.3s ease', 
                  transform: m.status === 'submitted' ? 'translateY(0)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: m.status === 'submitted' ? 'var(--gradient-glow)' : 'var(--border-glass)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8125rem', fontWeight: 600,
                      transition: 'background 0.3s ease',
                    }}>
                      {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} style={{width:'100%', height:'100%', borderRadius:'50%'}}/> : m.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.name}</div>
                      {m.time && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.time}</div>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={m.status === 'submitted' || m.status === 'late' ? 'success' : m.status === 'missed' ? 'danger' : 'neutral'}
                    dot={m.status === 'submitted'}
                  >
                    {m.status === 'submitted' ? 'Submitted' : m.status === 'missed' ? 'Missed' : 'Not yet'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
