import {
  AVATAR_EYE_LABELS,
  AVATAR_GENDER_PROMPT,
  AVATAR_HAIR_LABELS,
  AVATAR_STYLE_PROMPT,
  type AvatarPersona,
} from '../types/avatarPersona';

/**
 * Prompt de retrato da persona.
 *
 * Deliberadamente SEPARADO de `buildCreativePrompt`: aquele monta anúncio —
 * safe zone, blocos de texto, CTA, design system. Um retrato de persona não
 * tem nada disso, e enfiá-lo lá significaria carregar meia dúzia de blocos
 * inúteis e uma safe zone que só atrapalha o enquadramento do rosto.
 *
 * O que este prompt precisa garantir é o oposto do prompt de anúncio:
 * NENHUM texto na imagem. O avatar é matéria-prima de outra geração — texto
 * queimado nele reapareceria dentro do anúncio final.
 */

/** Cores viajam em inglês; os rótulos PT-BR são só da interface. */
const HAIR_EN: Record<string, string> = {
  black: 'black',
  'dark-brown': 'dark brown',
  'light-brown': 'light brown',
  blonde: 'blonde',
  'platinum-blonde': 'platinum blonde',
  red: 'red',
  auburn: 'auburn',
  ginger: 'ginger',
  grey: 'grey',
  white: 'white',
  pink: 'pink',
  blue: 'blue',
  purple: 'purple',
  green: 'green',
  silver: 'silver',
};

const EYE_EN: Record<string, string> = {
  brown: 'brown',
  'dark-brown': 'dark brown',
  hazel: 'hazel',
  green: 'green',
  blue: 'blue',
  grey: 'grey',
  amber: 'amber',
  black: 'black',
};

export interface AvatarPromptInput {
  persona: AvatarPersona;
  /** Quantas fotos de referência acompanham o pedido. */
  referenceCount?: number;
}

export function buildAvatarPrompt(input: AvatarPromptInput): string {
  const { persona, referenceCount = 0 } = input;

  const sujeito = `[SUBJECT]
Photorealistic portrait of a ${AVATAR_GENDER_PROMPT[persona.gender]}, ${persona.ageRange} years old.
Build a consistent, believable individual — one specific person, not a composite or an average face.`;

  const referencias = referenceCount > 0
    ? `[REFERENCE PHOTOS]
${referenceCount} reference photo(s) of a real person are attached. The generated portrait MUST preserve their facial structure, skin tone and overall likeness. Treat the face as a fixed reference — restyle wardrobe, hair treatment, lighting and setting around it, never the identity itself.`
    : '';

  const estetica = persona.styles.length > 0
    ? `[STYLE & AESTHETIC]
${persona.styles.map((s) => `- ${AVATAR_STYLE_PROMPT[s]}`).join('\n')}`
    : '';

  const tracos = `[PHYSICAL TRAITS]
Hair: ${HAIR_EN[persona.hairColor] ?? persona.hairColor}.
Eyes: ${EYE_EN[persona.eyeColor] ?? persona.eyeColor}, clearly readable at portrait distance.`;

  const detalhes = persona.details.trim()
    ? `[ADDITIONAL DETAILS]
${persona.details.trim()}`
    : '';

  // O tratamento fotográfico não é decoração: sem ele o modelo entrega
  // retrato de banco de imagens, que é exatamente o que um anúncio não
  // pode parecer.
  const tratamento = `[PHOTOGRAPHIC TREATMENT]
Editorial portrait photography. Full-frame camera, 85mm lens, shallow depth of field with the face in sharp focus.
Soft directional key light with gentle fill — natural, dimensional, never flat on-camera flash.
Natural skin texture with visible pores and fine detail. No plastic smoothing, no heavy retouching, no beauty filter.
Framing: head and upper torso, subject facing the camera, eyes to the lens.`;

  const naoIncluir = `[DO NOT INCLUDE]
- Any text, lettering, caption, watermark, logo or signature anywhere in the image
- Collage, split frames, multiple panels or more than one person
- Extra or malformed hands, fingers or limbs
- Waxy plastic skin, over-smoothed features, uncanny doll-like rendering
- Generic stock-photo posing and expression`;

  return [sujeito, referencias, estetica, tracos, detalhes, tratamento, naoIncluir]
    .filter(Boolean)
    .join('\n\n');
}

/** Resumo curto da persona — legenda do card, título do asset. */
export function describeAvatarPersona(persona: AvatarPersona): string {
  const partes = [
    `${persona.ageRange} anos`,
    ...persona.styles.slice(0, 2).map((s) => s),
  ];
  return partes.join(' · ');
}
