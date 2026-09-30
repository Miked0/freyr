import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TextLink from './TextLink';
import '@testing-library/jest-dom';

describe('TextLink', () => {
  it('renders as anchor tag with href', () => {
    render(<TextLink href="/test">Link text</TextLink>);
    const link = screen.getByRole('link', { name: /link text/i });
    expect(link).toHaveAttribute('href', '/test');
  });

  it('applies brand-primary color (text-brand-primary)', () => {
    render(<TextLink href="/test">Brand link</TextLink>);
    const link = screen.getByRole('link', { name: /brand link/i });
    expect(link).toHaveClass('text-brand-primary');
  });

  it('has underline with 0.3em offset', () => {
    render(<TextLink href="/test">Underlined</TextLink>);
    const link = screen.getByRole('link', { name: /underlined/i });
    const underline = link.querySelector('span[aria-hidden="true"]');
    expect(underline).toBeInTheDocument();
    expect(underline).toHaveClass('bottom-[-0.3em]');
  });

  it('applies focus-visible ring styles', () => {
    render(<TextLink href="/test">Focusable</TextLink>);
    const link = screen.getByRole('link', { name: /focusable/i });
    expect(link).toHaveClass('focus-visible:ring-2');
    expect(link).toHaveClass('focus-visible:ring-brand-primary');
    expect(link).toHaveClass('focus-visible:ring-offset-2');
  });

  it('shows underline on hover via scale transform', () => {
    render(<TextLink href="/test">Hoverable</TextLink>);
    const link = screen.getByRole('link', { name: /hoverable/i });
    const underline = link.querySelector('span[aria-hidden="true"]');
    expect(underline).toHaveClass('scale-x-0');
    expect(underline).toHaveClass('hover:scale-x-100');
  });

  it('passes through additional props', () => {
    render(<TextLink href="/test" target="_blank" rel="noopener">External</TextLink>);
    const link = screen.getByRole('link', { name: /external/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
  });
});