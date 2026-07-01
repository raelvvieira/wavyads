# Post Frase Adaptive

Versao experimental do Template3 para testar frases fortes com fundo de imagem no laboratorio.

## Estado

- Disponivel apenas no laboratorio de templates.
- Nao participa do seletor de producao.
- Usa AdaptiveText, TextSlot, MediaSlot e SlideFrame, com exportacao aguardando o estado pronto.

## Slots

- `titulo`: obrigatorio, com foco em frase grande.
- `corpo`: opcional, usado como apoio, contexto ou CTA.
- `imgUrl`: opcional, atua como fundo visual.
- `profile`: obrigatorio para nome e handle.

## Regras de uso

Funciona melhor para posts de frase, opiniao curta e composicoes com imagem de apoio. Evite quando a imagem precisar competir com a mensagem principal.

## Arquivos

- `component.tsx`: composicao adaptativa do slide.
- `manifest.ts`: identidade, regras, capacidades e fixtures.
- `fixtures.ts`: cargas curta, media e extrema.
- `media-fixtures.ts`: variantes de imagem para o laboratorio.
- `index.ts`: exports publicos da pasta.
