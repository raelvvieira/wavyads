# Twitter Puro

Template experimental inspirado na estrutura visual de uma publicacao do Twitter/X.

## Estado

- Disponivel somente no laboratorio de templates.
- Nao participa do seletor nem da geracao em producao.
- Usa AdaptiveText, TextSlot, MediaSlot e SlideFrame apenas no laboratorio.
- A exportacao espera o estado adaptado antes de gerar o PNG.

## Slots

- `titulo`: obrigatorio, recomendado ate 90 caracteres.
- `corpo`: opcional, recomendado ate 180 caracteres.
- `imgUrl`: opcional e usado na capa.
- `profile`: obrigatorio para nome, usuario e avatar.

## Regras de uso

Funciona melhor para tutoriais, opinioes e listas educativas. Evite quando a imagem precisa dominar a composicao ou quando a copy ultrapassa os limites rigidos registrados no manifest.

## Arquivos

- `component.tsx`: renderizacao React do slide.
- `adaptive.tsx`: controle de ajuste de texto, media e readiness.
- `manifest.ts`: identidade, slots, limites, regras e capacidades.
- `fixtures.ts`: cargas curta, media e extrema para validacao.
- `media-fixtures.ts`: imagens de teste para o laboratorio.
- `index.ts`: exportacoes publicas da pasta.
