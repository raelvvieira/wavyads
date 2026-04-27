# Reenviar email de acesso para admin existente

## Objetivo

Permitir que, na aba **Configurações → Acessos**, cada admin já cadastrado tenha um botão "Reenviar email" para gerar um novo link de criação de senha e enviar novamente o email de boas-vindas. Útil quando o admin perdeu o email original, o link expirou, ou precisa redefinir o acesso.

## Como funciona hoje

- `invite-admin` cria o usuário no Auth, atribui role `admin`, gera um link de recovery e envia o email via Resend.
- O link enviado é um `recovery` link gerado por `generateLink({ type: 'recovery' })`, que leva a `/reset-password`.
- A lista de admins é exibida em `SettingsPage.tsx` na aba "Acessos", mas hoje cada item só mostra nome, email e data — sem ações.

## Solução

### 1. Nova Edge Function: `resend-admin-invite`

Função que reaproveita ~80% do `invite-admin`, mas:
- **NÃO** cria usuário novo (espera que ele já exista).
- Verifica se o chamador é admin (mesma checagem de `invite-admin`).
- Recebe `{ email, name }` no body.
- Confirma que o destinatário existe em `auth.users` e tem role `admin` em `user_roles` (segurança: só reenvia para quem já é admin de fato).
- Gera novo recovery link via `adminClient.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: 'https://dashboard.wavydigital.com.br/reset-password' } })`.
- Envia o mesmo email HTML do `invite-admin` via Resend (mesma identidade visual, mesmo botão "CRIAR MINHA SENHA"), mas com o assunto ajustado para indicar que é um reenvio: `"Novo link de acesso — Wavy Dashboard"`.
- Reusa `RESEND_API_KEY` que já está configurada.

### 2. UI em `SettingsPage.tsx` — aba "Acessos"

Em cada card da lista de **Administradores**, adicionar um botão discreto à direita (antes da data ou abaixo dela em mobile) com ícone `Mail` (lucide-react) e label **"Reenviar email"**:

- Estado `resendingId: string | null` para indicar qual linha está em loading (mostra `Loader2` no lugar do ícone).
- Diálogo de confirmação simples (`window.confirm` ou `AlertDialog` do shadcn) antes do disparo: *"Deseja reenviar o email de criação de senha para {email}? O link anterior será invalidado."*
- Ao confirmar, chama `supabase.functions.invoke('resend-admin-invite', { body: { email, name } })`.
- Toast de sucesso: *"Email reenviado para {email}"*.
- Toast de erro descritivo se falhar.
- Manter a lista igual; nenhum refetch necessário (não muda dados persistidos).

### 3. Considerações de segurança

- A função verifica role de admin do **chamador** (mesmo padrão de `invite-admin`).
- Verifica que o **destinatário** já é admin antes de gerar o link, impedindo escalada de privilégio caso alguém manipule o body.
- O `generateLink` do Supabase invalida automaticamente links anteriores do mesmo tipo, então o link antigo deixa de funcionar — comportamento desejado.

## Arquivos afetados

- **Novo**: `supabase/functions/resend-admin-invite/index.ts` (deploy automático)
- **Editado**: `src/pages/SettingsPage.tsx` (botão na lista de admins + handler)

## Fora de escopo

- Reenvio para clientes (existe fluxo análogo via `invite-client` — pode ser feito em próxima iteração se solicitado).
- Não altera o `invite-admin` original.
- Não cria novas tabelas nem migrations.
