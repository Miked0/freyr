import { describe, expect, it } from 'vitest';
import { compact, money } from './format';

const plain = (s: string) => s.replace(/ /g, ' ');

describe('money', () => {
  it('formats BRL with no sign for positive values', () => {
    expect(plain(money(9234.2))).toBe('R$ 9.234,20');
  });

  it('prefixes negatives with a true minus sign', () => {
    expect(plain(money(-284.9))).toBe('− R$ 284,90');
  });

  it('always shows the sign when signed', () => {
    expect(plain(money(8400, true))).toBe('+ R$ 8.400,00');
    expect(plain(money(-38.5, true))).toBe('− R$ 38,50');
  });
});

describe('compact', () => {
  it('shortens thousands with one decimal', () => {
    expect(compact(5284.9)).toBe('R$ 5,3k');
    expect(compact(15000)).toBe('R$ 15k');
  });

  it('rounds values under a thousand', () => {
    expect(compact(348.4)).toBe('R$ 348');
  });
});
