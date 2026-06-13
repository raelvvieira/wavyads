## Tornar "Cidade desta campanha" opcional

Em `src/pages/GoogleAdsAIPage.tsx` (Etapa 1 do gerador de Google Ads I.A):

1. **Label (linha 448)** — remover o `*` vermelho de obrigatório:
   - De: `Cidade desta campanha *`
   - Para: `Cidade desta campanha (opcional)`

2. **Botão "Sugerir grupos com I.A" (linha 482)** — remover `!cidadeCampanha.trim()` da condição `disabled`, mantendo só a checagem de site/descrição.

Nenhuma alteração na edge function `google-ads-ai-gen` é necessária — ela já trata `cidadeCampanha` como opcional (`body.cidadeCampanha || ""`) e usa fallback para a cidade detectada pela análise do site quando o campo vem vazio. Os prompts e o `cidadeWarning()` só são acionados quando há valor, então campanhas sem cidade simplesmente seguem o fluxo nacional/genérico.

Sem mudanças em backend, banco ou outros componentes.