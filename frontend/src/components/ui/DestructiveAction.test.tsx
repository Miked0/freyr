import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DestructiveAction from './DestructiveAction';

describe('DestructiveAction', () => {
  it('renders button with label', () => {
    render(<DestructiveAction label="Excluir" onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument();
  });

  it('opens modal when button clicked', () => {
    render(<DestructiveAction label="Excluir" onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Excluir item?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked in modal', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DestructiveAction label="Excluir" onConfirm={onConfirm} />);
    // Open modal by clicking trigger button
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    // Click confirm button in modal (second "Excluir" button)
    const modalConfirmButton = screen.getAllByRole('button', { name: /excluir/i })[1];
    fireEvent.click(modalConfirmButton);
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it('closes modal when cancel clicked', () => {
    render(<DestructiveAction label="Excluir" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal when overlay clicked', () => {
    render(<DestructiveAction label="Excluir" onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses discard variant styles', () => {
    render(<DestructiveAction label="Descartar" onConfirm={vi.fn()} variant="discard" />);
    const button = screen.getByRole('button', { name: /descartar/i });
    expect(button).toHaveClass('text-brand-warm');
    expect(button).toHaveClass('border-brand-warm');
  });

  it('shows custom modal title and message', () => {
    render(<DestructiveAction 
      label="Excluir" 
      onConfirm={vi.fn()} 
      modalTitle="Título personalizado" 
      modalMessage="Mensagem personalizada" 
    />);
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    expect(screen.getByText('Título personalizado')).toBeInTheDocument();
    expect(screen.getByText('Mensagem personalizada')).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    render(<DestructiveAction label="Excluir" onConfirm={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: /excluir/i })).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<DestructiveAction label="Excluir" onConfirm={vi.fn()} loading />);
    expect(screen.getByRole('button', { name: /excluir/i })).toBeDisabled();
  });

  it('calls onCancel when modal closed', () => {
    const onCancel = vi.fn();
    render(<DestructiveAction label="Excluir" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    // Use getAllByRole to find the cancel button in the modal (portal)
    const cancelButton = screen.getAllByRole('button', { name: /cancelar/i })[0];
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });

  it('traps focus in modal', () => {
    render(<DestructiveAction label="Excluir" onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});