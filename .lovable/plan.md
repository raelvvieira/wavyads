
## Diagnóstico (Nubeauty)

Configuração técnica está OK:
- `client_pixels.pixel_id = 2285595601971046` ✅
- `access_token` salvo (199 chars) ✅
- Últimos 7 eventos: `send_status = 'sent'`, sem erro, `meta_event_id` salvo ✅

A Meta está **recebendo**, mas **não atribui** porque hoje a edge function `send-offline-conversion` envia para `/{pixel_id}/events` com `action_source: "other"`. Para vendas vindas de CRM, a Meta espera o **Offline Conversions dataset** (`/{offline_event_set_id}/events`) com `action_source: "system_generated"` — só assim entra como conversão offline atribuída na campanha.

Você pediu para resolver **apenas para a Nubeauty**, mantendo só telefone como match key.

## Mudanças (escopo: somente Nubeauty)

### 1. Cadastrar o Offline Event Set ID da Nubeauty
Adicionar uma coluna `offline_event_set_id` (nullable) em `client_pixels` e preenchê-la **só para a Nubeauty**. Demais clientes ficam com `NULL` e seguem no fluxo atual sem qualquer mudança de comportamento.

Você vai precisar pegar esse ID no Gerenciador de Eventos da Meta da Nubeauty:
**Gerenciador de Eventos → Fontes de Dados → Conjunto de Eventos Offline → copiar o ID numérico.**

### 2. Edge function `send-offline-conversion`: roteamento condicional
Lógica nova, sem afetar outros clientes:
- Buscar `offline_event_set_id` junto com `pixel_id`/`access_token`.
- **Se existir** (caso Nubeauty): POST em `https://graph.facebook.com/v24.0/{offline_event_set_id}/events`, `action_source: "system_generated"`, `upload_tag: "wavy_dash_crm"`.
- **Se não existir** (todos os outros): mantém exatamente o comportamento atual (`/{pixel_id}/events`, `action_source: "other"`).
- `user_data` continua só com `ph` hasheado.
- `event_id` continua sendo o `id` da linha em `offline_conversions` (dedupe garantido).

### 3. Reenviar histórico da Nubeauty
Depois que o ID for cadastrado, reenviar as 7 conversões já marcadas como `sent` chamando a edge function para cada uma. A Meta deduplica pelo `event_id`, então é seguro — o efeito é transferir o histórico para o dataset offline e permitir atribuição retroativa dentro da janela (7 dias clique / 1 dia view por padrão).

## O que NÃO muda

- Schema de `offline_conversions`.
- UI de cadastro de Pixel + Token (nenhum campo novo na interface — o `offline_event_set_id` da Nubeauty é gravado direto no banco).
- Comportamento para qualquer outro cliente.
- Hash SHA-256, normalizações, CORS, auth.

## Próximo passo seu

Me envie o **ID do Conjunto de Eventos Offline da Nubeauty** (número que aparece no Gerenciador de Eventos da Meta) para eu gravar no banco junto com a migration.
