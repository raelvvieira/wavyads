import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RotateCw, Check, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CopyAprovada, Slide, ReelCena, Formato, SlideTipo } from "@/types/social";

interface Props {
  formato: Formato;
  tema: string;
  initial: CopyAprovada;
  onApprove: (copy: CopyAprovada) => void;
  onRegenAll: () => void;
}

const TIPO_BADGE: Record<SlideTipo, { label: string; cls: string }> = {
  cover: { label: "CAPA", cls: "bg-accent/20 text-accent border-accent/40" },
  problema: { label: "PROBLEMA", cls: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  agitacao: { label: "AGITAÇÃO", cls: "bg-red-500/20 text-red-300 border-red-500/40" },
  solucao: { label: "SOLUÇÃO", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  lista: { label: "LISTA", cls: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  prova: { label: "PROVA", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
  cta: { label: "CTA", cls: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
};

export function CopyEditor({ formato, tema, initial, onApprove, onRegenAll }: Props) {
  const [copy, setCopy] = useState<CopyAprovada>(initial);
  const [rewriteOpen, setRewriteOpen] = useState<number | null>(null);
  const [rewriteText, setRewriteText] = useState("");
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [newHashtag, setNewHashtag] = useState("");

  const isReel = formato === "reel";

  const updateSlide = (i: number, patch: Partial<Slide>) => {
    setCopy((c) => ({
      ...c,
      slides: (c.slides || []).map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  };

  const updateCena = (i: number, patch: Partial<ReelCena>) => {
    setCopy((c) => ({
      ...c,
      roteiro: (c.roteiro || []).map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  };

  const handleRewrite = async () => {
    if (rewriteOpen === null || !rewriteText.trim()) return;
    setRewriteLoading(true);
    try {
      const target = isReel ? copy.roteiro?.[rewriteOpen] : copy.slides?.[rewriteOpen];
      const { data, error } = await supabase.functions.invoke("social-copy", {
        body: {
          mode: "rewrite",
          slide: target,
          instrucao: rewriteText.trim(),
          contexto: { tema, formato },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (isReel) updateCena(rewriteOpen, data);
      else updateSlide(rewriteOpen, data);
      toast({ title: "Slide reescrito" });
      setRewriteOpen(null);
      setRewriteText("");
    } catch (e: any) {
      toast({ title: "Falha ao reescrever", description: e.message, variant: "destructive" });
    } finally {
      setRewriteLoading(false);
    }
  };

  const removeHashtag = (i: number) =>
    setCopy((c) => ({ ...c, hashtags: c.hashtags.filter((_, idx) => idx !== i) }));

  const addHashtag = () => {
    if (!newHashtag.trim()) return;
    const tag = newHashtag.trim().replace(/^#?/, "#");
    setCopy((c) => ({ ...c, hashtags: [...c.hashtags, tag] }));
    setNewHashtag("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <GlassCard>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">Etapa 3 · Copy</div>
            <h2 className="text-lg font-semibold">Edite cada {isReel ? "cena" : "slide"} antes de aprovar</h2>
          </div>
          <button
            onClick={onRegenAll}
            className="glass rounded-lg px-3 py-2 text-xs inline-flex items-center gap-2 hover:bg-white/5"
          >
            <RotateCw className="h-3.5 w-3.5" /> Refazer tudo
          </button>
        </div>
      </GlassCard>

      {/* slides ou roteiro */}
      {!isReel &&
        copy.slides?.map((s, i) => (
          <GlassCard key={i}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-white/40">#{i + 1}</span>
                <Badge variant="outline" className={cn("border", TIPO_BADGE[s.tipo]?.cls)}>
                  {TIPO_BADGE[s.tipo]?.label || s.tipo.toUpperCase()}
                </Badge>
              </div>
              <button
                onClick={() => {
                  setRewriteOpen(i);
                  setRewriteText("");
                }}
                className="glass rounded-md p-1.5 hover:bg-white/10"
                title="Reescrever este slide"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              value={s.titulo}
              onChange={(e) => updateSlide(i, { titulo: e.target.value })}
              className="glass-input w-full rounded-lg px-3 py-2 text-base font-semibold mb-2"
              placeholder="Título do slide"
            />
            <Textarea
              value={s.corpo}
              onChange={(e) => updateSlide(i, { corpo: e.target.value })}
              className="glass-input w-full rounded-lg text-sm"
              rows={3}
              placeholder="Corpo do slide"
            />
          </GlassCard>
        ))}

      {isReel &&
        copy.roteiro?.map((c, i) => (
          <GlassCard key={i}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
                  CENA {i + 1}
                </Badge>
                <input
                  value={c.tempo}
                  onChange={(e) => updateCena(i, { tempo: e.target.value })}
                  className="glass-input rounded px-2 py-1 text-xs w-24"
                />
              </div>
              <button
                onClick={() => {
                  setRewriteOpen(i);
                  setRewriteText("");
                }}
                className="glass rounded-md p-1.5 hover:bg-white/10"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <label className="text-xs text-white/50 mb-1 block">Cena visual</label>
            <Textarea
              value={c.cena}
              onChange={(e) => updateCena(i, { cena: e.target.value })}
              className="glass-input w-full rounded-lg text-sm mb-2"
              rows={2}
            />
            <label className="text-xs text-white/50 mb-1 block">Fala / texto na tela</label>
            <Textarea
              value={c.fala}
              onChange={(e) => updateCena(i, { fala: e.target.value })}
              className="glass-input w-full rounded-lg text-sm"
              rows={2}
            />
          </GlassCard>
        ))}

      {/* Legenda */}
      <GlassCard>
        <h3 className="text-sm font-semibold mb-2">Legenda</h3>
        <Textarea
          value={copy.legenda}
          onChange={(e) => setCopy((c) => ({ ...c, legenda: e.target.value }))}
          className="glass-input w-full rounded-lg text-sm"
          rows={6}
        />
      </GlassCard>

      {/* Hashtags */}
      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Hashtags</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {copy.hashtags.map((h, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-xs text-accent"
            >
              {h}
              <button onClick={() => removeHashtag(i)} className="hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newHashtag}
            onChange={(e) => setNewHashtag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHashtag()}
            placeholder="adicionar hashtag"
            className="glass-input flex-1 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={addHashtag} className="glass rounded-lg px-3 hover:bg-white/5">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </GlassCard>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onApprove(copy)}
          className="btn-accent rounded-lg px-6 py-3 text-sm font-semibold inline-flex items-center gap-2"
        >
          <Check className="h-4 w-4" /> Aprovar Copy →
        </button>
      </div>

      {/* dialog rewrite */}
      <Dialog open={rewriteOpen !== null} onOpenChange={(o) => !o && setRewriteOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reescrever {isReel ? "cena" : "slide"}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rewriteText}
            onChange={(e) => setRewriteText(e.target.value)}
            placeholder="Ex: deixa mais agressivo, troca o exemplo, faz mais curto…"
            rows={4}
          />
          <DialogFooter>
            <button
              onClick={() => setRewriteOpen(null)}
              className="glass rounded-lg px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleRewrite}
              disabled={rewriteLoading || !rewriteText.trim()}
              className="btn-accent rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {rewriteLoading ? "Reescrevendo…" : "Reescrever"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
