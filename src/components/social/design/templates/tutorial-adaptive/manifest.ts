import { defineTemplate } from "../template-definition";
import { TutorialAdaptiveTemplate } from "./component";
import { tutorialAdaptiveFixtures } from "./fixtures";
import { TUTORIAL_MEDIA_FIXTURES } from "./media-fixtures";

const tutorialAdaptiveDefinition = defineTemplate({
  id: "tutorial-adaptive",
  label: "Tutorial Adaptive",
  source: "template plugavel",
  description: "Versao adaptativa do Template2A para o laboratorio.",
  status: "experimental",
  component: TutorialAdaptiveTemplate,
  slots: {
    title: { required: true, recommendedMaxCharacters: 90, hardMaxCharacters: 180 },
    body: { required: false, recommendedMaxCharacters: 180, hardMaxCharacters: 320 },
    image: { required: false, supported: true },
    profile: { required: true },
  },
  rules: {
    supportedFormats: ["cover", "content", "statement", "tension", "cta"],
    intendedFor: ["Tutoriais", "Passo a passo", "Carrosseis educativos"],
    avoidWhen: ["A imagem precisa ocupar a tela toda", "O layout pede atmosfera mais editorial e dramática"],
  },
  capabilities: {
    adaptiveText: true,
    adaptiveMedia: true,
  },
  fixtures: tutorialAdaptiveFixtures,
  mediaFixtures: TUTORIAL_MEDIA_FIXTURES,
});

export default tutorialAdaptiveDefinition;
