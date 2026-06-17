
# Revisão completa de normalização — `send-offline-conversion`

Objetivo: garantir que todo campo enviado ao Meta CAPI siga exatamente o padrão oficial. Se o dado não couber no padrão, **não enviar** (deixa `isPresent=false` para aquele campo) em vez de mandar dado errado que quebra o match.

Arquivo único alterado: `supabase/functions/send-offline-conversion/index.ts`

Sem mudanças de schema, sem mudanças no frontend, sem mudanças no fluxo de decisão pixel vs offline dataset.

## 1) Novo helper compartilhado

```ts
// Remove diacríticos (NFD + strip combining marks)
const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
```

Cada normalizer passa a retornar `string | null`. `null` = inválido → o campo é omitido do `user_data`.

Substituir `isPresent(...)` por: rodar normalizer; se retornar string não-vazia, hashear e incluir; senão, pular.

## 2) Regras por campo (Meta CAPI v24.0)

| Campo | Padrão Meta | Nova lógica |
|---|---|---|
| `em` (email) | lowercase, trim, formato válido | trim + lowercase; regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`; senão `null` |
| `ph` (phone) | E.164 só dígitos, com country code, **sem `+`** ao hashear (Meta aceita ambos, mas padrão é só dígitos) | strip não-dígitos; se começar com `0` → remover; se 10–11 dígitos (BR sem DDI) → prefixar `55`; exigir comprimento 10–15; senão `null` |
| `fn` / `ln` | lowercase, sem acentos, só letras (a–z) | trim + lowercase + stripDiacritics + `replace(/[^a-z]/g,"")`; vazio → `null` |
| `ct` (city) | lowercase, sem acentos, sem números/símbolos/espaços | lowercase + stripDiacritics + `replace(/[^a-z]/g,"")`; vazio → `null` |
| `st` (state) | 2 letras lowercase | stripDiacritics + lowercase + só letras; aceitar somente se resultado tiver exatamente 2 chars; senão `null` (não tentar mapear "são paulo"→"sp" automaticamente para evitar erro) |
| `zp` (zip) | só dígitos | strip não-dígitos; se for BR (country `br`) exigir 8 dígitos; caso contrário aceitar 3–10 dígitos; senão `null` |
| `country` | ISO-2 lowercase | trim + lowercase + stripDiacritics + só letras; aceitar se length===2; mapear casos comuns: `brasil`/`brazil`→`br`, `eua`/`usa`→`us`, `mexico`→`mx`, `portugal`→`pt`, `argentina`→`ar`; senão `null` |
| `db` (DOB) | `YYYYMMDD` | strip não-dígitos; se length===8 e ano entre 1900 e ano atual → ok; senão `null` |
| `doby` | `YYYY` | strip não-dígitos; length===4 e range válido; senão `null` |
| `ge` (gender) | `m` ou `f` | lowercase primeiro char; mapear `male/masculino/homem/h`→`m`, `female/feminino/mulher`→`f`; senão `null` |
| `age` | inteiro positivo (string hasheada — Meta aceita string SHA256) | parseInt; se 1–120 → string do número; senão `null` |

Notas:
- `st` precisa de coluna `state` em `offline_conversions`. Verificar: se não existir, simplesmente não adicionar suporte a `st` nesta tarefa (manter escopo). Vou conferir o schema antes de incluir.
- Phone: Meta aceita E.164 com ou sem `+`; a documentação atual recomenda só dígitos antes do hash. Vou padronizar para **só dígitos com country code** (sem `+`), o que melhora o match.
- Cada normalizer com comentário `// Meta CAPI: <regra>` em cima.

## 3) Fluxo do builder de `user_data`

Substituir os blocos `if (isPresent(...)) user_data.X = await hashSHA256(normX(...))` por um helper:

```ts
async function addHashed(
  out: Record<string, string | string[]>,
  key: string,
  raw: unknown,
  normalizer: (s: string) => string | null,
  asArray = false,
) {
  if (raw === null || raw === undefined) return;
  const s = String(raw);
  if (!s.trim()) return;
  const n = normalizer(s);
  if (!n) return;
  const h = await hashSHA256(n);
  out[key] = asArray ? [h] : h;
}
```

`em` e `ph` com `asArray=true`; demais escalares (igual ao formato atual aceito pelo Meta).

## 4) Logging para diagnóstico

Adicionar ao `console.log` existente uma lista das chaves que entraram em `user_data` (sem valores, só nomes) e uma lista das que foram descartadas por invalidação, para depurar casos como o Nubeauty Purchase:

```ts
console.log("send-offline-conversion", {
  conversion_id: conversionId,
  mode: useOfflineDataset ? "offline_dataset" : "pixel_events",
  target_id: targetId,
  included_keys: Object.keys(user_data),
  dropped_keys: droppedKeys, // preenchido pelo addHashed quando normalizer retorna null
});
```

## 5) Pré-checagem antes de chamar

Confirmar com `supabase--read_query` quais colunas existem em `offline_conversions` (especialmente `state`/`st`) e quais valores estão salvos hoje para Nubeauty, para validar se a nova normalização vai corrigir os Purchases. Isso acontece no início da execução do plano e não muda o plano em si — apenas confirma se incluímos `st` ou não.

## 6) Fora de escopo

- Não mexer em UI, dialog, tabela, RLS, schema.
- Não alterar a decisão pixel vs offline dataset.
- Não alterar `action_source`, `upload_tag`, `event_name`, `custom_data`.

## Resultado esperado

Após deploy, conversões de Nubeauty cujo único motivo de não-match era acento em `fn` (ex.: "Juliana Góllo"), telefone sem `+55`, ou country fora de ISO-2 passam a casar no Meta. Conversões com dado realmente inválido (ex.: email sem `@`) são enviadas **sem** aquele campo, em vez de poluir o hash.
