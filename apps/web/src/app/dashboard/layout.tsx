'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const { activeWorkspace, workspaces, setActiveWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  const navItems = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'My Standups', href: '/dashboard/standups' },
    { label: 'Teams', href: '/dashboard/teams' },
    { label: 'Settings', href: '/dashboard/settings' },
  ];

  if (isAuthLoading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
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
