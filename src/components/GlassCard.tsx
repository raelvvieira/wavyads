import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        // rounded-2xl = 16px, o raio de card do padrão WAVY.
        // Transição só do que muda: animar tudo mexe em layout à toa.
        'glass rounded-2xl p-6 transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
        // Escala em card grande chega a deslocar o conteúdo vizinho;
        // um leve levantar comunica o mesmo sem mexer no layout.
        hover && 'accent-glow-hover cursor-pointer hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
