import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mesmo duplo encadeável de projectRepository.test.ts: o supabase-js
// encadeia (`from().update().eq().select().single()`), então o dublê
// precisa devolver a si mesmo até alguém aguardar o resultado.
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
    delete: registrar('delete'),
    select: registrar('select'),
    eq: registrar('eq'),
    in: registrar('in'),
    // `order`/`limit` continuam encadeáveis: `listCreativeAssets` ainda
    // aplica `.eq()` DEPOIS deles quando há filtro, então terminar a cadeia
    // aqui quebraria exatamente esse caso.
    order: registrar('order'),
    limit: registrar('limit'),
    single: (...a: unknown[]) => { chamadas.push({ tabela, op: 'single', args: a }); return Promise.resolve(resolver()); },
    then: (fn: any) => Promise.resolve(resolver()).then(fn),
  };
  return q;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => fakeQuery(tabela),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) },
  },
}));

const {
  listCreativeAssets, updateCreativeAsset, deleteCreativeAsset, createCreativeAsset,
  getCreativeAsset, COLUNAS_DA_GRADE, COLUNAS_PESADAS_OMITIDAS,
} = await import('./creativeAssets');

const linhaBase = {
  id: 'a1', project_id: 'p1', client_id: null, type: 'original', status: 'ready',
  url: 'https://x/a.png', thumbnail_url: null, parent_asset_id: null, root_asset_id: null,
  group_id: null, factor_axis: null, aspect_ratio: '4:5', resolution: '2K',
  width: null, height: null, prompt: 'p', negative_prompt: null, model: 'gpt-image-2',
  error_message: null, filename: null, is_client_intelligence: false, metadata: {},
  created_at: '2026-08-18T10:00:00.000Z', updated_at: '2026-08-18T10:00:00.000Z',
};

beforeEach(() => { chamadas.length = 0; respostas = []; });

describe('listCreativeAssets', () => {
  it('filtra por projeto e cliente quando informados', async () => {
    respostas = [{ data: [linhaBase], error: null }];
    const r = await listCreativeAssets({ projectId: 'p1', clientId: 'c1' });

    expect(r).toEqual([expect.objectContaining({ id: 'a1', type: 'original' })]);
    const filtros = chamadas.filter((c) => c.op === 'eq').map((c) => c.args);
    expect(filtros).toEqual([['project_id', 'p1'], ['client_id', 'c1']]);
  });

  it('sem filtro, não restringe a consulta', async () => {
    respostas = [{ data: [], error: null }];
    await listCreativeAssets();
    expect(chamadas.some((c) => c.op === 'eq')).toBe(false);
  });

  it('propaga erro do banco', async () => {
    respostas = [{ data: null, error: new Error('rls') }];
    await expect(listCreativeAssets()).rejects.toThrow('rls');
  });
});

describe('updateCreativeAsset', () => {
  it('grava só os campos informados', async () => {
    respostas = [{ data: { ...linhaBase, status: 'ready', url: 'https://x/b.png' }, error: null }];
    await updateCreativeAsset('a1', { status: 'ready', url: 'https://x/b.png' });

    const update = chamadas.find((c) => c.op === 'update')!.args[0] as any;
    expect(update).toEqual({ status: 'ready', url: 'https://x/b.png' });
    expect(chamadas.find((c) => c.op === 'eq')!.args).toEqual(['id', 'a1']);
  });

  it('marca falha com a mensagem real', async () => {
    respostas = [{ data: { ...linhaBase, status: 'failed', error_message: 'formato recusado' }, error: null }];
    const r = await updateCreativeAsset('a1', { status: 'failed', errorMessage: 'formato recusado' });

    expect(r.status).toBe('failed');
    expect(r.errorMessage).toBe('formato recusado');
  });

  it('propaga erro do banco', async () => {
    respostas = [{ data: null, error: new Error('linha não encontrada') }];
    await expect(updateCreativeAsset('a1', { status: 'failed' })).rejects.toThrow('linha não encontrada');
  });
});

describe('deleteCreativeAsset', () => {
  it('apaga pelo id', async () => {
    respostas = [{ data: null, error: null }];
    await deleteCreativeAsset('a1');

    expect(chamadas.some((c) => c.op === 'delete')).toBe(true);
    expect(chamadas.find((c) => c.op === 'eq')!.args).toEqual(['id', 'a1']);
  });

  it('propaga erro do banco', async () => {
    respostas = [{ data: null, error: new Error('RLS negou') }];
    await expect(deleteCreativeAsset('a1')).rejects.toThrow('RLS negou');
  });
});

describe('createCreativeAsset — banco sem a migração do Fator V2', () => {
  const entradaV2 = {
    projectId: 'p1',
    type: 'factor' as const,
    strategicAngle: 'cost_of_inaction',
    qualityScore: 8.7,
    strategyJson: { strategy: { angle: 'cost_of_inaction' } },
    generationVersion: 'factor-v2',
    metadata: { strategy: { angle: 'cost_of_inaction' } },
  };

  it('coluna inexistente: regrava sem os campos V2 em vez de perder a arte', async () => {
    // A migração vive no repositório, mas quem a aplica no banco é um passo
    // de deploy separado. Com o banco atrasado, os CINCO inserts do lote
    // morriam juntos — depois de a geração de texto já ter sido paga, e sem
    // deixar um único card na tela.
    respostas = [
      { data: null, error: { code: 'PGRST204', message: "Could not find the 'strategic_angle' column" } },
      { data: { ...linhaBase, id: 'salvo' }, error: null },
    ];

    const arte = await createCreativeAsset(entradaV2);

    expect(arte.id).toBe('salvo');
    const inserts = chamadas.filter((c) => c.op === 'insert');
    expect(inserts).toHaveLength(2);
    // A segunda tentativa larga as colunas novas...
    expect(inserts[1].args[0]).not.toHaveProperty('strategic_angle');
    expect(inserts[1].args[0]).not.toHaveProperty('quality_score');
    // ...mas a estratégia sobrevive em `metadata`, que é jsonb e sempre existe.
    expect((inserts[1].args[0] as any).metadata.strategy.angle).toBe('cost_of_inaction');
  });

  it('erro que NÃO é de coluna sobe — RLS e CHECK não podem ser mascarados', async () => {
    respostas = [
      { data: null, error: { code: '42501', message: 'violates row-level security policy' } },
    ];

    await expect(createCreativeAsset(entradaV2)).rejects.toMatchObject({ code: '42501' });
    expect(chamadas.filter((c) => c.op === 'insert')).toHaveLength(1);
  });

  it('banco em dia: um insert só, com as colunas novas', async () => {
    respostas = [{ data: { ...linhaBase, id: 'direto' }, error: null }];

    const arte = await createCreativeAsset(entradaV2);

    expect(arte.id).toBe('direto');
    const inserts = chamadas.filter((c) => c.op === 'insert');
    expect(inserts).toHaveLength(1);
    expect((inserts[0].args[0] as any).strategic_angle).toBe('cost_of_inaction');
  });

  it('não duplica data URI gigante em thumbnail_url ao criar', async () => {
    respostas = [{ data: { ...linhaBase, url: 'data:image/png;base64,AAAA', thumbnail_url: null }, error: null }];

    await createCreativeAsset({ projectId: 'p1', type: 'edited', url: 'data:image/png;base64,AAAA' });

    const insert = chamadas.find((c) => c.op === 'insert')?.args[0] as any;
    expect(insert.thumbnail_url).toBeNull();
  });
});

describe('a grade não baixa o que não desenha', () => {
  // A lista de colunas e o tradutor de linha vivem no mesmo arquivo e ainda
  // assim podem divergir: o cliente do Supabase não infere a forma a partir
  // de uma string de colunas em runtime, então uma coluna esquecida vira
  // `undefined` no objeto, em silêncio. É esse silêncio que este teste
  // quebra.
  const LIDAS_POR_MAP_ASSET_ROW = [
    'id', 'project_id', 'client_id', 'type', 'status',
    'url', 'thumbnail_url', 'parent_asset_id', 'root_asset_id', 'group_id',
    'factor_axis', 'aspect_ratio', 'resolution', 'width', 'height',
    'prompt', 'negative_prompt', 'model', 'error_message', 'filename',
    'is_client_intelligence', 'metadata',
    'strategic_angle', 'strategic_thesis', 'quality_score',
    'created_at', 'updated_at',
  ];

  it('pede toda coluna que o tradutor lê, menos as pesadas omitidas de propósito', () => {
    const pedidas = new Set(COLUNAS_DA_GRADE.split(','));
    const omitidas = new Set<string>(COLUNAS_PESADAS_OMITIDAS as readonly string[]);

    const faltando = LIDAS_POR_MAP_ASSET_ROW.filter((c) => !pedidas.has(c) && !omitidas.has(c));
    expect(faltando, `colunas lidas e não pedidas: ${faltando.join(', ')}`).toEqual([]);
  });

  it('a lista lê a view leve, não a tabela pesada direta', async () => {
    respostas = [{ data: [], error: null }];

    await listCreativeAssets();

    expect(chamadas[0].tabela).toBe('creative_assets_grid');
  });

  it('não pede o peso: prompt, metadata e os jsons do Fator ficam de fora', () => {
    // `prompt` tem uns 4 KB; `metadata` carrega o designSystemDoc inteiro,
    // um markdown técnico de 3 a 8 KB gravado em toda arte gerada. Com 300
    // linhas isso vira megabytes para desenhar miniaturas.
    const pedidas = new Set(COLUNAS_DA_GRADE.split(','));
    for (const pesada of COLUNAS_PESADAS_OMITIDAS) {
      expect(pedidas.has(pesada), `${pesada} voltou para a consulta da grade`).toBe(false);
    }
  });

  it('não pede coluna que ninguém lê', () => {
    const pedidas = COLUNAS_DA_GRADE.split(',');
    const ninguemLe = [
      'mime_type', 'size_bytes', 'created_by',
      'angle_subtype', 'awareness_level', 'dominant_emotion', 'generation_version',
    ];
    expect(pedidas.filter((c) => ninguemLe.includes(c))).toEqual([]);
  });

  it('getCreativeAsset traz a linha inteira, que é o par da lista enxuta', async () => {
    chamadas.length = 0;
    respostas = [{ data: { id: 'a1', type: 'original', url: 'u', metadata: { designSystemDoc: 'DOC' }, prompt: 'p' }, error: null }];

    const asset = await getCreativeAsset('a1');

    expect(chamadas.find((c) => c.op === 'select')?.args[0]).toBe('*');
    expect(asset.prompt).toBe('p');
    expect(asset.metadata?.designSystemDoc).toBe('DOC');
  });
});
