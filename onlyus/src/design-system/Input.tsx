import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-[var(--text-muted)] pl-1">{label}</label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 pointer-events-none text-[var(--text-muted)]">{icon}</div>
          )}
          <input
            ref={ref}
            className={`w-full rounded-2xl bg-white/5 border border-[var(--glass-border)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200 focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 min-h-[44px] ${
              icon ? 'pl-10' : ''
            } ${error ? 'border-rose-500 focus:border-rose-500' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[var(--text-danger)] pl-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
