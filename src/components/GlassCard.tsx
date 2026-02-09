import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass rounded-xl p-6 transition-all duration-300',
        hover && 'orange-glow-hover hover:scale-[1.02] cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
