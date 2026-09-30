import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Alert from './Alert';

describe('Alert', () => {
  it('renders error variant with correct styles and role', () => {
    render(<Alert variant="error" message="Algo deu errado" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Algo deu errado');
    expect(alert).toHaveClass('bg-alert-soft');
    expect(alert).toHaveClass('border-alert');
    expect(alert).toHaveClass('text-alert');
  });

  it('renders success variant with status role', () => {
    render(<Alert variant="success" message="Operação concluída" />);
    const alert = screen.getByRole('status');
    expect(alert).toHaveTextContent('Operação concluída');
    expect(alert).toHaveClass('bg-positive-soft');
    expect(alert).toHaveClass('border-positive');
    expect(alert).toHaveClass('text-positive');
  });

  it('renders warning variant with alert role', () => {
    render(<Alert variant="warning" message="Atenção necessária" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Atenção necessária');
    expect(alert).toHaveClass('bg-brand-warm-soft');
    expect(alert).toHaveClass('border-brand-warm');
    expect(alert).toHaveClass('text-brand-warm');
  });

  it('renders info variant with status role', () => {
    render(<Alert variant="info" message="Informação útil" />);
    const alert = screen.getByRole('status');
    expect(alert).toHaveTextContent('Informação útil');
    expect(alert).toHaveClass('bg-brand-primary-soft');
    expect(alert).toHaveClass('border-brand-primary');
    expect(alert).toHaveClass('text-brand-primary');
  });

  it('renders title when provided', () => {
    render(<Alert variant="error" title="Erro" message="Detalhes do erro" />);
    expect(screen.getByText('Erro')).toBeInTheDocument();
    expect(screen.getByText('Detalhes do erro')).toBeInTheDocument();
  });

  it('shows dismiss button when dismissible', () => {
    const onDismiss = vi.fn();
    render(<Alert variant="info" message="Pode dispensar" dismissible onDismiss={onDismiss} />);
    const dismissButton = screen.getByLabelText('Dispensar');
    expect(dismissButton).toBeInTheDocument();
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('does not show dismiss button when not dismissible', () => {
    render(<Alert variant="info" message="Não pode dispensar" />);
    expect(screen.queryByLabelText('Dispensar')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Alert variant="error" message="Teste" className="custom-class" />);
    expect(screen.getByRole('alert')).toHaveClass('custom-class');
  });

  it('uses correct aria-live for error and warning', () => {
    const { container: errorContainer } = render(<Alert variant="error" message="Erro" />);
    expect(errorContainer.firstChild).toHaveAttribute('aria-live', 'assertive');
    
    const { container: warningContainer } = render(<Alert variant="warning" message="Aviso" />);
    expect(warningContainer.firstChild).toHaveAttribute('aria-live', 'assertive');
  });

  it('uses correct aria-live for success and info', () => {
    const { container: successContainer } = render(<Alert variant="success" message="Sucesso" />);
    expect(successContainer.firstChild).toHaveAttribute('aria-live', 'polite');
    
    const { container: infoContainer } = render(<Alert variant="info" message="Info" />);
    expect(infoContainer.firstChild).toHaveAttribute('aria-live', 'polite');
  });
});