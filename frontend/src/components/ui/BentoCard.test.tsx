import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BentoCard from './BentoCard';
import '@testing-library/jest-dom';

describe('BentoCard', () => {
  it('renders as article element', () => {
    render(<BentoCard>Card content</BentoCard>);
    expect(screen.getByText(/card content/i)).toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('applies base styling classes', () => {
    render(<BentoCard>Styled</BentoCard>);
    const card = screen.getByRole('article');
    expect(card).toHaveClass('bg-surface');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('border-line');
    expect(card).toHaveClass('rounded-[8px]');
    expect(card).toHaveClass('p-6');
  });

  it('applies span classes for grid column spanning', () => {
    render(<BentoCard span={6}>Half width</BentoCard>);
    const card = screen.getByRole('article');
    expect(card).toHaveClass('grid-col-span-6');
  });

  it('defaults to full width (span 12)', () => {
    render(<BentoCard>Full width</BentoCard>);
    const card = screen.getByRole('article');
    expect(card).toHaveClass('grid-col-span-12');
  });

  it('accepts all valid span values 1-12', () => {
    for (let i = 1; i <= 12; i++) {
      const { unmount } = render(<BentoCard span={i as 1|2|3|4|5|6|7|8|9|10|11|12}>Span {i}</BentoCard>);
      const card = screen.getByRole('article');
      expect(card).toHaveClass(`grid-col-span-${i}`);
      unmount();
    }
  });

  it('applies custom className', () => {
    render(<BentoCard className="custom-class">Custom</BentoCard>);
    const card = screen.getByRole('article');
    expect(card).toHaveClass('custom-class');
  });

  it('has hover border transition', () => {
    render(<BentoCard>Hoverable</BentoCard>);
    const card = screen.getByRole('article');
    expect(card).toHaveClass('hover:border-text/20');
    expect(card).toHaveClass('transition-colors');
    expect(card).toHaveClass('duration-160');
  });

  it('renders children correctly', () => {
    render(
      <BentoCard>
        <h3 className="font-bold">Title</h3>
        <p>Description</p>
      </BentoCard>
    );
    expect(screen.getByText(/title/i)).toBeInTheDocument();
    expect(screen.getByText(/description/i)).toBeInTheDocument();
  });
});