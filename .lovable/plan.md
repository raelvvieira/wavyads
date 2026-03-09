

# Conectar Facebook via OAuth (Login com Facebook)

## Resumo

Substituir o fluxo atual (colar token manualmente) por um botao "Conectar com Facebook" que abre a tela de login do Facebook, permite escolher o Business Manager e contas de anuncio, e salva o token automaticamente.

## Como vai funcionar para o usuario

1. Na aba Integracao, clica em **"Conectar com Facebook"**
2. Abre popup do Facebook para login e autorizacao
3. Escolhe qual Business Manager e conta de anuncios compartilhar
4. Volta ao dashboard ja conectado -- sem colar nada manualmente

## Pre-requisitos

Voce precisa ter um **Facebook App** em [developers.facebook.com](https://developers.facebook.com) com:
- Produto **Facebook Login for Business** ativado
- Permissoes: `ads_read`, `business_management`
- URL de redirecionamento configurada para apontar ao seu app

Eu vou pedir o **App ID** e o **App Secret** para armazenar como segredos no backend.

## Etapas da implementacao

### 1. Armazenar credenciais do Facebook App
- Salvar `FACEBOOK_APP_ID` e `FACEBOOK_APP_SECRET` como segredos no backend
- O App Secret nunca sera exposto no frontend

### 2. Nova Edge Function: `facebook-oauth`
- **Acao `auth-url`**: Gera a URL de autorizacao do Facebook com as permissoes necessarias (`ads_read`, `business_management`) e o redirect URI
- **Acao `callback`**: Recebe o `code` retornado pelo Facebook, troca por um access token de longa duracao (60 dias) usando o App Secret, e salva na tabela `facebook_credentials`
- **Acao `accounts`**: Apos autenticacao, lista as contas de anuncio disponiveis para o usuario escolher

### 3. Atualizar a tabela `facebook_credentials`
- Adicionar coluna `ad_account_name` (para exibir o nome da conta conectada)
- Adicionar coluna `token_expires_at` (para controlar expiracao do token)

### 4. Redesenhar a aba Integracao na tela de Configuracoes
- **Estado desconectado**: Exibir botao "Conectar com Facebook" com icone do Meta
- **Apos login no Facebook**: Exibir lista de contas de anuncio disponiveis para o usuario selecionar (similar a segunda tela de referencia)
- **Estado conectado**: Exibir card com o nome da conta conectada, status de conexao e botao "Desconectar"
- Remover os campos manuais de Access Token e Ad Account ID

### 5. Fluxo de callback no frontend
- Criar rota `/auth/facebook/callback` que recebe o `code` da URL
- Chamar a edge function para trocar o code pelo token
- Redirecionar de volta para a pagina de configuracoes

## Detalhes tecnicos

### Fluxo OAuth

```text
Frontend                    Facebook                   Edge Function
   |                           |                           |
   |-- Clica "Conectar" ------>|                           |
   |                           |                           |
   |   GET facebook-oauth      |                           |
   |   action=auth-url --------|-------------------------->|
   |   <-- retorna URL --------|---------------------------|
   |                           |                           |
   |-- Redireciona p/ Facebook |                           |
   |                           |                           |
   |<-- Callback com code -----|                           |
   |                           |                           |
   |   POST facebook-oauth     |                           |
   |   action=callback --------|-------------------------->|
   |                           |   Troca code por token    |
   |                           |<--------------------------|
   |                           |   Salva no banco          |
   |                           |-------------------------->|
   |<-- Sucesso! --------------|---------------------------|
   |                           |                           |
   |   GET facebook-oauth      |                           |
   |   action=accounts --------|-------------------------->|
   |                           |   Lista ad accounts       |
   |<-- Lista de contas -------|---------------------------|
   |                           |                           |
   |-- Seleciona conta ------->|                           |
   |   POST facebook-oauth     |                           |
   |   action=select-account --|-------------------------->|
   |                           |   Salva ad_account_id     |
   |<-- Conectado! ------------|---------------------------|
```

### Edge Function: `facebook-oauth`

Acoes:
- `auth-url`: Retorna URL do Facebook OAuth com scopes e redirect_uri
- `callback`: Recebe code, troca por token via `oauth/access_token`, gera token de longa duracao via endpoint de troca, salva no banco
- `accounts`: Chama `me/adaccounts?fields=name,account_id,account_status` para listar contas disponiveis
- `select-account`: Salva a conta selecionada na tabela `facebook_credentials` e marca como valida

### Migracao do banco

```text
ALTER TABLE facebook_credentials
  ADD COLUMN ad_account_name text,
  ADD COLUMN token_expires_at timestamptz;
```

### Nova rota no frontend

```text
/auth/facebook/callback  -- Recebe code do OAuth e finaliza o fluxo
```

### Segredos necessarios

- `FACEBOOK_APP_ID` -- ID do seu Facebook App
- `FACEBOOK_APP_SECRET` -- Secret do seu Facebook App

