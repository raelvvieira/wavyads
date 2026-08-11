import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, ChevronDown, Loader2, Sparkles, Wand2 } from 'lucide-react';
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

export interface QuickCopyVariation {
  angulo: string;
  texto: string;
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
  /** Copy salva escolhida é só referência de tom/estrutura — isso devolve 4
   * variações NOVAS no mesmo estilo, nunca o texto literal. */
  onSuggestFromReference: (entry: ClientCopyBankEntry) => Promise<QuickCopyVariation[]>;
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
  onSuggestFromReference,
}: QuickCreativeDialogProps) {
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);
  const [selectedArtId, setSelectedArtId] = useState<string | null>(null);
  const [copyText, setCopyText] = useState('');
  const [selectedTema, setSelectedTema] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [variations, setVariations] = useState<QuickCopyVariation[]>([]);
  const [selectedVariationIdx, setSelectedVariationIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedCopyId(null);
    setSelectedArtId(null);
    setCopyText('');
    setSelectedTema(null);
    setSuggesting(false);
    setVariations([]);
    setSelectedVariationIdx(null);
  }, [open]);

  const pickCopy = async (entry: ClientCopyBankEntry) => {
    setSelectedCopyId(entry.id);
    setSelectedTema(entry.tema);
    setCopyText('');
    setVariations([]);
    setSelectedVariationIdx(null);
    setSuggesting(true);
    try {
      const result = await onSuggestFromReference(entry);
      setVariations(result);
    } catch {
      // IA indisponível — pelo menos deixa o texto original como opção única.
      setVariations([{ angulo: 'Original', texto: entry.copy_text }]);
    } finally {
      setSuggesting(false);
    }
  };

  const pickVariation = (idx: number) => {
    setSelectedVariationIdx(idx);
    setCopyText(variations[idx].texto);
  };

  const selectedArt = intelligenceArts.find((a) => a.id === selectedArtId) || null;
  const canGenerate = copyText.trim().length > 0 && !generating && !suggesting;

  return (
    <Dialog open={open} onOpenChange={(v) => !generating && onOpenChange(v)}>
      <DialogContent className="glass bg-card max-w-3xl max-h-[85vh] overflow-hidden border-white/10 p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <DialogTitle className="text-lg font-semibold">Criativo Rápido</DialogTitle>
            <span className="text-sm text-white/40">{clientName}</span>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-7 pb-6">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-11 rounded-xl bg-white/5" />
                <Skeleton className="h-11 rounded-xl bg-white/5" />
                <Skeleton className="h-11 rounded-xl bg-white/5" />
              </div>
            ) : (
              <>
                {/* Referências — lista compacta, uma linha cada */}
                <div>
                  <p className="mb-2 text-[11px] font-medium text-white/40">Copy de referência</p>
                  {copyBank.length === 0 ? (
                    <p className="text-xs text-white/35">Nenhuma copy salva ainda — escreva a sua abaixo.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {copyBank.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          disabled={suggesting}
                          onClick={() => pickCopy(entry)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
                            selectedCopyId === entry.id
                              ? 'border-accent/60 bg-accent/[0.07] ring-1 ring-accent/30'
                              : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]',
                          )}
                        >
                          {entry.tema && (
                            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">{entry.tema}</span>
                          )}
                          <p className="truncate text-xs text-white/70">{entry.copy_text}</p>
                          {selectedCopyId === entry.id && (
                            suggesting
                              ? <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-accent" />
                              : <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-accent" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sugestões — grid 2x2, o card inteiro é a seleção */}
                {(suggesting || variations.length > 0) && (
                  <div>
                    <p className="mb-2 text-[11px] font-medium text-white/40">
                      {suggesting ? 'Escrevendo variações...' : 'Escolha uma variação'}
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {suggesting
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />
                          ))
                        : variations.map((v, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => pickVariation(i)}
                              className={cn(
                                'flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all duration-200',
                                selectedVariationIdx === i
                                  ? 'border-accent/60 bg-accent/[0.07] ring-1 ring-accent/30'
                                  : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]',
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] uppercase tracking-wide text-white/40">{v.angulo}</span>
                                {selectedVariationIdx === i && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
                              </div>
                              <p className="text-sm leading-relaxed text-white/85 line-clamp-4">{v.texto}</p>
                            </button>
                          ))}
                    </div>
                  </div>
                )}

                {/* Ajuste fino / escrita livre */}
                <div>
                  <p className="mb-2 text-[11px] font-medium text-white/40">
                    {selectedVariationIdx !== null ? 'Sua copy' : 'Ou escreva a sua'}
                  </p>
                  <Textarea
                    value={copyText}
                    onChange={(e) => { setCopyText(e.target.value); setSelectedCopyId(null); setSelectedVariationIdx(null); }}
                    disabled={suggesting}
                    rows={3}
                    placeholder="Escreva ou cole uma copy..."
                    className="resize-none border-white/10 bg-white/[0.02] text-sm"
                  />
                </div>

                {/* Estilo visual — opcional, escondido por padrão */}
                {intelligenceArts.length > 0 && (
                  <details className="group rounded-xl border border-white/10 bg-white/[0.02] open:pb-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[11px] font-medium text-white/40">
                      <span>Estilo visual {selectedArt ? '· 1 selecionado' : '(opcional)'}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-white/30 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="grid grid-cols-4 gap-2 px-3 sm:grid-cols-5">
                      {intelligenceArts.map((art) => (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => setSelectedArtId((prev) => (prev === art.id ? null : art.id))}
                          className={cn(
                            'group/art relative aspect-square overflow-hidden rounded-lg border transition-all duration-200',
                            selectedArtId === art.id
                              ? 'border-accent/70 ring-1 ring-accent/40'
                              : 'border-white/10 hover:border-white/30',
                          )}
                        >
                          <img src={art.url} alt="" className="h-full w-full object-cover" />
                          {selectedArtId === art.id && (
                            <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent">
                              <Check className="h-2.5 w-2.5 text-black" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 p-4">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => onGenerate({
              copyText: copyText.trim(),
              art: selectedArt,
              tema: selectedTema,
            })}
            className="btn-accent rounded-full px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {generating ? 'Gerando...' : 'Gerar criativo'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
