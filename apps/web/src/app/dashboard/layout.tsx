'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { io } from 'socket.io-client';
import NotificationBell from '@/components/NotificationBell';
import OnboardingWizard from '@/components/OnboardingWizard';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  History,
  TrendingUp,
  Clock,
  Settings,
  UserCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  LogIn
} from 'lucide-react';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, isLoading: isAuthLoading, logout } = useAuth();
  const { workspaces, activeWorkspace, isLoading: isWorkspaceLoading, setActiveWorkspace } = useWorkspace();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  // Create/Join workspace modal (for when user already has workspaces)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'create' | 'join'>('create');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (!activeWorkspace || !accessToken) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected', socketInstance.id);
      // Join workspace room
      socketInstance.emit('join_workspace', { workspaceId: activeWorkspace.id });
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socketInstance.on('error', (err) => {
      console.error('WebSocket Error:', err);
    });

    socketInstance.on('notification_count', (data) => {
      console.log('Notification count update:', data.unreadCount);
      setUnreadCount(data.unreadCount);
    });

    return () => {
      socketInstance.emit('leave_workspace', { workspaceId: activeWorkspace.id });
      socketInstance.disconnect();
    };
  }, [activeWorkspace, activeWorkspace?.id, accessToken]);

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'My Standups', href: '/dashboard/standups', icon: <ClipboardList size={20} /> },
    { label: 'Teams', href: '/dashboard/teams', icon: <Users size={20} /> },
    { label: 'History', href: '/dashboard/history', icon: <History size={20} /> },
    { label: 'Analytics', href: '/dashboard/analytics', icon: <TrendingUp size={20} /> },
    { label: 'Activity', href: '/dashboard/activity', icon: <Clock size={20} /> },
    { label: 'Create Workspace', href: '#', icon: <Plus size={20} />, action: 'create' },
    { label: 'Join Room', href: '#', icon: <LogIn size={20} />, action: 'join' },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={20} /> },
    { label: 'Billing', href: '/dashboard/pricing', icon: <CreditCard size={20} /> },
  ];

  if (isAuthLoading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  // Handle case where user has zero workspaces
  if (!isWorkspaceLoading && workspaces.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
          animation: 'pulse 4s ease-in-out infinite',
        }} />
        
        <div style={{ 
          background: 'rgba(24, 24, 27, 0.95)', 
          backdropFilter: 'blur(20px)',
          padding: '0',
          borderRadius: '24px', 
          border: '1px solid rgba(139, 92, 246, 0.2)', 
          width: '100%', 
          maxWidth: '900px', 
          boxShadow: '0 20px 80px rgba(0,0,0,0.4), 0 0 1px rgba(139, 92, 246, 0.5)',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden'
        }}>
          {/* Header with gradient */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
            padding: '3rem 3rem 2rem 3rem',
            textAlign: 'center',
            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            position: 'relative'
          }}>
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(40px)',
            }} />
            
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '80px', 
              height: '80px', 
              borderRadius: '20px', 
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              marginBottom: '1.5rem',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
              animation: 'float 3s ease-in-out infinite',
              position: 'relative',
              zIndex: 1
            }}>
              <span style={{ fontSize: '2.5rem' }}>🚀</span>
            </div>
            
            <h1 style={{ 
              fontSize: '2.25rem', 
              fontWeight: 800, 
              background: 'linear-gradient(135deg, #fff 0%, #e0e0ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem',
              position: 'relative',
              zIndex: 1
            }}>
              Welcome to AI Standup!
            </h1>
            
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '1.125rem', 
              lineHeight: 1.6, 
              margin: '0 auto', 
              maxWidth: '500px',
              position: 'relative',
              zIndex: 1
            }}>
              You're all set! Now let's create your team's workspace to get started with daily standups.
            </p>
          </div>

          {/* Content area */}
          <div style={{ padding: '2.5rem 3rem 3rem 3rem' }}>
            {/* Info cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '1rem', 
              marginBottom: '2.5rem'
            }}>
              <div style={{
                padding: '1.25rem',
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
                  Daily Standups
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Track progress daily
                </div>
              </div>
              
              <div style={{
                padding: '1.25rem',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
                  AI Summaries
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Auto insights
                </div>
              </div>
              
              <div style={{
                padding: '1.25rem',
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
                  Team Collaboration
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Work together
                </div>
              </div>
            </div>

            {/* Main options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Create New */}
              <div style={{ 
                padding: '2rem', 
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
                border: '2px solid rgba(139, 92, 246, 0.3)', 
                borderRadius: '16px', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-50%',
                  width: '200px',
                  height: '200px',
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
                  borderRadius: '50%',
                }} />
                
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)'
                }}>
                  <Plus size={24} color="white" />
                </div>
                
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
                  Create Workspace
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1, lineHeight: 1.5 }}>
                  Start fresh for your team. You'll be the Owner and can invite members after setup.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={e => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g. Engineering Team"
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem 1rem', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(139, 92, 246, 0.3)', 
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff', 
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                      e.target.style.background = 'rgba(0, 0, 0, 0.4)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                      e.target.style.background = 'rgba(0, 0, 0, 0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    disabled={isCreatingWorkspace || !newWorkspaceName.trim()}
                    onClick={async () => {
                      setIsCreatingWorkspace(true);
                      try {
                        const { api } = await import('@/lib/api');
                        await api.post('/workspaces', { name: newWorkspaceName });
                        window.location.reload();
                      } catch (err) {
                        alert('Failed to create workspace');
                        setIsCreatingWorkspace(false);
                      }
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem', 
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      color: 'white', 
                      borderRadius: '10px', 
                      border: 'none', 
                      cursor: 'pointer', 
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      opacity: (!newWorkspaceName.trim() || isCreatingWorkspace) ? 0.5 : 1, 
                      transition: 'all 0.2s',
                      boxShadow: (!newWorkspaceName.trim() || isCreatingWorkspace) ? 'none' : '0 4px 16px rgba(139, 92, 246, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (newWorkspaceName.trim() && !isCreatingWorkspace) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 24px rgba(139, 92, 246, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 92, 246, 0.3)';
                    }}
                  >
                    {isCreatingWorkspace ? (
                      <span>Creating... ⏳</span>
                    ) : (
                      <span>Create & Continue →</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Join Existing */}
              <div style={{ 
                padding: '2rem', 
                background: 'rgba(255, 255, 255, 0.02)',
                border: '2px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: '16px', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '2px solid rgba(99, 102, 241, 0.4)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}>
                  <LogIn size={24} color="#6366f1" />
                </div>
                
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
                  Join Existing Team
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1, lineHeight: 1.5 }}>
                  Have a Room Code from your admin? Enter the code and password to join immediately.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    placeholder="Room Code (e.g. abc-123-xyz)"
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem 1rem', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff', 
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                      e.target.style.background = 'rgba(0, 0, 0, 0.4)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.background = 'rgba(0, 0, 0, 0.3)';
                    }}
                  />
                  <input
                    type="password"
                    value={joinPassword}
                    onChange={e => setJoinPassword(e.target.value)}
                    placeholder="Password"
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem 1rem', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff', 
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                      e.target.style.background = 'rgba(0, 0, 0, 0.4)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.background = 'rgba(0, 0, 0, 0.3)';
                    }}
                  />
                  <button
                    disabled={isJoining || !joinCode.trim() || !joinPassword.trim()}
                    onClick={async () => {
                      setIsJoining(true);
                      try {
                        const { api } = await import('@/lib/api');
                        await api.post('/workspaces/join-with-code', { 
                          joinCode: joinCode.trim(), 
                          joinPassword: joinPassword.trim() 
                        });
                        window.location.reload();
                      } catch (err: any) {
                        alert(err.response?.data?.message || 'Failed to join workspace');
                        setIsJoining(false);
                      }
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem', 
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#6366f1', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(99, 102, 241, 0.3)', 
                      cursor: 'pointer', 
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      opacity: (!joinCode.trim() || !joinPassword.trim() || isJoining) ? 0.5 : 1, 
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (joinCode.trim() && joinPassword.trim() && !isJoining) {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {isJoining ? 'Joining... ⏳' : 'Join Team →'}
                  </button>
                </div>
              </div>
            </div>

            {/* Help section */}
            <div style={{ 
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>💡</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem', fontWeight: 600 }}>
                Not sure which to choose?
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.5 }}>
                <strong>Create</strong> if you're setting up for your team • <strong>Join</strong> if someone invited you with a code
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  cursor: 'pointer', 
                  fontSize: '0.8125rem',
                  transition: 'color 0.2s',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
              >
                ← Log out and try another account
              </button>
            </div>
          </div>
        </div>
        
        {/* CSS Animation */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  // Intercept if onboarding is not completed
  if (activeWorkspace && !activeWorkspace.onboardingCompleted) {
    return (
      <OnboardingWizard
        workspace={activeWorkspace}
        onComplete={() => {
          // Force a full page reload to fetch updated workspace state
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Mobile Overlay */}
      <div 
        className={`${styles.overlay} ${isSidebarOpen ? styles.open : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.logo} style={{ justifyContent: isSidebarCollapsed ? 'center' : 'space-between' }}>
          {!isSidebarCollapsed && <span className="text-gradient">AI Standup</span>}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              className={styles.toggleCollapseBtn}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title="Toggle Sidebar"
            >
              {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            <button 
              className={styles.closeSidebarBtn}
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Workspaces Section */}
        {!isSidebarCollapsed && (
          <div className={styles.workspacesSection}>
            <div className={styles.workspacesSectionHeader}>
              <span>Workspaces</span>
            </div>
            
            <div className={styles.workspacesList}>
              {workspaces.map(w => (
                <button
                  key={w.id}
                  onClick={() => setActiveWorkspace(w)}
                  className={`${styles.workspaceItem} ${w.id === activeWorkspace?.id ? styles.workspaceItemActive : ''}`}
                  title={w.name}
                >
                  <div className={styles.workspaceItemAvatar}>
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.workspaceItemInfo}>
                    <span className={styles.workspaceItemName}>{w.name}</span>
                    <span className={styles.workspaceItemRole}>
                      {w.members?.[0]?.role?.charAt(0) + w.members?.[0]?.role?.slice(1).toLowerCase() || 'Member'}
                    </span>
                  </div>
                  {w.id === activeWorkspace?.id && (
                    <div className={styles.workspaceItemCheck}>✓</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Collapsed Workspace Indicator */}
        {isSidebarCollapsed && activeWorkspace && (
          <div className={styles.collapsedWorkspaceIndicator} title={activeWorkspace.name}>
            <div className={styles.collapsedWorkspaceAvatar}>
              {activeWorkspace.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        <nav className={styles.nav}>
          {navItems.map((item) => {
            // If item has action, render as button instead of link
            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.action === 'create') {
                      setModalTab('create');
                      setModalError('');
                      setModalSuccess('');
                      setIsCreateModalOpen(true);
                    } else if (item.action === 'join') {
                      setModalTab('join');
                      setModalError('');
                      setModalSuccess('');
                      setIsCreateModalOpen(true);
                    }
                  }}
                  className={`${styles.navItem} ${isSidebarCollapsed ? styles.collapsedNavItem : ''}`}
                  title={isSidebarCollapsed ? item.label : undefined}
                  style={{ cursor: 'pointer' }}
                >
                  {item.icon}
                  {!isSidebarCollapsed && <span style={{ marginLeft: '12px' }}>{item.label}</span>}
                </button>
              );
            }
            
            // Regular navigation link
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${pathname === item.href ? styles.active : ''} ${isSidebarCollapsed ? styles.collapsedNavItem : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!isSidebarCollapsed && <span style={{ marginLeft: '12px' }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={`${styles.userProfile} ${isSidebarCollapsed ? styles.collapsedUserProfile : ''}`}>
            <div className={styles.userAvatar}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} /> : <UserCircle size={32} />}
            </div>
            {!isSidebarCollapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name || user.email.split('@')[0]}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
            )}
          </div>
          <button className={`${styles.logoutBtn} ${isSidebarCollapsed ? styles.collapsedLogoutBtn : ''}`} onClick={() => { logout(); router.push('/login'); }}>
            {!isSidebarCollapsed && 'Log out'}
            {isSidebarCollapsed && <X size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button 
              className={styles.hamburger} 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1>Dashboard</h1>
          </div>
          <div className={styles.topbarRight}>
            {/* Notification Bell */}
            <div className={styles.notifWrapper}>
              <NotificationBell initialCount={unreadCount} />
            </div>

            <Link href="/dashboard/standups/new" className={styles.submitBtn}>
              + Submit Standup
            </Link>
          </div>
        </header>

        <main className={styles.content}>
          {isWorkspaceLoading ? <div>Loading workspace data...</div> : children}
        </main>
      </div>

      {/* Create / Join Workspace Modal */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Workspace</h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setModalError('');
                  setModalSuccess('');
                  setNewWorkspaceName('');
                  setJoinCode('');
                  setJoinPassword('');
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className={styles.modalTabs}>
              <button
                className={`${styles.modalTab} ${modalTab === 'create' ? styles.modalTabActive : ''}`}
                onClick={() => { setModalTab('create'); setModalError(''); setModalSuccess(''); }}
              >
                <Plus size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Create New
              </button>
              <button
                className={`${styles.modalTab} ${modalTab === 'join' ? styles.modalTabActive : ''}`}
                onClick={() => { setModalTab('join'); setModalError(''); setModalSuccess(''); }}
              >
                <LogIn size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Join Room
              </button>
            </div>

            {/* Tab Content */}
            <div className={styles.modalBody}>
              {modalTab === 'create' ? (
                <>
                  <p className={styles.modalHint}>
                    Create a workspace for your team. You&apos;ll become the Owner and can invite members later.
                  </p>
                  <input
                    className={styles.modalInput}
                    type="text"
                    value={newWorkspaceName}
                    onChange={e => { setNewWorkspaceName(e.target.value); setModalError(''); }}
                    placeholder="Workspace name, e.g. Acme Corp"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newWorkspaceName.trim() && !isCreatingWorkspace) {
                        e.preventDefault();
                        document.getElementById('create-workspace-btn')?.click();
                      }
                    }}
                  />
                  <button
                    id="create-workspace-btn"
                    className={styles.modalPrimaryBtn}
                    disabled={isCreatingWorkspace || !newWorkspaceName.trim()}
                    onClick={async () => {
                      setIsCreatingWorkspace(true);
                      setModalError('');
                      try {
                        const { api } = await import('@/lib/api');
                        await api.post('/workspaces', { name: newWorkspaceName });
                        window.location.reload();
                      } catch (err: any) {
                        setModalError(err.response?.data?.message || 'Failed to create workspace');
                        setIsCreatingWorkspace(false);
                      }
                    }}
                  >
                    {isCreatingWorkspace ? 'Creating...' : 'Create Workspace'}
                  </button>
                  {modalError && <div className={styles.modalError}>⚠ {modalError}</div>}
                </>
              ) : (
                <>
                  <p className={styles.modalHint}>
                    Have a Room Code and Password from your team admin? Enter them below to join.
                  </p>
                  <input
                    className={styles.modalInput}
                    type="text"
                    value={joinCode}
                    onChange={e => { setJoinCode(e.target.value); setModalError(''); setModalSuccess(''); }}
                    placeholder="Room Code"
                    autoFocus
                  />
                  <input
                    className={styles.modalInput}
                    type="password"
                    value={joinPassword}
                    onChange={e => { setJoinPassword(e.target.value); setModalError(''); setModalSuccess(''); }}
                    placeholder="Password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && joinCode.trim() && joinPassword.trim() && !isJoining) {
                        e.preventDefault();
                        document.getElementById('join-workspace-btn')?.click();
                      }
                    }}
                  />
                  <button
                    id="join-workspace-btn"
                    className={styles.modalSecondaryBtn}
                    disabled={isJoining || !joinCode.trim() || !joinPassword.trim()}
                    onClick={async () => {
                      setIsJoining(true);
                      setModalError('');
                      setModalSuccess('');
                      try {
                        const { api } = await import('@/lib/api');
                        await api.post('/workspaces/join-with-code', {
                          joinCode: joinCode.trim(),
                          joinPassword: joinPassword.trim()
                        });
                        setModalSuccess('Joined successfully! Reloading...');
                        setTimeout(() => window.location.reload(), 800);
                      } catch (err: any) {
                        setModalError(err.response?.data?.message || 'Failed to join workspace. Check your code and password.');
                        setIsJoining(false);
                      }
                    }}
                  >
                    {isJoining ? 'Joining...' : 'Join Workspace'}
                  </button>
                  {modalError && <div className={styles.modalError}>⚠ {modalError}</div>}
                  {modalSuccess && <div className={styles.modalSuccess}>✓ {modalSuccess}</div>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
