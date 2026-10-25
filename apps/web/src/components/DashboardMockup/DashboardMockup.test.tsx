import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardMockup } from './DashboardMockup';

describe('DashboardMockup component', () => {
  it('renders macOS browser window frame with address bar', () => {
    render(<DashboardMockup />);
    expect(screen.getByText('aistandup.app')).toBeInTheDocument();
  });

  it('renders high-fidelity dashboard replica stats and sections', () => {
    render(<DashboardMockup />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Platform Engineering')).toBeInTheDocument();
    expect(screen.getByText('Submission Rate')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Active Blockers (1)')).toBeInTheDocument();
    expect(screen.getByText('Team Presence')).toBeInTheDocument();
    expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('Claude AI Briefing')).toBeInTheDocument();
    expect(screen.getByText('Recent Submissions')).toBeInTheDocument();
    expect(screen.getAllByText('Mr.Han').length).toBeGreaterThanOrEqual(1);
  });

  it('renders no video elements or play buttons', () => {
    const { container } = render(<DashboardMockup />);
    expect(container.querySelector('video')).not.toBeInTheDocument();
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /play/i })).not.toBeInTheDocument();
  });
});
