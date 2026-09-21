export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Metric {
  label: string;
  value: string;
  change: number;
  icon: string;
}

export type Period = '7d' | '14d' | '30d' | '90d';
