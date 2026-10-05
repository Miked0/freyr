import { describe, it, expect, vi, afterEach } from 'vitest';
import axios from 'axios';
import { AIService } from './ai.service';
import { DEFAULT_CATEGORY_NAMES } from './categories';

const offline = new AIService({ apiKey: '', apiUrl: '', model: '' });
const categorize = (description: string) => offline.categorizeExpense(description, DEFAULT_CATEGORY_NAMES);

describe('AIService keyword categorization', () => {
  it.each([
    ['IFD*RESTAURANTE SABOR', 'Alimentação'],
    ['IFOOD *PIZZARIA', 'Alimentação'],
    ['RAPPI BRASIL', 'Alimentação'],
    ['UBER *EATS PENDING', 'Alimentação'],
    ['PADARIA PAO QUENTE', 'Alimentação'],
    ['BAR DO ZE', 'Alimentação'],
    ['SUPERMERCADO BOM PRECO', 'Mercado'],
    ['MERCADO CENTRAL', 'Mercado'],
    ['MercadoBairro', 'Mercado'],
    ['ATACADAO 123', 'Mercado'],
    ['DL*UberRides', 'Transporte'],
    ['UBER TRIP', 'Transporte'],
    ['99APP *99APP', 'Transporte'],
    ['ESTACIONAMENTO CENTRO', 'Transporte'],
    ['POSTO SHELL AV BRASIL', 'Combustível'],
    ['AUTO POSTO IPIRANGA', 'Combustível'],
    ['PETROBRAS DISTRIB', 'Combustível'],
    ['ULTRA GAS', 'Contas'],
    ['ULTRAGAZ ENTREGA', 'Contas'],
    ['ENEL SP', 'Contas'],
    ['VIVO FIXO INTERNET', 'Contas'],
    ['ALUGUEL APTO', 'Moradia'],
    ['CONDOMINIO RESIDENCIAL', 'Moradia'],
    ['DROGASIL 123', 'Saúde'],
    ['DROGA RAIA', 'Saúde'],
    ['PAGUE MENOS 1020', 'Saúde'],
    ['OTICA VISAO (Parcela 05 de 06)', 'Saúde'],
    ['Wellhub', 'Academia e bem-estar'],
    ['GYMPASS BR', 'Academia e bem-estar'],
    ['SMART FIT', 'Academia e bem-estar'],
    ['ALURA (Parcela 03 de 12)', 'Educação'],
    ['UDEMY ONLINE', 'Educação'],
    ['Google One', 'Assinaturas'],
    ['NETFLIX.COM', 'Assinaturas'],
    ['SPOTIFY', 'Assinaturas'],
    ['APPLE.COM/BILL', 'Assinaturas'],
    ['AMAZON PRIME CANAIS', 'Assinaturas'],
    ['DISNEY PLUS', 'Assinaturas'],
    ['HBO MAX', 'Assinaturas'],
    ['MP *MELIMAIS', 'Assinaturas'],
    ['MERCADOLIVRE*LOJA (Parcela 01 de 04)', 'Compras'],
    ['AMAZON MARKETPLACE', 'Compras'],
    ['MP *ALIEXPRESS (Parcela 01 de 03)', 'Compras'],
    ['SHOPEE *VENDEDOR', 'Compras'],
    ['MAGALU', 'Compras'],
    ['RENNER LOJA 12', 'Vestuário'],
    ['PetstoreBichos', 'Pets'],
    ['PET LOVE*PEDIDO123', 'Pets'],
    ['PETSUPERMARK*LOJA (Parcela 01 de 03)', 'Pets'],
    ['COBASI', 'Pets'],
    ['BARBEARIA DO JOAO', 'Cuidados pessoais'],
    ['O BOTICARIO', 'Cuidados pessoais'],
    ['Ingresso.com', 'Lazer'],
    ['SYMPLA *EVENTO', 'Lazer'],
    ['CINEMARK', 'Lazer'],
    ['LATAM AIRLINES', 'Viagem'],
    ['AIRBNB * HM123', 'Viagem'],
    ['BOOKING.COM HOTEL', 'Viagem'],
    ['IOF COMPRA INTERNACIONAL', 'Impostos e taxas'],
    ['ANUIDADE DIFERENCIADA', 'Impostos e taxas'],
    ['JUROS DE MORA', 'Impostos e taxas'],
    ['FLORICULTURA BELA', 'Presentes e doações'],
    ['SALARIO EMPRESA', 'Salário'],
    ['PIX ENVIADO FULANO', 'Transferências'],
    ['TESOURO DIRETO', 'Investimentos'],
    ['LOJA CENTRO', 'Compras'],
    ['MERCADOPAGO*FULANO', 'Outros'],
    ['ESTABELECIMENTO DESCONHECIDO', 'Outros'],
  ])('%s -> %s', async (description, category) => {
    expect(await categorize(description)).toBe(category);
  });

  it('does not match short keywords inside longer words', async () => {
    expect(await categorize('UBERLANDIA COMERCIO')).toBe('Outros');
    expect(await categorize('PETRUS ENGENHARIA')).toBe('Outros');
  });

  it('skips a rule whose category the user does not have', async () => {
    expect(await offline.categorizeExpense('IFOOD *LANCHE', ['Transporte', 'Outros'])).toBe('Outros');
  });
});

describe('AIService prompt', () => {
  afterEach(() => vi.restoreAllMocks());

  it('describes each default category to the model', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { choices: [{ message: { content: 'Pets' } }] } });
    const online = new AIService({ apiKey: 'k', apiUrl: 'http://ai', model: 'm' });

    expect(await online.categorizeExpense('PET LOVE', [...DEFAULT_CATEGORY_NAMES, 'Minha categoria'])).toBe('Pets');

    const prompt: string = (post.mock.calls[0][1] as any).messages[1].content;
    expect(prompt).toMatch(/- Pets: .*ração/);
    expect(prompt).toMatch(/- Contas: .*gás de cozinha/);
    expect(prompt).toContain('- Minha categoria');
  });
});

describe('AIService privacy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never sends the name on a Pix or a CPF to the model', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { choices: [{ message: { content: 'Transferências' } }] } });
    const online = new AIService({ apiKey: 'k', apiUrl: 'http://ai', model: 'm' });

    await online.categorizeExpense('Pix enviado: "Cp :60701190-Fulano de Tal"', DEFAULT_CATEGORY_NAMES);
    await online.categorizeExpense('PAGTO BOLETO CPF 123.456.789-09', DEFAULT_CATEGORY_NAMES);

    const sent = JSON.stringify(post.mock.calls.map(call => call[1]));
    expect(sent).not.toMatch(/Fulano|60701190|123\.456\.789-09/);
  });
});
