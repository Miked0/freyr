import { describe, it, expect } from 'vitest';
import { FileProcessorService, isInvoicePayment } from './file.processor.service';
import { isBalanceLine } from './balance-line';

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
  it('reads dates written with month names and keeps refunds marked with + as refunds, not income', async () => {
    const expenses = await processPdf([
      'Vencimento 15/10/2026 R$ 1.234,56',
      '05 de set. 2026 PADARIA REAL - R$ 27,90',
      '06 de set. 2026 ESTORNO LOJA Y - + R$ 50,00',
      '12 de dez. 2025 LOJA X (Parcela 10 de 10) - R$ 89,90',
      '20 de ago. 2026 IFD*RESTAURANTE - R$ 1.045,00',
    ]);

    expect(expenses.map(e => [e.date, e.amount, e.description, e.sign])).toEqual([
      ['2026-09-05', 27.9, 'PADARIA REAL', 'negative'],
      ['2026-09-06', 50, 'ESTORNO LOJA Y', 'refund'],
      ['2025-12-12', 89.9, 'LOJA X (Parcela 10 de 10)', 'negative'],
      ['2026-08-20', 1045, 'IFD*RESTAURANTE', 'negative'],
    ]);
  });

  it('reads the Inter layout with tab-separated columns, installments and purchases from past years', async () => {
    const expenses = await processPdf([
      'Vencimento 20/10/2026',
      '15 de jul. 2026 OTICA X (Parcela 03 de 06)\t-\tR$ 310,00',
      '06 de dez. 2025 CURSO Y (Parcela 09 de 12)\t-\tR$ 64,50',
      '10 de set. 2026 STREAMING Z\t-\tR$ 19,90',
      'CURSO Y (Parcela 10 de 12) R$ 64,50',
    ]);

    expect(expenses.map(e => [e.date, e.amount, e.description])).toEqual([
      ['2026-07-15', 310, 'OTICA X (Parcela 03 de 06)'],
      ['2025-12-06', 64.5, 'CURSO Y (Parcela 09 de 12)'],
      ['2026-09-10', 19.9, 'STREAMING Z'],
    ]);
  });

  it('leaves out payments of the invoice itself, which are not income', async () => {
    const expenses = await processPdf([
      'Vencimento 15/10/2026',
      '05 de set. 2026 PADARIA REAL - R$ 27,90',
      '06 de set. 2026 PAGAMENTO ON LINE - + R$ 500,00',
      '07 de set. 2026 PAGAMENTO EFETUADO - + R$ 100,00',
      '08 de set. 2026 PAGTO DEBITO AUTOMATICO - + R$ 80,00',
      '09 de set. 2026 PAGAMENTO FATURA - + R$ 70,00',
      '10 de set. 2026 Pagamento recebido - + R$ 60,00',
      '11 de set. 2026 REEMBOLSO COMPRA - + R$ 20,00',
    ]);

    expect(expenses.map(e => [e.description, e.sign])).toEqual([
      ['PADARIA REAL', 'negative'],
      ['REEMBOLSO COMPRA', 'refund'],
    ]);
  });
});

describe('FileProcessorService.processFile (PDF, extrato de conta Inter)', () => {
  // Days are headers ("3 de Setembro de 2026 Saldo do dia: ..."); each line below has the amount and the running balance.
  const statement = [
    'Período: 02/09/2026 a 02/10/2026',
    'Saldo total',
    'R$ 485,59',
    'Valor \tSaldo por transação\t3 de Setembro de 2026 Saldo do dia: R$ 64,86',
    'Estorno: "CDB Porq Obj FULANO" \tR$ 64,86 \tR$ 129,72',
    'Pagamento efetuado: "Pagamento fatura cartao Inter" \t-R$ 545,75 \t-R$ 416,03',
    'Pix enviado: "Cp :60701190-Fulano de Tal" \t-R$ 407,55 \t-R$ 823,58',
    '4 de Setembro de 2026 Saldo do dia: R$ 64,86',
    'Pix recebido: "Cp :60701190-CICLANA" \tR$ 1.124,00 \tR$ 93,86',
    'Compra no debito: "No estabelecimento MP *ADEGAR7" \t-R$ 29,00 \tR$ 64,86',
    'Fale com a gente',
    'SAC: 0800 940 9999 (opção 09)',
  ];

  it('reads each transaction under its day header, taking the amount and not the running balance, without invoice payments or CDB', async () => {
    const expenses = await processPdf(statement);

    expect(expenses.map(e => [e.date, e.amount, e.sign, e.description])).toEqual([
      ['2026-09-03', 407.55, 'negative', 'Pix enviado - Fulano de Tal'],
      ['2026-09-04', 1124, 'credit', 'Pix recebido - CICLANA'],
      ['2026-09-04', 29, 'negative', 'Compra no debito - MP *ADEGAR7'],
    ]);
  });
});

describe('isInvoicePayment', () => {
  it.each([
    ['PAGAMENTO ON LINE', true],
    ['PAGAMENTO ONLINE', true],
    ['PAGAMENTO EFETUADO', true],
    ['PAGTO DEBITO AUTOMATICO', true],
    ['PGTO FATURA CARTAO', true],
    ['Pagamento recebido', true],
    ['PAGAMENTO', true],
    ['PAGAMENTO SALARIO EMPRESA', false],
    ['ESTORNO PAGAMENTO DUPLICADO', false],
    ['PIX RECEBIDO', false],
  ])('%s -> %s', (description, expected) => {
    expect(isInvoicePayment(description)).toBe(expected);
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

  it('leaves out credits that pay the card invoice', async () => {
    const expenses = await processCsv('date,amount,description\n2026-02-28,+500.00,PAGAMENTO EFETUADO\n2026-03-01,+40.00,ESTORNO LOJA\n');

    expect(expenses.map(e => e.description)).toEqual(['ESTORNO LOJA']);
  });
  it('reads the Inter account export, skipping the summary lines above the table', async () => {
    const expenses = await processCsv(
      'Extrato Conta Corrente \n' +
      'Conta ;313652376\n' +
      'Período ;02/09/2026 a 02/10/2026\n' +
      'Saldo ;485,59\n' +
      '\n' +
      'Data Lançamento;Histórico;Descrição;Valor;Saldo\n' +
      '01/10/2026;Compra no débito;Mercadoimperio        Sao Paulo    Bra;-1,00;485,59\n' +
      '30/09/2026;Pix recebido;Fulano de Tal;1.528,00;578,59\n' +
      '28/09/2026;Pix enviado ;Ciclana;-82,00;0,59\n'
    );

    expect(expenses.map(e => [e.date, e.amount, e.sign, e.description])).toEqual([
      ['2026-10-01', 1, 'negative', 'Compra no débito - Mercadoimperio Sao Paulo Bra'],
      ['2026-09-30', 1528, 'credit', 'Pix recebido - Fulano de Tal'],
      ['2026-09-28', 82, 'negative', 'Pix enviado - Ciclana'],
    ]);
  });

  it('leaves out invoice payments and investment moves, which are not spending or income', async () => {
    const expenses = await processCsv(
      'Data Lançamento;Histórico;Descrição;Valor;Saldo\n' +
      '26/09/2026;Pagamento efetuado;Pagamento Fatura;-81,90;10,00\n' +
      '25/09/2026;Aplicação;Cdb Porquinho Banco Inter S A;-750,00;91,90\n' +
      '24/09/2026;Resgate;Cdb Porq Obj Banco Inter S A;9,20;841,90\n' +
      '23/09/2026;Débito Tesouro Direto;Compra Td 107026970;-22,34;832,70\n' +
      '22/09/2026;Estorno;Cdb Porq Obj Fulano;64,86;855,04\n' +
      '22/09/2026;Estorno;Aplicação;64,86;790,18\n' +
      '21/09/2026;Compra no débito;Padaria Real;-5,99;790,18\n' +
      '20/09/2026;Estorno;Loja X;12,00;796,17\n'
    );

    expect(expenses.map(e => e.description)).toEqual(['Compra no débito - Padaria Real', 'Estorno - Loja X']);
  });

  it('reads card invoices with unsigned purchases, keeping negative lines as refunds', async () => {
    const expenses = await processCsv(
      'date,description,amount\n' +
      '2026-09-01,Padaria Real,27.90\n' +
      '2026-09-02,Loja X,120.00\n' +
      '2026-09-03,Estorno Loja X,-120.00\n' +
      '2026-09-04,Pagamento recebido,-500.00\n'
    );

    expect(expenses.map(e => [e.description, e.amount, e.sign])).toEqual([
      ['Padaria Real', 27.9, 'none'],
      ['Loja X', 120, 'none'],
      ['Estorno Loja X', 120, 'refund'],
    ]);
  });

  it('says which columns it needs when it cannot find the table header', async () => {
    await expect(processCsv('foo;bar\n1;2\n')).rejects.toThrow(/data.*descrição.*valor/i);
  });
});

describe('isBalanceLine', () => {
  it.each([
    'SALDO DO DIA',
    'Saldo do dia',
    'SALDO ANTERIOR',
    'Saldo Anterior',
    'SALDO FINAL',
    'SALDO INICIAL',
    'SALDO DISPONÍVEL',
    'Saldo disponivel',
    'SALDO ATUAL',
    'SALDO TOTAL',
    'SALDO EM C/C',
    'SALDO EM CONTA CORRENTE',
    'SALDO BLOQUEADO',
    'SALDO PARCIAL',
    'SALDO LIQUIDO',
    'SALDO DIA',
    'SALDO',
    'Saldo',
    'S A L D O',
    'S A L D O ANTERIOR',
    'SDO CTA/APL AUTOMATICAS',
    'SDO CTA ANT',
    'SALDO APLIC AUT MAIS',
    '000000 SALDO DIA',
    'Pix enviado - Saldo do dia',
    'LIMITE DISPONIVEL',
    'Opening balance',
    'Closing balance',
  ])('%s é linha de saldo', description => {
    expect(isBalanceLine(description)).toBe(true);
  });

  it.each([
    'PADARIA REAL',
    'Pix enviado - Fulano de Tal',
    'Pix recebido - Saldanha Marinho',
    'SALDANHA MOVEIS',
    'TOTAL PASS',
    'PAGAMENTO EFETUADO',
    'Compra no débito - Posto Saldo Bom',
    'TRANSFERENCIA DE SALDO PARA POUPANCA',
    'ASSINATURA SPOTIFY',
  ])('%s não é linha de saldo', description => {
    expect(isBalanceLine(description)).toBe(false);
  });
});

describe('FileProcessorService.processFile ignora linhas de saldo', () => {
  it('não importa saldo do dia, anterior ou final de um extrato em PDF, nem deixa eles virarem o sinal das despesas', async () => {
    // Daily balances are unsigned; counted as transactions they would outvote the negative debits.
    const expenses = await processPdf([
      'Extrato de conta corrente',
      '01/09/2026 SALDO ANTERIOR 200,00',
      '02/09/2026 PIX ENVIADO FULANO -50,00',
      '02/09/2026 SALDO DO DIA 150,00',
      '03/09/2026 PIX RECEBIDO CICLANA +300,00',
      '03/09/2026 SALDO DO DIA 450,00',
      '04/09/2026 S A L D O 450,00',
      '05/09/2026 SALDO DISPONIVEL 450,00',
      '06/09/2026 COMPRA CARTAO PADARIA -20,00',
      '06/09/2026 SALDO FINAL 430,00',
    ]);

    expect(expenses.map(e => [e.date, e.amount, e.sign, e.description])).toEqual([
      ['2026-09-02', 50, 'negative', 'PIX ENVIADO FULANO'],
      ['2026-09-03', 300, 'credit', 'PIX RECEBIDO CICLANA'],
      ['2026-09-06', 20, 'negative', 'COMPRA CARTAO PADARIA'],
    ]);
  });

  it('não importa a linha de saldo com data por extenso nem com número de documento antes', async () => {
    const expenses = await processPdf([
      'Extrato',
      '02 de set. 2026 PIX ENVIADO FULANO -R$ 50,00',
      '02 de set. 2026 SALDO DO DIA R$ 150,00',
      '03/09/2026 000000 SALDO DIA 150,00',
      '04/09/2026 123456 SDO CTA/APL AUTOMATICAS 150,00',
    ]);

    expect(expenses.map(e => e.description)).toEqual(['PIX ENVIADO FULANO']);
  });

  it('usa o valor do lançamento, e não o saldo, quando o PDF tem uma coluna de saldo', async () => {
    const expenses = await processPdf([
      'Extrato de conta corrente',
      'Data Histórico Valor Saldo',
      '01/09/2026 Saldo Anterior 1.234,56',
      '02/09/2026 Pix - Enviado Fulano -50,00 1.184,56',
      '02/09/2026 Compra com Cartão Padaria -34,56 1.150,00',
      '03/09/2026 Pix - Recebido Ciclana +100,00',
      '03/09/2026 Tarifa pacote -10,00 1.240,00',
      '03/09/2026 S A L D O 1.240,00',
    ]);

    expect(expenses.map(e => [e.date, e.amount, e.sign, e.description])).toEqual([
      ['2026-09-02', 50, 'negative', 'Pix - Enviado Fulano'],
      ['2026-09-02', 34.56, 'negative', 'Compra com Cartão Padaria'],
      ['2026-09-03', 100, 'credit', 'Pix - Recebido Ciclana'],
      ['2026-09-03', 10, 'negative', 'Tarifa pacote'],
    ]);
  });

  it('não importa uma linha de saldo dentro de um dia do extrato Inter em PDF', async () => {
    const expenses = await processPdf([
      '3 de Setembro de 2026 Saldo do dia: R$ 64,86',
      'Pix enviado: "Cp :60701190-Fulano de Tal" \t-R$ 10,00 \tR$ 54,86',
      'Saldo do dia: \tR$ 54,86 \tR$ 54,86',
      'Saldo anterior \tR$ 64,86 \tR$ 64,86',
    ]);

    expect(expenses.map(e => e.description)).toEqual(['Pix enviado - Fulano de Tal']);
  });

  it('não importa linhas de saldo de um CSV, nem deixa elas virarem o sinal das despesas', async () => {
    // Banco do Brasil style: balance rows sit in the same column as transactions, unsigned.
    const expenses = await processCsv(
      '"Data","Lançamento","Detalhes","N° documento","Valor","Tipo Lançamento"\n' +
      '"31/08/2026","Saldo Anterior","","","200,00",""\n' +
      '"01/09/2026","Pix - Enviado","Fulano","1","-50,00","Saída"\n' +
      '"01/09/2026","Saldo do dia","","","150,00",""\n' +
      '"02/09/2026","Pix - Enviado","Ciclana","2","-20,00","Saída"\n' +
      '"02/09/2026","Saldo do dia","","","130,00",""\n' +
      '"03/09/2026","S A L D O","","","130,00",""\n' +
      '"00/00/0000","Saldo Final","","","130,00",""\n'
    );

    expect(expenses.map(e => [e.date, e.amount, e.sign, e.description])).toEqual([
      ['2026-09-01', 50, 'negative', 'Pix - Enviado'],
      ['2026-09-02', 20, 'negative', 'Pix - Enviado'],
    ]);
  });

  it('não importa a linha de saldo quando o nome dela vem na coluna de histórico do Inter', async () => {
    const expenses = await processCsv(
      'Data Lançamento;Histórico;Descrição;Valor;Saldo\n' +
      '02/09/2026;Saldo do dia;;485,59;485,59\n' +
      '01/09/2026;Pix recebido;Fulano de Tal;100,00;485,59\n' +
      '31/08/2026;Saldo Anterior;;385,59;385,59\n'
    );

    expect(expenses.map(e => e.description)).toEqual(['Pix recebido - Fulano de Tal']);
  });
});
