import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginScreen from './LoginScreen';

describe('LoginScreen', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks new users to accept the terms and the privacy policy', () => {
    render(<LoginScreen onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(screen.getByText(/ao criar a conta, você concorda/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '#/termos');
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '#/privacidade');
  });

  it('links the privacy policy from the sign-in screen too', () => {
    render(<LoginScreen onSuccess={() => {}} />);

    expect(screen.getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '#/privacidade');
  });

  it('groups Entrar and Cadastrar as one switch that says which is on', () => {
    render(<LoginScreen onSuccess={() => {}} />);
    const group = screen.getByRole('group', { name: 'Entrar ou criar conta' });
    const entrar = within(group).getByRole('button', { name: 'Entrar' });
    const cadastrar = within(group).getByRole('button', { name: 'Cadastrar' });
    expect(entrar).toHaveAttribute('aria-pressed', 'true');
    expect(cadastrar).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(cadastrar);

    expect(cadastrar).toHaveAttribute('aria-pressed', 'true');
    expect(entrar).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the password rule visible while the new user types', () => {
    render(<LoginScreen onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(screen.getByLabelText('Criar senha')).toHaveAccessibleDescription('Mínimo de 8 caracteres.');
  });
});
