import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/* O banco falso devolve `linhasDoBanco` em páginas de `PAGINA`, do mesmo
   jeito que o PostgREST faz com `.range()`. É o que permite provar que a
   tela não para no milésimo registro. */
const PAGINA = 1000;
let linhasDoBanco: any[] = [];
const invoke = vi.fn();

function consulta(tabela: string) {
  const estado: any = { inicio: 0, fim: PAGINA - 1 };
  const encadeia: any = {
    select: () => encadeia,
    eq: () => encadeia,
    gte: () => encadeia,
    lte: () => encadeia,
    order: () => encadeia,
    limit: () => encadeia,
    range: (de: number, ate: number) => { estado.inicio = de; estado.fim = ate; return encadeia; },
    then: (resolve: any) => {
      const fatia = tabela === 'offline_conversions'
        ? linhasDoBanco.slice(estado.inicio, estado.fim + 1)
        : [];
      return Promise.resolve({ data: fatia, error: null }).then(resolve);
    },
  };
  return encadeia;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => consulta(t), functions: { invoke: (...a: any[]) => invoke(...a) } },
}));
vi.mock('@/hooks/useRole', () => ({ useRole: () => ({ isAdmin: true, isLoading: false }) }));
vi.mock('@/hooks/useClients', () => ({ useClient: () => ({ data: { id: 'c1', name: 'Deni Haut Cursos' } }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useMetaInsights', () => ({ useMetaCampaigns: () => ({ data: [] }) }));

import ComercialPage from './ComercialPage';

const conversao = (i: number, patch: any = {}) => ({
  id: `c${i}`, client_id: 'c1',
  fn: `Pessoa${i}`, ln: 'Sobrenome', email: `p${i}@x.com`, phone: '5511999990000',
  ct: null, zip: null, country: 'br', dob: null, doby: null, gen: null, age: null,
  event_name: 'Purchase', conversion_date: '2026-11-04T00:00:00.000Z',
  value: 100, currency: 'BRL', send_status: 'sent', error_message: null,
  meta_event_id: null, created_at: '2026-11-04T00:00:00.000Z',
  ...patch,
});

/** O que o navegador recebeu para baixar. */
let baixado: { nome: string; conteudo: string } | null = null;

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/comercial/c1']}>
        <Routes><Route path="/comercial/:clientId" element={<ComercialPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const botaoBaixar = () => screen.getByRole('button', { name: /Baixar planilha/ });

/* Esperar o BOTÃO aparecer não basta: ele existe antes de a consulta
   voltar, e a contagem só entra nele quando há linhas. Esperar o número é
   o que garante que o teste olha a tela já carregada. */
const esperarCarregar = (n: number) =>
  waitFor(() => expect(botaoBaixar().textContent).toContain(`(${n})`), { timeout: 5000 });

describe('a planilha do Comercial', () => {
  beforeEach(() => {
    baixado = null;
    linhasDoBanco = [conversao(1), conversao(2, { fn: 'Outra', email: 'outra@x.com' })];

    (global as any).URL.createObjectURL = vi.fn(() => 'blob:fake');
    (global as any).URL.revokeObjectURL = vi.fn();
    // O clique no <a> é interceptado: é o único ponto em que dá para ver o
    // arquivo que o navegador receberia.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      const blob = (global as any).URL.createObjectURL.mock.calls.at(-1)?.[0] as Blob;
      baixado = { nome: this.download, conteudo: (blob as any).__texto ?? '' };
    });
    // jsdom não lê Blob de forma síncrona; guardamos o texto no próprio objeto.
    const BlobReal = global.Blob;
    (global as any).Blob = class extends BlobReal {
      __texto: string;
      constructor(partes: any[], opcoes?: any) { super(partes, opcoes); this.__texto = partes.join(''); }
    };
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('o botão existe e diz quantos registros vai levar', async () => {
    montar();
    await esperarCarregar(2);
  });

  it('baixa um CSV com os dados, nomeado pelo cliente', async () => {
    montar();
    await esperarCarregar(2);
    await act(async () => { fireEvent.click(botaoBaixar()); });

    expect(baixado!.nome).toMatch(/^conversoes-deni-haut-cursos-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(baixado!.conteudo).toContain('Pessoa1');
    expect(baixado!.conteudo).toContain('outra@x.com');
    // E com as colunas que a tela não mostra — foi o pedido.
    expect(baixado!.conteudo).toContain('ID do evento na Meta');
  });

  it('a planilha respeita a BUSCA — leva o que está na tela, não o acervo', async () => {
    // Um botão que exporta tudo enquanto a tela mostra um recorte entrega
    // um arquivo que não confere com o que se está olhando, e a diferença
    // só aparece depois.
    montar();
    await esperarCarregar(2);

    fireEvent.change(screen.getByPlaceholderText(/Buscar por nome/), { target: { value: 'outra' } });
    await waitFor(() => expect(botaoBaixar().textContent).toContain('(1)'));

    await act(async () => { fireEvent.click(botaoBaixar()); });
    expect(baixado!.conteudo).toContain('outra@x.com');
    expect(baixado!.conteudo).not.toContain('p1@x.com');
  });

  it('sem nenhum registro, o botão não promete um arquivo vazio', async () => {
    linhasDoBanco = [];
    montar();
    await waitFor(() => expect(botaoBaixar()).toBeTruthy());
    expect(botaoBaixar()).toBeDisabled();
  });

  it('passa do milésimo registro — o teto antigo escondia linhas em silêncio', async () => {
    // Havia um `.limit(1000)`: no registro 1001 a tela mostrava menos do
    // que existe, os totais ficavam menores que a realidade e a planilha
    // sairia faltando gente, sem erro nenhum.
    linhasDoBanco = Array.from({ length: 1250 }, (_, i) => conversao(i));
    montar();
    await esperarCarregar(1250);
  });
});
