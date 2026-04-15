
Diagnóstico

O problema não é “dar acesso de admin” ao cliente. Pelo código atual, o usuário convidado já recebe role `client` e vínculo em `client_users` antes mesmo do email ser enviado, então o acesso de visualizador ao dashboard já deveria existir nesse momento.

O ponto que ainda está quebrando é o fluxo de autenticação do link do email:
- `invite-client` e `add-client-user` já usam `https://dashboard.wavydigital.com.br/reset-password`
- mesmo assim o usuário ainda cai numa tela do Lovable
- isso indica forte chance de configuração de autenticação/redirect no backend ainda estar apontando para domínio Lovable ou ignorando o `redirectTo` por allowlist/site URL incorreta
- além disso, o frontend ainda tem outros pontos de recuperação de senha com redirect inconsistente

O que vou corrigir

1. Ajustar a configuração de autenticação do projeto
- definir o domínio canônico do app como `https://dashboard.wavydigital.com.br`
- garantir que `https://dashboard.wavydigital.com.br/reset-password` esteja liberado nos redirects de autenticação
- revisar se existe fallback para domínio `*.lovable.app` nesse fluxo

2. Padronizar todos os links de recuperação/senha
- manter `invite-client` com redirect fixo para `https://dashboard.wavydigital.com.br/reset-password`
- manter `add-client-user` com o mesmo redirect fixo
- corrigir também `invite-admin` para não usar fallback Lovable
- corrigir `src/pages/LoginPage.tsx`, porque hoje o “Esqueci minha senha” usa `window.location.origin`, o que pode gerar links errados em preview/editor

3. Fortalecer a página `ResetPasswordPage`
- validar corretamente o fluxo de recuperação vindo do link
- tratar casos em que o token não foi trocado por sessão ainda
- exibir erro claro se o link estiver inválido/expirado
- após salvar a senha, levar o usuário para o fluxo normal do dashboard sem telas estranhas do Lovable

4. Garantir a experiência que você quer para cliente
- o usuário continua sendo apenas `client`, nunca admin
- o acesso ao dashboard continua sendo concedido no momento em que o email é inserido
- a senha vira apenas a etapa de segurança para ativar o login
- depois de criar a senha, o usuário entra normalmente no `dashboard.wavydigital.com.br` e vê apenas os dashboards aos quais foi vinculado

Arquivos/configuração envolvidos

- `supabase/functions/invite-client/index.ts`
- `supabase/functions/add-client-user/index.ts`
- `supabase/functions/invite-admin/index.ts`
- `src/pages/LoginPage.tsx`
- `src/pages/ResetPasswordPage.tsx`
- configuração de autenticação do backend (URL principal + redirects permitidos)

Validação após a correção

1. Convidar um usuário novo para um cliente
2. Abrir o email e clicar em “CRIAR MINHA SENHA”
3. Confirmar que abre `dashboard.wavydigital.com.br/reset-password`
4. Definir a senha
5. Confirmar que o usuário entra no dashboard normal, sem tela do Lovable
6. Confirmar que ele vê apenas os dashboards vinculados a ele
7. Repetir o teste com “Esqueci minha senha” para garantir consistência

Observação importante

Pelo que li do código, o acesso do cliente já está sendo salvo na base antes do envio do email. Então a correção principal é estabilizar o fluxo de autenticação/redirect, não a permissão em si.
