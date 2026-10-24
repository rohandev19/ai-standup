'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { CheckCircle2 } from 'lucide-react';
import styles from './analytics.module.css';

interface StreakMember {
  userId: string;
  name: string;
  currentStreak: number;
  totalMissed30d: number;
  needsAttention: boolean;
}

export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace();
  const [healthData, setHealthData] = useState<{ score: number; submissionRate: number; resolutionRate: number; } | null>(null);
  const [submissionRate, setSubmissionRate] = useState<{ date: string; rate: number }[]>([]);
  const [blockerTrend, setBlockerTrend] = useState<{ date: string; HIGH: number; MEDIUM: number; LOW: number }[]>([]);
  const [memberStreaks, setMemberStreaks] = useState<StreakMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!activeWorkspace) return;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [health, subRate, blockTrend, streaks] = await Promise.all([
          api(`/analytics/${activeWorkspace.id}/health`),
          api(`/analytics/${activeWorkspace.id}/submission-rate?days=${days}`),
          api(`/analytics/${activeWorkspace.id}/blocker-trend?days=${days}`),
          api(`/analytics/${activeWorkspace.id}/member-streaks`),
        ]);

        setHealthData(health.data);
        setSubmissionRate(subRate.data);
        setBlockerTrend(blockTrend.data);
        setMemberStreaks(streaks.data);
      } catch (err: unknown) {
        const error = err as Error;
        // Specifically check for 403 Forbidden to show user-friendly message
        if (error.message?.includes('403') || error.message?.toLowerCase().includes('forbidden')) {
          setError('You need to be an Owner or Admin to view Team Analytics.');
        } else {
          setError(error.message || 'Failed to load analytics data.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [activeWorkspace, days]);

  if (isLoading) {
    return <div style={{ padding: '2rem' }}>Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '2rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--sev-high)', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
          <h3>Access Denied</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const getScoreClass = (score: number) => {
    if (score >= 90) return styles.scoreExcellent;
    if (score >= 70) return styles.scoreGood;
    if (score >= 50) return styles.scoreFair;
    return styles.scorePoor;
  };

  const needsAttentionMembers = memberStreaks.filter(m => m.needsAttention);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Team Analytics</h1>
        <select 
          className={styles.timeFilter}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>Last 7 Days</option>
          <option value={14}>Last 14 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      <div className={styles.dashboardGrid}>
        {/* Team Health Score */}
        {healthData && (
          <div className={`${styles.card} ${styles.healthCard}`}>
            <h2 className={styles.chartTitle}>Team Health Score</h2>
            
            <div className={`${styles.scoreCircle} ${getScoreClass(healthData.score)}`}>
              {healthData.score}
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Based on submission rate and blocker resolution.</p>
            
            <div className={styles.healthStats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{healthData.submissionRate}%</span>
                <span className={styles.statLabel}>Avg Submission</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{healthData.resolutionRate}%</span>
                <span className={styles.statLabel}>Blocker Resolution</span>
              </div>
            </div>
          </div>
        )}

        {/* Submission Rate Trend */}
        <div className={`${styles.card} ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>Submission Rate Trend (%)</h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={submissionRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="var(--accent)" 
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent)' }}
                activeDot={{ r: 5 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Blocker Trend */}
        <div className={`${styles.card} ${styles.blockerCard}`}>
          <h2 className={styles.chartTitle}>Blocker Frequency</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={blockerTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
              />
              <Legend />
              <Bar dataKey="HIGH" stackId="a" fill="#f43f5e" name="High" />
              <Bar dataKey="MEDIUM" stackId="a" fill="#fbbf24" name="Medium" />
              <Bar dataKey="LOW" stackId="a" fill="#38bdf8" name="Low" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Needs Attention */}
        <div className={`${styles.card} ${styles.attentionCard}`}>
          <h2 className={styles.chartTitle}>Needs Attention</h2>
          {needsAttentionMembers.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: '0.75rem', color: 'var(--status-submitted)' }}>
                <CheckCircle2 size={36} />
              </div>
              <p>Everyone is consistent. Great job!</p>
            </div>
          ) : (
            <div className={styles.attentionList}>
              {needsAttentionMembers.map(member => (
                <div key={member.userId} className={styles.attentionItem}>
                  <div className={styles.attentionAvatar}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.attentionInfo}>
                    <div className={styles.attentionName}>{member.name}</div>
                    <div className={styles.attentionReason}>
                      Missed 3+ consecutive standups ({member.totalMissed30d} total this month)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Member Streaks Table */}
        <div className={`${styles.card} ${styles.membersTableWrapper}`}>
          <h2 className={styles.chartTitle}>Member Consistency</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableHeader}>Member</th>
                <th className={styles.tableHeader}>Current Streak</th>
                <th className={styles.tableHeader}>Missed (30d)</th>
                <th className={styles.tableHeader}>Status</th>
              </tr>
            </thead>
            <tbody>
              {memberStreaks.map(member => (
                <tr key={member.userId}>
                  <td className={styles.tableCell} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600 }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    {member.name}
                  </td>
                  <td className={styles.tableCell}>{member.currentStreak} days</td>
                  <td className={styles.tableCell}>{member.totalMissed30d} days</td>
                  <td className={styles.tableCell}>
                    {member.currentStreak >= 5 ? (
                      <span className={`${styles.streakBadge} ${styles.streakHigh}`}>Consistent</span>
                    ) : member.needsAttention ? (
                      <span className={`${styles.streakBadge} ${styles.streakLow}`}>Needs Attention</span>
                    ) : (
                      <span className={`${styles.streakBadge} ${styles.streakMed}`}>Fair</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
