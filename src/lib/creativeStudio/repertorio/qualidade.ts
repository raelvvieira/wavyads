import { contem, normalizar } from './texto';

/**
 * A régua de qualidade.
 *
 * São as regras aprendidas peça a peça no Genoma de Criativos, com o que o
 * cliente aprovou e o que corrigiu: realismo de foto de celular, uma ideia
 * por peça, texto grande e longe do degradê, metal em degradê e nunca
 * chapado. Valem para qualquer nicho. As de saúde e estética — nada de
 * antes e depois gerado, nada de promessa — entram quando o pedido é desse
 * nicho, porque é ali que a Meta e o conselho profissional reprovam.
 */

export interface Nicho {
  id: 'estetica' | 'odontologia' | 'saude';
  nome: string;
  termos: string[];
}

export const NICHOS: Nicho[] = [
  { id: 'odontologia', nome: 'odontologia', termos: ['dentista', 'odonto', 'odontologia', 'odontologica', 'clareamento', 'sorriso', 'dente', 'dentes',
    'lente de contato dental', 'lentes de contato', 'faceta', 'facetas', 'implante', 'aparelho ortodontico', 'ortodontia', 'alinhador', 'limpeza dental', 'gengiva'] },
  { id: 'estetica', nome: 'estética', termos: ['estetica', 'harmonizacao', 'botox', 'toxina botulinica', 'preenchimento', 'bioestimulador', 'skinbooster',
    'peeling', 'laser', 'depilacao', 'microagulhamento', 'limpeza de pele', 'rejuvenescimento', 'lipo', 'criolipolise', 'dermatologia', 'dermato', 'skincare', 'pele'] },
  { id: 'saude', nome: 'saúde', termos: ['clinica', 'medico', 'medica', 'consultorio', 'fisioterapia', 'nutricionista', 'psicologa', 'psicologo', 'tratamento', 'procedimento'] },
];

export function lerNicho(texto: string | null | undefined): Nicho | null {
  const t = normalizar(texto);
  if (!t.trim()) return null;
  return NICHOS.find((n) => n.termos.some((termo) => contem(t, termo))) ?? null;
}

/** Containers que servem ao nicho quando o pedido não é de ocasião nenhuma. */
export function containersDoNicho(nicho: Nicho | null, ctx: { pessoas: number; produtos: number }): string[] {
  if (!nicho) return [];
  const doGenoma = [
    'genoma_pergunta_caixa_vidro', 'genoma_palavra_gigante_close', 'genoma_anuncio_close_manchete',
    'genoma_manchete_cena_clinica', 'genoma_colagem_sorrisos', 'genoma_anuncio_anotacoes_rodape', 'genoma_anuncio_campanha_dourada',
  ];
  const editoriais = ['capa_educativa_macro', 'pergunta_editorial_serifada', 'editorial_premium_com_pilula_cta', 'toque_vidro_fosco', 'palavra_riscada_split'];
  return [
    ...(ctx.produtos > 0 ? ['genoma_anuncio_objeto_luxo'] : []),
    ...doGenoma,
    ...(nicho.id === 'odontologia' ? [] : editoriais),
  ];
}

const UNIVERSAIS = [
  'People must look like real photographs: phone-camera realism, natural window or ambient light, real skin texture with pores, natural hair, correct hands; never plastic, waxy, airbrushed or "AI-looking".',
  'One clear idea per piece: one dominant element, one message, at most three type sizes.',
  'Text: perfect Brazilian Portuguese spelling and accents; large enough to read on a phone (nothing smaller than about 24px on a 1080px-wide canvas); always on a calm area or on a veil / panel, never on a busy part of the photo and never over the fade between photo and background.',
  'Background with texture and life (light, grain, fabric, depth) instead of a flat empty colour, unless a minimalist look was asked for.',
  'Metallic colours (gold, silver, rose gold) only as gradients with a soft highlight — never flat yellow or flat grey.',
  'When there is a call to action, render it as a clear button or pill, last in the reading order.',
  'Finish like a senior designer: aligned edges, consistent margins, intentional hierarchy, nothing cramped against the edges.',
];

const POR_NICHO: Record<Nicho['id'], string[]> = {
  odontologia: [
    'Frame tight on the smile (from nose to chin, or eyes to chin): teeth large and clearly visible, healthy natural shade, bright but never fake veneers.',
    'For whitening, a tooth shade guide held right next to the smile reads instantly: a row of small tooth-shaped tabs going from yellowish on the left to very white on the right, no brand name.',
    'Clinical scenes are clean and real: gloved hands, mirror, ultrasonic tip, white and bright surgery.',
  ],
  estetica: [
    'Skin close-ups keep real texture; the result looks natural and healthy, never frozen, overfilled or filtered.',
    'Clinical scenes are clean and real: gloved hands, professional devices, bright minimal clinic.',
  ],
  saude: [
    'Clinical scenes are clean, bright and real; professionals look competent and warm.',
  ],
};

const NUNCA_SAUDE = [
  'Any before/after or result comparison that is not built from attached real patient photos — never generate, simulate or retouch a result',
  'Any promise of results ("garantido", "definitivo", "resultado na primeira sessão")',
  'Any AI-generated person presented as a real patient or as the real professional',
];

export function blocoDeQualidade(nicho: Nicho | null): string {
  const linhas = ['[QUALITY BAR]', ...UNIVERSAIS.map((l) => `- ${l}`)];
  if (nicho) linhas.push(...POR_NICHO[nicho.id].map((l) => `- ${l}`));
  return linhas.join('\n');
}

/** Linhas a mais para o [DO NOT INCLUDE], só no nicho de saúde. */
export function naoIncluirDoNicho(nicho: Nicho | null): string[] {
  return nicho ? NUNCA_SAUDE : [];
}
