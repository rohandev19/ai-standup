'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/Card/Card';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';
import styles from './activity.module.css';

interface AuditLog {
  id: string;
  action: string;
  actorName: string;
  metadataJson: any;
  createdAt: string;
}

const actionLabels: Record<string, string> = {
  'member.invited': 'Invite Sent',
  'member.bulk_invited': 'Bulk Invite Sent',
  'member.role_updated': 'Role Changed',
  'member.removed': 'Member Removed',
  'blocker.resolved': 'Blocker Resolved',
  'workspace.created': 'Workspace Created',
  'workspace.onboarding_completed': 'Onboarding Completed',
  'member.joined': 'Member Joined',
};

const actionIcons: Record<string, string> = {
  'member.invited': '📧',
  'member.bulk_invited': '📧',
  'member.role_updated': '🔑',
  'member.removed': '👋',
  'blocker.resolved': '✅',
  'workspace.created': '✨',
  'workspace.onboarding_completed': '🚀',
  'member.joined': '🎉',
};

const actionVariants: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'neutral'> = {
  'member.invited': 'purple',
  'member.bulk_invited': 'purple',
  'member.role_updated': 'info',
  'member.removed': 'warning',
  'blocker.resolved': 'success',
  'workspace.created': 'success',
  'workspace.onboarding_completed': 'success',
  'member.joined': 'success',
};

export default function ActivityPage() {
  const { activeWorkspace } = useWorkspace();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const perPage = 20;

  useEffect(() => {
    const fetchActivity = async () => {
      if (!activeWorkspace) return;
      setIsLoading(true);
      setError('');
      try {
        const res = await api.get(`/workspaces/${activeWorkspace.id}/activity?page=${page}&limit=${perPage}`);
        setLogs(res.data.data);
        setTotalPages(res.data.meta.totalPages);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError('You must be an Owner or Admin to view the Activity Log.');
        } else {
          setError('Failed to fetch activity log.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivity();
  }, [activeWorkspace, page]);

  const filteredLogs = filterAction === 'all'
    ? logs
    : logs.filter(e => e.action === filterAction);

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

  const getActionDetail = (entry: AuditLog) => {
    const meta = entry.metadataJson || {};
    switch (entry.action) {
      case 'member.invited':
        return `Sent invitation to ${meta.email}`;
      case 'member.bulk_invited':
        return `Sent ${meta.count} invitations`;
      case 'member.role_updated':
        return `Changed role to ${meta.newRole}`;
      case 'blocker.resolved':
        return `Resolved blocker`;
      case 'member.removed':
        return `Removed member from workspace`;
      case 'workspace.created':
        return `Created the workspace`;
      case 'member.joined':
        return `Joined the workspace`;
      default:
        return 'Performed an action';
    }
  };

  const getActionTarget = (entry: AuditLog) => {
    const meta = entry.metadataJson || {};
    if (meta.email) return meta.email;
    if (meta.targetUserId) return 'Member'; // We don't fetch target user names in this simple implementation, just their ID
    return '';
  };

  const allAvailableActions = Array.from(new Set(logs.map(l => l.action)));

  if (error) {
    return (
      <div className={styles.activity}>
        <div style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3>Access Denied</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

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
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="all">All Actions</option>
          {allAvailableActions.map(a => (
            <option key={a} value={a}>{actionLabels[a] || a}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading activity...</div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px' }}>
          No activity logs found.
        </div>
      ) : (
        <div className={styles.timeline}>
          {filteredLogs.map((entry, i) => {
            const target = getActionTarget(entry);
            return (
              <div key={entry.id} className={styles.timelineItem}>
                <div className={styles.timelineLine}>
                  <div className={styles.timelineDot}>
                    {actionIcons[entry.action] || '📌'}
                  </div>
                  {i < filteredLogs.length - 1 && <div className={styles.timelineConnector} />}
                </div>

                <Card className={styles.timelineCard}>
                  <div className={styles.timelineHeader}>
                    <div className={styles.timelineAction}>
                      <Badge variant={actionVariants[entry.action] || 'neutral'} size="sm">
                        {actionLabels[entry.action] || entry.action}
                      </Badge>
                      <span className={styles.timelineAgo}>{formatTime(entry.createdAt)}</span>
                    </div>
                  </div>
                  <p className={styles.timelineDetail}>{getActionDetail(entry)}</p>
                  <div className={styles.timelineActors}>
                    <span className={styles.actorLabel}>By</span>
                    <span className={styles.actorName}>{entry.actorName}</span>
                    {target && (
                      <>
                        <span className={styles.actorLabel}>→</span>
                        <span className={styles.actorName}>{target}</span>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

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
