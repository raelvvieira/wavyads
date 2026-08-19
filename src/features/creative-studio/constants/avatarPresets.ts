import type { AvatarPersona } from '../types/avatarPersona';

/**
 * Personas prontas do Avatar Studio.
 *
 * Ponto de partida, não catálogo fechado: cada uma abre o customizador já
 * preenchida, e o que sai dali é uma persona como outra qualquer. É por
 * isso que `AvatarPreset` carrega uma `AvatarPersona` inteira em vez de um
 * formato próprio — o preset não é um tipo à parte, é um valor inicial.
 *
 * Sem capa própria ainda: o card desenha um gradiente com as tags até a
 * primeira geração daquele preset, que então vira a capa.
 */
export interface AvatarPreset {
  id: string;
  label: string;
  /** Frase curta do card — o que essa persona serve. */
  descricao: string;
  /** Gradiente do card enquanto não há capa gerada. */
  gradiente: [string, string];
  persona: AvatarPersona;
}

function persona(id: string, patch: Partial<AvatarPersona> & Pick<AvatarPersona, 'name' | 'gender' | 'ageRange' | 'styles' | 'hairColor' | 'eyeColor' | 'details'>): AvatarPersona {
  return { presetId: id, ...patch };
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'fashion-model',
    label: 'Fashion Model',
    descricao: 'Editorial de moda, styling de luxo',
    gradiente: ['#8B5CF6', '#2A1B4A'],
    persona: persona('fashion-model', {
      name: 'Fashion Model',
      gender: 'female',
      ageRange: '25-30',
      styles: ['luxury', 'lifestyle', 'streetwear'],
      hairColor: 'dark-brown',
      eyeColor: 'brown',
      details: 'Cachos brilhantes, maçãs do rosto marcadas, olhar editorial confiante, couro streetwear, óculos escuros, styling de luxo polido',
    }),
  },
  {
    id: 'fitness-bro',
    label: 'Fitness Bro',
    descricao: 'Atlético, academia e performance',
    gradiente: ['#14B8A6', '#0B3B36'],
    persona: persona('fitness-bro', {
      name: 'Fitness Bro',
      gender: 'male',
      ageRange: '25-30',
      styles: ['fitness', 'casual'],
      hairColor: 'dark-brown',
      eyeColor: 'brown',
      details: 'Físico definido, barba curta, regata de treino, ambiente de academia com equipamentos ao fundo, luz dura lateral',
    }),
  },
  {
    id: 'soft-girl',
    label: 'Soft Girl',
    descricao: 'Romântico, luz natural, tom suave',
    gradiente: ['#EC4899', '#4A1B32'],
    persona: persona('soft-girl', {
      name: 'Soft Girl',
      gender: 'female',
      ageRange: '18-24',
      styles: ['soft-girl', 'artistic', 'lifestyle'],
      hairColor: 'light-brown',
      eyeColor: 'hazel',
      details: 'Ondas soltas, sardas leves, sorriso doce, blusa de ombro caído com renda, campo florido ao entardecer, luz dourada difusa',
    }),
  },
  {
    id: 'corporate-pro',
    label: 'Corporate Pro',
    descricao: 'Autoridade executiva, alfaiataria',
    gradiente: ['#3B7DD8', '#132A4A'],
    persona: persona('corporate-pro', {
      name: 'Corporate Pro',
      gender: 'male',
      ageRange: '31-37',
      styles: ['corporate', 'luxury'],
      hairColor: 'black',
      eyeColor: 'dark-brown',
      details: 'Barba aparada, terno azul-marinho sob medida com camisa branca aberta, lenço no bolso, lobby de hotel sofisticado ao fundo',
    }),
  },
  {
    id: 'anime-style',
    label: 'Anime Style',
    descricao: 'Estética alternativa, streetwear gráfico',
    gradiente: ['#F59E0B', '#4A2E0B'],
    persona: persona('anime-style', {
      name: 'Anime Style',
      gender: 'female',
      ageRange: '18-24',
      styles: ['artistic', 'streetwear', 'edgy'],
      hairColor: 'black',
      eyeColor: 'dark-brown',
      details: 'Presilhas no cabelo, choker, camiseta gráfica com estampa, camadas de acessórios prateados, ambiente urbano coberto',
    }),
  },
  {
    id: 'instagram-model',
    label: 'Instagram Model',
    descricao: 'Lifestyle solar, clima de viagem',
    gradiente: ['#6366F1', '#1E1B4A'],
    persona: persona('instagram-model', {
      name: 'Instagram Model',
      gender: 'female',
      ageRange: '25-30',
      styles: ['lifestyle', 'luxury', 'minimalist'],
      hairColor: 'dark-brown',
      eyeColor: 'brown',
      details: 'Cabelo longo com ondas naturais, cropped branco canelado e jeans claro, varanda com palmeiras, luz de fim de tarde',
    }),
  },
];

export function avatarPresetById(id: string | null | undefined): AvatarPreset | null {
  if (!id) return null;
  return AVATAR_PRESETS.find((p) => p.id === id) ?? null;
}
