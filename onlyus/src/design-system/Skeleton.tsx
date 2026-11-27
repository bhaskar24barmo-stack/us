export interface SkeletonProps {
  className?: string;
  rounded?: 'full' | 'card' | 'pill' | 'default';
}

export function Skeleton({ className = 'h-4 w-full', rounded = 'default' }: SkeletonProps) {
  const roundedClasses = {
    full: 'rounded-full',
    card: 'rounded-[24px]',
    pill: 'rounded-full',
    default: 'rounded-xl',
  }[rounded];

  return (
    <div
      className={`shimmer-bg bg-white/5 border border-white/5 ${roundedClasses} ${className}`}
    />
  );
}
