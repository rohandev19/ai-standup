import Link from 'next/link';
import styles from './layout.module.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authBackground}>
        <div className={styles.glow1}></div>
        <div className={styles.glow2}></div>
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.logo}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span className="text-gradient">AI Standup</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
