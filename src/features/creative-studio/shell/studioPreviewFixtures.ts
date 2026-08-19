import { Boxes, CheckCircle2, ImageIcon, Images, LayoutTemplate, Layers, UserRound } from 'lucide-react';
import type { CreativeAsset } from '../types/creative';
import type { StudioLibraryEntry } from '../types/studioUi';

/**
 * Dados de exemplo do shell V2.
 *
 * Existem para VERIFICAÇÃO, não para produção: o Studio real exige sessão de
 * admin, e sem uma tela renderizável não há como olhar o resultado — que é
 * como o tema claro quebrou por uma linha sem nenhum teste acusar.
 *
 * O conjunto cobre de propósito os estados que costumam passar batido: um
 * lote do Fator com cinco, uma edição encadeada, uma arte ainda gerando e
 * uma que falhou.
 */

function asset(patch: Partial<CreativeAsset> & Pick<CreativeAsset, 'id' | 'type' | 'status'>): CreativeAsset {
  return {
    projectId: 'proj-1',
    clientId: 'cli-1',
    url: null,
    thumbnailUrl: null,
    parentAssetId: null,
    rootAssetId: null,
    groupId: null,
    factorAxis: null,
    aspectRatio: '4:5',
    resolution: '2K',
    width: null,
    height: null,
    prompt: null,
    negativePrompt: null,
    model: 'gpt-image-2',
    errorMessage: null,
    filename: null,
    isClientIntelligence: false,
    metadata: {},
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    ...patch,
  };
}

/** SVG inline: a verificação não pode depender de rede. */
function arte(rotulo: string, de: string, para: string, w: number, h: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${de}"/><stop offset="1" stop-color="${para}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <text x="50%" y="52%" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(w / 11)}"
      font-weight="700" fill="rgba(255,255,255,.92)">${rotulo}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PREVIEW_ASSETS: CreativeAsset[] = [
  asset({
    id: 'a1', type: 'original', status: 'ready', aspectRatio: '4:5', width: 1080, height: 1350,
    url: arte('Original', '#FF831E', '#DA2F1E', 1080, 1350),
    prompt: 'Anúncio de lançamento da coleção de verão, modelo em ambiente externo ao pôr do sol',
    createdAt: '2026-08-18T09:00:00.000Z',
  }),
  asset({
    id: 'a2', type: 'edited', status: 'ready', parentAssetId: 'a1', rootAssetId: 'a1',
    aspectRatio: '4:5', width: 1080, height: 1350,
    url: arte('Edição', '#2A6BF2', '#1E3FA8', 1080, 1350),
    prompt: 'Trocar o fundo por praia ao entardecer',
    createdAt: '2026-08-18T09:20:00.000Z',
  }),
  asset({
    id: 'a3', type: 'resize', status: 'ready', parentAssetId: 'a2', rootAssetId: 'a1',
    aspectRatio: '1:1', width: 1080, height: 1080,
    url: arte('1080', '#0FA36B', '#0B6E4A', 1080, 1080),
    createdAt: '2026-08-18T09:35:00.000Z',
  }),
  ...(['emotional', 'offer', 'persona', 'hook', 'structure'] as const).map((eixo, i) =>
    asset({
      id: `f${i + 1}`, type: 'factor', status: 'ready', groupId: 'grp-fator',
      parentAssetId: 'a1', rootAssetId: 'a1', factorAxis: eixo,
      aspectRatio: '4:5', width: 1080, height: 1350,
      url: arte(`V${i + 1}`, ['#8B5CF6', '#EC4899', '#F59E0B', '#14B8A6', '#6366F1'][i], '#1D1D21', 1080, 1350),
      createdAt: `2026-08-18T10:0${i}:00.000Z`,
    }),
  ),
  asset({
    id: 'g1', type: 'original', status: 'generating', aspectRatio: '9:16', width: 1080, height: 1920,
    prompt: 'Story vertical com depoimento de cliente',
    createdAt: '2026-08-18T11:00:00.000Z',
  }),
  asset({
    id: 'e1', type: 'original', status: 'failed', aspectRatio: '16:9', width: 1920, height: 1080,
    errorMessage: 'O provedor recusou o formato 16:9 nesta conta.',
    createdAt: '2026-08-18T11:05:00.000Z',
  }),
  // Insumo: NÃO deve aparecer no canvas. Está aqui justamente para que o
  // corte de `visibleCanvasAssets` seja visível na foto.
  asset({
    id: 'ref1', type: 'reference', status: 'ready', aspectRatio: '1:1', width: 800, height: 800,
    url: arte('REF', '#71717A', '#3F3F46', 800, 800),
    createdAt: '2026-08-17T08:00:00.000Z',
  }),
  // Também insumo — alimenta a grade de "já salvos" do menu de anexos
  // (logo/produto), a mesma mecânica de reuso que a referência já tem.
  asset({
    id: 'logo1', type: 'logo', status: 'ready', aspectRatio: '1:1', width: 512, height: 512,
    url: arte('LOGO', '#F59E0B', '#B45309', 512, 512),
    filename: 'logo-boutique-aurora.png',
    createdAt: '2026-08-16T08:00:00.000Z',
  }),
  asset({
    id: 'prod1', type: 'product', status: 'ready', aspectRatio: '1:1', width: 800, height: 800,
    url: arte('PROD', '#0EA5E9', '#075985', 800, 800),
    filename: 'produto-verao.jpg',
    createdAt: '2026-08-16T08:05:00.000Z',
  }),
  // Avatar gerado: carrega a persona no metadata, que é o que permite
  // reabrir o customizador com os traços escolhidos.
  asset({
    id: 'av1', type: 'avatar', status: 'ready', aspectRatio: '4:5', width: 1080, height: 1350,
    url: arte('AVATAR', '#8B5CF6', '#2A1B4A', 1080, 1350),
    filename: 'Ana Editorial',
    metadata: {
      persona: {
        name: 'Ana Editorial', gender: 'female', ageRange: '25-30',
        styles: ['luxury', 'lifestyle'], hairColor: 'dark-brown', eyeColor: 'brown',
        details: 'Cachos brilhantes, olhar editorial', presetId: 'fashion-model',
      },
    },
    createdAt: '2026-08-16T09:00:00.000Z',
  }),
];

export const PREVIEW_LIBRARIES: StudioLibraryEntry[] = [
  { id: 'all', label: 'Todas as criações', icon: ImageIcon, count: 11 },
  { id: 'generations', label: 'Gerações', icon: Layers, count: 8 },
  { id: 'references', label: 'Referências', icon: Images, count: 3 },
  { id: 'products', label: 'Produtos', icon: Boxes, count: 2 },
  { id: 'avatars', label: 'Avatares', icon: UserRound, count: 1 },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate, count: 4 },
  { id: 'approved', label: 'Aprovados', icon: CheckCircle2, count: 2 },
];
