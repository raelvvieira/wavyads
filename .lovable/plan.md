

# Integração com Facebook Ads - Dados Reais

## Resumo

Conectar sua conta de negócios do Facebook Ads ao dashboard para puxar dados reais de campanhas, gastos, impressões, cliques e conversões -- substituindo os dados mockados atuais.

## Como vai funcionar

1. Você vai fornecer seu **Access Token** e **Ad Account ID** do Facebook na tela de Configurações
2. Esses dados ficam salvos de forma segura no banco de dados (vinculados ao seu usuário)
3. Uma função backend busca os dados da API do Facebook (Graph API v24.0) e retorna para o dashboard
4. O dashboard exibe seus dados reais no lugar dos dados mockados

## O que precisa ser feito antes

Para usar a API do Facebook Ads, você precisa ter:
- Um **Facebook App** criado em [developers.facebook.com](https://developers.facebook.com)
- Um **Access Token** com permissão `ads_read`
- O **Ad Account ID** (formato: `act_XXXXXXXXX`)

## Etapas da implementação

### 1. Autenticação real com email/senha
- Implementar login e cadastro usando o sistema de autenticação do Lovable Cloud
- Proteger rotas para que apenas usuários autenticados acessem o dashboard
- Criar tabela `profiles` para dados do usuário

### 2. Tabela para credenciais do Facebook
- Criar tabela `facebook_credentials` com colunas: `user_id`, `access_token`, `ad_account_id`
- Proteger com RLS para que cada usuário veja apenas suas credenciais
- Token salvo de forma segura no banco

### 3. Edge Function para buscar dados do Facebook
- Criar função backend `facebook-ads` que:
  - Recebe o `user_id` e busca as credenciais no banco
  - Chama a API `graph.facebook.com/v24.0/act_{ID}/campaigns` para listar campanhas
  - Chama `/insights` para métricas (spend, impressions, clicks, conversions, ctr, cpc)
  - Retorna dados formatados para o frontend

### 4. Atualizar a tela de Configurações (aba Integração)
- Campos para Access Token e Ad Account ID com botao de salvar
- Indicador de status da conexão (conectado/desconectado)
- Botão para testar conexão antes de salvar

### 5. Atualizar o Dashboard para usar dados reais
- Quando o usuário tem credenciais salvas, buscar dados reais via edge function
- Fallback para dados mockados quando não há integração configurada
- Loading states enquanto busca os dados

### 6. Atualizar as paginas de Campanhas e Clientes
- Campanhas vindas da API do Facebook em vez de dados mock
- Manter filtros por status funcionando com dados reais

---

## Detalhes tecnicos

### Tabelas do banco de dados

```text
profiles
+------------+--------+---------------------------+
| Coluna     | Tipo   | Descricao                 |
+------------+--------+---------------------------+
| id         | uuid   | FK para auth.users(id)    |
| name       | text   | Nome do usuario           |
| email      | text   | Email                     |
| company    | text   | Nome da empresa           |
| created_at | timestamptz | Data de criacao       |
+------------+--------+---------------------------+

facebook_credentials
+----------------+--------+---------------------------+
| Coluna         | Tipo   | Descricao                 |
+----------------+--------+---------------------------+
| id             | uuid   | PK                        |
| user_id        | uuid   | FK para profiles(id)      |
| access_token   | text   | Token do Facebook         |
| ad_account_id  | text   | act_XXXXX                 |
| is_valid       | boolean| Status da conexao         |
| created_at     | timestamptz |                       |
| updated_at     | timestamptz |                       |
+----------------+--------+---------------------------+
```

### Edge Function: `facebook-ads`

Endpoints:
- `GET /facebook-ads?action=test` - Testar conexao
- `GET /facebook-ads?action=campaigns` - Listar campanhas com insights
- `GET /facebook-ads?action=insights&date_preset=last_30d` - Metricas agregadas da conta

### Campos retornados da API do Facebook

- `campaign_name`, `status`, `spend`, `impressions`, `clicks`, `conversions`, `ctr`, `cpc`, `daily_budget`

### Fluxo de autenticacao

```text
Login/Cadastro -> Dashboard (dados mock)
                      |
              Configuracoes -> Salvar Token Facebook
                      |
              Dashboard (dados reais da API)
```

