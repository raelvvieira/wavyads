import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Alternador de tema: um ícone, dois estados.
 *
 * Mostra o destino, não o estado atual — no escuro aparece o sol, porque é
 * para lá que o clique leva. É o mesmo contrato de um interruptor de luz:
 * o rótulo diz o que vai acontecer.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const goingTo = theme === 'dark' ? 'claro' : 'escuro';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label={`Mudar para o tema ${goingTo}`}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
            'text-white/50 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white',
            className
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </button>
      </TooltipTrigger>
      {/* Abre para a esquerda: encostado na borda direita, "right" sairia da tela. */}
      <TooltipContent side="left" sideOffset={10}>
        Tema {goingTo}
      </TooltipContent>
    </Tooltip>
  );
}
