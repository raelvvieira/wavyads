

# Implementar Facebook OAuth com as credenciais fornecidas

Recebi as credenciais do Facebook App. Vou armazena-las como segredos no backend e implementar o fluxo completo de OAuth.

## Etapas

### 1. Armazenar segredos
- Salvar `FACEBOOK_APP_ID` = `1364553745432767`
- Salvar `FACEBOOK_APP_SECRET` = `f2b2072d1e4696d7daab800db1b6e429`

### 2. Migrar banco de dados
Adicionar colunas faltantes na tabela `facebook_credentials`:
```text
ALTER TABLE facebook_credentials
  ADD COLUMN IF NOT EXISTS ad_account_name text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;
```

### 3. Criar Edge Function `facebook-oauth`
Nova função com 4 ações:
- **`auth-url`**: Gera URL de autorização do Facebook com scopes `ads_read,business_management` e redirect URI apontando para `/auth/facebook/callback`
- **`callback`**: Recebe o `code`, troca por access token, depois por token de longa duração (60 dias), salva no banco
- **`accounts`**: Lista contas de anúncio disponíveis via `me/adaccounts`
- **`select-account`**: Salva a conta escolhida e marca como válida

### 4. Criar página de callback
- Nova rota `/auth/facebook/callback` que captura o `code` da URL
- Chama a edge function `facebook-oauth` com action `callback`
- Redireciona para `/configuracoes` após sucesso

### 5. Redesenhar aba Integração (SettingsPage)
Três estados visuais:
- **Desconectado**: Botão "Conectar com Facebook" com ícone Meta
- **Seleção de conta**: Lista de contas de anúncio retornadas pela API para o usuário escolher (similar à imagem de referência)
- **Conectado**: Card com nome da conta, status verde, botão "Desconectar"

### 6. Atualizar hooks
- Novo hook `useFacebookOAuth` para gerenciar o fluxo OAuth (gerar URL, callback, listar contas, selecionar conta, desconectar)
- Atualizar `useCredentials` para incluir `ad_account_name` e `token_expires_at`

### Detalhes técnicos

A URL de redirecionamento que precisa ser configurada no Facebook App:
```text
https://id-preview--72402569-ee8b-46ad-b0be-37ba98bcae85.lovable.app/auth/facebook/callback
```

Fluxo no `facebook-oauth` edge function para troca de token:
1. `GET graph.facebook.com/v24.0/oauth/access_token?code={code}&client_id={APP_ID}&client_secret={APP_SECRET}&redirect_uri={URI}` → short-lived token
2. `GET graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={short_token}` → long-lived token (60 days)

