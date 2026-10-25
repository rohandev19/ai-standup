'use client';
import { useState } from 'react';
import { Card } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Link from 'next/link';
import styles from './settings.module.css';

const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  
  // Find the user's role in the active workspace
  const myMember = activeWorkspace?.members.find(m => m.role);
  const myRole = myMember?.role || 'MEMBER';
  
  // Capitalize role for display
  const displayRole = myRole.charAt(0) + myRole.slice(1).toLowerCase();

  const [selectedDays, setSelectedDays] = useState<number[]>(
    activeWorkspace?.workingDays ?? [1, 2, 3, 4, 5]
  );
  const [windowStart, setWindowStart] = useState<string>(activeWorkspace?.standupWindowStart || '09:00');
  const [windowEnd, setWindowEnd] = useState<string>(activeWorkspace?.standupWindowEnd || '11:00');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Synchronize form state when switching workspaces
  const [prevWorkspaceId, setPrevWorkspaceId] = useState(activeWorkspace?.id);
  if (activeWorkspace && activeWorkspace.id !== prevWorkspaceId) {
    setPrevWorkspaceId(activeWorkspace.id);
    setSelectedDays(activeWorkspace.workingDays?.length ? activeWorkspace.workingDays : [1, 2, 3, 4, 5]);
    setWindowStart(activeWorkspace.standupWindowStart || '09:00');
    setWindowEnd(activeWorkspace.standupWindowEnd || '11:00');
  }

  const toggleDay = (dayValue: number) => {
    if (myRole === 'MEMBER') return;
    setSelectedDays(prev => {
      if (prev.includes(dayValue)) {
        if (prev.length <= 1) {
          alert('Minimal 1 hari kerja harus dipilih.');
          return prev;
        }
        return prev.filter(d => d !== dayValue);
      }
      return [...prev, dayValue].sort((a, b) => a - b);
    });
  };

  const handleSavePreferences = async () => {
    if (myRole === 'MEMBER' || !activeWorkspace) return;
    if (selectedDays.length === 0) {
      setSaveError('Minimal 1 hari kerja harus dipilih.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const { api } = await import('@/lib/api');
      await api(`/workspaces/${activeWorkspace.id}/onboarding`, {
        method: 'PATCH',
        data: {
          standupWindowStart: windowStart,
          standupWindowEnd: windowEnd,
          workingDays: selectedDays,
        },
      });
      await refreshWorkspaces();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setSaveError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
        <p className={styles.description}>Manage your workspace preferences and profile.</p>
      </div>

      <Card className={styles.card}>
        <h3 className={styles.sectionTitle}>
          Profile Details
        </h3>
        <div className={styles.formFields}>
          <Input label="Full Name" defaultValue={user?.name || ''} disabled />
          <Input label="Email" type="email" defaultValue={user?.email || ''} disabled />
          <Input label="Workspace Role" defaultValue={displayRole} disabled />
          
          <div className={styles.formActions}>
            <Button disabled>Save Changes</Button>
          </div>
        </div>
      </Card>
      
      <Card className={styles.card}>
        <h3 className={styles.sectionTitle}>
          Notification Preferences
        </h3>
        <div className={styles.checkboxList}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" defaultChecked />
            <span>Email me when a blocker is detected</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" defaultChecked />
            <span>Send daily AI summaries to my inbox</span>
          </label>
        </div>
      </Card>

      <Card className={styles.card}>
        <h3 className={styles.sectionTitle}>
          Workspace Preferences
          {myRole === 'MEMBER' && <span className={styles.badgeAdmin}>(Admin only)</span>}
        </h3>
        <div 
          className={styles.formFields} 
          style={{ 
            opacity: myRole === 'MEMBER' ? 0.6 : 1, 
            pointerEvents: myRole === 'MEMBER' ? 'none' : 'auto' 
          }}
        >
          <div className={styles.daySelectorGroup}>
            <label className={styles.daySelectorLabel}>Working Days</label>
            <p className={styles.hintText}>
              Select the active days when your team is expected to submit daily standups.
            </p>
            <div className={styles.dayGrid}>
              {DAYS.map(day => {
                const isSelected = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    disabled={myRole === 'MEMBER'}
                    onClick={() => toggleDay(day.value)}
                    className={`${styles.dayBtn} ${isSelected ? styles.daySelected : ''}`}
                    title={day.label}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input 
            label="Standup Window Start" 
            type="time" 
            value={windowStart}
            onChange={e => setWindowStart(e.target.value)}
            id="ws-start"
            disabled={myRole === 'MEMBER'}
          />
          <Input 
            label="Standup Window End" 
            type="time" 
            value={windowEnd}
            onChange={e => setWindowEnd(e.target.value)}
            id="ws-end"
            disabled={myRole === 'MEMBER'}
          />

          {saveSuccess && (
            <div className={styles.successMessage}>
              Preferences saved successfully!
            </div>
          )}

          {saveError && (
            <div className={styles.errorMessage}>
              {saveError}
            </div>
          )}

          <div className={styles.formActions}>
            <Button 
              disabled={myRole === 'MEMBER' || isSaving}
              isLoading={isSaving}
              onClick={handleSavePreferences}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </Card>

      <Card className={styles.card}>
        <h3 className={styles.sectionTitle}>
          Workspace Invite Details
        </h3>
        <div className={styles.formFields}>
          <p className={styles.hintText}>Share these details with your team members so they can join your workspace.</p>
          <div className={styles.rowInputs}>
            <div>
              <Input label="Room Code" defaultValue={activeWorkspace?.joinCode || ''} disabled />
            </div>
            <div>
              <Input label="Password" defaultValue={activeWorkspace?.joinPassword || ''} disabled />
            </div>
          </div>
          <div className={styles.formActions}>
            <Button 
              onClick={() => {
                const text = `Join my workspace on AI Standup!\nRoom Code: ${activeWorkspace?.joinCode}\nPassword: ${activeWorkspace?.joinPassword}`;
                navigator.clipboard.writeText(text);
                alert('Invite details copied to clipboard!');
              }}
              variant="ghost"
            >
              Copy to Clipboard
            </Button>
          </div>
        </div>
      </Card>

      <Card className={styles.card}>
        <h3 className={styles.sectionTitle}>
          Workspace Billing
        </h3>
        <div className={styles.checkboxList}>
          <p className={styles.hintText}>Manage your workspace subscription tier, billing history, and plan features.</p>
          <div style={{ marginTop: '0.25rem' }}>
            <Link href="/dashboard/pricing" className={styles.linkAccent}>
              Go to Billing Settings &rarr;
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
