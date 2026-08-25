'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';
import { User, X, Mail } from 'lucide-react';

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

  const fetchMembers = async () => {
    if (!activeWorkspace) return;
    try {
      setIsLoading(true);
      const res = await api.get(`/workspaces/${activeWorkspace.id}/members`);
      setMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
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
      // Optionally re-fetch members if we wanted to show pending invites, 
      // but for now pending invites are separate from active members.
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  if (!activeWorkspace) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Teams</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your workspace members.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Mail size={16} style={{ marginRight: '0.5rem' }} /> Invite Member
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          Loading members...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {members.map(member => (
            <Card key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gradient-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {member.user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <h4 style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {member.user.name}
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{member.user.email}</p>
              </div>
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '12px',
                background: member.role === 'OWNER' ? 'var(--accent-primary)' : 'var(--border-glass)',
                color: member.role === 'OWNER' ? '#fff' : 'var(--text-secondary)'
              }}>
                {member.role}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card glow style={{ width: '100%', maxWidth: '400px', margin: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Invite Member</h3>
              <button 
                onClick={() => { setIsModalOpen(false); setInviteSuccess(false); setInviteError(''); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: '1.5rem' }}>
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
                <div style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '1rem', fontSize: '0.875rem' }}>
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
