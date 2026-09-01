'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card/Card';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';
import styles from './history.module.css';
import { debounce } from 'lodash';
import { format } from 'date-fns';

interface HistoryItem {
  id: string;
  type: string;
  date: string;
  time?: string;
  member?: string;
  content: string;
  metadata?: {
    entryCount?: number;
    blockerCount?: number;
    submissionRate?: number;
    entries?: number;
    rate?: number;
  };
  blockers?: string[];
  blocker?: string;
  tasks?: string[];
  status?: string;
  yesterday?: string;
  today?: string;
}

export default function HistoryPage() {
  const { activeWorkspace } = useWorkspace();
  const [data, setData] = useState<HistoryItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number; totalPages: number; }>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  
  const [search, setSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState('All Members');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [members, setMembers] = useState<{ userId: string; user: { name: string } }[]>([]);

  // Fetch workspace members for the dropdown
  useEffect(() => {
    if (!activeWorkspace) return;
    const fetchMembers = async () => {
      try {
        const res = await api(`/workspaces/${activeWorkspace.id}/members`);
        setMembers(res.data);
      } catch (err) {
        console.error('Failed to fetch members', err);
      }
    };
    fetchMembers();
  }, [activeWorkspace]);

  // Debounce search so we don't spam API
  const debouncedSearch = React.useMemo(
    () => debounce((q: string, mFilter: string, sDate: string, eDate: string) => {
      fetchHistory(1, q, mFilter, sDate, eDate);
    }, 500),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const fetchHistory = async (page: number, keyword: string, member: string, start: string, end: string) => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (keyword) params.append('keyword', keyword);
      if (member && member !== 'All Members') {
        const selectedMember = members.find(m => m.user.name === member);
        if (selectedMember) params.append('userId', selectedMember.userId);
      }
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const res = await api(`/workspaces/${activeWorkspace.id}/history?${params.toString()}`);
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeWorkspace) return;
    fetchHistory(meta.page, search, memberFilter, startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace, meta.page, memberFilter, startDate, endDate]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value, memberFilter, startDate, endDate);
  };

  const handleExport = async (type: 'entries' | 'summaries') => {
    if (!activeWorkspace) return;
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const { api } = await import('@/lib/api');
      const response = await api(`/workspaces/${activeWorkspace.id}/export/${type}?${params.toString()}`, {
        method: 'POST',
        responseType: 'blob',
      });

      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Export failed');
      }

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${activeWorkspace.name}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const grouped = data.reduce<Record<string, HistoryItem[]>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  return (
    <div className={styles.history}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.pageTitle}>History</h2>
          <p className={styles.pageDesc}>Browse past standups, AI summaries, and search by keyword.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={() => handleExport('entries')} disabled={isExporting}>
            📥 Export Standups
          </Button>
          <Button variant="secondary" onClick={() => handleExport('summaries')} disabled={isExporting}>
            📥 Export Summaries
          </Button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search standups by keyword..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={memberFilter}
          onChange={(e) => { setMemberFilter(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
        >
          <option value="All Members">All Members</option>
          {members.map(m => <option key={m.userId} value={m.user.name}>{m.user.name}</option>)}
        </select>

        <Input
          type="date"
          className={styles.dateInput}
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
        />
        <span style={{ color: 'var(--text-secondary)' }}>to</span>
        <Input
          type="date"
          className={styles.dateInput}
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setMeta(m => ({ ...m, page: 1 })); }}
        />
      </div>

      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading history...</div>
      ) : data.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No results found"
          description="Try adjusting your search or filter criteria."
          actionLabel="Clear filters"
          onAction={() => { 
            setSearch(''); 
            setMemberFilter('All Members');
            setStartDate('');
            setEndDate('');
            fetchHistory(1, '', 'All Members', '', '');
          }}
        />
      ) : (
        <div className={styles.resultsList}>
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className={styles.dateGroup}>
              <div className={styles.dateLabel}>
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </div>

              {items.map((item) => {
                if (item.type === 'weekly_digest') {
                  return (
                    <Card key={item.id} className={styles.summaryCard} style={{ borderLeft: '4px solid #6366f1', backgroundColor: 'rgba(99, 102, 241, 0.03)' }}>
                      <div className={styles.summaryHeader}>
                        <Badge variant="info">Weekly Digest</Badge>
                        <div className={styles.summaryMeta}>
                          {item.metadata?.entries || 0} members • {item.metadata?.rate || 0}% participation
                        </div>
                      </div>
                      <p className={styles.summaryText}>{item.content}</p>
                    </Card>
                  );
                }

                if (item.type === 'summary') {
                  return (
                    <Card key={item.id} className={styles.summaryCard}>
                      <div className={styles.summaryHeader}>
                        <Badge variant="purple">AI Summary</Badge>
                        <div className={styles.summaryMeta}>
                          {item.metadata?.entryCount || 0} entries • {item.metadata?.blockerCount || 0} blockers • {item.metadata?.submissionRate || 0}% rate
                        </div>
                      </div>
                      <p className={styles.summaryText}>{item.content}</p>
                    </Card>
                  );
                }

                return (
                  <Card key={item.id} className={styles.standupCard}>
                    <div className={styles.standupHeader}>
                      <div className={styles.standupAuthor}>
                        <div className={styles.avatar}>{(item.member || '?').charAt(0)}</div>
                        <div>
                          <div className={styles.authorName}>{item.member || 'Unknown'}</div>
                          <div className={styles.authorTime}>{item.time}</div>
                        </div>
                      </div>
                      <Badge
                        variant={item.status === 'submitted' ? 'success' : item.status === 'late' ? 'warning' : 'danger'}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <div className={styles.standupContent}>
                      <div><span className={styles.fieldLabel}>Yesterday:</span> {item.yesterday}</div>
                      <div><span className={styles.fieldLabel}>Today:</span> {item.today}</div>
                      {item.blocker && (
                        <div className={styles.blockerField}>
                          <span className={styles.fieldLabel} style={{ color: '#f87171' }}>Blocker:</span> {item.blocker}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className={styles.pagination}>
          <Button variant="ghost" disabled={meta.page === 1} onClick={() => setMeta(m => ({ ...m, page: m.page - 1 }))}>← Previous</Button>
          <span className={styles.pageInfo}>Page {meta.page} of {meta.totalPages}</span>
          <Button variant="ghost" disabled={meta.page === meta.totalPages} onClick={() => setMeta(m => ({ ...m, page: m.page + 1 }))}>Next →</Button>
        </div>
      )}
    </div>
  );
}
