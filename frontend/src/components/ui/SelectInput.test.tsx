import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectInput from './SelectInput';

const options = [
  { value: 'a', label: 'Opção A' },
  { value: 'b', label: 'Opção B' },
  { value: 'c', label: 'Opção C', disabled: true },
];

describe('SelectInput', () => {
  it('renders label and select with options', () => {
    render(<SelectInput label="Categoria" options={options} placeholder="Selecione" />);
    expect(screen.getByLabelText('Categoria')).toBeInTheDocument();
    const select = screen.getByLabelText('Categoria');
    expect(screen.getByText('Selecione')).toBeInTheDocument();
    expect(screen.getByText('Opção A')).toBeInTheDocument();
    expect(screen.getByText('Opção B')).toBeInTheDocument();
    expect(screen.getByText('Opção C')).toBeInTheDocument();
  });

  it('shows required asterisk when required', () => {
    render(<SelectInput label="Campo" options={options} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message and applies error styles', () => {
    render(<SelectInput label="Campo" options={options} error="Selecione uma opção" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione uma opção');
    const select = screen.getByLabelText('Campo');
    expect(select).toHaveClass('border-danger');
  });

  it('applies disabled styles and sets disabled attribute', () => {
    render(<SelectInput label="Campo" options={options} disabled />);
    const select = screen.getByLabelText('Campo');
    expect(select).toBeDisabled();
    expect(select).toHaveClass('opacity-45');
  });

  it('shows helper text when no error', () => {
    render(<SelectInput label="Campo" options={options} helperText="Escolha uma" />);
    expect(screen.getByText('Escolha uma')).toBeInTheDocument();
  });

  it('does not show helper text when error is present', () => {
    render(<SelectInput label="Campo" options={options} error="Erro" helperText="Dica" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Erro');
    expect(screen.queryByText('Dica')).not.toBeInTheDocument();
  });

  it('forwards onChange events', () => {
    const onChange = vi.fn();
    render(<SelectInput label="Campo" options={options} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Campo'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('disables individual options when specified', () => {
    render(<SelectInput label="Campo" options={options} />);
    const optionC = screen.getByText('Opção C').closest('option');
    expect(optionC).toBeDisabled();
  });
});