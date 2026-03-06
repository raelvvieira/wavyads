

# Fluxo de convite de clientes com link para criar senha

## Como vai funcionar

Sim! Em vez de senha temporária, o cliente receberá um **email com um botão "Criar minha senha"**. Ao clicar, ele é redirecionado para uma página onde define sua própria senha. Muito mais seguro e simples.

**Fluxo do ponto de vista do cliente:**
1. Você cadastra o cliente com nome e email no painel admin
2. O cliente recebe um email com um botão **"Criar minha senha"**
3. Ele clica, abre a página de redefinição de senha, define a senha dele
4. Pronto — agora ele pode fazer login normalmente

## Etapas

### 1. Edge Function `invite-client`
Nova função backend que:
- Cria a conta de autenticação do cliente (`auth.admin.createUser` com `email_confirm: true`)
- Insere o role `'client'` na tabela `user_roles`
- Vincula o `user_id` na tabela `clients`
- Gera um link de recuperação de senha (`auth.admin.generateLink({ type: 'recovery' })`) — esse link funciona como "Criar minha senha"
- Envia o email automaticamente (o próprio sistema de auth envia o email de recovery)

### 2. Atualizar criação de cliente no Admin
- `useCreateClient` passa a chamar a edge function `invite-client` em vez de inserir direto no banco
- Após sucesso, exibe confirmação de que o convite foi enviado por email

### 3. Página `/reset-password`
Nova página onde o cliente define sua senha:
- Detecta o token de recovery na URL
- Exibe formulário para digitar nova senha
- Chama `supabase.auth.updateUser({ password })` para salvar

### 4. Login — adicionar "Esqueci minha senha"
- Adicionar link "Esqueci minha senha" na tela de login
- Chama `supabase.auth.resetPasswordForEmail(email)` para reenviar o link
- Remover a opção "Criar conta" (apenas admin cadastra clientes)

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/invite-client/index.ts` | Nova edge function: cria conta, role, link de recovery |
| `supabase/config.toml` | Registrar `invite-client` com `verify_jwt = false` |
| `src/hooks/useClients.ts` | `useCreateClient` chama edge function |
| `src/pages/AdminDashboard.tsx` | Feedback de convite enviado |
| `src/pages/ResetPasswordPage.tsx` | Nova página para definir senha |
| `src/pages/LoginPage.tsx` | Adicionar "Esqueci minha senha", remover "Criar conta" |
| `src/App.tsx` | Adicionar rota `/reset-password` |

