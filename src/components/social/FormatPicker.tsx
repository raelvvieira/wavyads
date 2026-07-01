import { useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopyPatternId, FormatoFamilia } from "@/types/social";

interface Props {
  onConfirm: (pattern_id: CopyPatternId, num_slides: number) => void;
}

interface Familia {
  id: FormatoFamilia;
  emoji: string;
  nome: string;
  desc: string;
  carrossel?: boolean;
  slidesMin?: number;
  slidesMax?: number;
  slidesDefault?: number;
  singlePattern?: CopyPatternId;
  variacoes?: { id: CopyPatternId; nome: string; desc: string }[];
}

type FamilyMeta = {
  badge: string;
  title: string;
  preview: string;
  accent: string;
  summary: string;
  copySignals: string[];
  bestFor: string[];
  avoid: string[];
};

type PatternMeta = {
  title: string;
  summary: string;
  preview: string;
  copySignals: string[];
  bestFor: string[];
  avoid: string[];
};

const FAMILIAS: Familia[] = [
  {
    id: "carrossel_direto",
    emoji: "⚡",
    nome: "Carrossel Direto",
    desc: "Hook BREAKING ou conflito de mundos. Alta conversao.",
    carrossel: true,
    slidesMin: 5,
    slidesMax: 8,
    slidesDefault: 6,
    variacoes: [
      {
        id: "1A",
        nome: "1A · Tutorial",
        desc: "Hook forte + passos executaveis + virada confessional + CTA direto.",
      },
      {
        id: "1B",
        nome: "1B · Conflito de Dois Mundos",
        desc: "Provoca, nomeia o vilao e contrasta resultados opostos com mais tensao.",
      },
    ],
  },
  {
    id: "carrossel_narrativo",
    emoji: "📖",
    nome: "Carrossel Narrativo",
    desc: "Caso real ou tese filosofica desdobrada em slides editoriais.",
    carrossel: true,
    slidesMin: 6,
    slidesMax: 10,
    slidesDefault: 7,
    variacoes: [
      {
        id: "2A",
        nome: "2A · Storytelling Analitico",
        desc: "Caso real de empresa como veiculo para um principio maior.",
      },
      {
        id: "2B",
        nome: "2B · Editorial Dark com Cinema",
        desc: "Tema filosofico, manchete longa e analogias fortes com clima de cinema.",
      },
    ],
  },
  {
    id: "reel",
    emoji: "🎬",
    nome: "Reel",
    desc: "Video 15-60s. Estrutura 0-3s hook -> 3-15s agitacao -> 15-35s desenvolvimento -> 35-50s virada -> 50-60s CTA.",
    singlePattern: "3",
  },
  {
    id: "post_frase",
    emoji: "🎯",
    nome: "Post Frase",
    desc: "Imagem unica + frase forte. Legenda longa em 5 movimentos.",
    singlePattern: "4",
  },
  {
    id: "frase_mestre",
    emoji: "🧠",
    nome: "Frase Mestre",
    desc: "Argumento unico desdobrado em slides interdependentes.",
    carrossel: true,
    slidesMin: 6,
    slidesMax: 9,
    slidesDefault: 7,
    singlePattern: "5",
  },
];

const FAMILY_META: Record<FormatoFamilia, FamilyMeta> = {
  carrossel_direto: {
    badge: "Template direto",
    title: "Base agressiva e curta",
    preview: "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 55%,#FD4638 100%)",
    accent: "#FD4638",
    summary: "A copy precisa chegar rapido no problema, na virada e na acao.",
    copySignals: ["Hook curto e forte", "Slides com ritmo de passo a passo", "CTA sem rodeios"],
    bestFor: ["Conversao rapida", "Tutoriais", "Narrativas de impacto"],
    avoid: ["Textos excessivamente abstratos", "Introducoes longas"],
  },
  carrossel_narrativo: {
    badge: "Template narrativo",
    title: "Base editorial e analitica",
    preview: "linear-gradient(135deg,#F5F2EE 0%,#E8E5E0 48%,#0D1B2A 100%)",
    accent: "#0D1B2A",
    summary: "A copy pode respirar mais, mas precisa manter a tese amarrada do inicio ao fim.",
    copySignals: ["Hook conceitual", "Encadeamento de argumento", "Fechamento com tese clara"],
    bestFor: ["Historia + explicacao", "Casos reais", "Textos mais densos"],
    avoid: ["Mensagens sem progressao", "Slides sem linha narrativa"],
  },
  reel: {
    badge: "Template video",
    title: "Roteiro falado e enxuto",
    preview: "linear-gradient(135deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)",
    accent: "#1DA1F2",
    summary: "Aqui a copy precisa caber em fala, tempo e corte de cena.",
    copySignals: ["Frases curtas", "Viradas rapidas", "Linguagem oral"],
    bestFor: ["Video curto", "Hook de abertura", "Ritmo de fala"],
    avoid: ["Paragrafos longos", "Estrutura visual de carrossel"],
  },
  post_frase: {
    badge: "Post unico",
    title: "Uma frase central domina",
    preview: "linear-gradient(160deg,#0A0A0A 0%,#1A2D40 55%,#FD4638 100%)",
    accent: "#FD4638",
    summary: "A copy precisa condensar uma ideia forte e deixar o restante em apoio.",
    copySignals: ["Frase-chave dominante", "Legenda de apoio", "Tensao entre imagem e texto"],
    bestFor: ["Manifesto curto", "Diagnostico", "Pergunta que divide"],
    avoid: ["Listas longas", "Explicacao passo a passo"],
  },
  frase_mestre: {
    badge: "Template manifesto",
    title: "Argumento em camadas",
    preview: "linear-gradient(135deg,#0D1520 0%,#1A2535 45%,#F5F2EE 100%)",
    accent: "#F5F2EE",
    summary: "A copy precisa construir uma tese, sustenta-la e voltar mais forte no fechamento.",
    copySignals: ["Tese + antitese", "Slides interdependentes", "Tom mais reflexivo"],
    bestFor: ["Texto profundo", "Argumento forte", "Narrativa de autoridade"],
    avoid: ["Falas genricas", "Pulsos visuais desconexos"],
  },
};

const PATTERN_META: Record<CopyPatternId, PatternMeta> = {
  "1A": {
    title: "1A · Tutorial",
    summary: "Hook forte + passos executaveis + virada confessional + CTA direto.",
    preview: "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#3D1414 100%)",
    copySignals: ["Passo a passo claro", "Ordem pratica", "CTA objetivo"],
    bestFor: ["Aula rapida", "Procedimento", "Conteudo aplicavel"],
    avoid: ["Textos muito literarios", "Metafora sem acao"],
  },
  "1B": {
    title: "1B · Conflito de Dois Mundos",
    summary: "Provoca, nomeia o vilao e contrasta resultados opostos com mais tensao.",
    preview: "linear-gradient(135deg,#F5F2EE 0%,#FD4638 100%)",
    copySignals: ["Choque de visoes", "Contraste numerico", "Frase de atrito"],
    bestFor: ["Polarizacao", "Mudar crença", "Fala de confronto"],
    avoid: ["Tom morno", "Texto sem oposicao"],
  },
  "2A": {
    title: "2A · Storytelling Analitico",
    summary: "Caso real de empresa como veiculo para um principio maior.",
    preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)",
    copySignals: ["Narrativa com prova", "Conceito bem explicado", "Ritmo editorial"],
    bestFor: ["Cases", "Explicacao de tese", "Conteudo longo"],
    avoid: ["Quebra de linha solta", "Copy sem contexto"],
  },
  "2B": {
    title: "2B · Editorial Dark com Cinema",
    summary: "Tema filosofico, manchete longa e analogias fortes com clima de cinema.",
    preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)",
    copySignals: ["Tese dramatica", "Frase editorial longa", "Atmosfera densa"],
    bestFor: ["Contraste", "Anuncio editorial", "Narrativa com peso"],
    avoid: ["Tom leve demais", "Texto sem profundidade"],
  },
  "3": {
    title: "3 · Reel",
    summary: "Roteiro falado e curto, feito para video com corte ritmico.",
    preview: "linear-gradient(135deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)",
    copySignals: ["Falado", "Ritmo rapido", "Frases curtas"],
    bestFor: ["Video curto", "Hook oral", "Sequencia de cenas"],
    avoid: ["Paragrafos longos", "Textao de carrossel"],
  },
  "4": {
    title: "4 · Post Frase",
    summary: "Uma frase central domina e a legenda apoia o impacto.",
    preview: "linear-gradient(135deg,#0A0A0A 0%,#1A2D40 55%,#FD4638 100%)",
    copySignals: ["Frase central", "Legenda curta/forte", "Impacto unico"],
    bestFor: ["Pensamento forte", "Diagnostico", "Pergunta polarizadora"],
    avoid: ["Estrutura em lista", "Explicacao extensa"],
  },
  "5": {
    title: "5 · Frase Mestre",
    summary: "Tese, antitese e prova social se encadeiam em um manifesto visual.",
    preview: "linear-gradient(135deg,#0D1520 0%,#1A2535 45%,#F5F2EE 100%)",
    copySignals: ["Argumento em camadas", "Fechamento forte", "Tese recorrente"],
    bestFor: ["Autoridade", "Manifesto", "Argumento profundo"],
    avoid: ["Copy genérica", "Mensagem sem progressao"],
  },
};

function selectFamilyPreview(meta: FamilyMeta, selected: boolean) {
  return cn(
    "group rounded-2xl border p-4 text-left transition-all duration-200",
    "min-h-[176px] flex flex-col justify-between",
    selected
      ? "border-accent/60 bg-accent/10 shadow-[0_0_0_1px_rgba(253,70,56,0.2)]"
      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]",
  );
}

function copyPanelTitle(selectedPattern: CopyPatternId | null, familia: Familia | null) {
  if (selectedPattern) return PATTERN_META[selectedPattern].title;
  if (familia) return FAMILY_META[familia.id].title;
  return "Escolha um template para ver o que muda na copy";
}

export function FormatPicker({ onConfirm }: Props) {
  const [familia, setFamilia] = useState<Familia | null>(null);
  const [pattern, setPattern] = useState<CopyPatternId | null>(null);
  const [numSlides, setNumSlides] = useState(7);

  const activeMeta = useMemo(() => {
    if (pattern) return PATTERN_META[pattern];
    if (familia) return FAMILY_META[familia.id];
    return null;
  }, [familia, pattern]);

  const selectFamilia = (f: Familia) => {
    setFamilia(f);
    setPattern(f.singlePattern || null);
    setNumSlides(f.slidesDefault || 7);
  };

  const backToFamilies = () => {
    setFamilia(null);
    setPattern(null);
  };

  const activePattern = pattern ?? familia?.singlePattern ?? null;
  const needsVariation = !!familia?.variacoes && !pattern;
  const canGenerate = !!activePattern && (!familia?.variacoes || !!pattern || !!familia?.singlePattern);

  const summaryPanel = (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-accent">O que muda na copy</div>
          <h3 className="mt-1 text-base font-semibold text-white">
            {copyPanelTitle(activePattern, familia)}
          </h3>
        </div>
        {familia ? (
          <button
            type="button"
            onClick={backToFamilies}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Trocar
          </button>
        ) : null}
      </div>

      {activeMeta ? (
        <div className="mt-4 space-y-4">
          <div className="h-24 rounded-2xl border border-white/10 p-3" style={{ background: activeMeta.preview }}>
            <div className="flex h-full flex-col justify-between">
              <span className="inline-flex w-fit rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur">
                {pattern ? PATTERN_META[pattern].title : FAMILY_META[familia!.id].badge}
              </span>
              <div className="max-w-[15rem] text-sm font-semibold leading-tight text-white drop-shadow">
                {activeMeta.summary}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs leading-relaxed text-white/60">
              {activeMeta.summary}
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Copy precisa ter</div>
            <div className="flex flex-wrap gap-2">
              {activeMeta.copySignals.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Funciona melhor em</div>
              <ul className="mt-2 space-y-1.5 text-sm text-white/75">
                {activeMeta.bestFor.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Evitar quando</div>
              <ul className="mt-2 space-y-1.5 text-sm text-white/65">
                {activeMeta.avoid.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/35" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-white/55">
          Selecione um template acima para ver como a copy muda e qual estrutura vai guiar a geracao.
        </div>
      )}

      {familia?.carrossel ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/80">Numero de slides</span>
            <span className="text-sm font-semibold text-accent">{numSlides}</span>
          </div>
          <div className="mt-3">
            <Slider
              value={[numSlides]}
              onValueChange={(v) => setNumSlides(v[0])}
              min={familia.slidesMin || 5}
              max={familia.slidesMax || 10}
              step={1}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-white/40">
            <span>{familia.slidesMin}</span>
            <span>{familia.slidesMax}</span>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => activePattern && onConfirm(activePattern, familia?.carrossel ? numSlides : 1)}
        disabled={!canGenerate}
        className={cn(
          "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
          canGenerate ? "btn-accent" : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35",
        )}
      >
        <Sparkles className="h-4 w-4" />
        {activePattern ? `Gerar copy para ${activePattern}` : "Escolha um template"}
      </button>
    </div>
  );

  return (
    <GlassCard className="mx-auto max-w-6xl overflow-hidden">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-accent">Etapa 3 · Template + Copy</div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Escolha a base visual que vai guiar a copy</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-white/55">
              Os templates abaixo sao a linguagem da etapa. A copy muda junto com a estrutura escolhida, para ficar
              coerente com o tipo de slide que sera gerado na etapa seguinte.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FAMILIAS.map((f) => {
              const meta = FAMILY_META[f.id];
              const selected = familia?.id === f.id;

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectFamilia(f)}
                  className={selectFamilyPreview(meta, selected)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-3xl">{f.emoji}</div>
                      <div className="mt-2 text-sm font-semibold text-white">{f.nome}</div>
                      <p className="mt-1 text-xs leading-relaxed text-white/55">{f.desc}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                      {meta.badge}
                    </span>
                  </div>

                  <div className="mt-4 h-16 rounded-xl border border-white/10 p-3" style={{ background: meta.preview }}>
                    <div className="flex h-full items-end justify-between">
                      <div className="text-left text-[10px] uppercase tracking-[0.15em] text-white/70">
                        Template
                      </div>
                      <div className="max-w-[10rem] text-right text-sm font-semibold leading-tight text-white">
                        {meta.title}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {familia?.variacoes?.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Variacao do template</div>
                  <h3 className="mt-1 text-base font-semibold text-white">{familia.nome}</h3>
                </div>
                <div className="text-xs text-white/45">
                  Escolha a versao que melhor combina com a copy.
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {familia.variacoes.map((v) => {
                  const selected = pattern === v.id;
                  const variantMeta = PATTERN_META[v.id];

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPattern(v.id)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        selected
                          ? "border-accent/60 bg-accent/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{v.nome}</div>
                          <p className="mt-1 text-xs leading-relaxed text-white/55">{v.desc}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                          {v.id}
                        </span>
                      </div>

                      <div className="mt-3 h-14 rounded-xl border border-white/10 p-2" style={{ background: variantMeta.preview }}>
                        <div className="flex h-full items-end justify-between">
                          <span className="text-[10px] uppercase tracking-[0.15em] text-white/70">Copy style</span>
                          <span className="max-w-[10rem] text-right text-[11px] font-semibold leading-tight text-white">
                            {variantMeta.title}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="xl:hidden">{summaryPanel}</div>
        </div>

        <aside className="hidden xl:block xl:sticky xl:top-6 xl:self-start">{summaryPanel}</aside>
      </div>
    </GlassCard>
  );
}
