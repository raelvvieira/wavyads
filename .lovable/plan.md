## Problema

Na etapa 4 do Criativo Studio, só dá pra recriar em outro formato a partir da **arte principal**:
- Botão "Recriar em 1080x1080" só aparece na story principal (se ainda não tiver square).
- Variações do Fator Criativo só permitem recriar story→1080 (e some quando o 1080 já existe).
- **Edições com I.A** (tanto da principal quanto das variações) e as **variações 1:1 do Fator** não têm nenhum botão pra mudar de aspecto.

O usuário quer poder gerar a versão 1:1 ↔ 9:16 de **qualquer** arte da etapa 4 — edições e variações do Fator inclusive.

## Plano

### 1. Edge function `criativo-generate`
- Generalizar a entrada `storyReference` para `aspectReference` (mantendo `storyReference` como alias para retrocompatibilidade).
- Anexar essa imagem como referência **em qualquer direção** (story↔square), não só `!isStory`. Hoje a referência só entra quando o destino é square.
- Ajustar o trecho do prompt que menciona "story reference / 1:1" para um texto neutro do tipo "Adapt the approved composition to the target aspect while preserving all visual decisions."

### 2. Página `CriativoStudioPage`
- Substituir a função `recreateSquare(target)` por uma versão genérica `recreateAspect({ sourceUrl, sourcePrompt, targetAspect, destination })`, onde `destination` identifica onde guardar o resultado.
- Acrescentar um novo bucket de estado `crossAspectVersions: Record<string, EditedVersion[]>` (ou reutilizar `editedVersions` com uma flag `crossAspect: true`) para guardar conversões de aspecto feitas a partir de edições/variações.
- Botão **"Recriar em 1:1"** / **"Recriar em Story 9:16"** (label dinâmico conforme o aspecto atual) adicionado em:
  - cada cartão de **edição com I.A** (`renderEditedColumns` — hoje só tem Baixar/Descartar).
  - cada **variação do Fator Criativo**, em ambos os formatos (story e square já existentes), permitindo gerar a versão no aspecto oposto mesmo após a edição.
  - manter o botão "Recriar em 1080x1080" da arte principal sem mudança de comportamento.
- O resultado da conversão de aspecto aparece como uma nova coluna ao lado, com Baixar / Editar com I.A / Descartar — usando o mesmo `renderEditedColumns` para reaproveitar UI.

### 3. UX e mensagens
- Toast unificado: "Versão {1080×1080|Story 9:16} gerada".
- Loading inline no próprio botão (spinner) — sem bloquear o restante da etapa.
- Se a operação falhar, mostrar toast destrutivo e manter o card anterior intacto.

## Detalhes técnicos

- A função `editArt` continua igual; só geramos uma nova entrada em `editedVersions` quando a conversão de aspecto é concluída.
- Chamada de geração reaproveita `quality`, `productImages`, `logoImage`, `negativePrompt`, `language` já presentes no estado.
- Não mexer no fluxo do step 1–3, nem em `criativo-edit-image` (a edição com I.A mantém o aspecto original).
- `recordAiUsage` continua sendo chamado a cada geração bem-sucedida.

## Fora do escopo
- Outros aspectos além de 9:16 e 1:1 (4:5, 16:9 etc).
- Lote: gerar todas as conversões de uma vez.
