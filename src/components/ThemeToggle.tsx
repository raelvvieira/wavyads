import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Claro' },
  { value: 'dark', icon: Moon, label: 'Escuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
];

/**
 * Seletor de tema.
 *
 * Três opções em vez de um interruptor de duas porque "sistema" não é o
 * mesmo que "claro": quem fica em sistema acompanha o aparelho escurecer à
 * noite; quem escolheu claro não vira nunca. Um interruptor binário obriga
 * a abandonar essa escolha em silêncio.
 *
 * `showLabels` acompanha o estado da ilha: recolhida aparece só o ícone da
 * opção ativa, com tooltip; aberta aparece o grupo inteiro.
 */
export function ThemeToggle({ showLabels }: { showLabels: boolean }) {
  const { preference, setPreference } = useTheme();
  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[2];

  if (!showLabels) {
    // Recolhida não cabe o grupo, e um alvo de 24px seria ruim de acertar.
    // Um botão só, que cicla entre as três, mantém o alvo cheio.
    const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setPreference(next.value)}
            aria-label={`Tema: ${current.label}. Trocar para ${next.label}`}
            className="flex h-11 w-full items-center rounded-[14px] text-white/50 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
          >
            <span className="flex w-[52px] min-w-[52px] items-center justify-center">
              <current.icon className="h-5 w-5" />
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          Tema: {current.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className="mx-1 flex items-center gap-0.5 rounded-[14px] border border-white/10 bg-white/[0.03] p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = o.value === preference;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(o.value)}
            title={o.label}
            className={cn(
              'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[11px] text-[11px] font-medium',
              'transition-[background-color,color] duration-200',
              active
                ? 'bg-[color-mix(in_srgb,var(--wavy-surface-elevated)_88%,var(--wavy-brand-orange)_12%)] text-white'
                : 'text-white/55 hover:text-white'
            )}
          >
            <o.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
