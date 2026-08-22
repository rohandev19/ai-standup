'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card/Card';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import styles from './auth.module.css';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate register
    setTimeout(() => {
      setLoading(false);
      window.location.href = '/dashboard';
    }, 1500);
  };

  return (
    <Card className={`${styles.authCard} animate-fade-in`} glow>
      <div className={styles.header}>
        <h2>Create an account</h2>
        <p>Start automating your team's standup today.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input 
          label="Full Name" 
          type="text" 
          placeholder="John Doe" 
          required 
        />
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
