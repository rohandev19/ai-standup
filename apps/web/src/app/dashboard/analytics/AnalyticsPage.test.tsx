import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsPage from './page';
import { api } from '@/lib/api';

const mockActiveWorkspace = { id: 'w1', name: 'Test Workspace' };

jest.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    activeWorkspace: mockActiveWorkspace,
  }),
}));

jest.mock('@/lib/api', () => ({
  api: jest.fn(),
}));

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

describe('Analytics Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api as unknown as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ data: { score: 82, submissionRate: 90, resolutionRate: 85 } });
      }
      if (url.includes('/submission-rate')) {
        return Promise.resolve({ data: [{ date: '2026-10-01', rate: 85 }] });
      }
      if (url.includes('/blocker-trend')) {
        return Promise.resolve({ data: [{ date: '2026-10-01', HIGH: 1, MEDIUM: 2, LOW: 0 }] });
      }
      if (url.includes('/member-streaks')) {
        return Promise.resolve({
          data: [
            {
              userId: '1',
              name: 'Linda Oktavia',
              currentStreak: 2,
              totalMissed30d: 4,
              needsAttention: true,
            },
          ],
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders the page title', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Team Analytics')).toBeInTheDocument();
    });
  });

  it('renders the health score and title', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('82')).toBeInTheDocument();
      expect(screen.getByText('Team Health Score')).toBeInTheDocument();
    });
  });

  it('renders the chart card title', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Submission Rate Trend (%)')).toBeInTheDocument();
    });
  });

  it('renders the needs attention section when members missed standups', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Needs Attention').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Linda Oktavia').length).toBeGreaterThan(0);
    });
  });
});
