import {
  TETO_RESUMO,
  type CreativeGenome,
  type GenomeMood,
  type GenomeVisualAnalysis,
} from './types';

/**
 * Transformar o que vier num genoma — ou admitir que não dá.
 *
 * O conteúdo de um genoma nasce fora do código: markdown escrito à mão,
 * uma linha de `creative_templates`, um JSON exportado de outra ferramenta.
 * Nenhuma dessas fontes vai respeitar o tipo de primeira, e um genoma mal
 * convertido é PIOR que genoma nenhum — ele vai ser escolhido
 * automaticamente e estragar artes em silêncio.
 *
 * Por isso duas regras:
 *
 * Esta função NUNCA lança. Quem chama está carregando um catálogo inteiro;
 * um arquivo malformado não pode derrubar a biblioteca toda.
 *
 * Sem LAYOUT ela devolve `null`, e não um genoma vazio. O layout é o
 * núcleo: é ele que diz onde a mensagem mora. Um genoma sem layout não tem
 * o que injetar no prompt — aceitá-lo encheria o catálogo de entradas que o
 * seletor pode escolher e que não fazem nada.
 *
 * Note que a exigência NÃO é `designSystemDoc`. Um "cartaz" é uma regra de
 * composição que serve a qualquer paleta, e não opina sobre cor — exigir
 * paleta rejeitaria metade dos containers reais.
 */

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function lista(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(texto).filter(Boolean);
  // Aceita a forma que o seeder usa: um texto com uma regra por linha,
  // cada uma começando com "- ". É assim que `negative_prompt` chega.
  if (typeof v === 'string') {
    return v.split('\n').map((l) => l.replace(/^[-*]+\s*/, '').trim()).filter(Boolean);
  }
  return [];
}

/** Slug a partir do nome, para quando o `id` não vem. */
export function slugDe(nome: string): string {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * As duas primeiras frases, cortadas no teto.
 *
 * Existe porque o resumo é obrigatório para a escolha automática, mas
 * quem escreve um genoma pensa no documento técnico e esquece dele. Melhor
 * um resumo derivado — ainda que tosco — do que um genoma invisível ao
 * seletor.
 */
export function resumirEm(fonte: string, teto = TETO_RESUMO): string {
  const limpo = fonte.replace(/\s+/g, ' ').trim();
  if (!limpo) return '';
  const frases = limpo.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  const base = frases || limpo;
  return base.length <= teto ? base : `${base.slice(0, teto - 1).trimEnd()}…`;
}

/**
 * O layout, de onde quer que ele venha.
 *
 * O `containers.json` de onde esse conteúdo nasce não conhece o nosso tipo:
 * a mesma ideia pode chegar como `layout`, `estrutura`, `composicao` ou
 * `rules`, e como string, lista ou objeto aninhado. Aceitar as três formas
 * aqui é mais barato que pedir que alguém reescreva o arquivo.
 */
function containerDe(r: Record<string, unknown>): CreativeGenome['container'] | null {
  const bruto = r.container ?? r.layout ?? r.estrutura ?? r.structure
    ?? r.composicao ?? r.composition ?? r.regras_layout;

  let descricao = '';
  let regioes: { papel: any; onde: string }[] | undefined;

  if (typeof bruto === 'string') {
    descricao = bruto.trim();
  } else if (Array.isArray(bruto)) {
    descricao = lista(bruto).join('\n');
  } else if (bruto && typeof bruto === 'object') {
    const b = bruto as Record<string, unknown>;
    descricao = texto(b.descricao) || texto(b.description) || texto(b.estrutura);
    if (Array.isArray(b.regioes)) {
      regioes = (b.regioes as any[])
        .filter((x) => x && texto(x.papel) && texto(x.onde))
        .map((x) => ({ papel: texto(x.papel), onde: texto(x.onde) }));
    }
    // Objeto aninhado sem `descricao`: achata em linhas `chave: valor`. É
    // como `{"topo": "...", "centro": "..."}` sobrevive.
    if (!descricao && !regioes?.length) {
      descricao = Object.entries(b)
        .filter(([, v]) => typeof v === 'string' && v.trim())
        .map(([k, v]) => `${k}: ${String(v).trim()}`)
        .join('\n');
    }
  }

  if (!descricao && !regioes?.length) return null;
  return {
    descricao,
    ...(regioes?.length ? { regioes } : {}),
    ...(texto(r.formatoNativo) ? { formatoNativo: texto(r.formatoNativo) as any } : {}),
  };
}

function moodDe(v: unknown): GenomeMood | null {
  if (!v || typeof v !== 'object') return null;
  const m = v as Record<string, unknown>;
  const mood: GenomeMood = {
    adjetivos: lista(m.adjetivos),
    referencias: lista(m.referencias),
    evita: lista(m.evita),
  };
  // Um mood sem nenhuma das três listas não é um mood — é ruído que faria
  // o bloco [MOOD] sair com cabeçalho e nada embaixo.
  const vazio = !mood.adjetivos.length && !mood.referencias.length && !mood.evita.length;
  return vazio ? null : mood;
}

function analiseDe(v: unknown): GenomeVisualAnalysis | null {
  if (!v || typeof v !== 'object') return null;
  const a = v as Record<string, unknown>;
  const saida: GenomeVisualAnalysis = {};
  for (const chave of ['composicao', 'fotografia', 'paleta', 'tipografia'] as const) {
    if (a[chave] && typeof a[chave] === 'object') saida[chave] = a[chave] as any;
  }
  const camadas = lista(a.camadas);
  if (camadas.length) saida.camadas = camadas;
  if (texto(a.hierarquiaVisual)) saida.hierarquiaVisual = texto(a.hierarquiaVisual);
  if (texto(a.espaco)) saida.espaco = texto(a.espaco);
  const mood = moodDe(a.mood);
  if (mood) saida.mood = mood;
  return Object.keys(saida).length ? saida : null;
}

export function normalizeGenome(
  raw: unknown,
  origem: CreativeGenome['origem'],
): CreativeGenome | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const designSystemDoc = texto(r.designSystemDoc) || texto(r.design_system_doc);
  const container = containerDe(r);
  // A única exigência real: onde a mensagem mora.
  if (!container) return null;

  const nome = texto(r.nome) || texto(r.name) || 'Genoma sem nome';
  const id = texto(r.id) || slugDe(nome);

  const antiPadroes = lista(r.antiPadroes).length
    ? lista(r.antiPadroes)
    : lista(r.negativePrompt ?? r.negative_prompt);

  const regrasBrutas = (r.regras ?? {}) as Record<string, unknown>;
  const intendedFor = lista(regrasBrutas.intendedFor ?? r.intendedFor ?? r.niche ?? r.nicho);

  return {
    id,
    nome,
    resumo: resumirEm(
      texto(r.resumo) || texto(r.description) || texto(r.descricao)
      || container.descricao || designSystemDoc,
    ),
    container,
    designSystemDoc: designSystemDoc || undefined,
    antiPadroes,
    regras: {
      intendedFor,
      avoidWhen: lista(regrasBrutas.avoidWhen ?? r.avoidWhen),
      palavrasChave: lista(regrasBrutas.palavrasChave ?? r.tags),
      nichos: lista(regrasBrutas.nichos ?? r.niche ?? r.nicho),
      formatos: lista(regrasBrutas.formatos) as any,
    },
    mood: moodDe(r.mood ?? (r.styleMetadata as any)?.mood ?? (r.style_metadata as any)?.mood),
    visualAnalysis: analiseDe(
      r.visualAnalysis
        ?? (r.layoutStructure as any)?.visualAnalysis
        ?? (r.layout_structure as any)?.visualAnalysis,
    ),
    tags: lista(r.tags),
    previewUrl: texto(r.previewUrl) || texto(r.preview_url) || null,
    prioridade: typeof r.prioridade === 'number' ? r.prioridade : 0,
    // Default `true`: ver o comentário de `terceiros` em types.ts. Só um
    // `false` explícito desliga a cláusula que protege a marca de origem.
    terceiros: r.terceiros === false ? false : true,
    origem,
  };
}
