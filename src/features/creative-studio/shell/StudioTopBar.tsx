import { Search, X } from 'lucide-react';
import type { CreativeAspectRatio } from '../types/creative';
import type { StudioAdvancedFilters } from '../state/advancedFilters';
import { StudioClientSelector, type StudioClientOption } from './StudioClientSelector';
import { StudioFiltersMenu } from './StudioFiltersMenu';

export interface StudioFilterChip {
  id: string;
  label: string;
}

interface StudioTopBarProps {
  clientName: string | null;
  clientId: string | null;
  clients: StudioClientOption[];
  onClientChange: (clientId: string | null) => void;
  query: string;
  onQueryChange: (value: string) => void;
  filters: StudioFilterChip[];
  onRemoveFilter: (id: string) => void;
  advancedFilters: StudioAdvancedFilters;
  onAdvancedFiltersChange: (value: StudioAdvancedFilters) => void;
  availableRatios: CreativeAspectRatio[];
}

/**
 * Barra contextual superior.
 *
 * O canto esquerdo já foi dois botões empilhados — um para trocar de
 * projeto, sem nada por trás; outro, o de cliente, que já funcionava. Um
 * gatilho quebrado ao lado de um que funciona lê como os dois quebrados.
 * Ficou só o `StudioClientSelector`, que herdou o destaque visual do que
 * saiu.
 *
 * A direita passou pela mesma limpeza, e pelo mesmo motivo. Havia três
 * gatilhos: "Filtros" e "Histórico de projetos", que só emitiam um aviso de
 * indisponível, e um "Novo projeto" em cor de destaque que apenas
 * desprendia o canvas do projeto atual — nada mudava na tela, então o botão
 * mais chamativo da barra era o que mais parecia quebrado.
 *
 * Sobrou o que tem dado por trás: os filtros, que `matchesFilters` já sabia
 * aplicar. Projeto continua sendo um recipiente interno — criado sozinho na
 * primeira geração, nunca batizado por ninguém —, e a única alça que o
 * usuário precisa dele é sair: o chip "Só este projeto", que já está em
 * `filters` e já é removível. Um histórico de doze linhas todas chamadas
 * "Novo projeto" seria pior que nenhum.
 *
 * É ilha de vidro porque é controle, não conteúdo.
 */
export function StudioTopBar({
  clientName,
  clientId,
  clients,
  onClientChange,
  query,
  onQueryChange,
  filters,
  onRemoveFilter,
  advancedFilters,
  onAdvancedFiltersChange,
  availableRatios,
}: StudioTopBarProps) {
  return (
    <header className="studio-topbar glass-island">
      <StudioClientSelector
        clientId={clientId}
        clientName={clientName}
        clients={clients}
        onChange={onClientChange}
      />

      <div className="studio-topbar-search">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar artes, prompts, formatos…"
          aria-label="Buscar no Studio"
          className="glass-input h-9 w-full rounded-[var(--wavy-radius-pill)] pl-9 pr-3 text-[13px]"
        />
      </div>

      {/* Filtros ativos vivem ao lado da busca porque são a mesma pergunta:
          o que está sendo mostrado agora. Escondê-los atrás do popover faria
          o canvas parecer vazio sem explicar por quê. */}
      {filters.length > 0 && (
        <div className="hidden items-center gap-1.5 xl:flex">
          {filters.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] py-1 pl-2.5 pr-1 text-[11px] text-white/78"
            >
              {f.label}
              <button
                type="button"
                onClick={() => onRemoveFilter(f.id)}
                aria-label={`Remover filtro ${f.label}`}
                className="rounded-full p-0.5 text-white/50 transition-colors duration-150 hover:bg-white/10 hover:text-white/90"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <StudioFiltersMenu
          value={advancedFilters}
          onChange={onAdvancedFiltersChange}
          availableRatios={availableRatios}
        />
      </div>
    </header>
  );
}
