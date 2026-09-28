export interface Expense {
  id: string;
  date: string; // ISO date string
  amount: number;
  description: string;
  category: string;
  rawDescription?: string; // Original from statement
  sourceFile?: string; // Name of uploaded file
}

export interface Category {
  id: string;
  name: string;
  isCustom: boolean;
  parentId?: string;
}

export interface UploadResult {
  success: boolean;
  expenses: Expense[];
  message?: string;
}
