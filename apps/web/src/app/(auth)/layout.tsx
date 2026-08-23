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
          <span className="text-gradient">AI Standup</span>
        </div>
        {children}
      </div>
    </div>
  );
}
