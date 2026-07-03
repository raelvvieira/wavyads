## Diagnóstico

O erro atual não parece ser mais de parsing do retorno. Pelos logs recentes, a função `social-extract-copy` chama o ator de transcrição com 3 variações de URL (`/p/`, `/reel/`, `/tv/`), mas o Apify está retornando `results length: 0` para todas. Isso faz a UI mostrar `erro_actor` e `— sem transcrição —`.

A documentação atual do ator também mostra que o endpoint recomendado mudou para `run-sync` e retorna o objeto da execução, enquanto o código usa `run-sync-get-dataset-items`. Para alguns Reels, esse caminho está terminando sem itens no dataset mesmo sem erro HTTP.

## Plano de correção

1. **Atualizar a chamada ao ator de transcrição**
   - Trocar a estratégia principal para o endpoint documentado `run-sync`.
   - Ler o `defaultDatasetId` retornado pela execução e buscar os itens do dataset em seguida.
   - Manter um fallback para `run-sync-get-dataset-items` caso o formato antigo ainda funcione em alguns casos.

2. **Melhorar seleção da URL do Reel**
   - Priorizar `videoUrl`, `video_url`, `videoSrc`, `downloadUrl` quando o scraper fornecer uma URL direta de vídeo.
   - Depois tentar a URL original do post.
   - Só então gerar variações `/reel/`, `/p/`, `/tv/` a partir do shortcode.
   - Evitar começar por `/p/` quando o item já foi identificado como Reel.

3. **Diferenciar erro real de “sem resultado”**
   - Adicionar status interno mais claro para dataset vazio / timeout / ator com erro.
   - No retorno final, continuar compatível com a UI usando `erro_actor`, mas com logs mais úteis para saber o motivo.

4. **Ajustar a UI para exibir esse status**
   - Incluir `erro_actor` em `STATUS_LABEL` para aparecer como erro explícito, não como status desconhecido.
   - Manter a possibilidade de editar manualmente a copy consolidada se a legenda existir.

5. **Validar após implementar**
   - Deploy da função `social-extract-copy`.
   - Testar com um Reel público conhecido e com um item real recente do fluxo.
   - Conferir logs para confirmar se há transcrição, dataset vazio ou bloqueio externo.