import { motion } from 'framer-motion';
import { type ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = '💌',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center p-8 text-center glass rounded-3xl border border-[var(--glass-border)] space-y-3.5 my-4 ${className}`}
    >
      <div className="text-4xl select-none filter drop-shadow-md">{icon}</div>
      <div className="space-y-1 max-w-xs">
        <h4 className="text-base font-bold text-[var(--text-primary)]">{title}</h4>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
