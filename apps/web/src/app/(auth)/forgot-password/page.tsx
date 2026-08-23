'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card/Card';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { api } from '@/lib/api';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      // Per Requirement 2.6: identical response whether or not email exists
      setSent(true);
    }
  };

  if (sent) {
    return (
      <Card className={`${styles.authCard} animate-fade-in`} glow>
        <div className={styles.header}>
          <h2>Check your email</h2>
          <p>
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
            The link expires in 1 hour.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <Button variant="secondary" fullWidth onClick={() => { setSent(false); setEmail(''); }}>
            Try a different email
          </Button>
          <Link href="/login" style={{ textAlign: 'center' }}>
            <Button variant="ghost" fullWidth>Back to login</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${styles.authCard} animate-fade-in`} glow>
      <div className={styles.header}>
        <h2>Forgot password?</h2>
        <p>Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      {error && <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          required
        />

        <Button type="submit" fullWidth isLoading={loading}>
          Send reset link
        </Button>
      </form>

      <p className={styles.footerText}>
        Remember your password? <Link href="/login" className="text-gradient">Sign in</Link>
      </p>
    </Card>
  );
}
