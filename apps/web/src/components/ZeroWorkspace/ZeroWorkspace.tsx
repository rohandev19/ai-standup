'use client';
import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/Button/Button';
import { Plus, LogIn, Lightbulb, AlertTriangle } from 'lucide-react';
import styles from './ZeroWorkspace.module.css';

interface ZeroWorkspaceProps {
  onLogout: () => void;
}

export const ZeroWorkspace: React.FC<ZeroWorkspaceProps> = ({ onLogout }) => {
  const { refreshWorkspaces } = useWorkspace();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || isCreating) return;

    setIsCreating(true);
    setCreateError('');
    try {
      await api.post('/workspaces', { name: newWorkspaceName.trim() });
      await refreshWorkspaces();
      setIsCreating(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setCreateError(err.response?.data?.message || 'Failed to create workspace');
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinPassword.trim() || isJoining) return;

    setIsJoining(true);
    setJoinError('');
    try {
      await api.post('/workspaces/join-with-code', {
        joinCode: joinCode.trim(),
        joinPassword: joinPassword.trim(),
      });
      await refreshWorkspaces();
      setIsJoining(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setJoinError(err.response?.data?.message || 'Failed to join workspace. Check code and password.');
      setIsJoining(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.cardContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome to AI Standup</h1>
          <p className={styles.subtitle}>
            You don&apos;t have an active workspace yet. Create a workspace for your team or join an existing one.
          </p>
        </div>

        <div className={styles.actionGrid}>
          {/* Create Workspace */}
          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>
              <Plus size={20} />
            </div>
            <h2 className={styles.actionTitle}>Create a Workspace</h2>
            <p className={styles.actionDesc}>
              Start a new workspace for your organization or team. You will be the workspace owner.
            </p>

            {createError && (
              <div className={styles.errorBanner}>
                <AlertTriangle size={14} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className={styles.formGroup}>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. Acme Corp or Engineering"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                disabled={isCreating}
              />
              <Button
                variant="primary"
                type="submit"
                disabled={!newWorkspaceName.trim() || isCreating}
                style={{ width: '100%' }}
              >
                {isCreating ? 'Creating workspace…' : 'Create workspace'}
              </Button>
            </form>
          </div>

          {/* Join with Invite Code */}
          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>
              <LogIn size={20} />
            </div>
            <h2 className={styles.actionTitle}>Join with Invite Code</h2>
            <p className={styles.actionDesc}>
              Have a room code and password from your admin? Enter credentials to join immediately.
            </p>

            {joinError && (
              <div className={styles.errorBanner}>
                <AlertTriangle size={14} />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoin} className={styles.formGroup}>
              <input
                className={styles.input}
                type="text"
                placeholder="Room code (e.g. abc-123-xyz)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                disabled={isJoining}
              />
              <input
                className={styles.input}
                type="password"
                placeholder="Room password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                disabled={isJoining}
              />
              <Button
                variant="secondary"
                type="submit"
                disabled={!joinCode.trim() || !joinPassword.trim() || isJoining}
                style={{ width: '100%' }}
              >
                {isJoining ? 'Joining workspace…' : 'Join workspace'}
              </Button>
            </form>
          </div>
        </div>

        <div className={styles.helpNote}>
          <Lightbulb size={16} className={styles.helpIcon} />
          <span>
            <strong>Create</strong> if you&apos;re setting up standups for your team. <strong>Join</strong> if a teammate invited you with a code.
          </span>
        </div>

        <div className={styles.footer}>
          <button className={styles.logoutBtn} onClick={onLogout}>
            Log out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
};
