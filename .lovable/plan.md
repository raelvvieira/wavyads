# Social Mídia Studio

Nova página exclusiva para admins, adicionada à seção **Gestão WAVY** da sidebar, entre **Criativo Studio** e **Configurações**. Ícone: `PlayCircle` (lucide).

## Arquitetura

- Rota: `/social-midia-studio` em `src/App.tsx`, protegida por `ProtectedRoute` + checagem `isAdmin` (mesmo padrão das demais páginas admin).
- Página: `src/pages/SocialMidiaStudioPage.tsx`.
- Componentes novos em `src/components/social/`:
  - `SocialStepIndicator.tsx` (reaproveita visual do `criativo/StepIndicator.tsx`).
  - `MyBaseSidebar.tsx` (lista de perfis salvos em `localStorage`).
  - `ViralSourcePicker.tsx` (4 cards de fonte).
  - `ViralResultsList.tsx` (cards de posts retornados).
- Hook: `src/hooks/useViralScraper.ts` (chama Apify, normaliza resposta).
- Estado do pipeline: contexto local `SocialStudioContext` dentro da página (não precisa global agora), com shape:
  ```ts
  { etapa_atual, post_viral, briefing, formato, copy, imagens, template }
  ```

## Stepper (topo)

6 etapas horizontais, mesmo visual do Criativo Studio:
1. Scraper
2. Pesquisa
3. Formato
4. Copy
5. Imagens
6. Design

Estado ativo em verde `#1ACD8A`, concluídas com checkmark, futuras com opacidade baixa. Etapas anteriores são clicáveis para voltar.

## Etapa 1 — Viral Scraper (funcional)

**Layout em duas colunas dentro do painel da etapa:**

- **Coluna esquerda (280px)** — `MyBaseSidebar`:
  - Header "Minha Base" + botão `+`.
  - Lista de @perfis (máx 10), cada item com ícone de lixeira.
  - Persistido em `localStorage` (chave `wavy:social:base`).
  - Seed inicial (na primeira visita): `@brmetaverso, @noevarner.ai, @kylewhitrow, @paidotrafego, @pedrosobral, @caduneiva, @g4.business, @v4company, @nateherkai, @oreidotrafego`.

- **Coluna direita (flex-1)**:
  - 4 cards de fonte (grid 2x2 no desktop, 1 col mobile):
    - 📋 Minha Base
    - 🔍 Por Tema → revela `<Input>` para tema/hashtag.
    - 🔗 Link Direto → revela `<Input>` para URL.
    - 🔥 Top Viral Geral
  - Botão verde **"Buscar Virais"** com loading state.
  - Abaixo: `ViralResultsList` com cards (@username, badge tipo, views, likes, trecho da legenda 120 chars, botão "Usar como referência →").

## Integração Apify (frontend direto)

Hook `useViralScraper` faz `fetch` direto para Apify, usando `import.meta.env.VITE_APIFY_TOKEN`.

Endpoint base:
```
https://api.apify.com/v2/acts/{actor}/run-sync-get-dataset-items?token={VITE_APIFY_TOKEN}
```

Mapeamento por fonte:
- **Minha Base** → actor `apify~instagram-post-scraper`, body `{ username: [...perfis], resultsLimit: 10, onlyPostsNewerThan: "5 days" }`.
- **Por Tema** → actor `apify~instagram-hashtag-scraper`, body `{ hashtags: [tema], resultsLimit: 10 }`.
- **Link Direto** → actor `apify~instagram-post-scraper`, body `{ directUrls: [url], resultsLimit: 10 }`.
- **Top Viral Geral** → mesma chamada da Base com lista default + `resultsLimit: 20` e ordenação por views desc client-side.

Resposta normalizada para cards:
```ts
{ id, username, type: 'Reel'|'Carrossel'|'Post', views, likes, caption, url, thumbnail }
```

Erros (token inválido, rate limit) viram toast destrutivo.

## Avanço de etapa

Ao clicar **"Usar como referência →"** em um post:
- Salva `post_viral` no estado.
- Marca etapa 1 como concluída.
- Avança para etapa 2.

## Etapas 2–6 (placeholders)

Cada uma renderiza um `GlassCard` centralizado com o título da etapa e badge **"Em breve"**. Sem lógica adicional.

## Token Apify

Precisa do secret/env `VITE_APIFY_TOKEN`. Como é `VITE_*`, fica exposto no bundle do frontend — o usuário deve confirmar se aceita esse trade-off (o spec pediu "sem backend, todas as chamadas direto do frontend"). Vou pedir o token via `add_secret` no início da implementação e mostrar como configurá-lo como variável `VITE_APIFY_TOKEN` no `.env` (ou similar) — Lovable secrets não expõe `VITE_*` automaticamente ao client, então pode ser necessário um pequeno edge function proxy. **Confirmar com o usuário antes de implementar:** chamada 100% client com token público OU proxy via edge function simples (sem persistência) para esconder o token.

## Sidebar

Em `src/components/AppSidebar.tsx`, adicionar item no array `adminItems`:
```ts
{ to: '/social-midia-studio', icon: PlayCircle, label: 'Social Mídia Studio', show: isAdmin }
```
posicionado entre Criativo Studio e Configurações.

## Estilo

100% tokens existentes: `glass`, `accent` (#1ACD8A), `text-white/70`, bordas `white/10`, fonte SF Pro Display. Mobile: `pt-20 lg:pt-6` no container raiz, conforme regra do projeto.

## Entregáveis desta iteração

- Sidebar atualizada + rota.
- Página com stepper + Etapa 1 totalmente funcional (Apify real).
- Etapas 2–6 com placeholders.
- Persistência de "Minha Base" em localStorage.
