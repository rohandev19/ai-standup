'use client';
import { Card } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Link from 'next/link';

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  
  // Find the user's role in the active workspace
  const myMember = activeWorkspace?.members.find(m => m.role);
  const myRole = myMember?.role || 'MEMBER';
  
  // Capitalize role for display
  const displayRole = myRole.charAt(0) + myRole.slice(1).toLowerCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Settings</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your workspace preferences and profile.</p>
      </div>

      <Card glow style={{ maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
          Profile Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Input label="Full Name" defaultValue={user?.name || ''} disabled />
          <Input label="Email" type="email" defaultValue={user?.email || ''} disabled />
          <Input label="Workspace Role" defaultValue={displayRole} disabled />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            {/* Disabled because full profile editing is phase 6+ per requirements, but we display the real data */}
            <Button disabled>Save Changes</Button>
          </div>
        </div>
      </Card>
      
      <Card style={{ maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
          Notification Preferences
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked />
            <span>Email me when a blocker is detected</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked />
            <span>Send daily AI summaries to my inbox</span>
          </label>
        </div>
      </Card>

      <Card style={{ maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
          Workspace Invite Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Share these details with your team members so they can join your workspace.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <Input label="Room Code" defaultValue={activeWorkspace?.joinCode || ''} disabled />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Password" defaultValue={activeWorkspace?.joinPassword || ''} disabled />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
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

      <Card style={{ maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
          Workspace Billing
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your workspace subscription tier, billing history, and plan features.</p>
          <div style={{ marginTop: '0.5rem' }}>
            <Link href="/dashboard/pricing" style={{ color: 'var(--primary-accent)', textDecoration: 'none', fontWeight: 600 }}>
              Go to Billing Settings &rarr;
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
