## Objetivo

No diálogo "Registrar Conversão" (`OfflineConversionDialog.tsx`), impedir que o usuário coloque nome e sobrenome juntos no campo **Nome**. O sobrenome deve ir no campo **Sobrenome**.

## Regra

- Considerar inválido se o valor do campo **Nome** contiver espaço entre duas ou mais palavras com letras (ex.: "Maria Silva"), ignorando espaços nas pontas.
- Aplicar tanto no modo **Registro único** quanto no **Registro em quantidade** (validar a coluna Nome de cada linha).

## Feedback ao usuário

- No modo único: ao tentar enviar, mostrar toast de erro e marcar o campo Nome com mensagem inline:
  "O sobrenome deve ser colocado no campo Sobrenome. Use apenas o primeiro nome aqui."
- Bloquear o submit enquanto o campo estiver inválido.
- No modo quantidade: toast indicando quais linhas têm o problema (ex.: "Linha 3: separe o sobrenome na coluna Sobrenome") e bloquear o envio em lote.

## Detalhes técnicos

- Editar apenas `src/components/OfflineConversionDialog.tsx`.
- Criar helper local `hasCompoundName(value: string)` que retorna `true` quando `value.trim().split(/\s+/).filter(p => /\p{L}/u.test(p)).length > 1`.
- Adicionar estado `nameError` para o modo único; renderizar mensagem abaixo do input de Nome quando preenchido.
- No handler de submit (único e lote), abortar com `toast` se a regra falhar.
- Sem mudanças em banco, edge functions ou payload da Meta.
