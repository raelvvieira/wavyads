import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AvatarCustomizerDialog, personaVazia } from './AvatarCustomizerDialog';
import { avatarPresetById } from '../constants/avatarPresets';

function montar(persona = personaVazia()) {
  const onGenerate = vi.fn();
  const onClose = vi.fn();
  render(
    <AvatarCustomizerDialog
      persona={persona}
      titulo="Criar avatar"
      onClose={onClose}
      onGenerate={onGenerate}
    />,
  );
  return { onGenerate, onClose };
}

const nomeInput = () => screen.getByPlaceholderText('Nome da persona');

describe('AvatarCustomizerDialog', () => {
  it('abrir por um preset traz os traços dele preenchidos', () => {
    const preset = avatarPresetById('corporate-pro')!;
    montar(preset.persona);

    expect(screen.getByDisplayValue('Corporate Pro')).toBeTruthy();
    expect(screen.getByRole('button', { name: '31-37' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Corporativo/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('o @handle é derivado do nome, nunca digitado', () => {
    // Dois campos para a mesma identidade divergem no primeiro rename.
    montar();
    fireEvent.change(nomeInput(), { target: { value: 'Ana Editorial' } });
    expect(screen.getByText('@ana_editorial')).toBeTruthy();
  });

  it('estilo acumula: escolher dois mantém os dois marcados', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Fitness/ }));
    fireEvent.click(screen.getByRole('button', { name: /Streetwear/ }));

    expect(screen.getByRole('button', { name: /Fitness/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Streetwear/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('clicar num estilo já marcado desmarca', () => {
    montar();
    const chip = screen.getByRole('button', { name: /Luxo/ });
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('false');
  });

  it('faixa etária e cores são escolha única — a nova substitui a anterior', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: '18-24' }));
    expect(screen.getByRole('button', { name: '18-24' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: '46-55' }));
    expect(screen.getByRole('button', { name: '46-55' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '18-24' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('sem nome não deixa gerar', () => {
    montar();
    expect(screen.getByRole('button', { name: /Gerar avatar/ })).toBeDisabled();
  });

  it('gerar entrega a persona montada, com o que foi alterado', () => {
    const { onGenerate } = montar();
    fireEvent.change(nomeInput(), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: /Ousado/ }));
    fireEvent.change(screen.getByPlaceholderText(/Traços, guarda-roupa/), {
      target: { value: 'jaqueta de couro' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Gerar avatar/ }));

    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ana', styles: ['edgy'], details: 'jaqueta de couro' }),
      [],
    );
  });

  it('persona nula fecha o diálogo', () => {
    render(
      <AvatarCustomizerDialog persona={null} titulo="" onClose={vi.fn()} onGenerate={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('gerando: o botão avisa e trava', () => {
    render(
      <AvatarCustomizerDialog
        persona={{ ...personaVazia(), name: 'Ana' }}
        titulo="Criar avatar"
        busy
        onClose={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Gerando/ })).toBeDisabled();
  });
});
