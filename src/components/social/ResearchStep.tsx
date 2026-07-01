import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCw, Check, SkipForward, Sparkles, Wand2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import type { ViralPost } from "@/hooks/useViralScraper";
import type { CopyIntensificacao } from "@/types/social";

interface Props {
  post: ViralPost | null;
  initialTema?: string;
  initialAngulo?: string;
  copyReferencia?: string;
  onApprove: (briefing: CopyIntensificacao, tema: string) => void;
}

function captionFallback(post: ViralPost | null): string {
  if (!post) return "";
  const caption = (post.caption || "").replace(/\s+/g, " ").trim();
  return caption ? caption.split(" ").slice(0, 12).join(" ") : `Conteúdo de @${post.username}`;
}

function pickVoz(copy: string, angulo?: string): "Rael" | "Wavy" {
  const source = `${copy} ${angulo || ""}`.toLowerCase();
  return /(eu j[aá] vi|na minha experi|sendo honesto|eu acho|eu vejo)/i.test(source) ? "Rael" : "Wavy";
}

function makeFallbackBriefing(tema: string, copyReferencia?: string, angulo?: string): CopyIntensificacao {
  const ref = (copyReferencia || "").replace(/\s+/g, " ").trim();
  const snippet = ref ? ref.slice(0, 180) : "";

  return {
    tema: tema.trim() || "Tema de configuração",
    angulo: angulo?.trim() || "Leitura estratégica direta, sem desviar do assunto original.",
    voz: pickVoz(ref, angulo),
    referencia_resumo: snippet || "Referência sem copy consolidada.",
    tese_central: tema.trim() || "A copy final precisa defender o mesmo assunto com mais precisão.",
    gancho: "Abrir com conflito, curiosidade ou diagnóstico, sem diluir o assunto original.",
    dor_principal: "A leitura precisa mostrar o custo real de continuar como está.",
    conflito_principal: "O que o post mostra versus o que a audiência ainda acredita ser o caminho certo.",
    promessa: "Transformar a referência em uma copy mais clara, mais forte e mais aplicável ao template escolhido.",
    preservar: snippet ? [snippet.slice(0, 120)] : ["Manter o assunto central da referência."],
    ampliar: [
      "Tornar a tese mais nítida.",
      "Aumentar o contraste entre problema e virada.",
      "Levar a copy para um formato compatível com o template escolhido.",
    ],
    evitar: [
      "Copiar a referência literalmente.",
      "Abrir um tema novo fora da intenção original.",
      "Encher a copy de explicação solta.",
    ],
    provas_e_dados: ref ? [snippet || ref] : [],
    palavras_chave: tema.trim() ? tema.trim().split(/\s+/).slice(0, 5) : ["copy", "template", "copywriting"],
    briefing_texto: [
      `Tema refinado: ${tema.trim() || "Tema de configuração"}`,
      `Ângulo: ${angulo?.trim() || "Leitura estratégica direta"}`,
      `Tese: ${tema.trim() || "Reformular a referência sem mudar o assunto"}`,
      `Promessa: criar uma copy final mais precisa e alinhada ao template`,
    ].join(". "),
  };
}

function ChipList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ResearchStep({ post, initialTema, initialAngulo, copyReferencia, onApprove }: Props) {
  const [tema, setTema] = useState(initialTema || captionFallback(post));
  const [generatingTema, setGeneratingTema] = useState(false);
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<CopyIntensificacao | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasReference = useMemo(() => {
    const copy = copyReferencia?.trim() || "";
    return copy.length > 50 && !copy.startsWith("[");
  }, [copyReferencia]);

  useEffect(() => {
    setBriefing(null);
    setError(null);

    if (initialTema) {
      setTema(initialTema);
      return;
    }

    const copy = copyReferencia?.trim() || "";
    if (post?.id && hasReference) {
      setGeneratingTema(true);
      setTema("");
      supabase.functions
        .invoke("social-tema-gen", { body: { copy_consolidada: copy } })
        .then(({ data, error: fnErr }) => {
          if (!fnErr && !data?.error && data?.tema) {
            setTema(data.tema);
          } else {
            setTema(captionFallback(post));
          }
        })
        .catch(() => setTema(captionFallback(post)))
        .finally(() => setGeneratingTema(false));
      return;
    }

    setTema(captionFallback(post));
  }, [post, initialTema, copyReferencia, hasReference]);

  const run = async () => {
    if (!tema.trim()) {
      toast({ title: "Defina um tema", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError(null);
    setBriefing(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("social-research", {
        body: { tema: tema.trim(), angulo: initialAngulo || "", copy_referencia: copyReferencia || "" },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      const intensificacao = (data?.intensificacao as CopyIntensificacao | undefined) || makeFallbackBriefing(tema, copyReferencia, initialAngulo);
      setBriefing(intensificacao);
      if (data?.intensificacao || data?.briefing) recordAiUsage("text-claude-websearch", 1);
      if (!data?.intensificacao && !data?.briefing) {
        setError("A intensificação retornou vazia. Tente novamente.");
      }
    } catch (e: any) {
      setError(e?.message || "Falha ao intensificar");
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    if (!tema.trim()) {
      toast({ title: "Defina um tema antes de pular", variant: "destructive" });
      return;
    }
    setError(null);
    setBriefing(makeFallbackBriefing(tema.trim(), copyReferencia, initialAngulo));
  };

  const approve = () => {
    if (!briefing) return;
    onApprove(briefing, tema.trim());
  };

  if (generatingTema) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-accent animate-pulse" />
            <Loader2 className="h-5 w-5 text-accent animate-spin" />
          </div>
          <p className="text-base text-white/80">Analisando a referência e extraindo o tema…</p>
          <p className="text-xs text-white/40 mt-2">Preparando a intensificação para a próxima etapa</p>
        </div>
      </GlassCard>
    );
  }

  if (!loading && !briefing) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <div className="text-center py-6">
          <div className="text-xs uppercase tracking-wider text-accent mb-2">Etapa 2 · Intensificação</div>
          <h2 className="text-xl font-semibold mb-1">Tema detectado</h2>
          <p className="text-xs text-white/40 mb-4">
            Aqui a gente não cria a copy final. A gente intensifica a referência para a Etapa 3 decidir o template e recriar a mensagem.
          </p>
          <input
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            className="glass-input w-full rounded-lg px-4 py-3 text-sm mb-6 text-center"
            placeholder="Sobre o que intensificar?"
          />
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={run}
              className="btn-accent rounded-lg px-6 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <Wand2 className="h-4 w-4" /> Intensificar copy
            </button>
            <button
              onClick={skip}
              className="glass rounded-lg px-6 py-3 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-white/5"
              title="Usa apenas a referência do post para montar um brief inicial"
            >
              <SkipForward className="h-4 w-4" /> Usar referência
            </button>
          </div>
          {copyReferencia && (
            <p className="text-[11px] text-white/40 mt-3">
              A copy extraída do post serve como âncora, não como texto final.
            </p>
          )}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
      </GlassCard>
    );
  }

  if (loading) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto mb-4" />
          <p className="text-base text-white/80">
            🔍 Intensificando a referência sobre <span className="text-accent font-semibold">"{tema}"</span>...
          </p>
          <p className="text-xs text-white/40 mt-2">Isso pode levar alguns segundos</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="max-w-4xl mx-auto">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent mb-1">Etapa 2 · Intensificação</div>
          <h2 className="text-lg font-semibold">Brief estruturado da referência — {tema}</h2>
          <p className="text-xs text-white/45 mt-1">
            Este é o material que vai entrar na Etapa 3 junto com o template escolhido.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/70">
          Voz sugerida: <span className="text-white">{briefing.voz}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40">Tema refinado</div>
                <div className="mt-1 text-sm text-white/90">{briefing.tema}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40">Ângulo</div>
                <div className="mt-1 text-sm text-white/90">{briefing.angulo}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40">Gancho</div>
                <div className="mt-1 text-sm text-white/90">{briefing.gancho}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40">Promessa</div>
                <div className="mt-1 text-sm text-white/90">{briefing.promessa}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-3 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-wider text-white/40">Conflito principal</div>
                <div className="mt-1 text-sm text-white/90">{briefing.conflito_principal}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-accent mb-2">Síntese para a Etapa 3</div>
            <textarea
              value={briefing.briefing_texto}
              onChange={(e) => setBriefing((current) => current ? { ...current, briefing_texto: e.target.value } : current)}
              className="w-full min-h-[160px] rounded-lg bg-white/[0.03] border border-white/10 px-4 py-3 text-sm leading-relaxed text-white/90 focus:outline-none focus:border-accent/40 transition-colors resize-y"
            />
          </div>

          {briefing.referencia_resumo && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-2">Resumo da referência</div>
              <p className="text-sm leading-relaxed text-white/75">{briefing.referencia_resumo}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-2">Tese central</div>
            <p className="text-sm leading-relaxed text-white/80">{briefing.tese_central}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-2">Dor principal</div>
            <p className="text-sm leading-relaxed text-white/80">{briefing.dor_principal}</p>
          </div>

          <ChipList title="Preservar" items={briefing.preservar} />
          <ChipList title="Ampliar" items={briefing.ampliar} />
          <ChipList title="Evitar" items={briefing.evitar} />
          <ChipList title="Palavras-chave" items={briefing.palavras_chave} />
        </div>
      </div>

      {briefing.provas_e_dados.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-2">Provas e dados úteis</div>
          <ul className="space-y-2 text-sm text-white/75">
            {briefing.provas_e_dados.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3 justify-between mt-5">
        <button
          onClick={run}
          disabled={loading}
          className="glass rounded-lg px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2 hover:bg-white/5 disabled:opacity-50"
        >
          <RotateCw className="h-4 w-4" /> Intensificar novamente
        </button>
        <button
          onClick={approve}
          disabled={!briefing.briefing_texto.trim()}
          className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Ir para Template
        </button>
      </div>
    </GlassCard>
  );
}
