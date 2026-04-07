

## Plan: Galeria de Criativos — Compacta com Limite de 5

### Mudanças no `src/components/CreativesGallery.tsx`

**Layout compacto**: Trocar o grid de cards grandes (aspect-square) por uma lista horizontal de 5 cards menores, com thumbnail menor (80x80 ou aspect-video reduzido) lado a lado com as métricas.

**Limitar a 5 visíveis**: Após filtrar e ordenar, exibir apenas os 5 primeiros (`filtered.slice(0, 5)`).

**Ordenação por desempenho**: Adicionar um select/toggle de ordenação com opções:
- Maior Gasto (padrão atual)
- Melhor CTR
- Menor Custo/Resultado
- Mais Resultados

**Filtro de status**: Manter os botões Todos / Ativos / Pausados já existentes.

**Design mais compacto**: Cada card será uma row horizontal (flex) em vez de card vertical:
- Thumbnail pequeno (64x64 rounded) à esquerda
- Nome do anúncio + campanha (truncado) no meio
- 4 métricas inline à direita (Gasto, Resultados, Custo/Res, CTR)
- Badge de status pequeno

Grid: 1 coluna, 5 rows — visual tipo lista/tabela compacta com thumbnails.

### Arquivo único

| Arquivo | Ação |
|---------|------|
| `src/components/CreativesGallery.tsx` | Reescrever — layout horizontal compacto, limite 5, select de ordenação |

