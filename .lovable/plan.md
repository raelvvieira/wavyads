

# Plan: Customizar Email de Convite para Clientes

## Situação Atual

O convite de clientes usa `resetPasswordForEmail` que envia o email padrão do sistema — em inglês, genérico, sem instruções. Não há domínio de email customizado configurado, e sem isso não é possível usar templates de email personalizados via o sistema de auth email templates.

**Alternativa viável**: Como o usuário disse que não precisa do design da WAVY, podemos enviar o email diretamente pela edge function `invite-client` usando a API de email transacional do Lovable. Isso permite controle total sobre o conteúdo, idioma e formato.

## Abordagem

Modificar a edge function `invite-client` para:

1. Gerar o link de recovery via `generateLink` (que retorna o link sem enviar email)
2. Enviar o email manualmente via a API de email transacional do Lovable, com conteúdo customizado em português

### Conteúdo do Email

- **Assunto**: "BEM-VINDO AO WAVY DASHBOARD!"
- **Corpo** (HTML simples, sem branding elaborado):
  - Saudação: "Olá, {nome}!"
  - Mensagem de boas-vindas
  - Passo a passo:
    1. Clique no botão abaixo para criar sua senha
    2. Defina uma senha segura (mínimo 6 caracteres)
    3. Após criar sua senha, faça login com seu email e senha
    4. Acesse seu dashboard com os dados das suas campanhas
  - Botão: "CRIAR MINHA SENHA" → link de recovery
  - Rodapé: "Se você não esperava este email, pode ignorá-lo."

### Mudanças Técnicas

| Arquivo | Ação |
|---------|------|
| `supabase/functions/invite-client/index.ts` | Modificar — gerar link via `generateLink`, enviar email via fetch para API transacional com HTML customizado em português |

### Detalhes de Implementação

- Usar `generateLink({ type: 'recovery', email })` para obter o `action_link` sem disparar email automático
- Remover a chamada `resetPasswordForEmail` (que envia o email genérico)
- Construir HTML inline simples com o passo a passo
- Enviar via `fetch` para a Lovable email API usando `LOVABLE_API_KEY`

