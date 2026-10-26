import { contem, normalizar, posicao } from './texto';

/**
 * Cor e tema pedidos por escrito.
 *
 * "Faz em verde", "branco e dourado", "mais premium", "bem minimalista":
 * até aqui isso era texto solto dentro do brief, e quem decidia a paleta era
 * o documento de estilo — lido de uma referência de terceiros ou de um
 * favorito. Pedir "inspirado nesse anexo, mas em verde" saía com as cores do
 * anexo, porque nada no prompt dizia quem manda.
 *
 * Este módulo lê o pedido e devolve as cores e o tema EXPLÍCITOS, para o
 * prompt declarar que eles vencem o documento de estilo. É regra escrita à
 * mão, sem IA: precisa funcionar no instante da leitura e com a edge
 * function fora do ar.
 */

export interface CorPedida {
  nome: string;
  /** Como o modelo de imagem deve entender a cor. */
  descricao: string;
  hex: string;
}

interface CorConhecida extends CorPedida {
  termos: string[];
}

/*
 * Os termos mais específicos vêm antes: "verde sálvia" precisa ganhar de
 * "verde", e "azul petróleo" de "azul". A busca para no primeiro termo que
 * casa em cada cor, e uma cor já coberta por outra mais específica é
 * descartada.
 */
const CORES: CorConhecida[] = [
  { nome: 'dourado', termos: ['dourado', 'dourada', 'ouro', 'gold', 'champagne', 'champanhe'], hex: '#CFAE6B',
    descricao: 'metallic champagne gold as a gradient (#EBD9AE to #CFAE6B to #A9843F) with a soft highlight, never flat yellow' },
  { nome: 'prata', termos: ['prata', 'prateado', 'prateada', 'silver'], hex: '#C0C4C8',
    descricao: 'metallic silver as a gradient with a soft highlight, never flat grey' },
  { nome: 'rose gold', termos: ['rose gold', 'rosé gold', 'ouro rose'], hex: '#D4A59A',
    descricao: 'metallic rose gold as a gradient with a soft highlight' },
  { nome: 'verde sálvia', termos: ['verde salvia', 'salvia', 'verde oliva', 'oliva', 'verde musgo', 'musgo'], hex: '#8FAF8C',
    descricao: 'soft sage / olive green' },
  { nome: 'verde esmeralda', termos: ['verde esmeralda', 'esmeralda', 'verde escuro', 'verde floresta', 'verde garrafa'], hex: '#1F4D3A',
    descricao: 'deep emerald / forest green' },
  { nome: 'verde', termos: ['verde', 'verdes'], hex: '#2F6B4F', descricao: 'green' },
  { nome: 'azul petróleo', termos: ['azul petroleo', 'petroleo', 'teal'], hex: '#1E4B57', descricao: 'deep petrol blue / teal' },
  { nome: 'azul marinho', termos: ['azul marinho', 'marinho', 'navy', 'azul escuro'], hex: '#1F2F4F', descricao: 'navy blue' },
  { nome: 'azul claro', termos: ['azul claro', 'azul bebe', 'azul ceu', 'azul pastel'], hex: '#AFCBE3', descricao: 'light sky blue' },
  { nome: 'turquesa', termos: ['turquesa', 'tiffany', 'aqua'], hex: '#2EC4B6', descricao: 'turquoise / tiffany blue' },
  { nome: 'azul', termos: ['azul', 'azuis'], hex: '#2D5DA8', descricao: 'blue' },
  { nome: 'rosa pink', termos: ['pink', 'rosa choque', 'magenta', 'fucsia'], hex: '#E0218A', descricao: 'hot pink / magenta' },
  { nome: 'nude', termos: ['nude', 'rosa nude', 'rosa claro', 'rosa pastel', 'rosado', 'blush'], hex: '#E8CFC0', descricao: 'soft nude / blush pink' },
  { nome: 'rosa', termos: ['rosa'], hex: '#E7A4B4', descricao: 'pink' },
  { nome: 'vinho', termos: ['vinho', 'bordo', 'marsala', 'burgundy'], hex: '#6D1A2A', descricao: 'wine / burgundy' },
  { nome: 'vermelho', termos: ['vermelho', 'vermelha', 'red'], hex: '#C8102E', descricao: 'red' },
  { nome: 'terracota', termos: ['terracota', 'terra cota', 'tijolo'], hex: '#C0643F', descricao: 'terracotta / copper' },
  { nome: 'coral', termos: ['coral'], hex: '#FF7F66', descricao: 'coral / peach' },
  { nome: 'laranja', termos: ['laranja', 'orange'], hex: '#F07A1A', descricao: 'orange' },
  { nome: 'amarelo', termos: ['amarelo', 'amarela', 'mostarda'], hex: '#F2C230', descricao: 'yellow' },
  { nome: 'lilás', termos: ['lilas', 'lavanda', 'lavender'], hex: '#B9A3D9', descricao: 'lilac / lavender' },
  { nome: 'roxo', termos: ['roxo', 'roxa', 'violeta', 'purpura'], hex: '#5B2A86', descricao: 'purple' },
  { nome: 'marrom', termos: ['marrom', 'caramelo'], hex: '#5A3A28', descricao: 'warm brown / caramel' },
  { nome: 'bege', termos: ['bege', 'areia', 'off white', 'off-white', 'marfim', 'perola'], hex: '#EFE6D8', descricao: 'warm beige / cream / ivory' },
  { nome: 'branco', termos: ['branco', 'branca', 'white'], hex: '#FFFFFF', descricao: 'clean white' },
  { nome: 'cinza', termos: ['cinza', 'grafite', 'chumbo'], hex: '#3A3A3A', descricao: 'graphite grey' },
  { nome: 'preto', termos: ['preto', 'preta', 'black'], hex: '#111111', descricao: 'deep black' },
];

/** "Verde sálvia" já cobre "verde": a genérica não entra de novo. */
const COBRE: Record<string, string[]> = {
  'verde sálvia': ['verde'], 'verde esmeralda': ['verde'],
  'azul petróleo': ['azul'], 'azul marinho': ['azul'], 'azul claro': ['azul'], turquesa: ['azul'],
  'rosa pink': ['rosa'], nude: ['rosa'], 'rose gold': ['rosa', 'dourado'],
};

export interface TemaConhecido {
  id: string;
  nome: string;
  termos: string[];
  /** A direção visual, em inglês, que o modelo de imagem lê. */
  direcao: string;
}

export const TEMAS: TemaConhecido[] = [
  { id: 'premium', nome: 'premium', termos: ['premium', 'luxo', 'luxuoso', 'luxuosa', 'sofisticado', 'sofisticada', 'elegante', 'alto padrao', 'exclusivo', 'exclusiva', 'refinado', 'chique'],
    direcao: 'premium and refined: restrained palette (2-3 colours), generous negative space, high-contrast thin serif paired with a light sans, metallic accents only as soft gradients, controlled soft lighting, few elements, nothing shouting' },
  { id: 'minimalista', nome: 'minimalista', termos: ['minimalista', 'minimalismo', 'clean', 'menos e mais'],
    direcao: 'minimalist: one subject, one message, large empty areas, one accent colour at most, thin rules instead of boxes, flat calm background' },
  { id: 'editorial', nome: 'editorial', termos: ['editorial', 'revista', 'magazine', 'vogue'],
    direcao: 'editorial magazine: photography-led, serif headline with an italic key word, small letter-spaced caps for labels, hairline rules, asymmetric but balanced grid' },
  { id: 'moderno', nome: 'moderno', termos: ['moderno', 'moderna', 'contemporaneo', 'tecnologico', 'tech', 'futurista', 'inovador'],
    direcao: 'modern: bold geometric sans, strong grid, crisp shapes and gradients, high contrast, confident scale differences' },
  { id: 'divertido', nome: 'divertido', termos: ['divertido', 'divertida', 'descontraido', 'descontraida', 'alegre', 'vibrante', 'colorido', 'colorida', 'playful'],
    direcao: 'playful and vibrant: saturated colours, rounded shapes and stickers, bouncy type, energy and movement, still one clear message' },
  { id: 'escuro', nome: 'escuro', termos: ['dark', 'escuro', 'escura', 'noturno', 'noturna', 'fundo preto'],
    direcao: 'dark: deep dark background with texture or subtle glow, light text, accents that glow softly, dramatic but legible' },
  { id: 'claro', nome: 'claro e leve', termos: ['suave', 'delicado', 'delicada', 'pastel', 'clarinho'],
    direcao: 'light and airy: bright background, soft pastel tones, diffused daylight, delicate type, lots of air' },
  { id: 'natural', nome: 'natural', termos: ['organico', 'organica', 'sustentavel', 'terroso', 'terrosa', 'botanico'],
    direcao: 'natural and organic: earthy tones, natural textures (linen, paper, stone, leaves), daylight, honest materials, soft humanist type' },
  { id: 'acolhedor', nome: 'acolhedor', termos: ['acolhedor', 'acolhedora', 'humano', 'humanizado', 'caloroso', 'calorosa', 'aconchegante', 'afetivo'],
    direcao: 'warm and human: real people in natural moments, warm light, soft colours, friendly rounded type, closeness' },
  { id: 'impactante', nome: 'impactante', termos: ['impactante', 'chamativo', 'chamativa', 'ousado', 'ousada', 'agressivo'],
    direcao: 'bold and impactful: huge headline, strong colour blocking, maximum contrast, one striking image, readable in half a second' },
];

export interface PedidoDeEstilo {
  cores: CorPedida[];
  temas: TemaConhecido[];
}

export function lerPedidoDeEstilo(brief: string | null | undefined): PedidoDeEstilo {
  const t = normalizar(brief);
  if (!t.trim()) return { cores: [], temas: [] };

  const achadas: { cor: CorConhecida; pos: number }[] = [];
  for (const cor of CORES) {
    const pos = Math.min(...cor.termos.map((termo) => posicao(t, termo)).filter((p) => p >= 0).concat(Infinity));
    if (pos !== Infinity) achadas.push({ cor, pos });
  }
  const cobertas = new Set(achadas.flatMap(({ cor }) => COBRE[cor.nome] ?? []));
  const cores = achadas
    .filter(({ cor }) => !cobertas.has(cor.nome))
    .sort((a, b) => a.pos - b.pos)
    .map(({ cor }) => ({ nome: cor.nome, descricao: cor.descricao, hex: cor.hex }));

  const temas = TEMAS.filter((tema) => tema.termos.some((termo) => contem(t, termo)));
  return { cores, temas };
}

/**
 * O bloco do prompt — vazio quando o pedido não falou de cor nem de tema.
 *
 * A precedência é dita com todas as letras porque é o ponto: o documento de
 * estilo continua valendo para grid, tipografia e acabamento, e perde só
 * onde o pedido foi explícito.
 */
export function blocoDoPedidoDeEstilo(pedido: PedidoDeEstilo): string {
  if (pedido.cores.length === 0 && pedido.temas.length === 0) return '';
  const linhas = ['[USER STYLE REQUEST — OVERRIDES THE DESIGN SYSTEM]'];
  if (pedido.cores.length) {
    const [dominante, ...resto] = pedido.cores;
    linhas.push(`Colour palette asked for by the user, in this order of weight: ${pedido.cores.map((c) => `${c.nome} (${c.descricao}, around ${c.hex})`).join('; ')}.`);
    linhas.push(resto.length
      ? `Use ${dominante.nome} as the dominant colour and ${resto.map((c) => c.nome).join(' and ')} as supporting / accent colour(s). Neutrals for text and background are allowed only to keep legibility.`
      : `Build the palette around ${dominante.nome}: background, accents and graphic elements in its tones, with neutrals only for legibility.`);
  }
  for (const tema of pedido.temas) linhas.push(`Look and feel: ${tema.direcao}.`);
  linhas.push('Where the [DESIGN SYSTEM], the [MOOD] or a template suggests different colours or a different feel, THIS REQUEST WINS. Keep from them only what does not conflict: grid, hierarchy, typographic structure and finish.');
  return linhas.join('\n');
}

/** Para a proposta: "verde e dourado, premium". */
export function resumoDoPedidoDeEstilo(pedido: PedidoDeEstilo): string | null {
  const partes = [
    pedido.cores.map((c) => c.nome).join(' e '),
    pedido.temas.map((t) => t.nome).join(', '),
  ].filter(Boolean);
  return partes.length ? partes.join(', ') : null;
}
