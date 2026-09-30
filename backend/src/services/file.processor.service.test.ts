import { describe, it, expect } from 'vitest';
import { FileProcessorService } from './file.processor.service';

const processCsv = (content: string) =>
  new FileProcessorService().processFile(Buffer.from(content, 'utf8'), 'extrato.csv');

function buildPdf(lines: string[]): Buffer {
  const escape = (s: string) => s.replace(/[\\()]/g, m => `\\${m}`);
  const content = ['BT', '/F1 10 Tf', '14 TL', '40 800 Td', ...lines.map(l => `(${escape(l)}) '`), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const processPdf = (lines: string[]) =>
  new FileProcessorService().processFile(buildPdf(lines), 'extrato.pdf');

describe('FileProcessorService.processFile (PDF)', () => {
  it('extracts dated transactions from a text PDF statement', async () => {
    const expenses = await processPdf([
      'Extrato de conta corrente',
      '05/01/2026 PADARIA REAL 27,90',
      '07/01/2026 UBER TRIP 42,50',
    ]);

    expect(expenses.map(e => [e.date, e.amount, e.description])).toEqual([
      ['2026-01-05', 27.9, 'PADARIA REAL'],
      ['2026-01-07', 42.5, 'UBER TRIP'],
    ]);
  });

  it('reads credit card invoices with day/month dates, installments and payments', async () => {
    const expenses = await processPdf([
      'Fatura do cartao',
      'Periodo: 05/12 a 04/01/2027',
      '28/12 IFD*RESTAURANTE MADERO 120,00',
      '02/01 PAGAMENTO RECEBIDO - 1.500,00',
      '03/01 LOJA X (Parc 02/10) 89,90',
    ]);

    expect(expenses.map(e => [e.date, e.amount, e.description])).toEqual([
      ['2026-12-28', 120, 'IFD*RESTAURANTE MADERO'],
      ['2027-01-03', 89.9, 'LOJA X (Parc 02/10)'],
    ]);
  });
});

describe('FileProcessorService.processFile (PDF, fatura Inter)', () => {
  it('reads dates written with month names and includes credits marked with +', async () => {
    const expenses = await processPdf([
      'Vencimento 15/10/2026 R$ 1.234,56',
      '05 de set. 2026 PADARIA REAL - R$ 27,90',
      '06 de set. 2026 PAGAMENTO ON LINE - + R$ 500,00',
      '12 de dez. 2025 LOJA X (Parcela 10 de 10) - R$ 89,90',
      '20 de ago. 2026 IFD*RESTAURANTE - R$ 1.045,00',
    ]);

    expect(expenses.map(e => [e.date, e.amount, e.description, e.sign])).toEqual([
      ['2026-09-05', 27.9, 'PADARIA REAL', 'negative'],
      ['2026-09-06', 500, 'PAGAMENTO ON LINE', 'credit'],
      ['2025-12-12', 89.9, 'LOJA X (Parcela 10 de 10)', 'negative'],
      ['2026-08-20', 1045, 'IFD*RESTAURANTE', 'negative'],
    ]);
  });
});

describe('FileProcessorService.processFile (CSV)', () => {
  it('reads Brazilian bank exports with comma decimals and accented descriptions', async () => {
    const expenses = await processCsv(
      'DATA;VALOR;HISTORICO\n05/01/2026;-1.234,56;Padaria São João\n'
    );

    expect(expenses).toEqual([
      expect.objectContaining({ date: '2026-01-05', amount: 1234.56, description: 'Padaria São João' }),
    ]);
  });

  it('reads comma-separated exports with ISO dates and dot decimals', async () => {
    const expenses = await processCsv('date,amount,description\n2026-02-28,-89.90,Netflix\n');

    expect(expenses).toEqual([
      expect.objectContaining({ date: '2026-02-28', amount: 89.9, description: 'Netflix' }),
    ]);
  });
});
