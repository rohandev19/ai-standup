'use client';
import { Card } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';

export default function SettingsPage() {
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
          <Input label="Full Name" defaultValue="Admin User" />
          <Input label="Email" type="email" defaultValue="admin@techcorp.com" />
          <Input label="Role" defaultValue="Administrator" disabled />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button>Save Changes</Button>
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
    </div>
  );
}
