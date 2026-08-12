import { supabase } from '@/integrations/supabase/client';

// O bucket creative-assets é privado (política da workspace bloqueia buckets
// públicos), então URL pública devolve 400 tanto no <img> quanto quando a edge
// function tenta baixar. Signed URL de longa duração funciona nos dois casos.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 5; // ~5 anos
const BUCKET = 'creative-assets';

function extensionForMimeType(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'png';
}

// O caminho chega com a extensão chutada (.png). Corrigir para o content-type
// real importa porque provedores de imagem que validam por extensão rejeitam a
// URL quando ela é reaproveitada como referência numa geração futura.
function withCorrectExtension(path: string, mime: string): string {
  return path.replace(/\.[a-zA-Z0-9]+$/, `.${extensionForMimeType(mime)}`);
}

export async function uploadDataUrlToAssetStorage({
  dataUrl,
  path,
}: {
  dataUrl: string;
  path: string;
}): Promise<{ url: string; path: string }> {
  if (!dataUrl.startsWith('data:')) return { url: dataUrl, path };

  const blob = await (await fetch(dataUrl)).blob();
  const contentType = blob.type || 'image/png';
  const correctedPath = withCorrectExtension(path, contentType);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(correctedPath, blob, { cacheControl: '3600', contentType, upsert: true });
  if (error) throw error;

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(correctedPath, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) throw signError || new Error('Falha ao assinar URL');

  return { url: signed.signedUrl, path: correctedPath };
}

export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function buildAssetFileName(base: string): string {
  return `${sanitizeFileName(base)}-${Date.now()}.png`;
}

/**
 * supabase.functions.invoke() só expõe "Edge Function returned a non-2xx
 * status code" no error — o motivo real vem no corpo, via error.context.
 */
export async function extractFunctionErrorMessage(error: any): Promise<string> {
  const context = error?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body?.error || body?.detail || body?.message) {
        return body.error || body.detail || body.message;
      }
    } catch {
      // corpo não é JSON — mantém a mensagem genérica
    }
  }
  return error?.message || 'Erro desconhecido';
}
