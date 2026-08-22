import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { buildGenerationRequest } from '../generation/generationRequests';
import type { CreativeAspectRatio } from '../types/creative';

/**
 * Bancada de prompt.
 *
 * Nasceu de um estudo comparativo: as artes do Fator Criativo saíam com
 * design em camadas e as da geração normal saíam lisas, e a única forma de
 * descobrir por quê foi pôr os dois prompts finais lado a lado. Isso foi
 * feito à mão, colando texto de um chat — o que não se repete e não vira
 * regressão.
 *
 * Aqui cada camada tem um interruptor, e o prompt final aparece inteiro. É
 * possível ver, sem gastar uma geração, exatamente que texto some quando a
 * direção de arte falha, ou o que a leitura das referências acrescenta.
 *
 * A entrada padrão é o caso real que originou a mudança — clínica
 * odontológica, copy de duas linhas, sem nada digitado no dock.
 */

const COPY_DO_CASO = 'Diga adeus aos dentes amarelados\nLimpeza e Clareamento com condições especiais no combo';

const DIRECAO_DO_CASO = {
  mainSubject: 'Uma dentista de luvas aproximando a escala de cor do sorriso da paciente, close no rosto de três quartos',
  composition: 'Foto sangrando no frame inteiro, sujeito na metade inferior; massa de texto agrupada no terço superior sobre a área mais clara da imagem',
  mood: 'higiênico, luz natural difusa, saturação baixa',
};

const PAPEIS_DO_CASO = {
  titulo: 'Diga adeus aos dentes amarelados',
  subtitulo: 'Limpeza e Clareamento com condições especiais no combo',
};

const SISTEMA_DO_CASO = `## Palette
Dominant off-white #F4F0E8, secondary warm brown #8A6A4F, accent #C08457.
## Typography
Primary: high-contrast serif (Playfair Display style), light weight (300) for headlines.
Secondary: humanist sans (Jost style), regular (400) for body.
## Layers
Layer 1 — Background: full-bleed photograph, warm overlay at 7%.
Layer 2 — Gradient: bottom-to-top rgba(244,240,232,0.9) to rgba(244,240,232,0), covering 45% from the top, for text legibility.
Layer 3 — Text block: left-aligned, starting at 18% from the top.`;

const ANTI_PADROES_DO_CASO = [
  'NEVER use cold blue clinical lighting — it breaks the warm editorial palette',
  'NEVER fill the negative space around the headline with decorative elements',
];

interface Camadas {
  direcao: boolean;
  papeis: boolean;
  sistema: boolean;
}

export function PromptLab() {
  const [camadas, setCamadas] = useState<Camadas>({ direcao: true, papeis: true, sistema: true });
  const [brief, setBrief] = useState('');
  const [copy, setCopy] = useState(COPY_DO_CASO);
  const [ratio, setRatio] = useState<CreativeAspectRatio>('9:16');

  const prompt = useMemo(() => buildGenerationRequest({
    brief,
    aspectRatio: ratio,
    resolution: '2K',
    copy,
    logoImageUrl: 'https://exemplo/logo.png',
    productImageUrls: ['https://exemplo/ref-1.png', 'https://exemplo/ref-2.png'],
    artDirection: camadas.direcao ? DIRECAO_DO_CASO : null,
    copyBlocks: camadas.papeis ? PAPEIS_DO_CASO : null,
    designSystemDoc: camadas.sistema ? SISTEMA_DO_CASO : null,
    antiPadroes: camadas.sistema ? ANTI_PADROES_DO_CASO : null,
    mood: camadas.sistema
      ? { adjetivos: ['sofisticado', 'acolhedor'], referencias: ['Kinfolk'], evita: ['clipart'] }
      : null,
  }).prompt, [brief, copy, ratio, camadas]);

  const alternar = (chave: keyof Camadas) =>
    setCamadas((atual) => ({ ...atual, [chave]: !atual[chave] }));

  return (
    <div className="studio-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white/92">Bancada de prompt</h1>
          <p className="text-[13px] text-white/50">
            Cada camada com um interruptor, o prompt final inteiro — sem gastar geração
          </p>
        </div>
        <p className="text-[11px] text-white/40">{prompt.length.toLocaleString('pt-BR')} caracteres</p>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        <Interruptor ativo={camadas.direcao} onClick={() => alternar('direcao')} label="[ART DIRECTION]" />
        <Interruptor ativo={camadas.papeis} onClick={() => alternar('papeis')} label="Papéis tipográficos" />
        <Interruptor ativo={camadas.sistema} onClick={() => alternar('sistema')} label="[DESIGN SYSTEM] + mood" />
        <select
          value={ratio}
          onChange={(e) => setRatio(e.target.value as CreativeAspectRatio)}
          aria-label="Formato"
          className="glass-input h-8 rounded-[var(--wavy-radius-control)] px-2 text-[12px]"
        >
          {(['9:16', '4:5', '1:1', '16:9'] as CreativeAspectRatio[]).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium text-white/55" htmlFor="lab-brief">
            Texto do dock
          </label>
          <textarea
            id="lab-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder="(vazio — foi assim no caso original)"
            className="glass-input rounded-[var(--wavy-radius-control)] p-2 text-[12px]"
          />
          <label className="text-[11px] font-medium text-white/55" htmlFor="lab-copy">
            Copy anexada
          </label>
          <textarea
            id="lab-copy"
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            rows={6}
            className="glass-input rounded-[var(--wavy-radius-control)] p-2 text-[12px]"
          />
        </div>

        {/* `whitespace-pre-wrap` porque as linhas do prompt são longas de
            verdade — sem quebra, ler o bloco exige rolar para o lado e a
            comparação entre duas versões deixa de ser possível de olho. */}
        <pre className="max-h-[78vh] overflow-y-auto whitespace-pre-wrap break-words rounded-[var(--wavy-radius-card)] border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/78">
          {prompt}
        </pre>
      </div>
    </div>
  );
}

function Interruptor({ ativo, onClick, label }: { ativo: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        'rounded-full border px-3 py-1 text-[11px] font-medium transition-colors duration-150',
        ativo
          ? 'border-accent/45 bg-accent/15 text-white/92'
          : 'border-white/10 bg-white/[0.05] text-white/55 hover:bg-white/[0.09]',
      )}
    >
      {label}
    </button>
  );
}
