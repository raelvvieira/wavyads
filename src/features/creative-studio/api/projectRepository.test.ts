import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Cliente falso encadeável.
 *
 * O supabase-js encadeia (`from().select().eq().single()`), então o duplo
 * precisa devolver a si mesmo até alguém aguardar o resultado. `respostas`
 * é uma fila: cada chamada terminal consome a próxima.
 */
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
    update: registrar('update'),
    upsert: registrar('upsert'),
    select: registrar('select'),
    eq: registrar('eq'),
    neq: registrar('neq'),
    in: registrar('in'),
    order: registrar('order'),
    limit: (...a: unknown[]) => { chamadas.push({ tabela, op: 'limit', args: a }); return Promise.resolve(resolver()); },
    single: (...a: unknown[]) => { chamadas.push({ tabela, op: 'single', args: a }); return Promise.resolve(resolver()); },
    then: (fn: any) => Promise.resolve(resolver()).then(fn),
  };
  return q;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (tabela: string) => fakeQuery(tabela) },
}));

const {
  createProject, listRecentProjects, loadProject, saveProjectSnapshot,
  archiveProject, duplicateProject, findAssetIdsByUrl, updateProjectFormat,
} = await import('./projectRepository');

const projetoBase = {
  title: 'Campanha', initial_prompt: 'p', current_stage: 'copy',
  selected_aspect_ratio: '4:5', selected_resolution: '4K',
  language: 'pt-BR', model: 'm', client_id: 'c1', thumbnail_url: 'https://x/t.png',
};

beforeEach(() => { chamadas.length = 0; respostas = []; });

describe('createProject', () => {
  it('grava as colunas do projeto', async () => {
    respostas = [{ data: { id: 'p1', title: 'T' }, error: null }];
    const r = await createProject({
      title: 'T', initialPrompt: 'p', currentStage: 'initial',
      aspectRatio: '4:5', resolution: '4K', language: 'pt-BR',
      model: 'm', userId: 'u1', clientId: 'c1',
    });
    expect(r).toEqual({ id: 'p1', title: 'T' });
    const insert = chamadas.find((c) => c.op === 'insert')!.args[0] as any;
    expect(insert).toMatchObject({ status: 'in_progress', user_id: 'u1', created_by: 'u1', client_id: 'c1' });
    // Sem thumbnail informada, a coluna nem entra — evita sobrescrever com null.
    expect('thumbnail_url' in insert).toBe(false);
  });

  it('propaga erro do banco', async () => {
    respostas = [{ data: null, error: new Error('rls') }];
    await expect(createProject({} as any)).rejects.toThrow('rls');
  });
});

describe('listRecentProjects', () => {
  it('exclui arquivados e ordena por atualização', async () => {
    respostas = [{ data: [{ id: 'a' }], error: null }];
    await listRecentProjects(10);
    expect(chamadas.find((c) => c.op === 'neq')!.args).toEqual(['status', 'archived']);
    expect(chamadas.find((c) => c.op === 'order')!.args[0]).toBe('updated_at');
    expect(chamadas.find((c) => c.op === 'limit')!.args[0]).toBe(10);
  });

  it('devolve lista vazia quando não há dados', async () => {
    respostas = [{ data: null, error: null }];
    expect(await listRecentProjects()).toEqual([]);
  });
});

describe('loadProject', () => {
  it('aceita projeto que nunca salvou estado', async () => {
    // PGRST116 é "nenhuma linha". Projeto criado e nunca salvo é válido —
    // tratar como erro impediria abrir um rascunho recém-criado.
    respostas = [
      { data: projetoBase, error: null },
      { data: null, error: { code: 'PGRST116' } },
    ];
    const r = await loadProject('p1');
    expect(r.project).toEqual(projetoBase);
    expect(r.snapshot).toBeNull();
  });

  it('propaga erro real do snapshot', async () => {
    respostas = [
      { data: projetoBase, error: null },
      { data: null, error: { code: '42501', message: 'permissão' } },
    ];
    await expect(loadProject('p1')).rejects.toMatchObject({ code: '42501' });
  });
});

describe('duplicateProject', () => {
  it('copia projeto, capa e snapshot', async () => {
    respostas = [
      { data: projetoBase, error: null },                       // loadProject → projeto
      { data: { state_json: { rawCopy: 'x' } }, error: null },  // loadProject → snapshot
      { data: { id: 'novo', title: 'Campanha cópia' }, error: null }, // createProject
      { data: null, error: null },                              // insert do snapshot
    ];
    const id = await duplicateProject('p1', 'u1');
    expect(id).toBe('novo');

    const insercoes = chamadas.filter((c) => c.op === 'insert').map((c) => c.args[0] as any);
    // A capa vai no MESMO insert — sem isso a cópia nasceria sem thumbnail
    // no histórico apesar de ter a mesma arte.
    expect(insercoes[0]).toMatchObject({ title: 'Campanha cópia', thumbnail_url: 'https://x/t.png' });
    expect(insercoes[1]).toMatchObject({ project_id: 'novo', state_json: { rawCopy: 'x' } });
  });

  it('duplica projeto sem snapshot sem falhar', async () => {
    respostas = [
      { data: projetoBase, error: null },
      { data: null, error: { code: 'PGRST116' } },
      { data: { id: 'novo', title: 'c' }, error: null },
    ];
    await expect(duplicateProject('p1', 'u1')).resolves.toBe('novo');
    expect(chamadas.filter((c) => c.op === 'insert')).toHaveLength(1);
  });
});

describe('findAssetIdsByUrl', () => {
  it('mapeia url para id', async () => {
    respostas = [{ data: [{ id: 'a1', url: 'u1' }, { id: 'a2', url: 'u2' }], error: null }];
    const m = await findAssetIdsByUrl('p1', ['u1', 'u2']);
    expect(m.get('u1')).toBe('a1');
    expect(m.get('u2')).toBe('a2');
  });

  it('não consulta com lista vazia', async () => {
    expect((await findAssetIdsByUrl('p1', [])).size).toBe(0);
    expect(chamadas).toHaveLength(0);
  });

  it('erro vira mapa vazio, não exceção', async () => {
    // É reparo oportunista: falhar aqui não pode impedir o projeto de abrir.
    respostas = [{ data: null, error: new Error('falhou') }];
    expect((await findAssetIdsByUrl('p1', ['u1'])).size).toBe(0);
  });
});

describe('saveProjectSnapshot e archiveProject', () => {
  it('faz upsert por project_id', async () => {
    respostas = [{ data: null, error: null }];
    await saveProjectSnapshot('p1', { a: 1 });
    const upsert = chamadas.find((c) => c.op === 'upsert')!;
    expect(upsert.args[0]).toMatchObject({ project_id: 'p1', state_json: { a: 1 } });
    expect(upsert.args[1]).toEqual({ onConflict: 'project_id' });
  });

  it('arquivar só muda o status', async () => {
    respostas = [{ data: null, error: null }];
    await archiveProject('p1');
    expect(chamadas.find((c) => c.op === 'update')!.args[0]).toEqual({ status: 'archived' });
  });
});

describe('updateProjectFormat', () => {
  it('grava só formato e resolução — não o projeto inteiro', async () => {
    // updateProjectMeta pede título, prompt, cliente... Este é o patch
    // cirúrgico para quando só o formato mudou, sem arriscar sobrescrever
    // o resto com um valor errado.
    respostas = [{ data: null, error: null }];
    await updateProjectFormat('p1', { aspectRatio: '9:16', resolution: '4K' });

    const update = chamadas.find((c) => c.op === 'update')!.args[0] as any;
    expect(update.selected_aspect_ratio).toBe('9:16');
    expect(update.selected_resolution).toBe('4K');
    expect('title' in update).toBe(false);
    expect(chamadas.find((c) => c.op === 'eq')!.args).toEqual(['id', 'p1']);
  });

  it('propaga erro do banco', async () => {
    respostas = [{ data: null, error: new Error('rls') }];
    await expect(updateProjectFormat('p1', { aspectRatio: '4:5', resolution: '2K' })).rejects.toThrow('rls');
  });
});
