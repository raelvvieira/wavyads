-- Etapa 4 do redesenho: gerações órfãs.
--
-- Hoje a geração acontece no navegador: ele cria o asset como 'generating',
-- chama a edge function e espera. Se a aba fechar no meio, ninguém escreve o
-- resultado e o asset fica 'generating' para sempre — um card "Gerando..."
-- fantasma no Canvas, que nunca vira nada.
--
-- Enquanto a geração não migra para um worker de verdade (que exigiria
-- pg_cron + uma function rodando em background), esta função fecha o buraco:
-- o que passou do tempo limite vira 'failed' com motivo explícito, e o usuário
-- pode retentar. Falhar de forma visível é melhor que carregar para sempre —
-- foi a mesma lição do dashboard do Google Ads.

CREATE OR REPLACE FUNCTION public.recover_stale_creative_assets(
  p_project_id uuid DEFAULT NULL,
  p_timeout_minutes integer DEFAULT 10
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recovered integer;
BEGIN
  -- Só admin: é a mesma política das demais tabelas do Studio, e SECURITY
  -- DEFINER sem essa checagem deixaria qualquer autenticado alterar assets.
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- O limite é generoso de propósito: a geração de imagem tem timeout de 90s
  -- no cliente, mas um lote do Fator Criativo roda várias em paralelo e uma
  -- rede ruim pode esticar isso. Marcar cedo demais mataria trabalho em curso.
  UPDATE public.creative_assets
     SET status = 'failed',
         error_message = COALESCE(
           error_message,
           'A geração foi interrompida (a aba pode ter sido fechada). Você pode tentar novamente.'
         )
   WHERE status IN ('queued', 'generating')
     AND created_at < now() - make_interval(mins => GREATEST(p_timeout_minutes, 1))
     AND (p_project_id IS NULL OR project_id = p_project_id);

  GET DIAGNOSTICS v_recovered = ROW_COUNT;
  RETURN v_recovered;
END;
$$;

REVOKE ALL ON FUNCTION public.recover_stale_creative_assets(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_stale_creative_assets(uuid, integer) TO authenticated;

-- Sustenta a varredura por status sem escanear a tabela inteira.
CREATE INDEX IF NOT EXISTS creative_assets_pending_idx
  ON public.creative_assets (status, created_at)
  WHERE status IN ('queued', 'generating');

NOTIFY pgrst, 'reload schema';
