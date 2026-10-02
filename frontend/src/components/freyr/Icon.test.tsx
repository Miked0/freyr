import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from './Icon';

describe('Icon', () => {
  it('draws the named path as a decorative 24px-grid svg', () => {
    const { container } = render(<Icon name="calendar" size={16} className="x" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveClass('fr-icon', 'x');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg.querySelector('path')).toHaveAttribute('d', 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4');
    expect(svg.querySelector('path')).toHaveAttribute('stroke-width', '1.6');
  });

  it('defaults to 20px', () => {
    const { container } = render(<Icon name="overview" />);
    expect(container.querySelector('svg')).toHaveAttribute('height', '20');
  });
});
