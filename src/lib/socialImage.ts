// Helper para contornar bloqueio de hotlink do Instagram CDN.
// Usa edge function image-proxy como fallback.
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export function proxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `https://${PROJECT_ID}.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
}
