/**
 * Baixar de verdade, em vez de abrir numa aba.
 *
 * O atributo `download` de uma âncora é IGNORADO quando o arquivo está em
 * outra origem — e o Storage do Supabase é outro domínio. O navegador
 * trata o clique como navegação, mostra a imagem numa aba nova e o usuário
 * ainda precisa salvar à mão. Era isso que acontecia aqui, e não dá para
 * consertar com atributo nenhum.
 *
 * O caminho que funciona é buscar os bytes e salvar a partir de um blob de
 * origem local: aí o `download` volta a valer, porque a URL do objeto é da
 * própria página.
 *
 * Isso depende de o Storage responder com CORS. Quando não responde, a
 * aba nova volta como plano B — pior que baixar, melhor que um clique que
 * não faz nada.
 */

export interface DownloadDeps {
  buscar(url: string): Promise<Blob>;
  salvar(blob: Blob, nome: string): void;
  abrirEmNovaAba(url: string): void;
}

/** Nem todo pedaço de URL serve como nome de arquivo. */
function pareceNomeDeArquivo(candidato: string): boolean {
  // Uma `data:` URI não tem caminho: o "último segmento" é o payload
  // inteiro, e vira um nome de milhares de caracteres cheio de `%` e `,`.
  // O mesmo vale para URL sem caminho nenhum.
  return (
    candidato.length > 0
    && candidato.length <= 80
    && !/[%,;:]/.test(candidato)
  );
}

/**
 * O nome com que o arquivo chega ao computador.
 *
 * Sem extensão o sistema operacional não sabe abrir o arquivo, e o nome
 * guardado no banco nem sempre tem uma — por isso ela vem da URL quando
 * falta. E um nome vazio produziria um arquivo chamado "download".
 */
export function nomeDoArquivo(url: string, preferido?: string | null): string {
  const semQuery = url.split('?')[0].split('#')[0];
  const bruto = semQuery.slice(semQuery.lastIndexOf('/') + 1);
  const daUrl = pareceNomeDeArquivo(bruto) ? bruto : '';
  const extensao = daUrl.includes('.') ? daUrl.slice(daUrl.lastIndexOf('.')) : '.png';

  const base = (preferido ?? '').trim();
  if (!base) return daUrl || `arte${extensao}`;
  return base.includes('.') ? base : `${base}${extensao}`;
}

const PADRAO: DownloadDeps = {
  async buscar(url) {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`Storage respondeu ${resposta.status}`);
    return resposta.blob();
  },
  salvar(blob, nome) {
    const objeto = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objeto;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revogar na hora cancelaria o download em alguns navegadores, que
    // ainda estão lendo o objeto quando o clique retorna.
    setTimeout(() => URL.revokeObjectURL(objeto), 10_000);
  },
  abrirEmNovaAba(url) {
    window.open(url, '_blank', 'noopener');
  },
};

export async function baixarArquivo(
  url: string,
  preferido?: string | null,
  deps: DownloadDeps = PADRAO,
): Promise<void> {
  try {
    const blob = await deps.buscar(url);
    deps.salvar(blob, nomeDoArquivo(url, preferido));
    return;
  } catch {
    // Cai para o plano B abaixo.
  }

  // O plano B também é guardado: um popup bloqueado não pode virar
  // exceção não tratada dentro de um `handleAssetAction` que segue
  // adiante. Baixar é conveniência — falhar aqui não derruba a tela.
  try {
    deps.abrirEmNovaAba(url);
  } catch {
    // Sem saída, e sem barulho.
  }
}
