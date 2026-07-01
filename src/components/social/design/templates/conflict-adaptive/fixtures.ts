import type { TemplateFixture, TemplateFixtureId } from "../template-definition";

export const conflictAdaptiveFixtures: Record<TemplateFixtureId, TemplateFixture> = {
  short: {
    id: "short",
    label: "Curta",
    description: "Textos curtos para validar contraste e hierarquia.",
    slides: [
      { tipo: "cover", titulo: "Escalar exige escolha", corpo: "Nao existe crescimento sem custo." },
      { tipo: "problema", titulo: "Dois mundos, uma decisao", corpo: "Trabalho solto ou processo claro?" },
      { tipo: "solucao", titulo: "Escolha uma direcao", corpo: "Um sistema bem desenhado reduz ruído." },
      { tipo: "prova", titulo: "Menos improviso, mais previsibilidade", corpo: "Antes | Depois" },
      { tipo: "cta", titulo: "Comenta metodo", corpo: "Use esse modelo quando a decisao precisar ficar visivel." },
    ],
  },
  medium: {
    id: "medium",
    label: "Media",
    description: "Carga realista para validar leitura em contraste.",
    slides: [
      { tipo: "cover", titulo: "Como uma escolha mal definida cria duas operacoes dentro da mesma equipe", corpo: "Quando cada lado do processo acha que tem razao, o retrabalho vira rotina." },
      { tipo: "problema", titulo: "Um lado corre, o outro compensa", corpo: "Sem regra comum, a energia some tentando alinhar o que deveria estar padrao." },
      { tipo: "solucao", titulo: "Padronize a decisao que mais se repete", corpo: "O processo fica mais curto quando o criterio deixa de ser negociado toda vez." },
      { tipo: "prova", titulo: "A previsibilidade aparece quando o antes e o depois ficam faceis de comparar", corpo: "Mais clareza | Menos retrabalho" },
      { tipo: "cta", titulo: "Comenta metodo e guarde o modelo", corpo: "Esse formato ajuda quando o contraste precisa ser o proprio argumento." },
    ],
  },
  extreme: {
    id: "extreme",
    label: "Extrema",
    description: "Texto longo para forcar o grid de duas colunas e o corpo central.",
    slides: [
      { tipo: "cover", titulo: "Uma decisao mal explicada pode dividir a equipe em dois fluxos que nao conversam, nao medem a mesma coisa e nao percebem que estao resolvendo o mesmo problema de jeitos diferentes", corpo: "Este titulo estressa o limite do contraste quando o layout precisa continuar claro mesmo sob carga pesada." },
      { tipo: "problema", titulo: "Sem referencia comum, cada lado da operacao cria sua propria verdade e a equipe passa a discutir metodo em vez de resolver trabalho", corpo: "O resultado e um ambiente onde a saida de uma pessoa precisa ser traduzida antes de a proxima continuar, e isso custa tempo, energia e consistencia." },
      { tipo: "solucao", titulo: "A forma mais segura de reduzir conflito repetido e colocar o criterio no centro do processo, onde qualquer pessoa consiga ler, validar e aplicar", corpo: "Quanto mais a decisao e documentada com clareza, menos ela depende de interpretacao individual para seguir adiante." },
      { tipo: "prova", titulo: "Quando o antes e o depois ficam visiveis, a diferença de comportamento deixa de ser opiniao e vira evidencia", corpo: "Comparar os dois lados melhora o aprendizado e reduz o esforço de convencimento." },
      { tipo: "cta", titulo: "Comenta metodo para receber o modelo de comparacao", corpo: "Use o formato quando a copy precisar mostrar uma virada clara sem esmagar o leitor com excesso de texto." },
    ],
  },
};
