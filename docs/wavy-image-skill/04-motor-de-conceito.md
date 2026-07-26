# Wavy Image Skill — Motor de Conceito / Diretor de Arte (parte 4)

> Especificação do Rael para a camada que **decide O QUE a imagem mostra**, antes de qualquer decisão técnica. Docs 01–03 cobrem o *como renderizar*; este cobre o *o quê e por quê*. É a peça que faltava.

## Princípio-mestre

O motor **não** pergunta "qual imagem combina com essa copy?". Ele pergunta:

> **Qual é a imagem mais forte, específica e inesperada capaz de fazer essa ideia ser compreendida antes mesmo da leitura completa?**

Ele termina o trabalho quando existe um **brief visual preciso**. **Não escreve lente, ISO, grão ou parâmetro técnico** — isso é do motor de renderização.

## Fronteira entre os dois motores (regra de integração)

| Motor de Conceito (este doc) | Motor de Renderização (docs 01–03) |
|---|---|
| mensagem, entidade, ideia, cena, símbolo, twist, composição, narrativa, área de texto, detalhes obrigatórios | enquadramento técnico, câmera, lente, iluminação, profundidade, textura, realismo, color grading, acabamento, formato |

> "The rendering engine may improve visual execution, but it may not change the subject, narrative action, creative twist, factual anchors or composition logic defined by the Art Direction Engine."

## Fluxo

```
COPY + CONTEXTO → LEITURA ESTRATÉGICA → GROUNDING FACTUAL → EXPLORAÇÃO DE CONCEITOS
→ SELEÇÃO DA IDEIA MAIS FORTE → BRIEF VISUAL PRECISO → GERADOR PROFISSIONAL DE PROMPT
```

**Entrada:** copy do post · contexto · público · intenção · entidades citadas · papel do slide · contexto dos slides vizinhos · preferências da marca · referências disponíveis.
**Saída:** leitura estratégica · ideia visual central · sujeito · cena exata · elemento inesperado · composição · relação texto/imagem · referências reais · restrições · núcleo visual.

## As 9 etapas do método

1. **Extrair a mensagem** — tese, conflito, emoção, fato central, promessa. (Separar *assunto aparente* de *mensagem real* e *tensão*.)
2. **Identificar entidades reais** — pessoa/artista/atleta/fundador/empresa/logo/produto/interface/evento/local/obra. Pergunta-chave: *qual elemento precisa estar correto pra capa parecer realmente sobre essa história?* Quando há entidade real, **não substituir por genérico**.
3. **Definir a função visual** — reconhecer · explicar · provocar · desejar · comprovar · comparar · humanizar · surpreender. (Notícia→reconhecimento; análise→tese visual; opinião→posicionamento; história→momento; curiosidade→estranhamento; produto→desejo+clareza; tecnologia→funcionamento/impacto; comportamento→identificação; marca→contexto cultural; tendência→antecipação.)
4. **Escolher a família visual** (6):
   - `factual_editorial` — famosos, marcas, esporte, notícia, campanhas. Reconhecimento imediato.
   - `premium_editorial` — design, criatividade, lifestyle, tendência. Menos elementos, respiro, atmosfera.
   - `creator_explainer` — IA, negócios, opinião, educacional. Compreensão instantânea, impacto alto.
   - `product_storytelling` — produto/app/interface/lançamento. Hero, em uso, close, embalagem.
   - `hybrid_digital_editorial` — IA, prompts, chats, automação. Foto + interface, **sem "dashboard fake"**.
   - `concrete_visual_metaphor` — conceitos difíceis. **Metáfora sempre vira objeto, gesto ou situação fotografável.**
5. **Encontrar o hero visual** — um elemento dominante (rosto, corpo, produto, objeto, logo, cena, gesto, interface, dupla).
6. **Criar o twist** (campo obrigatório `creative_twist`) — 6 fontes: escala inesperada · contexto inesperado · contraste visual · **materialização de algo digital** · associação cultural · detalhe narrativo.
7. **Definir o frame** — um instante preciso, não uma situação vaga.
8. **Planejar o texto** — onde vai a headline, o que não pode ser coberto, se o fundo precisa escurecer.
9. **Escrever o brief** — claro o bastante pro outro motor não reinterpretar.

## Regras duras

- **Concretude:** nunca usar ideia invisível como sujeito. ❌ "o conceito de inovação", "atenção fragmentada" → ✅ pessoa/objeto/comportamento/situação física que encarna a ideia.
- **Momento específico:** ❌ "um fundador trabalhando" → ✅ "um fundador sozinho no estúdio depois da meia-noite segurando o único protótipo que sobreviveu, com as versões descartadas cobrindo o chão atrás dele".
- **Ação > adjetivo:** ❌ "um profissional confuso" → ✅ "um profissional alternando entre três telas sem conseguir terminar uma única frase".
- **Equilíbrio criativo: 80% reconhecimento + 20% surpresa** (base familiar + ruptura específica).
- **Sem texto escrito dentro da imagem** (salvo pedido explícito).

## Anti-genérico (rejeitar por padrão)

pessoa aleatória no laptop · funcionário no escritório · executivo apontando pra gráfico · time sorrindo genérico · **dashboards falsos** · **telas sem sentido/ilegíveis** · ícones flutuando · cérebro brilhante · holograma · lâmpada · engrenagem · alvo · labirinto abstrato · sala futurista genérica · expressão dramática sem causa narrativa · imagem decorativa sem relação com a copy.

> Casa perfeitamente com a regra anti-"texto embaralhado" já implementada no `COMMON_TAIL` (doc 01 / F6-B).

## Exploração + seleção

Gerar **3 rotas internas** e escolher a melhor (sem expor as rejeitadas):
- **A. Direta** — representação clara e factual.
- **B. Narrativa** — um momento que encarna a história.
- **C. Inesperada** — leitura menos óbvia, com twist controlado.

Critérios (0–10) e pesos: **Clareza 20% · Relevância 20% · Originalidade 20% · Impacto 15% · Precisão factual 10% · Viabilidade 10% · Espaço p/ texto 5%.**
> Ideia muito original mas difícil de entender **perde** para uma menos ousada e muito mais clara.

## Controle de qualidade (rejeitar o conceito quando…)

a imagem poderia ilustrar dezenas de posts sem relação · o sujeito não conecta com a copy · o twist é aleatório · elementos demais competindo · depende de texto de interface ilegível · exige explicação longa · é bonita mas factualmente errada · é impossível/instável de gerar · não sobra espaço usável pra headline.

## Schema de saída

Campos: `message_core` · `content_intent` · `visual_objective` · `grounding{required, type, real_entities[]}` · `visual_family` · `text_image_balance` · `primary_subject` · `secondary_subjects[]` · `creative_concept` · `creative_twist` · `concept_rationale` · `scene{moment, environment, action, emotional_signal, key_detail}` · `composition{type, hero_element, subject_position, headline_safe_area, visual_density}` · `must_show[]` · `must_avoid[]` · **`image_generation_core`** · `scores{...}`.

Campos conceituais em **português**; `image_generation_core` em **inglês** (vai pro motor técnico). Retorno: JSON válido apenas. (Prompt completo do system e o schema Zod detalhado estão na mensagem original do Rael — reproduzir na implementação.)

**Exemplo do padrão de qualidade** (Apple/IA): ❌ "Tim Cook com um computador e o logo" → ✅ *"O último movimento do tabuleiro"* — executivo diante de um tabuleiro onde todas as concorrentes já moveram suas peças, enquanto ele ainda segura a última peça branca com o símbolo da maçã; ambiente escuro premium; espaço negativo à esquerda pra headline.

---

## 🔌 Como isso encaixa no NOSSO código (análise de integração)

**Hoje:** o `visual_prompt` é um campo do slide gerado pelo **modelo de copy** (`social-copy/index.ts:56`, schema `"descrição em inglês para gerar imagem do slide"`), com orientação raquítica espalhada nos templates (`copyTemplates.ts:145,173,222,254`). Depois `buildImagePrompt()` (`src/lib/wavyImageStyles.ts`) injeta esse texto no placeholder `{VISUAL_PROMPT}` do estilo e concatena o sufixo de composição.

**A costura é limpa e óbvia:**

```
Motor de Conceito → image_generation_core  ==  {VISUAL_PROMPT} do nosso builder
```

Ou seja: **o `image_generation_core` substitui o `visual_prompt` atual.** O resto do pipeline (estilos, camadas de realismo, negativos, sufixo de composição) continua funcionando sem refactor.

**Onde rodar o motor — 3 opções:**
1. **Dentro do `social-copy`** (o modelo de copy já devolveria o brief). Barato (1 chamada), mas mistura responsabilidades e engorda o prompt de copy.
2. **Nova edge function `social-visual-concept`**, entre a copy e a imagem. ✅ **Recomendado** — separação limpa, permite modelo/temperatura próprios, dá pra reprocessar só o conceito sem refazer a copy, e o brief fica visível/editável na UI.
3. Só no client antes de gerar. Não recomendado (lógica de IA no front).

**Pontos de atenção na integração:**
- **`composition.headline_safe_area` × nossos `TEMPLATE_SUFFIXES`:** os dois falam de espaço pra texto. Precisam ser reconciliados — provavelmente o motor recebe o padrão/template do slide como *input* e respeita a zona segura já definida, em vez de inventar outra.
- **`must_avoid` × `COMMON_TAIL`:** unir os negativos do conceito com os negativos técnicos que já existem.
- **`visual_family` × nossos estilos (`ugc`/`cinematic`/`editorial`/`minimalist`):** as 6 famílias são de *natureza de conteúdo*; nossos 4 estilos são de *acabamento fotográfico*. **Não são a mesma coisa** — o mapeamento precisa ser explícito (ex.: `creator_explainer` pode ser renderizado em `ugc` ou `editorial`). Melhor: o motor sugere a família, e ela **informa** (não substitui) a escolha de estilo do `suggestStyleId`.
- **Papel do slide como input:** já temos `tipo`/`formato` (cover, statement, tension, cta) e a posição no carrossel — alimentar isso no motor cobre o "papel do slide + contexto dos vizinhos" que a spec pede.
- **`grounding.real_entities`:** conecta com o alerta de marca/direito de imagem já anotado nos docs 02/03 — e é onde a busca de imagem real (função órfã `social-image-search`) poderia voltar a fazer sentido no futuro.
- **UI:** vale expor o brief (conceito + twist) no drawer da Etapa 5, junto do prompt — o usuário vê *por que* aquela imagem e pode regerar só o conceito.

> ✅ Com os docs 01–04 a base está completa: **01–03 = motor de renderização**, **04 = motor de conceito**. Falta só o Rael fechar a skill .md pra partirmos pra implementação.
