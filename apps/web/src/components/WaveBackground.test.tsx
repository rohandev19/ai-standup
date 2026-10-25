import React from 'react';
import { render } from '@testing-library/react';
import { WaveBackground } from './WaveBackground';

describe('WaveBackground component', () => {
  beforeEach(() => {
    // Mock matchMedia
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    // Mock IntersectionObserver
    class MockIntersectionObserver {
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    }
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it('renders canvas element with aria-hidden="true"', () => {
    const { container } = render(<WaveBackground />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('handles environment gracefully when WebGL context is null', () => {
    // In JSDOM, getContext('webgl') returns null by default
    expect(() => render(<WaveBackground />)).not.toThrow();
  });
});
