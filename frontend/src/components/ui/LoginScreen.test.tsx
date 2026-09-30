import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginScreen from './LoginScreen';

const mockOnSuccess = vi.fn();

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<LoginScreen onSuccess={mockOnSuccess} />);
    // Check for the tab buttons (not the submit button)
    expect(screen.getAllByText('Entrar')).toHaveLength(2);
    expect(screen.getByText('Cadastrar')).toBeInTheDocument();
    expect(screen.getByLabelText(/nome de usu[aá]rio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha de acesso/i)).toBeInTheDocument();
    // The submit button has type="submit" - find it specifically (second button with name "Entrar")
    expect(screen.getAllByRole('button', { name: /entrar/i, exact: false })).toHaveLength(2);
  });

  it('switches to register mode when Cadastrar is clicked', () => {
    render(<LoginScreen onSuccess={mockOnSuccess} />);
    fireEvent.click(screen.getByText('Cadastrar'));
    expect(screen.getByLabelText(/criar senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Escolha um nome de usuário')).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<LoginScreen onSuccess={mockOnSuccess} />);
    const passwordInput = screen.getByLabelText(/senha de acesso/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByLabelText(/mostrar senha/i));
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByLabelText(/ocultar senha/i));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('shows error when passwords do not match in register mode', async () => {
    render(<LoginScreen onSuccess={mockOnSuccess} />);
    fireEvent.click(screen.getByText('Cadastrar'));
    fireEvent.change(screen.getByLabelText(/nome de usu[aá]rio/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/criar senha/i), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'senha456' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('As senhas não conferem.');
    });
  });

  it('shows error when password is too short in register mode', async () => {
    render(<LoginScreen onSuccess={mockOnSuccess} />);
    fireEvent.click(screen.getByText('Cadastrar'));
    fireEvent.change(screen.getByLabelText(/nome de usu[aá]rio/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/criar senha/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('A senha deve ter no mínimo 8 caracteres.');
    });
  });

  it('disables form when submitting', async () => {
    render(<LoginScreen onSuccess={mockOnSuccess} />);
    fireEvent.change(screen.getByLabelText(/nome de usu[aá]rio/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/senha de acesso/i), { target: { value: 'senha123' } });
    // Click the submit button (type="submit") - it's the second button with name "Entrar"
    const submitButton = screen.getAllByRole('button', { name: /entrar/i, exact: false })[1];
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByLabelText(/nome de usu[aá]rio/i)).toBeDisabled();
      expect(screen.getByLabelText(/senha de acesso/i)).toBeDisabled();
      // The submit button should be disabled
      expect(screen.getAllByRole('button', { name: /entrar/i, exact: false })[1]).toBeDisabled();
    });
  });
});