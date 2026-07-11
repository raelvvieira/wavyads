import { useState } from "react";
import { ArrowLeft, Plus, RotateCcw, Trash2, Check, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { WavyStyle } from "@/lib/wavyImageStyles";

interface Props {
  styles: WavyStyle[];
  onSave: (style: WavyStyle) => Promise<void>;
  onCreate: (fields: { nome: string; promptTemplate: string; resumo?: string; emoji?: string }) => Promise<WavyStyle>;
  onDelete: (id: string) => Promise<void>;
  onReset: (id: string) => Promise<void>;
  onClose: () => void;
}

const STARTER = `[TIPO] descreva o tipo de foto/render.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}.
[NARRATIVA] Specific situation: {TITULO}. Context: {CORPO}.
[COMPOSIÇÃO] enquadramento, ângulo, 3:4 portrait vertical.
[ATMOSFERA] iluminação, cor, referência visual.
[QUALIDADE] câmera/lente, foco.
No text, no watermark, no AI artifacts. Photorealistic only.`;

export function ImageStylesEditor({ styles, onSave, onCreate, onDelete, onReset, onClose }: Props) {
  const [sel, setSel] = useState<string | "new" | null>(null);
  const [nome, setNome] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [resumo, setResumo] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const current = sel && sel !== "new" ? styles.find((s) => s.id === sel) : null;

  const openStyle = (s: WavyStyle) => {
    setSel(s.id);
    setNome(s.nome);
    setEmoji(s.emoji);
    setResumo(s.resumo);
    setDraft(s.promptTemplate);
  };

  const openNew = () => {
    setSel("new");
    setNome("");
    setEmoji("✨");
    setResumo("");
    setDraft(STARTER);
  };

  const save = async () => {
    if (!nome.trim() || !draft.trim()) {
      toast({ title: "Preencha nome e texto", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (sel === "new") {
        const created = await onCreate({ nome: nome.trim(), promptTemplate: draft, resumo: resumo.trim(), emoji: emoji.trim() || "✨" });
        toast({ title: "Estilo criado", description: `${created.nome} já está nas opções.` });
        openStyle(created);
      } else if (current) {
        await onSave({ ...current, nome: nome.trim(), emoji: emoji.trim() || "✨", resumo: resumo.trim(), promptTemplate: draft });
        toast({ title: "Estilo salvo" });
      }
    } catch (e: any) {
      toast({ title: "Falha ao salvar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!current) return;
    try {
      await onReset(current.id);
      toast({ title: "Restaurado ao padrão" });
      setSel(null);
    } catch (e: any) {
      toast({ title: "Falha ao restaurar", description: e?.message, variant: "destructive" });
    }
  };

  const del = async () => {
    if (!current) return;
    try {
      await onDelete(current.id);
      toast({ title: "Estilo removido" });
      setSel(null);
    } catch (e: any) {
      toast({ title: "Falha ao excluir", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <GlassCard>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="glass rounded-lg p-2 hover:bg-white/10" title="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="text-xs uppercase tracking-wider text-accent">Editar estilos</div>
              <h2 className="text-lg font-semibold">O texto que gera cada imagem</h2>
            </div>
          </div>
          <button onClick={openNew} className="btn-accent rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo estilo
          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Lista */}
        <div className="space-y-2">
          {styles.map((s) => (
            <button
              key={s.id}
              onClick={() => openStyle(s)}
              className={cn(
                "w-full glass rounded-lg p-3 text-left transition-colors flex items-center gap-3",
                sel === s.id ? "border-accent/60 bg-accent/10" : "hover:bg-white/5",
              )}
            >
              <span className="text-xl">{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{s.nome}</div>
                <div className="text-[10px] text-white/40">{s.builtin ? "Padrão" : "Custom"}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Editor lateral */}
        {sel ? (
          <GlassCard>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="w-16">
                  <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Emoji</label>
                  <input
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="glass-input w-full rounded-lg px-2 py-2 text-center text-lg"
                    maxLength={2}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Nome</label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                    placeholder="Nome do estilo"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Resumo (opcional)</label>
                <input
                  value={resumo}
                  onChange={(e) => setResumo(e.target.value)}
                  className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex: Jornalístico, dados, cases. Bloomberg/Wired quality."
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Texto do estilo (prompt base)</label>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={15}
                  className="glass-input w-full rounded-lg text-xs font-mono leading-relaxed"
                />
                <p className="text-[10px] text-white/35 mt-1">
                  Placeholders: {"{VISUAL_PROMPT}"} {"{TEMA}"} {"{TITULO}"} {"{CORPO}"} {"{COR_PRIMARIA}"} {"{INFLUENCIA_VISUAL}"}.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  {current?.builtin && (
                    <button onClick={reset} className="glass rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5 hover:bg-white/10">
                      <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
                    </button>
                  )}
                  {current && !current.builtin && (
                    <button onClick={del} className="glass rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5 hover:bg-destructive/20 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  )}
                </div>
                <button
                  onClick={save}
                  disabled={saving}
                  className={cn("btn-accent rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center gap-2", saving && "opacity-60")}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {sel === "new" ? "Criar estilo" : "Salvar skill"}
                </button>
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="flex items-center justify-center min-h-[300px]">
            <p className="text-sm text-white/40">Selecione um estilo para editar, ou crie um novo.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
