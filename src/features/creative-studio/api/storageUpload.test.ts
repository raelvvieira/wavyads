import { describe, expect, it, vi, beforeEach } from 'vitest';

const chamadas: { op: string; args: unknown[] }[] = [];
let uploadResposta: any = { error: null };
let assinaturaResposta: any = { data: { signedUrl: 'https://x/assinada.png' }, error: null };

const fakeBucket = {
  upload: (...args: unknown[]) => { chamadas.push({ op: 'upload', args }); return Promise.resolve(uploadResposta); },
  createSignedUrl: (...args: unknown[]) => { chamadas.push({ op: 'createSignedUrl', args }); return Promise.resolve(assinaturaResposta); },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: (bucket: string) => { chamadas.push({ op: 'from', args: [bucket] }); return fakeBucket; } } },
}));

const { uploadDataUrlToCreativeStorage } = await import('./storageUpload');

// PNG 1x1 mínimo válido, para o fetch(dataUrl) resolver um blob real.
const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

beforeEach(() => {
  chamadas.length = 0;
  uploadResposta = { error: null };
  assinaturaResposta = { data: { signedUrl: 'https://x/assinada.png' }, error: null };
});

describe('uploadDataUrlToCreativeStorage', () => {
  it('sobe no bucket certo e devolve a URL assinada', async () => {
    const url = await uploadDataUrlToCreativeStorage({ dataUrl: PNG_1X1, path: 'u1/p1/logo/logo.png' });

    expect(url).toBe('https://x/assinada.png');
    expect(chamadas.filter((c) => c.op === 'from').map((c) => c.args)).toEqual([['creative-assets'], ['creative-assets']]);
    expect(chamadas.find((c) => c.op === 'upload')!.args[0]).toBe('u1/p1/logo/logo.png');
  });

  it('corrige a extensão contra o mime real do blob', async () => {
    // Um PNG enviado com caminho ".png" já chutado — aqui o mime bate, mas
    // é a mesma correção que salva um jpeg que chegasse com extensão errada.
    await uploadDataUrlToCreativeStorage({ dataUrl: PNG_1X1, path: 'u1/p1/arquivo/nome.jpg' });
    expect(chamadas.find((c) => c.op === 'upload')!.args[0]).toBe('u1/p1/arquivo/nome.png');
  });

  it('respeita um bucket alternativo quando informado', async () => {
    await uploadDataUrlToCreativeStorage({ dataUrl: PNG_1X1, path: 'x.png', bucket: 'outro-bucket' });
    expect(chamadas.filter((c) => c.op === 'from').map((c) => c.args)).toEqual([['outro-bucket'], ['outro-bucket']]);
  });

  it('URL http(s) reenviada por engano não sobe nada — devolve como está', async () => {
    const url = await uploadDataUrlToCreativeStorage({ dataUrl: 'https://x/ja-existe.png', path: 'x.png' });
    expect(url).toBe('https://x/ja-existe.png');
    expect(chamadas).toEqual([]);
  });

  it('propaga o erro do upload', async () => {
    uploadResposta = { error: new Error('bucket cheio') };
    await expect(uploadDataUrlToCreativeStorage({ dataUrl: PNG_1X1, path: 'x.png' })).rejects.toThrow('bucket cheio');
  });

  it('propaga o erro de assinatura', async () => {
    assinaturaResposta = { data: null, error: new Error('sem permissão de assinar') };
    await expect(uploadDataUrlToCreativeStorage({ dataUrl: PNG_1X1, path: 'x.png' })).rejects.toThrow('sem permissão de assinar');
  });

  it('sem erro explícito mas também sem signedUrl, ainda assim falha — não devolve undefined', async () => {
    assinaturaResposta = { data: null, error: null };
    await expect(uploadDataUrlToCreativeStorage({ dataUrl: PNG_1X1, path: 'x.png' })).rejects.toThrow(/assinar/);
  });
});
