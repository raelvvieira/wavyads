import { defineTemplate } from "../template-definition";
import { Template3Adaptive } from "./component";
import { postFraseFixtures } from "./fixtures";
import { POST_FRASE_MEDIA_FIXTURES } from "./media-fixtures";

const postFraseDefinition = defineTemplate({
  id: "post-frase",
  label: "Post Frase Adaptive",
  source: "template plugavel",
  description: "Versao adaptativa do Template3 para testar frase longa com fundo de imagem.",
  status: "experimental",
  component: Template3Adaptive,
  slots: {
    title: { required: true, recommendedMaxCharacters: 120, hardMaxCharacters: 220 },
    body: { required: false, recommendedMaxCharacters: 160, hardMaxCharacters: 300 },
    image: { required: false, supported: true },
    profile: { required: true },
  },
  rules: {
    supportedFormats: ["cover", "content", "statement", "tension", "cta"],
    intendedFor: ["Frases", "Opiniao curta", "Posts com fundo editorial"],
    avoidWhen: ["A imagem nao pode ficar em segundo plano", "A copy precisa de uma estrutura de lista"],
  },
  capabilities: {
    adaptiveText: true,
    adaptiveMedia: true,
  },
  fixtures: postFraseFixtures,
  mediaFixtures: POST_FRASE_MEDIA_FIXTURES,
});

export default postFraseDefinition;
