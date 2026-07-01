import { defineTemplate } from "../../templates/template-definition";
import Template5 from "./component";
import { fraseMestreAdaptiveFixtures } from "./fixtures";
import { FRASE_MESTRE_MEDIA_FIXTURES } from "./media-fixtures";

const definition = defineTemplate({
  id: "5",
  label: "5 Frase Mestre",
  source: "template plugavel",
  description: "Versao adaptativa do carrossel de frase mestre para o pipeline real.",
  status: "experimental",
  component: Template5,
  slots: {
    title: { required: true, recommendedMaxCharacters: 110, hardMaxCharacters: 220 },
    body: { required: false, recommendedMaxCharacters: 180, hardMaxCharacters: 320 },
    image: { required: false, supported: true },
    profile: { required: true },
  },
  rules: {
    supportedFormats: ["cover", "content", "statement", "tension", "cta"],
    intendedFor: ["Sequencias narrativas", "Comparacoes com virada", "Posts com fechamento forte"],
    avoidWhen: ["A estrutura precisa ser linear e simples", "A copy nao suporta cinco fases"],
  },
  capabilities: { adaptiveText: true, adaptiveMedia: true },
  fixtures: fraseMestreAdaptiveFixtures,
  mediaFixtures: FRASE_MESTRE_MEDIA_FIXTURES,
});

export default definition;
