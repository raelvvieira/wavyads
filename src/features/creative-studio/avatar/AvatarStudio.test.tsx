import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AvatarStudio } from './AvatarStudio';
import { AVATAR_PRESETS } from '../constants/avatarPresets';
import type { CreativeAsset } from '../types/creative';

function avatarAsset(patch: Partial<CreativeAsset> & Pick<CreativeAsset, 'id'>): CreativeAsset {
  return {
    projectId: 'p', clientId: 'c1', type: 'avatar', status: 'ready',
    url: 'https://x/av.png', thumbnailUrl: null, parentAssetId: null, rootAssetId: null,
    groupId: null, factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
    prompt: null, negativePrompt: null, model: null, errorMessage: null, filename: null,
    isClientIntelligence: false, metadata: {},
    createdAt: '2026-08-19T10:00:00.000Z', updatedAt: '2026-08-19T10:00:00.000Z',
    ...patch,
  } as CreativeAsset;
}

const PERSONA_SALVA = {
  name: 'Ana Editorial', gender: 'female', ageRange: '31-37',
  styles: ['corporate'], hairColor: 'black', eyeColor: 'green',
  details: 'terno claro', presetId: null,
};

describe('AvatarStudio', () => {
  it('lista todas as personas prontas', () => {
    render(<AvatarStudio avatars={[]} onGenerate={vi.fn()} />);
    AVATAR_PRESETS.forEach((p) => {
      expect(screen.getByRole('button', { name: `Personalizar ${p.label}` })).toBeTruthy();
    });
  });

  it('sem avatar do cliente, convida a criar em vez de mostrar grade vazia', () => {
    render(<AvatarStudio avatars={[]} onGenerate={vi.fn()} />);
    expect(screen.getByText(/Nenhum avatar ainda/)).toBeTruthy();
  });

  it('mostra os avatares do cliente pelo nome da persona', () => {
    render(
      <AvatarStudio
        avatars={[avatarAsset({ id: 'av1', metadata: { persona: PERSONA_SALVA } })]}
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Personalizar Ana Editorial' })).toBeTruthy();
  });

  it('clicar num preset abre o customizador já preenchido', () => {
    render(<AvatarStudio avatars={[]} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Personalizar Fitness Bro' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByDisplayValue('Fitness Bro')).toBeTruthy();
  });

  it('clicar num avatar salvo reabre os traços guardados, não os de um preset', () => {
    // O metadata é justamente o que permite reabrir e regerar depois.
    render(
      <AvatarStudio
        avatars={[avatarAsset({ id: 'av1', metadata: { persona: PERSONA_SALVA } })]}
        onGenerate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Personalizar Ana Editorial' }));

    expect(screen.getByDisplayValue('Ana Editorial')).toBeTruthy();
    expect(screen.getByDisplayValue('terno claro')).toBeTruthy();
  });

  it('"Criar avatar" abre o customizador em branco', () => {
    render(<AvatarStudio avatars={[]} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Criar avatar/ }));

    const nome = screen.getByPlaceholderText('Nome da persona') as HTMLInputElement;
    expect(nome.value).toBe('');
  });

  it('avatar gerando mostra o estado, sem imagem quebrada', () => {
    render(
      <AvatarStudio
        avatars={[avatarAsset({ id: 'g1', status: 'generating', url: null })]}
        onGenerate={vi.fn()}
      />,
    );
    const card = document.querySelector('.studio-avatar-card[data-status="generating"]');
    expect(card).toBeTruthy();
    expect(card?.querySelector('img')).toBeNull();
  });

  it('avatar que falhou mostra o erro real', () => {
    render(
      <AvatarStudio
        avatars={[avatarAsset({ id: 'f1', status: 'failed', url: null, errorMessage: 'rosto recusado' })]}
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.getByText('rosto recusado')).toBeTruthy();
  });

  it('a primeira geração de um preset vira a capa do card', () => {
    // Sem banco de imagens próprio, é assim que o card deixa de ser um
    // gradiente sem perder a identidade do preset.
    render(
      <AvatarStudio
        avatars={[avatarAsset({
          id: 'av1',
          url: 'https://x/capa-fashion.png',
          metadata: { persona: { ...PERSONA_SALVA, presetId: 'fashion-model' } },
        })]}
        onGenerate={vi.fn()}
      />,
    );
    const cardPreset = screen.getByRole('button', { name: 'Personalizar Fashion Model' });
    expect(cardPreset.querySelector('img')?.getAttribute('src')).toBe('https://x/capa-fashion.png');
  });
});
