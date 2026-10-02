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
