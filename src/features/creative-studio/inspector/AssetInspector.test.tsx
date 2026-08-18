import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AssetInspector } from './AssetInspector';
import type { CreativeAsset } from '../types/creative';

function asset(patch: Partial<CreativeAsset> & Pick<CreativeAsset, 'id' | 'status'>): CreativeAsset {
  return {
    projectId: 'p', clientId: null, type: 'original', url: null, thumbnailUrl: null,
    parentAssetId: null, rootAssetId: null, groupId: null, factorAxis: null,
    aspectRatio: '4:5', resolution: '2K', width: null, height: null,
    prompt: 'anúncio de verão', negativePrompt: null, model: 'gpt-image-2', errorMessage: null,
    filename: null, isClientIntelligence: false, metadata: {},
    createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z',
    ...patch,
  };
}

function montar(selected: CreativeAsset[]) {
  return render(
    <AssetInspector selected={selected} allAssets={selected} onAction={vi.fn()} onClose={vi.fn()} />,
  );
}

describe('AssetInspector — visualização em tamanho completo', () => {
  it('clicar na imagem abre o diálogo com a arte inteira', () => {
    const pronta = asset({ id: 'a1', status: 'ready', url: 'https://x/a.png' });
    montar([pronta]);

    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver arte em tamanho completo' }));

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toBeTruthy();
    // A mesma URL, sem recorte — ao contrário da miniatura do card, que usa
    // thumbnailUrl quando existe.
    expect(dialogo.querySelector('img')?.getAttribute('src')).toBe('https://x/a.png');
  });

  it('Escape fecha o diálogo', () => {
    const pronta = asset({ id: 'a1', status: 'ready', url: 'https://x/a.png' });
    montar([pronta]);
    fireEvent.click(screen.getByRole('button', { name: 'Ver arte em tamanho completo' }));
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('arte ainda gerando não tem o que abrir — sem botão, sem diálogo', () => {
    const gerando = asset({ id: 'g1', status: 'generating', url: null });
    montar([gerando]);
    expect(screen.queryByRole('button', { name: 'Ver arte em tamanho completo' })).toBeNull();
  });

  it('arte que falhou também não abre — não há imagem para mostrar', () => {
    const falhou = asset({ id: 'f1', status: 'failed', url: null, errorMessage: 'erro' });
    montar([falhou]);
    expect(screen.queryByRole('button', { name: 'Ver arte em tamanho completo' })).toBeNull();
  });

  it('seleção múltipla não mostra imagem nem botão de ampliar', () => {
    const duas = [
      asset({ id: 'a1', status: 'ready', url: 'https://x/a.png' }),
      asset({ id: 'a2', status: 'ready', url: 'https://x/b.png' }),
    ];
    montar(duas);
    expect(screen.queryByRole('button', { name: 'Ver arte em tamanho completo' })).toBeNull();
  });
});
