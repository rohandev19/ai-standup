'use client';
import { Card } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Link from 'next/link';
import styles from './settings.module.css';

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  
  // Find the user's role in the active workspace
  const myMember = activeWorkspace?.members.find(m => m.role);
  const myRole = myMember?.role || 'MEMBER';
  
  // Capitalize role for display
  const displayRole = myRole.charAt(0) + myRole.slice(1).toLowerCase();

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
          <Input 
            label="Standup Window Start" 
            type="time" 
            defaultValue={activeWorkspace?.standupWindowStart || '09:00'} 
            id="ws-start"
            disabled={myRole === 'MEMBER'}
          />
          <Input 
            label="Standup Window End" 
            type="time" 
            defaultValue={activeWorkspace?.standupWindowEnd || '11:00'} 
            id="ws-end"
            disabled={myRole === 'MEMBER'}
          />
          <div className={styles.formActions}>
            <Button 
              disabled={myRole === 'MEMBER'}
              onClick={async () => {
                const start = (document.getElementById('ws-start') as HTMLInputElement).value;
                const end = (document.getElementById('ws-end') as HTMLInputElement).value;
                try {
                  const { api } = await import('@/lib/api');
                  await api(`/workspaces/${activeWorkspace?.id}/onboarding`, {
                    method: 'PATCH',
                    data: { standupWindowStart: start, standupWindowEnd: end }
                  });
                  alert('Settings updated! Please refresh the page to see changes.');
                  window.location.reload();
                } catch(e: unknown) {
                  const err = e as { response?: { data?: { message?: string } } };
                  alert(err.response?.data?.message || 'Failed to update settings');
                }
              }}
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
