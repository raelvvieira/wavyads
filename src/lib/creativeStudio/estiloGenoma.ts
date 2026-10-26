import pacote from './estilosGenoma.json';
import type { LeituraDoFavorito } from './favorito';

/**
 * Os estilos de estética e odontologia do Genoma de Criativos.
 *
 * Vêm do repositório `raelvvieira/genoma-de-criativos`, onde cada regra foi
 * aprendida numa peça aprovada ou corrigida: realismo de iPhone, close no
 * sorriso, escala de cor encostada na boca, dourado metalizado em vez de
 * amarelo, margens do feed, e os limites do CFO e da Meta. O arquivo
 * `estilosGenoma.json` é gerado lá por `ferramentas/exportar_conhecimento.py`
 * e copiado para cá sem edição manual.
 *
 * Mora no código, e não em `creative_templates`, porque nada no Studio lê
 * aquela tabela e porque um JSON no bundle chega com o deploy: não depende
 * de migração aplicada nem de política de RLS para aparecer.
 *
 * Anexar um estilo é anexar um favorito que não é arte do cliente: o
 * documento já está escrito, então não custa leitura de visão, e
 * `designSystemFromReference` fica `false` porque o estilo não traz marca,
 * rosto nem copy de terceiros para proibir.
 */

export interface EstiloGenoma {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  paleta: string;
  hexes: string[];
  /** A estrutura da peça, com os campos de texto como `<slot>`. */
  layout: string;
}

export const ESTILOS_GENOMA: EstiloGenoma[] = pacote.estilos;

/** O estilo, com o documento completo que a geração lê. */
export function lerEstiloGenoma(id: string | null | undefined): LeituraDoFavorito | null {
  const estilo = ESTILOS_GENOMA.find((e) => e.id === id);
  if (!estilo) return null;

  const doc = [
    pacote.docBase.trimEnd(),
    '',
    `TEMPLATE · ${estilo.nome}`,
    estilo.descricao,
    `Palette: ${estilo.paleta} (${estilo.hexes.join(', ')}).`,
    'Layout (fill each <slot> with the content of the brief, in Brazilian Portuguese; never print the slot names):',
    estilo.layout,
  ].join('\n');

  return {
    designSystemDoc: doc,
    antiPadroes: pacote.antiPadroes,
    designSystemFromReference: false,
    mood: pacote.mood,
    // Os 53 containers do Genoma Wavy são outra taxonomia; o layout do
    // estilo já vai no documento, e o formato fica livre para o pedido.
    containerId: null,
    nome: `Genoma · ${estilo.nome}`,
  };
}
