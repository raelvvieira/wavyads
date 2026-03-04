import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { GlassCard } from './GlassCard';
import { formatCurrency } from '@/data/mock';
import type { MetaCampaign } from '@/hooks/useMetaInsights';

function truncate(s: string, n = 20) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function cplColor(value: number, max: number) {
  const ratio = max > 0 ? value / max : 0;
  if (ratio < 0.33) return '#22c55e';
  if (ratio < 0.66) return '#f59e0b';
  return '#ef4444';
}

const RankingTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
      <p className="font-medium mb-1">{d.fullName}</p>
      <p className="metric-number">{d.formattedValue}</p>
    </div>
  );
};

interface RankingChartsProps {
  campaigns: MetaCampaign[];
}

export function RankingCharts({ campaigns }: RankingChartsProps) {
  const leadsData = useMemo(() => {
    return [...campaigns]
      .filter(c => (c.leads || 0) > 0)
      .sort((a, b) => (b.leads || 0) - (a.leads || 0))
      .slice(0, 8)
      .map(c => ({
        name: truncate(c.name),
        fullName: c.name,
        value: c.leads || 0,
        formattedValue: `${c.leads || 0} leads`,
      }));
  }, [campaigns]);

  const cplData = useMemo(() => {
    return [...campaigns]
      .filter(c => (c.cpl || 0) > 0)
      .sort((a, b) => (a.cpl || 0) - (b.cpl || 0))
      .slice(0, 8)
      .map(c => ({
        name: truncate(c.name),
        fullName: c.name,
        value: c.cpl || 0,
        formattedValue: formatCurrency(c.cpl || 0),
      }));
  }, [campaigns]);

  const maxCpl = cplData.length ? Math.max(...cplData.map(d => d.value)) : 0;

  if (!leadsData.length && !cplData.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {leadsData.length > 0 && (
        <GlassCard className="animate-fade-in">
          <h3 className="text-lg font-semibold mb-4">Leads por Campanha</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, leadsData.length * 40)}>
            <BarChart data={leadsData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
              <Tooltip content={<RankingTooltip />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} fill="#3b82f6" label={{ position: 'right', fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {cplData.length > 0 && (
        <GlassCard className="animate-fade-in">
          <h3 className="text-lg font-semibold mb-4">CPL por Campanha</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, cplData.length * 40)}>
            <BarChart data={cplData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
              <Tooltip content={<RankingTooltip />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                {cplData.map((d, i) => (
                  <Cell key={i} fill={cplColor(d.value, maxCpl)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}
    </div>
  );
}
