import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="label-caption block mb-1.5" style={{ marginBottom: 5 }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'input w-full text-text-primary rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-brand',
            error ? 'border-danger focus:ring-danger' : '',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-[11px] text-danger">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

