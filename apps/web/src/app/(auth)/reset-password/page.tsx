'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Card } from '@/components/Card/Card';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { api } from '@/lib/api';
import styles from '../auth.module.css';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <Card className={`${styles.authCard} animate-fade-in`} glow>
        <div className={styles.header}>
          <h2>Invalid reset link</h2>
          <p>This password reset link is invalid or has expired. Please request a new one.</p>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/forgot-password">
            <Button variant="primary" fullWidth>Request new link</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 digit.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Failed to reset password. The link may have expired.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className={`${styles.authCard} animate-fade-in`} glow>
        <div className={styles.header}>
          <h2>Password reset!</h2>
          <p>Your password has been successfully changed. You can now log in with your new password.</p>
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

  return (
    <Card className={`${styles.authCard} animate-fade-in`} glow>
      <div className={styles.header}>
        <h2>Set new password</h2>
        <p>Enter your new password below. Must be at least 8 characters with uppercase, lowercase, and a digit.</p>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <Button type="submit" fullWidth isLoading={loading}>
          Reset password
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Card className={`${styles.authCard} animate-fade-in`} glow>
        <div className={styles.header}>
          <h2>Loading...</h2>
        </div>
      </Card>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
