import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Wordmark from './Wordmark';
import '@testing-library/jest-dom';

describe('Wordmark', () => {
  it('renders Fehu rune ᚠ', () => {
    render(<Wordmark />);
    expect(screen.getByText(/ᚠ/)).toBeInTheDocument();
  });

  it('renders "freyr" with italic "e"', () => {
    render(<Wordmark />);
    const wordmark = screen.getByLabelText('freyr');
    expect(wordmark).toBeInTheDocument();
    const em = wordmark.querySelector('em');
    expect(em).toBeInTheDocument();
    expect(em).toHaveTextContent('e');
    expect(em).toHaveClass('font-serif');
    expect(em).toHaveClass('italic');
  });

  it('applies size sm classes to inner spans', () => {
    render(<Wordmark size="sm" />);
    const rune = screen.getByText(/ᚠ/);
    const textSpan = rune.parentElement?.querySelector('span:last-child');
    expect(rune).toHaveClass('text-[20px]');
    expect(textSpan).toHaveClass('text-[14px]');
  });

  it('applies size md classes to inner spans by default', () => {
    render(<Wordmark />);
    const rune = screen.getByText(/ᚠ/);
    const textSpan = rune.parentElement?.querySelector('span:last-child');
    expect(rune).toHaveClass('text-[28px]');
    expect(textSpan).toHaveClass('text-[18px]');
  });

  it('applies size lg classes to inner spans', () => {
    render(<Wordmark size="lg" />);
    const rune = screen.getByText(/ᚠ/);
    const textSpan = rune.parentElement?.querySelector('span:last-child');
    expect(rune).toHaveClass('text-[40px]');
    expect(textSpan).toHaveClass('text-[24px]');
  });

  it('applies size xl classes to inner spans', () => {
    render(<Wordmark size="xl" />);
    const rune = screen.getByText(/ᚠ/);
    const textSpan = rune.parentElement?.querySelector('span:last-child');
    expect(rune).toHaveClass('text-[56px]');
    expect(textSpan).toHaveClass('text-[32px]');
  });

  it('applies brand-primary color to rune', () => {
    render(<Wordmark />);
    const rune = screen.getByText(/ᚠ/);
    expect(rune).toHaveClass('text-brand-primary');
  });

  it('has aria-label for accessibility', () => {
    render(<Wordmark />);
    expect(screen.getByLabelText('freyr')).toBeInTheDocument();
  });

  it('rune is hidden from screen readers', () => {
    render(<Wordmark />);
    const rune = screen.getByText(/ᚠ/);
    expect(rune).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies font-sans to text part', () => {
    render(<Wordmark />);
    const textSpan = screen.getByLabelText('freyr').querySelector('span:last-child');
    expect(textSpan).toHaveClass('font-sans');
  });
});