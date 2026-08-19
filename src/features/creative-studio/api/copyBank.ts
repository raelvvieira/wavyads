import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type CopyBankRow = Database['public']['Tables']['client_copy_bank']['Row'];

export interface CopyBankEntry {
  id: string;
  copyText: string;
  tema: string | null;
  createdAt: string;
}

function mapRow(row: CopyBankRow): CopyBankEntry {
  return { id: row.id, copyText: row.copy_text, tema: row.tema, createdAt: row.created_at };
}

/**
 * Copies já usadas por ESTE cliente — não por projeto. Copy é sobre a voz
 * da marca do cliente, não de um projeto específico, então o histórico
 * atravessa todos os projetos dele.
 */
export async function listCopyBank(clientId: string): Promise<CopyBankEntry[]> {
  const { data, error } = await supabase
    .from('client_copy_bank')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

/**
 * Registra uma copy como "já usada" — chamada depois de uma geração bem
 * sucedida que usou um anexo de copy, para o histórico refletir o que de
 * fato foi usado, não só o que alguém salvou manualmente. Devolve a linha
 * gravada pra quem chamou poder atualizar a lista local sem recarregar.
 */
export async function saveCopyToBank(input: {
  clientId: string | null;
  projectId: string | null;
  copyText: string;
  tema?: string | null;
}): Promise<CopyBankEntry | null> {
  if (!input.clientId) return null; // sem cliente, não há "voz de marca" pra guardar.

  const { data, error } = await supabase
    .from('client_copy_bank')
    .insert({
      client_id: input.clientId,
      project_id: input.projectId,
      copy_text: input.copyText,
      tema: input.tema ?? null,
      // A tabela só aceita 'manual' | 'ai' (CHECK constraint) — o texto aqui
      // veio de quem digitou/colou no anexo, não de uma sugestão de IA.
      source: 'manual',
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapRow(data);
}
