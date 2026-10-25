import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProductVideoDemo } from './ProductVideoDemo';

describe('ProductVideoDemo component', () => {
  it('renders video element with default source', () => {
    const { container } = render(<ProductVideoDemo videoSrc="/demo.mp4" />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', '/demo.mp4');
  });

  it('renders authentic product dashboard preview initially with play action', () => {
    render(<ProductVideoDemo videoSrc="/demo.mp4" />);
    expect(screen.getByText('Platform Engineering')).toBeInTheDocument();
    expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('Claude AI Briefing')).toBeInTheDocument();

    const playButton = screen.getByRole('button', { name: /play video walkthrough/i });
    expect(playButton).toBeInTheDocument();
  });

  it('renders iframe when embedUrl is provided', () => {
    render(<ProductVideoDemo embedUrl="https://www.youtube.com/embed/dQw4w9WgXcQ" />);
    const iframe = screen.getByTitle(/AI Standup/i);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('does not render chapter timeline list', () => {
    render(<ProductVideoDemo />);
    expect(screen.queryByText(/Chapters:/i)).not.toBeInTheDocument();
  });
});
