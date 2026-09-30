import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServerStatus from './ServerStatus';

describe('ServerStatus', () => {
  it('renders online status with green indicator', () => {
    render(<ServerStatus status="online" />);
    const status = screen.getByText('Online');
    expect(status).toBeInTheDocument();
    const container = status.parentElement;
    expect(container).toHaveClass('text-success');
    const indicator = container?.querySelector('.w-2.h-2');
    expect(indicator).toHaveClass('text-success');
    expect(indicator).toHaveClass('animate-pulse');
  });

  it('renders offline status with red indicator', () => {
    render(<ServerStatus status="offline" />);
    const status = screen.getByText('Offline');
    expect(status).toBeInTheDocument();
    const container = status.parentElement;
    expect(container).toHaveClass('text-danger');
    const indicator = container?.querySelector('.w-2.h-2');
    expect(indicator).toHaveClass('text-danger');
    expect(indicator).not.toHaveClass('animate-pulse');
  });

  it('renders ai-active status with accent indicator', () => {
    render(<ServerStatus status="ai-active" />);
    const status = screen.getByText('IA ativa');
    expect(status).toBeInTheDocument();
    const container = status.parentElement;
    expect(container).toHaveClass('text-accent');
    const indicator = container?.querySelector('.w-2.h-2');
    expect(indicator).toHaveClass('text-accent');
    expect(indicator).toHaveClass('animate-pulse');
  });

  it('hides label when showLabel is false', () => {
    render(<ServerStatus status="online" showLabel={false} />);
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
    const indicator = document.querySelector('.w-2.h-2');
    expect(indicator).toBeInTheDocument();
  });

  it('applies custom className to container', () => {
    render(<ServerStatus status="online" className="custom-class" />);
    const status = screen.getByText('Online');
    const container = status.parentElement;
    expect(container).toHaveClass('custom-class');
  });
});