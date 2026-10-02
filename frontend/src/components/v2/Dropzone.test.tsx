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

  it('follows the design system drop area: tag, title, hint and an outline button', () => {
    render(<Dropzone />);
    const area = screen.getByRole('region', { name: /envio de extrato/i });

    expect(area).toHaveClass('fr-drop');
    expect(area.querySelector('.fr-tag-muted')).toHaveTextContent('[ Importar ]');
    expect(area.querySelector('.fr-drop-title')).toHaveTextContent('Anexe ou arraste seu arquivo para iniciar a análise');
    expect(area.querySelector('.fr-drop-hint')).toHaveTextContent('Extratos PDF ou CSV · até 4 MB');
    expect(screen.getByRole('button', { name: /escolher arquivo/i })).toHaveClass('fr-btn', 'fr-btn-outline');
    expect(screen.queryByText(/colunas de data, valor e descrição/i)).toBeNull();
  });

  it('marks the area while a file is dragged over it', () => {
    render(<Dropzone />);
    const area = screen.getByRole('region', { name: /envio de extrato/i });

    fireEvent.dragOver(area);
    expect(area).toHaveClass('is-over');
    expect(area.querySelector('.fr-drop-title')).toHaveTextContent('Solte o arquivo aqui');
  });

  it('rejects a file that is not a PDF or CSV without uploading it', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<Dropzone />);

    fireEvent.change(screen.getByTestId('statement-input'), { target: { files: [new File(['x'], 'foto.png')] } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Formato não suportado');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('when the statement was already imported', () => {
    const answer = (upload: object) =>
      vi.fn(async (url: string) =>
        new Response(JSON.stringify(String(url).endsWith('/upload') ? upload : []), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    it('says the transactions were already saved instead of reporting an empty file', async () => {
      vi.stubGlobal('fetch', answer({
        success: true, expenses: [], duplicates: 3,
        message: 'Nenhuma transação nova em extrato.csv: 3 já estavam salvas e foram ignoradas.',
      }));
      const onComplete = vi.fn();
      render(<Dropzone onComplete={onComplete} />);

      fireEvent.change(screen.getByTestId('statement-input'), { target: { files: [statement()] } });

      expect(await screen.findByRole('status')).toHaveTextContent('3 já estavam salvas e foram ignoradas');
      expect(screen.queryByRole('alert')).toBeNull();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('imports the new transactions and tells how many repeated ones were skipped', async () => {
      vi.stubGlobal('fetch', answer({
        success: true,
        expenses: [{ id: 'e1', date: '2026-03-17', amount: 3000, description: 'SALARIO', category: 'Salário', type: 'income' }],
        duplicates: 2,
        message: '1 transação importada de extrato.csv; 2 já estavam salvas e foram ignoradas.',
      }));
      const onComplete = vi.fn();
      render(<Dropzone onComplete={onComplete} />);

      fireEvent.change(screen.getByTestId('statement-input'), { target: { files: [statement()] } });

      expect(await screen.findByRole('status')).toHaveTextContent('2 já estavam salvas');
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});
