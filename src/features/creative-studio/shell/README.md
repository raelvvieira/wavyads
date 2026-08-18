# Shell V2 do Criativo Studio

Fase 2 e núcleo da Fase 3 do plano. **Nada aqui está ligado à página real
ainda** — a rota `/criativo-studio` continua servindo a tela antiga.

## Por que existe separado

Todos os componentes são apresentacionais: recebem dados e devolvem eventos,
sem falar com Supabase. Isso não é preciosismo de arquitetura, é o que torna
a tela verificável. O Studio real exige sessão de admin, e sem uma tela
renderizável não há como olhar o resultado — foi exatamente assim que o tema
claro quebrou por uma linha, passando por build, typecheck e testes.

## Como ver

```
npx vite --host 127.0.0.1 --port 5199
# abrir http://127.0.0.1:5199/__studio-v2
```

A rota só existe em desenvolvimento (`import.meta.env.DEV`). Ela monta os
componentes REAIS com os dados de `studioPreviewFixtures.ts`, que cobrem de
propósito os estados que passam batido: lote do Fator com cinco, edição
encadeada, arte gerando, arte que falhou e um insumo que NÃO deve aparecer
no canvas.

## O que falta para virar a tela de verdade

Ligar os dados (`useCreativeAssets`, `projectRepository`) e as ações às
edge functions, atrás da flag `creativeStudioCanvasV2`. É a Fase 4 em
diante do plano.
