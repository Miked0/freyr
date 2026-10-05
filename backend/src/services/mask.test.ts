import { describe, it, expect } from 'vitest';
import { maskForAI } from './mask';

describe('maskForAI', () => {
  it.each([
    ['Pix enviado - Fulano de Tal', 'Pix enviado'],
    ['Pix recebido - CICLANA', 'Pix recebido'],
    ['Pix enviado: "Cp :60701190-Fulano de Tal"', 'Pix enviado'],
    ['PIX RECEBIDO', 'PIX RECEBIDO'],
    ['TED RECEBIDA JOAO DA SILVA', 'TED RECEBIDA'],
    ['Transferência enviada para Maria Souza', 'Transferência enviada'],
    ['DOC ENVIADO 341 1234 56789-0', 'DOC ENVIADO'],
  ])('keeps only the kind of transfer, never who is on the other side: %s', (description, masked) => {
    expect(maskForAI(description)).toBe(masked);
  });

  it.each([
    ['PAGTO BOLETO CPF 123.456.789-09', 'PAGTO BOLETO CPF ***'],
    ['LOJA X 12345678909', 'LOJA X ***'],
    ['EMPRESA 12.345.678/0001-90 LTDA', 'EMPRESA *** LTDA'],
    ['COMPRA CARTAO 5502 0912 3456 7890', 'COMPRA CARTAO ***'],
    ['RECIBO fulano@gmail.com', 'RECIBO ***'],
  ])('hides documents, card or account numbers and e-mails: %s', (description, masked) => {
    expect(maskForAI(description)).toBe(masked);
  });

  it.each([
    'IFD*RESTAURANTE SABOR',
    'DL*UberRides',
    'MERCADOLIVRE*LOJA (Parcela 02 de 10)',
    'POSTO SHELL AV BRASIL 1500',
    '99APP *99APP',
  ])('leaves merchant names untouched: %s', description => {
    expect(maskForAI(description)).toBe(description);
  });
});
