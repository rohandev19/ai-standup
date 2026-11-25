'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card/Card';
import styles from '../../auth.module.css';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login?error=Failed+to+complete+Google+sign-in.');
      return;
    }

    const pendingToken = localStorage.getItem('pending_invite_token');
    router.replace(
      pendingToken ? `/join?token=${encodeURIComponent(pendingToken)}` : '/dashboard',
    );
  }, [isLoading, router, user]);

  return (
    <Card className={styles.authCard}>
      <div className={styles.header}>
        <h2>Completing sign-in</h2>
        <p>Connecting your Google account...</p>
      </div>
    </Card>
  );
}
