## Objetivo

Adicionar configuração de **Pixel Meta** por cliente no `AdminDashboard`, persistindo `pixel_id` e `access_token` na tabela `client_pixels` (já existente, com RLS configurado).

Inicialmente o botão será exibido **apenas para o cliente "Deni Haut Cursos"** como teste.

---

## Mudanças

### 1. `src/hooks/useClientPixels.ts` (novo)

Hook com React Query:
- `useClientPixel(clientId)` → busca a row do `client_pixels` daquele cliente (retorna `pixel_id` e `access_token`, ou `null`).
- `useAllClientPixels()` → busca todos os `client_pixels` em uma única query, retornando um `Map<client_id, { pixel_id, access_token }>`. Usado no AdminDashboard para renderizar o badge "Pixel ✓/✗" em cada card sem N+1.
- `useUpsertClientPixel()` → executa upsert (`onConflict: 'client_id'`) na tabela `client_pixels`. Invalida queries `['client-pixels']` no sucesso.

### 2. `src/pages/AdminDashboard.tsx`

**Imports:** adicionar `Scan` do lucide-react; importar `useAllClientPixels` e `useUpsertClientPixel`.

**Filtro de exibição (fase de teste):**
```ts
const PIXEL_ENABLED_CLIENTS = ['deni haut cursos']; // match case-insensitive pelo nome
const showPixelButton = (name: string) =>
  PIXEL_ENABLED_CLIENTS.includes(name.trim().toLowerCase());
```

**Estado do modal:**
- `pixelDialogOpen`, `pixelClientId`, `pixelClientName`
- `pixelIdInput` (string)
- `pixelTokenInput` (string, vazio por padrão)
- `pixelTokenVisible` (bool — toggle olho)
- `hasExistingToken` (bool — controla a nota "deixe em branco para manter o atual")

**Badge no header do card** (linha ~441, ao lado de Meta ✓ / Google ✓):
- Se `pixelMap.get(client.id)` existe → badge verde `Pixel ✓` (ícone `CheckCircle`).
- Caso contrário → badge cinza `Pixel ✗` (ícone `XCircle`).
- Renderizado para **todos** os clientes (não só os habilitados), para dar visibilidade do estado.

**Botão "Sincronizar Pixel Meta"** (apenas se `showPixelButton(client.name)` for true):
- Inserido como **primeiro botão** dentro do bloco `Sync buttons` (linha 506), antes de "Resincronizar Meta".
- Ícone: `Scan` (lucide-react).
- Estilo: mesma classe `btn-glass w-full rounded-xl py-2.5 text-xs font-medium ...`.
- onClick:
  1. `setPixelClientId(client.id); setPixelClientName(client.name);`
  2. Lê do `pixelMap` o registro existente; pré-preenche `pixelIdInput` e marca `hasExistingToken = !!existing?.access_token`.
  3. `setPixelTokenInput('')` (token sempre começa vazio na UI; valor real fica preservado no banco se não alterado).
  4. `setPixelDialogOpen(true)`.

**Modal "Configurar Pixel Meta":**
- Title: `Configurar Pixel Meta`
- Subtitle (DialogDescription): `Insira os dados do Pixel para habilitar o envio de conversões offline`
- Input **Pixel ID**: text, required, placeholder `ex: 123456789012345`.
- Input **Access Token**: type alterna entre `password`/`text` via botão `Eye`/`EyeOff` à direita; placeholder `EAABs...`.
  - Se `hasExistingToken`: placeholder vira `••••••••` e abaixo aparece a nota: `Token já configurado — deixe em branco para manter o atual`. Required apenas quando **não** há token salvo.
- Botões: `Salvar` (primary, `btn-accent`) e `Cancelar` (ghost, fecha modal).

**Lógica de Salvar:**
- Se `hasExistingToken` e `pixelTokenInput` vazio → mantém o token atual (não envia campo `access_token` no upsert; faz update parcial via duas chamadas: se token vazio, faz `update` apenas em `pixel_id`; senão, `upsert` completo).
- Caso contrário → `upsert({ client_id, pixel_id, access_token })`.
- Sucesso: `toast.success('Pixel configurado com sucesso!')`, fecha modal, invalida `['client-pixels']`.
- Erro: toast destrutivo com `error.message`.

---

## Detalhes técnicos

- A tabela `client_pixels` já existe com índice único em `client_id` e RLS de admin full access — não precisa migração.
- O upsert usa `.upsert(payload, { onConflict: 'client_id' })`.
- Para o caso "manter token atual", usaremos `.update({ pixel_id }).eq('client_id', id)` quando já existe row e o input de token está vazio, evitando enviar token vazio para o banco.
- O botão fica escondido para outros clientes via simples filtro por nome (lista `PIXEL_ENABLED_CLIENTS`). Após validação, basta remover o filtro.
- Nenhuma mudança em edge functions nesta fase — o envio de conversões offline será tratado em uma feature separada.

---

## Como testar

1. Entrar em `/dashboard` como admin.
2. No card de **Deni Haut Cursos** deve aparecer o novo botão **Sincronizar Pixel Meta** (com ícone Scan) acima de "Resincronizar Meta".
3. Outros cards **não** mostram o botão, mas mostram o badge `Pixel ✗`.
4. Clicar no botão → modal abre vazio. Preencher Pixel ID + Access Token → Salvar.
5. Toast de sucesso, modal fecha, badge no header do card vira `Pixel ✓`.
6. Reabrir o modal → Pixel ID pré-preenchido; campo de token vazio com nota "Token já configurado…".
7. Salvar sem mexer no token → mantém o token; badge segue verde.
8. Trocar apenas o Pixel ID → atualiza somente o ID.
9. Trocar token → faz upsert completo com novo token.
