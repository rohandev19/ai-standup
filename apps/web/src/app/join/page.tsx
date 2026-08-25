'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, isLoading: isAuthLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'error' | 'success' | 'auth_required'>('loading');
  const [message, setMessage] = useState('Verifying your invitation...');

  useEffect(() => {
    if (isAuthLoading) return;

    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing invitation token.');
      return;
    }

    if (!user) {
      // Save token to localStorage so we can process it after login/register
      localStorage.setItem('pending_invite_token', token);
      setStatus('auth_required');
      setMessage('You must log in or create an account to accept this invitation.');
      return;
    }

    // Remove any pending token now that we are processing it
    localStorage.removeItem('pending_invite_token');

    // Process token
    const joinWorkspace = async () => {
      try {
        await api.post('/workspaces/join', { token });
        setStatus('success');
        setMessage('Successfully joined the workspace! Redirecting to dashboard...');
        
        // Give it a short delay then redirect
        setTimeout(() => {
          // Force hard reload to reset all workspace contexts
          window.location.href = '/dashboard';
        }, 2000);
      } catch (err: unknown) {
        const errorResponse = err as { response?: { data?: { message?: string } } };
        setStatus('error');
        setMessage(errorResponse.response?.data?.message || 'Failed to join workspace. It may have expired or already been used.');
      }
    };

    joinWorkspace();
  }, [token, user, isAuthLoading, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <Card style={{ maxWidth: '450px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          {status === 'loading' && <span style={{ fontSize: '3rem' }}>⏳</span>}
          {status === 'success' && <span style={{ fontSize: '3rem' }}>🎉</span>}
          {status === 'error' && <span style={{ fontSize: '3rem' }}>⚠️</span>}
          {status === 'auth_required' && <span style={{ fontSize: '3rem' }}>🔐</span>}
        </div>
        
        <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Workspace Invitation</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>{message}</p>
        
        {status === 'auth_required' && (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Button onClick={() => router.push('/login')} variant="primary" style={{ flex: 1 }}>Log In</Button>
            <Button onClick={() => router.push('/register')} variant="outline" style={{ flex: 1 }}>Sign Up</Button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button onClick={() => router.push('/dashboard')} variant="primary">Go to Dashboard</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <JoinContent />
    </Suspense>
  );
}
