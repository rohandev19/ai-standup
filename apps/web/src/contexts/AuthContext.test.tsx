import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
      response: {
        use: jest.fn(),
        eject: jest.fn(),
      },
    },
  },
}));

const TestComponent = () => {
  const { user, accessToken, isLoading, login, logout } = useAuth();
  
  return (
    <div>
      {isLoading && <div>Loading Auth...</div>}
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
      expect(screen.queryByText('Loading Auth...')).not.toBeInTheDocument();
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

  it('does not overwrite explicit login() state if initial refresh rejects afterwards', async () => {
    let rejectRefresh!: (err: Error) => void;
    (api.post as jest.Mock).mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectRefresh = reject;
      }),
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate OAuth callback calling login() before initial refresh completes
    fireEvent.click(screen.getByText('Login'));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('access-token')).toHaveTextContent('new-token');

    // Now initial refresh rejects
    rejectRefresh(new Error('Unauthorized'));

    await waitFor(() => {
      expect(screen.queryByText('Loading Auth...')).not.toBeInTheDocument();
    });

    // User should still be authenticated!
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('access-token')).toHaveTextContent('new-token');
  });
});
