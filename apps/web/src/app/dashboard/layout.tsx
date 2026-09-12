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
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={20} /> },
    { label: 'Billing', href: '/dashboard/pricing', icon: <CreditCard size={20} /> },
  ];

  if (isAuthLoading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  // Handle case where user has zero workspaces
  if (!isWorkspaceLoading && workspaces.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '3rem', borderRadius: '16px', border: '1px solid var(--border-glass)', width: '100%', maxWidth: '700px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'var(--gradient-glow)', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem' }}>👋</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Welcome to AI Standup!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: '0 auto', maxWidth: '450px' }}>
              Your account is ready, but you need a <strong>Workspace</strong> (your team&apos;s virtual office) to get started.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
            {/* Option 1: Create New */}
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Create a New Workspace</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1 }}>
                Start fresh for your company or project. You will become the Owner and can invite your team later.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={e => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-input, rgba(255,255,255,0.05))', color: 'var(--text-main)', fontSize: '0.875rem' }}
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
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--primary-color, #6366f1)', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: (!newWorkspaceName.trim() || isCreatingWorkspace) ? 0.5 : 1, transition: 'all 0.2s' }}
                >
                  {isCreatingWorkspace ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </div>

            {/* Option 2: Join Existing */}
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Join an Existing Team</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1 }}>
                Have a Room Code and Password from your Admin? Enter them below to join immediately.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="Room Code"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-input, rgba(255,255,255,0.05))', color: 'var(--text-main)', fontSize: '0.875rem' }}
                />
                <input
                  type="password"
                  value={joinPassword}
                  onChange={e => setJoinPassword(e.target.value)}
                  placeholder="Password"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-input, rgba(255,255,255,0.05))', color: 'var(--text-main)', fontSize: '0.875rem' }}
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
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-accent)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)', cursor: 'pointer', fontWeight: 600, opacity: (!joinCode.trim() || !joinPassword.trim() || isJoining) ? 0.5 : 1, transition: 'all 0.2s' }}
                >
                  {isJoining ? 'Joining...' : 'Join Workspace'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
            >
              Log out and try another account
            </button>
          </div>
        </div>
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
            
            <div className={styles.workspaceActions}>
              <button
                className={styles.workspaceActionBtn}
                onClick={() => {
                  setModalTab('create');
                  setModalError('');
                  setModalSuccess('');
                  setIsCreateModalOpen(true);
                }}
                title="Create Workspace"
              >
                <Plus size={16} />
                <span>Create</span>
              </button>
              <button
                className={styles.workspaceActionBtn}
                onClick={() => {
                  setModalTab('join');
                  setModalError('');
                  setModalSuccess('');
                  setIsCreateModalOpen(true);
                }}
                title="Join Workspace"
              >
                <LogIn size={16} />
                <span>Join Room</span>
              </button>
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
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''} ${isSidebarCollapsed ? styles.collapsedNavItem : ''}`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!isSidebarCollapsed && <span style={{ marginLeft: '12px' }}>{item.label}</span>}
            </Link>
          ))}
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
