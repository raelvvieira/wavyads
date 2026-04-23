

## Diagnóstico

O e-mail de convite para administrador chega normalmente, mas ao clicar em "CRIAR MINHA SENHA" a página `/reset-password` fica eternamente em "Verificando link...".

A causa mais provável é que o **token de recuperação está sendo consumido antes do clique humano**, por scanners de segurança / link preview de provedores de e-mail (Outlook Safe Links, Gmail/Google, antivírus corporativo). Quando o usuário clica de fato, o `token_hash` já não é mais válido, e a chamada `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` nem retorna sucesso nem erro consistente — o `useEffect` da página fica travado em "Verificando link..." até o timeout de 15s, e em alguns casos nem o erro aparece direito.

Hoje o fluxo é:

```text
Email → link direto com ?token_hash=...&type=recovery → /reset-password
       (qualquer pré-fetch do link queima o token de uso único)
```

O fluxo de cliente tem o mesmo problema potencialmente, mas pode estar funcionando por sorte (cliente de e-mail diferente, sem scanner). A correção precisa valer para os dois fluxos.

## Solução

Trocar o link do e-mail para um **link "tolerante a pré-fetch"**: o token só é consumido quando o usuário realmente envia o formulário, não no momento em que a página abre.

### Mudanças

**1. `supabase/functions/invite-admin/index.ts` e `supabase/functions/invite-client/index.ts`**

- Continuar gerando o `hashed_token` via `auth.admin.generateLink({ type: 'recovery' })`.
- No e-mail, mandar o link para `/reset-password?token_hash=...&type=invite&email=...` (parâmetro `type=invite` para o front saber que é primeiro acesso).
- Manter `redirectTo` apontando para `dashboard.wavydigital.com.br/reset-password`.

**2. `src/pages/ResetPasswordPage.tsx`**

- Remover a chamada automática a `verifyOtp` no `useEffect`.
- Em vez disso: ao abrir a página, **não** consumir o token. Apenas ler `token_hash`, `type` e `email` da URL e mostrar o formulário de "Definir senha" imediatamente.
- Quando o usuário clicar em "Definir senha":
  1. Chamar `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` — isso autentica a sessão.
  2. Se sucesso: chamar `supabase.auth.updateUser({ password })`.
  3. Em caso de erro do `verifyOtp` ("token expired/invalid"), mostrar mensagem clara com botão "Reenviar link" que leva para `/login` → "Esqueci minha senha".
  4. Em caso de sucesso: redirecionar para `/dashboard`.
- Manter compatibilidade com o fluxo antigo de "esqueci minha senha" (quando o Supabase já entregou a sessão via hash fragment): se já existe sessão ao abrir a página, pular o `verifyOtp` e ir direto para `updateUser`.
- Mostrar o e-mail do convite como hint (somente leitura) no topo do formulário, para o admin saber qual conta está criando senha.

**3. Mensagens e UX**

- Remover o spinner "Verificando link..." (não há mais verificação no carregamento).
- Texto do botão: "Definir senha e entrar".
- Após sucesso, toast "Senha definida! Redirecionando..." e `navigate('/dashboard')`.

### Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/invite-admin/index.ts` | Adicionar `type=invite` e `email` na URL do link |
| `supabase/functions/invite-client/index.ts` | Mesmo ajuste para consistência |
| `src/pages/ResetPasswordPage.tsx` | Não consumir token no load; consumir só no submit; mostrar formulário imediatamente |

### Resultado esperado

- Pré-fetch de scanners de e-mail não invalida mais o token (a página não chama `verifyOtp` ao carregar).
- Admin clica no e-mail → vê o formulário de senha na hora → define senha → cai logado em `/dashboard` com permissão de admin já gravada na base.
- Mesmo benefício para o fluxo de cliente.

### Como testar

1. Convide um novo admin pelo painel.
2. Abra o e-mail e clique em "CRIAR MINHA SENHA".
3. O formulário deve aparecer imediatamente (sem spinner de verificação).
4. Defina a senha e confirme — deve cair direto no dashboard.
5. Faça logout e logue novamente com email + senha para validar persistência.
6. Repetir o teste para um cliente novo.

