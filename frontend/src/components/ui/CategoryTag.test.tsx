import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoryTag from './CategoryTag';
import '@testing-library/jest-dom';

describe('CategoryTag', () => {
  it('renders category in uppercase with brackets', () => {
    render(<CategoryTag category="alimentação" />);
    const tag = screen.getByText(/\[ ALIMENTAÇÃO \]/i);
    expect(tag).toBeInTheDocument();
  });

  it('applies uppercase transformation', () => {
    render(<CategoryTag category="transporte" />);
    const tag = screen.getByText(/\[ TRANSPORTE \]/i);
    expect(tag).toBeInTheDocument();
  });

  it('has no color dot/ball indicator', () => {
    render(<CategoryTag category="lazer" />);
    const tag = screen.getByText(/\[ LAZER \]/i);
    const dots = tag.querySelectorAll('[class*="rounded-full"], [class*="w-"], [class*="h-"]');
    expect(dots.length).toBe(0);
  });

  it('applies correct styling classes', () => {
    render(<CategoryTag category="saúde" />);
    const tag = screen.getByText(/\[ SAÚDE \]/i);
    expect(tag).toHaveClass('text-[11px]');
    expect(tag).toHaveClass('font-semibold');
    expect(tag).toHaveClass('tracking-[0.06em]');
    expect(tag).toHaveClass('text-ink-muted');
    expect(tag).toHaveClass('px-2');
    expect(tag).toHaveClass('py-0.5');
    expect(tag).toHaveClass('border');
    expect(tag).toHaveClass('border-line');
    expect(tag).toHaveClass('rounded-[4px]');
  });

  it('has aria-label with category name', () => {
    render(<CategoryTag category="educação" />);
    const tag = screen.getByText(/\[ EDUCAÇÃO \]/i);
    expect(tag).toHaveAttribute('aria-label', 'Categoria: educação');
  });

  it('handles special characters in category name', () => {
    render(<CategoryTag category="casa & decoração" />);
    const tag = screen.getByText(/\[ CASA & DECORAÇÃO \]/i);
    expect(tag).toBeInTheDocument();
  });
});