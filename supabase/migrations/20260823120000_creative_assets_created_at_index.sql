-- Índice de leitura do acervo do Criativo Studio.
--
-- A consulta principal do canvas é `ORDER BY created_at DESC LIMIT 300`
-- SEM filtro — e não havia índice em `created_at`. Isso é varredura
-- completa da tabela mais ordenação, a cada abertura da tela. Funcionou
-- enquanto a tabela era pequena; com o acervo crescendo (cada Fator
-- Criativo insere cinco linhas de uma vez) passou a estourar o
-- `statement_timeout`, e a tela abria vazia com
-- "canceling statement due to statement timeout".
--
-- Os índices que existiam cobriam `type` sozinho, `project_id` e
-- `(project_id, created_at)`. Nenhum deles ajuda uma consulta que não
-- filtra por projeto — que é justamente o padrão do V2, cujo canvas mostra
-- o acervo inteiro do cliente.
--
-- `CREATE INDEX` normal, e não `CONCURRENTLY`: o runner de migrations
-- envolve cada arquivo numa transação, e `CONCURRENTLY` não roda dentro de
-- uma.

-- Serve a consulta do canvas: sem filtro, ordenada, limitada.
CREATE INDEX IF NOT EXISTS creative_assets_created_at_idx
  ON public.creative_assets (created_at DESC);

-- Serve a consulta de insumos (`type IN (...)` + mesma ordenação). Sem a
-- coluna de ordenação no índice, o banco encontrava as linhas pelo tipo e
-- ainda tinha de ordenar todas elas.
CREATE INDEX IF NOT EXISTS creative_assets_type_created_idx
  ON public.creative_assets (type, created_at DESC);

-- Serve o recorte por cliente, que é como a tela é usada na prática.
CREATE INDEX IF NOT EXISTS creative_assets_client_created_idx
  ON public.creative_assets (client_id, created_at DESC);
