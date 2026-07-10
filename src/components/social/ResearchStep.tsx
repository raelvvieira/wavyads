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
    <GlassCard className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-accent mb-1">Etapa 2 · Intensificação</div>
        <h2 className="text-lg font-semibold">Brief estruturado — {tema}</h2>
        <p className="text-xs text-white/45 mt-2">
          Edite o briefing abaixo. Este é o material que vai entrar na Etapa 3 junto com o template escolhido.
        </p>
      </div>

      <div className="space-y-6">
        {/* Contexto rápido */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Tema</div>
            <div className="text-xs font-medium text-white/90 line-clamp-2">{briefing.tema}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Ângulo</div>
            <div className="text-xs font-medium text-white/90 line-clamp-2">{briefing.angulo}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Voz</div>
            <div className="text-xs font-medium text-accent">{briefing.voz}</div>
          </div>
        </div>

        {/* Campo crítico: Briefing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-white">Síntese para a Etapa 3</label>
            <span className="text-[11px] text-white/40">Campo editável</span>
          </div>
          <textarea
            value={briefing.briefing_texto}
            onChange={(e) => setBriefing((current) => current ? { ...current, briefing_texto: e.target.value } : current)}
            className="w-full min-h-[200px] rounded-lg bg-white/[0.03] border border-white/10 px-4 py-3 text-sm leading-relaxed text-white/90 focus:outline-none focus:border-accent/50 transition-colors resize-y"
            placeholder="Briefing será gerado aqui..."
          />
          <p className="text-[11px] text-white/40">
            💡 Dica: Edite este texto livremente. Ele é enviado para a Etapa 3 como contexto para a IA gerar a copy final.
          </p>
        </div>

        {/* Visual Strategy (Moodboard) */}
        <div className="rounded-lg border border-accent/20 bg-accent/[0.05] p-4">
          <div className="text-xs uppercase tracking-wider text-accent font-semibold mb-4">🎨 Estratégia Visual (Moodboard)</div>

          <div className="space-y-4">
            {/* Tom Visual */}
            <div>
              <div className="text-[11px] font-medium text-white/70 mb-2">Tom Visual</div>
              <div className="space-y-2">
                {(["cinematic", "editorial", "minimalist"] as const).map((strategy) => (
                  <label key={strategy} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="visual_strategy"
                      value={strategy}
                      checked={briefing.visual_strategy === strategy}
                      onChange={(e) => setBriefing((current) => current ? { ...current, visual_strategy: e.target.value as any } : current)}
                      className="w-4 h-4 accent-accent"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white group-hover:text-accent transition-colors">
                        {strategy === "cinematic" && "🎬 Cinematográfico"}
                        {strategy === "editorial" && "📰 Editorial"}
                        {strategy === "minimalist" && "✨ Minimalista"}
                      </div>
                      <div className="text-[11px] text-white/50">
                        {strategy === "cinematic" && "Drama, pessoas, CEO, narrativa, emoção"}
                        {strategy === "editorial" && "Jornalístico, dados, cases, números, resultado"}
                        {strategy === "minimalist" && "Abstrato, conceitual, gradientes, statement"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Cor Primária */}
            <div>
              <div className="text-[11px] font-medium text-white/70 mb-2">Cor Primária</div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={briefing.cor_primaria_hex || "#00D9FF"}
                  onChange={(e) => setBriefing((current) => current ? { ...current, cor_primaria_hex: e.target.value } : current)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-white/10"
                />
                <input
                  type="text"
                  value={briefing.cor_primaria_hex || "#00D9FF"}
                  onChange={(e) => setBriefing((current) => current ? { ...current, cor_primaria_hex: e.target.value } : current)}
                  className="glass-input flex-1 rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="#00D9FF"
                />
              </div>
            </div>

            {/* Influência Visual */}
            <div>
              <div className="text-[11px] font-medium text-white/70 mb-2">Influência Visual</div>
              <input
                type="text"
                value={briefing.influencia_visual || ""}
                onChange={(e) => setBriefing((current) => current ? { ...current, influencia_visual: e.target.value } : current)}
                placeholder="ex: Bloomberg meets Wired"
                className="w-full glass-input rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-white/40 mt-1">Referência visual que norteia a geração de imagens</p>
            </div>
          </div>
        </div>

        {/* Expandível: Contexto adicional */}
        <details className="group cursor-pointer">
          <summary className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded border border-white/20 group-open:bg-accent/20 transition-colors" />
            Ver contexto completo (Tese, Dor, Estratégia)
          </summary>
          <div className="mt-4 space-y-3 pl-6 border-l border-white/10">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Tese central</div>
              <p className="text-sm text-white/80">{briefing.tese_central}</p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Dor principal</div>
              <p className="text-sm text-white/80">{briefing.dor_principal}</p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Gancho</div>
              <p className="text-sm text-white/80">{briefing.gancho}</p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Promessa</div>
              <p className="text-sm text-white/80">{briefing.promessa}</p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Conflito principal</div>
              <p className="text-sm text-white/80">{briefing.conflito_principal}</p>
            </div>
            <div className="space-y-2 pt-2">
              <ChipList title="Preservar" items={briefing.preservar} />
              <ChipList title="Ampliar" items={briefing.ampliar} />
              <ChipList title="Evitar" items={briefing.evitar} />
              <ChipList title="Palavras-chave" items={briefing.palavras_chave} />
            </div>
          </div>
        </details>

        {/* Provas (se existirem) */}
        {briefing.provas_e_dados.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-2">Provas e dados</div>
            <ul className="space-y-1 text-sm text-white/70">
              {briefing.provas_e_dados.slice(0, 3).map((item) => (
                <li key={item} className="flex gap-2 text-xs">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/60" />
                  <span className="line-clamp-1">{item}</span>
                </li>
              ))}
              {briefing.provas_e_dados.length > 3 && (
                <li className="text-xs text-white/40">+{briefing.provas_e_dados.length - 3} mais</li>
              )}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2 border-t border-white/10">
          <button
            onClick={run}
            disabled={loading}
            className="glass rounded-lg px-4 py-2.5 text-sm font-medium inline-flex items-center justify-center sm:justify-start gap-2 hover:bg-white/5 disabled:opacity-50"
          >
            <RotateCw className="h-4 w-4" /> Intensificar novamente
          </button>
          <button
            onClick={approve}
            disabled={!briefing.briefing_texto.trim()}
            className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Ir para Template
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
