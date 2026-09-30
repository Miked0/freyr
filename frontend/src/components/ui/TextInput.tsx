import React from 'react';

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  required = false,
  disabled = false,
  helperText,
  leftIcon,
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
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            [error && errorId, helperText && helperId].filter(Boolean).join(' ') || undefined
          }
          className={`input w-full ${
            leftIcon ? 'pl-11' : ''
          } ${
            error ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger-soft' : ''
          } ${disabled ? 'opacity-45 cursor-not-allowed' : ''} ${className}`}
          {...props}
        />
      </div>
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

export default TextInput;