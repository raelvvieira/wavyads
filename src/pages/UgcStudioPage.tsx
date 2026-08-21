import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Film, Loader2, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useClients } from '@/hooks/useClients';
import { createUgcProject, listUgcProjects } from '@/features/ugc-studio/api/ugcRepository';
import type { UgcProject } from '@/features/ugc-studio/types/ugc';

/**
 * Lista de projetos de UGC.
 *
 * Projeto é a unidade aqui, e não a arte solta como no Criativo Studio. A
 * razão é o avatar: ele é escolhido uma vez e trava para tudo que for
 * gerado dentro dele. Sem esse recipiente, cada clipe teria a sua própria
 * pessoa e o anúncio montado pareceria quatro pessoas diferentes.
 */
export default function UgcStudioPage() {
  const navigate = useNavigate();
  const { data: clients } = useClients();
  const [projetos, setProjetos] = useState<UgcProject[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setProjetos(await listUgcProjects());
      setErro(null);
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao carregar os projetos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const criar = useCallback(async () => {
    const nome = titulo.trim();
    if (!nome || criando) return;
    setCriando(true);
    try {
      const projeto = await createUgcProject({ title: nome, clientId: clienteId });
      navigate(`/ugc-studio/${projeto.id}`);
    } catch (e: any) {
      toast({ title: 'Erro ao criar o projeto', description: e?.message, variant: 'destructive' });
    } finally {
      setCriando(false);
    }
  }, [titulo, clienteId, criando, navigate]);

  return (
    <div className="ugc-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white/92">UGC Studio</h1>
          <p className="text-[13px] text-white/50">Clipes de avatar falando e de produto, com a mesma pessoa do começo ao fim</p>
        </div>
        <button
          type="button"
          onClick={() => { setTitulo(''); setNovoAberto(true); }}
          className="btn-accent inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold"
        >
          <Plus className="h-4 w-4" />
          Novo projeto
        </button>
      </header>

      {erro && (
        <p className="flex items-start gap-2 rounded-[var(--wavy-radius-card)] border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-white/78">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          {erro}
        </p>
      )}

      {carregando ? (
        <div className="ugc-empty"><Loader2 className="h-5 w-5 animate-spin text-white/45" /></div>
      ) : projetos.length === 0 && !erro ? (
        <div className="ugc-empty">
          <Film className="h-6 w-6 text-white/25" />
          <p className="text-[13px] font-medium text-white/70">Nenhum projeto ainda</p>
          <p className="text-[12px] text-white/45">Um projeto guarda o avatar, o roteiro e todos os clipes.</p>
        </div>
      ) : (
        <ul className="ugc-project-grid">
          {projetos.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => navigate(`/ugc-studio/${p.id}`)} className="ugc-project-card">
                <span className="ugc-project-thumb" aria-hidden><Film className="h-6 w-6 text-white/20" /></span>
                <span className="block truncate text-[13px] font-medium text-white/88">{p.title}</span>
                <span className="block text-[11px] text-white/45">
                  {new Date(p.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => { setTitulo(''); setNovoAberto(true); }}
              className="ugc-project-new"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[12px] font-medium">Novo projeto</span>
            </button>
          </li>
        </ul>
      )}

      {novoAberto && (
        <div className="ugc-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Novo projeto UGC">
          <div className="ugc-dialog max-w-[420px]">
            <header className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white/92">Nome do projeto</h2>
              <button type="button" onClick={() => setNovoAberto(false)} aria-label="Fechar" className="rounded-full p-1.5 text-white/50 hover:bg-white/[0.08] hover:text-white/90">
                <X className="h-4 w-4" />
              </button>
            </header>

            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void criar(); }}
              placeholder="Ex.: campanha de verão"
              aria-label="Nome do projeto"
              className="ugc-field"
            />

            <select
              value={clienteId ?? ''}
              onChange={(e) => setClienteId(e.target.value || null)}
              aria-label="Cliente"
              className="ugc-field"
            >
              <option value="">Sem cliente</option>
              {(clients ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="flex gap-2">
              <button type="button" onClick={() => setNovoAberto(false)} className="btn-glass flex-1 rounded-xl py-2.5 text-sm font-medium">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void criar()}
                disabled={!titulo.trim() || criando}
                className="btn-accent inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {criando && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
