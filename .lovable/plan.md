## Diagnóstico

O bug tem duas causas, ambas ligadas ao mesmo detalhe: o bucket `creative-assets` está **privado**.

1. **Miniaturas quebradas no dropzone** (imagem "ref 1" com ícone de imagem quebrada)
   - `persistUploadedImages` faz upload do data URL para `creative-assets` e substitui o estado por `getPublicUrl(...)`.
   - Como o bucket é privado, essa URL retorna 400/404 no navegador → `<img>` renderiza quebrado.

2. **"Não consegui baixar a imagem 'logo' pra reenviar"**
   - Confirmado nos logs da edge function `criativo-generate`: EvoLink recebe a URL pública do Storage, tenta baixar e leva 400 (bucket privado). O código antigo lançava exceção quando isso acontecia.
   - O código atual da função já é tolerante (marca a referência como `null` e segue a geração sem ela), mas a versão implantada é antiga — precisa redeploy.

## Alterações

1. **Storage**: tornar o bucket `creative-assets` público (`supabase--storage_update_bucket`).
   - Só assets de referência do Criativo Studio ficam nele; nada sensível.
   - Isso conserta as miniaturas no dropzone **e** libera o EvoLink a baixar os assets.
2. **Edge function**: redeploy do `criativo-generate` (código atual já ignora referências problemáticas em vez de falhar a geração inteira).

Nenhuma mudança no frontend é necessária — o `ImageDropzone` e o `persistUploadedImages` já funcionam corretamente com URLs públicas.

## Pontos técnicos

- Sem GRANT/RLS extra em `storage.objects`: buckets públicos já permitem SELECT anônimo.
- Se sua workspace bloqueia buckets públicos (`cloud_block_public_buckets`), o tool devolve erro claro e aviso você para habilitar em Settings → Privacy & Security.
- Alternativa (não recomendada agora, mais trabalho): manter o bucket privado e passar signed URLs de curta duração para o edge function. Fica pra depois se surgir requisito de privacidade.
