import { describe, expect, it } from 'vitest';
import { LEGAL_DOCS, legalDocFromHash } from './content';

const text = (key: keyof typeof LEGAL_DOCS) =>
  LEGAL_DOCS[key].sections.map(s => [s.heading, ...s.body].join(' ')).join(' ');

describe('legal documents', () => {
  it('maps their links to each document and leaves app pages alone', () => {
    expect(legalDocFromHash('#/privacidade')).toBe('privacidade');
    expect(legalDocFromHash('#/termos')).toBe('termos');
    expect(legalDocFromHash('#/lgpd')).toBe('lgpd');
    expect(legalDocFromHash('#/perfil')).toBeNull();
    expect(legalDocFromHash('')).toBeNull();
  });

  it('names every place the data goes in the privacy policy', () => {
    const policy = text('privacidade');
    for (const fact of ['Vercel', 'Turso', 'NVIDIA', 'AES-256', 'mascarad', 'memória', 'bcrypt']) {
      expect(policy).toContain(fact);
    }
  });

  it('lists the data subject rights of LGPD art. 18 and how to use them', () => {
    const lgpd = text('lgpd');
    for (const right of ['Confirmação', 'Acesso', 'Correção', 'Eliminação', 'Portabilidade', 'Revogação', 'Exportar', 'Excluir conta']) {
      expect(lgpd).toContain(right);
    }
  });

  it('keeps the terms of use about a personal tool that gives no financial advice', () => {
    expect(text('termos')).toMatch(/não é consultoria financeira/);
  });
});
