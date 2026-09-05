# Permitir enviar referências no Criativo Studio

## O problema

Ao clicar no clipe e escolher "Anexar referência", a única coisa que aparece é a lista de referências já salvas — e quando o cliente não tem nenhuma, a tela mostra "Nenhuma referência salva ainda" sem nenhuma forma de enviar uma imagem.

Isso não é específico da Dra. Mariane: a tela de referência nunca teve campo de envio. Só "Anexar logo" e "Anexar produto" têm a área de soltar/colar imagem. Ou seja, a única maneira de uma referência existir hoje é ela ter entrado por outro caminho.

## A correção

Acrescentar à tela "Anexar referência" a mesma área de envio que logo e produto já têm:

- soltar arquivos, clicar para escolher ou colar (Ctrl+V);
- até 8 imagens de uma vez;
- cada imagem enviada vira anexo da arte que está sendo criada agora e, ao mesmo tempo, fica salva na biblioteca de Referências daquele cliente para reutilização;
- enquanto sobe, o rótulo mostra "Enviando…".

Quando o cliente já tiver referências salvas, elas continuam listadas acima da área de envio — mesmo arranjo de logo/produto.

## Detalhes técnicos

- `src/features/creative-studio/command/AttachMenu.tsx`: fazer `PainelReferencia` reutilizar `PainelBiblioteca` (que já combina grade + `ImageDropzone` + `uploadDataUrlToCreativeStorage`), com `kind: 'reference'`, `maxImages: 6-8`, texto "Solte, clique ou cole as referências". Ampliar o tipo de `onNewLibraryUpload` de `'logo' | 'product'` para incluir `'reference'`.
- `src/pages/CriativoStudioV2Page.tsx`: `handleNewLibraryUpload` passa a aceitar `'reference'` — nenhuma outra mudança, pois já grava `type: kind` em `creative_assets` e faz `upsertAsset`, o que já alimenta `referenceLibrary` e o contador da ilha "Referências".
- Sem mudança de banco: `'reference'` já é um tipo válido em `SOURCE_ASSET_TYPES`, e a geração já envia anexos de referência ao criar a arte (`attachments.filter(kind === 'reference' || 'product')`).
