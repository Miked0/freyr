import { categorizationText, matchKeywordCategory } from './ai.service';
import { INVESTMENT_CATEGORY } from './categories';
import { isInvestmentMove } from './file.processor.service';

export interface Categorized {
  id: string;
  description: string;
  category: string;
}

export interface Recategorization {
  id: string;
  from: string;
  to: string;
}

const CATCH_ALL = 'Outros';

/**
 * New categories for entries saved before the rules recognized them: those left in Outros that a keyword rule
 * now matches, and investment moves filed anywhere else. Descriptions the user corrected by hand are kept.
 */
export function suggestRecategorizations(
  expenses: Categorized[],
  categories: string[],
  corrected: Set<string>
): Recategorization[] {
  const suggestions: Recategorization[] = [];
  for (const { id, description, category } of expenses) {
    if (corrected.has(description)) continue;
    let to: string | undefined;
    if (isInvestmentMove(description)) to = INVESTMENT_CATEGORY;
    else if (category === CATCH_ALL) to = matchKeywordCategory(categorizationText(description), categories);
    if (to && to !== category && categories.includes(to)) suggestions.push({ id, from: category, to });
  }
  return suggestions;
}
