import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DateInput from './DateInput';

describe('DateInput', () => {
  it('renders label and date input', () => {
    render(<DateInput label="Data de nascimento" placeholder="Selecione uma data" />);
    expect(screen.getByLabelText('Data de nascimento')).toBeInTheDocument();
    const input = screen.getByLabelText('Data de nascimento');
    expect(input).toHaveAttribute('type', 'date');
  });

  it('shows required asterisk when required', () => {
    render(<DateInput label="Data" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message and applies error styles', () => {
    render(<DateInput label="Data" error="Data inválida" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Data inválida');
    const input = screen.getByLabelText('Data');
    expect(input).toHaveClass('border-alert');
  });

  it('applies disabled styles and sets disabled attribute', () => {
    render(<DateInput label="Campo" disabled />);
    const input = screen.getByLabelText('Campo');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('opacity-45');
  });

  it('passes min and max props to input', () => {
    render(<DateInput label="Data" min="2024-01-01" max="2024-12-31" />);
    const input = screen.getByLabelText('Data');
    expect(input).toHaveAttribute('min', '2024-01-01');
    expect(input).toHaveAttribute('max', '2024-12-31');
  });

  it('shows helper text when no error', () => {
    render(<DateInput label="Campo" helperText="Formato: DD/MM/AAAA" />);
    expect(screen.getByText('Formato: DD/MM/AAAA')).toBeInTheDocument();
  });

  it('forwards onChange events', () => {
    const onChange = vi.fn();
    render(<DateInput label="Data" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2024-06-15' } });
    expect(onChange).toHaveBeenCalled();
  });
});