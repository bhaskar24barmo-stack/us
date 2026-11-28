import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  haptic?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  haptic = true,
  disabled,
  className = '',
  onClick,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-colors select-none focus:outline-none focus:ring-2 focus:ring-rose-500/50 disabled:opacity-50 disabled:pointer-events-none';

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-1.5 rounded-full min-h-[36px]',
    md: 'text-sm px-5 py-2.5 rounded-full min-h-[44px] min-w-[44px]',
    lg: 'text-base px-6 py-3.5 rounded-full min-h-[50px] min-w-[50px]',
  }[size];

  const variantClasses = {
    primary:
      'bg-love-gradient text-white shadow-glow-pink hover:brightness-105 active:brightness-95',
    secondary:
      'glass hover:bg-white/10 active:bg-white/15 text-[var(--text-primary)] border border-[var(--glass-border)]',
    ghost:
      'bg-transparent hover:bg-white/5 active:bg-white/10 text-[var(--text-primary)] opacity-85 hover:opacity-100',
    danger:
      'bg-rose-500/15 text-[var(--text-danger)] border border-rose-500/35 hover:bg-rose-500/25',
  }[variant];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    if (haptic) {
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
    onClick?.(e);
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.96 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      disabled={disabled || loading}
      onClick={handleClick}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          <span>Please wait...</span>
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
