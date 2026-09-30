import React from 'react';

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  min?: string;
  max?: string;
}

const DateInput: React.FC<DateInputProps> = ({
  label,
  error,
  required = false,
  disabled = false,
  helperText,
  min,
  max,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label} {required && <span className="text-alert" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type="date"
        disabled={disabled}
        min={min}
        max={max}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          [error && errorId, helperText && helperId].filter(Boolean).join(' ') || undefined
        }
        className={`input w-full ${
          error ? 'border-alert focus:border-alert focus:ring-2 focus:ring-alert-soft' : ''
        } ${disabled ? 'opacity-45 cursor-not-allowed' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-ink-muted">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default DateInput;