export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  totalSpend: number;
  activeCampaigns: number;
  createdAt: string;
}

export type CampaignStatus = 'active' | 'paused' | 'ended';

export interface Campaign {
  id: string;
  name: string;
  clientId: string;
  status: CampaignStatus;
  spend: number;
  budget: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  startDate: string;
  endDate: string;
}

export interface Metric {
  label: string;
  value: string;
  change: number;
  icon: string;
}

export interface DailySpend {
  date: string;
  value: number;
}

export type Period = '7d' | '14d' | '30d' | '90d';
