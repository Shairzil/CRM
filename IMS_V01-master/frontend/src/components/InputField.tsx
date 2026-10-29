import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  error?: string;
  isSelect?: boolean;
  options?: { value: string | number; label: string }[];
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  isSelect = false,
  options = [],
  className = '',
  id,
  ...props
}) => {
  const inputId = id || label.replace(/\s+/g, '-').toLowerCase();
  
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      {isSelect ? (
        <select
          id={inputId}
          className={`w-full px-3 py-2 border rounded-lg bg-white shadow-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          {...(props as any)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          className={`w-full px-3 py-2 border rounded-lg bg-white shadow-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          onWheel={props.type === 'number' ? (e) => (e.currentTarget as HTMLInputElement).blur() : undefined}
          onKeyDown={props.type === 'number' ? (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
          } : undefined}
          {...(props as any)}
        />
      )}
      {error && <span className="text-xs font-bold text-red-500 mt-0.5">{error}</span>}
    </div>
  );
};
