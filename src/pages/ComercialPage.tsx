import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { useClient } from '@/hooks/useClients';
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
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const { data: client } = useClient(clientId);
  const qc = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<'all' | 'Lead' | 'Purchase'>('all');
  const [attributionFilter, setAttributionFilter] = useState<'all' | 'recognized' | 'unrecognized'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<OfflineConversionRow | null>(null);
  const [resending, setResending] = useState(false);

  const [datePreset, setDatePreset] = useState<DatePreset>(() => {
    try { return (localStorage.getItem('comercial_date_preset') as DatePreset) || 'last_30d'; } catch { return 'last_30d'; }
  });
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>(() => {
    try {
      const s = localStorage.getItem('comercial_date_custom');
      if (s) {
        const p = JSON.parse(s);
        return { from: p.from ? new Date(p.from) : undefined, to: p.to ? new Date(p.to) : undefined };
      }
    } catch {}
    return {};
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateRange = computeRange(datePreset, customRange);

  const updatePreset = (p: DatePreset) => {
    setDatePreset(p);
    try { localStorage.setItem('comercial_date_preset', p); } catch {}
    setPage(0);
    if (p === 'custom') setCalendarOpen(true);
  };

  const updateCustomRange = (r: { from?: Date; to?: Date }) => {
    setCustomRange(r);
    try {
      localStorage.setItem('comercial_date_custom', JSON.stringify({
        from: r.from?.toISOString(), to: r.to?.toISOString(),
      }));
    } catch {}
    setPage(0);
  };

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['offline-conversions', clientId, typeFilter, dateRange?.since.toISOString(), dateRange?.until.toISOString()],
    enabled: !!clientId,
    queryFn: async () => {
      let q = supabase
        .from('offline_conversions')
        .select('*')
        .eq('client_id', clientId!)
        .order('conversion_date', { ascending: false })
        .limit(1000);
      if (typeFilter !== 'all') q = q.eq('event_name', typeFilter);
      if (dateRange) {
        q = q.gte('conversion_date', dateRange.since.toISOString())
             .lte('conversion_date', dateRange.until.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as OfflineConversionRow[];
    },
  });

  // Determine if this client is synced for Meta insights
  const syncedClientIds = useMemo(() => {
    if (client?.is_synced && client?.meta_ad_account_id) return [client.id];
    return [];
  }, [client]);

  // Fetch recognized conversions from Meta (aggregated daily by event_name)
  const { data: recognizedByDay } = useQuery({
    queryKey: ['comercial-recognized', syncedClientIds.join(','), dateRange?.since.toISOString(), dateRange?.until.toISOString()],
    enabled: !!dateRange && syncedClientIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const since = format(dateRange!.since, 'yyyy-MM-dd');
      const until = format(dateRange!.until, 'yyyy-MM-dd');
      const results = await Promise.all(
        syncedClientIds.map(async (cid) => {
          try {
            const { data, error } = await supabase.functions.invoke('meta-fetch-insights', {
              body: { action: 'insights', client_id: cid, time_range: { since, until } },
            });
            if (error) return [];
            return (data?.daily || []) as any[];
          } catch { return []; }
        }),
      );
      const map = new Map<string, { Lead: number; Purchase: number }>();
      results.flat().forEach((d: any) => {
        const key: string | undefined = d.date_raw;
        if (!key) return;
        const cur = map.get(key) || { Lead: 0, Purchase: 0 };
        cur.Lead += Number(d.leads || 0);
        cur.Purchase += Number(d.purchases || 0);
        map.set(key, cur);
      });
      return map;
    },
  });

  // Compute "sent" rows per day+type (from current rows already filtered server-side)
  const sentByDayType = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach(r => {
      if (r.send_status !== 'sent') return;
      const day = format(new Date(r.conversion_date), 'yyyy-MM-dd');
      const k = `${day}|${r.event_name}`;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [rows]);

  // Heuristic: a row is "possibly not attributed" when sent, > 7 days old,
  // and on that day+type, sent count exceeds recognized count.
  const isPossiblyUnattributed = (r: OfflineConversionRow): boolean => {
    if (r.send_status !== 'sent') return false;
    const conv = new Date(r.conversion_date).getTime();
    const ageDays = (Date.now() - conv) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) return false;
    const day = format(new Date(r.conversion_date), 'yyyy-MM-dd');
    const sent = sentByDayType.get(`${day}|${r.event_name}`) || 0;
    const rec = recognizedByDay?.get(day)?.[r.event_name as 'Lead' | 'Purchase'] || 0;
    return sent > rec;
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let out = rows;
    if (term) {
      out = out.filter(r => {
        const name = `${r.fn ?? ''} ${r.ln ?? ''}`.toLowerCase();
        return (
          name.includes(term) ||
          (r.email ?? '').toLowerCase().includes(term) ||
          (r.phone ?? '').toLowerCase().includes(term)
        );
      });
    }
    if (attributionFilter !== 'all') {
      out = out.filter(r => {
        const unattr = isPossiblyUnattributed(r);
        return attributionFilter === 'unrecognized' ? unattr : !unattr;
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, attributionFilter, sentByDayType, recognizedByDay]);

  const totals = useMemo(() => {
    const leads = filtered.filter(r => r.event_name === 'Lead').length;
    const purchases = filtered.filter(r => r.event_name === 'Purchase').length;
    const value = filtered.reduce((s, r) => s + (r.value || 0), 0);
    return { leads, purchases, value };
  }, [filtered]);

  // Attribution totals across the date range (independent of search/type filter,
  // because they reflect what Meta reported per day vs. what we sent per day).
  const attributionTotals = useMemo(() => {
    let recognizedLeads = 0;
    let recognizedPurchases = 0;
    let unattributedLeads = 0;
    let unattributedPurchases = 0;

    if (recognizedByDay) {
      recognizedByDay.forEach((v) => {
        recognizedLeads += v.Lead || 0;
        recognizedPurchases += v.Purchase || 0;
      });
    }

    // For each day+type we sent, compute max(0, sent - recognized)
    sentByDayType.forEach((sent, key) => {
      const [day, type] = key.split('|') as [string, 'Lead' | 'Purchase'];
      const rec = recognizedByDay?.get(day)?.[type] || 0;
      const diff = Math.max(0, sent - rec);
      if (type === 'Lead') unattributedLeads += diff;
      else unattributedPurchases += diff;
    });

    return { recognizedLeads, recognizedPurchases, unattributedLeads, unattributedPurchases };
  }, [recognizedByDay, sentByDayType]);

  const showAttributionCards = syncedClientIds.length > 0;

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
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Comercial {client?.name && <span className="text-muted-foreground font-normal">· {client.name}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            Lista de Leads e Compradores registrados manualmente para a Meta.
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/comercial')}
            className="glass-input rounded-xl shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          <Select value={attributionFilter} onValueChange={(v) => { setAttributionFilter(v as any); setPage(0); }}>
            <SelectTrigger className="w-full lg:w-[220px] glass-input rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda atribuição</SelectItem>
              <SelectItem value="recognized">Reconhecidos (estim.)</SelectItem>
              <SelectItem value="unrecognized">Não reconhecidos (estim.)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={datePreset} onValueChange={(v) => updatePreset(v as DatePreset)}>
            <SelectTrigger className="w-full lg:w-[180px] glass-input rounded-xl">
              <CalendarIcon className="h-4 w-4 mr-1 opacity-70" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRESET_LABELS) as DatePreset[]).map(p => (
                <SelectItem key={p} value={p}>{PRESET_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {datePreset === 'custom' && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="glass-input rounded-xl justify-start font-normal h-auto py-2.5">
                  <CalendarIcon className="h-4 w-4 mr-2 opacity-70" />
                  {customRange.from && customRange.to
                    ? `${format(customRange.from, 'dd/MM/yy')} – ${format(customRange.to, 'dd/MM/yy')}`
                    : 'Selecionar datas'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 glass border-white/10" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: customRange.from, to: customRange.to }}
                  onSelect={(r: any) => {
                    updateCustomRange({ from: r?.from, to: r?.to });
                    if (r?.from && r?.to) setCalendarOpen(false);
                  }}
                  numberOfMonths={2}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          )}
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
                
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin inline-block" />
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
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
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={r.send_status} error={r.error_message} />
                        {isPossiblyUnattributed(r) && (
                          <span
                            title="Estimativa: a Meta não confirma atribuição por contato individual. Marcado quando, no mesmo dia, o número de envios deste tipo é maior que o de conversões reconhecidas pela Meta."
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Possivelmente não atribuído
                          </span>
                        )}
                      </div>
                    </td>
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
                  {isAdmin && client?.name && <Field label="Cliente" value={client.name} />}
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
