'use client';
import { useState } from 'react';
import { Card } from '@/components/Card/Card';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import styles from './activity.module.css';

type ActionType = 'setting_changed' | 'member_invited' | 'member_removed' | 'role_changed' | 'blocker_resolved' | 'member_joined';

interface AuditEntry {
  id: string;
  action: ActionType;
  actor: string;
  target: string;
  detail: string;
  timestamp: string;
}

const mockAuditLog: AuditEntry[] = [
  { id: '1', action: 'blocker_resolved', actor: 'Andi Raharjo', target: 'Siti Wulandari', detail: 'Resolved blocker: "Waiting on design assets for the dashboard redesign"', timestamp: '2026-08-23T14:30:00Z' },
  { id: '2', action: 'member_invited', actor: 'Andi Raharjo', target: 'john@newco.com', detail: 'Sent invitation to join workspace', timestamp: '2026-08-23T11:00:00Z' },
  { id: '3', action: 'setting_changed', actor: 'Andi Raharjo', target: 'Standup Window', detail: 'Changed window from 00:00-11:00 to 08:00-11:00 (Asia/Jakarta)', timestamp: '2026-08-22T16:20:00Z' },
  { id: '4', action: 'role_changed', actor: 'Andi Raharjo', target: 'Maya Putri', detail: 'Changed role from Member to Admin', timestamp: '2026-08-22T10:15:00Z' },
  { id: '5', action: 'member_joined', actor: 'Hendri Salim', target: 'Hendri Salim', detail: 'Accepted invitation and joined workspace', timestamp: '2026-08-21T09:30:00Z' },
  { id: '6', action: 'member_removed', actor: 'Andi Raharjo', target: 'Old Member', detail: 'Removed from workspace (standup history retained)', timestamp: '2026-08-20T14:00:00Z' },
  { id: '7', action: 'setting_changed', actor: 'Andi Raharjo', target: 'Working Days', detail: 'Changed working days: removed Saturday', timestamp: '2026-08-19T11:30:00Z' },
  { id: '8', action: 'member_invited', actor: 'Maya Putri', target: 'linda@team.com', detail: 'Sent invitation to join workspace', timestamp: '2026-08-18T09:45:00Z' },
  { id: '9', action: 'member_joined', actor: 'Linda Oktavia', target: 'Linda Oktavia', detail: 'Accepted invitation and joined workspace', timestamp: '2026-08-18T15:20:00Z' },
  { id: '10', action: 'blocker_resolved', actor: 'Maya Putri', target: 'Reza Firmansyah', detail: 'Resolved blocker: "CI pipeline is flaky"', timestamp: '2026-08-17T13:00:00Z' },
];

const actionLabels: Record<ActionType, string> = {
  setting_changed: 'Setting Changed',
  member_invited: 'Invite Sent',
  member_removed: 'Member Removed',
  role_changed: 'Role Changed',
  blocker_resolved: 'Blocker Resolved',
  member_joined: 'Member Joined',
};

const actionIcons: Record<ActionType, string> = {
  setting_changed: '⚙️',
  member_invited: '📧',
  member_removed: '👋',
  role_changed: '🔑',
  blocker_resolved: '✅',
  member_joined: '🎉',
};

const actionVariants: Record<ActionType, 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'neutral'> = {
  setting_changed: 'info',
  member_invited: 'purple',
  member_removed: 'warning',
  role_changed: 'info',
  blocker_resolved: 'success',
  member_joined: 'success',
};

const allActionTypes: ActionType[] = ['setting_changed', 'member_invited', 'member_removed', 'role_changed', 'blocker_resolved', 'member_joined'];

export default function ActivityPage() {
  const [filterAction, setFilterAction] = useState<string>('all');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const filtered = filterAction === 'all'
    ? mockAuditLog
    : mockAuditLog.filter(e => e.action === filterAction);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={styles.activity}>
      <div>
        <h2 className={styles.pageTitle}>Activity Log</h2>
        <p className={styles.pageDesc}>Track all administrative actions in your workspace.</p>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select
          className={styles.filterSelect}
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
        >
          <option value="all">All Actions</option>
          {allActionTypes.map(a => (
            <option key={a} value={a}>{actionLabels[a]}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className={styles.timeline}>
        {paginated.map((entry, i) => (
          <div key={entry.id} className={styles.timelineItem}>
            <div className={styles.timelineLine}>
              <div className={styles.timelineDot}>
                {actionIcons[entry.action]}
              </div>
              {i < paginated.length - 1 && <div className={styles.timelineConnector} />}
            </div>

            <Card className={styles.timelineCard}>
              <div className={styles.timelineHeader}>
                <div className={styles.timelineAction}>
                  <Badge variant={actionVariants[entry.action]} size="sm">
                    {actionLabels[entry.action]}
                  </Badge>
                  <span className={styles.timelineAgo}>{formatTime(entry.timestamp)}</span>
                </div>
              </div>
              <p className={styles.timelineDetail}>{entry.detail}</p>
              <div className={styles.timelineActors}>
                <span className={styles.actorLabel}>By</span>
                <span className={styles.actorName}>{entry.actor}</span>
                {entry.actor !== entry.target && (
                  <>
                    <span className={styles.actorLabel}>→</span>
                    <span className={styles.actorName}>{entry.target}</span>
                  </>
                )}
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</Button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          <Button variant="ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
        </div>
      )}
    </div>
  );
}
