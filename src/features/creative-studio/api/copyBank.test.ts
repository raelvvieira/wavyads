import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mesmo duplo encadeável de creativeAssets.test.ts.
const chamadas: { tabela: string; op: string; args: unknown[] }[] = [];
let respostas: any[] = [];

function fakeQuery(tabela: string) {
  const registrar = (op: string) => (...args: unknown[]) => {
    chamadas.push({ tabela, op, args });
    return q;
  };
  const resolver = () => respostas.shift() ?? { data: null, error: null };
  const q: any = {
    insert: registrar('insert'),
    select: registrar('select'),
    eq: registrar('eq'),
    order: registrar('order'),
    single: (...a: unknown[]) => { chamadas.push({ tabela, op: 'single', args: a }); return Promise.resolve(resolver()); },
    then: (fn: any) => Promise.resolve(resolver()).then(fn),
  };
  return q;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (tabela: string) => fakeQuery(tabela) },
}));

const { listCopyBank, saveCopyToBank } = await import('./copyBank');

const linhaBase = {
  id: 'cb1', client_id: 'c1', project_id: 'p1', copy_text: 'Até 50% OFF — só hoje',
  tema: 'promoção', source: 'manual', created_by: null, created_at: '2026-08-19T10:00:00.000Z',
};

beforeEach(() => { chamadas.length = 0; respostas = []; });

describe('listCopyBank', () => {
  it('busca por clientId, mais recente primeiro', async () => {
    respostas = [{ data: [linhaBase], error: null }];
    const r = await listCopyBank('c1');

    expect(r).toEqual([{ id: 'cb1', copyText: 'Até 50% OFF — só hoje', tema: 'promoção', createdAt: '2026-08-19T10:00:00.000Z' }]);
    expect(chamadas.find((c) => c.op === 'eq')!.args).toEqual(['client_id', 'c1']);
    expect(chamadas.some((c) => c.op === 'order')).toBe(true);
  });

  it('propaga erro do banco', async () => {
    respostas = [{ data: null, error: new Error('RLS negou') }];
    await expect(listCopyBank('c1')).rejects.toThrow('RLS negou');
  });
});

describe('saveCopyToBank', () => {
  it('grava com source "manual" e devolve a linha gravada', async () => {
    respostas = [{ data: linhaBase, error: null }];
    const r = await saveCopyToBank({ clientId: 'c1', projectId: 'p1', copyText: 'Até 50% OFF' });

    const insert = chamadas.find((c) => c.op === 'insert')!.args[0] as any;
    expect(insert).toEqual(expect.objectContaining({
      client_id: 'c1', project_id: 'p1', copy_text: 'Até 50% OFF', source: 'manual',
    }));
    expect(r).toEqual({ id: 'cb1', copyText: 'Até 50% OFF — só hoje', tema: 'promoção', createdAt: '2026-08-19T10:00:00.000Z' });
  });

  it('sem clientId, não grava nada', async () => {
    await saveCopyToBank({ clientId: null, projectId: 'p1', copyText: 'x' });
    expect(chamadas).toHaveLength(0);
  });

  it('propaga erro do banco', async () => {
    respostas = [{ data: null, error: new Error('RLS negou') }];
    await expect(saveCopyToBank({ clientId: 'c1', projectId: null, copyText: 'x' })).rejects.toThrow('RLS negou');
  });
});
