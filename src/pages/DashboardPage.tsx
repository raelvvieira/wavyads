import { useState, useMemo } from 'react';
import { DollarSign, Eye, MousePointer, Target } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell,
} from 'recharts';
import { DashboardHeader } from '@/components/DashboardHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { GlassCard } from '@/components/GlassCard';
import { mockCampaigns, generateDailySpend, formatCurrency, formatNumber } from '@/data/mock';
import { Period } from '@/types';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
      <p className="text-white/60">{label}</p>
      <p className="font-semibold">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export default function DashboardPage() {
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30d');

  const periodDays = { '7d': 7, '14d': 14, '30d': 30, '90d': 90 };
  const dailySpend = useMemo(() => generateDailySpend(periodDays[selectedPeriod]), [selectedPeriod]);

  const campaigns = selectedClient === 'all'
    ? mockCampaigns
    : mockCampaigns.filter((c) => c.clientId === selectedClient);

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

  const topCampaigns = [...campaigns]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
    .map((c) => ({ name: c.name.length > 22 ? c.name.slice(0, 22) + '…' : c.name, spend: c.spend }));

  return (
    <div className="min-h-screen">
      <DashboardHeader
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <div className="p-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricCard label="Total Gasto" value={formatCurrency(totalSpend)} change={12.5} icon={DollarSign} />
          <MetricCard label="Impressões" value={formatNumber(totalImpressions)} change={8.3} icon={Eye} />
          <MetricCard label="Cliques" value={formatNumber(totalClicks)} change={15.7} icon={MousePointer} />
          <MetricCard label="Conversões" value={totalConversions.toString()} change={22.1} icon={Target} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <GlassCard className="lg:col-span-3 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">Gastos por dia</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailySpend}>
                <defs>
                  <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#FF6B35" strokeWidth={2} fill="url(#orangeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard className="lg:col-span-2 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">Top 5 Campanhas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCampaigns} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="spend" radius={[0, 6, 6, 0]} barSize={24}>
                  {topCampaigns.map((_, i) => (
                    <Cell key={i} fill={`url(#barGrad)`} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FF6B35" />
                    <stop offset="100%" stopColor="#FF8E53" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* Campaigns Table */}
        <GlassCard className="animate-fade-in">
          <h3 className="text-lg font-semibold mb-4">Todas as Campanhas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Campanha</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium">Gasto</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium hidden md:table-cell">Impressões</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium hidden md:table-cell">Cliques</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium hidden lg:table-cell">CTR</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium hidden lg:table-cell">CPC</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/5 transition-colors duration-200 hover:bg-white/[0.03] hover:border-l-2 hover:border-l-orange"
                  >
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                    <td className="py-3 px-4 text-right metric-number">{formatCurrency(c.spend)}</td>
                    <td className="py-3 px-4 text-right text-white/60 hidden md:table-cell">{formatNumber(c.impressions)}</td>
                    <td className="py-3 px-4 text-right text-white/60 hidden md:table-cell">{formatNumber(c.clicks)}</td>
                    <td className="py-3 px-4 text-right text-white/60 hidden lg:table-cell">{c.ctr}%</td>
                    <td className="py-3 px-4 text-right text-white/60 hidden lg:table-cell">{formatCurrency(c.cpc)}</td>
                    <td className="py-3 px-4 text-right metric-number">{c.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
