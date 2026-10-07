import { categorizationText } from './ai.service';
import { isTransfer, maskForAI } from './mask';

/**
 * The store as the platform keeps it when a user files it under a custom category: the kind of transaction and the city cut, documents
 * and account numbers masked, lower case. Transfers have no store, only a person, so they give none.
 */
export function storePattern(description: string): string | undefined {
  if (isTransfer(description)) return undefined;
  const text = categorizationText(description);
  // "Compra no debito - Petz": the kind of transaction says nothing about the store.
  const store = text.includes(' - ') ? text.slice(text.indexOf(' - ') + 3) : text;
  return maskForAI(store).toLowerCase();
}
