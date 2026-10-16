import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CreativeScoreBadge } from './CreativeScoreBadge';
import { notaDoCriativo } from '@/lib/dashboard/notaDoCriativo';

const REF = { custoPorResultado: 50, ctr: 2, holdRate: 30 };
const ad = (p: any = {}) => ({
  spend: 1000, results: 20, cost_per_result: 50, ctr: 2, hook_rate: 25, hold_rate: 30, ...p,
});

const montar = (n: any) =>
  render(<TooltipProvider delayDuration={0}><CreativeScoreBadge nota={n} /></TooltipProvider>);

describe('CreativeScoreBadge', () => {
  it('no card, só o número e uma palavra', () => {
    montar(notaDoCriativo(ad({ cost_per_result: 25, ctr: 4, hold_rate: 60 }), REF));
    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('Escalar')).toBeTruthy();
  });

  it('gastar sem resultado vira "Parar", não uma nota baixa', () => {
    montar(notaDoCriativo(ad({ spend: 300, results: 0 }), REF));
    expect(screen.getByText('Parar')).toBeTruthy();
  });

  it('a conta inteira fica a um hover — é o que torna a nota contestável', async () => {
    // A plataforma do benchmark esconde a fórmula. Uma nota que ninguém
    // pode conferir é uma nota em que ninguém confia na primeira vez que
    // ela discordar do faro do gestor.
    montar(notaDoCriativo(ad(), REF));
    fireEvent.focus(screen.getByText('50').closest('span')!);
    const textos = await screen.findAllByText(/Custo|CTR|Retenção/);
    expect(textos.length).toBeGreaterThan(0);
  });

  it('amostra pequena avisa de si no próprio selo', () => {
    const n = notaDoCriativo(ad({ results: 2, cost_per_result: 25 }), REF);
    expect(n.poucoDado).toBe(true);
    montar(n);
    expect(screen.getByLabelText('poucos dados')).toBeTruthy();
  });
});
