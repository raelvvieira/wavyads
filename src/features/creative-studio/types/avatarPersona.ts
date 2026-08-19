/**
 * Vocabulário da persona de avatar.
 *
 * Listas fechadas de propósito: o prompt de retrato é montado a partir
 * delas, então texto livre em cada traço viraria prompt imprevisível. O que
 * o usuário quer dizer fora do vocabulário cabe em `details`, que é
 * justamente o campo livre.
 */

export const AVATAR_GENDERS = ['female', 'male', 'non-binary'] as const;
export type AvatarGender = (typeof AVATAR_GENDERS)[number];

export const AVATAR_GENDER_LABELS: Record<AvatarGender, string> = {
  female: 'Feminino',
  male: 'Masculino',
  'non-binary': 'Não-binário',
};

/** Como o gênero entra no prompt — em inglês, como o resto do prompt. */
export const AVATAR_GENDER_PROMPT: Record<AvatarGender, string> = {
  female: 'woman',
  male: 'man',
  'non-binary': 'androgynous person',
};

export const AVATAR_AGE_RANGES = [
  '18-24', '25-30', '31-37', '38-45', '46-55', '56-65', '66-75', '76-85',
] as const;
export type AvatarAgeRange = (typeof AVATAR_AGE_RANGES)[number];

export const AVATAR_STYLES = [
  'luxury', 'lifestyle', 'fitness', 'casual', 'streetwear',
  'artistic', 'corporate', 'soft-girl', 'edgy', 'minimalist',
] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export const AVATAR_STYLE_LABELS: Record<AvatarStyle, string> = {
  luxury: 'Luxo',
  lifestyle: 'Lifestyle',
  fitness: 'Fitness',
  casual: 'Casual',
  streetwear: 'Streetwear',
  artistic: 'Artístico',
  corporate: 'Corporativo',
  'soft-girl': 'Soft Girl',
  edgy: 'Ousado',
  minimalist: 'Minimalista',
};

/**
 * Cada estilo vira uma frase, não a palavra solta.
 *
 * "luxury" sozinho num prompt de imagem produz joia e ouro; o que se quer é
 * a direção de guarda-roupa e tratamento — por isso a tradução é uma
 * descrição, não um rótulo.
 */
export const AVATAR_STYLE_PROMPT: Record<AvatarStyle, string> = {
  luxury: 'high-end designer wardrobe, refined tailoring, quiet-luxury styling',
  lifestyle: 'natural everyday styling, relatable and candid',
  fitness: 'athletic build, activewear, gym or outdoor training context',
  casual: 'relaxed casual clothing, denim and knitwear, unfussy',
  streetwear: 'contemporary streetwear, layered urban silhouettes, sneakers',
  artistic: 'expressive artistic styling, unconventional textures and silhouettes',
  corporate: 'sharp business attire, tailored suit or blazer, executive polish',
  'soft-girl': 'soft romantic styling, pastel palette, delicate fabrics, gentle expression',
  edgy: 'bold edgy styling, dark palette, leather, strong attitude',
  minimalist: 'minimalist wardrobe, clean lines, neutral palette, no visual noise',
};

export const AVATAR_HAIR_COLORS = [
  'black', 'dark-brown', 'light-brown', 'blonde', 'platinum-blonde',
  'red', 'auburn', 'ginger', 'grey', 'white',
  'pink', 'blue', 'purple', 'green', 'silver',
] as const;
export type AvatarHairColor = (typeof AVATAR_HAIR_COLORS)[number];

export const AVATAR_HAIR_LABELS: Record<AvatarHairColor, string> = {
  black: 'Preto',
  'dark-brown': 'Castanho escuro',
  'light-brown': 'Castanho claro',
  blonde: 'Loiro',
  'platinum-blonde': 'Loiro platinado',
  red: 'Ruivo',
  auburn: 'Acaju',
  ginger: 'Alaranjado',
  grey: 'Grisalho',
  white: 'Branco',
  pink: 'Rosa',
  blue: 'Azul',
  purple: 'Roxo',
  green: 'Verde',
  silver: 'Prateado',
};

/** Amostra usada na bolinha do chip — não entra no prompt. */
export const AVATAR_HAIR_SWATCH: Record<AvatarHairColor, string> = {
  black: '#1A1A1A',
  'dark-brown': '#4A2C1A',
  'light-brown': '#8B5E34',
  blonde: '#D4A843',
  'platinum-blonde': '#E8E0C8',
  red: '#A32B1C',
  auburn: '#8C3A24',
  ginger: '#D2622B',
  grey: '#8A8A8E',
  white: '#F2F2F2',
  pink: '#E86AA0',
  blue: '#3B7DD8',
  purple: '#8B5CF6',
  green: '#3E9E60',
  silver: '#C3C7CC',
};

export const AVATAR_EYE_COLORS = [
  'brown', 'dark-brown', 'hazel', 'green', 'blue', 'grey', 'amber', 'black',
] as const;
export type AvatarEyeColor = (typeof AVATAR_EYE_COLORS)[number];

export const AVATAR_EYE_LABELS: Record<AvatarEyeColor, string> = {
  brown: 'Castanho',
  'dark-brown': 'Castanho escuro',
  hazel: 'Mel',
  green: 'Verde',
  blue: 'Azul',
  grey: 'Cinza',
  amber: 'Âmbar',
  black: 'Preto',
};

export const AVATAR_EYE_SWATCH: Record<AvatarEyeColor, string> = {
  brown: '#7B4B2A',
  'dark-brown': '#3F2415',
  hazel: '#9A7B3F',
  green: '#3E8E5A',
  blue: '#3B7DD8',
  grey: '#8A8A8E',
  amber: '#C88A2B',
  black: '#1A1A1A',
};

/**
 * A persona inteira.
 *
 * É o que o customizador edita, o que vira prompt e o que fica guardado em
 * `creative_assets.metadata.persona` — para reabrir e regerar depois.
 */
export interface AvatarPersona {
  name: string;
  gender: AvatarGender;
  ageRange: AvatarAgeRange;
  styles: AvatarStyle[];
  hairColor: AvatarHairColor;
  eyeColor: AvatarEyeColor;
  /** Texto livre: o que o vocabulário fechado não cobre. */
  details: string;
  /** Preset de origem, quando veio de um. Null para persona do zero. */
  presetId: string | null;
}

/**
 * `@handle` a partir do nome.
 *
 * Derivado, nunca digitado: dois campos para a mesma identidade divergem no
 * primeiro rename, e o handle é só a forma curta do nome.
 */
export function handleFromName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base ? `@${base}` : '';
}
