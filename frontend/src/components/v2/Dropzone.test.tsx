import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dropzone from './Dropzone';

const statement = () => new File(['date,amount,description\n15/03/2026,-10.00,UBER'], 'extrato.csv', { type: 'text/csv' });

describe('Dropzone', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows progress and ignores a second file while a statement is being imported', async () => {
    // The upload never answers, so the component stays mid-import.
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    render(<Dropzone />);
    const area = screen.getByRole('region', { name: /envio de extrato/i });

    fireEvent.drop(area, { dataTransfer: { files: [statement()] } });
    fireEvent.drop(area, { dataTransfer: { files: [statement()] } });

    expect(await screen.findByText(/importando extrato\.csv/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /escolher arquivo/i })).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/upload'))).toHaveLength(1);
  });
});
