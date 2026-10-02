import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('shows the crumb, title and phrase', () => {
    render(<PageHeader phrase="Setembro rendeu mais do que saiu. Boa colheita." />);
    expect(screen.getByText('Visão geral', { selector: 'b' }).parentElement).toHaveTextContent('Finanças / Visão geral');
    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral financeira' })).toBeInTheDocument();
    expect(screen.getByText('Setembro rendeu mais do que saiu. Boa colheita.')).toBeInTheDocument();
  });

  it('wires export and import, with import as the only primary action', () => {
    const onExport = vi.fn();
    const onImport = vi.fn();
    render(<PageHeader phrase="x" periodLabel="Setembro 2026" onExport={onExport} onImport={onImport} />);
    const exportBtn = screen.getByRole('button', { name: 'Exportar' });
    const importBtn = screen.getByRole('button', { name: 'Importar extrato' });
    expect(exportBtn).toHaveClass('fr-btn-outline');
    expect(importBtn).toHaveClass('fr-btn-primary');
    expect(document.querySelectorAll('.fr-btn-primary')).toHaveLength(1);
    fireEvent.click(exportBtn);
    fireEvent.click(importBtn);
    expect(onExport).toHaveBeenCalledOnce();
    expect(onImport).toHaveBeenCalledOnce();
  });

  it('shows the period as an outline label that is not a control', () => {
    render(<PageHeader phrase="x" periodLabel="Setembro 2026" />);
    const period = screen.getByText('Setembro 2026');
    expect(period).toHaveClass('fr-btn', 'fr-btn-outline');
    expect(screen.queryByRole('button', { name: /Setembro 2026/ })).not.toBeInTheDocument();
  });

  it('hides the period when there is none', () => {
    render(<PageHeader phrase="Envie um extrato para começar." onImport={() => {}} />);
    expect(document.querySelector('.fr-btn-outline .fr-icon')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Exportar' })).not.toBeInTheDocument();
  });
});
