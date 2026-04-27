# Teste end-to-end de envio de conversões para a Meta

Cliente confirmado: **Deni Haut Cursos** (`b0a56fa1-5369-4031-a1c7-72a10e22dda2`), pixel `967155247888675` já configurado com token salvo.

## Como rodar o teste

A maneira mais segura e que reflete o fluxo real do usuário é usar a própria UI de **"Registrar Conversão" → aba "Registro em quantidade"** que já criamos. Não preciso modificar código.

### Passos

1. Abrir o dashboard da Deni Haut Cursos (já está na rota correta).
2. Clicar em **Registrar Conversão**.
3. Selecionar a aba **Registro em quantidade**.
4. Preencher 9 linhas com os dados abaixo (data: **20/05/2026** em todas, valor conforme tabela, moeda BRL implícita).
5. Clicar em **Enviar todas**.

### Dados normalizados para colar

| # | Email | Telefone | Nome (fn) | Sobrenome (ln) | Valor |
|---|---|---|---|---|---|
| 1 | oficialglauciaribeiro@gmail.com | +5511728283 88 | Glaucia | Maria Ribeiro da Silva | 2880 |
| 2 | paulavoitechen@gmail.com | +554188550204 | Paula | Caroline Voitechen Ferreira | 2530 |
| 3 | jeicianecrispim1995@hotmail.com | +5548993072 51 | Jeiciane | Crispim | 2530 |
| 4 | taai246.tgr@gmail.com | +5567813860 76 | Tainara | Gonçalves Rodrigues | 2880 |
| 5 | amanda.cosmético@gmail.com | +5512912838 43 | Amanda | Diniz | 2880 |
| 6 | vitoriairis98@gmail.com | +5588938101 97 | Vitória | Íris Teixeira Gomes | 2880 |
| 7 | juliana.ferreira.s@hotmail.com | +5565999350 43 | Juliana | Aparecida Ferreira da Silva | 2400 |
| 8 | dramarianarossi@gmail.com | +553492508080 | Mariana | Rossi | 2880 |
| 9 | marianerenata@gmail.com | +558197239304 | Mariane | Renata Aires Gonçalves | 2880 |

Observações sobre os dados de origem:
- Os telefones serão normalizados pelo edge function (remove tudo exceto dígitos, mantém `+`).
- O campo "Nome" original tinha nome+sobrenome juntos — separei o primeiro nome em `fn` e o restante em `ln` para melhorar o Event Match Quality.
- O e-mail `amanda.cosmético@gmail.com` contém acento — a Meta aceita, mas é provável que esse e-mail não corresponda a uma conta real. Se quiser, removo essa linha antes do envio.

## Alternativa: rodar via script (caso prefira automatizado)

Se preferir que eu execute o teste sem você abrir a UI, posso, ao sair do modo plano:

1. Inserir as 9 linhas em `offline_conversions` via migração (status `pending`).
2. Para cada `id`, chamar a edge function `send-offline-conversion` autenticado.
3. Ler de volta a tabela e te mostrar:
   - quantos foram `sent` × `error`,
   - o `meta_event_id` retornado,
   - mensagem de erro detalhada caso a Meta rejeite alguma.

## O que esperar

- Cada chamada retorna `{ ok: true, event_id, meta }` quando a Meta aceita (HTTP 200).
- Erros típicos a observar:
  - **190** / token inválido → reconfigurar Pixel.
  - **100** / parâmetro inválido → revisar normalização.
  - Linhas duplicadas dentro de 7 dias serão deduplicadas pela Meta usando `event_id` (que é o id da linha).

## Qual caminho prefere?

- **A**: você roda pela UI (passo a passo acima).
- **B**: eu rodo via script automatizado e te entrego o relatório.