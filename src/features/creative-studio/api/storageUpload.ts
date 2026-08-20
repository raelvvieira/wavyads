import { supabase } from '@/integrations/supabase/client';

/**
 * Upload compartilhado para o Storage do Studio.
 *
 * Extraído do que a tela antiga já fazia (`uploadDataUrlToStorage` em
 * `CriativoStudioPage.tsx`) — mesma lógica, módulo próprio para o V2. A
 * tela antiga continua com a versão dela; nada aqui a toca.
 *
 * `creative-assets` é um bucket PRIVADO — a política do workspace recusa
 * bucket público — então o resultado é sempre uma URL assinada, nunca uma
 * URL pública direta.
 */

// ~5 anos: os mesmos anexos precisam continuar resolvendo muito depois de
// enviados, e recriar uma URL assinada por asset a cada acesso não existe
// hoje em lugar nenhum do app.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 5;

function extensionForMimeType(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  // Vídeo entrou com o UGC Studio. Sem estas duas linhas um mp4 subia como
  // `.png`, e todo player que decide por extensão se recusava a tocá-lo.
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/quicktime') return 'mov';
  return 'png';
}

/**
 * O caminho chega com uma extensão "chutada". Corrigir para o content-type
 * real do blob evita uma URL salva com a extensão errada — e provedores de
 * geração de imagem que validam por extensão (EvoLink) recusam essa URL
 * quando ela é reaproveitada numa geração futura.
 */
function withCorrectExtension(path: string, mime: string): string {
  const ext = extensionForMimeType(mime);
  return path.replace(/\.[a-zA-Z0-9]+$/, `.${ext}`);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export interface UploadDataUrlInput {
  /** Vem do `ImageDropzone` — ele só entrega data URLs, nunca `File`. */
  dataUrl: string;
  /** Caminho sugerido; a extensão é corrigida contra o mime real do blob. */
  path: string;
  bucket?: string;
}

/**
 * Sobe uma imagem em data URL e devolve a URL assinada.
 *
 * Se `dataUrl` já não começar com `data:` (uma URL http(s) reenviada por
 * engano), a função é um no-op e devolve o valor como está — mesmo
 * comportamento defensivo da tela antiga.
 */
export async function uploadDataUrlToCreativeStorage(input: UploadDataUrlInput): Promise<string> {
  const { dataUrl, path, bucket = 'creative-assets' } = input;
  if (!dataUrl.startsWith('data:')) return dataUrl;

  const storageClient = (supabase as any).storage;
  const blob = await dataUrlToBlob(dataUrl);
  const contentType = blob.type || 'image/png';
  const correctedPath = withCorrectExtension(path, contentType);

  const { error } = await storageClient.from(bucket).upload(correctedPath, blob, {
    cacheControl: '3600',
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data: signed, error: signErr } = await storageClient
    .from(bucket)
    .createSignedUrl(correctedPath, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) throw signErr || new Error('Falha ao assinar a URL do arquivo enviado.');

  return signed.signedUrl as string;
}
