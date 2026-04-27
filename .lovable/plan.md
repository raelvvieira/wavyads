## Objetivo

Tornar a sincronização do Pixel Meta e o registro de Conversões Offline disponíveis para **todos os clientes**, exatamente como já funciona para a Deni Haut Cursos. Cada cliente continuará vendo apenas os dados da sua própria conta Meta Ads (a separação por `clientId` já existe).

## Situação atual

Hoje a funcionalidade está restrita por uma whitelist com o nome `'deni haut cursos'` em dois lugares:

- `src/pages/AdminDashboard.tsx` (linhas 11-13): constante `PIXEL_ENABLED_CLIENTS` controla a exibição do botão **"Sincronizar Pixel Meta"** em cada card de cliente.
- `src/pages/ClientDashboard.tsx` (linhas 35-37): constante `CONVERSION_ENABLED_CLIENTS` controla a exibição do botão **"Registrar Conversão"** dentro do dashboard do cliente.

Toda a infraestrutura por trás (tabela `client_pixels`, hook `useClientPixels`, dialog `OfflineConversionDialog` que recebe `clientId` por prop, edge function `send-offline-conversion`) já é multi-cliente — só está bloqueada por essas duas listas.

## Mudanças

### 1. `src/pages/AdminDashboard.tsx`
- Remover as constantes `PIXEL_ENABLED_CLIENTS` e a função `showPixelButton`.
- Remover a condição `{showPixelButton(client.name) && (...)}` ao redor do botão "Sincronizar Pixel Meta" para que ele apareça em **todos os cards** de cliente.
- O indicador de status "Pixel ✓ / Pixel ✗" (que usa `pixelMap?.has(client.id)`) já é universal e continuará exibido para todos.

### 2. `src/pages/ClientDashboard.tsx`
- Remover as constantes `CONVERSION_ENABLED_CLIENTS` e `showConversionButton`.
- Substituir `{showConversionButton(client?.name) && clientId && (...)}` por uma condição baseada na **existência de pixel configurado** para o cliente atual, usando o hook `useAllClientPixels` que já existe:
  - Importar `useAllClientPixels` de `@/hooks/useClientPixels`.
  - `const hasPixel = pixelMap?.has(clientId)`.
  - O botão "Registrar Conversão" e o `OfflineConversionDialog` aparecem se `hasPixel && clientId`. Isso evita mostrar o botão para clientes cujo admin ainda não cadastrou Pixel ID + token (caso contrário o envio falharia na edge function).

### 3. Garantia de isolamento de dados (já existente, sem mudança)
- O `OfflineConversionDialog` recebe `clientId={clientId}` e a edge function `send-offline-conversion` carrega `pixel_id` e `access_token` da linha de `client_pixels` correspondente àquele `clientId`. Cada cliente registra conversões usando exclusivamente o seu próprio Pixel.
- O dashboard do cliente (`ClientDashboard`) já filtra todos os hooks Meta (`useMetaCampaigns`, `useMetaInsights`, `useMetaAds`) por `clientId`, então a leitura de dados continua individualizada.

## Resultado esperado

- Admin: vê o botão "Sincronizar Pixel Meta" em **todos** os cards de cliente e pode cadastrar Pixel ID + token para qualquer um.
- Cliente: assim que o admin configura o Pixel, o botão "Registrar Conversão" aparece no topo do dashboard daquele cliente, abrindo o mesmo fluxo single/bulk (Purchase / Lead) já validado com a Deni Haut.
- Nenhuma alteração de schema, edge function ou RLS é necessária — apenas remoção das duas whitelists e troca do gate do botão por `hasPixel`.