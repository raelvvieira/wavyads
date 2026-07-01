import { defineTemplate } from "../../templates/template-definition";
import Template1A from "./component";
import { tutorialAdaptiveFixtures } from "./fixtures";
import { TUTORIAL_MEDIA_FIXTURES } from "./media-fixtures";

const definition = defineTemplate({
  id: "1A",
  label: "1A Tutorial",
  source: "template plugavel",
  description: "Versao adaptativa do template de tutorial para o pipeline real.",
  status: "experimental",
  component: Template1A,
  slots: {
    title: { required: true, recommendedMaxCharacters: 90, hardMaxCharacters: 180 },
    body: { required: false, recommendedMaxCharacters: 180, hardMaxCharacters: 320 },
    image: { required: false, supported: true },
    profile: { required: true },
  },
  rules: {
    supportedFormats: ["cover", "content", "statement", "tension", "cta"],
    intendedFor: ["Tutoriais", "Passo a passo", "Carrosseis educativos"],
    avoidWhen: ["A imagem precisa ocupar a tela toda", "O layout pede atmosfera editorial mais dramática"],
  },
  capabilities: { adaptiveText: true, adaptiveMedia: true },
  fixtures: tutorialAdaptiveFixtures,
  mediaFixtures: TUTORIAL_MEDIA_FIXTURES,
});

export default definition;
