import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { BrainCircuit, Check, Loader2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ClientCopyBankEntry {
  id: string;
  copy_text: string;
  tema: string | null;
  created_at: string;
}

export interface ClientIntelligenceArt {
  id: string;
  url: string;
  metadata: any;
  created_at: string;
}

interface QuickCreativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  loading: boolean;
  generating: boolean;
  copyBank: ClientCopyBankEntry[];
  intelligenceArts: ClientIntelligenceArt[];
  onGenerate: (params: { copyText: string; art: ClientIntelligenceArt | null; tema: string | null }) => void;
}

export function QuickCreativeDialog({
  open,
  onOpenChange,
  clientName,
  loading,
  generating,
  copyBank,
  intelligenceArts,
  onGenerate,
}: QuickCreativeDialogProps) {
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);
  const [selectedArtId, setSelectedArtId] = useState<string | null>(null);
  const [copyText, setCopyText] = useState('');
  const [selectedTema, setSelectedTema] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedCopyId(null);
    setSelectedArtId(null);
    setCopyText('');
    setSelectedTema(null);
  }, [open]);

  const pickCopy = (entry: ClientCopyBankEntry) => {
    setSelectedCopyId(entry.id);
    setCopyText(entry.copy_text);
    setSelectedTema(entry.tema);
  };

  const selectedArt = intelligenceArts.find((a) => a.id === selectedArtId) || null;
  const canGenerate = copyText.trim().length > 0 && !generating;

  return (
    <Dialog open={open} onOpenChange={(v) => !generating && onOpenChange(v)}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden bg-[#0D0D0F] border-white/10 p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-[#EC4899]" />
            <DialogTitle className="text-xl">Criativo Rápido — {clientName}</DialogTitle>
          </div>
          <DialogDescription className="text-white/55">
            Escolha uma copy e, se quiser, um estilo visual já usados com este cliente. A arte é gerada direto, sem passar pelo fluxo completo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-5">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Copy salva do cliente</p>
                  {copyBank.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-white/45">
                      Nenhuma copy salva ainda. Escreva abaixo ou volte depois de salvar uma copy na inteligência do cliente.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {copyBank.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => pickCopy(entry)}
                          className={cn(
                            'w-full rounded-2xl border p-3 text-left text-xs transition',
                            selectedCopyId === entry.id
                              ? 'border-[#EC4899]/60 bg-[#EC4899]/10 ring-1 ring-[#EC4899]/40'
                              : 'border-white/10 bg-white/[0.02] hover:border-white/25',
                          )}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            {entry.tema && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/55">{entry.tema}</span>}
                            {selectedCopyId === entry.id && <Check className="h-3.5 w-3.5 shrink-0 text-[#EC4899]" />}
                          </div>
                          <p className="line-clamp-2 whitespace-pre-wrap text-white/75">{entry.copy_text}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Copy que será usada</p>
                  <Textarea
                    value={copyText}
                    onChange={(e) => { setCopyText(e.target.value); setSelectedCopyId(null); }}
                    rows={5}
                    placeholder="Selecione uma copy salva acima ou escreva/cole uma copy aqui..."
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Estilo visual salvo (opcional)</p>
                  {intelligenceArts.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-white/45">
                      Nenhuma arte marcada como referência ainda. A geração vai usar apenas a copy acima.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {intelligenceArts.map((art) => (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => setSelectedArtId((prev) => (prev === art.id ? null : art.id))}
                          className={cn(
                            'group relative aspect-square overflow-hidden rounded-xl border transition',
                            selectedArtId === art.id
                              ? 'border-[#EC4899]/70 ring-1 ring-[#EC4899]/50'
                              : 'border-white/10 hover:border-white/30',
                          )}
                        >
                          <img src={art.url} alt="" className="h-full w-full object-cover" />
                          {selectedArtId === art.id && (
                            <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EC4899]">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 p-4">
          <p className="text-[11px] text-white/40">
            {selectedArt ? 'Vai reaproveitar o estilo visual selecionado.' : 'Sem estilo visual: usa o padrão da IA para essa copy.'}
          </p>
          <Button
            disabled={!canGenerate}
            className="rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]"
            onClick={() => onGenerate({
              copyText: copyText.trim(),
              art: selectedArt,
              tema: selectedTema,
            })}
          >
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {generating ? 'Gerando...' : 'Gerar criativo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
