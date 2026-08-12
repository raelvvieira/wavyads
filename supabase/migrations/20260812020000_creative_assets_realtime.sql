-- Etapa 11 do redesenho: atualização em tempo real do Canvas.
--
-- O plano original sugeria SSE, que pressupõe um servidor próprio segurando a
-- conexão. Aqui o backend são Edge Functions (sem processo persistente), então
-- o equivalente nativo é o Realtime do Supabase: o Postgres publica as
-- mudanças e o navegador escuta. Mesmo efeito — servidor → cliente —, sem
-- infraestrutura nova.
--
-- Com isso o Canvas deixa de depender de refetch manual: quando uma geração
-- termina (ou falha) em outra aba, ou quando o card sai de 'generating' para
-- 'ready', a arte aparece sozinha.

-- REPLICA IDENTITY FULL faz o Postgres enviar a linha inteira no evento de
-- UPDATE. Sem isso o payload traz só a chave primária, e o cliente não
-- conseguiria saber que o status virou 'ready' nem qual é a nova url.
ALTER TABLE public.creative_assets REPLICA IDENTITY FULL;
ALTER TABLE public.creative_asset_groups REPLICA IDENTITY FULL;

-- Adicionar à publicação é o que efetivamente liga o Realtime para a tabela.
-- O bloco tolera a tabela já estar publicada, para a migration ser idempotente.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.creative_assets;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL; -- publicação não existe (ambiente local)
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.creative_asset_groups;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END
$$;

NOTIFY pgrst, 'reload schema';
