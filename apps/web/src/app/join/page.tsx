'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { Clock, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, isLoading: isAuthLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'error' | 'success' | 'auth_required'>(
    !token ? 'error' : 'loading'
  );
  const [message, setMessage] = useState(
    !token ? 'Invalid or missing invitation token.' : 'Verifying your invitation...'
  );

  useEffect(() => {
    if (!token) return;
    if (isAuthLoading) return;

    if (!user) {
      // Save token to localStorage so we can process it after login/register
      localStorage.setItem('pending_invite_token', token);
      queueMicrotask(() => {
        setStatus('auth_required');
        setMessage('You must log in or create an account to accept this invitation.');
      });
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
        
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
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
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-0)', padding: '1rem' }}>
      <Card style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem' }}>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
          {status === 'loading' && <Clock size={44} color="var(--accent)" />}
          {status === 'success' && <CheckCircle2 size={44} color="var(--status-submitted)" />}
          {status === 'error' && <AlertTriangle size={44} color="var(--sev-high)" />}
          {status === 'auth_required' && <Lock size={44} color="var(--accent)" />}
        </div>
        
        <h2 style={{ marginBottom: '0.75rem', color: 'var(--text-1)', fontSize: '1.5rem', fontWeight: 700 }}>Workspace Invitation</h2>
        <p style={{ color: 'var(--text-2)', marginBottom: '2rem', lineHeight: 1.6, fontSize: '0.9375rem' }}>{message}</p>
        
        {status === 'auth_required' && (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Button onClick={() => router.push('/login')} variant="primary" style={{ flex: 1 }}>Log In</Button>
            <Button onClick={() => router.push('/register')} variant="ghost" style={{ flex: 1 }}>Sign Up</Button>
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
    <Suspense fallback={<div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <JoinContent />
    </Suspense>
  );
}
