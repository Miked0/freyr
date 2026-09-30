import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TextInput from './TextInput';

describe('TextInput', () => {
  it('renders label and input', () => {
    render(<TextInput label="Nome" placeholder="Digite seu nome" />);
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite seu nome')).toBeInTheDocument();
  });

  it('shows required asterisk when required', () => {
    render(<TextInput label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message and applies error styles', () => {
    render(<TextInput label="Senha" error="Senha muito curta" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Senha muito curta');
    const input = screen.getByLabelText('Senha');
    expect(input).toHaveClass('border-danger');
  });

  it('applies disabled styles and sets disabled attribute', () => {
    render(<TextInput label="Campo" disabled />);
    const input = screen.getByLabelText('Campo');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('opacity-45');
  });

  it('shows helper text when no error', () => {
    render(<TextInput label="Campo" helperText="Dica útil" />);
    expect(screen.getByText('Dica útil')).toBeInTheDocument();
  });

  it('does not show helper text when error is present', () => {
    render(<TextInput label="Campo" error="Erro" helperText="Dica" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Erro');
    expect(screen.queryByText('Dica')).not.toBeInTheDocument();
  });

  it('forwards ref and passes through props', () => {
    const onChange = vi.fn();
    render(<TextInput label="Teste" onChange={onChange} data-testid="custom" />);
    fireEvent.change(screen.getByLabelText('Teste'), { target: { value: 'abc' } });
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('shows leftIcon when provided', () => {
    render(<TextInput label="Teste" leftIcon={<span data-testid="icon">★</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});