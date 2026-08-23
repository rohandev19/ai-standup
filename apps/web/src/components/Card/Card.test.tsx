import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies the glow class when glow prop is true', () => {
    const { container } = render(<Card glow>Glow Card</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('glow');
  });

  it('applies custom className and style', () => {
    const { container } = render(
      <Card className="custom-class" style={{ padding: '20px' }}>
        Styled Card
      </Card>
    );
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveStyle('padding: 20px');
  });
});
