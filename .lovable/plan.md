## Diagnóstico (confirmado nos logs e no banco)

1. Os tokens do Google **foram salvos** para "Deni Haut Cursos" (`google_ads_synced = false`, `customer_id = null`).
2. A listagem de contas falhou com erro 403 do Google:
   `Google Ads API has not been used in project 687673242990 before or it is disabled` (SERVICE_DISABLED).
3. Como a lista voltou vazia, o popup enviou `accounts: []` → o seletor de conta (que só abre com 2+ contas) nunca apareceu, e mesmo assim a tela mostrou "Conectado com sucesso".
4. Sem `google_ads_customer_id`, a função `google-ads-fetch-insights` não busca nada → dashboard do Google Ads vazio. O controle de acesso por cliente (admin ou `client_users`) já está correto, então cada cliente só vê os dados dele.

## Ação necessária fora do código (bloqueante)

No Google Cloud Console, no projeto **687673242990**, ativar a **Google Ads API**:
https://console.developers.google.com/apis/api/googleads.googleapis.com/overview?project=687673242990
Aguardar alguns minutos para propagar. Sem isso nenhuma conta será listada.

## Correções no código

**1. `supabase/functions/google-ads-oauth/index.ts`**
- Se `listAccessibleCustomers` falhar ou vier vazio, retornar `success: false` com a mensagem real do Google (em vez de "sucesso" com lista vazia).
- Ao buscar o nome de cada conta, tentar sem `login-customer-id` e, em caso de falha, repetir com o header (contas gerenciadas por MCC).
- Nova ação `list-accounts`: relista as contas usando o refresh token já salvo, sem precisar refazer o OAuth.
- Nova ação `set-account-manual`: aceita um Customer ID digitado (10 dígitos), valida com uma query simples e salva.

**2. `src/pages/GoogleAdsCallbackPage.tsx`**
- Só mostrar "Conectado com sucesso" quando vierem contas; caso contrário exibir o erro devolvido pela função e ainda assim avisar a janela principal.

**3. `src/pages/AdminDashboard.tsx`**
- Abrir o diálogo de seleção de conta do Google sempre que houver **1 ou mais** contas (hoje só abre com 2+), removendo a auto-seleção silenciosa.
- Se a lista voltar vazia, mostrar o diálogo com a mensagem de erro, um botão "Tentar listar contas de novo" (ação `list-accounts`) e um campo para informar o Customer ID manualmente.
- Botão "Trocar conta do Google" no card do cliente já conectado, para relistar e escolher outra conta.

**4. `src/hooks/useGoogleAdsOAuth.ts`**
- Hooks novos: `useListGoogleAdsAccounts` e `useSetGoogleAdsAccountManual`.

**5. `src/pages/ClientDashboard.tsx`**
- Quando o cliente tem token do Google mas nenhuma conta escolhida, mostrar estado claro ("conta do Google Ads ainda não selecionada") em vez do vazio atual.

## Verificação
Depois de ativar a API: sincronizar o Google Ads da Deni Haut Cursos, escolher a conta no seletor, e conferir se o dashboard Google Ads carrega campanhas e métricas no período selecionado.
