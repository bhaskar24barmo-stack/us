import { type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export interface CardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  variant?: 'glass' | 'solid' | 'glow';
  interactive?: boolean;
}

export function Card({
  children,
  variant = 'glass',
  interactive = false,
  className = '',
  ...props
}: CardProps) {
  const baseClasses = 'rounded-[26px] p-5 transition-all duration-200 overflow-hidden';

  const variantClasses = {
    glass: 'glass border border-white/15 shadow-sm',
    solid: 'glass-strong border border-white/20 shadow-lg',
    glow: 'glass border border-rose-500/30 shadow-glow-pink',
  }[variant];

  return (
    <motion.div
      whileHover={interactive ? { scale: 1.01 } : undefined}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
