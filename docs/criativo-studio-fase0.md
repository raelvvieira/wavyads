# Criativo Studio V2 — Fase 0: baseline e proteção

Diagnóstico exigido pela Fase 0 do plano. **Nenhum comportamento de produção
foi alterado.** O que entrou: feature flag, testes de caracterização e este
documento.

O descritivo completo da página está em [`criativo-studio.md`](./criativo-studio.md).

---

## 1. Baseline registrado

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | limpo |
| `npx vitest run` | 47 testes, 8 arquivos — passando |
| `npm run build` | ok, ~18s |
| `npm run lint` | **381 problemas (359 erros, 22 avisos)** |

**O lint não serve como portão.** Ele já falha amplamente antes de qualquer
mudança: 345 dos 359 erros são `@typescript-eslint/no-explicit-any`, dos quais
81 estão no próprio `CriativoStudioPage.tsx`. Tratar "lint limpo" como critério
de saída obrigaria a uma limpeza de 345 tipagens sem relação com a
reformulação.

Recomendação: adotar lint **incremental** — falhar apenas em arquivos novos ou
tocados pela fase — e registrar a dívida de `any` como trabalho separado.

Duas violações de `react-hooks/rules-of-hooks` existem em
`SocialMidiaStudioPage.tsx`, fora do escopo desta reformulação.

---

## 2. Inventário de estado

99 chamadas de `useState` no componente. Agrupadas por domínio:

| Domínio | Nº | Exemplos |
|---|---|---|
| Projeto e persistência | 8 | `currentProjectId`, `projectTitle`, `savingProject`, `autoSaveEnabled`, `lastSavedAt`, `projectHistory` |
| Navegação de UI | 4 | `step`, `currentStage`, `rightPanelMode`, `advancedOpen` |
| Conversa | 2 | `conversationMessages`, `initialPrompt` |
| Configuração de geração | 5 | `selectedResolution`, `selectedAspectRatio`, `model`, `language`, `preserveFaces` |
| Referências e análise | 8 | `refImages`, `analysis`, `editedDoc`, `referenceAssets`, `referenceClientFilter` |
| Copy | 8 | `rawCopy`, `copyVariations`, `selectedVariationIdx`, `copyApproved`, `copySource` |
| Assets de entrada | 4 | `logoImage`, `productImages`, `uploadClientId` |
| Templates | 11 | `templates`, `selectedTemplate`, `templateForm`, `builtinTemplates`, `templateSource` |
| Artes produzidas | 6 | `storyImage`, `squareImage`, `mainStoryAssetId`, `mainSquareAssetId`, `assetSquares` |
| Fator Criativo | 9 | `factorVariations`, `factorImages`, `factorAssetIds`, `factorErrors`, `factorProgress` |
| Edição | 5 | `editedVersions`, `editPanelKey`, `editFeedback`, `editLoadingKey` |
| Cliente e inteligência | 9 | `selectedClientId`, `clientCopyBank`, `clientIntelligenceArts`, `assetSavedKeys` |
| Criativo Rápido | 5 | `quickCreativeOpen`, `quickCreativeTrigger`, `quickCreativePendingGenerate` |
| Flags de carregamento | ~15 | `generating`, `analyzing`, `improving`, `suggestingCopy`, `contextLoading`… |

**Leitura para a Fase 1:** os grupos "Configuração de geração", "Copy",
"Fator" e "Edição" são coesos e extraíveis quase sem acoplamento. As ~15
flags de carregamento são o maior ganho de simplificação — quase todas seguem
o padrão `x` / `setX(true)` / `setX(false)` em volta de um `await` e podem
virar um único registro de operações em andamento.

---

## 3. Combinações de estado realmente usadas

Os dois enums parecem livres, mas o código só produz estas combinações:

| Etapa | Painéis abertos junto |
|---|---|
| `initial` | `none` |
| `references` | `none`, `upload-references`, `reference-library` |
| `reference-review` | `design-system` |
| `copy` | `none`, `paste-copy`, `read-url`, `copy-suggestions`, `design-system`, `template-applied` |
| `assets` | `none`, `assets`, `avatar-library`, `copy-suggestions` |
| `generation-summary` | `none`, `generation-summary` |
| `result` | `generated-result`, `asset-actions`, `generation-summary` |
| `factor` | `creative-factor` |
| `editing` | `edit-image` |

Quatro painéis são **globais** — abrem de qualquer etapa e não alteram a
etapa: `project-history`, `template-library`, `template-detail`,
`save-template`.

**Consequência para o novo modelo:** existe um contrato implícito. O
`RightWorkspaceMode` proposto no plano (`closed | copilot | inspector`) cobre
bem `asset-actions`, `generated-result` e `creative-factor`, mas os quatro
globais são **overlays**, não workspace lateral — devem virar sheets/dialogs,
não estados do painel direito.

---

## 4. Defeitos encontrados na caracterização

Três defeitos reais, todos anteriores a este trabalho, todos travados por
teste. **Nenhum foi corrigido nesta fase** — corrigir é mudança de
comportamento e pertence à Fase 1.

### 4.1 A linhagem quebra ao restaurar um projeto — alto impacto

`mainStoryAssetId`, `mainSquareAssetId`, `factorAssetIds` e
`factorSquareAssetIds` **não entram no snapshot** e não são repostos na
restauração. `editedVersions` entra (com seus `assetId`), os outros não.

Depois de restaurar um projeto salvo:

- editar a arte principal cria um asset com `parent_asset_id: null` — órfão,
  raiz de uma árvore nova;
- o Fator Criativo cria o grupo sem pai;
- o 1080 da principal perde o vínculo;
- salvar como inteligência do cliente não encontra os IDs.

Isso ataca diretamente o critério de aceite do plano *"Parent e root lineage
permanecem corretos"*. Como o snapshot guarda apenas as URLs, a correção
precisa gravar também os IDs — e, para projetos já salvos, reconciliar por URL
contra `creative_assets`.

### 4.2 `step`, `model` e `language` são gravados e nunca repostos

O snapshot grava os três; `restoreProjectState` não repõe nenhum.
`language` é o **idioma do texto dentro da arte**: um projeto salvo em inglês
volta como pt-BR sem aviso, e a próxima geração sai no idioma errado.

### 4.3 Edição e Fator Criativo sem timeout

`criativo-generate` recebeu `timeout: 90_000` depois de a página travar numa
geração perdida. `criativo-edit-image` e `criativo-fator` ficaram de fora e
podem pendurar a interface indefinidamente.

---

## 5. Riscos de regressão da reformulação

| Risco | Por que é provável | Mitigação |
|---|---|---|
| Perda de campo do snapshot | 35 campos montados à mão; nada valida | Teste de caracterização trava a lista |
| Painel global virar estado de etapa | O plano propõe 3 modos onde hoje há 19 | Matriz da §3 documenta os 4 globais |
| Linhagem órfã | Já quebra hoje na restauração | §4.1 precisa ser corrigido **antes** do canvas mostrar linhagem |
| `assetSquares` por key | Keys se repetem entre projetos | Já limpo no reset; preservar no novo modelo |
| Caminho especial do resize de arte editada | Fácil de "simplificar" e perder a edição | Teste trava `aspectReference: asset.url` |
| Contabilidade de IA | `recordAiUsage` usa `model`, que não é o modelo real | Fase 7; não tocar antes |
| Prompt montado no cliente | Snapshot de prompt existe, mas a montagem é frágil | Testes golden já existem em `promptBuilder.test.ts` |

---

## 6. O que entrou nesta fase

```
src/features/creative-studio/config/featureFlags.ts        flag creativeStudioCanvasV2
src/features/creative-studio/config/featureFlags.test.ts   7 testes de precedência
src/features/creative-studio/__characterization__.test.ts  13 testes de caracterização
docs/criativo-studio-fase0.md                              este documento
docs/criativo-studio.md                                    descritivo completo
```

### Feature flag

Precedência, da mais forte para a mais fraca:

1. `?studioV2=on|off` na URL — rollback imediato por link
2. `localStorage['wavy-studio-v2']` — escolha que persiste no aparelho
3. `VITE_STUDIO_CANVAS_V2` no build — padrão do ambiente

Padrão **desligado**. Enquanto a V2 não cumprir os critérios de aceite, quem
não pediu continua no fluxo que funciona.

### Sobre os testes de caracterização

São de nível de código-fonte, não de comportamento, porque tudo relevante
ainda vive dentro do componente sem interface exportada. Isso é uma limitação
consciente, não uma escolha de estilo: testes de fluxo exigiriam mockar
Supabase, Storage e oito edge functions antes de existir qualquer módulo para
testar.

Conforme a Fase 1 extrair módulos, **cada bloco deve ser substituído por teste
de comportamento do módulo correspondente — não apagado.**

Dois deles caracterizam defeito, não acerto (§4.2 e §4.3). Ao corrigir, eles
falham de propósito, obrigando a atualização deliberada.

---

## 7. Cobertura visual — limitação honesta

Não há screenshot de baseline da página real. `/criativo-studio` exige sessão
autenticada e papel de admin, e este ambiente não tem credenciais. O que foi
possível verificar em navegador foi o *shell* (ilha, tema, âncora do
alternador) por meio de uma rota de preview temporária.

Para a comparação visual que a Fase 8 exige, é preciso uma destas opções:

1. um usuário de teste com sessão semeada no ambiente de CI;
2. um harness que monte a página com hooks de dados mockados;
3. captura manual pelo time antes de ligar a flag.

Registrado como dependência, não como item concluído.

---

## 8. Sequência de commits proposta para a Fase 1

Cada passo isolado, com testes rodando entre eles:

1. **Corrigir os três defeitos da §4** — antes de qualquer extração, para não
   carregar bug para dentro da estrutura nova. Atualiza os testes que os
   caracterizam.
2. `useProjectPersistence` — snapshot, autosave, restauração, histórico.
   É o domínio mais isolado e o de maior risco de perda silenciosa.
3. `useGenerationSettings` — formato, resolução, modelo, idioma, faces.
4. `useCopyWorkflow` — as três origens de copy e a aprovação.
5. `useCreativeAssets` (página) — artes, IDs, `assetSquares`, `editedVersions`.
6. `useFactorCriativo` — as cinco variações, progresso e erro por item.
7. `useStudioOperations` — substitui as ~15 flags de carregamento por um
   registro único de operações em andamento.
8. Dispatcher tipado de ações da conversa, com adaptador para as strings
   antigas.

Critério de saída da Fase 1: `CriativoStudioPage.tsx` abaixo de ~1.500 linhas,
diff visual nulo, os 13 testes de caracterização substituídos por testes de
comportamento equivalentes.
