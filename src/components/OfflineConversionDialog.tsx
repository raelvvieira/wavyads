import { useState } from 'react';
import { format } from 'date-fns';
import {
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OfflineConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

const inputCls = 'glass-input w-full rounded-xl py-3 px-4 text-sm';
const labelCls = 'text-xs text-muted-foreground';

type Mode = 'single' | 'bulk';

interface ConversionDraft {
  id: string;
  eventName: 'Purchase' | 'Lead';
  email: string;
  phone: string;
  fn: string;
  ln: string;
  conversionDate: Date;
  valueStr: string;
  // additional
  expanded: boolean;
  zip: string;
  ct: string;
  dob: string;
  doby: string;
  gen: '' | 'M' | 'F';
  age: string;
  // submission state (bulk only)
  status: 'idle' | 'sending' | 'sent' | 'error';
  errorMessage?: string;
}

const newDraft = (): ConversionDraft => ({
  id: crypto.randomUUID(),
  eventName: 'Purchase',
  email: '',
  phone: '',
  fn: '',
  ln: '',
  conversionDate: new Date(),
  valueStr: '',
  expanded: false,
  zip: '',
  ct: '',
  dob: '',
  doby: '',
  gen: '',
  age: '',
  status: 'idle',
});

function hasCompoundName(value: string): boolean {
  return (
    value
      .trim()
      .split(/\s+/)
      .filter((p) => /\p{L}/u.test(p)).length > 1
  );
}

function validateDraft(d: ConversionDraft): string | null {
  if (!d.email.trim() && !d.phone.trim()) {
    return 'Informe ao menos e-mail ou telefone.';
  }
  if (hasCompoundName(d.fn)) {
    return 'O sobrenome deve ser colocado no campo Sobrenome. Use apenas o primeiro nome em Nome.';
  }
  if (d.eventName === 'Purchase') {
    const valueNum = d.valueStr ? Number(d.valueStr.replace(',', '.')) : null;
    if (valueNum == null || isNaN(valueNum) || valueNum <= 0) {
      return 'Informe um valor de conversão válido.';
    }
  }
  if (!d.conversionDate) return 'Selecione a data da conversão.';
  return null;
}

async function submitDraft(clientId: string, d: ConversionDraft) {
  const isPurchase = d.eventName === 'Purchase';
  const valueNum = isPurchase ? Number(d.valueStr.replace(',', '.')) : null;
  const { data: inserted, error: insertErr } = await supabase
    .from('offline_conversions')
    .insert({
      client_id: clientId,
      email: d.email.trim() || null,
      phone: d.phone.trim() || null,
      fn: d.fn.trim() || null,
      ln: d.ln.trim() || null,
      conversion_date: d.conversionDate.toISOString(),
      value: isPurchase ? valueNum : null,
      currency: 'BRL',
      country: 'BR',
      event_name: d.eventName,
      send_status: 'pending',
      zip: d.zip.trim() || null,
      ct: d.ct.trim() || null,
      dob: d.dob.trim() || null,
      doby: d.doby.trim() || null,
      gen: d.gen || null,
      age: d.age ? Number(d.age) : null,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    throw insertErr || new Error('Falha ao salvar conversão');
  }

  const { error: fnError } = await supabase.functions.invoke(
    'send-offline-conversion',
    { body: { conversion_id: inserted.id } },
  );
  if (fnError) throw fnError;
}

// ---------- Single conversion form (shared between single + bulk modes) ----------

interface DraftFormProps {
  draft: ConversionDraft;
  onChange: (patch: Partial<ConversionDraft>) => void;
  showHeader?: boolean;
  index?: number;
  onRemove?: () => void;
  removable?: boolean;
}

function DraftForm({
  draft: d,
  onChange,
  showHeader = false,
  index,
  onRemove,
  removable,
}: DraftFormProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const statusBadge =
    d.status === 'sent' ? (
      <span className="inline-flex items-center gap-1 text-[11px] text-accent">
        <CheckCircle2 className="h-3 w-3" /> Enviada
      </span>
    ) : d.status === 'error' ? (
      <span
        className="inline-flex items-center gap-1 text-[11px] text-destructive"
        title={d.errorMessage}
      >
        <XCircle className="h-3 w-3" /> Erro
      </span>
    ) : d.status === 'sending' ? (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Enviando…
      </span>
    ) : null;

  return (
    <div className={showHeader ? 'glass rounded-xl p-4 space-y-3' : 'space-y-3'}>
      {showHeader && (
        <div className="flex items-center justify-between -mt-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Conversão #{(index ?? 0) + 1}</h4>
            {statusBadge}
          </div>
          {removable && (
            <button
              type="button"
              onClick={onRemove}
              disabled={d.status === 'sending'}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Remover conversão"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Informe <strong>e-mail</strong> <em>ou</em> <strong>telefone</strong> (ao menos um).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelCls}>E-mail</label>
          <input
            type="email"
            value={d.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="cliente@email.com"
            className={inputCls}
            disabled={d.status === 'sending' || d.status === 'sent'}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Telefone</label>
          <input
            type="text"
            value={d.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+55 11 99999-9999"
            className={inputCls}
            disabled={d.status === 'sending' || d.status === 'sent'}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelCls}>Nome</label>
          <input
            type="text"
            value={d.fn}
            onChange={(e) => onChange({ fn: e.target.value })}
            className={cn(inputCls, hasCompoundName(d.fn) && 'border-destructive')}
            disabled={d.status === 'sending' || d.status === 'sent'}
          />
          {hasCompoundName(d.fn) && (
            <p className="text-[11px] text-destructive">
              Coloque apenas o primeiro nome aqui. O sobrenome vai no campo Sobrenome.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Sobrenome</label>
          <input
            type="text"
            value={d.ln}
            onChange={(e) => onChange({ ln: e.target.value })}
            className={inputCls}
            disabled={d.status === 'sending' || d.status === 'sent'}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Tipo de Evento *</label>
        <select
          value={d.eventName}
          onChange={(e) => onChange({ eventName: e.target.value as 'Purchase' | 'Lead' })}
          className={inputCls}
          disabled={d.status === 'sending' || d.status === 'sent'}
        >
          <option value="Purchase" className="text-black bg-white">Purchase (Compra)</option>
          <option value="Lead" className="text-black bg-white">Lead</option>
        </select>
      </div>

      <div className={cn('grid gap-3', d.eventName === 'Purchase' ? 'grid-cols-2' : 'grid-cols-1')}>
        <div className="space-y-1.5">
          <label className={labelCls}>Data da Conversão *</label>
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={d.status === 'sending' || d.status === 'sent'}
                className={cn(
                  'glass-input w-full rounded-xl py-3 px-4 text-sm justify-start font-normal h-auto',
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2 opacity-70" />
                {d.conversionDate ? format(d.conversionDate, 'dd/MM/yyyy') : 'Selecione'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass border-white/10" align="start">
              <Calendar
                mode="single"
                selected={d.conversionDate}
                onSelect={(date) => {
                  if (date) {
                    onChange({ conversionDate: date });
                    setDatePopoverOpen(false);
                  }
                }}
                disabled={(date) => date > new Date()}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>

        {d.eventName === 'Purchase' && (
          <div className="space-y-1.5">
            <label className={labelCls}>Valor *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={d.valueStr}
                onChange={(e) => onChange({ valueStr: e.target.value })}
                placeholder="0,00"
                required
                disabled={d.status === 'sending' || d.status === 'sent'}
                className={cn(inputCls, 'pl-10')}
              />
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground pt-1">
        {d.eventName === 'Purchase' ? 'Moeda: BRL · ' : ''}Evento: {d.eventName} · País: BR
      </p>

      {/* Additional */}
      <div className="border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={() => onChange({ expanded: !d.expanded })}
          className="flex items-center justify-between w-full text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Dados adicionais — aumentam a qualidade do match</span>
          {d.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {d.expanded && (
          <div className="space-y-3 mt-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>CEP</label>
                <input
                  type="text"
                  value={d.zip}
                  onChange={(e) => onChange({ zip: e.target.value })}
                  placeholder="00000-000"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Cidade</label>
                <input
                  type="text"
                  value={d.ct}
                  onChange={(e) => onChange({ ct: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Data de Nascimento</label>
                <input
                  type="text"
                  value={d.dob}
                  onChange={(e) => onChange({ dob: e.target.value })}
                  placeholder="MM/DD/AA"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Ano de Nascimento</label>
                <input
                  type="text"
                  value={d.doby}
                  onChange={(e) => onChange({ doby: e.target.value })}
                  placeholder="ex: 1990"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Gênero</label>
                <select
                  value={d.gen}
                  onChange={(e) => onChange({ gen: e.target.value as 'M' | 'F' | '' })}
                  className={inputCls}
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Idade</label>
                <input
                  type="number"
                  min="0"
                  value={d.age}
                  onChange={(e) => onChange({ age: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {showHeader && d.status === 'error' && d.errorMessage && (
        <p className="text-[11px] text-destructive">{d.errorMessage}</p>
      )}
    </div>
  );
}

// ---------- Main dialog ----------

export function OfflineConversionDialog({
  open,
  onOpenChange,
  clientId,
}: OfflineConversionDialogProps) {
  const [mode, setMode] = useState<Mode>('single');

  // Single
  const [single, setSingle] = useState<ConversionDraft>(newDraft());
  const [submitting, setSubmitting] = useState(false);

  // Bulk
  const [drafts, setDrafts] = useState<ConversionDraft[]>([newDraft(), newDraft()]);
  const [bulkRunning, setBulkRunning] = useState(false);

  const closeAndReset = (open: boolean) => {
    if (!open) {
      setSingle(newDraft());
      setDrafts([newDraft(), newDraft()]);
      setMode('single');
    }
    onOpenChange(open);
  };

  // Single submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateDraft(single);
    if (err) {
      toast({ title: 'Dados inválidos', description: err, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await submitDraft(clientId, single);
      toast({ title: 'Conversão enviada com sucesso!' });
      setSingle(newDraft());
      onOpenChange(false);
    } catch (err: any) {
      console.error('Offline conversion error:', err);
      toast({
        title: 'Erro ao enviar. Tente novamente.',
        description: err?.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk submit
  const handleBulkSubmit = async () => {
    // Validate all unsent drafts first
    const errors: string[] = [];
    drafts.forEach((d, i) => {
      if (d.status === 'sent') return;
      const err = validateDraft(d);
      if (err) errors.push(`Conversão #${i + 1}: ${err}`);
    });
    if (errors.length) {
      toast({
        title: 'Corrija os erros antes de enviar',
        description: errors.join(' · '),
        variant: 'destructive',
      });
      return;
    }

    setBulkRunning(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < drafts.length; i++) {
      const current = drafts[i];
      if (current.status === 'sent') continue;

      setDrafts((prev) =>
        prev.map((d, idx) =>
          idx === i ? { ...d, status: 'sending', errorMessage: undefined } : d,
        ),
      );

      try {
        await submitDraft(clientId, current);
        successCount++;
        setDrafts((prev) =>
          prev.map((d, idx) => (idx === i ? { ...d, status: 'sent' } : d)),
        );
      } catch (err: any) {
        errorCount++;
        setDrafts((prev) =>
          prev.map((d, idx) =>
            idx === i
              ? { ...d, status: 'error', errorMessage: err?.message || 'Erro desconhecido' }
              : d,
          ),
        );
      }
    }

    setBulkRunning(false);
    if (errorCount === 0) {
      toast({
        title: 'Conversões enviadas com sucesso!',
        description: `${successCount} conversão(ões) registrada(s).`,
      });
    } else {
      toast({
        title: `${successCount} enviada(s), ${errorCount} com erro`,
        description: 'Revise os itens marcados em vermelho e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const updateDraft = (id: string, patch: Partial<ConversionDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const addDraft = () => setDrafts((prev) => [...prev, newDraft()]);
  const removeDraft = (id: string) =>
    setDrafts((prev) => (prev.length === 1 ? prev : prev.filter((d) => d.id !== id)));

  const pendingCount = drafts.filter((d) => d.status !== 'sent').length;

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && !bulkRunning && closeAndReset(o)}>
      <DialogContent className="glass border-white/10 bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Conversão</DialogTitle>
          <DialogDescription>
            Envie eventos de conversão offline para a Meta (Pixel + CAPI).
          </DialogDescription>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setMode('single')}
            disabled={bulkRunning}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              mode === 'single'
                ? 'btn-accent'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Registro único
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            disabled={submitting}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              mode === 'bulk'
                ? 'btn-accent'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Registro em quantidade
          </button>
        </div>

        {mode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-5 mt-2">
            <DraftForm draft={single} onChange={(p) => setSingle((s) => ({ ...s, ...p }))} />

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
                className="btn-glass flex-1 rounded-xl py-3 text-sm font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-accent flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Enviando...' : 'Registrar Conversão'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Adicione múltiplas conversões abaixo e envie todas de uma vez. Cada item será processado individualmente.
            </p>

            <div className="space-y-3">
              {drafts.map((d, i) => (
                <DraftForm
                  key={d.id}
                  draft={d}
                  index={i}
                  showHeader
                  removable={drafts.length > 1}
                  onRemove={() => removeDraft(d.id)}
                  onChange={(p) => updateDraft(d.id, p)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addDraft}
              disabled={bulkRunning}
              className="btn-glass w-full rounded-xl py-2.5 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar outra conversão
            </button>

            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={bulkRunning}
                onClick={() => onOpenChange(false)}
                className="btn-glass flex-1 rounded-xl py-3 text-sm font-medium disabled:opacity-50"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={bulkRunning || pendingCount === 0}
                onClick={handleBulkSubmit}
                className="btn-accent flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                {bulkRunning
                  ? 'Enviando...'
                  : `Enviar ${pendingCount} conversão${pendingCount === 1 ? '' : 'ões'}`}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
