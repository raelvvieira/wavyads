import type {
  BackendAspect,
  CreativeAspectRatio,
  CreativeResolution,
} from '../types/creative';

export const ASPECT_CONFIG: Record<CreativeAspectRatio, {
  label: string;
  title: string;
  promptDims: string;
  safeZone: string;
  backendAspect: BackendAspect;
  recommendedUse: string;
}> = {
  '1:1': {
    label: '1:1',
    title: 'Quadrado',
    promptDims: '1:1 perfect square Instagram post, 1080x1080px',
    safeZone: 'Top safe zone: keep 120px from the top edge clear of important text. Bottom safe zone: keep 120px from the bottom edge clear.',
    backendAspect: 'square',
    recommendedUse: 'Feed, carrossel e posts quadrados',
  },
  '4:5': {
    label: '4:5',
    title: 'Feed vertical',
    promptDims: '4:5 vertical Instagram feed advertisement, optimized for Meta Ads feed placement',
    safeZone: 'Keep generous margins on all edges. Avoid placing important text too close to the top or bottom edges.',
    backendAspect: 'story',
    recommendedUse: 'Feed vertical com maior ocupação de tela',
  },
  '9:16': {
    label: '9:16',
    title: 'Story/Reels',
    promptDims: '9:16 vertical Instagram Story, 1080x1920px',
    safeZone: 'Top safe zone: keep 280px from the very top edge completely free of any text, graphic or important element. Bottom safe zone: keep 280px from the very bottom edge completely free. This protects against Instagram UI overlays.',
    backendAspect: 'story',
    recommendedUse: 'Stories, Reels e tela cheia',
  },
  '16:9': {
    label: '16:9',
    title: 'Horizontal',
    promptDims: '16:9 horizontal advertising image',
    safeZone: 'Keep important text and subjects away from extreme left and right edges. Maintain a centered safe composition area.',
    backendAspect: 'story',
    recommendedUse: 'YouTube, banners e apresentações',
  },
  '4:3': {
    label: '4:3',
    title: 'Horizontal clássico',
    promptDims: '4:3 horizontal advertising image',
    safeZone: 'Keep important text within a centered safe composition area. Avoid text too close to all edges.',
    backendAspect: 'story',
    recommendedUse: 'Criativos horizontais compactos',
  },
  '3:4': {
    label: '3:4',
    title: 'Vertical clássico',
    promptDims: '3:4 vertical advertising image',
    safeZone: 'Keep important text within a centered safe composition area. Maintain generous top and bottom margins.',
    backendAspect: 'story',
    recommendedUse: 'Criativos verticais',
  },
  '2:3': {
    label: '2:3',
    title: 'Poster vertical',
    promptDims: '2:3 vertical poster-style advertising image',
    safeZone: 'Keep generous margins on top and bottom. Avoid placing CTA too close to the lower edge.',
    backendAspect: 'story',
    recommendedUse: 'Poster e anúncio vertical',
  },
  '3:2': {
    label: '3:2',
    title: 'Foto horizontal',
    promptDims: '3:2 horizontal advertising image',
    safeZone: 'Keep important text away from the extreme edges. Maintain visual weight near the center.',
    backendAspect: 'story',
    recommendedUse: 'Imagem horizontal editorial',
  },
  '21:9': {
    label: '21:9',
    title: 'Cinemático',
    promptDims: '21:9 ultra-wide cinematic advertising image',
    safeZone: 'Keep main subjects and text in the central safe area. Avoid edge-critical content.',
    backendAspect: 'story',
    recommendedUse: 'Banner cinematográfico',
  },
};

export const RESOLUTION_CONFIG: Record<CreativeResolution, {
  label: string;
  promptQuality: string;
}> = {
  '1K': {
    label: '1K',
    promptQuality: 'standard high-quality digital advertising image',
  },
  '2K': {
    label: '2K',
    promptQuality: 'high-resolution polished advertising image with crisp typography and clean details',
  },
  '4K': {
    label: '4K',
    promptQuality: 'ultra high-resolution 4K advertising image, crisp details, sharp typography, premium finish',
  },
};

export function getBackendAspectFromSelectedRatio(ratio: CreativeAspectRatio): BackendAspect {
  return ASPECT_CONFIG[ratio]?.backendAspect || 'story';
}

export type GeminiModel =
  | 'gemini-2.5-flash-image'
  | 'gemini-3.1-flash-image-preview'
  | 'gemini-3-pro-image-preview';

export const MODEL_OPTIONS: {
  id: GeminiModel;
  name: string;
  desc: string;
  usage: 'image-gemini-flash' | 'image-gemini-flash-2' | 'image-gemini-pro';
}[] = [
  { id: 'gemini-2.5-flash-image', name: 'Nano Banana', desc: 'Rápido e barato', usage: 'image-gemini-flash' },
  { id: 'gemini-3.1-flash-image-preview', name: 'Nano Banana 2', desc: 'Rápido com qualidade Pro (recomendado)', usage: 'image-gemini-flash-2' },
  { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro', desc: 'Máxima qualidade, mais lento', usage: 'image-gemini-pro' },
];

export const LANGUAGES = [
  { id: 'pt-BR', label: 'Português (BR)' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
] as const;
