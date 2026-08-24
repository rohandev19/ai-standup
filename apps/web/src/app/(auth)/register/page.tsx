'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card/Card';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { api } from '@/lib/api';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('You must agree to the Terms & Privacy Policy to register.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/register', { 
        email, 
        password,
        name,
        consentGivenAt: new Date().toISOString()
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Failed to register');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className={`${styles.authCard} animate-fade-in`} glow>
        <div className={styles.header}>
          <h2>Check your email</h2>
          <p>We&apos;ve sent a verification link to {email}.</p>
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Redirecting to login...</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${styles.authCard} animate-fade-in`} glow>
      <div className={styles.header}>
        <h2>Create an account</h2>
        <p>Start automating your team&apos;s standup today.</p>
      </div>

      {error && <div style={{ color: 'var(--accent-red)', marginBottom: '1.5rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input 
          label="Full Name" 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe" 
          required 
        />
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
        
        <div className={styles.passwordHint}>
          Password must contain:
          <ul>
            <li>At least 8 characters</li>
            <li>One uppercase letter (A-Z)</li>
            <li>One lowercase letter (a-z)</li>
            <li>One number (0-9)</li>
          </ul>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input 
            type="checkbox" 
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ marginTop: '0.2rem' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>
            I agree to the <Link href="/terms" style={{ color: 'var(--text)' }}>Terms of Service</Link> and <Link href="/privacy" style={{ color: 'var(--text)' }}>Privacy Policy</Link>, and consent to the processing of my personal data.
          </span>
        </label>

        <Button type="submit" fullWidth isLoading={loading}>
          Create Account
        </Button>
      </form>

      <p className={styles.footerText}>
        Already have an account? <Link href="/login" className="text-gradient">Sign in</Link>
      </p>
    </Card>
  );
}
