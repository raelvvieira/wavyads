import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, RotateCw, Check, Sparkles, ImageIcon, FileText } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import { proxiedImageUrl } from "@/lib/socialImage";
import type { ViralPost } from "@/hooks/useViralScraper";
import type { PostCopy } from "@/types/social";

interface Props {
  post: ViralPost;
  rawItem: any;
  onBack: () => void;
  onApprove: (copy: PostCopy) => void;
}

const STATUS_LABEL: Record<string, { label: string; tone: "ok" | "warn" | "err" }> = {
  ok: { label: "✅ extraído", tone: "ok" },
  sem_fala_detectada: { label: "⚠️ sem fala detectada", tone: "warn" },
  sem_texto_detectado: { label: "⚠️ sem texto detectado", tone: "warn" },
  sem_texto: { label: "⚠️ sem texto", tone: "warn" },
  erro_download: { label: "❌ imagem bloqueada", tone: "err" },
  ausente: { label: "— ausente", tone: "warn" },
  ocr_desabilitado: { label: "⚠️ OCR indisponível", tone: "warn" },
  erro_api: { label: "❌ erro", tone: "err" },
  erro_actor: { label: "❌ erro na transcrição", tone: "err" },
  erro_config: { label: "❌ não configurado", tone: "err" },
};

function StatusPill({ status }: { status?: string | null }) {
  if (!status) return null;
  const s = STATUS_LABEL[status] || { label: status, tone: "warn" as const };
  const cls = s.tone === "ok"
    ? "text-accent border-accent/40 bg-accent/10"
    : s.tone === "err"
    ? "text-destructive border-destructive/40 bg-destructive/10"
    : "text-white/60 border-white/15 bg-white/5";
  return <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>{s.label}</span>;
}

export function CopyExtractionStep({ post, rawItem, onBack, onApprove }: Props) {
  const [loading, setLoading] = useState(true);
  const [copy, setCopy] = useState<PostCopy | null>(null);
  const [consolidada, setConsolidada] = useState("");
  const [error, setError] = useState<string | null>(null);

  const extract = async () => {
    setLoading(true);
    setError(null);
    setCopy(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("social-extract-copy", {
        body: { item: rawItem },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setCopy(data as PostCopy);
      setConsolidada(data?.copy_consolidada || "");
      // Contabiliza uso de API
      const usage = data?.usage || { transcribe_calls: 0, ocr_calls: 0 };
      if (usage.transcribe_calls > 0) recordAiUsage("apify-transcribe", usage.transcribe_calls);
      if (usage.ocr_calls > 0) recordAiUsage("vision-ocr", usage.ocr_calls);
    } catch (e: any) {
      setError(e?.message || "Falha ao extrair copy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    extract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const tipoIcon = copy?.tipo === "reel" ? "📹" : copy?.tipo === "carrossel" ? "📑" : "🖼️";

  return (
    <GlassCard className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          {post.thumbnail ? (
            <img
              src={post.thumbnail}
              alt=""
              className="w-16 h-16 rounded-lg object-cover border border-white/10"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                const proxied = proxiedImageUrl(post.thumbnail);
                if (proxied && img.src !== proxied) img.src = proxied;
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white/30" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-accent mb-1">Etapa 1.5 · Extração de Copy</div>
            <h2 className="text-lg font-semibold">{tipoIcon} @{post.username}</h2>
            <p className="text-xs text-white/50 mt-0.5">
              {post.views ? `${(post.views / 1000).toFixed(0)}K views · ` : ""}
              {post.likes ? `${(post.likes / 1000).toFixed(0)}K likes` : ""}
            </p>
          </div>
        </div>
        <button onClick={onBack} className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>
      </div>

      {loading && (
        <div className="text-center py-14">
          <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto mb-4" />
          <p className="text-base text-white/80">
            🔍 Extraindo copy do post…
          </p>
          <p className="text-xs text-white/40 mt-2">
            {post.type === "Reel" ? "Transcrevendo áudio do reel (pode levar até 1 min)" : "Lendo texto das imagens (OCR)"}
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-10">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <button onClick={extract} className="btn-accent rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2">
            <RotateCw className="w-4 h-4" /> Tentar novamente
          </button>
        </div>
      )}

      {copy && !loading && (
        <div className="space-y-4">
          {copy.tipo === "reel" && (
            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-white/60">Transcrição do áudio</span>
                <StatusPill status={copy.status?.transcricao || undefined} />
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white/85 whitespace-pre-wrap min-h-[60px]">
                {copy.transcricao || <span className="text-white/30">— sem transcrição —</span>}
              </div>
            </section>
          )}

          {copy.tipo === "post_estatico" && (
            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-white/60">Texto na imagem (OCR)</span>
                <StatusPill status={copy.status?.ocr || undefined} />
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white/85 whitespace-pre-wrap min-h-[60px]">
                {copy.texto_visual || <span className="text-white/30">— sem texto detectado —</span>}
              </div>
            </section>
          )}

          {copy.tipo === "carrossel" && copy.slides && (
            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-white/60">Slides do carrossel (OCR)</span>
                <StatusPill status={copy.status?.ocr || undefined} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {copy.slides.map((s) => (
                  <div key={s.slide} className="rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-accent">Slide {s.slide}</span>
                      <StatusPill status={s.status} />
                    </div>
                    <p className="text-xs text-white/80 whitespace-pre-wrap min-h-[28px]">
                      {s.texto || <span className="text-white/30">—</span>}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/60">Legenda do post</span>
              <StatusPill status={copy.status?.legenda || undefined} />
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white/85 whitespace-pre-wrap min-h-[60px]">
              {copy.legenda || <span className="text-white/30">— sem legenda —</span>}
            </div>
            {copy.hashtags?.length > 0 && (
              <p className="text-[11px] text-white/40 mt-1">
                {copy.hashtags.slice(0, 12).map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
              </p>
            )}
          </section>

          <section className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs uppercase tracking-wider text-accent">Copy consolidada (editável)</span>
            </div>
            <textarea
              value={consolidada}
              onChange={(e) => setConsolidada(e.target.value)}
              className="w-full min-h-[200px] rounded-lg bg-white/[0.03] border border-accent/20 px-4 py-3 text-sm leading-relaxed text-white/90 focus:outline-none focus:border-accent/50 transition-colors resize-y font-mono"
              placeholder="Edite a copy consolidada — ela será usada como referência no pipeline."
            />
            <p className="text-[11px] text-white/40">
              <FileText className="inline w-3 h-3 mr-1" />
              Esse texto fica salvo no pipeline e alimenta a pesquisa e a geração de copy.
            </p>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2">
            <button
              onClick={extract}
              disabled={loading}
              className="glass rounded-lg px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2 hover:bg-white/5 disabled:opacity-50"
            >
              <RotateCw className="w-4 h-4" /> Re-extrair
            </button>
            <button
              onClick={() => {
                if (!consolidada.trim()) {
                  toast({ title: "Copy vazia", description: "Edite ou re-extraia antes de continuar.", variant: "destructive" });
                  return;
                }
                onApprove({ ...copy, copy_consolidada: consolidada.trim() });
              }}
              className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Usar esta copy →
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
