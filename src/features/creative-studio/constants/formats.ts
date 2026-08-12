import type {
  BackendAspect,
  CreativeAspectRatio,
  CreativeResolution,
} from '../types/creative';

export const ASPECT_CONFIG: Record<CreativeAspectRatio, {
  label: string;
  title: string;
  promptDims: string;
  backendAspect: BackendAspect;
  recommendedUse: string;
}> = {
  '1:1': {
    label: '1:1',
    title: 'Quadrado',
    promptDims: '1:1 perfect square Instagram post, 1080x1080px',
    backendAspect: 'square',
    recommendedUse: 'Feed, carrossel e posts quadrados',
  },
  '4:5': {
    label: '4:5',
    title: 'Feed vertical',
    promptDims: '4:5 vertical Instagram feed advertisement, optimized for Meta Ads feed placement',
    backendAspect: 'story',
    recommendedUse: 'Feed vertical com maior ocupação de tela',
  },
  '9:16': {
    label: '9:16',
    title: 'Story/Reels',
    promptDims: '9:16 vertical Instagram Story, 1080x1920px',
    backendAspect: 'story',
    recommendedUse: 'Stories, Reels e tela cheia',
  },
  '16:9': {
    label: '16:9',
    title: 'Horizontal',
    promptDims: '16:9 horizontal advertising image',
    backendAspect: 'story',
    recommendedUse: 'YouTube, banners e apresentações',
  },
  '4:3': {
    label: '4:3',
    title: 'Horizontal clássico',
    promptDims: '4:3 horizontal advertising image',
    backendAspect: 'story',
    recommendedUse: 'Criativos horizontais compactos',
  },
  '3:4': {
    label: '3:4',
    title: 'Vertical clássico',
    promptDims: '3:4 vertical advertising image',
    backendAspect: 'story',
    recommendedUse: 'Criativos verticais',
  },
  '2:3': {
    label: '2:3',
    title: 'Poster vertical',
    promptDims: '2:3 vertical poster-style advertising image',
    backendAspect: 'story',
    recommendedUse: 'Poster e anúncio vertical',
  },
  '3:2': {
    label: '3:2',
    title: 'Foto horizontal',
    promptDims: '3:2 horizontal advertising image',
    backendAspect: 'story',
    recommendedUse: 'Imagem horizontal editorial',
  },
  '21:9': {
    label: '21:9',
    title: 'Cinemático',
    promptDims: '21:9 ultra-wide cinematic advertising image',
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
