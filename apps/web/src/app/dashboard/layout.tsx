'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { io, Socket } from 'socket.io-client';
import NotificationBell from '@/components/NotificationBell';
import OnboardingWizard from '@/components/OnboardingWizard';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, isLoading: isAuthLoading, logout } = useAuth();
  const { activeWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();
  const [unreadCount, setUnreadCount] = useState(0);

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
  }, [activeWorkspace?.id, accessToken]);

  const navItems = [
    { label: '📊 Overview', href: '/dashboard', icon: '📊' },
    { label: '📝 My Standups', href: '/dashboard/standups', icon: '📝' },
    { label: '👥 Teams', href: '/dashboard/teams', icon: '👥' },
    { label: '📜 History', href: '/dashboard/history', icon: '📜' },
    { label: '📈 Analytics', href: '/dashboard/analytics', icon: '📈' },
    { label: '🕐 Activity', href: '/dashboard/activity', icon: '🕐' },
    { label: '⚙️ Settings', href: '/dashboard/settings', icon: '⚙️' },
  ];

  if (isAuthLoading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
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
        
        <div className={styles.workspaceSelector}>
          <div className={styles.avatar}>{activeWorkspace ? activeWorkspace.name.charAt(0).toUpperCase() : '?'}</div>
          <div className={styles.workspaceInfo}>
            <span className={styles.workspaceName}>{activeWorkspace ? activeWorkspace.name : 'Loading...'}</span>
            <span className={styles.workspaceRole}>
              {activeWorkspace?.members?.[0]?.role ? 
                activeWorkspace.members[0].role.charAt(0) + activeWorkspace.members[0].role.slice(1).toLowerCase() 
                : 'Member'}
            </span>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/dashboard/profile" className={`${styles.navItem} ${pathname === '/dashboard/profile' ? styles.active : ''}`}>
            👤 Profile
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
