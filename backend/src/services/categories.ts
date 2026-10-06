export interface DefaultCategory {
  name: string;
  description: string;
}

// The first twelve names predate this list and are stored on existing expenses: never rename them.
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Alimentação', description: 'restaurantes, lanchonetes, padarias, cafés, bares, adegas e distribuidoras de bebidas e delivery (iFood, Rappi)' },
  { name: 'Transporte', description: 'Uber, 99, táxi, ônibus, metrô, estacionamento, pedágio' },
  { name: 'Moradia', description: 'aluguel, condomínio, reformas, manutenção e itens para a casa' },
  { name: 'Saúde', description: 'farmácias, consultas, exames, planos de saúde, dentista, óticas' },
  { name: 'Lazer', description: 'cinema, shows, ingressos, eventos, jogos e passeios' },
  { name: 'Compras', description: 'marketplaces e lojas em geral (Mercado Livre, Amazon, Shopee), eletrônicos' },
  { name: 'Contas', description: 'luz, água, gás de cozinha ou encanado, internet, celular e TV' },
  { name: 'Educação', description: 'cursos, escolas, faculdades, livros e plataformas de ensino' },
  { name: 'Salário', description: 'salário, pró-labore, férias e 13º recebidos' },
  { name: 'Investimentos', description: 'aplicações e resgates: CDB, LCI/LCA, caixinhas e porquinhos, Tesouro Direto ("Debito Online Td", Prefixado, IPCA+, Selic), ações, fundos, corretoras, poupança e cripto' },
  { name: 'Transferências', description: 'Pix, TED e transferências entre pessoas ou contas' },
  { name: 'Mercado', description: 'supermercados, atacados, hortifrútis, açougues e casas de carnes, mercearias e lojas de conveniência (Oxxo, AmPm)' },
  { name: 'Combustível', description: 'postos de combustível (gasolina, etanol, diesel, GNV)' },
  { name: 'Academia e bem-estar', description: 'academias, Wellhub/Gympass, pilates, yoga, esportes' },
  { name: 'Assinaturas', description: 'serviços recorrentes: streaming, música, armazenamento em nuvem, apps' },
  { name: 'Vestuário', description: 'roupas, calçados e acessórios' },
  { name: 'Viagem', description: 'passagens aéreas e de ônibus, hotéis, Airbnb, aluguel de carro' },
  { name: 'Pets', description: 'pet shops, ração, veterinário' },
  { name: 'Cuidados pessoais', description: 'cabeleireiro, barbearia, estética, cosméticos e perfumaria' },
  { name: 'Presentes e doações', description: 'presentes, flores, doações e vaquinhas' },
  { name: 'Impostos e taxas', description: 'IOF, anuidade, juros, multas, tarifas bancárias, IPVA, IPTU' },
  { name: 'Saques', description: 'saques em dinheiro no caixa eletrônico ou no Banco24Horas' },
  { name: 'Outros', description: 'o que não se encaixa nas demais categorias' },
];

/** Money applied here is kept, not spent: it never counts as spending or income. */
export const INVESTMENT_CATEGORY = 'Investimentos';

export const DEFAULT_CATEGORY_NAMES: string[] = DEFAULT_CATEGORIES.map(category => category.name);
