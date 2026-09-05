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
  avatarLibrary?: CreativeAsset[];
  copyBank?: CopyBankEntry[];
  allAssets?: CreativeAsset[];
  onDeleteAsset?: ReturnType<typeof vi.fn>;
} = {}) {
  const onAttach = vi.fn();
  const onNewLibraryUpload = vi.fn();
  const onDeleteAsset = opts.onDeleteAsset ?? vi.fn(async () => {});
  render(
    <AttachMenu
      referenceLibrary={opts.referenceLibrary ?? []}
      logoLibrary={opts.logoLibrary ?? []}
      productLibrary={opts.productLibrary ?? []}
      avatarLibrary={opts.avatarLibrary ?? []}
      copyBank={opts.copyBank ?? []}
      allAssets={opts.allAssets ?? []}
      onAttach={onAttach}
      onNewLibraryUpload={onNewLibraryUpload}
      onDeleteAsset={onDeleteAsset}
    >
      <button type="button">Abrir anexos</button>
    </AttachMenu>,
  );
  return { onAttach, onNewLibraryUpload, onDeleteAsset };
}

const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir anexos' }));

beforeEach(() => vi.clearAllMocks());

describe('AttachMenu', () => {
  it('lista as cinco opções ao abrir', () => {
    montar();
    abrir();
    ['Anexar referência', 'Anexar logo', 'Anexar copy', 'Anexar produto', 'Anexar avatar'].forEach((rotulo) => {
      expect(screen.getByRole('button', { name: rotulo })).toBeTruthy();
    });
  });

  it('referência: clicar na miniatura abre a imagem inteira; o anexo vem de lá', () => {
    // Antes o clique anexava direto. Uma miniatura quadrada com
    // `object-cover` corta a arte, e a três por linha não dá para saber
    // qual das cinco referências é aquela — anexava-se no escuro.
    const { onAttach } = montar({ referenceLibrary: [asset('ref1', 'reference')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência' }));

    fireEvent.click(screen.getByRole('button', { name: /Ver ref1\.png/ }));
    expect(onAttach).not.toHaveBeenCalled();

    // A coluna mostra a URL ORIGINAL, não a miniatura.
    const grande = screen.getByAltText('ref1.png') as HTMLImageElement;
    expect(grande.src).toBe('https://x/ref1.png');

    fireEvent.click(screen.getByRole('button', { name: 'Anexar' }));
    expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'reference', value: 'https://x/ref1.png',
    }));
    expect(screen.queryByRole('button', { name: 'Anexar referência' })).toBeNull(); // fechou
  });

  it('a lixeira não apaga no primeiro clique — ela pergunta, com a imagem à vista', async () => {
    // `deleteCreativeAsset` é exclusão de verdade, sem lixeira e sem
    // desfazer. Confirmar sobre uma miniatura de 80px seria confirmar no
    // escuro.
    const { onDeleteAsset } = montar({ referenceLibrary: [asset('ref1', 'reference')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência' }));

    fireEvent.click(screen.getByRole('button', { name: 'Apagar ref1.png' }));
    expect(onDeleteAsset).not.toHaveBeenCalled();
    expect(screen.getByText('Apagar esta referência?')).toBeTruthy();
    expect(screen.getByAltText('ref1.png')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Sim, apagar' }));
    await waitFor(() => expect(onDeleteAsset).toHaveBeenCalledTimes(1));
    expect(onDeleteAsset.mock.calls[0][0].id).toBe('ref1');
  });

  it('"Não" volta a ver a imagem, sem apagar nada', () => {
    const { onDeleteAsset } = montar({ referenceLibrary: [asset('ref1', 'reference')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar ref1.png' }));

    fireEvent.click(screen.getByRole('button', { name: 'Não' }));

    expect(onDeleteAsset).not.toHaveBeenCalled();
    expect(screen.queryByText('Apagar esta referência?')).toBeNull();
    expect(screen.getByRole('button', { name: 'Anexar' })).toBeTruthy();
  });

  it('a confirmação diz em quantas artes a referência entrou', () => {
    // "Tem certeza?" não muda decisão nenhuma. "Foi usada em 2 artes" muda.
    const ref = asset('ref1', 'reference');
    const arteQueUsou = (id: string) => ({
      ...asset(id, 'original'),
      metadata: { productImages: ['https://x/ref1.png'] },
    }) as CreativeAsset;
    montar({ referenceLibrary: [ref], allAssets: [arteQueUsou('a1'), arteQueUsou('a2')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar ref1.png' }));

    expect(screen.getByText(/Foi usada em 2 artes/)).toBeTruthy();
  });

  it('sem quem apague, a miniatura não oferece lixeira', () => {
    // Quem não sabe apagar não mostra o botão — é a diferença entre um
    // gatilho ausente e um gatilho que falha em silêncio.
    render(
      <AttachMenu
        referenceLibrary={[asset('ref1', 'reference')]}
        logoLibrary={[]} productLibrary={[]} avatarLibrary={[]} copyBank={[]} allAssets={[]}
        onAttach={vi.fn()} onNewLibraryUpload={vi.fn()}
      >
        <button type="button">Abrir sem apagar</button>
      </AttachMenu>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abrir sem apagar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência' }));

    expect(screen.queryByRole('button', { name: 'Apagar ref1.png' })).toBeNull();
    expect(screen.getByRole('button', { name: /Ver ref1\.png/ })).toBeTruthy();
  });

  it('erro ao apagar aparece ao lado da imagem, e o item continua lá', async () => {
    const onDeleteAsset = vi.fn(async () => { throw new Error('RLS negou'); });
    montar({ referenceLibrary: [asset('ref1', 'reference')], onDeleteAsset });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar ref1.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, apagar' }));

    await waitFor(() => expect(screen.getByText('RLS negou')).toBeTruthy());
    expect(screen.getByRole('button', { name: /Ver ref1\.png/ })).toBeTruthy();
  });

  it('referência sem acervo ainda oferece o envio de imagens', () => {
    montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência' }));
    expect(screen.getByText('Solte, clique ou cole as referências')).toBeTruthy();
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

  it('logo: com um já salvo, ver e anexar', () => {
    const { onAttach } = montar({ logoLibrary: [asset('logo1', 'logo')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar logo' }));

    fireEvent.click(screen.getByRole('button', { name: /Ver logo1\.png/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Anexar' }));

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

  it('produto: com um já salvo, ver e anexar', () => {
    const { onAttach } = montar({ productLibrary: [asset('prod1', 'product')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar produto' }));

    fireEvent.click(screen.getByRole('button', { name: /Ver prod1\.png/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Anexar' }));

    expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'product', value: 'https://x/prod1.png',
    }));
  });

  it('copy: sem histórico, some a lista — mas NÃO o "Sugerir variações"', () => {
    // O botão vivia dentro do bloco do histórico e sumia junto com ele.
    // Só que ele trabalha a partir do texto digitado tanto quanto de uma
    // copy escolhida — e para todo cliente que ainda não tinha copy salva o
    // painel virava um textarea nu.
    montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));
    expect(screen.queryByText('Já usadas com este cliente')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sugerir variações' })).toBeTruthy();
    expect(screen.getByText('Escreva um texto abaixo para a IA variar.')).toBeTruthy();
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

  it('copy: sugerir liga com texto DIGITADO, sem precisar escolher da lista', async () => {
    // Era assim que o recurso parecia quebrado: `disabled={!selecionada}`
    // mantinha o botão em 40% de opacidade até você clicar numa entrada do
    // histórico, e nada dizia por quê. Quem cola um texto quer variações
    // dele tanto quanto quem reaproveita uma copy antiga.
    suggestCopyVariations.mockResolvedValue([{ angulo: 'Curiosidade/Hook', texto: 'E se fosse hoje?' }]);
    montar({ copyBank: [copyEntry('cb1', 'Até 50% OFF')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));

    fireEvent.change(screen.getByPlaceholderText(/Cole o texto final/), {
      target: { value: 'Sua janela sem privacidade' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sugerir variações' }));

    expect(suggestCopyVariations).toHaveBeenCalledWith(expect.objectContaining({
      referenceCopy: 'Sua janela sem privacidade',
    }));
    await waitFor(() => expect(screen.getByText('E se fosse hoje?')).toBeTruthy());
  });

  it('copy: sem copy escolhida nem texto, o botão diz o que falta', () => {
    // Botão apagado sem explicação é indistinguível de botão quebrado.
    montar({ copyBank: [copyEntry('cb1', 'Até 50% OFF')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));

    expect(screen.getByRole('button', { name: 'Sugerir variações' })).toBeDisabled();
    expect(screen.getByText(/Escolha uma copy acima ou escreva um texto/)).toBeTruthy();
  });

  it('copy: as alternativas abrem numa coluna própria, com rótulo', async () => {
    suggestCopyVariations.mockResolvedValue([{ angulo: 'Prova/Autoridade', texto: 'Mais de 400 janelas' }]);
    montar({ copyBank: [copyEntry('cb1', 'Até 50% OFF')] });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Até 50% OFF' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sugerir variações' }));

    await waitFor(() => expect(screen.getByText('Alternativas')).toBeTruthy());
    expect(screen.getByText('Mais de 400 janelas')).toBeTruthy();
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

  it('avatar: a grade lista os já gerados e anexa com kind "avatar"', () => {
    const av = asset('av1', 'avatar');
    const { onAttach } = montar({
      avatarLibrary: [{ ...av, metadata: { persona: { name: 'Ana Editorial' } } } as any],
    });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar avatar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Ver Ana Editorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anexar' }));

    expect(onAttach).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'avatar', value: 'https://x/av1.png', label: 'Ana Editorial',
    }));
  });

  it('avatar: sem nenhum, manda criar no Avatar Studio — não oferece upload', () => {
    // Avatar NASCE gerado, a partir de traços. Um dropzone aqui criaria um
    // segundo caminho para o mesmo conceito, sem persona nenhuma.
    montar();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Anexar avatar' }));

    expect(screen.getByText(/Nenhum avatar ainda/)).toBeTruthy();
    expect(document.querySelector('input[type="file"]')).toBeNull();
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
