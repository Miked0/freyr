import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginScreen from './LoginScreen';

describe('LoginScreen', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks new users to accept the terms and the privacy policy', () => {
    render(<LoginScreen onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

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
    const cadastrar = within(group).getByRole('button', { name: 'Criar conta' });
    expect(entrar).toHaveAttribute('aria-pressed', 'true');
    expect(cadastrar).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(cadastrar);

    expect(cadastrar).toHaveAttribute('aria-pressed', 'true');
    expect(entrar).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the password rule visible while the new user types', () => {
    render(<LoginScreen onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(screen.getByLabelText('Criar senha')).toHaveAccessibleDescription('Mínimo de 8 caracteres.');
  });

  it('sells what the app does instead of a bare headline', () => {
    render(<LoginScreen onSuccess={() => {}} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Envie o extrato. O Freyr organiza o resto.');
    expect(screen.queryByText(/só seus/i)).not.toBeInTheDocument();
    const perks = within(screen.getByRole('list', { name: 'O que o Freyr faz por você' })).getAllByRole('listitem');
    expect(perks).toHaveLength(3);
  });

  it('invites new users with a call to action of its own', () => {
    render(<LoginScreen onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(screen.getByRole('button', { name: 'Começar agora' })).toHaveAttribute('type', 'submit');
  });

  it('draws the sky behind the panel without announcing it', () => {
    const { container } = render(<LoginScreen onSuccess={() => {}} />);
    expect(container.querySelector('.fr-sky-layer')).toHaveAttribute('aria-hidden', 'true');
  });
});
