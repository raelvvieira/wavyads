

## Plan: Google Ads Dashboard com Toggle de Plataforma

### Resumo
Adicionar integração Google Ads mantendo o dashboard Meta existente. No topo do dashboard do cliente, um toggle **Meta Ads | Google Ads** alterna entre as duas fontes de dados. No card de cada cliente (AdminDashboard), um segundo botão "Sincronizar Google" aparece ao lado do "Sincronizar Meta".

### Pré-requisitos — 3 Secrets
Antes de implementar, você precisará fornecer:
- `GOOGLE_ADS_CLIENT_ID` — do Google Cloud Console
- `GOOGLE_ADS_CLIENT_SECRET` — do Google Cloud Console  
- `GOOGLE_ADS_DEVELOPER_TOKEN` — do Google Ads MCC (API Center)

No Google Cloud Console, configure:
- **Origens JavaScript autorizadas**: `https://dashboard.wavydigital.com.br`
- **URI de redirecionamento autorizado**: `https://dashboard.wavydigital.com.br/auth/google-ads/callback`

### 1. Migração SQL — Novas colunas na tabela `clients`

```sql
ALTER TABLE public.clients
  ADD COLUMN google_ads_access_token text,
  ADD COLUMN google_ads_refresh_token text,
  ADD COLUMN google_ads_customer_id text,
  ADD COLUMN google_ads_customer_name text,
  ADD COLUMN google_ads_synced boolean NOT NULL DEFAULT false,
  ADD COLUMN google_ads_token_expires_at timestamptz,
  ADD COLUMN google_ads_last_sync_at timestamptz;
```

### 2. Edge Function — `google-ads-oauth/index.ts`
Mesmo padrão do `meta-oauth`:
- **auth-url**: Gera URL OAuth Google com scope `https://www.googleapis.com/auth/adwords`, `access_type=offline`, `prompt=consent`
- **callback**: Troca code por access+refresh tokens, busca contas acessíveis via Google Ads API (`/customers:listAccessibleCustomers`), retorna lista
- **select-account**: Salva customer ID no `clients`, marca `google_ads_synced = true`
- **disconnect**: Limpa campos Google Ads

### 3. Edge Function — `google-ads-fetch-insights/index.ts`
Mesmo padrão do `meta-fetch-insights`, usando Google Ads API v18 REST:
- Usa GAQL para queries: `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.ctr, metrics.average_cpc, metrics.average_cpm FROM campaign WHERE segments.date BETWEEN '{since}' AND '{until}'`
- Actions: `campaigns`, `insights` (agregado), `insights_previous`
- Auto-refresh do token usando refresh_token quando expirado
- Retorna dados no mesmo formato (`MetaCampaign[]`, `MetaInsights`) para reusar todos os componentes existentes

### 4. Frontend — Novos arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useGoogleAdsOAuth.ts` | Mesmo padrão `useMetaOAuth` — mutations para auth-url, select-account |
| `src/hooks/useGoogleAdsInsights.ts` | Mesmo padrão `useMetaInsights` — queries para campaigns, insights, insights_previous |
| `src/pages/GoogleAdsCallbackPage.tsx` | Popup callback (mesmo padrão `MetaCallbackPage`) |

### 5. Frontend — Edições

#### `ClientDashboard.tsx`
- Adicionar estado `platform: 'meta' | 'google'` 
- No header, antes dos filtros de data, renderizar toggle com dois botões:
  - **Meta Ads** (ativo quando `platform === 'meta'`)
  - **Google Ads** (ativo quando `platform === 'google'`)
- Toggle só aparece se pelo menos uma plataforma está sincronizada
- Quando `platform === 'google'`, usar hooks `useGoogleAdsCampaigns/Insights` em vez dos Meta
- Toda a lógica de KPIs, charts, tabela, funil, insights reutiliza os mesmos componentes (dados no mesmo formato)
- Estado "não sincronizado" mostra botão "Sync Google Ads" (para admin) ou "Aguardando sincronização" (para cliente)

#### `AdminDashboard.tsx`
- No card de cada cliente, adicionar segundo botão "Sincronizar Google" abaixo do botão Meta existente
- Mostrar status de sync Google Ads (✓ Sincronizado / ✗ Não sincronizado) separado do Meta
- Listener de `postMessage` para `GOOGLE_ADS_OAUTH_CALLBACK`

#### `App.tsx`
- Adicionar rota `/auth/google-ads/callback` → `GoogleAdsCallbackPage`

#### `supabase/config.toml`
- Registrar `google-ads-oauth` e `google-ads-fetch-insights`

### Ordem de Implementação
1. Coletar os 3 secrets do usuário
2. Migração SQL
3. `google-ads-oauth` edge function + `GoogleAdsCallbackPage` + `useGoogleAdsOAuth` hook
4. `google-ads-fetch-insights` edge function + `useGoogleAdsInsights` hook
5. Atualizar `AdminDashboard` com botão "Sincronizar Google"
6. Atualizar `ClientDashboard` com toggle de plataforma

