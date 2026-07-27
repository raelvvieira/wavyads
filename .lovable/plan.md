## Estado atual (verificado no banco)

- Apenas **Deni Haut Cursos** tem login Google salvo: `google_ads_customer_id = 8125716511`, `google_ads_synced = true`.
- O nome gravado é `Conta 8125716511` (placeholder) — ou seja, a busca do nome real falhou quando a API ainda estava desativada. Agora que a API está ligada, isso deve funcionar.
- Nenhum outro cliente tem token do Google.

## Passos

**1. Revalidar a conta da Deni Haut Cursos (na interface)**
- No card do cliente, usar **"Trocar conta do Google"** → relista as contas com o refresh token já salvo.
- Conferir se `8125716511` é mesmo a conta de anúncios certa (e não a conta gerenciadora/MCC) e confirmar no seletor. Isso também grava o nome real da conta.

**2. Corrigir chamadas para contas sob MCC** — `supabase/functions/google-ads-fetch-insights/index.ts`
- Hoje toda consulta GAQL envia `login-customer-id` igual ao próprio `customer_id`. Para contas gerenciadas por um MCC isso retorna erro de permissão.
- Ajuste: tentar primeiro **sem** o header; se falhar com erro de autorização, repetir **com** o header (mesmo padrão já usado no `google-ads-oauth`).
- Propagar a mensagem real do Google no erro, em vez de erro genérico 500.

**3. Salvar o MCC quando existir** (se o passo 1 mostrar que a conta está sob gerenciadora)
- Guardar o ID da gerenciadora junto do cliente e usá-lo como `login-customer-id` nas consultas, em vez do próprio customer id.
- Requer uma coluna nova `google_ads_login_customer_id` em `clients` (nullable) e uso nas duas funções.

**4. Verificação final**
- Abrir o dashboard da Deni Haut Cursos na aba Google Ads, com um período onde existiram campanhas (ex.: últimos 30 dias) e confirmar campanhas, gasto, cliques e conversões.
- Repetir a conexão para os demais clientes que tiverem Google Ads.

## Detalhes técnicos

O passo 3 só é necessário se a listagem mostrar múltiplas contas/gerenciadora; se `8125716511` for uma conta direta, os passos 1, 2 e 4 resolvem. Nenhuma alteração de dados de outros clientes; o isolamento por cliente permanece como está.
