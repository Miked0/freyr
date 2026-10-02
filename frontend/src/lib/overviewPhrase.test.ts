import { describe, expect, it } from 'vitest';
import { monthLongLabel, monthName, overviewPhrase } from './overviewPhrase';

describe('monthName', () => {
  it('names the month of a YYYY-MM key in Portuguese', () => {
    expect(monthName('2026-09')).toBe('Setembro');
    expect(monthName('2026-01')).toBe('Janeiro');
    expect(monthName('2025-12')).toBe('Dezembro');
  });
});

describe('monthLongLabel', () => {
  it('joins the month name and the year', () => {
    expect(monthLongLabel('2026-09')).toBe('Setembro 2026');
    expect(monthLongLabel('2025-03')).toBe('Março 2025');
  });
});

describe('overviewPhrase', () => {
  it('celebrates a month that brought in more than it spent', () => {
    expect(overviewPhrase(9234.2, 7420, 'Setembro')).toBe('Setembro rendeu mais do que saiu. Boa colheita.');
  });

  it('nudges when the month spent more than it brought in', () => {
    expect(overviewPhrase(1000, 1500, 'Outubro')).toBe('Outubro saiu mais do que entrou. Hora de ajustar.');
  });

  it('asks for a statement when there is no data', () => {
    expect(overviewPhrase(0, 0, 'Setembro')).toBe('Envie um extrato para começar.');
    expect(overviewPhrase(0, 0)).toBe('Envie um extrato para começar.');
  });

  it('says the month broke even when income equals spending', () => {
    expect(overviewPhrase(500, 500, 'Maio')).toBe('Maio fechou no zero a zero: entrou o mesmo que saiu.');
  });
});
