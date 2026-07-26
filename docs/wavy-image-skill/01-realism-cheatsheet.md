# Wavy Image Skill — Base de conhecimento (WIP)

> Documento vivo. Material fornecido pelo Rael como base da futura **skill de geração de imagens** do Social Media Studio. Ainda em coleta — mais partes virão.

## Princípio-mestre

**Alvo = ULTRA-REALISMO / hiper-realismo.** Mesmo imagens caricatas devem carregar um **toque de hiper-realismo** (textura, luz e imperfeições reais) — não é "ou realista ou caricato", é "caricato COM acabamento fotográfico real".

A tese central: **mudanças mínimas de wording transformam completamente** o quão humano um rosto parece, como a pele reage à luz, e se a imagem parece foto real ou "IA óbvia". O prompt final é construído por CAMADAS de gatilhos — não uma frase solta.

---

## Cheat-sheet de realismo (8 blocos)

### 1️⃣ Gatilhos centrais de fotorrealismo (o mais importante)
Sempre incluir alguns:
`photorealistic` · `real-world photography` · `cinematic realism` · `lifelike details` · `natural imperfections` · `true-to-life textures` · `realistic skin / materials / surfaces`

Base: *"ultra-realistic cinematic photography with natural imperfections"*. Se não for específico, o modelo "chuta" — o que não queremos.

### 2️⃣ Câmera & lente (faz ou quebra o realismo)
Diz ao modelo que é FOTO, não imagem fake.
- **Câmera:** `DSLR photography` · `mirrorless camera` · `cinematic film still` · `documentary-style photography` · `street photography` · `studio portrait photography`
- **Lente/óptica:** `35mm lens` (realismo mais natural) · `50mm lens` (olhar humano) · `85mm portrait lens` (rostos) · `shallow depth of field` · `natural bokeh` · `realistic focal length`

Base: *"shot on a 35mm lens, shallow depth of field, natural bokeh"*.

### 3️⃣ Iluminação (termos de luz do mundo real, evitar luz de fantasia)
`natural light` · `soft window light` · `golden hour sunlight` · `overcast daylight` · `practical lighting` · `studio softbox lighting` · `subtle rim light` · `realistic shadows`
- ❌ Evitar: `neon glow`, `magical light`, `fantasy lighting` (a não ser intencional).
- 💡 `natural daylight` é o termo mais usado pra realismo — revela as imperfeições que temos e recria o mundo como o vemos todo dia.

### 4️⃣ Textura & detalhe (mata o "plástico de IA")
`high-detail textures` · `realistic surface detail` · `visible pores` · `fabric grain` · `skin micro-details` · `dust, scratches, wear` · `slight imperfections` · `tactile materials`
- 🔑 **Imperfections é o grande.** Sem instrução, a IA deixa a pele perfeita/plástica. Poros, leve vermelhidão, oleosidade natural = nível acima.

### 5️⃣ Cor & tom (realismo = contenção)
`natural color grading` · `muted tones` · `earthy color palette` · `cinematic color balance` · `realistic contrast` · `soft highlights, deep shadows`
- ❌ Evitar: `hyper-saturated`, `neon`, `cartoon colors`.

### 6️⃣ Composição (pensar como fotógrafo)
`rule of thirds` · `eye-level shot` · `candid moment` · `unstaged composition` · `natural framing` · `foreground / background separation`

### 7️⃣ Grão & qualidade de imagem (os 10% finais)
`subtle film grain` · `cinematic grain` · `HDR (leve)` · `sharp focus` · `clean but not overly polished`

### 8️⃣ Negativos (crítico — protege o realismo)
`no cartoon style` · `no CGI` · `no 3D render` · `no game engine` · `no plastic skin` · `no unrealistic lighting` · `no text, logo, watermark`

---

## Método de construção do prompt

1. **Monta a base** empilhando gatilhos dos 8 blocos. Ex.:
   > "Ultra-realistic cinematic photography of a female model, shot on a 35mm lens, natural day time lighting, realistic shadows, shallow depth of field, true-to-life textures, visible imperfections, subtle film grain, natural color grading."
2. **Adiciona o contexto** do que você quer (sujeito, cena, ação).
3. **Expande / detalha** — o passo que multiplica a qualidade: pedir "torne este prompt MUITO mais detalhado", descrevendo física da luz (light wrap, bounce, ambient occlusion), óptica (f/1.8, falloff de lente, edge softness), micro-textura (poros, tecido, poeira, digitais, arranhões), color grading neutro, grão/ruído de sensor na sombra, roll-off suave de highlights, blacks com detalhe. Resultado alvo: "indistinguível de foto real".

---

## Prompts de referência (espécimes — NÃO copiar literal; extrair o padrão)

> Rael: "não quero que apegue ao prompt exato dos exemplos e sim em tudo que contém um prompt final de detalhes, etapas para atingir hiperrealismo".

**A) Base cinematográfica expandida (modelo feminina):**
> Ultra-realistic, true-to-life cinematic photography of a female model captured as if shot on a full-frame professional DSLR with a 35mm prime lens at f/1.8, using natural midday sunlight filtered through the atmosphere, creating physically-accurate soft highlights and deep realistic shadows. Authentic optical depth of field with natural lens falloff, subtle background bokeh, gentle edge softness; subject razor-sharp. Real-world micro-texture: skin pores, fabric weave, dust, fingerprints, smudges, scratches, slight wear — nothing airbrushed. Realistic light wrap, bounce light, soft ambient occlusion. Neutral photographic color grading, true whites, natural skin tones, slight warm daylight bias, no oversaturation/HDR. Fine cinematic film grain and sensor noise in shadows. Highlights roll off smoothly (no clipping), blacks retain detail. Looks like a high-end still from a real cinematic camera — not an illustration, render, or digital painting; visually indistinguishable from real photography.

**B) Selfie UGC de celular (quarto):**
> Ultra-realistic close-up selfie of a woman sitting on her bed, soft natural morning light through sheer curtains, phone held at arm's length, natural skin texture with faint freckles, light eye bags, glossy lips, messy hair tied loosely, white oversized t-shirt, cozy bedroom blurred behind, raw iPhone selfie look, no makeup filter, UGC TikTok aesthetic, hyper-realistic skin pores and hair strands, 8K photorealism, no cartoon, no fantasy, no plastic skin, unstaged composition, skin micro-details.

**C) Selfie UGC no espelho do banheiro (front camera):**
> Ultra-realistic front-facing smartphone selfie in a modern softly lit bathroom, as if filmed on a real iPhone Pro front camera in 8K. Phone slightly angled, partially obscuring the face, fingers and phone edges visible. Warm white LED strips + ceiling light → soft facial highlights, realistic skin shine, gentle bloom in the mirror. Skin micro-detail: pores, faint blemishes, subtle redness, natural oiliness — nothing airbrushed. Slightly glossy lips with realistic reflections. Loose hoodie with visible fibers/folds/wrinkles. Authentic mirror reflections, slight glare, depth, shallow DoF blur. Raw unfiltered UGC influencer look (TikTok/IG Stories), natural phone-camera sharpness, slight digital noise, zero beauty retouching — indistinguishable from a real photo.

**D) UGC de demo de produto (sofá, batom):**
> Ultra-realistic cinematic beauty UGC portrait, young woman on a beige sofa in a bright modern living room, holding a pink lipstick toward camera in a natural influencer product-demo pose, framed waist-up, direct eye contact, calm confident conversational expression. Wet slicked-back hair with realistic clumping/shine. True-to-life skin: pores, faint freckles, slight redness, natural glow, no airbrushing. Black strapless top with fabric tension/folds, minimal gold jewelry catching light. Lipstick held delicately, natural nails/creases/hand imperfections. Warm cozy high-end room, cream cushions, textured throws, large windows; soft natural daylight → gentle highlights, realistic shadow falloff, warm bounce. Slightly out-of-focus background, shallow DoF, natural bokeh, strong subject separation. As if shot on full-frame 35mm at wide aperture — authentic optical depth, slight edge softness, crisp focus on eyes and product. Neutral photographic grade, warm daylight tones, realistic skin, no HDR/oversaturation. Fine film grain + subtle sensor noise in shadows.

---

## Como isso mapeia no nosso sistema (nota de implementação)

- Provavelmente vira **novo(s) estilo(s) de imagem** e/ou uma **skill dedicada**, com estes 8 blocos como "camadas" parametrizáveis do prompt builder (hoje em `src/lib/wavyImageStyles.ts` + espelho `supabase/functions/social-image-gen/wavy-skill.ts`).
- O estilo `ugc` que já criamos é uma primeira semente disso (foto de celular candid). Este material eleva o teto: full-frame cinematográfico, física de luz, micro-textura, grão de sensor.
- Caricatura: aplicar o "toque hiper-realista" = manter a exageração de caricatura MAS com pele/luz/textura/grão fotográficos.
- Modelo atual de geração: `gemini-3.1-flash-image-preview` (aceita bem essa direção via texto).

> ✅ Complementado pelos docs 02, 03 (renderização) e 04 (motor de conceito). Base 01–04 completa.
