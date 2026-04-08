

## Plan: Expandir Criativos + Preview em Pop-up + Disponibilizar para Todos os Clientes

### 1. Expandir galeria — botão "Ver mais" (max 15 total)

**Arquivo:** `src/components/CreativesGallery.tsx`

- Adicionar state `expanded` (boolean, default false)
- Quando collapsed: mostrar 5 criativos (atual). Quando expanded: mostrar até 15 (5 + 10)
- No final da lista, botão "Ver mais" / "Ver menos" que alterna o estado
- Ajustar o `.slice()` para usar `expanded ? 15 : 5`

### 2. Pop-up de preview do criativo

**Arquivo:** `src/components/CreativesGallery.tsx`

- Adicionar state `selectedAd` para armazenar o ad clicado
- Usar `Dialog` do shadcn/ui para exibir a imagem/vídeo em tamanho maior
- Ao clicar na thumbnail, abrir o dialog com a imagem em resolução maior (ou vídeo se disponível via `video_url`)
- Dialog com fundo escuro, imagem centralizada, nome do anúncio como título

### 3. Disponibilizar para todos os dashboards (não só platform === 'meta')

**Arquivo:** `src/pages/ClientDashboard.tsx`

- Atualmente o `CreativesGallery` só aparece quando `platform === 'meta'`. Remover essa restrição para que apareça para qualquer cliente com dados de ads disponíveis
- Manter a condição de `metaAds && metaAds.length > 0` para não mostrar vazio
- Garantir que o hook `useMetaAds` seja chamado para todos os clientes sincronizados com Meta (independente do toggle de plataforma)

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/CreativesGallery.tsx` | Editar — expandir/colapsar, dialog de preview |
| `src/pages/ClientDashboard.tsx` | Editar — mostrar criativos para todos os clientes |

