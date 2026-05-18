# Reforçar edição de imagem com I.A (Etapa 4)

## Problema observado
No teste com o feedback *"preciso que o fundo tenha menos plantas e mais elementos de aquarela"*, o modelo:
- ✅ Adicionou elementos de aquarela
- ❌ **Não reduziu** as plantas

Isso é uma falha clássica do builder de prompt: quando o feedback contém duas instruções (uma de **remover/reduzir** e uma de **adicionar**), o modelo prioriza a aditiva e ignora a subtrativa. Além disso, não há log do prompt construído, o que dificulta debugar.

## O que vou mudar (em `supabase/functions/criativo-edit-image/index.ts`)

### 1. Logar o prompt construído
Adicionar `console.log("[edit-image] built prompt:", editPrompt)` antes de chamar o Gemini, para que toda edição futura fique rastreável nos logs.

### 2. Reescrever o `SYSTEM_BUILDER` (prompt do construtor)
Tornar o construtor **explícito e imperativo** sobre 3 pontos onde ele falha hoje:

- **Decompor o feedback em mudanças atômicas.** Se o usuário pediu N coisas, listar as N como bullets numerados na instrução final — nada de juntar tudo numa frase só.
- **Tratar reduções/remoções com a mesma força que adições.** Converter linguagem qualitativa em quantitativa imperativa:
  - *"menos plantas"* → `"REMOVE at least 60–70% of the existing plants/leaves/foliage in the background. Only 1–2 small subtle plant elements may remain, if any."`
  - *"sem X"* → `"COMPLETELY REMOVE every X. Zero X must remain visible."`
  - *"mais Y"* → `"SIGNIFICANTLY INCREASE Y, making it the dominant secondary element of the background."`
- **Proibir interpretação puramente aditiva.** Adicionar regra explícita: *"If the user requested ANY reduction or removal, you MUST include it as a separate numbered change. Never silently skip a subtractive instruction in favor of an additive one."*

### 3. Reforçar o prompt final enviado ao Gemini image
Hoje é só `${editPrompt}\n\n${aspectNote}`. Vou prefixar com um cabeçalho diretivo curto que reitera ao modelo de imagem que **cada item numerado é obrigatório**, ex.:

```
CRITICAL: Apply EVERY numbered change below. Do not skip any. 
Subtractive changes (remove/reduce) are as mandatory as additive ones.

<editPrompt>

<aspectNote>
```

### 4. Pequeno ajuste de modelo do builder
Trocar `google/gemini-2.5-flash` por `google/gemini-3-flash-preview` no builder (default do projeto, mais aderente a instruções).

## Arquivos
- `supabase/functions/criativo-edit-image/index.ts` (único arquivo)

## Como validar
1. Refazer a mesma edição (*"menos plantas e mais aquarela"*) na mesma arte.
2. Conferir o log da function: o prompt deve listar **duas** mudanças numeradas (1. remover plantas; 2. adicionar aquarela).
3. A imagem resultante deve ter visivelmente menos folhagem.
