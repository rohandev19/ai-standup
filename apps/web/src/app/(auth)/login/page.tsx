'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card/Card';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import styles from '../auth.module.css';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login
    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <Card className={`${styles.authCard} animate-fade-in`} glow>
      <div className={styles.header}>
        <h2>Welcome back</h2>
        <p>Enter your details to access your dashboard.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input 
          label="Email Address" 
          type="email" 
          placeholder="name@company.com" 
          required 
        />
        <Input 
          label="Password" 
          type="password" 
          placeholder="••••••••" 
          required 
        />
        
        <div className={styles.forgotPassword}>
          <Link href="#">Forgot password?</Link>
        </div>

        <Button type="submit" fullWidth isLoading={loading}>
          Sign in
        </Button>
      </form>

      <p className={styles.footerText}>
        Don&apos;t have an account? <Link href="/register" className="text-gradient">Sign up</Link>
      </p>
    </Card>
  );
}
