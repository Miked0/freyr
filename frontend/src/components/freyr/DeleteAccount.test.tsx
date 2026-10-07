import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeleteAccount } from './DeleteAccount';

function stubDelete(status: number, body: object) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('DeleteAccount', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('links to the privacy documents', () => {
    render(<DeleteAccount onDeleted={() => {}} />);

    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '#/privacidade');
    expect(screen.getByRole('link', { name: 'Seus direitos (LGPD)' })).toHaveAttribute('href', '#/lgpd');
  });

  it('keeps the delete form folded until it is asked for', () => {
    render(<DeleteAccount onDeleted={() => {}} />);
    const toggle = screen.getByRole('button', { name: 'Excluir conta' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Confirme com sua senha')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Confirme com sua senha')).toBeInTheDocument();
  });

  it('deletes the account only after the password is typed', async () => {
    const fetchMock = stubDelete(200, { deleted: true });
    const onDeleted = vi.fn();
    render(<DeleteAccount onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta' }));
    const button = screen.getByRole('button', { name: 'Excluir minha conta' });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Confirme com sua senha'), { target: { value: 'minha-senha' } });
    fireEvent.click(button);

    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/auth\/account$/);
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(String(init.body))).toEqual({ password: 'minha-senha' });
  });

  it('keeps the account and says why when the password is wrong', async () => {
    stubDelete(401, { error: 'Senha incorreta.' });
    const onDeleted = vi.fn();
    render(<DeleteAccount onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta' }));

    fireEvent.change(screen.getByLabelText('Confirme com sua senha'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta.');
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('asks a Google-only account to type its username instead of a password', async () => {
    const fetchMock = stubDelete(200, { deleted: true });
    const onDeleted = vi.fn();
    render(<DeleteAccount onDeleted={onDeleted} username="mike.silva" />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta' }));
    expect(screen.queryByLabelText('Confirme com sua senha')).toBeNull();
    const button = screen.getByRole('button', { name: 'Excluir minha conta' });

    fireEvent.change(screen.getByLabelText('Digite mike.silva para confirmar'), { target: { value: 'mike' } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Digite mike.silva para confirmar'), { target: { value: 'mike.silva' } });
    fireEvent.click(button);

    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ username: 'mike.silva' });
  });
});
