import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProductVideoDemo } from './ProductVideoDemo';

describe('ProductVideoDemo component', () => {
  it('renders authentic product dashboard preview with browser frame', () => {
    render(<ProductVideoDemo />);
    expect(screen.getByText('aistandup.app')).toBeInTheDocument();
    expect(screen.getByText('Platform Engineering')).toBeInTheDocument();
    expect(screen.getByText('Submission Rate')).toBeInTheDocument();
    expect(screen.getByText('Active Blockers (1)')).toBeInTheDocument();
    expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('Claude AI Briefing')).toBeInTheDocument();
    expect(screen.getByText("Today's Participation")).toBeInTheDocument();
  });

  it('renders stats strip correctly', () => {
    render(<ProductVideoDemo />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('4 of 4 submitted')).toBeInTheDocument();
    expect(screen.getByText('Standup Window')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('does not render video element or chapters', () => {
    const { container } = render(<ProductVideoDemo />);
    expect(container.querySelector('video')).not.toBeInTheDocument();
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
    expect(screen.queryByText(/Chapters:/i)).not.toBeInTheDocument();
  });
});
