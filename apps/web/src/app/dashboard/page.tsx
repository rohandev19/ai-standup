'use client';
import { useState } from 'react';
import { Card } from '@/components/Card/Card';
import { Badge } from '@/components/Badge/Badge';
import styles from './dashboard.module.css';

// Mock data for UI demonstration
const mockStats = {
  submitted: 6,
  totalMembers: 8,
  activeBlockers: 2,
  windowStatus: 'active' as const,
  windowRemaining: '2h 15m',
};

const mockMembers = [
  { id: '1', name: 'Andi Raharjo', status: 'submitted' as const, time: '09:15' },
  { id: '2', name: 'Siti Wulandari', status: 'submitted' as const, time: '09:30' },
  { id: '3', name: 'Budi Kurniawan', status: 'submitted' as const, time: '08:45' },
  { id: '4', name: 'Dewi Susanti', status: 'submitted' as const, time: '10:02' },
  { id: '5', name: 'Reza Firmansyah', status: 'submitted' as const, time: '10:20' },
  { id: '6', name: 'Maya Putri', status: 'submitted' as const, time: '10:45' },
  { id: '7', name: 'Hendri Salim', status: 'not_yet' as const, time: null },
  { id: '8', name: 'Linda Oktavia', status: 'not_yet' as const, time: null },
];

const mockBlockers = [
  { id: '1', member: 'Siti Wulandari', text: 'Waiting on design assets for the dashboard redesign. Design team is overloaded.', severity: 'high' as const },
  { id: '2', member: 'Reza Firmansyah', text: 'CI pipeline is flaky — tests pass locally but fail on CI intermittently.', severity: 'medium' as const },
];

const mockSummary = `The team made strong progress today. Backend API endpoints for standup submission and workspace management are now complete (Andi, Budi). Frontend dashboard layout is taking shape with the presence indicator and stats cards (Siti, Maya). Reza continued work on WebSocket integration with some CI issues. Two blockers need attention: design assets are blocking the dashboard redesign, and CI instability is slowing down the deployment pipeline.`;

const mockSubmissions = [
  {
    id: '1', name: 'Andi Raharjo', time: '09:15',
    yesterday: 'Completed REST API endpoints for standup CRUD. Added validation and error handling.',
    today: 'Will start on WebSocket gateway for real-time presence updates.',
    blocker: null,
  },
  {
    id: '2', name: 'Siti Wulandari', time: '09:30',
    yesterday: 'Worked on frontend dashboard layout and component structure.',
    today: 'Will integrate presence indicator with WebSocket events.',
    blocker: 'Waiting on design assets for the dashboard redesign. Design team is overloaded.',
  },
  {
    id: '3', name: 'Budi Kurniawan', time: '08:45',
    yesterday: 'Set up Prisma schema and migrations. Configured connection pooling.',
    today: 'Will implement workspace settings API and validation.',
    blocker: null,
  },
];

export default function DashboardPage() {
  const [toast, setToast] = useState<string | null>(null);
  const submissionRate = Math.round((mockStats.submitted / mockStats.totalMembers) * 100);

  return (
    <div className={styles.dashboard}>
      {/* Toast notification */}
      {toast && (
        <div className={styles.toast} onClick={() => setToast(null)}>
          {toast}
        </div>
      )}

      {/* Stats Row */}
      <div className={styles.statsGrid}>
        <Card>
          <div className={styles.statLabel}>Submission Rate</div>
          <div className={styles.statValue}>
            {submissionRate}<span className={styles.statMuted}>%</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {mockStats.submitted} of {mockStats.totalMembers} submitted
          </div>
        </Card>
        <Card>
          <div className={styles.statLabel}>Team Members</div>
          <div className={styles.statValue}>{mockStats.totalMembers}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Active this workspace
          </div>
        </Card>
        <Card>
          <div className={styles.statLabel}>Active Blockers</div>
          <div className={mockStats.activeBlockers > 0 ? styles.statValueError : styles.statValue}>
            {mockStats.activeBlockers}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Needs attention
          </div>
        </Card>
        <Card>
          <div className={styles.statLabel}>Window Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Badge variant="success" dot>Active</Badge>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {mockStats.windowRemaining} remaining
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
              {mockBlockers.length > 0 && (
                <div className={styles.blockerAlert}>
                  <h4>⚠ Active Blockers ({mockBlockers.length})</h4>
                  <ul>
                    {mockBlockers.map((b) => (
                      <li key={b.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <strong>{b.member}</strong>
                          <Badge variant={b.severity === 'high' ? 'danger' : b.severity === 'medium' ? 'warning' : 'info'} size="sm">
                            {b.severity}
                          </Badge>
                        </div>
                        {b.text}
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
              {mockSubmissions.map((s) => (
                <Card key={s.id} className={styles.feedItem}>
                  <div className={styles.feedHeader}>
                    <div className={styles.feedAvatar}>{s.name.charAt(0)}</div>
                    <div>
                      <div className={styles.feedName}>{s.name}</div>
                      <div className={styles.feedTime}>{s.time}</div>
                    </div>
                  </div>
                  <div className={styles.feedText}>
                    <p><strong>Yesterday:</strong> {s.yesterday}</p>
                    <p><strong>Today:</strong> {s.today}</p>
                    {s.blocker && <p style={{ color: '#f87171' }}><strong>Blocker:</strong> {s.blocker}</p>}
                  </div>
                </Card>
              ))}
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
              <span style={{ fontWeight: 600 }}>{mockStats.submitted}/{mockStats.totalMembers}</span>
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
            {mockMembers.map((m) => (
              <Card key={m.id} style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: m.status === 'submitted' ? 'var(--gradient-glow)' : 'var(--border-glass)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8125rem', fontWeight: 600,
                    }}>
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.name}</div>
                      {m.time && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.time}</div>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={m.status === 'submitted' ? 'success' : 'neutral'}
                    dot
                  >
                    {m.status === 'submitted' ? 'Submitted' : 'Not yet'}
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
