import { Campaign, Client, DailySpend } from '@/types';

export const mockClients: Client[] = [
  { id: '1', name: 'João Silva', company: 'TechBrasil Ltda', email: 'joao@techbrasil.com', phone: '(11) 99999-1234', totalSpend: 45200, activeCampaigns: 3, createdAt: '2024-01-15' },
  { id: '2', name: 'Maria Santos', company: 'E-Shop Digital', email: 'maria@eshop.com', phone: '(21) 98888-5678', totalSpend: 32100, activeCampaigns: 2, createdAt: '2024-02-20' },
  { id: '3', name: 'Carlos Oliveira', company: 'Fitness Pro Academy', email: 'carlos@fitnesspro.com', phone: '(31) 97777-9012', totalSpend: 18750, activeCampaigns: 4, createdAt: '2024-03-10' },
  { id: '4', name: 'Ana Pereira', company: 'Beleza Natural', email: 'ana@belezanatural.com', phone: '(41) 96666-3456', totalSpend: 27300, activeCampaigns: 1, createdAt: '2024-04-05' },
];

export const mockCampaigns: Campaign[] = [
  { id: '1', name: 'Black Friday - Conversão', clientId: '1', status: 'active', spend: 4520, budget: 8000, impressions: 320000, clicks: 12800, conversions: 256, ctr: 4.0, cpc: 0.35, startDate: '2025-01-01', endDate: '2025-01-31' },
  { id: '2', name: 'Remarketing - Carrinho', clientId: '1', status: 'active', spend: 2150, budget: 5000, impressions: 180000, clicks: 5400, conversions: 108, ctr: 3.0, cpc: 0.40, startDate: '2025-01-05', endDate: '2025-02-05' },
  { id: '3', name: 'Lookalike - Compradores', clientId: '1', status: 'paused', spend: 1800, budget: 3000, impressions: 95000, clicks: 2850, conversions: 57, ctr: 3.0, cpc: 0.63, startDate: '2025-01-10', endDate: '2025-02-10' },
  { id: '4', name: 'Tráfego - Blog Posts', clientId: '2', status: 'active', spend: 3200, budget: 6000, impressions: 450000, clicks: 18000, conversions: 180, ctr: 4.0, cpc: 0.18, startDate: '2025-01-01', endDate: '2025-01-31' },
  { id: '5', name: 'Lead Gen - WhatsApp', clientId: '2', status: 'active', spend: 1950, budget: 4000, impressions: 120000, clicks: 4800, conversions: 144, ctr: 4.0, cpc: 0.41, startDate: '2025-01-08', endDate: '2025-02-08' },
  { id: '6', name: 'Awareness - Marca', clientId: '3', status: 'active', spend: 890, budget: 2000, impressions: 280000, clicks: 5600, conversions: 28, ctr: 2.0, cpc: 0.16, startDate: '2025-01-15', endDate: '2025-02-15' },
  { id: '7', name: 'Conversão - Matrícula', clientId: '3', status: 'active', spend: 2800, budget: 5000, impressions: 150000, clicks: 6000, conversions: 180, ctr: 4.0, cpc: 0.47, startDate: '2025-01-01', endDate: '2025-01-31' },
  { id: '8', name: 'Retargeting - Visitantes', clientId: '3', status: 'ended', spend: 1500, budget: 1500, impressions: 85000, clicks: 3400, conversions: 102, ctr: 4.0, cpc: 0.44, startDate: '2024-12-01', endDate: '2024-12-31' },
  { id: '9', name: 'Promoção - Stories', clientId: '3', status: 'paused', spend: 650, budget: 2000, impressions: 95000, clicks: 1900, conversions: 19, ctr: 2.0, cpc: 0.34, startDate: '2025-01-20', endDate: '2025-02-20' },
  { id: '10', name: 'Vendas - Catálogo', clientId: '4', status: 'active', spend: 3800, budget: 7000, impressions: 220000, clicks: 8800, conversions: 264, ctr: 4.0, cpc: 0.43, startDate: '2025-01-01', endDate: '2025-01-31' },
];

export function generateDailySpend(days: number = 30): DailySpend[] {
  const data: DailySpend[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: Math.round((300 + Math.random() * 500) * 100) / 100,
    });
  }
  return data;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toString();
}
