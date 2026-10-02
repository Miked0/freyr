import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wordmark } from './Wordmark';

describe('Wordmark', () => {
  it('shows the rune and the name at the given size', () => {
    const { container } = render(<Wordmark size={20} />);
    expect(container.firstChild).toHaveClass('fr-wordmark');
    expect(container.firstChild).toHaveStyle({ fontSize: '20px' });
    expect(screen.getByText('FREYR')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('width', String(20 * 0.66));
  });

  it('can hide the name', () => {
    render(<Wordmark showName={false} />);
    expect(screen.queryByText('FREYR')).not.toBeInTheDocument();
  });
});
