import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge Component', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies the correct variant class', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    // We check if the class string contains "success" as css modules hash the names
    expect((container.firstChild as HTMLElement).className).toContain('success');
  });

  it('renders a dot when dot prop is true', () => {
    const { container } = render(<Badge dot>Dot Badge</Badge>);
    // Based on Badge.tsx, the dot is a span before the children
    expect(container.querySelector('span > span')).toBeInTheDocument();
  });

  it('applies custom styles', () => {
    const { container } = render(<Badge style={{ marginTop: '10px' }}>Styled Badge</Badge>);
    expect(container.firstChild).toHaveStyle('margin-top: 10px');
  });
});
