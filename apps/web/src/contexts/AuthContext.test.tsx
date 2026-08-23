import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn(),
      },
    },
  },
}));

const TestComponent = () => {
  const { user, accessToken, isLoading, login, logout } = useAuth();
  
  if (isLoading) return <div>Loading Auth...</div>;

  return (
    <div>
      <div data-testid="auth-status">{user ? 'Authenticated' : 'Unauthenticated'}</div>
      <div data-testid="user-email">{user?.email}</div>
      <div data-testid="access-token">{accessToken}</div>
      <button onClick={() => login('new-token', { id: '1', email: 'test@example.com' })}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes as unauthenticated when refresh fails', async () => {
    // Mock refresh to fail
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state is loading
    expect(screen.getByText('Loading Auth...')).toBeInTheDocument();

    // Eventually resolves to unauthenticated
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated');
    });
    
    // Refresh endpoint was called
    expect(api.post).toHaveBeenCalledWith('/auth/refresh');
  });

  it('initializes as authenticated when refresh succeeds', async () => {
    // Mock refresh to succeed
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: {
        accessToken: 'mock-token-123',
        user: { id: 'u1', email: 'john@example.com' },
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('john@example.com');
    expect(screen.getByTestId('access-token')).toHaveTextContent('mock-token-123');
  });
});
