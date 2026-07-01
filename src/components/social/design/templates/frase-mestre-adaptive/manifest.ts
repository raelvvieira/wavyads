import { defineTemplate } from "../template-definition";
import { FraseMestreAdaptiveTemplate } from "./component";
import { fraseMestreAdaptiveFixtures } from "./fixtures";
import { FRASE_MESTRE_MEDIA_FIXTURES } from "./media-fixtures";

const fraseMestreAdaptiveDefinition = defineTemplate({
  id: "frase-mestre-adaptive",
  label: "Frase Mestre Adaptive",
  source: "template plugavel",
  description: "Versao adaptativa do Template4 para o laboratorio.",
  status: "experimental",
  component: FraseMestreAdaptiveTemplate,
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
  capabilities: {
    adaptiveText: true,
    adaptiveMedia: true,
  },
  fixtures: fraseMestreAdaptiveFixtures,
  mediaFixtures: FRASE_MESTRE_MEDIA_FIXTURES,
});

export default fraseMestreAdaptiveDefinition;
