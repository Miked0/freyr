// Transfers name the person on the other side; only the kind of transfer helps categorize them.
const TRANSFER = /^\s*((?:pix|ted|doc|transfer[eê]ncia|transf\.?)\s+(?:enviad[oa]|recebid[oa]))\b/i;

// Order matters: a CNPJ or card number also contains a CPF-shaped run of digits.
const PERSONAL = [
  /[\w.+-]+@[\w-]+(\.[\w-]+)+/g, // e-mail
  /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, // CNPJ
  /\b(?:\d{4}[ .-]?){3}\d{4}\b/g, // card number
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, // CPF
  /\b\d{8,}\b/g, // account numbers and other long ids
];

/** Whether the description is a transfer, which names a person instead of a store. */
export function isTransfer(description: string): boolean {
  return TRANSFER.test(description);
}

/**
 * The transaction description as sent to the external AI: transfers keep only their kind ("Pix enviado"),
 * and documents, card or account numbers and e-mails become "***". Merchant names stay, since they are
 * what the model categorizes by.
 */
export function maskForAI(description: string): string {
  const transfer = TRANSFER.exec(description);
  if (transfer) return transfer[1];
  let masked = description;
  for (const pattern of PERSONAL) masked = masked.replace(pattern, '***');
  return masked.replace(/\*\*\*(\s*\*\*\*)+/g, '***').replace(/\s+/g, ' ').trim();
}
