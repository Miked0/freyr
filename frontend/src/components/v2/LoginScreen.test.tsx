import { fireEvent, render, screen } from '@testing-library/react';
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
});

function stubHealth(googleLogin: boolean) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'OK', ai: 'keywords', googleLogin }), { status: 200 })));
}

describe('LoginScreen with Google', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('shows "Entrar com Google" when the server has it set up', async () => {
    stubHealth(true);
    render(<LoginScreen onSuccess={() => {}} />);

    expect(await screen.findByRole('link', { name: /entrar com google/i })).toHaveAttribute('href', '/api/auth/google');
  });

  it('tells new users that entering with Google accepts the terms', async () => {
    stubHealth(true);
    render(<LoginScreen onSuccess={() => {}} />);

    await screen.findByRole('link', { name: /entrar com google/i });
    expect(screen.getByText(/ao entrar com o google pela primeira vez, você concorda/i)).toBeInTheDocument();
  });

  it('hides the button when the server does not have it', async () => {
    stubHealth(false);
    render(<LoginScreen onSuccess={() => {}} />);

    await screen.findAllByRole('button', { name: 'Entrar' });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByRole('link', { name: /google/i })).toBeNull();
  });

  it('explains a failed Google login and clears it from the address', async () => {
    window.history.replaceState(null, '', '/?login=google-erro');
    stubHealth(true);
    render(<LoginScreen onSuccess={() => {}} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar com o Google');
    expect(window.location.search).toBe('');
  });
});
