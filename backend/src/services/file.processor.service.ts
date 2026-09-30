import { parse } from 'csv-parse/sync';
import { PDFParse } from 'pdf-parse';
import { getPath } from 'pdf-parse/worker';
import path from 'path';

// Explicit worker path so serverless bundlers (Vercel) ship the pdf.js worker file.
PDFParse.setWorker(getPath());

export type Sign = 'negative' | 'credit' | 'none';

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

export class FileProcessorService {
  /**
   * Process uploaded file based on its extension
   */
  async processFile(content: Buffer, originalName: string): Promise<ParsedTransaction[]> {
    const ext = path.extname(originalName).toLowerCase();
    
    switch (ext) {
      case '.csv':
        return this.processCsv(content, originalName);
      case '.pdf':
        return this.processPdf(content, originalName);
      default:
        throw new StatementError(`Unsupported file format: ${ext}`);
    }
  }

  /**
   * Process CSV file
   */
  private async processCsv(content: Buffer, originalName: string): Promise<ParsedTransaction[]> {
    const fileContent = content.toString('utf8');
    const headerLine = fileContent.split(/\r?\n/, 1)[0];
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter: headerLine.includes(';') ? ';' : ','
    });

    return records.map((record: any) => ({
      date: this.normalizeDate(record.date || record.Date || record.DATA),
      amount: Math.abs(this.parseAmount(record.amount || record.Amount || record.VALOR || '0')),
      description: this.cleanDescription(record.description || record.Description || record.HISTORICO || ''),
      rawDescription: record.description || record.Description || record.HISTORICO || '',
      sourceFile: originalName,
      sign: this.detectSign(record) as Sign
    }));
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

    // Heuristic parsing; bank-specific layouts may need dedicated parsers.
    const lines = text.split('\n');

    const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
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
      const last = amounts[amounts.length - 1];
      if (!last || last.index === undefined) continue;

      const amount = this.parseAmount(last[3]);
      const beforeAmount = rest.slice(0, last.index);
      const columns = beforeAmount.split('\t').map(c => c.trim()).filter(Boolean);
      const description = this.cleanDescription(columns.length > 1 ? columns[0] : beforeAmount);
      if (amount <= 0 || !description) continue;

      const sign: Sign = last[1] ? 'negative' : last[2] ? 'credit' : 'none';
      transactions.push({ date, amount, sign, description, raw: trimmed });
    }

    // Bank statements list debits as negatives; card invoices list purchases unsigned
    // and payments/refunds with a sign.
    const negatives = transactions.filter(t => t.sign === 'negative').length;
    const expenseSign: Sign = negatives > transactions.length / 2 ? 'negative' : 'none';

    return transactions
      .filter(t => t.sign === expenseSign || t.sign === 'credit')
      .map(t => ({
        date: t.date,
        amount: t.amount,
        description: t.description,
        rawDescription: t.raw,
        sourceFile: originalName,
        sign: t.sign
      }));
  }

  /**
   * Detect sign from CSV record
   */
  private detectSign(record: any): Sign {
    // Check for explicit sign in amount or other fields
    const amountStr = String(record.amount || record.Amount || record.VALOR || '');
    const val = this.parseAmount(amountStr);
    
    // If amount is negative, it's an expense
    if (amountStr.trim().startsWith('-') || val < 0) {
      return 'negative';
    }
    // Check for credit indicators
    if (amountStr.trim().startsWith('+') || amountStr.includes('credit') || amountStr.includes('crédito')) {
      return 'credit';
    }
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