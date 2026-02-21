import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="label-caption block mb-1.5" style={{ marginBottom: 5 }}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'input w-full text-text-primary placeholder-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand',
              icon ? 'pl-9' : '',
              error ? 'border-danger focus:ring-danger' : '',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-[11px] text-danger">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
