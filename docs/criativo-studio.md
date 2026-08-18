# Criativo Studio — descritivo técnico e de UX

Documento de contexto para trabalhar na melhoria da página. Descreve o que
existe hoje: a experiência, as ferramentas, a arquitetura de código, os fluxos
internos, o modelo de dados e os pontos frágeis conhecidos.

Referência do código: `src/pages/CriativoStudioPage.tsx` (4.101 linhas) mais o
módulo `src/features/creative-studio/`.

---

## 1. O que a página é

Uma ferramenta de criação de criativos publicitários estáticos para Meta Ads,
guiada por conversa. O usuário descreve o que quer, o sistema conduz por
referências visuais, copy e assets, gera a arte por IA, e a partir dela oferece
edição, variações estratégicas e reenquadramento.

- **Rota:** `/criativo-studio`
- **Acesso:** somente admin. `useRole()` redireciona para `/dashboard` quando
  `!roleLoading && !isAdmin`.
- **Shell:** vive dentro de `DashboardLayout` — ilha de navegação flutuante à
  esquerda, alternador de tema no canto superior direito.

---

## 2. Arquitetura de UX

### 2.1 Layout

Duas colunas em grid CSS:

```
lg:grid-cols-[minmax(0,1fr)_420px]
xl:grid-cols-[minmax(0,1fr)_460px]
```

- **Coluna principal (esquerda):** `max-w-4xl` centralizado. Contém a barra
  utilitária, o compositor, a conversa e o quadro de artes.
- **Painel contextual (direita):** largura fixa. Muda de conteúdo conforme a
  ação escolhida na conversa. É onde toda configuração acontece.

Abaixo de `lg` o grid vira uma coluna só e o painel desce.

### 2.2 O modelo de dois eixos

A interface é governada por **duas máquinas de estado independentes**, e
entender isso é a chave para mexer na página:

**`currentStage`** — onde o usuário está no processo. 9 valores:

```
initial → references → reference-review → copy → assets
        → generation-summary → result → factor → editing
```

Controla o que a coluna principal mostra e quais sugestões a conversa oferece.

**`rightPanelMode`** — o que o painel direito está exibindo. 19 valores:

```
none | upload-references | reference-library | design-system | paste-copy
| copy-suggestions | read-url | assets | avatar-library | generation-summary
| generated-result | creative-factor | asset-actions | edit-image
| project-history | template-library | template-detail | save-template
| template-applied
```

Os dois **não são acoplados**: uma mesma etapa pode ter vários painéis, e um
painel pode ser aberto fora da etapa "natural". Isso dá liberdade, mas é
também a principal fonte de complexidade — não existe uma tabela declarando
quais combinações são válidas.

### 2.3 A conversa

Não é um chat com LLM. É uma **narrativa scriptada** que serve de trilho.

```ts
type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  actions?: ConversationAction[];  // botões
};

type ConversationAction = {
  label: string;
  action: string;                            // string livre, roteada em switch
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
};
```

- `addAssistantMessage(texto, ações)` e `addUserMessage(texto)` empilham em
  `conversationMessages`.
- `handleQuickAction(action)` é um `switch` de 25 casos que abre painéis,
  troca de etapa ou dispara fluxos.
- `getNextStepSuggestions()` decide o que sugerir com base no estado real
  (tem análise? copy aprovada? assets?), não na etapa.

**Implicação para melhorias:** adicionar um passo significa mexer em três
lugares — o `switch`, o enum de painel, e `getNextStepSuggestions`.

### 2.4 O compositor

Bloco de entrada na etapa `initial` (e uma barra equivalente depois dela):

| Controle | O que faz |
|---|---|
| Textarea | `initialPrompt` — descrição livre do criativo |
| Select de cliente | Vincula o projeto a um cliente; habilita Criativo Rápido e Inteligência do cliente |
| Criativo Rápido | Só aparece com cliente selecionado. Atalho que pula o fluxo |
| `GPT Image 2` | **Rótulo estático.** Não é seletor — o modelo de imagem é fixo na edge function |
| Resolução | `1K` / `2K` / `4K` — vira texto de qualidade no prompt, não parâmetro real |
| Formato | 9 opções (`1:1`, `4:5`, `9:16`, `16:9`, `4:3`, `3:4`, `2:3`, `3:2`, `21:9`). Padrão `4:5` |
| Produto / Avatar / Template | Abrem painéis de asset e de template |
| Iniciar | `startConversation()` |

Nota: existe `MODEL_OPTIONS` com três modelos Gemini em `formats.ts` e um
estado `model`, mas a geração de imagem passa por `criativo-generate`, que usa
`gpt-image-2` fixo. O `model` só é usado para **contabilizar custo** em
`recordAiUsage`.

---

## 3. Ferramentas disponíveis

### 3.1 Referências visuais → design system

- Upload de imagens (`ImageDropzone`) ou escolha da biblioteca de referências
  já salvas, filtrável por cliente.
- `analyzeRefs()` chama `criativo-analyze-refs`, que devolve um objeto
  `VisualAnalysis` estruturado: composição, fotografia, paleta (com hexes),
  tipografia, camadas, hierarquia, espaço, mood (adjetivos/referências/evita),
  antipadrões e um **`designSystemDoc`** em texto.
- O `designSystemDoc` fica editável (`editedDoc`) e é injetado no prompt final.

### 3.2 Copy

Três caminhos, mutuamente exclusivos via `copySource`:

- **`ai`** — `generateSuggestedCopy()` → `criativo-suggest-copy` devolve 4
  variações estruturadas (`label`, `titulo`, `subtitulo`, `dados`, `cta`) com
  ângulo e autoavaliação. O usuário escolhe uma (`selectedVariationIdx`).
- **`original`** — o usuário cola a copy pronta (`rawCopy`).
- **melhoria** — `improveCopy()` → `criativo-improve-copy` reescreve a copy
  colada.

Apoio: `fetchProductUrl()` → `criativo-fetch-url` lê uma URL de produto e
extrai contexto; `generateBusinessContext()` → `criativo-business-context`
sintetiza o contexto de negócio.

### 3.3 Assets

- Logo (1 imagem), produtos/pessoas, avatar. A UI não impõe teto; o corte de
  14 imagens acontece no `criativo-generate`.
- `preserveFaces` liga a instrução de preservar rostos.
- Uploads viram assets persistidos no Storage e registrados em
  `creative_assets` com `type` de origem (`logo`, `product`, `avatar`,
  `reference`).

### 3.4 Templates

- Biblioteca em `creative_templates` mais templates embutidos
  (`fetchBuiltinTemplates`).
- `applyTemplate()` injeta de uma vez: formato, resolução, design system,
  negative prompt, estrutura de layout e (quando existe) a análise visual.
- `saveTemplate()` faz o caminho inverso — extrai
  `buildLayoutStructureFromCurrentCreative`, `buildCopyStructureFromCurrentCreative`
  e `buildStyleMetadataFromCurrentCreative` do criativo atual.
- Suporta duplicar e arquivar.

### 3.5 Geração e derivações

| Ação | Função | O que produz |
|---|---|---|
| Gerar arte | `generate('story')` | Arte principal no formato escolhido |
| Versão 1080 | `recreateSquare('main' \| índice)` | Quadrado da principal ou de uma variação do Fator |
| Versão 1080 de arte editada | `recreateSquareFromAsset(asset)` | Quadrado a partir da própria arte editada |
| Editar com IA | `editArt()` | Nova versão com o ajuste pedido |
| Fator Criativo | `applyFatorCriativo()` | 5 variações estratégicas |

### 3.6 Fator Criativo

Gera 5 variações, uma por eixo: **emocional, oferta, persona, hook,
estrutura**. Cada uma muda a copy inteira e a direção visual, não só a cor.
Roda as 5 gerações em paralelo (`Promise.all`), com progresso e erro
individual por variação. Pode ser reaplicado a partir de qualquer arte do
quadro, inclusive de uma variação anterior.

### 3.7 Inteligência do cliente e Criativo Rápido

- `saveCopyToClientIntelligence()` e `saveArtToClientIntelligence()` marcam
  copy e arte como reaproveitáveis (`client_copy_bank`, e
  `creative_assets.is_client_intelligence`).
- `openQuickCreative()` carrega esse acervo; `runQuickCreative()` monta o
  estado inteiro a partir de uma copy e uma arte de referência e gera direto,
  pulando todo o fluxo guiado.

### 3.8 Projetos

- Autosave com debounce de **2200ms** sobre um snapshot de ~35 campos
  (`buildProjectStateSnapshot`), gravado em `creative_project_state.state_json`.
- Histórico com restauração (`loadCreativeProject` → `restoreProjectState`),
  duplicação e arquivamento.
- Thumbnail do histórico ignora `data:` URI de propósito (evita carregar base64
  gigante na listagem).

---

## 4. Camada de dados

### 4.1 Tabelas

| Tabela | Papel |
|---|---|
| `creative_projects` | Um projeto por sessão de criação. Título, prompt inicial, etapa, formato, thumbnail |
| `creative_project_state` | Snapshot completo do estado em `state_json`, 1:1 com o projeto |
| `creative_assets` | **Toda imagem** — insumo e arte produzida |
| `creative_asset_groups` | Agrupa um lote (ex.: as 5 do Fator) |
| `creative_templates` | Templates salvos |
| `creative_copy_variations` | Variações de copy geradas |
| `client_copy_bank` | Copy marcada como inteligência do cliente |
| `clients` | Cliente vinculado |

### 4.2 O modelo de linhagem

É o conceito central do domínio:

> Toda imagem é um `CreativeAsset`, e **toda transformação cria outro asset**
> ligado ao anterior por `parent_asset_id`. Nada é sobrescrito.

```ts
type CreativeAssetType =
  | 'reference' | 'logo' | 'product' | 'avatar' | 'template'   // insumos
  | 'original' | 'factor' | 'edited' | 'resize' | 'imported';  // artes

type CreativeAssetStatus = 'queued' | 'generating' | 'ready' | 'failed';
type FactorAxis = 'emotional' | 'offer' | 'persona' | 'hook' | 'structure';
```

- `root_asset_id` é derivado por **trigger no banco**, nunca informado pelo
  cliente.
- O vocabulário de `type` tem um **CHECK constraint** correspondente: mudar um
  sem o outro faz a gravação falhar.
- `persistImageAsset()` é o ponto único que sobe a imagem para o Storage e
  grava o registro com linhagem.

---

## 5. Backend (Supabase Edge Functions, Deno)

| Função | Modelo | Papel |
|---|---|---|
| `criativo-generate` | **`gpt-image-2` via EvoLink** | Gera a imagem |
| `criativo-edit-image` | `gemini-3-flash-preview` monta a instrução; **`gemini-3.1-flash-image-preview` gera** | Edita imagem existente |
| `criativo-fator` | `gemini-2.5-pro` | Gera as 5 variações estratégicas |
| `criativo-analyze-refs` | `gemini-2.5-pro` | Extrai design system das referências |
| `criativo-suggest-copy` | `gemini-2.5-flash` | 4 variações de copy |
| `criativo-improve-copy` | `gemini-2.5-flash` | Reescreve copy colada |
| `criativo-business-context` | `gemini-3-flash-preview` | Sintetiza contexto de negócio |
| `criativo-fetch-url` | — (fetch puro) | Lê página de produto |

Segredos: `GEMINI_API_KEY`, `EVOLINK_API_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`.

**Detalhe importante: gerar e editar usam provedores diferentes.** A geração vai
para o EvoLink (`gpt-image-2`); a edição vai direto para a API do Gemini
(`gemini-3.1-flash-image-preview`), depois de um passo em que outro modelo
converte o pedido do usuário numa instrução cirúrgica. Isso significa que a
arte editada não sai do mesmo motor que a original — é uma das causas de
divergência de estilo entre as duas.

Todas as chamadas do cliente usam `timeout: 90_000` e passam o erro por
`extractFunctionErrorMessage` — sem isso, qualquer falha aparece como
`Edge Function returned a non-2xx status code`.

---

## 6. O pipeline de prompt

O prompt final é montado **no cliente**, por
`buildCreativePrompt()` (`features/creative-studio/lib/promptBuilder.ts`), em
blocos nomeados:

```
[INTRODUCTION]      formato, dimensões, contexto de negócio, alvo de qualidade
[DESIGN SYSTEM]     designSystemDoc editável
[TEMPLATE STRUCTURE] (quando há template) layout, explicitamente só estilo
[SAFE ZONE]         ver abaixo
[TEXT BLOCKS]       copy literal, bloco a bloco, com papel tipográfico
[ATTACHED PHOTOS]   quantidade e instrução de preservar rostos
[BRAND LOGO]        presença do logo
[MOOD]              adjetivos e o que evitar
[DO NOT INCLUDE]    negativos + violação de safe area + idioma + artefatos
```

### 6.1 Safe zone

`safeArea.ts` guarda o modelo das zonas seguras da Meta **em porcentagem**, não
em pixel — porque o canvas real que o provedor devolve não é garantido.

- Só `9:16` tem `source: 'meta'` (14% topo, 35% base, 6% laterais, 40% no canto
  inferior direito). Os demais são derivados e marcados como tal.
- `verticalLift()` mede o quanto o centro da área segura fica acima do centro
  do frame (202px no 9:16) — é o número que corrige a composição nascer baixa
  demais.
- `buildSafeZoneBlock(ratio)` monta o bloco. A primeira linha é uma **regra de
  composição** ("estas faixas são fundo vazio"), não uma especificação — modelo
  de imagem obedece muito melhor a isso.
- Distinção central: **a imagem sangra até a borda; só a mensagem** (título,
  texto, logo, CTA) fica presa à área segura.

### 6.2 Coerência de tela

`criativo-generate` recebe `formatRatio` (o formato real) e deriva dele tanto a
linha `OUTPUT FORMAT` quanto o `size` enviado ao provedor. Se o provedor
recusar aquela razão, repete com um valor de fallback.

---

## 7. Fluxos internos, passo a passo

### 7.1 Geração principal

```
startConversation()
  → cria creative_project
  → currentStage = 'references'
[referências → copy → assets, cada um opcional]
  → generate('story')
      prompt = buildCreativePrompt(estado inteiro)
      invoke criativo-generate { prompt, formatRatio, model, productImages, logoImage }
      persistImageAsset({ type: 'original', lineage: sem pai })
      currentStage = 'result', rightPanelMode = 'generated-result'
```

### 7.2 Fator Criativo

```
applyFatorCriativo(base?)
  → invoke criativo-fator { originalPrompt, copy, businessContext, language,
                            aspect, aspectRatio, safeZoneBlock }
  → anexa o bloco de safe zone autoritativo a cada promptCompleto (cinto duplo)
  → cria creative_asset_group { type: 'factor', parentAssetId }
  → Promise.all das 5 gerações, cada uma:
       invoke criativo-generate { prompt: v.promptCompleto, isVariation: true }
       persistImageAsset({ type: 'factor', factorAxis, groupId, parentAssetId })
```

### 7.3 Edição

```
editArt(key, imagem, aspect, promptOriginal)
  → invoke criativo-edit-image { originalImage, userFeedback, originalPrompt,
                                 aspect, aspectRatio, safeZoneBlock }
  → persistImageAsset({ type: 'edited', parentAssetId: assetIdForKey(key) })
  → editedVersions[key].push({ url, feedback, assetId, aspect, prompt })
```

Edições **acumulam** por key; não substituem a origem.

### 7.4 Versão 1080

Dois caminhos, e a diferença importa:

- **Arte principal ou variação do Fator** → `recreateSquare(target)`.
  Reconstrói o prompt da origem e gera de novo, passando `storyReference`.
- **Arte editada** → `recreateSquareFromAsset(asset)`.
  Usa o prompt da arte **mais a própria imagem editada como
  `aspectReference`**. Sem isso o modelo recomporia a cena do zero e a edição
  se perderia — foi por isso que o botão ficou escondido em arte editada
  durante um tempo.

---

## 8. Pontos frágeis conhecidos

Lista honesta do que dificulta a evolução:

1. **Arquivo monolítico.** 4.101 linhas num componente só, com 99 chamadas de `useState`.
   O módulo `features/creative-studio/` já extraiu tipos, constantes, prompt e
   camada de dados — o que sobrou é o componente e os fluxos.

2. **Duas máquinas de estado sem contrato.** `currentStage` e `rightPanelMode`
   não têm uma tabela de combinações válidas. Nada impede um par incoerente.

3. **`model` é decorativo na geração.** O seletor existe e alimenta a
   contabilidade de custo, mas a imagem sai sempre de `gpt-image-2`. O rótulo
   "GPT Image 2" no compositor é estático.

4. **Resolução é texto, não parâmetro.** `1K/2K/4K` viram frases de qualidade
   no prompt.

5. **`promptCompleto` do Fator é texto livre não validado.** Por isso o bloco
   de safe zone é reanexado no cliente depois de receber as variações.

6. **Prompt montado no cliente.** Mudar a estrutura do prompt exige deploy do
   frontend; o servidor não tem a fonte da verdade.

7. **Snapshot grande e frágil.** O autosave serializa ~35 campos incluindo
   imagens. Se o upload ao Storage falhar, `storyImage` pode ser um `data:` URI
   e entra no snapshot.

8. **Uma tela, muitos painéis.** 19 modos de painel num único `switch` de
   render tornam difícil saber o que está coberto.

9. **Sem teste de fluxo.** Existem testes de `safeArea` e `promptBuilder`
   (unitários e snapshot), mas nenhum cobre os fluxos da página.

### 8.1 Já resolvido — não vale repropor

Itens que pareceram problema em algum momento e já foram tratados:

- **Zona segura errada.** O `9:16` declarava 280px de base contra os 672px
  (35%) reais da Meta, e 7 dos 9 formatos não tinham número nenhum. Hoje o
  modelo é percentual e completo.
- **Tela incoerente no pedido.** O `criativo-generate` anunciava "9:16,
  1080x1920" para todo vertical — inclusive o 4:5, que é o padrão. Hoje recebe
  `formatRatio` e deriva tudo dele.
- **Canvas que não batia com o nome.** `16:9` declarava 1200x628 (que é
  1,91:1) e os formatos genéricos declaravam todos 1080x1080. Um teste trava
  isso agora.
- **1080 indisponível em arte editada.** Resolvido com um caminho próprio que
  parte da imagem editada.
- **Erro genérico de edge function.** `extractFunctionErrorMessage` extrai o
  motivo real do corpo da resposta.
- **Tema claro quebrado nesta página.** A raiz cravava `bg-[#0C0C0E]`; havia
  ainda 7 painéis, 17 rótulos laranja e 2 sombras cegas a tema. Um teste
  (`src/lib/themeSafety.test.ts`) varre o chrome por cor escura literal.

---

## 9. Onde estão as coisas

```
src/pages/CriativoStudioPage.tsx           componente único, fluxos e render
src/features/creative-studio/
  types/creative.ts                        modelo de domínio, tipos de asset
  constants/formats.ts                     ASPECT_CONFIG, RESOLUTION_CONFIG, MODEL_OPTIONS
  lib/promptBuilder.ts                     buildCreativePrompt, buildSafeZoneBlock
  lib/safeArea.ts                          zonas seguras da Meta (+ testes)
  api/creativeAssets.ts                    criação de asset com linhagem, grupos
src/components/criativo/
  ImageDropzone.tsx                        upload
  StyleGalleryDialog.tsx                   galeria de estilos embutidos
  QuickCreativeDialog.tsx                  Criativo Rápido
src/lib/functionError.ts                   extração da mensagem real de erro
supabase/functions/criativo-*/             8 edge functions
```
