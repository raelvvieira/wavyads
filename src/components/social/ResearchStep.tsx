import { useState, useEffect } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useCopyTemplates } from "@/hooks/useCopyTemplates";
import { FormatChooser, FormatAction } from "./FormatChooser";
import { CopyTemplatesEditor } from "./CopyTemplatesEditor";
import type { CopyTemplate } from "@/lib/copyTemplates";

interface Props {
  copyConsolidada: string;
  tema: string;
  /** Segue passo a passo: confirma tema + formato e vai pra Copy Final. */
  onApprove: (tema: string, template: CopyTemplate, numSlides: number) => void;
  /** Gera tudo automaticamente a partir daqui. */
  onQuickCreate?: (tema: string, template: CopyTemplate, numSlides: number) => void;
}

interface AnalisisTema {
  tom: string;
  tema_central: string;
  evitar: string;
  estrategia: string;
}

export function ResearchStep({ copyConsolidada, tema, onApprove, onQuickCreate }: Props) {
  const [temaEditado, setTemaEditado] = useState(tema);
  const [analise, setAnalise] = useState<AnalisisTema | null>(null);
  const [loadingAnalise, setLoadingAnalise] = useState(false);
  const [loadingTema, setLoadingTema] = useState(false);

  // Escolha do formato (copy + design pareados) acontece aqui mesmo.
  const { templates, saveTemplate, createTemplate, deleteTemplate, resetTemplate } = useCopyTemplates();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [numSlides, setNumSlides] = useState(7);
  const [editingTemplates, setEditingTemplates] = useState(false);

  const selected = templates.find((t) => t.key === selectedKey) || null;
  const temaOk = !!(copyConsolidada.trim() && temaEditado.trim());
  const canApprove = temaOk && !!selected;

  const selectTemplate = (t: CopyTemplate) => {
    setSelectedKey(t.key);
    setNumSlides(t.slidesDefault || 7);
  };

  /** Reel = 0 slides; post único = 1; carrossel = o do slider. */
  const confirmNum = (t: CopyTemplate) => (t.carrossel ? numSlides : t.baseLayout === "3" ? 0 : 1);

  useEffect(() => {
    if (temaEditado.trim() || !copyConsolidada.trim()) return;

    const gerarTema = async () => {
      setLoadingTema(true);
      try {
        const { data, error } = await supabase.functions.invoke("social-tema-gen", {
          body: { copy_consolidada: copyConsolidada.trim() },
        });

        if (error) throw error;
        if (data?.tema) {
          setTemaEditado(data.tema);
        }
      } catch (e) {
        console.error("Erro ao gerar tema:", e);
      } finally {
        setLoadingTema(false);
      }
    };

    gerarTema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyConsolidada]);

  useEffect(() => {
    if (!temaEditado.trim() || !copyConsolidada.trim()) {
      setAnalise(null);
      return;
    }

    const analisarTema = async () => {
      setLoadingAnalise(true);
      try {
        const { data, error } = await supabase.functions.invoke("social-tema-analise", {
          body: {
            tema: temaEditado.trim(),
            copy_consolidada: copyConsolidada.trim(),
          },
        });

        if (error) throw error;
        if (data?.analise) {
          setAnalise(data.analise);
        }
      } catch (e) {
        console.error("Erro ao analisar tema:", e);
        setAnalise(null);
      } finally {
        setLoadingAnalise(false);
      }
    };

    const timeout = setTimeout(analisarTema, 800);
    return () => clearTimeout(timeout);
  }, [temaEditado, copyConsolidada]);

  if (editingTemplates) {
    return (
      <CopyTemplatesEditor
        templates={templates}
        onSave={saveTemplate}
        onCreate={createTemplate}
        onDelete={deleteTemplate}
        onReset={resetTemplate}
        onClose={() => setEditingTemplates(false)}
      />
    );
  }

  return (
    <GlassCard className="mx-auto max-w-4xl overflow-hidden">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-accent">Etapa 2 · Resumo e formato</div>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Confirme o tema e escolha o formato</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/55">
            Revise a copy extraída, ajuste o tema e escolha o formato — cada um já traz
            sua estrutura de copy e o visual que combina com ela.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70 block mb-2">
              📋 Copy Extraída
            </label>
            <div className="w-full min-h-[180px] rounded-lg bg-white/[0.03] border border-white/10 px-4 py-3 text-sm leading-relaxed text-white/90 overflow-y-auto">
              {copyConsolidada || <span className="text-white/30">Nenhuma copy disponível</span>}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-2 mb-2">
              📝 Tema
              {loadingTema && <Loader2 className="h-3 w-3 animate-spin text-accent" />}
            </label>
            <input
              value={temaEditado}
              onChange={(e) => setTemaEditado(e.target.value)}
              className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 border border-white/10 focus:border-accent/50 focus:outline-none transition-colors"
              placeholder={loadingTema ? "Gerando tema automaticamente..." : "Qual é o tema central?"}
              disabled={loadingTema}
            />
          </div>

          {loadingAnalise && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analisando tema...
            </div>
          )}

          {analise && !loadingAnalise && (
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 space-y-2">
              <p className="text-xs leading-relaxed text-white/80">
                <span className="font-semibold text-accent">Análise:</span> {analise.estrategia}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-white/50">Tom:</span>
                  <p className="text-white/80">{analise.tom}</p>
                </div>
                <div>
                  <span className="text-white/50">Evitar:</span>
                  <p className="text-white/80">{analise.evitar}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Escolha do formato: copy + design numa decisão só */}
        <div className="border-t border-white/10 pt-5">
          <FormatChooser
            templates={templates}
            selected={selected}
            numSlides={numSlides}
            onSelect={selectTemplate}
            onNumSlides={setNumSlides}
            onEditTemplates={() => setEditingTemplates(true)}
          >
            <div className="space-y-2 pt-1">
              {onQuickCreate && (
                <FormatAction
                  variant="primary"
                  disabled={!canApprove}
                  icon={<Zap className="h-4 w-4" />}
                  onClick={() => selected && onQuickCreate(temaEditado.trim(), selected, confirmNum(selected))}
                >
                  Criar post rápido (copy + imagens + arte)
                </FormatAction>
              )}
              <FormatAction
                variant={onQuickCreate ? "secondary" : "primary"}
                disabled={!canApprove}
                icon={<Check className="h-4 w-4" />}
                onClick={() => selected && onApprove(temaEditado.trim(), selected, confirmNum(selected))}
              >
                {!temaOk ? "Confirme o tema" : !selected ? "Escolha um formato" : "Ou seguir passo a passo →"}
              </FormatAction>
            </div>
          </FormatChooser>
        </div>
      </div>
    </GlassCard>
  );
}
