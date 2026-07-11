import { useState } from "react";
import { ArrowLeft, Plus, RotateCcw, Trash2, Check, Loader2, Code2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CopyTemplate } from "@/lib/copyTemplates";
import { STARTER_DESIGN_CODE } from "@/lib/designCode";
import { DesignCodePreview } from "@/components/social/design/DesignCodePreview";
import type { CopyPatternId } from "@/types/social";

interface Props {
  templates: CopyTemplate[];
  onSave: (t: CopyTemplate) => Promise<void>;
  onCreate: (fields: { nome: string; promptBody: string; baseLayout: CopyPatternId; carrossel: boolean; emoji?: string; designCode?: string }) => Promise<CopyTemplate>;
  onDelete: (key: string) => Promise<void>;
  onReset: (key: string) => Promise<void>;
  onClose: () => void;
}

const LAYOUTS: { id: CopyPatternId; label: string }[] = [
  { id: "1A", label: "1A · Tutorial (carrossel)" },
  { id: "1B", label: "1B · Conflito (carrossel)" },
  { id: "2A", label: "2A · Storytelling (carrossel)" },
  { id: "2B", label: "2B · Editorial Dark (carrossel)" },
  { id: "5", label: "5 · Frase Mestre (carrossel)" },
  { id: "4", label: "4 · Post único" },
  { id: "3", label: "3 · Reel" },
];

const STARTER = `MEU TEMPLATE — descreva o estilo.
Crie {N} slides sobre "{TEMA}".

ESTRUTURA:
- Slide 1 (cover): ...
- Slides 2..{N2}: ...
- Slide {N1}: ...
- Slide {N} (cta): ...

Briefing:
{BRIEFING}{ANCORA}`;

export function CopyTemplatesEditor({ templates, onSave, onCreate, onDelete, onReset, onClose }: Props) {
  const [sel, setSel] = useState<string | "new" | null>(null);
  const [nome, setNome] = useState("");
  const [promptBody, setPromptBody] = useState("");
  const [baseLayout, setBaseLayout] = useState<CopyPatternId>("2A");
  const [designCode, setDesignCode] = useState("");
  const [tab, setTab] = useState<"copy" | "design">("copy");
  const [saving, setSaving] = useState(false);

  const current = sel && sel !== "new" ? templates.find((t) => t.key === sel) : null;

  const openTemplate = (t: CopyTemplate) => {
    setSel(t.key);
    setNome(t.nome);
    setPromptBody(t.promptBody);
    setBaseLayout(t.baseLayout);
    setDesignCode(t.designCode || "");
    setTab("copy");
  };

  const openNew = () => {
    setSel("new");
    setNome("");
    setPromptBody(STARTER);
    setBaseLayout("2A");
    setDesignCode("");
    setTab("copy");
  };

  const save = async () => {
    if (!nome.trim() || !promptBody.trim()) {
      toast({ title: "Preencha nome e texto", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (sel === "new") {
        const carrossel = !(baseLayout === "3" || baseLayout === "4");
        const created = await onCreate({ nome: nome.trim(), promptBody, baseLayout, carrossel, designCode: designCode.trim() || undefined });
        toast({ title: "Template criado", description: `${created.nome} já está nas opções.` });
        openTemplate(created);
      } else if (current) {
        await onSave({
          ...current,
          nome: nome.trim(),
          promptBody,
          baseLayout: current.builtin ? current.baseLayout : baseLayout,
          designCode: designCode.trim() || undefined,
        });
        toast({ title: "Template salvo" });
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
      await onReset(current.key);
      toast({ title: "Restaurado ao padrão" });
      setSel(null);
    } catch (e: any) {
      toast({ title: "Falha ao restaurar", description: e?.message, variant: "destructive" });
    }
  };

  const del = async () => {
    if (!current) return;
    try {
      await onDelete(current.key);
      toast({ title: "Template removido" });
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
              <div className="text-xs uppercase tracking-wider text-accent">Editar Templates</div>
              <h2 className="text-lg font-semibold">O texto que estrutura cada template</h2>
            </div>
          </div>
          <button onClick={openNew} className="btn-accent rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo template
          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Lista */}
        <div className="space-y-2">
          {templates.map((t) => (
            <button
              key={t.key}
              onClick={() => openTemplate(t)}
              className={cn(
                "w-full glass rounded-lg p-3 text-left transition-colors flex items-center gap-3",
                sel === t.key ? "border-accent/60 bg-accent/10" : "hover:bg-white/5",
              )}
            >
              <span className="text-xl">{t.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{t.nome}</div>
                <div className="text-[10px] text-white/40">{t.builtin ? "Padrão" : "Custom"} · layout {t.baseLayout}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Editor lateral */}
        {sel ? (
          <GlassCard>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Nome</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                  placeholder="Nome do template"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                  Layout base {current?.builtin && "(fixo nos padrões)"}
                </label>
                <Select value={baseLayout} onValueChange={(v) => setBaseLayout(v as CopyPatternId)} disabled={!!current?.builtin}>
                  <SelectTrigger className="glass-input h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAYOUTS.map((l) => <SelectItem key={l.id} value={l.id} className="text-sm">{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-white/35 mt-1">Define como imagens e design renderizam nas etapas seguintes.</p>
              </div>

              {/* Abas Copy / Design */}
              <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04] w-fit">
                <button
                  onClick={() => setTab("copy")}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-colors", tab === "copy" ? "bg-accent/20 text-accent" : "text-white/50 hover:text-white")}
                >
                  Copy
                </button>
                <button
                  onClick={() => setTab("design")}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors", tab === "design" ? "bg-accent/20 text-accent" : "text-white/50 hover:text-white")}
                >
                  <Code2 className="h-3.5 w-3.5" /> Design (código)
                </button>
              </div>

              {tab === "copy" ? (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Texto do template</label>
                  <Textarea
                    value={promptBody}
                    onChange={(e) => setPromptBody(e.target.value)}
                    rows={16}
                    className="glass-input w-full rounded-lg text-xs font-mono leading-relaxed"
                  />
                  <p className="text-[10px] text-white/35 mt-1">
                    Placeholders: {"{N}"} total, {"{N1}"} N-1, {"{N2}"} N-2, {"{METADE}"} meio, {"{TEMA}"}, {"{BRIEFING}"}, {"{ANCORA}"}.
                  </p>
                </div>
              ) : !designCode ? (
                <div className="rounded-lg border border-dashed border-white/15 p-5 text-center space-y-3">
                  <p className="text-sm text-white/60">
                    Este template usa o <span className="text-white">layout embutido ({baseLayout})</span>.
                    Ative o código para customizar o design (cores, fontes, espaçamento, posição, logo).
                  </p>
                  <button
                    onClick={() => setDesignCode(STARTER_DESIGN_CODE)}
                    className="btn-accent rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
                  >
                    <Code2 className="h-4 w-4" /> Ativar código de design
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] uppercase tracking-wider text-white/40">Código do design (React)</label>
                      <button
                        onClick={() => setDesignCode("")}
                        className="text-[10px] text-white/50 hover:text-white inline-flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Voltar ao layout embutido
                      </button>
                    </div>
                    <Textarea
                      value={designCode}
                      onChange={(e) => setDesignCode(e.target.value)}
                      rows={22}
                      spellCheck={false}
                      className="glass-input w-full rounded-lg text-[11px] font-mono leading-relaxed"
                    />
                    <p className="text-[10px] text-white/35 mt-1">
                      Defina <code className="text-white/60">function Template(props)</code>. Props: titulo, corpo, imgUrl, tipoSlide, formato, slideIndex, total, profile. Primitivas prontas (não redeclare estes nomes): C, F, AvatarRing, Footer, SLIDE_W, SLIDE_H.
                    </p>
                  </div>
                  <DesignCodePreview code={designCode} />
                </div>
              )}

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
                  {sel === "new" ? "Criar template" : "Salvar"}
                </button>
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="flex items-center justify-center min-h-[300px]">
            <p className="text-sm text-white/40">Selecione um template para editar, ou crie um novo.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
