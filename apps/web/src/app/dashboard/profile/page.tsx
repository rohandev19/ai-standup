'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/Card/Card';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import styles from './profile.module.css';

interface WorkspaceItem {
  id: string;
  name: string;
  role: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifPref, setNotifPref] = useState('immediate'); // Just mock state for now, or update if we have it in DB
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.name) setName(user.name);
  }, [user]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await api('/api/workspaces');
        setWorkspaces(res.data);
      } catch (err) {
        console.error('Failed to fetch workspaces', err);
      }
    };
    fetchWorkspaces();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.patch('/api/users/me', { name });
      setSavedMessage('Profile saved successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      alert('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 digit.');
      return;
    }
    
    try {
      await api.patch('/api/users/me/password', {
        currentPassword,
        newPassword,
      });
      alert('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className={styles.profile}>
      <div>
        <h2 className={styles.pageTitle}>Profile</h2>
        <p className={styles.pageDesc}>Manage your account, preferences, and workspaces.</p>
      </div>

      {savedMessage && (
        <div className={styles.savedToast}>{savedMessage}</div>
      )}

      <div className={styles.grid}>
        {/* Left Column */}
        <div className={styles.leftCol}>
          {/* Profile Info */}
          <Card glow>
            <h3 className={styles.cardTitle}>Profile Details</h3>

            <div className={styles.avatarSection}>
              <div className={styles.avatarLg}>{name?.charAt(0)?.toUpperCase() || 'U'}</div>
              <Button variant="secondary" onClick={() => alert('Avatar upload — coming soon')}>
                Change avatar
              </Button>
            </div>

            <div className={styles.formFields}>
              <Input
                label="Display Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                value={user?.email || ''}
                disabled
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleSaveProfile} isLoading={saving}>Save Profile</Button>
              </div>
            </div>
          </Card>

          {/* Change Password */}
          <Card>
            <h3 className={styles.cardTitle}>Change Password</h3>
            <form onSubmit={handleChangePassword} className={styles.formFields}>
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 digit"
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit">Update Password</Button>
              </div>
            </form>
          </Card>

          {/* Danger Zone */}
          <Card>
            <h3 className={styles.cardTitle} style={{ color: '#f87171' }}>Danger Zone</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.6 }}>
              Request full account deletion. This will permanently remove your personal data.
              Historical standup entries in workspaces you belonged to will be anonymized.
              This action is irreversible.
            </p>
            <Button
              variant="secondary"
              onClick={() => alert('Account deletion request — contact privacy@aistandup.com')}
              style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
            >
              Request Account Deletion
            </Button>
          </Card>
        </div>

        {/* Right Column */}
        <div className={styles.rightCol}>
          {/* Notification Preferences */}
          <Card>
            <h3 className={styles.cardTitle}>Notification Preferences</h3>
            <div className={styles.notifOptions}>
              {[
                { value: 'immediate', label: 'Immediate', desc: 'Get emails as events happen' },
                { value: 'daily', label: 'Daily Digest', desc: 'One summary email per day' },
                { value: 'off', label: 'Off', desc: 'No email notifications' },
              ].map((opt) => (
                <label key={opt.value} className={`${styles.notifOption} ${notifPref === opt.value ? styles.notifActive : ''}`}>
                  <input
                    type="radio"
                    name="notifPref"
                    value={opt.value}
                    checked={notifPref === opt.value}
                    onChange={(e) => setNotifPref(e.target.value)}
                    className={styles.notifRadio}
                  />
                  <div>
                    <div className={styles.notifLabel}>{opt.label}</div>
                    <div className={styles.notifDesc}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* My Workspaces */}
          <Card>
            <h3 className={styles.cardTitle}>My Workspaces</h3>
            <div className={styles.workspaceList}>
              {workspaces.map((ws: WorkspaceItem) => (
                <div key={ws.id} className={styles.workspaceItem}>
                  <div className={styles.wsAvatar}>{ws.name?.charAt(0)}</div>
                  <div className={styles.wsInfo}>
                    <div className={styles.wsName}>{ws.name}</div>
                    <div className={styles.wsMeta}>Workspace</div>
                  </div>
                  <Badge
                    variant={ws.role === 'OWNER' ? 'purple' : ws.role === 'ADMIN' ? 'info' : 'neutral'}
                  >
                    {ws.role}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
