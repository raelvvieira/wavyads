import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GenerationSettingsPopover } from './GenerationSettingsPopover';
import { IMAGE_GENERATION_MODEL } from '../generation/capabilities';

function montar(patch: Partial<Parameters<typeof GenerationSettingsPopover>[0]> = {}) {
  const onRatioChange = vi.fn();
  const onResolutionChange = vi.fn();
  const onModelChange = vi.fn();
  render(
    <GenerationSettingsPopover
      ratio="4:5"
      resolution="2K"
      modelId={IMAGE_GENERATION_MODEL.id}
      onRatioChange={onRatioChange}
      onResolutionChange={onResolutionChange}
      onModelChange={onModelChange}
      {...patch}
    >
      <button type="button">Abrir configurações</button>
    </GenerationSettingsPopover>,
  );
  return { onRatioChange, onResolutionChange, onModelChange };
}

const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir configurações' }));

describe('GenerationSettingsPopover', () => {
  it('trocar o formato chama onRatioChange com o novo valor', () => {
    const { onRatioChange } = montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: '9:16' }));
    expect(onRatioChange).toHaveBeenCalledWith('9:16');
  });

  it('marca o formato atual como pressionado', () => {
    montar({ ratio: '9:16' });
    abrir();
    expect(screen.getByRole('button', { name: '9:16' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '4:5' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('trocar a resolução chama onResolutionChange', () => {
    const { onResolutionChange } = montar();
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: '4K' }));
    expect(onResolutionChange).toHaveBeenCalledWith('4K');
  });

  it('clicar na resolução já ativa não apaga a seleção', () => {
    // Radix permite desmarcar num toggle-group "single" — sem a guarda,
    // clicar em "2K" já ativo mandaria uma string vazia.
    const { onResolutionChange } = montar({ resolution: '2K' });
    abrir();
    fireEvent.click(screen.getByRole('radio', { name: '2K' }));
    expect(onResolutionChange).not.toHaveBeenCalled();
  });

  it('mostra o único modelo real disponível hoje', () => {
    montar();
    abrir();
    expect(screen.getByText(IMAGE_GENERATION_MODEL.label)).toBeTruthy();
    expect(screen.getByText('Único modelo disponível hoje.')).toBeTruthy();
  });

  it('Escape fecha o popover', () => {
    montar();
    abrir();
    expect(screen.getByRole('button', { name: '9:16' })).toBeTruthy();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: '9:16' })).toBeNull();
  });
});
