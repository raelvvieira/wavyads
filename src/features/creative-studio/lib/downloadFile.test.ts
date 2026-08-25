import { describe, expect, it, vi } from 'vitest';
import { baixarArquivo, nomeDoArquivo, type DownloadDeps } from './downloadFile';

function fakeDeps(patch: Partial<DownloadDeps> = {}) {
  return {
    buscar: vi.fn(async () => new Blob(['bytes'])),
    salvar: vi.fn(),
    abrirEmNovaAba: vi.fn(),
    ...patch,
  } satisfies DownloadDeps & Record<string, any>;
}

describe('nomeDoArquivo', () => {
  it('usa o nome guardado, completando a extensão que falta', () => {
    // O `filename` do banco costuma vir sem extensão. Sem ela o sistema
    // operacional não sabe abrir o arquivo.
    expect(nomeDoArquivo('https://x/storage/arte-123.png', 'combo-clareamento'))
      .toBe('combo-clareamento.png');
  });

  it('respeita a extensão quando o nome já tem uma', () => {
    expect(nomeDoArquivo('https://x/a.png', 'peça.jpg')).toBe('peça.jpg');
  });

  it('sem nome guardado, cai no nome do arquivo na URL', () => {
    expect(nomeDoArquivo('https://x/storage/generated/abc.png', null)).toBe('abc.png');
  });

  it('ignora query e âncora — elas não são parte do nome', () => {
    // URL assinada do Storage vem com `?token=...`; sem isto o arquivo
    // salvo chamaria "abc.png?token=ey...".
    expect(nomeDoArquivo('https://x/abc.png?token=ey&v=2', null)).toBe('abc.png');
    expect(nomeDoArquivo('https://x/abc.png#topo', null)).toBe('abc.png');
  });

  it('data: URI não vira nome de arquivo', () => {
    // Uma data URI não tem caminho: o "último segmento" é o payload
    // inteiro. Sem esta guarda, o arquivo salvo teria milhares de
    // caracteres de nome.
    const dataUri = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%22%3E%3C%2Fsvg%3E';
    expect(nomeDoArquivo(dataUri, null)).toBe('arte.png');
    expect(nomeDoArquivo(dataUri, 'minha-arte')).toBe('minha-arte.png');
  });

  it('URL sem extensão ainda produz um arquivo abrível', () => {
    expect(nomeDoArquivo('https://x/storage/sem-extensao', 'arte')).toBe('arte.png');
  });
});

describe('baixarArquivo', () => {
  it('salva os bytes em vez de abrir uma aba', async () => {
    // O atributo `download` é ignorado em URL de outra origem — e o
    // Storage é outro domínio. Buscar os bytes é o que faz o navegador
    // salvar em vez de navegar.
    const deps = fakeDeps();

    await baixarArquivo('https://storage/arte.png', 'combo', deps);

    expect(deps.buscar).toHaveBeenCalledWith('https://storage/arte.png');
    expect(deps.salvar).toHaveBeenCalledWith(expect.any(Blob), 'combo.png');
    expect(deps.abrirEmNovaAba).not.toHaveBeenCalled();
  });

  it('CORS recusado volta para a aba nova, em vez de não fazer nada', async () => {
    // Pior que baixar, melhor que um clique que não responde.
    const deps = fakeDeps({ buscar: vi.fn(async () => { throw new Error('CORS'); }) });

    await baixarArquivo('https://storage/arte.png', null, deps);

    expect(deps.salvar).not.toHaveBeenCalled();
    expect(deps.abrirEmNovaAba).toHaveBeenCalledWith('https://storage/arte.png');
  });

  it('falha ao salvar também cai no plano B', async () => {
    const deps = fakeDeps({ salvar: vi.fn(() => { throw new Error('sem permissão'); }) });

    await baixarArquivo('https://storage/arte.png', null, deps);

    expect(deps.abrirEmNovaAba).toHaveBeenCalled();
  });

  it('nunca rejeita — um download que falha não pode derrubar a tela', async () => {
    const deps = fakeDeps({
      buscar: vi.fn(async () => { throw new Error('x'); }),
      abrirEmNovaAba: vi.fn(() => { throw new Error('popup bloqueado'); }),
    });

    await expect(baixarArquivo('https://storage/a.png', null, deps)).resolves.toBeUndefined();
  });
});
