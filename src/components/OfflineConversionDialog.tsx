import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
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

export function OfflineConversionDialog({
  open,
  onOpenChange,
  clientId,
}: OfflineConversionDialogProps) {
  // Required
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fn, setFn] = useState('');
  const [ln, setLn] = useState('');
  const [conversionDate, setConversionDate] = useState<Date>(new Date());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [valueStr, setValueStr] = useState('');

  // Additional (collapsed)
  const [expanded, setExpanded] = useState(false);
  const [zip, setZip] = useState('');
  const [ct, setCt] = useState('');
  const [dob, setDob] = useState('');
  const [doby, setDoby] = useState('');
  const [gen, setGen] = useState<'' | 'M' | 'F'>('');
  const [age, setAge] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail('');
    setPhone('');
    setFn('');
    setLn('');
    setConversionDate(new Date());
    setValueStr('');
    setExpanded(false);
    setZip('');
    setCt('');
    setDob('');
    setDoby('');
    setGen('');
    setAge('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email.trim() && !phone.trim()) {
      toast({
        title: 'Dados insuficientes',
        description: 'Informe ao menos e-mail ou telefone.',
        variant: 'destructive',
      });
      return;
    }
    const valueNum = valueStr ? Number(valueStr.replace(',', '.')) : null;
    if (valueNum == null || isNaN(valueNum) || valueNum <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um valor de conversão válido.',
        variant: 'destructive',
      });
      return;
    }
    if (!conversionDate) {
      toast({
        title: 'Data obrigatória',
        description: 'Selecione a data da conversão.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Insert
      const { data: inserted, error: insertErr } = await supabase
        .from('offline_conversions')
        .insert({
          client_id: clientId,
          email: email.trim() || null,
          phone: phone.trim() || null,
          fn: fn.trim() || null,
          ln: ln.trim() || null,
          conversion_date: conversionDate.toISOString(),
          value: valueNum,
          currency: 'BRL',
          country: 'BR',
          event_name: 'Purchase',
          send_status: 'pending',
          zip: zip.trim() || null,
          ct: ct.trim() || null,
          dob: dob.trim() || null,
          doby: doby.trim() || null,
          gen: gen || null,
          age: age ? Number(age) : null,
        })
        .select('id')
        .single();

      if (insertErr || !inserted) throw insertErr || new Error('Falha ao salvar conversão');

      // Call edge function
      const { error: fnError } = await supabase.functions.invoke(
        'send-offline-conversion',
        { body: { conversion_id: inserted.id } },
      );
      if (fnError) throw fnError;

      toast({ title: 'Conversão enviada com sucesso!' });
      reset();
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

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="glass border-white/10 bg-card max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Conversão</DialogTitle>
          <DialogDescription>
            Envie eventos de conversão offline para a Meta (Pixel + CAPI).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Section 1 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Dados Obrigatórios</h3>

            <div className="space-y-1.5">
              <label className={labelCls}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 99999-9999"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Nome</label>
                <input
                  type="text"
                  value={fn}
                  onChange={(e) => setFn(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Sobrenome</label>
                <input
                  type="text"
                  value={ln}
                  onChange={(e) => setLn(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Data da Conversão *</label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'glass-input w-full rounded-xl py-3 px-4 text-sm justify-start font-normal h-auto',
                        !conversionDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2 opacity-70" />
                      {conversionDate
                        ? format(conversionDate, 'dd/MM/yyyy')
                        : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 glass border-white/10"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={conversionDate}
                      onSelect={(d) => {
                        if (d) {
                          setConversionDate(d);
                          setDatePopoverOpen(false);
                        }
                      }}
                      disabled={(d) => d > new Date()}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>

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
                    value={valueStr}
                    onChange={(e) => setValueStr(e.target.value)}
                    placeholder="0,00"
                    required
                    className={cn(inputCls, 'pl-10')}
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground pt-1">
              Moeda: BRL · Evento: Purchase · País: BR
            </p>
          </div>

          {/* Section 2 — collapsible */}
          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Dados adicionais — aumentam a qualidade do match</span>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {expanded && (
              <div className="space-y-3 mt-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelCls}>CEP</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="00000-000"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Cidade</label>
                    <input
                      type="text"
                      value={ct}
                      onChange={(e) => setCt(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelCls}>Data de Nascimento</label>
                    <input
                      type="text"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="MM/DD/AA"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Ano de Nascimento</label>
                    <input
                      type="text"
                      value={doby}
                      onChange={(e) => setDoby(e.target.value)}
                      placeholder="ex: 1990"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelCls}>Gênero</label>
                    <select
                      value={gen}
                      onChange={(e) => setGen(e.target.value as 'M' | 'F' | '')}
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
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
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
      </DialogContent>
    </Dialog>
  );
}
