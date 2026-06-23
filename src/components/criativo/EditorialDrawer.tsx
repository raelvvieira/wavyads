import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSaveClientEditorial } from '@/hooks/useClientEditorial';
import type { ClientEditorial } from '@/types/criativo';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editorial: ClientEditorial | null | undefined;
  clientName: string;
  onRequestUpdate: () => void;
}

export function EditorialDrawer({ open, onOpenChange, editorial, clientName, onRequestUpdate }: Props) {
  const { toast } = useToast();
  const save = useSaveClientEditorial();
  const [doc, setDoc] = useState('');

  useEffect(() => {
    if (editorial) setDoc(editorial.design_system_doc);
  }, [editorial]);

  const handleSave = async () => {
    if (!editorial) return;
    try {
      await save.mutateAsync({
        clientId: editorial.client_id,
        designSystemDoc: doc,
        visualAnalysis: editorial.visual_analysis,
      });
      toast({ title: 'Editorial salvo' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  const a = editorial?.visual_analysis;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto space-y-0">
        <SheetHeader className="mb-5">
          <SheetTitle className="flex items-center gap-2 text-base">
            📖 Editorial Criativo — {clientName || '…'}
          </SheetTitle>
          {editorial && (
            <p className="text-xs text-white/40">
              Atualizado em {new Date(editorial.updated_at).toLocaleDateString('pt-BR')}
            </p>
          )}
        </SheetHeader>

        {!editorial ? (
          <div className="text-center py-16 text-sm text-white/40">
            Este cliente ainda não tem Editorial Criativo.
            <br />
            <span className="text-xs mt-1 block">Faça a análise visual para criar o primeiro.</span>
          </div>
        ) : (
          <div className="space-y-5">
            {a?.paleta && (
              <Section label="🎨 Paleta">
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {a.paleta.hexes.map((c) => (
                    <div key={c} className="flex items-center gap-1.5 glass px-2 py-1 rounded-lg">
                      <div className="w-3.5 h-3.5 rounded border border-white/10 shrink-0" style={{ background: c }} />
                      <span className="text-[11px] font-mono">{c}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/50 mt-1">Saturação: {a.paleta.saturacao}</p>
              </Section>
            )}

            {a?.tipografia && (
              <Section label="✍️ Tipografia">
                <Row k="Família A" v={a.tipografia.familiaA} />
                {a.tipografia.familiaB && <Row k="Família B" v={a.tipografia.familiaB} />}
                <Row k="Contraste" v={a.tipografia.contraste} />
                <Row k="Alinhamento" v={a.tipografia.alinhamento} />
              </Section>
            )}

            {a?.fotografia && (
              <Section label="📸 Fotografia">
                <Row k="Tipo" v={a.fotografia.tipo} />
                <Row k="Luz" v={a.fotografia.luz} />
                <Row k="Tratamento" v={a.fotografia.tratamento} />
                {a.fotografia.integracao && <Row k="Integração" v={a.fotografia.integracao} />}
              </Section>
            )}

            {a?.composicao && (
              <Section label="🏗️ Composição">
                <Row k="Formato" v={a.composicao.formato} />
                <Row k="Estrutura" v={a.composicao.estrutura} />
                <Row k="Hierarquia" v={a.composicao.hierarquia} />
                {a.composicao.silencio && <Row k="Silêncio" v={a.composicao.silencio} />}
              </Section>
            )}

            {a?.mood && (
              <Section label="🌀 Mood">
                <p className="text-xs text-white/80">{a.mood.adjetivos.join(' · ')}</p>
                {a.mood.referencias.length > 0 && (
                  <p className="text-[11px] text-white/50 mt-1">Refs: {a.mood.referencias.join(', ')}</p>
                )}
                {a.mood.evita.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {a.mood.evita.map((e) => (
                      <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30">
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </Section>
            )}

            <Section label="📄 Design System (vai pro prompt — editável)">
              <Textarea
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                rows={9}
                className="font-mono text-[11px] mt-1.5"
              />
            </Section>

            <div className="flex gap-2 pt-1 pb-6">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={save.isPending || doc === editorial.design_system_doc}
                className="flex-1"
              >
                {save.isPending
                  ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  : <Save className="h-3.5 w-3.5 mr-2" />}
                Salvar alterações
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { onOpenChange(false); onRequestUpdate(); }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Atualizar com novas imagens
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-xs">
      <span className="text-white/40">{k}: </span>
      <span className="text-white/80">{v}</span>
    </div>
  );
}
