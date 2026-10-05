import { parse } from 'csv-parse/sync';
import { PDFParse } from 'pdf-parse';
import { getPath } from 'pdf-parse/worker';
import path from 'path';
import { isBalanceLine } from './balance-line';

// Explicit worker path so serverless bundlers (Vercel) ship the pdf.js worker file.
PDFParse.setWorker(getPath());

/** 'refund' is money a card invoice gives back (estorno, cashback, cancelled purchase): less spending, not income. */
export type Sign = 'negative' | 'credit' | 'none' | 'refund';

/** A problem with the uploaded statement itself; its message is safe to show the user. */
export class StatementError extends Error {}

export interface ParsedTransaction {
  date: string;
  amount: number;
  description: string;
  rawDescription: string;
  sourceFile: string;
  sign: Sign;
}

// "PAGAMENTO ON LINE", "PAGTO DEBITO AUTOMATICO", "Pagamento recebido"... The purchases it settles are already
// on the invoice, so counting the payment as income would inflate it; a refund ("ESTORNO") is not matched.
const INVOICE_PAYMENT = /^(pagamento|pagto|pgto)\.?(\s+(on\s?line|efetuado|recebido|(de |da )?fatura|cartao|deb(ito)?\.?\s*aut\w*|boleto|obrigado|em\b.*)|\s*$)/;

/** Whether a credit line is the card holder paying the invoice itself rather than a refund or income. */
export function isInvoicePayment(description: string): boolean {
  const text = description.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
  return INVOICE_PAYMENT.test(text);
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const INTER_DAY_HEADER = /(\d{1,2}) de ([a-zç]+) de (\d{4})\s+Saldo do dia/i;

const CSV_DATE = ['date', 'data', 'data lancamento', 'data da transacao', 'data movimento'];
const CSV_AMOUNT = ['amount', 'valor', 'valor (r$)'];
// Inter splits the label in two: "Histórico" (Pix enviado) and "Descrição" (who); both are kept, in this order.
const CSV_DESCRIPTION = ['historico', 'description', 'descricao', 'lancamento'];

const normalizeHeader = (cell: string) =>
  cell.normalize('NFD').replace(/\p{M}/gu, '').replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function splitCsvHeader(line: string): string[] {
  return line.split(line.includes(';') ? ';' : ',').map(normalizeHeader);
}

/** Positions of the date, amount and description columns, or null when the line is not the table header. */
function findCsvColumns(header: string[]) {
  const date = header.findIndex(h => CSV_DATE.includes(h));
  const amount = header.findIndex(h => CSV_AMOUNT.includes(h));
  const description = CSV_DESCRIPTION.map(name => header.indexOf(name)).filter(i => i !== -1);
  if (date === -1 || amount === -1 || description.length === 0) return null;
  return { date, amount, description, hasBalance: header.includes('saldo') };
}

// Paying the card invoice from the account: the purchases it settles come in with the invoice itself.
const INVOICE_PAYMENT_MOVE = /pagamento.*\bfatura\b/;

// Applying or redeeming investments (CDB, caixinha, Tesouro Direto, ações): the money stays the holder's.
const INVESTMENT_MOVE =
  /(^|- )(aplicacao|resgate)\b|tesouro direto|\b(cdb|lci|lca|caixinha|porquinho|acoes|corretora)\b|\bcompra td\b/;

const foldText = (description: string) => description.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Whether an account statement line applies or redeems an investment instead of spending or receiving money. */
export function isInvestmentMove(description: string): boolean {
  return INVESTMENT_MOVE.test(foldText(description));
}

export class FileProcessorService {
  /**
   * Process uploaded file based on its extension
   */
  async processFile(content: Buffer, originalName: string): Promise<ParsedTransaction[]> {
    const ext = path.extname(originalName).toLowerCase();
    
    let transactions: ParsedTransaction[];
    switch (ext) {
      case '.csv':
        transactions = await this.processCsv(content, originalName);
        break;
      case '.pdf':
        transactions = await this.processPdf(content, originalName);
        break;
      default:
        throw new StatementError(`Unsupported file format: ${ext}`);
    }
    return transactions.filter(t => !INVOICE_PAYMENT_MOVE.test(foldText(t.description)) && !isBalanceLine(t.description));
  }

  /**
   * Process CSV file
   */
  private async processCsv(content: Buffer, originalName: string): Promise<ParsedTransaction[]> {
    // Bank exports (Inter) put account, period and balance lines above the table; the table starts at its header.
    const lines = content.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
    const headerIndex = lines.findIndex(line => findCsvColumns(splitCsvHeader(line)) !== null);
    if (headerIndex === -1) {
      throw new StatementError('Não encontramos a tabela de lançamentos no CSV. Ele precisa ter colunas de data, descrição e valor.');
    }
    const headerLine = lines[headerIndex];
    const header = splitCsvHeader(headerLine);
    const columns = findCsvColumns(header)!;
    const rows: string[][] = parse(lines.slice(headerIndex + 1).join('\n'), {
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      delimiter: headerLine.includes(';') ? ';' : ','
    });

    const parsed = rows
      .filter(row => row[columns.date] && row[columns.amount])
      .filter(row => !isBalanceLine(columns.description.map(i => row[i]).filter(Boolean).join(' - ')))
      .map(row => {
        const raw = columns.description.map(i => row[i]).filter(Boolean).join(' - ');
        return {
          date: this.normalizeDate(row[columns.date]),
          amount: Math.abs(this.parseAmount(row[columns.amount])),
          description: this.cleanDescription(raw),
          rawDescription: raw,
          sourceFile: originalName,
          sign: this.detectSign(row[columns.amount])
        };
      });

    // A running balance column, or mostly negative values, means an account statement: what is not negative came in.
    const negatives = parsed.filter(t => t.sign === 'negative').length;
    const unsigned = parsed.filter(t => t.sign === 'none').length;
    const unsignedIsCredit = columns.hasBalance || negatives > unsigned;

    // Unsigned purchases without that are a card invoice, where anything signed gives money back.
    const resign = (sign: Sign): Sign => {
      if (unsignedIsCredit) return sign === 'none' ? 'credit' : sign;
      if (unsigned > 0) return sign === 'none' ? 'none' : 'refund';
      return sign;
    };

    return parsed
      .map(t => ({ ...t, sign: resign(t.sign) }))
      .filter(t => t.amount > 0 && !(t.sign !== 'negative' && t.sign !== 'none' && isInvoicePayment(t.description)));
  }

  /**
   * Process PDF file
   */
  private async processPdf(content: Buffer, originalName: string): Promise<ParsedTransaction[]> {
    const parser = new PDFParse({ data: new Uint8Array(content) });
    let text: string;
    try {
      text = (await parser.getText()).text;
    } catch {
      throw new StatementError('Não foi possível ler o PDF. Ele pode estar protegido por senha ou corrompido.');
    } finally {
      await parser.destroy();
    }

    if (INTER_DAY_HEADER.test(text)) return this.parseInterAccountPdf(text, originalName);

    // Heuristic parsing; bank-specific layouts may need dedicated parsers.
    const lines = text.split('\n');

    const anyFullDate = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/g;
    const fullDatePattern = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/;
    const dayMonthPattern = /^(\d{2})[\/\-](\d{2})(?![\/\-]\d)/;
    const monthNamePattern = /^(\d{1,2})\s+de\s+([a-zç]{3})[a-zç]*\.?\s+(\d{4})/i;
    // "- R$ 10,00" is an empty column (Inter); "-10,00" / "- 10,00" / "-R$" / "- R$" are negative; "+" marks a credit.
    const amountPattern = /(?:(-\s*(?=\d|R\$))|(\+\s*))?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2})/g;

    // Statements that only print DD/MM carry the year elsewhere (period/closing/due date).
    const fullDates = [...text.matchAll(anyFullDate)]
      .map(m => ({ year: Number(m[3]), month: Number(m[2]), day: Number(m[1]) }))
      .filter(d => d.month >= 1 && d.month <= 12)
      .sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day);
    const reference = fullDates[fullDates.length - 1] ?? { year: new Date().getFullYear(), month: 12 };

    // A table header with a balance column ("Data Histórico Valor Saldo") means the last value on a line may be the
    // running balance; the amount is then the one before it.
    const hasBalanceColumn = lines.some(line => {
      const header = line.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      return !/\d/.test(header) && /\bvalor\b/.test(header) && /\bsaldo\b/.test(header);
    });

    const transactions: { date: string; amount: number; sign: Sign; description: string; raw: string }[] = [];
    const pad = (n: number | string) => String(n).padStart(2, '0');

    for (const line of lines) {
      const trimmed = line.trim();
      let date: string;
      let rest: string;

      const full = trimmed.match(fullDatePattern);
      const dayMonth = trimmed.match(dayMonthPattern);
      const monthName = trimmed.match(monthNamePattern);
      if (monthName) {
        const month = MONTHS.indexOf(monthName[2].toLowerCase()) + 1;
        if (month === 0) continue;
        date = `${monthName[3]}-${pad(month)}-${pad(monthName[1])}`;
        rest = trimmed.slice(monthName[0].length);
      } else if (full) {
        date = this.normalizeDate(full[0]);
        rest = trimmed.slice(full[0].length);
      } else if (dayMonth) {
        const month = Number(dayMonth[2]);
        if (month < 1 || month > 12) continue;
        const year = month > reference.month ? reference.year - 1 : reference.year;
        date = `${year}-${dayMonth[2]}-${dayMonth[1]}`;
        rest = trimmed.slice(dayMonth[0].length);
      } else {
        continue;
      }

      const amounts = [...rest.matchAll(amountPattern)];
      const last = amounts[amounts.length - (hasBalanceColumn && amounts.length >= 2 ? 2 : 1)];
      if (!last || last.index === undefined) continue;

      const amount = this.parseAmount(last[3]);
      const beforeAmount = rest.slice(0, last.index);
      const columns = beforeAmount.split('\t').map(c => c.trim()).filter(Boolean);
      const description = this.cleanDescription(columns.length > 1 ? columns[0] : beforeAmount);
      // Left out before the sign vote below: unsigned daily balances would outvote the real debits.
      if (amount <= 0 || !description || isBalanceLine(description)) continue;

      const sign: Sign = last[1] ? 'negative' : last[2] ? 'credit' : 'none';
      transactions.push({ date, amount, sign, description, raw: trimmed });
    }

    // Bank statements list debits as negatives; card invoices list purchases unsigned
    // and payments/refunds with a sign. Credits stay out of the vote: an invoice with
    // several payments and few purchases must not lose its purchases.
    const negatives = transactions.filter(t => t.sign === 'negative').length;
    const unsigned = transactions.filter(t => t.sign === 'none').length;
    const expenseSign: Sign = negatives > unsigned ? 'negative' : 'none';

    // On a card invoice, credits that are not the invoice payment are refunds, never income.
    const isInvoice = /\b(vencimento|fatura)\b/i.test(text);

    return transactions
      .filter(t => t.sign === expenseSign || (t.sign === 'credit' && !isInvoicePayment(t.description)))
      .map(t => ({
        date: t.date,
        amount: t.amount,
        description: t.description,
        rawDescription: t.raw,
        sourceFile: originalName,
        sign: isInvoice && t.sign === 'credit' ? 'refund' : t.sign
      }));
  }

  /**
   * Inter account statement: each day is a header ("3 de Setembro de 2026 Saldo do dia: R$ 64,86") and each
   * transaction below it reads 'Pix enviado: "Fulano" \t-R$ 10,00 \tR$ 54,86', the last value being the balance.
   */
  private parseInterAccountPdf(text: string, originalName: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    let date: string | null = null;

    for (const line of text.split('\n')) {
      const day = line.match(INTER_DAY_HEADER);
      if (day) {
        const month = MONTHS.indexOf(day[2].slice(0, 3).toLowerCase()) + 1;
        date = month ? `${day[3]}-${String(month).padStart(2, '0')}-${day[1].padStart(2, '0')}` : null;
        continue;
      }
      if (!date) continue;

      const values = [...line.matchAll(/(-)?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/g)];
      if (values.length < 2) continue;
      const value = values[values.length - 2];
      const amount = this.parseAmount(value[2]);

      const label = line.slice(0, value.index).trim();
      const parts = label.match(/^([^:"]+):\s*"(.*)"$/);
      const raw = parts
        ? `${parts[1].trim()} - ${parts[2].replace(/^No estabelecimento\s+/i, '').replace(/^Cp\s*:\s*\d+-/i, '')}`
        : label;
      const description = this.cleanDescription(raw);
      const sign: Sign = value[1] ? 'negative' : 'credit';
      if (amount <= 0 || !description || isBalanceLine(description) || (sign === 'credit' && isInvoicePayment(description))) continue;

      transactions.push({ date, amount, description, rawDescription: line.trim(), sourceFile: originalName, sign });
    }
    return transactions;
  }

  /**
   * Detect the sign of a CSV amount
   */
  private detectSign(amountStr: string): Sign {
    const trimmed = amountStr.trim();
    if (trimmed.startsWith('-') || this.parseAmount(trimmed) < 0) return 'negative';
    if (trimmed.startsWith('+')) return 'credit';
    return 'none';
  }

  /**
   * Normalize date string to ISO format (YYYY-MM-DD)
   */
  private normalizeDate(dateStr: string): string {
    let year: string = new Date().getFullYear().toString();
    let month: string = String(new Date().getMonth() + 1);
    let day: string = String(new Date().getDate());
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Try various formats
    const formats = [
      { regex: /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/, order: [2, 1, 0] }, // DD/MM/YYYY or DD-MM-YYYY
      { regex: /^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/, order: [0, 1, 2] }, // YYYY/MM/DD or YYYY-MM-DD
      { regex: /^(\d{2})[\/\-](\d{2})$/, order: [1, 0] }, // MM/DD or MM-DD (assume current year)
    ];
    
    for (const fmt of formats) {
      const match = dateStr.match(fmt.regex);
      if (match) {
        if (fmt.order.length === 3) {
          [year, month, day] = fmt.order.map(i => match[i + 1]);
        } else {
          [month, day] = fmt.order.map(i => match[i + 1]);
          year = new Date().getFullYear().toString();
        }
        
        return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    // If no format matched, return today (should not happen due to initialization above)
    return new Date().toISOString().split('T')[0];
  }

  private parseAmount(value: string): number {
    const normalized = value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value;
    return parseFloat(normalized) || 0;
  }

  private cleanDescription(text: string): string {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}\s\-\.,\/\(\)*&]/gu, '')
      .replace(/[\s\-]+$/, '')
      .trim();
  }
}