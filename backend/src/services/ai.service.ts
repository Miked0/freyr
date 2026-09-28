import axios from 'axios';

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
      const prompt = this.createCategorizationPrompt(description, availableCategories);

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
          }
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

  /**
   * Create a prompt for expense categorization
   */
  private createCategorizationPrompt(description: string, categories: string[]): string {
    const categoriesList = categories.join(', ');
    return `Categorize the following expense description into one of these categories: ${categoriesList}.
    
    Expense description: "${description}"
    
    Respond with only the category name, nothing else.`;
  }

  /**
   * Fallback categorization using simple keyword matching
   */
  private fallbackCategorization(description: string, categories: string[]): string {
    const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const normalizedDesc = fold(description);
    
    // Simple keyword mapping (can be expanded)
    const keywordMap: Record<string, string[]> = {
      'Alimentação': ['food', 'restaurant', 'cafe', 'bar', 'supermarket', 'grocery', 'mercado', 'padaria', 'lanche', 'jantar', 'almoco'],
      'Transporte': ['uber', 'taxi', 'bus', 'metro', 'subway', 'fuel', 'gas', 'estacionamento', 'parking', 'transporte'],
      'Moradia': ['rent', 'aluguel', 'mortgage', 'hipoteca', 'condo', 'condominio', 'agua', 'water', 'luz', 'electricity', 'gas', 'gás'],
      'Saúde': ['pharmacy', 'farmacia', 'hospital', 'doctor', 'médico', 'dentist', 'dentista', 'health', 'saúde'],
      'Lazer': ['movie', 'cinema', 'netflix', 'spotify', 'game', 'jogo', 'parque', 'park', 'viagem', 'travel'],
      'Compras': ['amazon', 'magazine', 'loja', 'store', 'shopping', 'roupas', 'clothes', 'eletronico', 'electronics'],
      'Contas': ['internet', 'phone', 'telefone', 'celular', 'tv', 'cable', 'assinatura', 'subscription'],
      'Outros': [] // catch-all
    };

    // Check each category for keywords
    for (const [category, keywords] of Object.entries(keywordMap)) {
      if (!categories.includes(category)) continue;
      
      for (const keyword of keywords) {
        if (normalizedDesc.includes(fold(keyword))) {
          return category;
        }
      }
    }

    return categories.includes('Outros') ? 'Outros' : categories[0];
  }
}
