import type { TemplateFixture, TemplateFixtureId } from "../template-definition";

export const fraseMestreAdaptiveFixtures: Record<TemplateFixtureId, TemplateFixture> = {
  short: {
    id: "short",
    label: "Curta",
    description: "Cargas curtas para validar o ritmo da sequencia.",
    slides: [
      { tipo: "cover", titulo: "Escalar exige clareza", corpo: "Uma frase forte guia a sequencia inteira." },
      { tipo: "problema", titulo: "O problema cresce quando a leitura fica confusa", corpo: "Cada slide precisa carregar uma parte do raciocinio." },
      { tipo: "solucao", titulo: "Construa uma virada visivel", corpo: "Texto, contraste e ritmo precisam apontar na mesma direcao." },
      { tipo: "prova", titulo: "O efeito aparece quando a comparacao fica objetiva", corpo: "18h recuperadas | 31% menos retrabalho | 2x mais previsibilidade" },
      { tipo: "cta", titulo: "Feche com uma chamada direta", corpo: "Comenta SISTEMA para receber o mapa completo." },
    ],
  },
  medium: {
    id: "medium",
    label: "Media",
    description: "Carga realista para a Frase Mestre.",
    slides: [
      { tipo: "cover", titulo: "Como equipes pequenas crescem sem depender de herois", corpo: "Quando a frase principal lidera, o resto da sequencia fica mais facil de acompanhar." },
      { tipo: "problema", titulo: "O problema nao e volume, e direcao", corpo: "Sem ordem clara, a mensagem fica pesada antes de ficar convincente." },
      { tipo: "solucao", titulo: "Transforme a ideia em uma sequencia que ensina", corpo: "Cada slide precisa preparar o seguinte sem perder autonomia visual." },
      { tipo: "prova", titulo: "A previsibilidade aparece no meio da sequencia", corpo: "27 horas poupadas | 43% menos devolucoes | 3,1x mais clareza" },
      { tipo: "cta", titulo: "Feche a historia com um convite simples", corpo: "Use este formato quando a frase mestre precisar segurar o carrossel inteiro." },
    ],
  },
  extreme: {
    id: "extreme",
    label: "Extrema",
    description: "Textos longos para verificar o limite do conjunto.",
    slides: [
      { tipo: "cover", titulo: "Uma frase muito longa ainda precisa guiar a sequencia inteira sem esmagar o resto da narrativa, sem perder hierarquia e sem transformar o primeiro slide em um bloco pesado demais para a leitura", corpo: "Este texto estressa a capa quando a promessa precisa carregar peso demais logo de inicio." },
      { tipo: "problema", titulo: "Quando a ideia central nao esta clara, os slides seguintes passam a repetir o mesmo ponto de formas diferentes e o carrossel perde ritmo", corpo: "O leitor sente que esta avancando, mas a mensagem nao avanca junto." },
      { tipo: "solucao", titulo: "A resposta e distribuir a tensao de forma mais honesta, deixando cada slide fazer apenas uma parte do trabalho de persuasao", corpo: "Assim a narrativa ganha folego e a leitura nao se quebra no meio." },
      { tipo: "prova", titulo: "Quando o caminho fica evidente, o resultado deixa de parecer opiniao e vira sequencia compreensivel", corpo: "27 horas poupadas | 43% menos devolucoes | 3,1x mais previsibilidade" },
      { tipo: "cta", titulo: "Antes de publicar, teste a historia inteira com carga curta, media e extrema", corpo: "Se a curva se sustenta nos tres cenarios, a sequencia fica muito mais confiavel na rotina real." },
    ],
  },
};
