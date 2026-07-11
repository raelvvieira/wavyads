import { useState } from "react";
import { ArrowLeft, RotateCcw, Check, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { WavyStyle } from "@/lib/wavyImageStyles";

interface Props {
  styles: WavyStyle[];
  onSave: (styleId: string, promptTemplate: string) => Promise<void>;
  onReset: (styleId: string) => Promise<void>;
  onClose: () => void;
}

export function ImageStylesEditor({ styles, onSave, onReset, onClose }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const open = styles.find((s) => s.id === openId) || null;

  const startEdit = (s: WavyStyle) => {
    setOpenId(s.id);
    setDraft(s.promptTemplate);
  };

  const save = async () => {
    if (!open) return;
    setSaving(true);
    try {
      await onSave(open.id, draft);
      toast({ title: "Skill salvo", description: `Estilo ${open.nome} atualizado.` });
      setOpenId(null);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!open) return;
    await onReset(open.id);
    const original = styles.find((s) => s.id === open.id);
    setDraft(original?.promptTemplate || "");
    toast({ title: "Restaurado", description: "Skill voltou ao padrão." });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <GlassCard>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="glass rounded-lg p-2 hover:bg-white/10" title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">Editar estilos</div>
            <h2 className="text-lg font-semibold">O texto que gera cada imagem</h2>
          </div>
        </div>
      </GlassCard>

      {!open ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {styles.map((s) => (
            <button
              key={s.id}
              onClick={() => startEdit(s)}
              className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors flex flex-col gap-2"
            >
              <span className="text-3xl">{s.emoji}</span>
              <div className="text-sm font-semibold text-white">{s.nome}</div>
              <p className="text-[11px] text-white/50 leading-relaxed">{s.descricao_longa}</p>
            </button>
          ))}
        </div>
      ) : (
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{open.emoji}</span>
              <div>
                <div className="text-sm font-semibold text-white">{open.nome}</div>
                <p className="text-[11px] text-white/50">Placeholders: {"{VISUAL_PROMPT} {TEMA} {TITULO} {CORPO}"}</p>
              </div>
            </div>
            <button onClick={() => setOpenId(null)} className="text-xs text-white/50 hover:text-white">
              ← estilos
            </button>
          </div>

          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={16}
            className="glass-input w-full rounded-lg text-xs font-mono leading-relaxed"
          />

          <div className="flex items-center justify-between mt-3">
            <button
              onClick={reset}
              className="glass rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5 hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
            </button>
            <button
              onClick={save}
              disabled={saving}
              className={cn("btn-accent rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center gap-2", saving && "opacity-60")}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Salvar skill
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
