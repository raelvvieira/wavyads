import type { TemplateFixture, TemplateFixtureId } from "../template-definition";

export const postFraseFixtures: Record<TemplateFixtureId, TemplateFixture> = {
  short: {
    id: "short",
    label: "Curta",
    description: "Frases diretas e pouco texto de apoio.",
    slides: [
      { tipo: "cover", titulo: "A frase que para tudo", corpo: "Quando a copy acerta, a imagem respira." },
      { tipo: "problema", titulo: "O ruido rouba o foco", corpo: "Muita informação derruba a ideia principal." },
      { tipo: "solucao", titulo: "Uma mensagem, um eixo", corpo: "Escolha um ponto de vista e repita com força." },
      { tipo: "prova", titulo: "Menos distração, mais leitura", corpo: "O slide fica mais forte quando o olho encontra um caminho." },
      { tipo: "cta", titulo: "Salve para usar depois", corpo: "Compartilhe este modelo quando a frase precisar liderar." },
    ],
  },
  medium: {
    id: "medium",
    label: "Media",
    description: "Equilibrio entre impacto visual e contexto.",
    slides: [
      { tipo: "cover", titulo: "Como uma frase forte segura a atenção quando a imagem quer falar junto", corpo: "O segredo e dar espaço para o texto principal respirar sem perder a energia da peça." },
      { tipo: "problema", titulo: "Quando tudo compete pela mesma area", corpo: "Imagem, titulo e legenda entram na disputa e nada termina de entrar na cabeça de quem olha." },
      { tipo: "solucao", titulo: "Deixe a frase mandar na composicao", corpo: "Use contraste, ritmo e hierarquia para guiar a leitura em segundos." },
      { tipo: "prova", titulo: "A leitura melhora quando o caminho fica claro", corpo: "Mais foco visual reduz esforço, melhora retenção e acelera a compreensão." },
      { tipo: "cta", titulo: "Teste este modelo com sua melhor frase", corpo: "Troque a copia e veja como a imagem passa a servir a mensagem." },
    ],
  },
  extreme: {
    id: "extreme",
    label: "Extrema",
    description: "Cargas longas para forcar o limite do arranjo com foto.",
    slides: [
      {
        tipo: "cover",
        titulo: "Uma frase muito longa ainda precisa caber sem esmagar a imagem de fundo, sem perder a leitura e sem transformar o slide em um bloco pesado demais para o olho",
        corpo: "Este texto testa o comportamento extremo do template quando a ideia principal exige muito mais espaço do que o normal.",
      },
      {
        tipo: "problema",
        titulo: "Quando o texto cresce sem limite, a composicao inteira começa a perder o centro e o leitor precisa trabalhar demais para entender o que deveria ser imediato",
        corpo: "O resultado costuma ser um slide apertado, com linhas demais, pouco respiro e uma imagem que deixa de apoiar a leitura para virar obstaculo visual.",
      },
      {
        tipo: "solucao",
        titulo: "A resposta e reorganizar a hierarquia para que a frase continue dominante mesmo quando o conteúdo vem maior do que o planejado originalmente",
        corpo: "O layout precisa ceder onde faz sentido, encurtar onde for necessario e preservar o foco no ponto principal da mensagem.",
      },
      {
        tipo: "prova",
        titulo: "Com mais previsibilidade no fluxo visual, a leitura exige menos esforço e a intenção da peça fica mais clara mesmo em cenarios mais carregados",
        corpo: "Essa clareza ajuda a imagem a sustentar a frase em vez de competir com ela.",
      },
      {
        tipo: "cta",
        titulo: "Antes de publicar, teste a mesma estrutura com uma frase curta, uma media e uma extrema para validar o equilibrio do conjunto inteiro",
        corpo: "Se a composicao aguenta os tres cenarios, ela tende a funcionar melhor na rotina real.",
      },
    ],
  },
};
