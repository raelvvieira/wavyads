

## Plan: Criativos com Miniaturas + Nome Completo na Tabela

### 1. Corrigir nome truncado na tabela de campanhas

**Arquivo:** `src/components/CampaignsTable.tsx`

Remover `truncate max-w-[200px]` do `<span>` do nome da campanha (linha 212). Substituir por `whitespace-normal break-words min-w-[200px]` para que o nome sempre apareça completo, quebrando linha se necessário.

### 2. Buscar criativos com thumbnail da Meta API

**Arquivo:** `supabase/functions/meta-fetch-insights/index.ts`

Atualizar a action `ads` para incluir `creative{thumbnail_url,image_url}` nos fields solicitados:
```
fields=name,status,campaign_id,campaign{name},creative{thumbnail_url,image_url},insights...
```

Retornar `thumbnail_url` e `image_url` em cada ad no response.

### 3. Criar hook `useMetaAds`

**Arquivo:** `src/hooks/useMetaAds.ts` (novo)

Hook simples usando `useQuery` que chama `meta-fetch-insights` com `action: 'ads'` e retorna a lista de ads com thumbnails e métricas. Interface:

```typescript
interface MetaAd {
  id: string;
  name: string;
  status: string;
  campaign_name: string;
  thumbnail_url?: string;
  image_url?: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  cost_per_result: number;
  result_type: string;
  ctr: number;
  cpm: number;
}
```

### 4. Criar componente `CreativesGallery`

**Arquivo:** `src/components/CreativesGallery.tsx` (novo)

Seção com grid de cards, cada card mostrando:
- Miniatura do criativo (imagem da Meta API, fallback com ícone se não houver)
- Nome do anúncio
- Nome da campanha (em texto menor)
- Métricas resumidas: Gasto, Resultados, Custo/Resultado, CTR
- Badge de status (ativo/pausado)

Layout: grid responsivo (2 cols mobile, 3 cols md, 4 cols lg). Mesmo estilo glass/dark do resto do dashboard.

Inclui ordenação por gasto (desc) por padrão e filtro de status.

### 5. Integrar no ClientDashboard

**Arquivo:** `src/pages/ClientDashboard.tsx`

- Importar `useMetaAds` e `CreativesGallery`
- Chamar o hook quando plataforma for `meta` e cliente estiver sincronizado
- Inserir `<CreativesGallery>` logo após `<CampaignsTable>` (antes de RankingCharts)

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/meta-fetch-insights/index.ts` | Editar — adicionar `creative{thumbnail_url,image_url}` nos fields da action `ads` |
| `src/hooks/useMetaAds.ts` | Criar — hook para buscar ads com thumbnails |
| `src/components/CreativesGallery.tsx` | Criar — grid de cards com miniaturas e métricas |
| `src/components/CampaignsTable.tsx` | Editar — remover truncate do nome da campanha |
| `src/pages/ClientDashboard.tsx` | Editar — integrar hook e componente |

