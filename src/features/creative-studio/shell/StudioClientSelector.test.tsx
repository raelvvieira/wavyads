import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudioClientSelector } from './StudioClientSelector';

const CLIENTES = [
  { id: 'c1', name: 'Boutique Aurora' },
  { id: 'c2', name: 'Loja do João' },
];

function montar(patch: Partial<Parameters<typeof StudioClientSelector>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <StudioClientSelector clientId={null} clientName={null} clients={CLIENTES} onChange={onChange} {...patch} />,
  );
  return { onChange };
}

const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Filtrar por cliente' }));

describe('StudioClientSelector', () => {
  it('mostra "Sem cliente" quando nada está selecionado', () => {
    montar();
    expect(screen.getByText('Sem cliente')).toBeTruthy();
  });

  it('mostra o nome do cliente selecionado', () => {
    montar({ clientId: 'c1', clientName: 'Boutique Aurora' });
    expect(screen.getByRole('button', { name: 'Filtrar por cliente' }).textContent).toContain('Boutique Aurora');
  });

  it('escolher um cliente chama onChange com o id', () => {
    const { onChange } = montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Loja do João' }));
    expect(onChange).toHaveBeenCalledWith('c2');
  });

  it('"Sem cliente" na lista limpa a seleção', () => {
    const { onChange } = montar({ clientId: 'c1', clientName: 'Boutique Aurora' });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Sem cliente' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('a busca filtra a lista pelo nome', () => {
    montar();
    abrir();
    fireEvent.change(screen.getByPlaceholderText('Buscar cliente…'), { target: { value: 'joão' } });

    expect(screen.getByRole('button', { name: 'Loja do João' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Boutique Aurora' })).toBeNull();
  });

  it('busca sem resultado mostra o aviso, não uma lista vazia', () => {
    montar();
    abrir();
    fireEvent.change(screen.getByPlaceholderText('Buscar cliente…'), { target: { value: 'inexistente' } });
    expect(screen.getByText('Nenhum cliente encontrado.')).toBeTruthy();
  });

  it('escolher fecha o popover e limpa a busca', () => {
    montar();
    abrir();
    fireEvent.change(screen.getByPlaceholderText('Buscar cliente…'), { target: { value: 'joão' } });
    fireEvent.click(screen.getByRole('button', { name: 'Loja do João' }));

    expect(screen.queryByPlaceholderText('Buscar cliente…')).toBeNull();
  });
});
