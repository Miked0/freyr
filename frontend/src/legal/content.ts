// Textos legais do Freyr. Revise com um advogado antes de publicar e preencha RESPONSAVEL e CONTATO.

/** Who answers for the data (controlador e encarregado, LGPD arts. 5º VI e 41). */
export const RESPONSAVEL = 'Michael Douglas Bessa Alves';
export const CONTATO = 'dev.miked0@gmail.com';
export const ATUALIZADO_EM = '02/10/2026';

export type LegalDocKey = 'privacidade' | 'termos' | 'lgpd';

export interface LegalSection {
  heading: string;
  /** Paragraphs; a line starting with "• " renders as a list item. */
  body: string[];
}

export interface LegalDoc {
  title: string;
  /** Link text used when another document points here. */
  linkLabel: string;
  sections: LegalSection[];
}

export const LEGAL_DOCS: Record<LegalDocKey, LegalDoc> = {
  privacidade: {
    title: 'Política de Privacidade',
    linkLabel: 'Política de Privacidade',
    sections: [
      {
        heading: 'Quem cuida dos seus dados',
        body: [
          `O Freyr é um controle pessoal de gastos. O controlador dos dados e encarregado pelo tratamento é ${RESPONSAVEL}, que atende pelo e-mail ${CONTATO}.`,
          'Esta política explica quais dados o Freyr trata, para quê, com quem eles são compartilhados e como você controla tudo isso, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).',
        ],
      },
      {
        heading: 'Quais dados tratamos',
        body: [
          '• Conta: nome de usuário, senha (guardada só como hash bcrypt, nunca em texto), nome de exibição, cor do avatar e meta de gasto mensal.',
          '• Transações: data, valor, descrição, categoria, se é entrada ou saída e o nome do arquivo de onde vieram.',
          '• Metas que você cadastra.',
          '• Sessão: um cookie essencial que mantém você conectado por até 30 dias. Não usamos cookies de publicidade nem de rastreamento.',
          '• Endereço IP: usado só em memória, por alguns minutos, para limitar tentativas de login. Não é gravado no banco. O provedor de hospedagem pode registrá-lo em logs técnicos.',
          'Os extratos e faturas que você envia são lidos em memória e descartados logo após a importação. O Freyr não guarda o arquivo, nem a linha original de cada lançamento.',
        ],
      },
      {
        heading: 'Para que usamos',
        body: [
          'Para mostrar seus gastos, entradas, categorias e metas; sugerir a categoria de cada transação; reconhecer transações já importadas; e manter sua conta segura.',
          'A base legal é a execução do contrato com você, que é o uso do Freyr (art. 7º, V). A proteção contra acessos indevidos usa o legítimo interesse (art. 7º, IX). Não vendemos dados, não fazemos publicidade e não traçamos perfil de consumo para terceiros.',
        ],
      },
      {
        heading: 'Com quem compartilhamos',
        body: [
          '• Vercel: hospeda o site e o servidor.',
          '• Turso: hospeda o banco de dados.',
          '• NVIDIA: quando a categorização automática está ligada, recebe só a descrição mascarada de cada transação, sem CPF, CNPJ, números de conta ou cartão, e-mails ou o nome de quem está do outro lado de um Pix, TED ou DOC. Ela devolve apenas o nome de uma categoria.',
          'Esses provedores podem processar dados fora do Brasil, como nos Estados Unidos. A transferência internacional segue o art. 33 da LGPD, com as garantias contratuais de cada provedor.',
        ],
      },
      {
        heading: 'Como protegemos',
        body: [
          'Cada conta tem uma chave de dados própria. As descrições e os nomes de arquivo são gravados cifrados com AES-256-GCM, e a chave de cada conta fica cifrada por uma chave mestra que não é guardada no banco. As buscas por descrição usam tokens HMAC, então o banco não guarda esses textos em lugar nenhum.',
          'O tráfego usa HTTPS e cada usuário só acessa as próprias transações. Mesmo assim, nenhum sistema é totalmente imune. Se houver um incidente que traga risco a você, avisaremos você e a ANPD (art. 48).',
        ],
      },
      {
        heading: 'Por quanto tempo guardamos',
        body: [
          'Enquanto sua conta existir. Você pode excluir transações a qualquer momento. Ao excluir a conta no Perfil, apagamos na hora a conta, as transações, as categorias, as correções, as metas e a chave de dados. Cópias de segurança do provedor do banco podem existir por um período curto e já guardam esses dados cifrados.',
        ],
      },
      {
        heading: 'Seus direitos',
        body: [
          'Você pode confirmar, acessar, corrigir, exportar e eliminar seus dados, entre outros direitos do art. 18 da LGPD. A página Seus direitos (LGPD) explica como fazer cada um no próprio Freyr.',
          `O Freyr não é destinado a menores de 18 anos. Alterações nesta política serão avisadas no aplicativo. Dúvidas: ${CONTATO}.`,
        ],
      },
    ],
  },
  termos: {
    title: 'Termos de Uso',
    linkLabel: 'Termos de Uso',
    sections: [
      {
        heading: 'Aceite',
        body: [
          `Estes Termos de Uso (contrato de licença de usuário final) regem o uso do Freyr, oferecido por ${RESPONSAVEL}. Ao criar uma conta, você concorda com eles e com a Política de Privacidade.`,
        ],
      },
      {
        heading: 'Licença',
        body: [
          'Você recebe uma licença pessoal, gratuita, não exclusiva, intransferível e revogável para usar o Freyr no controle das suas próprias finanças. O software, a marca e o design continuam de propriedade do responsável pelo Freyr.',
          'Não é permitido copiar, revender, fazer engenharia reversa, tentar acessar dados de outras contas, sobrecarregar o serviço ou usá-lo para algo ilegal.',
        ],
      },
      {
        heading: 'Sua conta',
        body: [
          'Você é responsável por manter sua senha em segredo e pelo que for feito com a sua conta. Envie só extratos e faturas seus ou de quem autorizou você a fazer isso.',
        ],
      },
      {
        heading: 'O que o Freyr é e o que não é',
        body: [
          'O Freyr organiza os lançamentos que você importa. Ele não é consultoria financeira, contábil ou de investimentos, e não se conecta à sua conta bancária. A leitura dos arquivos e a categorização automática podem errar: confira os valores importantes no extrato original.',
        ],
      },
      {
        heading: 'Disponibilidade e responsabilidade',
        body: [
          'O serviço é oferecido como está e pode passar por manutenção, mudanças ou interrupções. Na medida permitida pela lei, o responsável pelo Freyr não responde por decisões financeiras tomadas com base nas informações exibidas, nem por perdas indiretas. Nada aqui limita os seus direitos como consumidor.',
        ],
      },
      {
        heading: 'Encerramento',
        body: [
          'Você pode excluir a conta quando quiser, no Perfil. Contas usadas em violação destes termos podem ser suspensas.',
        ],
      },
      {
        heading: 'Lei e foro',
        body: [
          `Vale a lei brasileira. Fica eleito o foro do domicílio do usuário. Mudanças nestes termos serão avisadas no aplicativo. Contato: ${CONTATO}.`,
        ],
      },
    ],
  },
  lgpd: {
    title: 'Seus direitos na LGPD',
    linkLabel: 'Seus direitos (LGPD)',
    sections: [
      {
        heading: 'O que a lei garante',
        body: [
          'A LGPD (art. 18) dá a você, titular dos dados, os direitos abaixo. No Freyr, a maioria deles você exerce sozinho, na hora.',
        ],
      },
      {
        heading: 'Como exercer cada direito',
        body: [
          '• Confirmação e Acesso: a página Transações mostra tudo o que está guardado sobre os seus gastos e entradas, e o Perfil mostra os dados da conta.',
          '• Correção: edite a descrição, o valor, o tipo ou a categoria de qualquer transação, e os dados do Perfil.',
          '• Portabilidade: use Exportar, na Visão geral, para baixar todas as suas transações em CSV.',
          '• Eliminação: exclua transações uma a uma, ou use Excluir conta, no Perfil, para apagar tudo de uma vez.',
          '• Anonimização e bloqueio: peça pelo e-mail de contato os dados que considerar desnecessários.',
          '• Informação sobre compartilhamento: a Política de Privacidade lista quem recebe dados e por quê.',
          '• Revogação do consentimento e oposição: deixe de usar o Freyr e exclua a conta. A categorização por IA só recebe descrições mascaradas.',
          '• Revisão de decisões automatizadas: a categoria sugerida pela IA é só uma sugestão. Troque quando quiser, e o Freyr aprende com a sua correção.',
        ],
      },
      {
        heading: 'Pedidos e reclamações',
        body: [
          `Para qualquer pedido que não dê para fazer no aplicativo, escreva para ${CONTATO}. A resposta vem em até 15 dias (art. 19, II).`,
          'Se não ficar satisfeito, você pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD), pelo site gov.br/anpd.',
        ],
      },
    ],
  },
};

const PREFIX = '#/';

/** The legal document a location hash points to, or null for app pages. */
export function legalDocFromHash(hash: string): LegalDocKey | null {
  const key = hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : '';
  return key in LEGAL_DOCS ? (key as LegalDocKey) : null;
}

export const legalHref = (key: LegalDocKey) => PREFIX + key;
