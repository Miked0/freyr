export function formatBRL(amount: number, type?: 'income' | 'expense'): string {
  const absAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  // Intl.NumberFormat outputs "R$ 1.000,00" (with non-breaking space U+00A0 after R$)
  // Remove the currency symbol and space, then add our own with regular space
  const numericPart = formatted.replace(/^R\$\s*/, '').replace(/\u00A0/g, ' ');

  if (type === 'income') {
    return `+R$ ${numericPart}`;
  }
  
  if (type === 'expense') {
    return `−R$ ${numericPart}`;
  }

  // Default: show sign based on amount
  return amount >= 0 ? `+R$ ${numericPart}` : `−R$ ${numericPart}`;
}