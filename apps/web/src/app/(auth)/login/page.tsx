'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/Card/Card';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import styles from '../auth.module.css';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const queryError = searchParams.get('error')
    ? decodeURIComponent(searchParams.get('error')!)
    : '';
  const displayedError = error || queryError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.accessToken, res.data.user);

      const pendingToken = localStorage.getItem('pending_invite_token');
      if (pendingToken) {
        router.push(`/join?token=${pendingToken}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <Card className={styles.authCard}>
      <div className={styles.header}>
        <h2>Welcome back</h2>
        <p>Enter your details to access your dashboard.</p>
      </div>

      {displayedError && (
        <div
          style={{
            color: 'var(--sev-high)',
            marginBottom: '1.25rem',
            textAlign: 'center',
            background: 'rgba(244, 63, 94, 0.1)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            fontSize: '0.875rem',
          }}
        >
          {displayedError}
        </div>
      )}

      {/* Google Sign-in */}
      <GoogleSignInButton label="Continue with Google" showDivider={true} />

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <div className={styles.forgotPassword}>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        <Button type="submit" fullWidth isLoading={loading}>
          Sign in
        </Button>
      </form>

      <p className={styles.footerText}>
        Don&apos;t have an account? <Link href="/register">Sign up</Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className={styles.authCard}>
          <div className={styles.header}>
            <h2>Welcome back</h2>
            <p>Enter your details to access your dashboard.</p>
          </div>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
