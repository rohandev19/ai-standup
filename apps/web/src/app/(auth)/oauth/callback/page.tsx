'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card } from '@/components/Card/Card';
import styles from '../../auth.module.css';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      router.push(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!token) {
      router.push('/login?error=Missing+authentication+token');
      return;
    }

    const processLogin = async () => {
      try {
        // Fetch current authenticated user info
        const res = await api.get('/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        login(token, res.data);

        const pendingToken = localStorage.getItem('pending_invite_token');
        if (pendingToken) {
          router.push(`/join?token=${pendingToken}`);
        } else {
          router.push('/dashboard');
        }
      } catch (err: unknown) {
        const errorResponse = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          errorResponse.response?.data?.message || 'Failed to complete Google login.',
        );
      }
    };

    processLogin();
  }, [router, searchParams, login]);

  return (
    <Card className={styles.authCard}>
      <div className={styles.header}>
        <h2>Completing Sign In</h2>
        <p>{errorMessage ? errorMessage : 'Connecting your Google account...'}</p>
      </div>

      {errorMessage && (
        <div
          style={{
            color: 'var(--sev-high)',
            margin: '1.25rem 0',
            textAlign: 'center',
            background: 'rgba(244, 63, 94, 0.1)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            fontSize: '0.875rem',
          }}
        >
          {errorMessage}
        </div>
      )}
    </Card>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <Card className={styles.authCard}>
          <div className={styles.header}>
            <h2>Completing Sign In</h2>
            <p>Connecting your Google account...</p>
          </div>
        </Card>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
