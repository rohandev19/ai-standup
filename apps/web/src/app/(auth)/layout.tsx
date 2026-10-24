import Link from 'next/link';
import styles from './layout.module.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.authContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.logo}>
          <Link href="/" className={styles.logoLink}>
            AI Standup
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
