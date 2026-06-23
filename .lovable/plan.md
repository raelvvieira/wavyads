# Salvar guia Meta CAPI Offline como memória do projeto

Vou salvar o guia completo de envio de conversões offline para Meta CAPI como uma memória de referência (`mem://features/meta-capi/offline-conversion-guide`) para que futuras sessões e outros projetos possam reutilizá-lo.

## Arquivos a criar/editar

**1) Criar `mem://features/meta-capi/offline-conversion-guide.md`** (type: reference)

Conteúdo:
- Arquitetura (fluxo frontend → edge function → Meta Graph API v24.0)
- Decisão de modo (Offline Dataset vs Pixel Events) baseada em `offline_event_set_id`
- 10 regras de normalização Meta CAPI (em, ph, fn, ln, ct, zp, country, db, doby, ge, age)
- Padrões críticos: `addHashed` helper, ordem country→zip, `event_id` para dedup, logging de `included_keys`/`dropped_keys`
- Schema SQL mínimo das tabelas `client_pixels` e `offline_conversions`
- Passos para portar para outro projeto

**2) Atualizar `mem://index.md`**

Adicionar referência ao novo arquivo na seção "Memories":
```
- [Meta CAPI Offline Guide](mem://features/meta-capi/offline-conversion-guide) — Reusable normalization rules and edge function pattern for Meta Offline Conversions
```

## Fora do escopo
- Nenhuma mudança em código, schema, ou edge functions
- Apenas persistência de documentação como memória do projeto

Aprove o plano para eu salvar a memória.
