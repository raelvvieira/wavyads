## Reduzir o card "Como funciona o Match aproximado"

Substituir o card grande de 4 quadrantes por um **card compacto de uma linha** com um parágrafo explicativo curto.

### Layout novo

- Card único, padding reduzido (`p-3`), altura próxima de uma linha de filtro.
- À esquerda: ícone `Info` pequeno (h-4) em chip discreto roxo.
- Texto único, em uma frase, em `text-xs text-muted-foreground`:

  > **Match aproximado:** razão entre contatos enviados e conversões reconhecidas pela Meta no mesmo período (`Reconhecidos ÷ Enviados`). É uma comparação agregada — a Meta não confirma atribuição por contato individual, e a janela padrão é de 7 dias após o clique.

- Sem grid, sem 4 blocos, sem botão de expandir/recolher, sem caixa de "Limitações" separada.
- Posição mantida: entre o grid de KPIs e a barra de filtros.

### O que remover

- Grid `md:grid-cols-2` com os 4 sub-cards ("O que é", "Como é calculado", "Em que se baseia", "Limitações").
- Estado `matchInfoCollapsed`, `toggleMatchInfo` e leitura/escrita no `localStorage`.
- Imports `ChevronDown`, `ChevronUp` (não mais usados); manter `Info`.

### Onde mexer

- `src/pages/ComercialPage.tsx` apenas — bloco do card informativo e estado relacionado no topo do componente.
