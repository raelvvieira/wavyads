import type { CreativeAsset } from '@/features/creative-studio/types/creative';

/**
 * O que o card tem para desenhar.
 *
 * Havia três estados no card — pronta, trabalhando, falhou — e um quarto
 * caso que não era estado nenhum: arte `ready` SEM url. Nenhum dos três
 * ramos acendia, e o card virava um retângulo branco com um rótulo embaixo.
 * Para sempre: esperar não resolvia, recarregar não resolvia.
 *
 * E ele é comum. A consulta da grade lê a view `creative_assets_grid`, que
 * anula `url` quando ela é um `data:` (base64) ou passa de 2048 caracteres
 * — uma decisão correta, porque trezentas linhas com uma imagem inteira
 * dentro de cada uma seriam megabytes de JSON por abertura de tela. Só que
 * a arte continua lá, no `creative_assets`, com a imagem dentro da coluna.
 *
 * Então o card não está sem imagem: está sem o ENDEREÇO dela nesta
 * consulta. São coisas diferentes, e dizer isso é a diferença entre "o
 * sistema perdeu minha arte" e "clique para carregar".
 */
export type EstadoDaImagem = 'pronta' | 'trabalhando' | 'falhou' | 'sem_endereco';

export function estadoDaImagem(
  asset: Pick<CreativeAsset, 'status' | 'url'>,
): EstadoDaImagem {
  if (asset.status === 'queued' || asset.status === 'generating') return 'trabalhando';
  if (asset.status === 'failed') return 'falhou';
  return asset.url ? 'pronta' : 'sem_endereco';
}

/**
 * Quantas artes sem endereço são buscadas sozinhas.
 *
 * Cada recuperação traz a linha INTEIRA do banco — e numa arte que guarda a
 * imagem em base64 isso são alguns megabytes. Buscar todas de uma vez ao
 * abrir a tela trocaria um retângulo branco por uma tela travada.
 *
 * Doze cobre a primeira dobra em qualquer tela: o canvas ordena do mais
 * recente para o mais antigo, e a primeira dobra é onde se olha. O resto
 * recupera com um clique, que é onde o custo fica visível para quem o paga.
 */
export const TETO_DE_RECUPERACAO_AUTOMATICA = 12;

/**
 * Os ids que valem buscar sozinho, na ordem em que aparecem na tela.
 *
 * `jaPedidos` tem dois papéis, e o segundo é o que importa. O primeiro é
 * não pedir a mesma arte duas vezes — a lista muda a cada geração, e sem
 * essa memória a tela entraria em laço. O segundo é o ORÇAMENTO: o teto
 * conta tudo que já foi pedido, não só o que sai desta passada.
 *
 * Sem isso o teto não segura nada. Cada recuperação muda a lista, a lista
 * dispara outra passada, e a passada seguinte pega os doze SEGUINTES — num
 * acervo de trezentas artes sem endereço, as trezentas acabam baixadas, uma
 * cascata atrás da outra. Era exatamente a tela travada que o teto existia
 * para evitar.
 */
export function aRecuperarSozinho(
  assets: Pick<CreativeAsset, 'id' | 'status' | 'url'>[],
  jaPedidos: ReadonlySet<string>,
  teto: number = TETO_DE_RECUPERACAO_AUTOMATICA,
): string[] {
  const orcamento = teto - jaPedidos.size;
  if (orcamento <= 0) return [];

  const alvos: string[] = [];
  for (const a of assets) {
    if (alvos.length >= orcamento) break;
    if (jaPedidos.has(a.id)) continue;
    if (estadoDaImagem(a) === 'sem_endereco') alvos.push(a.id);
  }
  return alvos;
}
