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
  ChevronDown
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
  const { workspaces, activeWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
                Does your team already use AI Standup? You don&apos;t need to create a new workspace here.
              </p>

              <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px dashed rgba(99, 102, 241, 0.3)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                  Ask your Admin for an <strong>invite link</strong>. Clicking it will automatically add you to their workspace.
                </span>
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
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className="text-gradient">AI Standup</span>
        </div>

        <div
          className={styles.workspaceSelector}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          <div className={styles.avatar}>{activeWorkspace ? activeWorkspace.name.charAt(0).toUpperCase() : '?'}</div>
          <div className={styles.workspaceInfo}>
            <span className={styles.workspaceName}>{activeWorkspace ? activeWorkspace.name : 'Loading...'}</span>
            <span className={styles.workspaceRole}>
              {activeWorkspace?.members?.[0]?.role ?
                activeWorkspace.members[0].role.charAt(0) + activeWorkspace.members[0].role.slice(1).toLowerCase()
                : 'Member'}
            </span>
          </div>
          <ChevronDown size={16} style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }} />

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.5rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '0.5rem',
              zIndex: 50,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>
                Your Workspaces
              </div>
              {workspaces.map(w => (
                <button
                  key={w.id}
                  onClick={() => {
                    setActiveWorkspace(w);
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: w.id === activeWorkspace?.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                    color: w.id === activeWorkspace?.id ? 'var(--text-main)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = w.id === activeWorkspace?.id ? 'rgba(255,255,255,0.05)' : 'transparent'}
                >
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '4px', background: 'var(--accent-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 600
                  }}>
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{w.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.icon}
              <span style={{ marginLeft: '12px' }}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/dashboard/profile" className={`${styles.navItem} ${pathname === '/dashboard/profile' ? styles.active : ''}`}>
            <UserCircle size={20} />
            <span style={{ marginLeft: '12px' }}>Profile</span>
          </Link>
          <button
            className={styles.logoutBtn}
            onClick={() => {
              logout();
              router.push('/login');
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
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
    </div>
  );
}
