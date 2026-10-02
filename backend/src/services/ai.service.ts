import axios from 'axios';
import { DEFAULT_CATEGORIES } from './categories';
import { maskForAI } from './mask';

const AI_TIMEOUT_MS = 8000;

export interface AIConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

export class AIService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(config: AIConfig = {
    apiKey: process.env.NVIDIA_API_KEY || '',
    apiUrl: process.env.NVIDIA_NIM_API_URL || 'https://integrate.api.nvidia.com/v1',
    model: process.env.NVIDIA_NIM_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
  }) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.model = config.model;

    if (!this.apiKey) {
      console.warn('NVIDIA_API_KEY is not set. Falling back to keyword categorization.');
    }
  }

  get mode(): 'nvidia' | 'keywords' {
    return this.apiKey ? 'nvidia' : 'keywords';
  }

  /**
   * Categorize an expense description using NVIDIA NIM
   */
  async categorizeExpense(description: string, availableCategories: string[]): Promise<string> {
    if (!this.apiKey) {
      // Fallback to simple keyword matching if no API key
      return this.fallbackCategorization(description, availableCategories);
    }

    try {
      // Only a masked description leaves the server: the model runs outside Brazil (LGPD, art. 33).
      const prompt = this.createCategorizationPrompt(maskForAI(description), availableCategories);

      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert financial assistant that categorizes expenses into predefined categories. Respond with only the category name.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 50
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          // A slow call falls back to keywords instead of pushing the upload past the function limit.
          timeout: AI_TIMEOUT_MS
        }
      );

      const category = response.data.choices[0]?.message?.content?.trim();
      
      // Validate that the returned category is in our list
      if (category && availableCategories.includes(category)) {
        return category;
      } else {
        // If the API returns something not in our list, fallback
        return this.fallbackCategorization(description, availableCategories);
      }
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      console.error(`NVIDIA NIM API call failed (status ${status ?? 'n/a'}): ${(error as Error).message}`);
      return this.fallbackCategorization(description, availableCategories);
    }
  }

  private createCategorizationPrompt(description: string, categories: string[]): string {
    const descriptions = new Map(DEFAULT_CATEGORIES.map(c => [c.name, c.description]));
    const categoriesList = categories
      .map(name => (descriptions.has(name) ? `- ${name}: ${descriptions.get(name)}` : `- ${name}`))
      .join('\n');
    return `Categorize this Brazilian bank or credit card transaction into exactly one of the categories below.
Descriptions are often abbreviated merchant names (e.g. "IFD*" is iFood, "DL*UberRides" is Uber, "MP *" is Mercado Pago) and may end with an installment marker like "(Parcela 02 de 10)".

Categories:
${categoriesList}

Transaction description: "${description}"

Respond with only the category name, exactly as written above, nothing else.`;
  }

  private fallbackCategorization(description: string, categories: string[]): string {
    return matchKeywordCategory(description, categories) ?? (categories.includes('Outros') ? 'Outros' : categories[0]);
  }
}

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const words = (text: string) => ` ${fold(text).replace(/[^a-z0-9]+/g, ' ').trim()} `;

/**
 * Ordered keyword rules; the first match wins, so specific merchants come before generic words.
 * A keyword matches whole words; a trailing "*" makes it a word prefix ("farmacia*" matches "farmacias").
 * Cooking gas (Ultragaz, Comgás) goes to Contas with the other household utilities, not to Combustível,
 * which is only for vehicle fuel.
 */
const KEYWORD_RULES: [category: string, keywords: string[]][] = [
  ['Assinaturas', [
    'netflix*', 'spotify*', 'deezer*', 'google one', 'google storage', 'youtube premium', 'youtubepremium', 'icloud*',
    'apple com bill', 'applecombill', 'amazon prime', 'amazonprime*', 'prime video', 'primevideo', 'disney*', 'hbo*',
    'max com', 'globoplay*', 'paramount*', 'crunchyroll*', 'melimais', 'meli mais', 'chatgpt', 'openai*',
    'microsoft 365', 'adobe*', 'canva*', 'dropbox*', 'assinatura*', 'subscription',
  ]],
  ['Alimentação', [
    'ifood*', 'ifd', 'rappi*', 'uber eats', 'ubereats*', '99food*', 'ze delivery', 'zedelivery*', 'aiqfome*',
    'restaurante*', 'restaurant*', 'lanchonete*', 'lanche*', 'padaria*', 'panificadora*', 'confeitaria*', 'doceria*',
    'pizzaria*', 'pizza*', 'hamburgueria*', 'burger*', 'mcdonald*', 'mc donalds', 'subway', 'habibs', 'outback*',
    'starbucks*', 'cafe', 'cafeteria*', 'acai*', 'sorvete*', 'sorveteria*', 'churrascaria*', 'sushi*', 'bar', 'boteco*',
    'cantina*', 'bistro*', 'food', 'almoco', 'jantar',
  ]],
  ['Compras', [
    'mercadolivre*', 'mercado livre', 'mercadol', 'amazon*', 'amzn*', 'aliexpress*', 'shopee*', 'magalu*',
    'magazine luiza', 'magazineluiza*', 'americanas*', 'casas bahia', 'casasbahia*', 'ponto frio', 'kabum*',
    'fast shop', 'submarino*', 'temu*', 'eletronico*', 'electronics',
  ]],
  ['Mercado', [
    'supermercado*', 'mercado*', 'minimercado*', 'mercadinho*', 'mercearia*', 'hortifruti*',
    'hortifrut*', 'sacolao*', 'quitanda*', 'acougue*', 'atacadao*', 'atacadista*', 'assai*', 'carrefour*',
    'pao de acucar', 'extra', 'zaffari*', 'guanabara', 'condor', 'muffato*', 'savegnago*', 'sonda', 'hirota*',
    'st marche', 'makro*', 'sams club', 'emporio*', 'grocery', 'supermarket',
  ]],
  ['Contas', [
    'ultragaz*', 'ultra gas', 'liquigas*', 'supergasbras*', 'copagaz*', 'nacional gas', 'comgas*', 'naturgy*',
    'gas de cozinha', 'botijao*', 'enel*', 'cemig*', 'copel*', 'celesc*', 'coelba*', 'energisa*', 'cpfl*',
    'equatorial*', 'neoenergia*', 'eletropaulo', 'light', 'sabesp*', 'copasa*', 'cedae*', 'sanepar*', 'embasa*',
    'compesa*', 'vivo', 'claro', 'tim', 'oi', 'net', 'sky', 'internet', 'telefone', 'telefonica*', 'celular',
    'recarga*', 'agua', 'water', 'luz', 'energia eletrica', 'electricity', 'phone', 'tv', 'cable',
  ]],
  ['Combustível', [
    'posto', 'postos', 'auto posto', 'shell', 'ipiranga', 'petrobras*', 'posto br', 'br mania', 'raizen*',
    'combustive*', 'gasolina', 'etanol', 'diesel', 'gnv', 'fuel',
  ]],
  ['Transporte', [
    'uber', 'uberrides*', 'ubertrip*', 'uber trip', 'uber br', '99app*', '99 app', '99pop*', '99 pop', '99 tecnologia',
    '99taxi*', 'cabify*', 'taxi', 'metro', 'cptm', 'sptrans', 'bilhete unico', 'onibus', 'estacionamento*',
    'estapar*', 'parking', 'sem parar', 'semparar*', 'conectcar*', 'veloe*', 'pedagio*', 'transporte',
  ]],
  ['Moradia', [
    'aluguel*', 'condominio*', 'quintoandar*', 'quinto andar', 'leroy merlin', 'leroymerlin*', 'telhanorte*',
    'tok stok', 'tokstok*', 'material de construcao', 'construcao', 'rent', 'mortgage', 'hipoteca',
  ]],
  ['Saúde', [
    'farmacia*', 'drogaria*', 'drogasil*', 'droga raia', 'drogaraia*', 'raia', 'pague menos', 'paguemenos*',
    'panvel*', 'ultrafarma*', 'pharmacy', 'otica*', 'oticas', 'hospital*', 'clinica*', 'laboratorio*',
    'medico*', 'dentista*', 'odonto*', 'unimed*', 'amil', 'hapvida*', 'sulamerica*', 'psicolog*', 'fisioterap*',
    'fleury', 'exame*', 'doctor', 'saude', 'health',
  ]],
  ['Academia e bem-estar', [
    'wellhub*', 'gympass*', 'smart fit', 'smartfit*', 'bluefit*', 'selfit*', 'bodytech*', 'bio ritmo', 'totalpass*',
    'total pass', 'academia*', 'crossfit*', 'pilates*', 'yoga*', 'natacao', 'spa', 'massagem*',
  ]],
  ['Educação', [
    'alura*', 'udemy*', 'coursera*', 'rocketseat*', 'duolingo*', 'hotmart*', 'escola*', 'colegio*', 'faculdade*',
    'universidade*', 'curso', 'cursos', 'livraria*', 'saraiva*', 'estante virtual', 'papelaria*', 'mensalidade*',
  ]],
  ['Vestuário', [
    'renner*', 'riachuelo*', 'c a modas', 'cea', 'zara*', 'hering*', 'centauro*', 'netshoes*', 'dafiti*', 'shein*',
    'marisa', 'youcom*', 'arezzo*', 'havaianas*', 'nike*', 'adidas*', 'calcado*', 'roupa*', 'vestuario*', 'clothes',
  ]],
  ['Pets', [
    'petz*', 'cobasi*', 'petlove*', 'pet love', 'pet', 'pets', 'petshop*', 'pet shop', 'petstore*', 'petsupermark*',
    'racao', 'racoes', 'veterinari*',
  ]],
  ['Cuidados pessoais', [
    'barbearia*', 'barber*', 'salao*', 'cabeleireir*', 'manicure*', 'estetica*', 'boticario*', 'natura', 'sephora*',
    'eudora*', 'avon', 'perfumaria*', 'cosmetico*', 'beleza*', 'beauty',
  ]],
  ['Lazer', [
    'ingresso*', 'sympla*', 'eventim*', 'ticketmaster*', 'cinema*', 'cinemark*', 'kinoplex*', 'teatro*', 'show',
    'steam*', 'playstation*', 'psn', 'xbox*', 'nintendo*', 'parque*', 'park', 'game*', 'jogo*', 'movie*',
  ]],
  ['Viagem', [
    'latam*', 'gol linhas', 'voegol*', 'azul linhas', 'voeazul*', 'azul viagens', 'decolar*', '123milhas*',
    '123 milhas', 'maxmilhas*', 'smiles*', 'airbnb*', 'booking*', 'hotel*', 'hoteis', 'pousada*', 'hostel*',
    'expedia*', 'trivago*', 'hurb*', 'cvc', 'buser*', 'clickbus*', 'rodoviaria*', 'localiza*', 'movida*',
    'passagem*', 'passagens', 'aeroporto*', 'viagem*', 'travel',
  ]],
  ['Impostos e taxas', [
    'iof', 'anuidade*', 'juros', 'encargo*', 'tarifa*', 'multa', 'imposto*', 'iptu', 'ipva', 'darf', 'detran*',
    'taxa', 'taxas', 'cesta de servicos',
  ]],
  ['Presentes e doações', [
    'presente*', 'floricultura*', 'flores', 'doacao*', 'doacoes', 'vakinha*', 'vaquinha*', 'dizimo', 'catarse*',
    'apoia se',
  ]],
  ['Compras', ['loja', 'lojas', 'shopping', 'store', 'magazine']],
  ['Salário', ['salario*', 'pro labore', 'prolabore', 'holerite', 'proventos', 'folha de pagamento']],
  ['Investimentos', [
    'tesouro direto', 'aplicacao*', 'investimento*', 'cdb', 'corretora*', 'xp investimentos', 'nuinvest*',
    'poupanca', 'bitcoin', 'binance*', 'cripto*',
  ]],
  ['Transferências', ['pix', 'ted', 'doc', 'transferencia*', 'transf']],
];

const COMPILED_RULES = KEYWORD_RULES.map(([category, keywords]) => ({
  category,
  patterns: keywords.map(keyword =>
    keyword.endsWith('*') ? words(keyword.slice(0, -1)).trimEnd() : words(keyword)
  ),
}));

/** Returns the first keyword rule's category that the user has, or undefined when nothing matches. */
export function matchKeywordCategory(description: string, categories: string[]): string | undefined {
  // "MERCADOPAGO*X" is a payment processor prefix, not a grocery store.
  const text = words(description).replace(/ mercado ?pago /g, ' ');
  for (const { category, patterns } of COMPILED_RULES) {
    if (!categories.includes(category)) continue;
    if (patterns.some(pattern => text.includes(pattern))) return category;
  }
  return undefined;
}
