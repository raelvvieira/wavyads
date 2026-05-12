import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  Search,
  Users,
  ShoppingCart,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Loader2,
  CalendarIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { useClients } from '@/hooks/useClients';
import { GlassCard } from '@/components/GlassCard';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type DatePreset = 'today' | 'last_7d' | 'last_30d' | 'this_month' | 'last_month' | 'custom';

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Hoje',
  last_7d: 'Últimos 7 dias',
  last_30d: 'Últimos 30 dias',
  this_month: 'Este mês',
  last_month: 'Mês passado',
  custom: 'Personalizado',
};

function computeRange(preset: DatePreset, custom?: { from?: Date; to?: Date }): { since: Date; until: Date } | null {
  const now = new Date();
  switch (preset) {
    case 'today': return { since: startOfDay(now), until: endOfDay(now) };
    case 'last_7d': return { since: startOfDay(subDays(now, 6)), until: endOfDay(now) };
    case 'last_30d': return { since: startOfDay(subDays(now, 29)), until: endOfDay(now) };
    case 'this_month': return { since: startOfMonth(now), until: endOfDay(now) };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { since: startOfMonth(lm), until: endOfMonth(lm) };
    }
    case 'custom': {
      if (custom?.from && custom?.to) return { since: startOfDay(custom.from), until: endOfDay(custom.to) };
      return null;
    }
  }
}


interface OfflineConversionRow {
  id: string;
  client_id: string;
  email: string | null;
  phone: string | null;
  fn: string | null;
  ln: string | null;
  zip: string | null;
  ct: string | null;
  country: string | null;
  dob: string | null;
  doby: string | null;
  gen: string | null;
  age: number | null;
  event_name: string;
  conversion_date: string;
  value: number | null;
  currency: string | null;
  send_status: string;
  meta_event_id: string | null;
  error_message: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

function formatBRL(v: number | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function StatusBadge({ status, error }: { status: string; error?: string | null }) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" /> Enviado
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        title={error || ''}
        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30"
      >
        <XCircle className="h-3 w-3" /> Erro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground border border-white/10">
      <Clock className="h-3 w-3" /> Pendente
    </span>
  );
}

function TypeBadge({ event }: { event: string }) {
  const isPurchase = event === 'Purchase';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border',
        isPurchase
          ? 'bg-accent/15 text-accent border-accent/30'
          : 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      )}
    >
      {isPurchase ? 'Compra' : 'Lead'}
    </span>
  );
}

export default function ComercialPage() {
  const { isAdmin, isLoading: roleLoading } = useRole();
  const { data: clients } = useClients();
  const qc = useQueryClient();

  const [clientFilter, setClientFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Lead' | 'Purchase'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<OfflineConversionRow | null>(null);
  const [resending, setResending] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['offline-conversions', clientFilter, typeFilter],
    queryFn: async () => {
      let q = supabase
        .from('offline_conversions')
        .select('*')
        .order('conversion_date', { ascending: false })
        .limit(1000);
      if (clientFilter !== 'all') q = q.eq('client_id', clientFilter);
      if (typeFilter !== 'all') q = q.eq('event_name', typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as OfflineConversionRow[];
    },
  });

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    (clients || []).forEach(c => m.set(c.id, c.name));
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r => {
      const name = `${r.fn ?? ''} ${r.ln ?? ''}`.toLowerCase();
      return (
        name.includes(term) ||
        (r.email ?? '').toLowerCase().includes(term) ||
        (r.phone ?? '').toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  const totals = useMemo(() => {
    const leads = filtered.filter(r => r.event_name === 'Lead').length;
    const purchases = filtered.filter(r => r.event_name === 'Purchase').length;
    const value = filtered.reduce((s, r) => s + (r.value || 0), 0);
    return { leads, purchases, value };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleResend = async (row: OfflineConversionRow) => {
    setResending(true);
    try {
      const { error } = await supabase.functions.invoke('send-offline-conversion', {
        body: { conversion_id: row.id },
      });
      if (error) throw error;
      toast({ title: 'Reenviado com sucesso' });
      qc.invalidateQueries({ queryKey: ['offline-conversions'] });
      setSelected(null);
    } catch (err: any) {
      toast({
        title: 'Erro ao reenviar',
        description: err?.message,
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6 flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Comercial</h1>
        <p className="text-sm text-muted-foreground">
          Lista de Leads e Compradores registrados manualmente para a Meta.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Leads</p>
              <p className="text-2xl font-bold metric-number">{totals.leads}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Compradores</p>
              <p className="text-2xl font-bold metric-number">{totals.purchases}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="text-2xl font-bold metric-number">{formatBRL(totals.value)}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar por nome, e-mail ou telefone…"
              className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
            />
          </div>
          {isAdmin && (
            <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full lg:w-[220px] glass-input rounded-xl">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {(clients || []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as any); setPage(0); }}>
            <SelectTrigger className="w-full lg:w-[160px] glass-input rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="Lead">Leads</SelectItem>
              <SelectItem value="Purchase">Compras</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-white/10">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">E-mail</th>
                <th className="text-left px-4 py-3 font-medium">Telefone</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-right px-4 py-3 font-medium">Valor</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                {isAdmin && <th className="text-left px-4 py-3 font-medium">Cliente</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin inline-block" />
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                pageRows.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-normal break-words">
                      {[r.fn, r.ln].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-normal break-words">{r.email || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.phone || '—'}</td>
                    <td className="px-4 py-3"><TypeBadge event={r.event_name} /></td>
                    <td className="px-4 py-3 text-right metric-number">{formatBRL(r.value)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(r.conversion_date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.send_status} error={r.error_message} /></td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-muted-foreground whitespace-normal break-words">
                        {clientNameById.get(r.client_id) || '—'}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs text-muted-foreground">
            <span>{filtered.length} registros · página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="glass border-white/10 overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{[selected.fn, selected.ln].filter(Boolean).join(' ') || 'Detalhes'}</SheetTitle>
                <SheetDescription>
                  {selected.event_name === 'Purchase' ? 'Compra' : 'Lead'} ·{' '}
                  {format(new Date(selected.conversion_date), 'dd/MM/yyyy')}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center gap-2">
                  <TypeBadge event={selected.event_name} />
                  <StatusBadge status={selected.send_status} error={selected.error_message} />
                </div>

                {selected.error_message && (
                  <div className="glass rounded-xl p-3 text-xs text-destructive">
                    {selected.error_message}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="E-mail" value={selected.email} />
                  <Field label="Telefone" value={selected.phone} />
                  <Field label="Nome" value={selected.fn} />
                  <Field label="Sobrenome" value={selected.ln} />
                  <Field label="Valor" value={formatBRL(selected.value)} />
                  <Field label="Moeda" value={selected.currency} />
                  <Field label="Cidade" value={selected.ct} />
                  <Field label="CEP" value={selected.zip} />
                  <Field label="País" value={selected.country} />
                  <Field label="Gênero" value={selected.gen === 'M' ? 'Masculino' : selected.gen === 'F' ? 'Feminino' : null} />
                  <Field label="Idade" value={selected.age?.toString() || null} />
                  <Field label="Data nasc." value={selected.dob} />
                  <Field label="Ano nasc." value={selected.doby} />
                  {isAdmin && <Field label="Cliente" value={clientNameById.get(selected.client_id) || null} />}
                </div>

                {selected.meta_event_id && (
                  <div className="text-[11px] text-muted-foreground break-all">
                    Meta event_id: {selected.meta_event_id}
                  </div>
                )}

                <Button
                  onClick={() => handleResend(selected)}
                  disabled={resending}
                  className="w-full mt-2"
                >
                  {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCw className="h-4 w-4 mr-2" />}
                  Reenviar para Meta
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm break-words">{value || '—'}</p>
    </div>
  );
}
