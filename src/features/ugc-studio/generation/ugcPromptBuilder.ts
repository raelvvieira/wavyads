import { brollAngle, type UgcSegment, UGC_SEGMENT_HINTS } from '../types/ugc';

/**
 * Prompts de vídeo do UGC Studio.
 *
 * Separado do `promptBuilder` do Criativo Studio de propósito: aquele monta
 * anúncio ESTÁTICO, com zona segura, escala tipográfica e blocos de texto
 * desenhados para caber num quadro parado. Nada disso se aplica aqui —
 * pedir "headline de 90px dentro do retângulo seguro" a um gerador de vídeo
 * produz texto tremendo e ilegível.
 *
 * A regra que atravessa os dois montadores é a proibição de texto na
 * imagem. No avatar porque a fala já É o conteúdo; no B-roll porque o clipe
 * é matéria-prima que vai ser cortada e legendada depois, e texto queimado
 * no vídeo reapareceria no meio do anúncio final sem controle nenhum.
 */

const SEM_TEXTO = 'Do not render any text, captions, subtitles, logos or watermarks in the video.';

/**
 * Clipe de avatar falando.
 *
 * O retrato gerado pelo Avatar Studio entra como primeiro quadro (a URL vai
 * separada, no corpo da chamada). O prompt descreve o movimento e a fala; a
 * identidade vem da imagem, não da descrição — é o que mantém a mesma
 * pessoa nos quatro segmentos.
 */
export function buildAvatarClipPrompt(input: {
  speech: string;
  segment: UgcSegment;
  durationSeconds: number;
  hasProductImage?: boolean;
}): string {
  const blocos = [
    '[FORMAT]',
    `Vertical 9:16 short-form social video, ${input.durationSeconds} seconds, single continuous take.`,
    '',
    '[SUBJECT]',
    'The person in the reference image is speaking directly to a phone camera held at arm\'s length, as if recording a story for a friend. Preserve their face, hair, skin tone and clothing exactly as in the reference — this same person appears across every clip of the ad.',
    '',
    '[PERFORMANCE]',
    // O papel narrativo muda a entrega. Sem isto os quatro segmentos saem
    // com a mesma energia e o anúncio fica plano.
    UGC_SEGMENT_HINTS[input.segment],
    'Natural micro-movements, relaxed posture, unpolished handheld feel. Not a commercial, not a presenter.',
    '',
    '[SPEECH]',
    'The person says exactly this, and nothing else:',
    `"${input.speech.trim()}"`,
    '',
    '[SETTING]',
    'Everyday indoor space with soft natural light, slightly out of focus behind the person.',
    input.hasProductImage ? 'They hold the product from the reference image naturally in frame while speaking.' : '',
    '',
    '[DO NOT INCLUDE]',
    SEM_TEXTO,
    'No studio lighting, no tripod stillness, no stock-footage polish.',
  ];

  return blocos.filter((b) => b !== '').join('\n');
}

/**
 * Clipe de B-roll do produto.
 *
 * Sem pessoa falando e, quase sempre, sem áudio que importe: é o material
 * que cobre a fala do avatar na montagem final.
 */
export function buildBrollClipPrompt(input: {
  angleId: string;
  durationSeconds: number;
  productDescription?: string | null;
}): string {
  const angulo = brollAngle(input.angleId);

  const blocos = [
    '[FORMAT]',
    `Vertical 9:16 product b-roll, ${input.durationSeconds} seconds, single continuous shot.`,
    '',
    '[SHOT]',
    angulo?.promptFragment ?? 'the product presented clearly in frame with gentle camera motion',
    '',
    '[PRODUCT]',
    'The product is the one in the reference image. Keep its shape, colour, label and proportions exactly — do not redesign, restyle or invent packaging.',
    input.productDescription ? `Context: ${input.productDescription.trim().slice(0, 400)}` : '',
    '',
    '[TREATMENT]',
    'Cinematic but grounded: shallow depth of field, real surfaces, believable lighting. Commercial quality without looking like generic stock.',
    '',
    '[DO NOT INCLUDE]',
    SEM_TEXTO,
    'No people speaking to camera, no on-screen graphics, no price tags.',
  ];

  return blocos.filter((b) => b !== '').join('\n');
}
