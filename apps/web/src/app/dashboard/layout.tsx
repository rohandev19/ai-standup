'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { io } from 'socket.io-client';
import NotificationBell from '@/components/NotificationBell';
import OnboardingWizard from '@/components/OnboardingWizard';
import { ZeroWorkspace } from '@/components/ZeroWorkspace/ZeroWorkspace';
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
  LogIn,
  Sparkles,
  Check,
  AlertTriangle
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
  const { workspaces, activeWorkspace, isLoading: isWorkspaceLoading, setActiveWorkspace, refreshWorkspaces } = useWorkspace();
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
    { label: 'Ask AI', href: '/dashboard/ask-ai', icon: <Sparkles size={20} /> },
    { label: 'Activity', href: '/dashboard/activity', icon: <Clock size={20} /> },
    { label: 'Create Workspace', href: '#', icon: <Plus size={20} />, action: 'create' },
    { label: 'Join Room', href: '#', icon: <LogIn size={20} />, action: 'join' },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={20} /> },
    { label: 'Billing', href: '/dashboard/pricing', icon: <CreditCard size={20} /> },
  ];

  if (isAuthLoading || !user) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-0)', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    );
  }

  // Show loading while fetching workspaces
  if (isWorkspaceLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-0)', color: 'var(--text-secondary)' }}>
        Loading workspace...
      </div>
    );
  }

  // Handle case where user has zero workspaces
  if (!workspaces || workspaces.length === 0) {
    return <ZeroWorkspace onLogout={logout} />;
  }

  // Intercept if onboarding is not completed
  if (activeWorkspace && !activeWorkspace.onboardingCompleted) {
    return (
      <OnboardingWizard
        workspace={activeWorkspace}
        onComplete={() => {
          refreshWorkspaces();
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
                    <div className={styles.workspaceItemCheck}><Check size={14} /></div>
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
          <Link href="/dashboard/profile" className={`${styles.userProfile} ${isSidebarCollapsed ? styles.collapsedUserProfile : ''}`} title="View Profile">
            <div className={styles.userAvatar}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} /> : <UserCircle size={32} />}
            </div>
            {!isSidebarCollapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name || user.email.split('@')[0]}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
            )}
          </Link>
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
                      } catch (e: unknown) {
                        const err = e as { response?: { data?: { message?: string } } };
                        setModalError(err.response?.data?.message || 'Failed to create workspace');
                        setIsCreatingWorkspace(false);
                      }
                    }}
                  >
                    {isCreatingWorkspace ? 'Creating...' : 'Create Workspace'}
                  </button>
                  {modalError && (
                    <div className={styles.modalError} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={14} /> <span>{modalError}</span>
                    </div>
                  )}
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
                      } catch (e: unknown) {
                        const err = e as { response?: { data?: { message?: string } } };
                        setModalError(err.response?.data?.message || 'Failed to join workspace. Check your code and password.');
                        setIsJoining(false);
                      }
                    }}
                  >
                    {isJoining ? 'Joining...' : 'Join Workspace'}
                  </button>
                  {modalError && (
                    <div className={styles.modalError} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={14} /> <span>{modalError}</span>
                    </div>
                  )}
                  {modalSuccess && (
                    <div className={styles.modalSuccess} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Check size={14} /> <span>{modalSuccess}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
