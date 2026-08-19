import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AttachMenu } from './AttachMenu';
import type { CreativeAsset } from '../types/creative';
import type { CopyBankEntry } from '../api/copyBank';

const uploadDataUrlToCreativeStorage = vi.fn();
vi.mock('../api/storageUpload', () => ({
  uploadDataUrlToCreativeStorage: (...a: any[]) => uploadDataUrlToCreativeStorage(...a),
}));

const suggestCopyVariations = vi.fn();
vi.mock('../api/copySuggestions', () => ({
  suggestCopyVariations: (...a: any[]) => suggestCopyVariations(...a),
}));

function asset(id: string, type: CreativeAsset['type']): CreativeAsset {
  return {
    id, projectId: 'p', clientId: null, type, status: 'ready',
    url: `https://x/${id}.png`, thumbnailUrl: null, parentAssetId: null, rootAssetId: null,
    groupId: null, factorAxis: null, aspectRatio: '1:1', resolution: null, width: null, height: null,
    prompt: null, negativePrompt: null, model: null, errorMessage: null, filename: `${id}.png`,
    isClientIntelligence: false, metadata: {},
    createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z',
  };
}

function copyEntry(id: string, copyText: string): CopyBankEntry {
  return { id, copyText, tema: 'promoção', createdAt: '2026-08-19T10:00:00.000Z' };
}

function montar(opts: {
  referenceLibrary?: CreativeAsset[];
  logoLibrary?: CreativeAsset[];
  productLibrary?: CreativeAsset[];
  copyBank?: CopyBankEntry[];
} = {}) {
  const onAttach = vi.fn();
  const onNewLibraryUpload = vi.fn();
  render(
    <AttachMenu
      referenceLibrary={opts.referenceLibrary ?? []}
      logoLibrary={opts.logoLibrary ?? []}
      productLibrary={opts.productLibrary ?? []}
      copyBank={opts.copyBank ?? []}
      onAttach={onAttach}
      onNewLibraryUpload={onNewLibraryUpload}
    >
      <button type="button">Abrir anexos</button>
    </AttachMenu>,
  );
  return { onAttach, onNewLibraryUpload };
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
    const { onAttach } = montar({ referenceLibrary: [asset('ref1', 'reference')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência' }));

    fireEvent.click(screen.getByRole('button', { name: /Anexar ref1\.png/ }));

    expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'reference', value: 'https://x/ref1.png',
    }));
    expect(screen.queryByRole('button', { name: 'Anexar referência' })).toBeNull(); // fechou
  });

  it('referência vazia mostra o aviso, não uma grade em branco', () => {
    montar();
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

  it('logo: sobe o arquivo, anexa e também salva pra reuso', async () => {
    uploadDataUrlToCreativeStorage.mockResolvedValue('https://x/logo-enviado.png');
    const { onAttach, onNewLibraryUpload } = montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar logo' }));

    const arquivo = new File(['conteudo'], 'logo.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [arquivo] } });

    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'logo', value: 'https://x/logo-enviado.png',
    })));
    expect(onNewLibraryUpload).toHaveBeenCalledWith('logo', 'https://x/logo-enviado.png');
  });

  it('logo: com um já salvo, mostra a grade e anexa direto no clique', () => {
    const { onAttach } = montar({ logoLibrary: [asset('logo1', 'logo')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar logo' }));

    fireEvent.click(screen.getByRole('button', { name: /Anexar logo1\.png/ }));

    expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'logo', value: 'https://x/logo1.png',
    }));
  });

  it('produto: sobe o arquivo, anexa com kind "product" e também salva pra reuso', async () => {
    uploadDataUrlToCreativeStorage.mockResolvedValue('https://x/produto-enviado.png');
    const { onAttach, onNewLibraryUpload } = montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar produto' }));

    const arquivo = new File(['conteudo'], 'produto.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [arquivo] } });

    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'product', value: 'https://x/produto-enviado.png', label: 'Produto',
    })));
    expect(onNewLibraryUpload).toHaveBeenCalledWith('product', 'https://x/produto-enviado.png');
  });

  it('produto: com um já salvo, mostra a grade e anexa direto no clique', () => {
    const { onAttach } = montar({ productLibrary: [asset('prod1', 'product')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar produto' }));

    fireEvent.click(screen.getByRole('button', { name: /Anexar prod1\.png/ }));

    expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'product', value: 'https://x/prod1.png',
    }));
  });

  it('copy: sem histórico, não mostra a lista de já usadas', () => {
    montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));
    expect(screen.queryByText('Já usadas com este cliente')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sugerir variações' })).toBeNull();
  });

  it('copy: com histórico, clicar numa entrada preenche o texto sem anexar direto', () => {
    const { onAttach } = montar({ copyBank: [copyEntry('cb1', 'Até 50% OFF — só hoje')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));

    fireEvent.click(screen.getByRole('button', { name: 'Até 50% OFF — só hoje' }));

    expect(onAttach).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/Cole o texto final/)).toHaveValue('Até 50% OFF — só hoje');
  });

  it('copy: sugerir variações mostra 4 cartões, clicar num deles preenche o texto', async () => {
    suggestCopyVariations.mockResolvedValue([
      { angulo: 'Direto/Benefício', texto: 'Garanta já o seu desconto' },
      { angulo: 'Urgência/Escassez', texto: 'Só até hoje à meia-noite' },
    ]);
    montar({ copyBank: [copyEntry('cb1', 'Até 50% OFF — só hoje')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Até 50% OFF — só hoje' }));

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir variações' }));

    expect(suggestCopyVariations).toHaveBeenCalledWith(expect.objectContaining({
      referenceCopy: 'Até 50% OFF — só hoje', tema: 'promoção',
    }));
    await waitFor(() => expect(screen.getByText('Garanta já o seu desconto')).toBeTruthy());

    fireEvent.click(screen.getByText('Garanta já o seu desconto'));
    expect(screen.getByPlaceholderText(/Cole o texto final/)).toHaveValue('Garanta já o seu desconto');
  });

  it('copy: erro ao sugerir mostra mensagem, sem travar o painel', async () => {
    suggestCopyVariations.mockRejectedValue(new Error('IA não retornou variações'));
    montar({ copyBank: [copyEntry('cb1', 'Até 50% OFF')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Até 50% OFF' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sugerir variações' }));

    await waitFor(() => expect(screen.getByText('IA não retornou variações')).toBeTruthy());
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
