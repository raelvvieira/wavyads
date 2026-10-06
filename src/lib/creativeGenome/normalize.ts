import type {
  Confianca,
  CreativeContainer,
  Densidade,
  Funil,
  NivelRisco,
  PresencaCta,
} from './types';

/**
 * Transformar o que vier do `containers.json` num container — ou admitir
 * que não dá.
 *
 * O arquivo é escrito à mão, fora deste código, e evolui: dos 53 containers
 * de hoje, 32 campos aparecem em todos e 8 só em alguns — `regra_de_copy` e
 * `angulos_vedados` existem em exatamente um. Um parser que exigisse o
 * conjunto cheio rejeitaria 52.
 *
 * Duas regras, pelas mesmas razões de sempre:
 *
 * Esta função NUNCA lança. Quem chama carrega o catálogo inteiro; uma
 * entrada malformada não pode derrubar a biblioteca toda.
 *
 * Sem `id` ou sem `descricao_layout` ela devolve `null`. O layout é o que
 * define a peça — sem ele não há o que injetar no prompt, e um container
 * vazio no catálogo é pior que um container a menos: ele pode ser escolhido
 * automaticamente e não faz nada.
 */

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function lista(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(texto).filter(Boolean);
  // Uma lista escrita como texto, uma por linha. O arquivo às vezes faz
  // isso, e quebrar aqui é mais barato que pedir que alguém reescreva.
  if (typeof v === 'string') {
    return v.split('\n').map((l) => l.replace(/^[-*•]+\s*/, '').trim()).filter(Boolean);
  }
  return [];
}

function booleano(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return ['true', 'sim', 'yes', '1'].includes(v.trim().toLowerCase());
  return false;
}

function umDe<T extends string>(v: unknown, aceitos: readonly T[], padrao: T): T {
  const s = texto(v).toLowerCase();
  return (aceitos as readonly string[]).includes(s) ? (s as T) : padrao;
}

const FUNIS = ['topo', 'meio', 'fundo'] as const;
const DENSIDADES = ['baixa', 'media', 'alta'] as const;
const CTAS = ['obrigatorio', 'opcional', 'proibido'] as const;
const RISCOS = ['baixo', 'medio', 'alto'] as const;
const CONFIANCAS = ['alta', 'media', 'baixa'] as const;

export function normalizeContainer(
  raw: unknown,
  origem: CreativeContainer['origem'] = 'arquivo',
): CreativeContainer | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = texto(r.id);
  const descricao_layout = texto(r.descricao_layout);
  // As duas únicas exigências: saber quem é, e saber o que desenhar.
  if (!id || !descricao_layout) return null;

  const funil = lista(r.funil).filter((f): f is Funil =>
    (FUNIS as readonly string[]).includes(f));

  return {
    id,
    nome_pt: texto(r.nome_pt) || texto(r.nome) || id,
    nome_original: texto(r.nome_original) || undefined,
    mimica_de: texto(r.mimica_de) || undefined,

    descricao_layout,
    blocos: lista(r.blocos),
    topologia: texto(r.topologia) || undefined,

    fixo: lista(r.fixo),
    trocavel: lista(r.trocavel),
    numero_de_slots_variaveis: typeof r.numero_de_slots_variaveis === 'number'
      ? r.numero_de_slots_variaveis : undefined,

    exige: lista(r.exige),
    origem_do_ativo: texto(r.origem_do_ativo) || undefined,
    spec_de_producao: r.spec_de_producao ?? undefined,

    proporcao: texto(r.proporcao) || '4:5',
    midia: texto(r.midia) || undefined,
    // Sem funil declarado, a peça concorre em qualquer etapa — é mais
    // honesto que inventar uma.
    funil: funil.length ? funil : [...FUNIS],
    densidade_texto: umDe<Densidade>(r.densidade_texto, DENSIDADES, 'media'),
    presenca_de_cta: umDe<PresencaCta>(r.presenca_de_cta, CTAS, 'opcional'),
    tem_rosto: booleano(r.tem_rosto),
    tem_produto: booleano(r.tem_produto),
    prova_embutida: texto(r.prova_embutida) || undefined,

    regra_de_copy: lista(r.regra_de_copy),
    limite_de_texto_por_bloco: texto(r.limite_de_texto_por_bloco) || undefined,
    voz: texto(r.voz) || undefined,
    angulos_vedados: lista(r.angulos_vedados),

    risco_de_reprovacao: texto(r.risco_de_reprovacao)
      ? umDe<NivelRisco>(r.risco_de_reprovacao, RISCOS, 'medio')
      : undefined,
    risco_motivo: texto(r.risco_motivo) || undefined,

    camada: texto(r.camada) || undefined,
    confianca: texto(r.confianca)
      ? umDe<Confianca>(r.confianca, CONFIANCAS, 'media')
      : undefined,
    exemplo_nicho: texto(r.exemplo_nicho) || undefined,
    exemplo_copy: texto(r.exemplo_copy) || undefined,
    exemplo_paleta: texto(r.exemplo_paleta) || undefined,
    evidencia: texto(r.evidencia) || undefined,
    frames: lista(r.frames),
    aliases: lista(r.aliases),
    correcoes_auditoria: Array.isArray(r.correcoes_auditoria)
      ? (r.correcoes_auditoria as any[])
          .filter((c) => c && texto(c.campo) && texto(c.motivo))
          .map((c) => ({ campo: texto(c.campo), motivo: texto(c.motivo) }))
      : [],
    mercado: texto(r.mercado) || undefined,
    fonte: texto(r.fonte) || undefined,
    pendencias: r.pendencias ?? undefined,

    origem,
  };
}

export interface RelatorioDeCarga {
  ok: CreativeContainer[];
  /** O que não deu para converter, e por quê. Não é erro — é relatório. */
  falhas: { indice: number; id: string; motivo: string }[];
}

/**
 * Carrega o arquivo inteiro, separando o que entrou do que ficou de fora.
 *
 * Devolver as falhas em vez de engoli-las é o que permite ao
 * `containers:check` dizer qual entrada precisa de conserto. Um catálogo que
 * perde entradas em silêncio é um catálogo que encolhe sem ninguém notar.
 */
export function normalizeContainersFile(
  raw: unknown,
  origem: CreativeContainer['origem'] = 'arquivo',
): RelatorioDeCarga {
  // O arquivo é uma lista na raiz, mas um `{ containers: [...] }` é a outra
  // forma provável, e aceitar as duas custa uma linha.
  const itens: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as any)?.containers)
      ? (raw as any).containers
      : [];

  const ok: CreativeContainer[] = [];
  const falhas: RelatorioDeCarga['falhas'] = [];
  const vistos = new Set<string>();

  itens.forEach((item, indice) => {
    const c = normalizeContainer(item, origem);
    const idBruto = texto((item as any)?.id) || `(sem id, posição ${indice})`;

    if (!c) {
      const motivo = !texto((item as any)?.id)
        ? 'sem id'
        : 'sem descricao_layout — não há o que desenhar';
      falhas.push({ indice, id: idBruto, motivo });
      return;
    }
    // Id repetido é pior que entrada faltando: o seletor escolheria um e a
    // tela mostraria outro, sem nada indicar a troca.
    if (vistos.has(c.id)) {
      falhas.push({ indice, id: c.id, motivo: 'id repetido — a primeira ocorrência venceu' });
      return;
    }
    vistos.add(c.id);
    ok.push(c);
  });

  return { ok, falhas };
}
