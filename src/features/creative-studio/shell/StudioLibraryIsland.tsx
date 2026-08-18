import { useCallback, useEffect, useRef, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudioLibraryEntry, StudioLibraryId } from '../types/studioUi';

interface StudioLibraryIslandProps {
  entries: StudioLibraryEntry[];
  activeId: StudioLibraryId;
  onSelect: (id: StudioLibraryId) => void;
  /** O shell precisa saber a largura visível para afastar o canvas. */
  onExpandedChange?: (expanded: boolean) => void;
}

/**
 * Ilha de bibliotecas do Studio.
 *
 * É a segunda ilha da tela — a primeira é a navegação do app. Ela existe
 * porque "onde estou no produto" e "que acervo estou olhando" são perguntas
 * diferentes: misturar as duas numa lista só faria um destino de rota
 * conviver com um filtro de conteúdo, e o usuário perderia o rastro de qual
 * dos dois acabou de mudar.
 *
 * Mesmo contrato da ilha principal: clique fixa, hover é adicional, e o
 * conteúdo é EMPURRADO em qualquer estado que alargue — sobreposição aqui
 * esconderia a primeira coluna do canvas.
 */
export function StudioLibraryIsland({
  entries,
  activeId,
  onSelect,
  onExpandedChange,
}: StudioLibraryIslandProps) {
  const [pinned, setPinned] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const showLabels = pinned || previewing || focusWithin;

  useEffect(() => {
    onExpandedChange?.(showLabels);
  }, [showLabels, onExpandedChange]);

  // Escape limpa TODOS os estados abertos. Limpar só o fixado faz a tecla
  // parecer quebrada enquanto a ilha continua aberta pelo ponteiro.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    setPinned(false);
    setPreviewing(false);
    setFocusWithin(false);
    (e.currentTarget as HTMLElement).blur();
  }, []);

  return (
    <nav
      ref={ref}
      aria-label="Bibliotecas do Studio"
      data-expanded={showLabels}
      className="studio-library-island"
      // `!== 'touch'` e não `=== 'mouse'`: ambiente que não informa o tipo
      // desabilitaria o hover inteiro, e caneta também paira.
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') setPreviewing(true); }}
      onPointerLeave={() => setPreviewing(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusWithin(false); }}
      onKeyDown={handleKeyDown}
    >
      <ul className="studio-library-list">
        {entries.map((entry) => {
          const Icon = entry.icon;
          const active = entry.id === activeId;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                aria-current={active ? 'true' : undefined}
                // Tooltip só enquanto o rótulo está escondido; com o rótulo
                // à vista ele vira eco.
                title={showLabels ? undefined : entry.label}
                data-active={active}
                className="studio-library-item"
              >
                <span className="studio-library-icon">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="wavy-nav-label flex-1 text-left text-[13px] font-medium">
                  {entry.label}
                </span>
                {entry.count !== undefined && (
                  <span
                    className={cn(
                      'wavy-nav-label metric-number shrink-0 rounded-full px-1.5 py-0.5 text-[10px]',
                      active ? 'bg-white/14 text-white/85' : 'bg-white/[0.07] text-white/55',
                    )}
                  >
                    {entry.count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* O clique é obrigatório: teclado e toque não têm hover, e rótulo
          alcançável só por ponteiro é rótulo que parte dos usuários nunca lê. */}
      <button
        type="button"
        onClick={() => setPinned((v) => !v)}
        aria-expanded={showLabels}
        aria-label={pinned ? 'Recolher bibliotecas' : 'Expandir bibliotecas'}
        className="studio-library-item mt-auto"
      >
        <span className="studio-library-icon">
          {pinned ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeftOpen className="h-[18px] w-[18px]" />}
        </span>
        <span className="wavy-nav-label flex-1 text-left text-[13px] font-medium">
          {pinned ? 'Recolher' : 'Expandir'}
        </span>
      </button>
    </nav>
  );
}
