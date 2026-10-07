# Jagastei

Controle pessoal de gastos: o usuário envia extratos bancários ou faturas de cartão, o sistema extrai as despesas, sugere uma categoria para cada uma e mostra relatórios.

## Linguagem

**Extrato** (statement): arquivo PDF ou CSV enviado pelo usuário, contendo várias transações.
_Evitar_: fatura, arquivo (quando o sentido é o documento de origem).

**Despesa** (expense): uma transação extraída de um extrato — data, valor (sempre positivo), descrição e categoria.

**Descrição**: texto da transação limpo para exibição e para categorização. **Descrição bruta** (`raw_description`) é o texto original do extrato.

**Categoria**: rótulo de agrupamento de despesas (ex.: Alimentação, Transporte). "Outros" é a categoria padrão quando nada se aplica.

**Categoria personalizada**: categoria criada pelo usuário além das padrão, até o limite do plano (`backend/src/services/plans.ts`). Apagá-la devolve as transações dela para "Outros".

**Sinal de categoria** (category signal): par loja mascarada + categoria personalizada que um usuário escolheu, guardado para melhorar a categorização da plataforma. Não guarda valor, data nem descrição completa; transferências ficam de fora.

**Categorização**: escolha da categoria de uma despesa no upload. Ordem de prioridade: correção anterior para a mesma descrição → IA (NVIDIA NIM) → fallback por palavras-chave.

**Correção**: troca manual de categoria feita pelo usuário. É registrada e passa a valer para futuras despesas com a mesma descrição.
