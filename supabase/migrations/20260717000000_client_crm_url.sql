-- CRM por cliente: URL da instância self-hosted do EVO CRM daquele cliente.
-- Cada cliente aponta pra sua própria instância/inbox do EVO; a Wavy embute
-- (iframe) ou abre em nova aba. Reaproveita a tabela clients — a RLS já cobre
-- o acesso: admin gerencia tudo, cliente só enxerga o próprio registro (então
-- lê a própria crm_url, mas não altera; só admin configura).
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS crm_url text;

NOTIFY pgrst, 'reload schema';
