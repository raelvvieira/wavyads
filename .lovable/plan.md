

## Plan: Página "Google Ads I.A" — 3 Etapas

### Fluxo em 3 etapas

**Etapa 1 — Input**: URL do site + descrição da empresa. Botão "Analisar". Chama a IA (Chamada 0) para extrair dados.

**Etapa 2 — Resumo & Seleção**: Exibe card com empresa, segmento, cidade, diferenciais extraídos. Lista as frentes de anúncio sugeridas com checkboxes. Campo de CTA editável. Botão "Gerar Anúncios" para as frentes selecionadas.

**Etapa 3 — Resultados**: Mostra **uma frente por vez** com tabs/select para alternar. Cada frente tem todas as 14 seções de output (títulos, descrições, keywords, sitelinks, etc.) com contadores de chars, validação, e botões "Copiar". As seções ficam visíveis como placeholders/skeletons enquanto carregam. Geração sequencial: frente a frente, chamadas 1→2→3 para cada.

### Arquivos a criar/editar

| Arquivo | O que faz |
|---------|-----------|
| `supabase/functions/google-ads-ai-gen/index.ts` | Edge function com 4 actions (analyze, titles, descriptions, keywords). Usa Lovable AI Gateway com `google/gemini-2.5-flash`. Tool calling para JSON estruturado. Prompts do arquivo diretriz. |
| `src/hooks/useGoogleAdsAI.ts` | Hook com estado das 3 etapas, mutations para cada chamada, lógica de geração sequencial por frente |
| `src/pages/GoogleAdsAIPage.tsx` | Página principal com layout das 3 etapas lado a lado (desktop) ou empilhadas (mobile). Etapa 3 com select/tabs para alternar entre frentes |
| `src/components/AppSidebar.tsx` | Adicionar item "Google Ads I.A" com ícone `Sparkles`, visível para admins |
| `src/App.tsx` | Adicionar rota `/google-ads-ai` |
| `supabase/config.toml` | Adicionar `[functions.google-ads-ai-gen]` com `verify_jwt = false` |

### Edge Function — 4 actions

Cada action usa system+user prompts do arquivo diretriz, com `tool_choice` para forçar JSON:

- **analyze**: Recebe `{site, descricao}` → retorna `{empresa, segmento, cidade, cta, diferenciais, frentes[]}`
- **titles**: Recebe `{empresa, servico, cidade, diferenciais, cta}` → retorna `{grupo, caminhoExibicao, textoUnico, titulos[15], titulosLongos[5]}`
- **descriptions**: Recebe mesmos params → retorna `{descricoes[5]}`
- **keywords**: Recebe mesmos params + segmento → retorna `{palavrasChave, frasesDestaque, snippets, negativasEspecificas, negativasGlobais, temasIndicadores, segmentoPublico, sitelinks, diretrizes, instrucoesCampanha}`

Rate limit errors (429/402) surfaced via toast.

### UI da Etapa 3

- Select dropdown no topo para escolher qual frente visualizar
- Seções com skeleton enquanto carrega, preenchidas quando pronto
- Cada seção: título, conteúdo, botão "Copiar"
- Tabela de títulos com colunas: #, Texto, Chars, Fixar, Status (✅/❌ baseado no limite)
- Validação client-side: títulos curtos ≤30, longos ≤90, descrições ≤90, sitelink desc ≤35
- Botão "Exportar Tudo" no topo que concatena tudo em texto plano

### Ordem de implementação
1. Edge function `google-ads-ai-gen`
2. Deploy + teste
3. Hook `useGoogleAdsAI`
4. Página `GoogleAdsAIPage.tsx`
5. Sidebar + rota

