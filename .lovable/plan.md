# Guia reutilizável: Meta Conversions API (conversões offline)

Gerar um documento Markdown, genérico e independente deste projeto, com todas as regras que já validamos aqui sobre envio de conversões para a Meta.

## Entrega

Um arquivo `meta-conversions-api-guia.md` em documentos (download direto), pronto para colar em outro sistema ou usar como referência/prompt para IA.

## Conteúdo do documento

1. **Visão geral** — o que é a Conversions API, quando usar Pixel Events vs Offline Dataset, e como escolher o destino (`/{pixel_id}/events` ou `/{offline_event_set_id}/events`).
2. **Credenciais necessárias** — pixel ID, offline event set ID, access token e onde guardá-los (nunca no frontend).
3. **Regras de normalização campo a campo** — tabela com: campo Meta (`em`, `ph`, `fn`, `ln`, `zp`, `ct`, `country`, `db`, `doby`, `ge`, `age`), formato exigido, transformação (lowercase, trim, remoção de acentos, só dígitos, E.164 com DDI 55 para Brasil) e quando descartar o campo em vez de enviar errado.
4. **Hashing** — SHA-256 hex minúsculo, o que hasheia e o que não hasheia, ordem (normalizar → hashear), campos que vão como array.
5. **Montagem do payload** — `event_name`, `event_time` (unix segundos), `action_source` (`system_generated` para dataset, `other` para pixel), `event_id` para deduplicação, `custom_data` com `value`/`currency`, `upload_tag`.
6. **Regras de qualidade de match** — nome e sobrenome separados (nunca nome completo em `fn`), telefone com DDI, quanto mais campos válidos melhor.
7. **Tratamento de resposta e erros** — como interpretar o retorno, registrar status enviado/erro, logar `dropped_keys`, e o que fazer em erro de token.
8. **Código de referência** — funções de normalização e hashing em TypeScript (Deno/Node), mais um exemplo completo de envio, sem amarrar a nenhum banco específico.
9. **Checklist de implantação** — testes com Test Event Code, verificação no Events Manager, vinculação de eventos offline a campanhas.

## Verificação

Revisar o arquivo renderizado antes de entregar (tabelas, blocos de código e acentuação corretos).
