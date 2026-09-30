import { describe, it, expect } from 'vitest';
import { formatBRL } from './formatBRL';

describe('formatBRL', () => {
  it('formats positive amounts with + sign for income type', () => {
    expect(formatBRL(1000, 'income')).toBe('+R$ 1.000,00');
  });

  it('formats negative amounts with − sign for expense type', () => {
    expect(formatBRL(-500, 'expense')).toBe('−R$ 500,00');
  });

  it('uses typographic minus sign (U+2212) not hyphen', () => {
    const result = formatBRL(-100, 'expense');
    expect(result).toContain('\u2212');
    expect(result).not.toContain('-R$');
  });

  it('uses plus sign for positive income', () => {
    const result = formatBRL(100, 'income');
    expect(result).toContain('+R$');
  });

  it('defaults to + for positive amounts without type', () => {
    expect(formatBRL(1000)).toBe('+R$ 1.000,00');
  });

  it('defaults to − for negative amounts without type', () => {
    expect(formatBRL(-500)).toBe('−R$ 500,00');
  });

  it('formats with pt-BR locale (dots for thousands, comma for decimals)', () => {
    expect(formatBRL(1234567.89)).toBe('+R$ 1.234.567,89');
  });

  it('handles zero correctly', () => {
    expect(formatBRL(0)).toBe('+R$ 0,00');
  });

  it('handles small decimal values', () => {
    expect(formatBRL(0.01)).toBe('+R$ 0,01');
  });

  it('handles large values', () => {
    expect(formatBRL(999999999.99)).toBe('+R$ 999.999.999,99');
  });

  it('income type forces + sign even for negative amounts', () => {
    expect(formatBRL(-100, 'income')).toBe('+R$ 100,00');
  });

  it('expense type forces − sign even for positive amounts', () => {
    expect(formatBRL(100, 'expense')).toBe('−R$ 100,00');
  });

  it('always shows two decimal places', () => {
    expect(formatBRL(100)).toBe('+R$ 100,00');
    expect(formatBRL(100.5)).toBe('+R$ 100,50');
    expect(formatBRL(100.55)).toBe('+R$ 100,55');
  });
});