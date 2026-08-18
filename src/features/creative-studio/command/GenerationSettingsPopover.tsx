import type { ReactElement } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ASPECT_CONFIG, RESOLUTION_CONFIG } from '../constants/formats';
import { MODEL_CAPABILITIES } from '../generation/capabilities';
import type { CreativeAspectRatio, CreativeResolution } from '../types/creative';

interface GenerationSettingsPopoverProps {
  ratio: CreativeAspectRatio;
  resolution: CreativeResolution;
  modelId: string;
  onRatioChange: (ratio: CreativeAspectRatio) => void;
  onResolutionChange: (resolution: CreativeResolution) => void;
  onModelChange: (modelId: string) => void;
  /** A cápsula de resumo do dock — o Popover precisa envolver o elemento real. */
  children: ReactElement;
}

const FORMATOS = Object.entries(ASPECT_CONFIG) as [CreativeAspectRatio, (typeof ASPECT_CONFIG)[CreativeAspectRatio]][];
const RESOLUCOES = Object.entries(RESOLUTION_CONFIG) as [CreativeResolution, (typeof RESOLUTION_CONFIG)[CreativeResolution]][];

// Só os modelos que GERAM — o de edição (`IMAGE_EDIT_MODEL`) não aparece
// aqui, porque este popover configura o próximo comando de criação, não
// a edição de uma arte existente.
const MODELOS_DE_GERACAO = MODEL_CAPABILITIES.filter((m) => !m.supportsEditing);

/**
 * Popover de geração.
 *
 * Um item real no seletor de modelo, não três decorativos — é a diferença
 * entre este popover e o da tela antiga, que `capabilities.ts` documenta
 * como gap (`model-selector-decorative`): lá o seletor mostra três Gemini
 * e a geração usa `gpt-image-2` fixo por baixo. Aqui o que aparece é o que
 * roda. Quando a Fase 7 trouxer mais modelos reais, a lista cresce sem
 * mudar de forma.
 *
 * Sem custo estimado: não existe fonte confiável de custo hoje (é o outro
 * gap documentado, `billing-uses-ui-model`) — inventar o número seria pior
 * que omiti-lo.
 */
export function GenerationSettingsPopover({
  ratio,
  resolution,
  modelId,
  onRatioChange,
  onResolutionChange,
  onModelChange,
  children,
}: GenerationSettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="glass w-72 border-white/10 p-3.5">
        <section>
          <p className="wavy-caps mb-1.5 text-[10px] font-semibold uppercase text-white/45">Formato</p>
          <div className="grid grid-cols-3 gap-1.5">
            {FORMATOS.map(([id, cfg]) => (
              <button
                key={id}
                type="button"
                onClick={() => onRatioChange(id)}
                aria-pressed={ratio === id}
                title={cfg.title}
                className={`rounded-[var(--wavy-radius-control)] border px-2 py-1.5 text-[12px] font-semibold transition-colors duration-150 ${
                  ratio === id
                    ? 'border-white/25 bg-white/[0.12] text-white/95'
                    : 'border-white/10 bg-white/[0.03] text-white/62 hover:bg-white/[0.07]'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-3.5">
          <p className="wavy-caps mb-1.5 text-[10px] font-semibold uppercase text-white/45">Resolução</p>
          <ToggleGroup
            type="single"
            value={resolution}
            // Radix permite desmarcar num toggle-group "single"; sem a
            // guarda, clicar na resolução já ativa apagaria a seleção.
            onValueChange={(v) => { if (v) onResolutionChange(v as CreativeResolution); }}
            className="justify-start gap-1.5"
          >
            {RESOLUCOES.map(([id]) => (
              <ToggleGroupItem
                key={id}
                value={id}
                className="h-7 rounded-[var(--wavy-radius-control)] border border-white/10 bg-white/[0.03] px-3 text-[12px] font-semibold data-[state=on]:border-white/25 data-[state=on]:bg-white/[0.12]"
              >
                {id}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section className="mt-3.5">
          <p className="wavy-caps mb-1.5 text-[10px] font-semibold uppercase text-white/45">Modelo</p>
          <Select value={modelId} onValueChange={onModelChange}>
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELOS_DE_GERACAO.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-[12px]">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {MODELOS_DE_GERACAO.length === 1 && (
            <p className="mt-1 text-[10px] text-white/40">Único modelo disponível hoje.</p>
          )}
        </section>
      </PopoverContent>
    </Popover>
  );
}
