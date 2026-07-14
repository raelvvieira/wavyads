import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Loader2, Sparkles, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeTemplate } from '@/pages/CriativoStudioPage';

interface StyleGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builtinTemplates: CreativeTemplate[];
  appliedTemplateId?: string | null;
  onApply: (template: CreativeTemplate) => void;
  onViewDetails: (template: CreativeTemplate) => void;
  onOpenMyTemplates: () => void;
}

const FALLBACK_GRADIENT = 'linear-gradient(135deg, #1C1B19 0%, #3A2A2A 55%, #EC4899 100%)';

export function StyleGalleryDialog({
  open,
  onOpenChange,
  builtinTemplates,
  appliedTemplateId,
  onApply,
  onViewDetails,
  onOpenMyTemplates,
}: StyleGalleryDialogProps) {
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleApply = async (template: CreativeTemplate) => {
    setApplyingId(template.id);
    try {
      await onApply(template);
      onOpenChange(false);
    } catch {
      // onApply (applyTemplate) já mostra um toast de erro; aqui só evitamos
      // uma rejeição de promise não tratada e mantemos o diálogo aberto.
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-[#0D0D0F] border-white/10 p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#EC4899]" />
            <DialogTitle className="text-xl">Escolher Template</DialogTitle>
          </div>
          <DialogDescription className="text-white/55">
            Estilos com direção de arte completa — cor, tipografia, composição e o que evitar já definidos.
            Opcional: você pode continuar sem escolher e usar suas próprias referências.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-5">
            {builtinTemplates.map((template) => {
              const isApplied = appliedTemplateId === template.id;
              const isApplying = applyingId === template.id;
              const gradient = (template.style_metadata as any)?.previewGradient || FALLBACK_GRADIENT;
              return (
                <div
                  key={template.id}
                  className={cn(
                    'group flex flex-col rounded-2xl border bg-white/[0.02] overflow-hidden transition-all',
                    isApplied ? 'border-[#EC4899]/60 ring-1 ring-[#EC4899]/40' : 'border-white/10 hover:border-white/25',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onViewDetails(template)}
                    className="aspect-[4/3] w-full relative text-left"
                    style={{ background: gradient }}
                  >
                    {isApplied && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                        <Check className="h-3 w-3" /> Em uso
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-[11px] font-medium text-white">Ver detalhes →</span>
                    </div>
                  </button>

                  <div className="flex flex-1 flex-col gap-2.5 p-4">
                    <div>
                      <p className="font-semibold text-white">{template.name}</p>
                      {template.niche && (
                        <p className="text-[11px] text-white/40 mt-0.5">{template.niche}</p>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-white/60 leading-relaxed line-clamp-3">{template.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                      {(template.tags || []).slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] bg-white/[0.06] text-white/55 hover:bg-white/[0.06]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      disabled={isApplying}
                      className="mt-1 rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]"
                      onClick={() => handleApply(template)}
                    >
                      {isApplying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isApplied ? (
                        'Usar novamente'
                      ) : (
                        'Usar este estilo'
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}

            {builtinTemplates.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/50">
                Nenhum estilo embutido disponível no momento.
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between border-t border-white/10 p-4">
          <Button variant="ghost" className="rounded-full text-white/60" onClick={onOpenMyTemplates}>
            <FolderOpen className="mr-2 h-4 w-4" /> Ver meus templates salvos
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Continuar sem template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
