// Design System v2.0 — Type Contracts
// Auto-generated index.d.ts for all UI components

import React from 'react';

// ============================================
// Button (existing - updated variants)
// ============================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  block?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

// ============================================
// PillButton (existing)
// ============================================
export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'light' | 'dark';
  icon?: React.ReactNode;
}

// ============================================
// Spinner (existing)
// ============================================
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================
// TextLink (existing)
// ============================================
export interface TextLinkProps {
  href: string;
  children: React.ReactNode;
}

// ============================================
// CategoryTag (existing)
// ============================================
export interface CategoryTagProps {
  category: string;
}

// ============================================
// Metric (existing)
// ============================================
export interface MetricProps {
  value: number;
  label: string;
  change?: number;
  trend?: 'up' | 'down';
}

// ============================================
// BentoCard (existing)
// ============================================
export interface BentoCardProps {
  children: React.ReactNode;
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  className?: string;
}

// ============================================
// Wordmark (existing)
// ============================================
export interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// ============================================
// Dropzone (existing)
// ============================================
export interface DropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string[];
  maxSize?: number;
  disabled?: boolean;
}

// ============================================
// ImportProgress (existing)
// ============================================
export interface ImportProgressProps {
  phase: 'uploading' | 'processing' | 'review' | 'saving';
  fileName: string;
  itemCount: number;
  totalAmount: number;
  onDiscardAll: () => void;
  onKeep: (selectedIds: string[]) => void;
}

export declare function formatBRL(amount: number, type?: 'income' | 'expense'): string;

// ============================================
// TextInput (NEW)
// ============================================
export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

// ============================================
// DateInput (NEW)
// ============================================
export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  min?: string;
  max?: string;
}

// ============================================
// SelectInput (NEW)
// ============================================
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectInputProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

// ============================================
// DataTable (NEW)
// ============================================
export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  render?: (value: unknown, row: T) => React.ReactNode;
  editable?: boolean;
  editType?: 'text' | 'number' | 'select';
  editOptions?: SelectOption[];
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onEdit?: (id: string, changes: Partial<T>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  sortable?: string[];
  getRowId: (row: T) => string;
  emptyMessage?: string;
  emptyDescription?: string;
  onExport?: () => void;
  exportDisabled?: boolean;
  exportLabel?: string;
  className?: string;
}

// ============================================
// LoginScreen (NEW)
// ============================================
export interface LoginScreenProps {
  onSuccess: () => void;
}

// ============================================
// Alert (NEW)
// ============================================
export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

export interface AlertProps {
  variant: AlertVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

// ============================================
// ReviewList (NEW)
// ============================================
export interface ReviewItem {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

export interface ReviewListProps {
  items: ReviewItem[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onKeepSelected?: () => void;
  onDiscardAll?: () => void;
  emptyMessage?: string;
  className?: string;
}

// ============================================
// DestructiveAction (NEW)
// ============================================
export interface DestructiveActionProps {
  label: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'delete' | 'discard';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  modalTitle?: string;
  modalMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

// ============================================
// ServerStatus (NEW)
// ============================================
export type ServerStatusType = 'online' | 'offline' | 'ai-active';

export interface ServerStatusProps {
  status: ServerStatusType;
  className?: string;
  showLabel?: boolean;
}

// ============================================
// Component exports (NEW)
// ============================================
export declare const TextInput: React.FC<TextInputProps>;
export declare const DateInput: React.FC<DateInputProps>;
export declare const SelectInput: React.FC<SelectInputProps>;
export declare const DataTable: <T extends Record<string, unknown>>(props: DataTableProps<T>) => React.ReactElement;
export declare const LoginScreen: React.FC<LoginScreenProps>;
export declare const Alert: React.FC<AlertProps>;
export declare const ReviewList: React.FC<ReviewListProps>;
export declare const DestructiveAction: React.FC<DestructiveActionProps>;
export declare const ServerStatus: React.FC<ServerStatusProps>;

// ============================================
// Existing component exports
// ============================================
export declare const Button: React.FC<ButtonProps>;
export declare const PillButton: React.FC<PillButtonProps>;
export declare const Spinner: React.FC<SpinnerProps>;
export declare const TextLink: React.FC<TextLinkProps>;
export declare const CategoryTag: React.FC<CategoryTagProps>;
export declare const Metric: React.FC<MetricProps>;
export declare const BentoCard: React.FC<BentoCardProps>;
export declare const Wordmark: React.FC<WordmarkProps>;
export declare const Dropzone: React.FC<DropzoneProps>;
export declare const ImportProgress: React.FC<ImportProgressProps>;