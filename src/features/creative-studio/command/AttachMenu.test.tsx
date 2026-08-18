import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AttachMenu } from './AttachMenu';
import type { CreativeAsset } from '../types/creative';

const uploadDataUrlToCreativeStorage = vi.fn();
vi.mock('../api/storageUpload', () => ({
  uploadDataUrlToCreativeStorage: (...a: any[]) => uploadDataUrlToCreativeStorage(...a),
}));

function referencia(id: string): CreativeAsset {
  return {
    id, projectId: 'p', clientId: null, type: 'reference', status: 'ready',
    url: `https://x/${id}.png`, thumbnailUrl: null, parentAssetId: null, rootAssetId: null,
    groupId: null, factorAxis: null, aspectRatio: '1:1', resolution: null, width: null, height: null,
    prompt: null, negativePrompt: null, model: null, errorMessage: null, filename: `${id}.png`,
    isClientIntelligence: false, metadata: {},
    createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z',
  };
}

function montar(referenceLibrary: CreativeAsset[] = []) {
  const onAttach = vi.fn();
  render(
    <AttachMenu referenceLibrary={referenceLibrary} onAttach={onAttach}>
      <button type="button">Abrir anexos</button>
    </AttachMenu>,
  );
  return { onAttach };
}

const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir anexos' }));

beforeEach(() => vi.clearAllMocks());

describe('AttachMenu', () => {
  it('lista as quatro opções ao abrir', () => {
    montar();
    abrir();
    ['Anexar referência', 'Anexar logo', 'Anexar copy', 'Anexar produto'].forEach((rotulo) => {
      expect(screen.getByRole('button', { name: rotulo })).toBeTruthy();
    });
  });

  it('referência: clicar numa miniatura anexa e fecha', () => {
    const { onAttach } = montar([referencia('ref1')]);
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência' }));

    fireEvent.click(screen.getByRole('button', { name: /Anexar ref1\.png/ }));

    expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'reference', value: 'https://x/ref1.png',
    }));
    expect(screen.queryByRole('button', { name: 'Anexar referência' })).toBeNull(); // fechou
  });

  it('referência vazia mostra o aviso, não uma grade em branco', () => {
    montar([]);
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência' }));
    expect(screen.getByText('Nenhuma referência salva ainda.')).toBeTruthy();
  });

  it('copy: digitar e confirmar anexa o texto literal', () => {
    const { onAttach } = montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));

    fireEvent.change(screen.getByPlaceholderText(/Cole o texto final/), {
      target: { value: 'Até 50% OFF — só hoje' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Anexar' }));

    expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'copy', value: 'Até 50% OFF — só hoje',
    }));
  });

  it('copy: não deixa anexar vazio', () => {
    montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));
    expect(screen.getByRole('button', { name: 'Anexar' })).toBeDisabled();
  });

  it('logo: sobe o arquivo antes de anexar, e o anexo carrega a URL enviada', async () => {
    uploadDataUrlToCreativeStorage.mockResolvedValue('https://x/logo-enviado.png');
    const { onAttach } = montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar logo' }));

    const arquivo = new File(['conteudo'], 'logo.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [arquivo] } });

    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'logo', value: 'https://x/logo-enviado.png',
    })));
  });

  it('produto: sobe o arquivo e anexa com kind "product"', async () => {
    // Este anexo alimenta `productImageUrls` na geração — é o mesmo canal
    // que "Anexar arquivos" já usava, só com o nome batendo com a função.
    uploadDataUrlToCreativeStorage.mockResolvedValue('https://x/produto-enviado.png');
    const { onAttach } = montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar produto' }));

    const arquivo = new File(['conteudo'], 'produto.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [arquivo] } });

    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'product', value: 'https://x/produto-enviado.png', label: 'Produto',
    })));
  });

  it('Voltar retorna à lista sem fechar o popover', () => {
    montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));
    expect(screen.queryByRole('button', { name: 'Anexar referência' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('button', { name: 'Anexar referência' })).toBeTruthy();
  });
});
