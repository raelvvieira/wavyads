# Diagnóstico

Olhei os logs da edge `criativo-generate` e o código de `buildFinalPrompt`. O prompt está sendo construído **inteiro** no frontend (introdução, design system, copy nos 5 blocos, mood, do-not-include, idioma) — isso está OK. O problema está em **como ele é entregue ao gerador** e **qual gerador está sendo usado**:

1. **Freepik text-to-image (Imagen3, Mystic, Flux, classic-fast) tem limite de caracteres pequeno no prompt.**
   - Imagen3 ≈ 480 chars, Mystic ≈ 1000 chars, classic-fast ≈ 800.
   - Nosso prompt final passa fácil de 2.500–4.000 chars. O Freepik **silenciosamente trunca/descarta** tudo a partir de um certo ponto — geralmente perdendo justamente os blocos finais: `[TEXT BLOCKS]`, `[MOOD]`, `[DO NOT INCLUDE]`, `[CLOSING]`. É exatamente o que o usuário viu: "imagem comum, sem copy".

2. **Freepik text-to-image NÃO aceita imagens de referência.**
   - O prompt diz "[ATTACHED PHOTOS] 1 reference image…" e "[BRAND LOGO]…", mas em `criativo-generate/index.ts` a chamada só envia `prompt` — nenhum `image_url`, nenhum `reference_images[]`. O produto e o logo do usuário **nunca chegam ao modelo**.

3. **Os modelos do Freepik (Mystic/Imagen3/Flux/classic) renderizam texto longo muito mal.** Mesmo se o prompt chegasse inteiro, eles não conseguem desenhar headlines + subtítulos + CTA com tipografia limpa.

# Solução

Trocar o motor de geração para o **Lovable AI Gateway com Nano Banana Pro** (`google/gemini-3-pro-image-preview`), que:
- aceita prompts longos (sem o teto baixo do Freepik),
- aceita **múltiplas imagens de referência** na mesma chamada (produto + logo),
- renderiza **texto legível** dentro da imagem (que é exatamente o que esta skill exige).

Manter o seletor de modelos no UI, mas mapeá-lo a 2 opções reais que funcionam para esse caso:
- **Nano Banana Pro** (`google/gemini-3-pro-image-preview`) — qualidade alta
- **Nano Banana 2** (`google/gemini-3.1-flash-image-preview`) — rápido

Os 4 modelos antigos do Freepik (classic-fast, flux-dev, mystic, imagen3) podem ficar como opção secundária, mas com aviso curto na UI ("não suportam textos longos nem imagens de referência"), ou ser removidos. Recomendação: **remover** para evitar o mesmo problema reaparecer.

# Mudanças

### 1. `supabase/functions/criativo-generate/index.ts` (reescrever)
- Aceitar no body: `model` (`'nano-banana-pro' | 'nano-banana-2'`), `prompt`, `aspectRatio`, `referenceImages?: string[]` (data URLs ou https), `logoImage?: string`.
- Chamar `https://ai.gateway.lovable.dev/v1/chat/completions` com `LOVABLE_API_KEY`:
  - `messages: [{ role: 'user', content: [ {type:'text', text: prompt}, ...referenceImages.map(url => ({type:'image_url', image_url:{url}})), ...(logoImage ? [{type:'image_url', image_url:{url: logoImage}}] : []) ] }]`
  - `modalities: ['image','text']`
- Extrair `data.choices[0].message.images[0].image_url.url` e devolver como `imageUrl`.
- Tratar 429 (rate limit) e 402 (créditos) com mensagens claras.
- Logar tamanho do prompt + nº de imagens anexadas.

### 2. `src/pages/CriativoStudioPage.tsx`
- Reduzir lista de modelos para `nano-banana-pro` (default) e `nano-banana-2`.
- Em `generate(aspect)`, enviar também `referenceImages: productImages` e `logoImage: logoImage[0]` no body do invoke.
- No `buildFinalPrompt`, injetar instrução explícita "USE the attached photos as the literal subject" / "USE the attached logo as a fixed asset, do not redraw" para o Nano Banana entender o papel de cada imagem anexada.
- Reforçar no início do prompt: a aspect ratio desejada (Nano Banana respeita melhor com instrução textual forte: "Output MUST be exactly 1080x1920 vertical 9:16" / "exactly 1080x1080 square 1:1").

### 3. UI
- Trocar labels do select de modelo.
- Pequena nota no Step 4: "Renderiza textos da copy diretamente na imagem usando suas fotos e logo como referência."

# Fora de escopo
- Não vou mexer em Step 1 (análise), Step 2 (copy) nem Step 3 (uploads) — eles já entregam o que o novo gerador precisa.
- Sem mudanças de schema/banco.
- Sem persistência das imagens geradas (segue retornando data URL/URL temporária como hoje).

# Por que isso resolve o sintoma
- Prompt vai inteiro → blocos de copy, mood e do-not-include chegam ao modelo.
- Fotos e logo anexados de verdade → composição usa o sujeito real, logo aparece sem ser redesenhado.
- Modelo (Nano Banana Pro) sabe renderizar headline/subtítulo/CTA com tipografia legível → para de sair "imagem comum sem texto".
