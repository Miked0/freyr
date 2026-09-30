import React from 'react';

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

const SelectInput: React.FC<SelectInputProps> = ({
  label,
  error,
  required = false,
  disabled = false,
  helperText,
  options,
  placeholder,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="field-label">
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          [error && errorId, helperText && helperId].filter(Boolean).join(' ') || undefined
        }
        className={`input w-full ${
          error ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger-soft' : ''
        } ${disabled ? 'opacity-45 cursor-not-allowed' : ''} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default SelectInput;