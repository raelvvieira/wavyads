import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  STRATEGIC_ANGLES,
  STRATEGIC_ANGLE_HINTS,
  STRATEGIC_ANGLE_LABELS,
  emptyOfferIntelligence,
  type OfferIntelligence,
  type StrategicAngleId,
} from '../types/factorCreative';

export interface FatorCriativoSubmit {
  offerIntelligence: OfferIntelligence;
  mode: 'automatic' | 'strategic';
  selectedAngles: StrategicAngleId[];
}

interface FatorCriativoDialogProps {
  open: boolean;
  /** Briefing inferido pela IA. `null` enquanto a análise roda. */
  briefing: OfferIntelligence | null;
  analisando: boolean;
  erroAnalise?: string | null;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (input: FatorCriativoSubmit) => void;
}

/**
 * Diálogo do Fator Criativo V2.
 *
 * Dois passos no mesmo diálogo. O briefing vem INFERIDO da arte-base, mas
 * chega editável — a spec proíbe inventar prova, então o que é fato
 * verificável (número, depoimento, credencial) só entra se uma pessoa
 * colocar aqui. Por isso "Provas" nasce vazio e com aviso, em vez de vir
 * preenchido com algo plausível.
 */
export function FatorCriativoDialog({
  open,
  briefing,
  analisando,
  erroAnalise = null,
  busy = false,
  onClose,
  onSubmit,
}: FatorCriativoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(aberto) => { if (!aberto) onClose(); }}>
      <DialogContent className="glass max-h-[86vh] overflow-y-auto border-white/10 bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fator Criativo</DialogTitle>
          <DialogDescription>
            5 variações estratégicas desta arte — cada uma com uma tese própria
          </DialogDescription>
        </DialogHeader>

        {analisando ? (
          <EsqueletoAnalise />
        ) : (
          <Formulario
            briefingInicial={briefing ?? emptyOfferIntelligence()}
            erroAnalise={erroAnalise}
            busy={busy}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EsqueletoAnalise() {
  return (
    <div className="space-y-3 py-6" aria-live="polite">
      <div className="flex items-center gap-2 text-[13px] text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        Lendo a oferta a partir da arte…
      </div>
      {[70, 90, 55, 80].map((w, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-white/[0.06]" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

function Formulario({
  briefingInicial,
  erroAnalise,
  busy,
  onSubmit,
}: {
  briefingInicial: OfferIntelligence;
  erroAnalise: string | null;
  busy: boolean;
  onSubmit: (input: FatorCriativoSubmit) => void;
}) {
  const [briefing, setBriefing] = useState<OfferIntelligence>(briefingInicial);
  const [modo, setModo] = useState<'automatic' | 'strategic'>('automatic');
  const [angulos, setAngulos] = useState<StrategicAngleId[]>([]);

  useEffect(() => { setBriefing(briefingInicial); }, [briefingInicial]);

  const campo = <K extends keyof OfferIntelligence>(k: K, v: OfferIntelligence[K]) =>
    setBriefing((b) => ({ ...b, [k]: v }));

  const alternarAngulo = (a: StrategicAngleId) =>
    setAngulos((atual) => {
      if (atual.includes(a)) return atual.filter((x) => x !== a);
      // Cinco slots, cinco ângulos — passar disso não teria onde caber.
      if (atual.length >= 5) return atual;
      return [...atual, a];
    });

  // Sem exigir a oferta preenchida: quando ela vem vazia, a própria função
  // deduz o briefing da arte. Travar o botão aqui transformava uma leitura
  // de oferta que falhou num beco sem saída.
  const podeGerar = !busy && (modo === 'automatic' || angulos.length > 0);

  return (
    <div className="mt-2 space-y-5">
      {erroAnalise && (
        <p className="flex items-start gap-2 rounded-[var(--wavy-radius-card)] border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-white/78">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          Não consegui ler a oferta automaticamente ({erroAnalise}). Preencha o essencial abaixo.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Produto">
          <input
            value={briefing.productName}
            onChange={(e) => campo('productName', e.target.value)}
            placeholder="Nome do produto ou serviço"
            className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
          />
        </Campo>
        <Campo rotulo="Categoria">
          <input
            value={briefing.category}
            onChange={(e) => campo('category', e.target.value)}
            placeholder="Segmento"
            className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
          />
        </Campo>
      </div>

      <Campo rotulo="A oferta">
        <Textarea
          value={briefing.offerDescription}
          onChange={(e) => campo('offerDescription', e.target.value)}
          placeholder="O que está sendo oferecido, em uma ou duas frases"
          rows={2}
          className="resize-none text-[13px]"
        />
      </Campo>

      <ListaChips rotulo="Público" itens={briefing.audience} onChange={(v) => campo('audience', v)} placeholder="Quem compra" />
      <ListaChips rotulo="Dores" itens={briefing.pains} onChange={(v) => campo('pains', v)} placeholder="O que incomoda" />
      <ListaChips rotulo="Desejos" itens={briefing.desires} onChange={(v) => campo('desires', v)} placeholder="O que se quer alcançar" />
      <ListaChips rotulo="Objeções" itens={briefing.objections} onChange={(v) => campo('objections', v)} placeholder="Por que não compraria" />
      <ListaChips rotulo="Diferenciais" itens={briefing.differentiators} onChange={(v) => campo('differentiators', v)} placeholder="O que só você tem" />

      <div className="rounded-[var(--wavy-radius-card)] border border-white/8 bg-white/[0.02] p-3">
        <ListaChips
          rotulo="Provas"
          itens={briefing.proofs.map((p) => p.content)}
          onChange={(textos) => campo('proofs', textos.map((content) => ({
            type: 'metric' as const, content, approvedForAds: true,
          })))}
          placeholder="Número, resultado, depoimento — só o que for verificável"
        />
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
          Nascem vazias de propósito: o sistema não inventa número, depoimento
          nem case. Sem prova aqui, nenhuma variação usa evidência — e o
          ângulo "Prova" é substituído por outro.
        </p>
      </div>

      <Campo rotulo="Chamada para ação">
        <input
          value={briefing.callToAction}
          onChange={(e) => campo('callToAction', e.target.value)}
          placeholder="Ex.: agendar avaliação, pedir orçamento"
          className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
        />
      </Campo>

      <div className="space-y-2 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Ângulos estratégicos</span>
          <div className="flex gap-1.5" role="group" aria-label="Modo de seleção">
            <ChipModo ativo={modo === 'automatic'} onClick={() => setModo('automatic')}>Automático</ChipModo>
            <ChipModo ativo={modo === 'strategic'} onClick={() => setModo('strategic')}>Escolher</ChipModo>
          </div>
        </div>

        {modo === 'automatic' ? (
          <p className="text-[12px] leading-relaxed text-white/50">
            O sistema escolhe os 5 melhores para esta oferta e substitui sozinho
            os que não tiverem dados — sem inventar nada para preencher.
          </p>
        ) : (
          <>
            <p className="text-[12px] text-white/50">
              Escolha até 5 ({angulos.length}/5). A ordem é a ordem das variações.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STRATEGIC_ANGLES.map((a) => {
                const ativo = angulos.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => alternarAngulo(a)}
                    aria-pressed={ativo}
                    title={STRATEGIC_ANGLE_HINTS[a]}
                    disabled={!ativo && angulos.length >= 5}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 disabled:opacity-30',
                      ativo
                        ? 'border-accent/60 bg-accent/15 text-white/92'
                        : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white/85',
                    )}
                  >
                    {ativo && <span className="mr-1 text-accent">{angulos.indexOf(a) + 1}</span>}
                    {STRATEGIC_ANGLE_LABELS[a]}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="text-xs text-muted-foreground">
          {podeGerar ? '5 variações, uma por tese' : 'Escolha ao menos um ângulo'}
        </span>
        <button
          type="button"
          disabled={!podeGerar}
          onClick={() => onSubmit({ offerIntelligence: briefing, mode: modo, selectedAngles: angulos })}
          className="btn-accent inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? 'Gerando…' : 'Gerar 5 variações'}
        </button>
      </div>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-muted-foreground">{rotulo}</label>
      {children}
    </div>
  );
}

/** Lista editável por chips — adicionar com Enter, remover no X. */
function ListaChips({
  rotulo,
  itens,
  onChange,
  placeholder,
}: {
  rotulo: string;
  itens: string[];
  onChange: (itens: string[]) => void;
  placeholder: string;
}) {
  const [rascunho, setRascunho] = useState('');

  const adicionar = () => {
    const t = rascunho.trim();
    if (!t) return;
    onChange([...itens, t]);
    setRascunho('');
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm text-muted-foreground">{rotulo}</label>
      {itens.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {itens.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-2.5 pr-1.5 text-[12px] text-white/78"
            >
              <span className="truncate">{item}</span>
              <button
                type="button"
                onClick={() => onChange(itens.filter((_, j) => j !== i))}
                aria-label={`Remover ${item}`}
                className="rounded-full p-0.5 text-white/45 transition-colors duration-150 hover:bg-white/10 hover:text-white/90"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); adicionar(); }
          }}
          placeholder={placeholder}
          aria-label={rotulo}
          className="glass-input w-full rounded-xl py-2 px-3 text-[13px]"
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={!rascunho.trim()}
          aria-label={`Adicionar em ${rotulo}`}
          className="btn-glass shrink-0 rounded-xl px-3 disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ChipModo({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        'rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150',
        ativo ? 'bg-white/[0.14] text-white/92' : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85',
      )}
    >
      {children}
    </button>
  );
}
