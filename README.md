# Freyr — controle de gastos que se organiza sozinho

> Envie o extrato do banco ou a fatura do cartão. Em segundos, cada despesa está categorizada, somada e visível em gráficos. Corrija uma vez e o sistema lembra.

<!-- TODO: adicionar captura da tela principal (painel com gráficos) e link da demo -->
<!-- ![Painel do Freyr](docs/img/painel.png) -->

**Stack:** React 19 · TypeScript · Express 5 · libSQL/Turso · NVIDIA NIM (LLM) · Vercel

---

## O problema

Controlar gastos pessoais costuma falhar no mesmo ponto: **lançar e classificar cada transação à mão**. Planilhas exigem disciplina diária; apps de finanças pedem acesso à conta bancária, o que muita gente não quer conceder. O resultado é abandonar o controle no segundo mês.

## A solução

O Freyr parte do que o usuário já tem: **o extrato em PDF ou CSV** que qualquer banco disponibiliza. Sem integração bancária, sem digitação.

1. **Upload** — arrasta o arquivo; o sistema lê PDF ou CSV (vírgula ou ponto e vírgula, com ou sem BOM), com suporte dedicado ao extrato de conta do Banco Inter.
2. **Extração** — cada linha vira uma transação com data, valor, descrição limpa e tipo (receita ou despesa). Estornos e cashback da fatura abatem a saída em vez de inflar as entradas; pagamento da fatura e aplicações ficam de fora para não contar o mesmo dinheiro duas vezes.
3. **Sem duplicatas** — transações já importadas são ignoradas ao reenviar um extrato, e cópias antigas podem ser revisadas e removidas.
4. **Categorização inteligente** — cada transação recebe uma categoria em três camadas:
   - **Memória do usuário:** se ele já corrigiu essa descrição antes, a correção vale;
   - **IA (LLM via NVIDIA NIM):** classifica dentro das categorias do próprio usuário;
   - **Palavras-chave:** fallback determinístico quando a IA está indisponível ou lenta.
5. **Painel e relatórios** — visão geral com entradas e saídas do mês escolhido, gráfico de rosca por categoria, evolução mensal, fluxo de caixa e lista de transações com busca, filtros, edição e exportação em CSV.
6. **Metas** — objetivos de economia com valor-alvo, quanto já foi guardado e mês limite.

A cada correção manual, o sistema aprende para os próximos extratos. Quanto mais se usa, menos se corrige.

## Destaques técnicos

### IA com rede de segurança
A chamada ao LLM tem timeout de 8 s, temperatura baixa e **validação da resposta contra a lista de categorias permitidas**. Resposta fora da lista, erro de rede ou ausência de chave caem automaticamente no classificador por palavras-chave. A importação nunca trava por causa da IA.

### Pensado para serverless
O backend roda como função na Vercel, com limites reais de corpo (4,5 MB) e de tempo (60 s). O upload foi desenhado em cima deles:
- arquivos limitados a 4 MB, apenas `.pdf` e `.csv`;
- até 300 transações por envio, com categorização **em paralelo (concorrência 10)**, o que mantém a importação dentro do tempo e limita o custo de IA por upload;
- o worker do `pdf.js` é empacotado explicitamente para funcionar no ambiente serverless.

### Segurança levada a sério
- Senhas com **bcrypt** (12 rounds) e atraso fixo em logins inválidos;
- **Sessões assinadas com HMAC-SHA256** em cookie, comparadas em tempo constante, com versão de sessão que permite revogar todos os cookies de um usuário;
- **Rate limiting** de login (10 tentativas / 15 min) e de cadastro (5 / hora);
- `helmet` com cabeçalhos de segurança;
- em produção, o servidor **recusa iniciar** sem `SESSION_SECRET` e banco configurados (fail closed);
- dados isolados por usuário em todas as consultas, com exclusão em cascata.

### Front-end próprio, sem dependências pesadas
Gráficos (rosca, barras, fluxo de caixa) implementados em SVG/CSS sob medida, com navegação por teclado, rótulos ARIA e suporte a `prefers-reduced-motion`. Telas carregadas sob demanda (`React.lazy`).

### Qualidade
Cerca de 80 arquivos de teste com **Vitest** e **Supertest** cobrindo autenticação, perfil, metas, rotas de despesas, parsing de extratos, migração de dados legados e os componentes de interface. Testes visuais com **Playwright**.

## Arquitetura

```
┌──────────────────────┐      HTTPS / cookie de sessão      ┌───────────────────────────┐
│  Frontend (Vite)     │ ─────────────────────────────────▶ │  API Express (Vercel Fn)  │
│  React 19 + Zustand  │                                    │  /api/auth  /api/expenses │
│  Tailwind 4          │ ◀───────────────────────────────── │                           │
└──────────────────────┘                                    └──────┬─────────────┬──────┘
                                                                   │             │
                                                     libSQL/Turso  │             │  NVIDIA NIM
                                                    (SQLite local  ▼             ▼  (LLM, opcional)
                                                     em dev)   ┌────────┐   ┌──────────────┐
                                                               │  Banco │   │ Categorização│
                                                               └────────┘   └──────────────┘
```

| Camada | Tecnologias |
|---|---|
| Interface | React 19, TypeScript, Vite, Tailwind CSS 4, Zustand |
| API | Node 20+, Express 5, Multer, pdf-parse, csv-parse, Helmet |
| Dados | libSQL (Turso em produção, arquivo SQLite em desenvolvimento) |
| IA | NVIDIA NIM (API compatível com OpenAI), modelo configurável |
| Infra | Vercel (frontend estático + função serverless) |
| Testes | Vitest, Supertest, Testing Library, Playwright |

## Rodando localmente

Pré-requisito: Node.js 20 ou superior.

```bash
npm install
```

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env`. Sem `TURSO_DATABASE_URL`, o app usa um arquivo SQLite local; sem `NVIDIA_API_KEY`, usa o classificador por palavras-chave.

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

```bash
npm test
```

### Deploy na Vercel
O repositório já inclui `vercel.json`. Defina as variáveis `SESSION_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` e, opcionalmente, `NVIDIA_API_KEY`.

## Próximos passos

- Parsers para mais bancos além do Inter;
- Orçamentos por categoria com alertas;
- Importação via Open Finance.

---

## Precisa de algo parecido?

Este projeto mostra, de ponta a ponta, como transformar documentos não estruturados em dados úteis com IA, com cuidado real com segurança, custo e experiência do usuário. Se você precisa de um sistema assim — automação de documentos, dashboards financeiros ou integração de LLMs em produtos existentes — vamos conversar.

**Michael Douglas** · [GitHub](https://github.com/Miked0) <!-- TODO: adicionar LinkedIn / e-mail de contato -->
