## Objetivo

A Etapa 3 hoje oferece 5 opções genéricas baseadas só no visual (`carrossel_imagem`, `carrossel_texto`, `carrossel_lista`, `post_unico`, `reel`). A Wavy Copy Skill define 7 padrões com intenção narrativa específica (1A Tutorial, 1B Conflito, 2A Storytelling, 2B Editorial Dark, 3 Reel, 4 Post Frase, 5 Frase Mestre). O prompt do Claude não recebe essa intenção, então a voz Wavy fica diluída. Além disso, o Design usa IDs `1, 2A, 2B, 3, 4` com significado diferente do da Copy, gerando colisão.

A solução é apresentar 5 famílias na UI (cada família agrupando suas variações), passar para a edge function um `pattern_id` igual ao ID da skill, e renomear os templates do Design para usar os mesmos IDs 1-pra-1.

---

## 1. Novo modelo de formato (5 famílias, IDs unificados com a skill)

```text
Família "Carrossel Direto"       → variações: 1A Tutorial, 1B Conflito
Família "Carrossel Narrativo"    → variações: 2A Storytelling, 2B Editorial Dark
Família "Reel"                   → 3 (sem variação)
Família "Post Frase"             → 4 (sem variação)
Família "Frase Mestre"           → 5 (sem variação)
```

Cada card mostra título + descrição curta + emoji. Ao escolher uma família com variação, abre um seletor secundário (2 botões grandes). Sem variação, avança direto.

Para carrosséis, mantém o slider de número de slides (Frase Mestre força entre 6-9, Direto 5-8, Narrativo 6-10).

---

## 2. Tipos e contrato

**`src/types/social.ts`** — novo tipo:
```ts
export type CopyPatternId = "1A" | "1B" | "2A" | "2B" | "3" | "4" | "5";
export type FormatoFamilia = "carrossel_direto" | "carrossel_narrativo" | "reel" | "post_frase" | "frase_mestre";
```
Manter `Formato` antigo como deprecated alias por enquanto (compat com pipelines existentes), mas o código novo passa `pattern_id`.

---

## 3. Etapa 3 — UI

**`FormatPicker.tsx`**: refeito para mostrar 5 cards de família + sub-seletor de variação quando aplicável (1A/1B e 2A/2B). Cada variação ganha descrição vinda direto da skill ("BREAKING + passos executáveis" vs "Vilão + contraste numérico", etc.).

**`FormatStep.tsx`**: passa a enviar `pattern_id` (e `num_slides` quando carrossel) para a edge function. Mantém estado da família selecionada para permitir voltar e trocar variação sem perder briefing.

---

## 4. Edge function `social-copy`

**`index.ts`**:
- Substituir os `mode: carrossel|post_unico|reel` por `mode: "pattern"` + `pattern_id: CopyPatternId`.
- Criar um `buildPatternPrompt(pattern_id, tema, briefing, num_slides)` com 7 ramos, cada um citando explicitamente o trecho da skill correspondente e exigindo a estrutura exata (ex: 1A obriga "BREAKING:" no cover e "Passo X:" nos slides; 1B obriga slide de contraste numérico; 2B obriga cena de filme + analogia; 4 obriga legenda em 5 movimentos; 5 obriga cover duplo tese/antítese).
- Reel mantém estrutura temporal obrigatória (0-3s / 3-15s / 15-35s / 35-50s / 50-60s).
- Saída JSON permanece compatível com `CopyAprovada` (slides|roteiro + legenda + hashtags), mas adiciona `pattern_id` no retorno para o Design saber qual template aplicar.
- Manter rota `mode: "rewrite"` inalterada.

Compat: aceitar `mode` antigo por 1 versão e mapear `carrossel_imagem→2A`, `carrossel_lista→1A`, `carrossel_texto→1B`, `post_unico→4`, `reel→3` (mapeamento provisório só para pipelines salvos).

---

## 5. Etapa 5 — Design (unificação de IDs)

**`templates/shared.ts`**:
- `TemplateId` passa de `"1" | "2A" | "2B" | "3" | "4"` para `"1A" | "1B" | "2A" | "2B" | "3" | "4" | "5"`.
- `templateFromFormato` vira `templateFromPattern(pattern_id)` — função identidade (1A→1A, ...). Mantém override manual.

**Templates**: renomear/criar arquivos para casar 1-pra-1:
- `Template1A.tsx` — Carrossel Tutorial (visual instrucional, cover BREAKING, numeração de passos)
- `Template1B.tsx` — Carrossel Conflito (visual contraste, slide numérico com 2 colunas)
- `Template2A.tsx` — Storytelling Editorial (já existe parcialmente, ajustar para foto editorial real + título conceitual curto)
- `Template2B.tsx` — Editorial Dark Cinema (foto cotidiana + manchete filosófica)
- `Template3.tsx` — Reel preview (storyboard de cenas com tempo)
- `Template4.tsx` — Post Frase (frase forte + fundo)
- `Template5.tsx` — Frase Mestre (cover duplo tese/antítese, ícone central, slide de prova com foto)

Os atuais `Template1`, `Template2A`, `Template2B`, `Template3`, `Template4` serão **renomeados ou refatorados** para a nova grade. Nada de mudança visual gratuita: o que já estava bom é preservado, só vira o ID correto.

**`TemplatePicker.tsx`**: 7 opções com preview. Override manual continua possível.

**`DesignStep.tsx`** e **`SocialMidiaStudioPage.tsx`**: passam `pattern_id` (vindo da Etapa 3) em vez de `formato` para o `templateFromPattern`.

---

## 6. Etapa 4 — Imagens

**`wavyImageStyles.ts` `templateSuffixFromFormato`**: vira `templateSuffixFromPattern(pattern_id)`. Mapeamento direto:
- 1A → `template_1a_step`
- 1B → `template_1b_contrast`
- 2A → `template_2a_editorial`
- 2B → `template_2b_dark`
- 4  → `post_frase_a`
- 5  → `template_5_master`
- 3  → não gera (reel usa storyboard)

`suggestStyle` ganha um segundo input opcional (`pattern_id`) para forçar `editorial_real` em 2A/2B, `objeto_premium` em 1A, `cinematico` em 2B/4, etc.

---

## 7. Compat / migração

Pipelines salvos com `formato` antigo continuam abrindo: um helper `migrateFormatoToPattern` converte na leitura. Nada quebra retroativo.

---

## Arquivos a tocar

Criar: `Template1A.tsx`, `Template1B.tsx`, `Template5.tsx`
Editar: `FormatPicker.tsx`, `FormatStep.tsx`, `social-copy/index.ts`, `templates/shared.ts`, `TemplatePicker.tsx`, `DesignStep.tsx`, `SocialMidiaStudioPage.tsx`, `useSocialProfile.ts`, `wavyImageStyles.ts`, `ImageStep.tsx`, `social/types.ts`
Refatorar (renomear interno): `Template1.tsx`→`Template2A.tsx` (já é editorial), reorganizar mapeamentos. O nome de arquivo final segue a grade da skill.

Sem mudança em banco, sem novos secrets, sem custo extra de API (mesmo modelo Claude, prompt mais específico).
