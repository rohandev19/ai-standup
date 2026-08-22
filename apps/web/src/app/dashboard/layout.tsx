'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'My Standups', href: '/dashboard/standups' },
    { label: 'Teams', href: '/dashboard/teams' },
    { label: 'Settings', href: '/dashboard/settings' },
  ];

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className="text-gradient">AI Standup</span>
        </div>
        
        <div className={styles.workspaceSelector}>
          <div className={styles.avatar}>T</div>
          <div className={styles.workspaceInfo}>
            <span className={styles.workspaceName}>TechCorp Inc.</span>
            <span className={styles.workspaceRole}>Admin</span>
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
          <button className={styles.logoutBtn}>Log out</button>
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
          {children}
        </main>
      </div>
    </div>
  );
}
