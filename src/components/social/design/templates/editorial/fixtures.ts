import type { TemplateFixture, TemplateFixtureId } from "../template-definition";

export const editorialFixtures: Record<TemplateFixtureId, TemplateFixture> = {
  short: {
    id: "short",
    label: "Curta",
    description: "Textos diretos para validar o ritmo visual do editorial.",
    slides: [
      { tipo: "cover", titulo: "Escalar exige clareza", corpo: "Crescer sem perder o controle." },
      { tipo: "problema", titulo: "O gargalo invisivel", corpo: "Mais demanda nao corrige uma operacao confusa." },
      { tipo: "solucao", titulo: "Desenhe o sistema", corpo: "Defina dono, prazo e criterio de qualidade." },
      { tipo: "prova", titulo: "Menos ruido, mais margem", corpo: "12h poupadas | 31% mais margem | 2x mais ritmo" },
      { tipo: "cta", titulo: "Organize antes de acelerar", corpo: "Comenta SISTEMA para receber o mapa." },
    ],
  },
  medium: {
    id: "medium",
    label: "Media",
    description: "Carga realista para medir titulo, corpo e imagem ao mesmo tempo.",
    slides: [
      {
        tipo: "cover",
        titulo: "Como equipes pequenas constroem operacoes que crescem sem depender de herois",
        corpo: "O sistema certo transforma conhecimento individual em desempenho repetivel.",
      },
      {
        tipo: "problema",
        titulo: "O problema nao e falta de talento",
        corpo: "Quando cada pessoa executa do seu jeito, a empresa confunde autonomia com improviso e paga essa conta em retrabalho.",
      },
      {
        tipo: "solucao",
        titulo: "Transforme decisoes recorrentes em um sistema visivel",
        corpo: "Mapeie entradas, responsaveis, criterios de qualidade e o momento exato em que cada etapa precisa avancar.",
      },
      {
        tipo: "prova",
        titulo: "A previsibilidade aparece nos numeros",
        corpo: "18 horas poupadas por semana | 31% menos retrabalho | 2,4x mais entregas no prazo",
      },
      {
        tipo: "cta",
        titulo: "Antes de contratar mais gente, organize o trabalho que ja existe",
        corpo: "Comenta SISTEMA e use este diagnostico na sua proxima reuniao de operacao.",
      },
    ],
  },
  extreme: {
    id: "extreme",
    label: "Extrema",
    description: "Textos longos de proposito para estressar o layout adaptativo.",
    slides: [
      {
        tipo: "cover",
        titulo: "O crescimento que parece uma vitoria pode esconder uma operacao cada vez mais lenta, cara e dependente das mesmas pessoas",
        corpo: "Este titulo ultrapassa o tamanho recomendado de proposito para expor como o layout reage quando a copy vem maior do que o espaco planejado.",
      },
      {
        tipo: "problema",
        titulo: "Toda urgencia vira prioridade quando o sistema nao deixa claro quem decide, quem executa e qual resultado realmente encerra uma tarefa",
        corpo: "A equipe passa o dia respondendo mensagens, alternando contexto e corrigindo entregas que pareciam prontas. O volume aumenta, mas a capacidade real permanece igual porque o processo continua dependendo de memoria, disponibilidade e interpretacao individual.",
      },
      {
        tipo: "solucao",
        titulo: "Um processo confiavel precisa continuar funcionando mesmo quando o fundador, o melhor analista ou a pessoa mais experiente nao esta disponivel",
        corpo: "Registre as entradas obrigatorias, transforme criterios subjetivos em exemplos observaveis, limite o trabalho simultaneo, defina os pontos de aprovacao e mostre o que deve acontecer quando uma informacao chega incompleta ou fora do prazo combinado.",
      },
      {
        tipo: "prova",
        titulo: "O efeito aparece quando menos energia e gasta para coordenar e mais energia permanece disponivel para produzir trabalho de qualidade",
        corpo: "27 horas recuperadas por semana | 43% menos devolucoes internas depois da primeira revisao | 3,1x mais previsibilidade entre a promessa comercial e a entrega final ao cliente",
      },
      {
        tipo: "cta",
        titulo: "Antes de adicionar mais uma ferramenta, uma reuniao ou uma nova contratacao, descubra exatamente onde o trabalho perde contexto e precisa ser refeito",
        corpo: "Comenta SISTEMA para receber o mapa completo de diagnostico operacional e aplique cada pergunta com a sua equipe antes do proximo ciclo de planejamento.",
      },
    ],
  },
};
