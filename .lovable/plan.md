# Desabilitar tradução automática do navegador

## Problema

Navegadores (principalmente Chrome) estão traduzindo automaticamente o conteúdo do dashboard, alterando termos importantes:
- "Leads" vira "Pistas"
- "WAVY Dash" vira "Dash Ondulado"
- "Compras", "Custo/Compra", "ROAS" e outros termos podem sofrer alterações

A causa raiz é que o `index.html` declara `lang="en"`, mas o conteúdo real é em português. O Chrome detecta o mismatch e oferece (ou aplica automaticamente) a tradução, inclusive sobre nomes próprios da marca.

## Solução

Aplicar três correções padrão da web que, juntas, eliminam a tradução automática em todos os navegadores:

### 1. Corrigir o atributo `lang` no `<html>`
Mudar de `lang="en"` para `lang="pt-BR"` em `index.html`. Isso já elimina a sugestão de tradução do Chrome na maioria dos casos, pois o idioma declarado passa a bater com o conteúdo.

### 2. Adicionar meta tag global anti-tradução
No `<head>` do `index.html`, adicionar:
```html
<meta name="google" content="notranslate" />
```
Isso instrui o Google Translate (e o Chrome) a NUNCA oferecer tradução para esta página.

### 3. Adicionar atributo `translate="no"` e classe `notranslate` no `<body>`
Garante que mesmo que o usuário acione manualmente a tradução (via menu do navegador ou extensão), o conteúdo seja preservado:
```html
<body translate="no" class="notranslate">
```

## Arquivo afetado

- `index.html` — única alteração necessária. Todo o app React passa a herdar o comportamento "não traduzir".

## Resultado esperado

- O Chrome deixa de exibir o popup "Traduzir esta página"
- Mesmo se o usuário tiver tradução automática ativada globalmente no navegador, esta página será ignorada
- "WAVY Dash", "Leads", "Compras", "ROAS" e todos os demais termos aparecerão sempre exatamente como escritos no código, para todos os clientes

## Observações

- Não requer mudanças em componentes React, hooks ou edge functions
- Não afeta acessibilidade — `lang="pt-BR"` é, na verdade, mais correto para leitores de tela
- Extensões de tradução agressivas (ex: tradutores de terceiros) ainda podem forçar tradução, mas o Google Translate nativo do Chrome — que é o caso dos usuários afetados — respeita essas diretivas
