## Goal
Permitir que o usuário escolha o tipo de evento (Purchase ou Lead) ao registrar uma conversão offline. Quando o evento for **Lead**, o campo de Valor é ocultado e a conversão é enviada à Meta sem `custom_data.value/currency`, usando `event_name: "Lead"`.

## UI Changes — `src/components/OfflineConversionDialog.tsx`

1. **Adicionar campo "Tipo de Evento"** no `DraftForm` (acima da grade Data + Valor):
   - Select com opções: `Purchase` (padrão) e `Lead`.
   - Estado `eventName: 'Purchase' | 'Lead'` no `ConversionDraft` (default `'Purchase'`).

2. **Layout condicional Data/Valor**:
   - Se `eventName === 'Lead'`: mostrar apenas o campo Data (full width); ocultar Valor.
   - Se `eventName === 'Purchase'`: comportamento atual (grade 2 colunas com Data + Valor).

3. **Texto de rodapé do formulário** (linha "Moeda: BRL · Evento: Purchase · País: BR"):
   - Refletir dinamicamente o `eventName`. Quando Lead, omitir "Moeda: BRL".

4. **Validação (`validateDraft`)**:
   - Manter regra: e-mail OU telefone obrigatório.
   - Validar `value` apenas quando `eventName === 'Purchase'`.
   - Para `Lead`, `value` é ignorado.

5. **`submitDraft`** — ao inserir em `offline_conversions`:
   - `event_name: d.eventName` (em vez de fixo `'Purchase'`).
   - Se `Lead`: `value: null`, `currency: null`.
   - Se `Purchase`: comportamento atual (`value: number`, `currency: 'BRL'`).

6. **Modo "Registro em quantidade"**: como cada draft tem seu próprio `eventName`, cada linha pode ser independentemente Purchase ou Lead. Sem mudanças adicionais na lógica de loop.

## Edge Function — `supabase/functions/send-offline-conversion/index.ts`
Já está compatível:
- Usa `conv.event_name || "Purchase"` para `event_name`.
- Só inclui `custom_data.value/currency` quando `conv.value` está presente (`isPresent`).

Como o insert para Lead grava `value: null`, a função automaticamente envia o evento sem `custom_data`, exatamente como a Meta espera para eventos Lead offline. **Nenhuma mudança necessária na edge function.**

## Validação pós-implementação
- Registrar 1 conversão Purchase e 1 conversão Lead (ambas pelo mesmo cliente teste).
- Verificar via `psql`/read_query que `event_name` está correto e `value` é `null` para Lead.
- Confirmar resposta `events_received: 1` no `meta_event_id` retornado pela Meta CAPI.