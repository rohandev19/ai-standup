'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';
import { api } from '@/lib/api';
import styles from '../../auth.module.css';

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link');
      setLoading(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        await api.get(`/auth/verify-email/${token}`);
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } catch (err: unknown) {
        const errorResponse = err as { response?: { data?: { message?: string } } };
        setError(errorResponse.response?.data?.message || 'Failed to verify email. The link may have expired.');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, router]);

  if (loading) {
    return (
      <Card className={`${styles.authCard} animate-fade-in`} glow>
        <div className={styles.header}>
          <h2>Verifying your email...</h2>
          <p>Please wait while we verify your email address.</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${styles.authCard} animate-fade-in`} glow>
        <div className={styles.header}>
          <h2>Verification failed</h2>
          <p>{error}</p>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/register">
            <Button variant="primary" fullWidth>Back to register</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className={`${styles.authCard} animate-fade-in`} glow>
        <div className={styles.header}>
          <h2>Email verified! 🎉</h2>
          <p>Your email has been successfully verified. You can now log in to your account.</p>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/login">
            <Button variant="primary" fullWidth>Go to login</Button>
          </Link>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Redirecting in 3 seconds...
        </p>
      </Card>
    );
  }

  return null;
}
