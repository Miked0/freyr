// Statements print the balance as dated lines ("SALDO DO DIA", "Saldo anterior", BB's "S A L D O", Itaú's
// "SDO CTA/APL AUTOMATICAS"). It is how much money there is, not money moving: imported, a R$ 200 balance on two
// days adds R$ 400 that never came in. A line naming its own balance kind may sit after a document number or a label.
const BALANCE_START = /^(saldo|sdo|balance)\b|^(opening|closing|available|ending|beginning|current) balance\b|^(limite|lim) (disponivel|utilizado|contratado|total|da conta|cheque especial)\b/;
const BALANCE_ANYWHERE = /\bsaldo (do dia|dia|anterior|final|inicial|disponivel|atual|total|em conta|em cc|bloqueado|parcial|liquido|da conta|aplic\w*|invest\w*)\b|\bsdo (cta|ant|aplic)/;

/** Whether a statement line reports the account balance rather than a transaction. */
export function isBalanceLine(description: string): boolean {
  const text = description
    .normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b([a-z]) (?=[a-z]\b)/g, '$1') // "s a l d o" -> "saldo", "c c" -> "cc"
    .replace(/^[^a-z]+/, '')
    .trim();
  return BALANCE_START.test(text) || BALANCE_ANYWHERE.test(text);
}
