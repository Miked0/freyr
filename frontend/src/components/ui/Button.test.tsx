import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';
import '@testing-library/jest-dom';

describe('Button', () => {
  it('renders with primary variant by default', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toHaveClass('bg-brand-primary');
    expect(button).toHaveClass('text-surface');
    expect(button).toHaveClass('rounded-[4px]');
  });

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button', { name: /secondary/i });
    expect(button).toHaveClass('bg-surface');
    expect(button).toHaveClass('text-text');
    expect(button).toHaveClass('border-line');
  });

  it('renders with outline variant', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole('button', { name: /outline/i });
    expect(button).toHaveClass('bg-transparent');
    expect(button).toHaveClass('text-brand-primary');
    expect(button).toHaveClass('border-brand-primary');
  });

  it('renders with sm size', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button', { name: /small/i });
    expect(button).toHaveClass('text-[13px]');
    expect(button).toHaveClass('px-3');
    expect(button).toHaveClass('py-2');
  });

  it('renders with md size by default', () => {
    render(<Button>Medium</Button>);
    const button = screen.getByRole('button', { name: /medium/i });
    expect(button).toHaveClass('text-sm');
    expect(button).toHaveClass('px-[22px]');
    expect(button).toHaveClass('py-[13px]');
  });

  it('applies block class when block prop is true', () => {
    render(<Button block>Full width</Button>);
    const button = screen.getByRole('button', { name: /full width/i });
    expect(button).toHaveClass('w-full');
  });

  it('shows loading spinner when loading is true', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it('applies focus-visible ring styles', () => {
    render(<Button>Focusable</Button>);
    const button = screen.getByRole('button', { name: /focusable/i });
    expect(button).toHaveClass('focus-visible:ring-2');
    expect(button).toHaveClass('focus-visible:ring-brand-primary');
    expect(button).toHaveClass('focus-visible:ring-offset-2');
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    fireEvent.click(screen.getByRole('button', { name: /disabled/i }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Loading</Button>);
    fireEvent.click(screen.getByRole('button', { name: /loading/i }));
    expect(handleClick).not.toHaveBeenCalled();
  });
});