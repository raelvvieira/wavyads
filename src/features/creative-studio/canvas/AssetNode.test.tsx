import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetNode } from './AssetNode';
import type { CreativeAsset } from '../types/creative';
import type { SelectionAction } from '../state/canvasSelectors';

function asset(over: Partial<CreativeAsset> & { id: string }): CreativeAsset {
  return {
    projectId: 'p', clientId: null, type: 'original', status: 'ready',
    url: 'https://x/a.png', thumbnailUrl: null, parentAssetId: null, rootAssetId: null,
    groupId: null, factorAxis: null, aspectRatio: '4:5', resolution: '4K',
    width: null, height: null, prompt: null, negativePrompt: null, model: null,
    errorMessage: null, filename: null, isClientIntelligence: false,
    metadata: {}, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  } as CreativeAsset;
}

function montar(actions: SelectionAction[]) {
  const onAction = vi.fn();
  const onToggleSelect = vi.fn();
  render(
    <AssetNode
      asset={asset({ id: 'a1' })}
      selected={false}
      onToggleSelect={onToggleSelect}
      onAction={onAction}
      actions={actions}
    />,
  );
  return { onAction };
}

describe('AssetNode', () => {
  it('mostra "Apagar arte" e "Usar como referência" quando disponíveis, e dispara a ação certa', () => {
    const { onAction } = montar(['edit', 'use-as-reference', 'delete']);

    fireEvent.click(screen.getByRole('button', { name: 'Usar como referência' }));
    expect(onAction).toHaveBeenCalledWith('use-as-reference', expect.objectContaining({ id: 'a1' }));

    fireEvent.click(screen.getByRole('button', { name: 'Apagar arte' }));
    expect(onAction).toHaveBeenCalledWith('delete', expect.objectContaining({ id: 'a1' }));
  });

  it('sem essas ações na lista, os botões não aparecem', () => {
    montar(['edit', 'download']);
    expect(screen.queryByRole('button', { name: 'Apagar arte' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Usar como referência' })).toBeNull();
  });
});

describe('AssetNode — ângulo do Fator', () => {
  function montarCard(patch: Partial<CreativeAsset>) {
    render(
      <AssetNode
        asset={asset({ id: 'f1', type: 'factor', ...patch } as any)}
        selected={false}
        onToggleSelect={vi.fn()}
        onAction={vi.fn()}
        actions={[]}
      />,
    );
  }

  it('mostra o ângulo V2 quando a arte tem strategic_angle', () => {
    montarCard({ strategicAngle: 'cost_of_inaction' } as any);
    expect(screen.getByText(/Custo da inação/)).toBeTruthy();
  });

  it('cai no eixo V1 nas artes do motor antigo', () => {
    // §20 da spec: durante a migração o badge precisa continuar legível
    // para o que já foi gerado.
    montarCard({ factorAxis: 'persona' } as any);
    expect(screen.getByText(/Persona/)).toBeTruthy();
  });

  it('o ângulo V2 tem prioridade quando os dois existem', () => {
    montarCard({ strategicAngle: 'proof', factorAxis: 'proof' } as any);
    expect(screen.getByText(/Prova/)).toBeTruthy();
  });
});
