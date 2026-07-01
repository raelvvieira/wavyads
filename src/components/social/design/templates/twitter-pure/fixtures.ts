import type { TemplateFixture, TemplateFixtureId } from "../template-definition";

export const twitterPureFixtures: Record<TemplateFixtureId, TemplateFixture> = {
  short: {
    id: "short",
    label: "Curta",
    description: "Textos curtos, proximos de um post direto.",
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
    description: "Carga realista para validar a leitura no formato Twitter Puro.",
    slides: [
      { tipo: "cover", titulo: "Como equipes pequenas crescem sem depender de herois", corpo: "O sistema certo transforma conhecimento individual em desempenho repetivel." },
      { tipo: "problema", titulo: "O problema nao e falta de talento", corpo: "Quando cada pessoa executa do seu jeito, a empresa confunde autonomia com improviso e paga essa conta em retrabalho." },
      { tipo: "solucao", titulo: "Transforme decisoes recorrentes em um sistema visivel", corpo: "Mapeie entradas, responsaveis, criterios de qualidade e o momento exato em que cada etapa precisa avancar." },
      { tipo: "prova", titulo: "A previsibilidade aparece nos numeros", corpo: "18 horas poupadas por semana | 31% menos retrabalho | 2,4x mais entregas no prazo" },
      { tipo: "cta", titulo: "Organize o trabalho antes de contratar", corpo: "Comenta SISTEMA e use este diagnostico na sua proxima reuniao." },
    ],
  },
  extreme: {
    id: "extreme",
    label: "Extrema",
    description: "Carga deliberadamente excessiva para preparar a futura adaptacao.",
    slides: [
      { tipo: "cover", titulo: "O crescimento que parece uma vitoria pode esconder uma operacao cada vez mais lenta, cara e dependente das mesmas pessoas", corpo: "Este texto ultrapassa o tamanho recomendado de proposito para revelar o limite atual do template antes do AdaptiveText." },
      { tipo: "problema", titulo: "Toda urgencia vira prioridade quando o sistema nao deixa claro quem decide, quem executa e qual resultado realmente encerra uma tarefa", corpo: "A equipe passa o dia respondendo mensagens, alternando contexto e corrigindo entregas que pareciam prontas. O volume aumenta, mas a capacidade real permanece igual porque o processo continua dependendo de memoria e interpretacao individual." },
      { tipo: "solucao", titulo: "Um processo confiavel continua funcionando mesmo quando a pessoa mais experiente nao esta disponivel", corpo: "Registre entradas obrigatorias, transforme criterios subjetivos em exemplos observaveis, limite o trabalho simultaneo e defina os pontos de aprovacao." },
      { tipo: "prova", titulo: "O efeito aparece quando menos energia e gasta para coordenar", corpo: "27 horas recuperadas por semana | 43% menos devolucoes internas | 3,1x mais previsibilidade entre a promessa comercial e a entrega final" },
      { tipo: "cta", titulo: "Antes de adicionar mais uma ferramenta, descubra exatamente onde o trabalho perde contexto e precisa ser refeito", corpo: "Comenta SISTEMA para receber o mapa completo de diagnostico operacional e aplicar cada pergunta com a sua equipe." },
    ],
  },
};
