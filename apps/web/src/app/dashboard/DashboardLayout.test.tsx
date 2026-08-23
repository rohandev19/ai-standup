import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardLayout from './layout';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useRouter } from 'next/navigation';

// Mock the context hooks
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/dashboard',
}));

describe('DashboardLayout (Protected Route)', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useWorkspace as jest.Mock).mockReturnValue({
      activeWorkspace: { name: 'Test Workspace', members: [{ role: 'ADMIN' }] },
      isLoading: false,
    });
  });

  it('renders loading state when auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
      logout: jest.fn(),
    });

    render(
      <DashboardLayout>
        <div>Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      logout: jest.fn(),
    });

    render(
      <DashboardLayout>
        <div>Dashboard Content</div>
      </DashboardLayout>
    );

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('renders dashboard content when authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'u1', email: 'test@example.com' },
      isLoading: false,
      logout: jest.fn(),
    });

    render(
      <DashboardLayout>
        <div data-testid="dashboard-content">Dashboard Content</div>
      </DashboardLayout>
    );

    // Sidebar should be rendered
    expect(screen.getByText('AI Standup')).toBeInTheDocument();
    expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    
    // Content should be rendered
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
  });
});
