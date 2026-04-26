## Problema

Em larguras intermediárias de desktop (≈900–1200px) com 6 cards lado a lado, o valor numérico (ex: `R$ 4.885,05`) fica atrás do ícone verde e do botão de configurações no canto superior direito do `KpiCard`. O ícone tem tamanho fixo (`h-10 w-10`) enquanto o valor cresce com a viewport.

## Solução

Ajustar o `KpiCard` para garantir que valor e ícone nunca se sobreponham, usando três técnicas combinadas:

### 1. Ícone responsivo
- Ícone container: `h-8 w-8` (mobile/médio) → `h-10 w-10` (xl+)
- Ícone interno (lucide): `h-4 w-4` → `h-5 w-5` em xl
- Botão de settings: visível apenas no hover do card em telas menores que xl, sempre visível em xl+ (reduz poluição e libera espaço)

### 2. Layout que não sobrepõe
- Hoje o `<p>` do valor pode ficar atrás do bloco de ícone porque o flex usa `min-w-0` mas o valor tem `text-3xl` em md. Vou:
  - Garantir `flex-1 min-w-0` no bloco da esquerda
  - Reduzir o valor para `text-lg` (base) → `text-xl` (md) → `text-2xl` (lg) → `text-3xl` (2xl)
  - Aplicar `truncate` ou `tabular-nums` + `whitespace-nowrap` controlado, com `overflow-hidden` no container
- Adicionar `gap-2` entre os dois blocos (esquerda/ícone) para respiro garantido

### 3. Padding do card
- Reduzir o padding do `GlassCard` no `KpiCard` em telas menores: `p-4` (base) → `p-6` (xl+) via classe customizada, ganhando mais área útil sem mudar o `GlassCard` global

## Arquivo

| Arquivo | Ação |
|---|---|
| `src/components/KpiCard.tsx` | Ajustes responsivos no tamanho do ícone, valor e padding; garantir que ícone nunca sobreponha o valor |

## Resultado esperado

- Em 986px (viewport atual do usuário) os 6 cards mostram valor completo sem sobreposição.
- Em telas grandes (≥1280px) o visual atual é mantido.
- Em mobile o card continua confortável.
