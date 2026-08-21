import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CreativeAspectRatio } from '../types/creative';
import {
  SEM_FILTROS_AVANCADOS,
  STATUS_FILTER_OPTIONS,
  hasAdvancedFilters,
  type StudioAdvancedFilters,
} from '../state/advancedFilters';

interface StudioFiltersMenuProps {
  value: StudioAdvancedFilters;
  onChange: (value: StudioAdvancedFilters) => void;
  /** Formatos presentes no acervo em vista — ver `availableAspectRatios`. */
  availableRatios: CreativeAspectRatio[];
}

/**
 * Filtros avançados do topo.
 *
 * O ícone existia antes e só disparava um aviso de "ainda não disponível".
 * O dado sempre esteve lá: `matchesFilters` já sabia cortar por formato e
 * por situação — faltava a porta. Escolher aqui vira chip removível ao lado
 * da busca, então nunca fica um corte ativo escondido dentro do popover.
 *
 * Tipo de arte não entra: a ilha da esquerda (Gerações, Referências,
 * Produtos, Avatares…) já é esse filtro, e repeti-lo aqui criaria dois
 * controles que podem discordar.
 */
export function StudioFiltersMenu({ value, onChange, availableRatios }: StudioFiltersMenuProps) {
  const [open, setOpen] = useState(false);
  const ativo = hasAdvancedFilters(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filtros"
          title="Filtros"
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wavy-focus)]',
            ativo
              ? 'border-white/20 bg-white/[0.10] text-white/92'
              : 'border-white/10 bg-white/[0.04] text-white/62 hover:bg-white/[0.08] hover:text-white/90',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="glass w-64 border-white/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="wavy-caps text-[10px] font-semibold uppercase text-white/45">Filtros</span>
          {ativo && (
            <button
              type="button"
              onClick={() => onChange(SEM_FILTROS_AVANCADOS)}
              className="text-[11px] font-medium text-white/55 transition-colors duration-150 hover:text-white/90"
            >
              Limpar
            </button>
          )}
        </div>

        <Secao titulo="Formato">
          {availableRatios.length === 0 ? (
            <p className="text-[11px] text-white/40">Nenhum formato no acervo em vista.</p>
          ) : (
            availableRatios.map((r) => (
              <Pilula
                key={r}
                label={r}
                // Clicar no que já está escolhido desliga — sem isso, o único
                // caminho de volta seria o chip, que some da barra em telas
                // estreitas.
                ativo={value.aspectRatio === r}
                onClick={() => onChange({ ...value, aspectRatio: value.aspectRatio === r ? null : r })}
              />
            ))
          )}
        </Secao>

        <Secao titulo="Situação">
          {STATUS_FILTER_OPTIONS.map((o) => (
            <Pilula
              key={o.id}
              label={o.label}
              ativo={value.status === o.id}
              onClick={() => onChange({ ...value, status: value.status === o.id ? null : o.id })}
            />
          ))}
        </Secao>
      </PopoverContent>
    </Popover>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[11px] font-medium text-white/55">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pilula({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wavy-focus)]',
        ativo
          ? 'border-accent/45 bg-accent/15 text-white/92'
          : 'border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/[0.09] hover:text-white/90',
      )}
    >
      {label}
    </button>
  );
}
