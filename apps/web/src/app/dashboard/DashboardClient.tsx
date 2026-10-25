'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card } from '@/components/Card/Card';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';
import {
  type BlockerSeverity,
  type SubmissionStatus,
  getSeverityPresentation,
  getStatusPresentation,
  hasSubmitted,
} from '@/lib/status';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './dashboard.module.css';

interface DashboardState {
  stats: {
    totalMembers: number;
    submitted: number;
    activeBlockers: number;
    windowStatus: 'open' | 'closed';
    windowRemaining: string;
  };
  members: {
    id: string;
    name: string;
    avatarUrl: string | null;
    status: SubmissionStatus;
    time: string | null;
    yesterday: string | null;
    today: string | null;
    blocker: { id: string; text: string; severity: BlockerSeverity; isResolved: boolean } | null;
  }[];
  aiSummary?: string | null;
}

export default function DashboardClient() {
  const { accessToken } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const activeWorkspaceId = activeWorkspace?.id;
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // 1. Initial State Fetch via REST
  const fetchDashboardState = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/workspaces/${activeWorkspaceId}/standups/dashboard-state`);
      setState(res.data);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || 'Failed to load dashboard state');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    let ignore = false;
    if (activeWorkspaceId) {
      api.get(`/workspaces/${activeWorkspaceId}/standups/dashboard-state`)
        .then((res) => {
          if (!ignore) {
            setState(res.data);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            const apiError = err as { response?: { data?: { message?: string } } };
            setError(apiError.response?.data?.message || 'Failed to load dashboard state');
          }
        })
        .finally(() => {
          if (!ignore) {
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [activeWorkspaceId]);

  // 2. WebSocket Connection and Listeners
  useEffect(() => {
    if (!accessToken || !activeWorkspaceId) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(socketUrl, {
      auth: { token: accessToken },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // 5.9 Auto-reconnect + resync full state via REST
      if (!loadingRef.current) { 
        fetchDashboardState();
      }

      // Join Workspace Room
      socket.emit('join_workspace', { workspaceId: activeWorkspaceId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('standup_submitted', (data: { memberId: string; status: string; time: string }) => {
      const timeStr = data.time ? new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

      setState((prev) => {
        if (!prev) return prev;
        const newMembers = prev.members.map((m) => {
          if (m.id === data.memberId) {
            return {
              ...m,
              status: (data.status === 'SUBMITTED' || data.status === 'PENDING_AI' 
                ? 'submitted' 
                : data.status.toLowerCase()) as SubmissionStatus,
              time: timeStr,
            };
          }
          return m;
        });

        const newSubmitted = newMembers.filter(m => hasSubmitted(m.status)).length;

        return {
          ...prev,
          members: newMembers,
          stats: {
            ...prev.stats,
            submitted: newSubmitted,
          },
        };
      });
    });

    socket.on('blocker_detected', () => {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            activeBlockers: prev.stats.activeBlockers + 1,
          },
        };
      });
    });

    socket.on('summary_generated', (data: { summary: string }) => {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          aiSummary: data.summary,
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, activeWorkspaceId, fetchDashboardState]);

  if (!activeWorkspaceId) {
    return (
      <div style={{ padding: '2rem' }}>
        <EmptyState title="No workspace selected" description="Please select a workspace from the sidebar to view the dashboard." tone="calm" />
      </div>
    );
  }

  if (loading && !state) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
        <RefreshCw size={16} className="animate-spin" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className={styles.errorCard}>
        <div>
          <div className={styles.errorTitle}>Failed to load dashboard</div>
          <div className={styles.errorDesc}>{error}</div>
        </div>
        <Button variant="secondary" onClick={fetchDashboardState}>
          Retry
        </Button>
      </div>
    );
  }

  if (!state) return null;

  const submissionRate = Math.round((state.stats.submitted / (state.stats.totalMembers || 1)) * 100);

  const recentSubmissions = state.members
    .filter(m => hasSubmitted(m.status))
    .sort((a, b) => (b.time || '').localeCompare(a.time || '')); 

  const aiSummaryText = state.aiSummary || "No AI summary has been generated for today yet. It will be generated automatically when the standup window closes.";
  
  const activeBlockersList = state.members.filter(m => m.blocker && !m.blocker.isResolved);

  return (
    <div className={styles.dashboard}>
      {/* Secondary Compact Stats Strip */}
      <div className={styles.statsStrip}>
        <Card className={styles.statCard}>
          <div className={styles.statLabel}>Submission Rate</div>
          <div className={styles.statValueRow}>
            <span className={styles.statValue}>{submissionRate}%</span>
          </div>
          <div className={styles.statSubtext}>
            {state.stats.submitted} of {state.stats.totalMembers} submitted
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statLabel}>Team Members</div>
          <div className={styles.statValueRow}>
            <span className={styles.statValue}>{state.stats.totalMembers}</span>
          </div>
          <div className={styles.statSubtext}>
            Active in workspace
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statLabel}>Active Blockers</div>
          <div className={styles.statValueRow}>
            <span className={state.stats.activeBlockers > 0 ? styles.statValueError : styles.statValue}>
              {state.stats.activeBlockers}
            </span>
          </div>
          <div className={styles.statSubtext}>
            {state.stats.activeBlockers > 0 ? 'Needs team attention' : 'No blockers'}
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statLabel}>Standup Window</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Badge variant={state.stats.windowStatus === 'open' ? 'success' : 'neutral'}>
              {state.stats.windowStatus === 'open' ? 'Open' : 'Closed'}
            </Badge>
          </div>
          <div className={styles.statSubtext}>
            {state.stats.windowRemaining} remaining
          </div>
        </Card>
      </div>

      {/* Main Grid: Presence Dominan di Kiri, AI Summary & Submissions di Kanan */}
      <div className={styles.mainGrid}>
        {/* Left Column: Team Presence (Primary Anchor) */}
        <div className={styles.primaryColumn}>
          {/* Active Blockers Alert Box if any */}
          {activeBlockersList.length > 0 && (
            <div className={styles.blockerAlert}>
              <div className={styles.blockerAlertTitle}>
                <AlertTriangle size={16} />
                <span>Active Blockers ({activeBlockersList.length})</span>
              </div>
              <ul className={styles.blockerList}>
                {activeBlockersList.map((m) => (
                  <li key={m.id} className={styles.blockerItem}>
                    <div className={styles.blockerAuthorRow}>
                      <strong>{m.name}</strong>
                      {m.blocker && (
                        <Badge variant={getSeverityPresentation(m.blocker.severity).variant} size="sm">
                          {getSeverityPresentation(m.blocker.severity).label}
                        </Badge>
                      )}
                    </div>
                    {m.blocker?.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Team Presence Section */}
          <section>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <h2>Team Presence</h2>
                {isConnected ? (
                  <Badge variant="success" size="sm">Live</Badge>
                ) : (
                  <Badge variant="warning" size="sm">Reconnecting…</Badge>
                )}
              </div>
            </div>

            {/* Progress Bar Card */}
            <Card className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <span style={{ color: 'var(--text-secondary)' }}>Today&apos;s Participation</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {state.stats.submitted}/{state.stats.totalMembers}
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${submissionRate}%` }}
                />
              </div>
            </Card>

            {/* Members List */}
            <div className={styles.memberList}>
              {state.members.map((m) => {
                const isSub = m.status === 'submitted';
                const isLate = m.status === 'late';
                const isMissed = m.status === 'missed';

                const avatarClass = isSub
                  ? styles.avatarSubmitted
                  : isLate
                  ? styles.avatarLate
                  : isMissed
                  ? styles.avatarMissed
                  : '';

                return (
                  <Card key={m.id} className={styles.memberCard}>
                    <div className={styles.memberRow}>
                      <div className={styles.memberInfo}>
                        <div className={`${styles.avatar} ${avatarClass}`}>
                          {m.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatarUrl} alt={m.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                          ) : (
                            m.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className={styles.memberName}>{m.name}</div>
                          {m.time && (
                            <div className={styles.memberTime}>{m.time}</div>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={getStatusPresentation(m.status).variant}
                        dot={m.status === 'submitted'}
                      >
                        {getStatusPresentation(m.status).label}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: AI Summary & Recent Submissions */}
        <div className={styles.secondaryColumn}>
          {/* AI Summary Card (No purple glow slop) */}
          <section>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <h2>AI Summary</h2>
              </div>
            </div>
            <Card className={styles.aiCard}>
              <div className={styles.aiContent}>
                <p>{aiSummaryText}</p>
              </div>
            </Card>
          </section>

          {/* Recent Submissions Feed */}
          <section>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <h2>Recent Submissions</h2>
              </div>
            </div>
            <div className={styles.feedList}>
              {recentSubmissions.map((s) => (
                <Card key={s.id} className={styles.feedItem}>
                  <div className={styles.feedHeader}>
                    <div className={styles.avatar}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {s.avatarUrl ? <img src={s.avatarUrl} alt={s.name} /> : s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={styles.memberName}>{s.name}</div>
                      <div className={styles.memberTime}>{s.time}</div>
                    </div>
                  </div>
                  <div className={styles.feedText}>
                    {s.yesterday && <p><strong>Yesterday:</strong> {s.yesterday}</p>}
                    {s.today && <p><strong>Today:</strong> {s.today}</p>}
                    {s.blocker && <p className={styles.feedBlocker}><strong>Blocker:</strong> {s.blocker.text}</p>}
                  </div>
                </Card>
              ))}
              {recentSubmissions.length === 0 && (
                <EmptyState
                  title="No submissions yet"
                  description="Updates will appear here as soon as team members submit."
                  tone="calm"
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
