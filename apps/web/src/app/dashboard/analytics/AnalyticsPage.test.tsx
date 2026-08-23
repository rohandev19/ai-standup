import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalyticsPage from './page';

// Mock the WorkspaceContext since AnalyticsPage likely uses it, 
// though right now it uses static mock data.
jest.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    activeWorkspace: { id: 'w1', name: 'Test Workspace' },
  }),
}));

describe('Analytics Page', () => {
  it('renders the page title and description', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText('Team Analytics')).toBeInTheDocument();
    expect(screen.getByText(/Insights into your team's standup participation/i)).toBeInTheDocument();
  });

  it('renders the mocked health score', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('Team Health Score')).toBeInTheDocument();
  });

  it('renders the custom bar chart data', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText('Daily Submission Rate (Last 30 Days)')).toBeInTheDocument();
  });

  it('renders the needs attention section if members missed standups', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText(/Needs Attention/i)).toBeInTheDocument();
    // Assuming Linda Oktavia is in the needs attention mock data as well as the main table
    expect(screen.getAllByText('Linda Oktavia').length).toBeGreaterThan(1);
  });
});
