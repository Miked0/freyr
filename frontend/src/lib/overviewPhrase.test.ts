import { describe, expect, it } from 'vitest';
import { last30Phrase, monthLongLabel, monthName, overviewPhrase } from './overviewPhrase';

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
    expect(overviewPhrase(1000, 1500, 'Outubro')).toBe('Outubro saiu mais do que entrou. Dá para virar esse jogo.');
  });

  it('asks for a statement when there is no data', () => {
    expect(overviewPhrase(0, 0, 'Setembro')).toBe('Envie seu primeiro extrato e veja o mês tomar forma.');
    expect(overviewPhrase(0, 0)).toBe('Envie seu primeiro extrato e veja o mês tomar forma.');
  });

  it('says the month broke even when income equals spending', () => {
    expect(overviewPhrase(500, 500, 'Maio')).toBe('Maio fechou no zero a zero: entrou o mesmo que saiu.');
  });
});

describe('last30Phrase', () => {
  it('speaks of the last 30 days', () => {
    expect(last30Phrase(3000, 500)).toBe('Nos últimos 30 dias sobrou dinheiro. Boa colheita.');
    expect(last30Phrase(500, 3000)).toBe('Nos últimos 30 dias saiu mais do que entrou. Dá para virar esse jogo.');
    expect(last30Phrase(100, 100)).toBe('Nos últimos 30 dias tudo o que entrou, saiu. Empate técnico.');
    expect(last30Phrase(0, 0)).toBe('Envie seu primeiro extrato e veja o mês tomar forma.');
  });
});
