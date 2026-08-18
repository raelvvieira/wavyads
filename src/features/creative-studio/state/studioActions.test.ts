import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CONVERSATION_ACTIONS,
  DIRECT_ACTIONS,
  ORPHAN_ACTIONS,
  isStudioAction,
  parseStudioAction,
} from './studioActions';

const PAGINA = readFileSync('src/pages/CriativoStudioPage.tsx', 'utf8');

describe('vocabulário de ações', () => {
  it('não tem id repetido entre os grupos', () => {
    const todos = [...CONVERSATION_ACTIONS, ...DIRECT_ACTIONS, ...ORPHAN_ACTIONS];
    expect(todos).toHaveLength(new Set(todos).size);
  });

  it('cobre exatamente o que o switch trata', () => {
    // O vocabulário e o switch precisam andar juntos. Divergência aqui é
    // botão morto (emite e ninguém trata) ou caso morto — os dois erros
    // que a string livre escondia.
    const bloco = PAGINA.slice(PAGINA.indexOf('const handleQuickAction'));
    const tratados = new Set([...bloco.slice(0, bloco.indexOf('\n  };')).matchAll(/case '([a-z-]+)'/g)].map((m) => m[1]));
    const declarados = new Set<string>([...CONVERSATION_ACTIONS, ...DIRECT_ACTIONS, ...ORPHAN_ACTIONS]);

    expect([...tratados].filter((t) => !declarados.has(t))).toEqual([]);
    expect([...declarados].filter((d) => !tratados.has(d))).toEqual([]);
  });

  it('toda ação emitida pela conversa está declarada', () => {
    const emitidas = new Set([...PAGINA.matchAll(/action: '([a-z-]+)'/g)].map((m) => m[1]));
    const declaradas = new Set<string>([...CONVERSATION_ACTIONS, ...DIRECT_ACTIONS]);
    expect([...emitidas].filter((e) => !declaradas.has(e))).toEqual([]);
  });

  it('as órfãs continuam sendo órfãs', () => {
    // Se uma delas voltar a ser emitida, ela deixa de ser órfã e este teste
    // avisa — o grupo existe para tornar a decisão explícita, não para
    // esconder código morto.
    const emitidas = new Set([...PAGINA.matchAll(/action: '([a-z-]+)'|handleQuickAction\('([a-z-]+)'\)/g)]
      .map((m) => m[1] ?? m[2]));
    expect(ORPHAN_ACTIONS.filter((o) => emitidas.has(o))).toEqual([]);
  });
});

describe('isStudioAction', () => {
  it('aceita id conhecido', () => {
    expect(isStudioAction('open-edit-image')).toBe(true);
    expect(isStudioAction('open-project-history')).toBe(true);
  });

  it('recusa desconhecido', () => {
    expect(isStudioAction('inventado')).toBe(false);
    expect(isStudioAction('')).toBe(false);
  });
});

describe('parseStudioAction', () => {
  it('devolve null para dado persistido inválido', () => {
    // A conversa vai no snapshot com os botões dentro, então um projeto
    // salvo pode trazer id de uma versão anterior do produto. Ignorar o
    // botão é melhor que despachar algo que não existe mais.
    expect(parseStudioAction('acao-de-versao-antiga')).toBeNull();
    expect(parseStudioAction(null)).toBeNull();
    expect(parseStudioAction(42)).toBeNull();
    expect(parseStudioAction({ type: 'open-edit-image' })).toBeNull();
  });

  it('devolve o id quando conhecido', () => {
    expect(parseStudioAction('skip-references')).toBe('skip-references');
  });
});
