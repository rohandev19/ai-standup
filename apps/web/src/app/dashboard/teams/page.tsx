'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';
import { X, Mail } from 'lucide-react';
import styles from './teams.module.css';

interface Member {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export default function TeamsPage() {
  const { activeWorkspace } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Invite Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (activeWorkspace) {
      api.get(`/workspaces/${activeWorkspace.id}/members`)
        .then((res) => {
          if (!ignore) setMembers(res.data);
        })
        .catch((err) => {
          console.error('Failed to fetch members:', err);
        })
        .finally(() => {
          if (!ignore) setIsLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [activeWorkspace]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !inviteEmail) return;
    
    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess(false);

    try {
      await api.post(`/workspaces/${activeWorkspace.id}/invite`, {
        email: inviteEmail
      });
      setInviteSuccess(true);
      setInviteEmail('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setInviteError(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  if (!activeWorkspace) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Teams</h2>
          <p className={styles.description}>Manage your workspace members.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Mail size={16} /> Invite Member
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-2)' }}>
          Loading members...
        </div>
      ) : (
        <div className={styles.grid}>
          {members.map((member) => (
            <Card key={member.id} className={styles.memberCard}>
              <div className={styles.avatar}>
                {member.user.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.memberInfo}>
                <h4 className={styles.memberName}>
                  {member.user.name}
                </h4>
                <p className={styles.memberEmail}>{member.user.email}</p>
              </div>
              <div
                className={`${styles.roleBadge} ${member.role === 'OWNER' ? styles.roleBadgeOwner : ''}`}
              >
                {member.role}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {isModalOpen && (
        <div className={styles.modalBackdrop}>
          <Card className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Invite Member</h3>
              <button 
                type="button"
                onClick={() => { setIsModalOpen(false); setInviteSuccess(false); setInviteError(''); }}
                className={styles.closeButton}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleInvite}>
              <div className={styles.formGroup}>
                <Input 
                  label="Email Address"
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                />
              </div>

              {inviteError && (
                <div className={styles.errorMessage}>
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div className={styles.successMessage}>
                  Invitation sent successfully!
                </div>
              )}

              <Button type="submit" variant="primary" fullWidth disabled={inviteLoading || !inviteEmail}>
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
