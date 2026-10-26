import bruto from './containers.json';
import doGenoma from './containers-genoma.json';
import deOcasioes from './containers-ocasioes.json';
import { normalizeContainersFile, type RelatorioDeCarga } from './normalize';
import type { CreativeContainer } from './types';

/**
 * O catálogo de containers.
 *
 * O `containers.json` é importado como está, sem conversão manual. São 53
 * peças especificadas à mão, cada uma com layout, o que é fixo, o que é
 * trocável, pré-requisitos de produção e regras de copy — converter isso em
 * 53 arquivos TypeScript seria transcrever, não traduzir, e transformaria
 * cada atualização do arquivo numa rodada de reescrita.
 *
 * Mantendo o JSON como fonte de verdade, atualizar o catálogo é trocar um
 * arquivo. O tipo é que se adapta a ele, não o contrário.
 */

/*
 * Três arquivos, um catálogo.
 *
 * `containers.json` são os 53 originais. `containers-genoma.json` são os
 * layouts de estética e odontologia aprovados no Genoma de Criativos
 * (gerado por `ferramentas/exportar_conhecimento.py` naquele repositório e
 * copiado sem edição). `containers-ocasioes.json` cobre o que os 53 não
 * cobrem: evento, oferta, lançamento, depoimento, data comemorativa e
 * inauguração. Juntos numa lista só, passam pelo mesmo normalizador — e um
 * id repetido entre arquivos vira falha de carga, não substituição muda.
 */
const relatorio: RelatorioDeCarga = normalizeContainersFile(
  [...(bruto as unknown[]), ...(doGenoma as unknown[]), ...(deOcasioes as unknown[])],
  'arquivo',
);

/**
 * Ordem estável, alfabética por id.
 *
 * Nunca a ordem do arquivo: o pré-filtro desempata por posição quando a
 * pontuação empata, e uma reordenação do JSON mudaria silenciosamente qual
 * container é escolhido para o mesmo briefing.
 */
export const CONTAINERS: CreativeContainer[] = [...relatorio.ok].sort(
  (a, b) => a.id.localeCompare(b.id),
);

/** O que ficou de fora e por quê. O `containers:check` lê daqui. */
export const FALHAS_DE_CARGA = relatorio.falhas;

export function containerPorId(id: string): CreativeContainer | null {
  return CONTAINERS.find((c) => c.id === id) ?? null;
}

/**
 * Junta o catálogo do arquivo com o que vier de fora (banco, import).
 *
 * Mesma semântica do merge de estilos que o módulo social já usa: entrada
 * de fora com id conhecido SUBSTITUI a do arquivo; id novo entra no fim.
 * É o que permite corrigir um container sem deploy.
 */
export function mergeContainers(
  doArquivo: CreativeContainer[],
  deFora: CreativeContainer[],
): CreativeContainer[] {
  const porId = new Map(doArquivo.map((c) => [c.id, c]));
  for (const c of deFora) porId.set(c.id, c);
  return [...porId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
