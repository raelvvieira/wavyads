# Plano: corrigir carregamento infinito do Criativo Studio

## Diagnóstico confirmado
- O erro atual é timeout na consulta de abertura do Criativo Studio.
- A tabela de artes tem poucas linhas, mas algumas linhas guardam a imagem inteira como `data:image/...base64` dentro do banco.
- Foram encontrados 32 assets com `url` e `thumbnail_url` em base64, somando cerca de 49 MB em cada coluna.
- A tela já evita `prompt` e `metadata`, mas ainda lê `url` e `thumbnail_url`; quando essas colunas têm base64 gigante, a consulta fica pesada e pode estourar o tempo limite.
- Também falta um índice direto para a visão global ordenada por data, usada quando “Todos Clientes” está selecionado.

## O que vou mudar
1. **Otimizar o banco para abrir rápido**
   - Adicionar índice para a listagem global por data.
   - Adicionar índices para listagens por cliente e por tipo de asset.

2. **Parar de carregar imagem gigante na abertura**
   - Separar a consulta da grade em duas camadas:
     - lista leve para abrir o Studio rapidamente;
     - hidratação de uma arte específica só quando o usuário seleciona, edita, baixa, usa como referência ou visualiza.
   - Evitar que `url`/`thumbnail_url` em base64 sejam puxadas para todas as artes de uma vez.

3. **Parar de gravar novas edições em base64**
   - Ajustar a função de edição de imagem para salvar o resultado no storage e devolver URL, como a geração principal já deveria fazer.
   - Se o storage falhar, retornar erro claro em vez de gravar base64 gigante no banco.

4. **Sanear o histórico já afetado**
   - Criar uma rotina administrativa segura para migrar os 32 assets antigos de base64 para arquivos no storage.
   - Rodar a rotina uma vez e conferir que `creative_assets.url` e `thumbnail_url` não ficam mais com `data:image/...base64`.

5. **Validar o resultado**
   - Reabrir a página do Criativo Studio no preview autenticado.
   - Confirmar que “Todos Clientes” carrega sem timeout.
   - Confirmar que selecionar cliente, referências, produtos, logos e templates continua funcionando.
   - Confirmar que editar uma arte nova não volta a salvar base64 no banco.

## Detalhes técnicos
- Banco: índices em `creative_assets(created_at desc)`, `creative_assets(client_id, created_at desc)` e `creative_assets(type, created_at desc)`.
- Frontend: `listCreativeAssets` passa a ser uma consulta leve; `getCreativeAsset` continua buscando a linha completa sob demanda.
- Backend: a função de edição passa a persistir imagens geradas no bucket privado `creative-assets` e responder com uma URL utilizável pelo app.
- Backfill: rotina admin-only com validação de login/perfil admin antes de alterar qualquer asset.
