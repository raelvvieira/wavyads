import { defineTemplate } from "../../templates/template-definition";
import Template4 from "./component";
import { postFraseFixtures } from "./fixtures";
import { POST_FRASE_MEDIA_FIXTURES } from "./media-fixtures";

const definition = defineTemplate({
  id: "4",
  label: "4 Post Frase",
  source: "template plugavel",
  description: "Versao adaptativa do template de frase unica para o pipeline real.",
  status: "experimental",
  component: Template4,
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
  capabilities: { adaptiveText: true, adaptiveMedia: true },
  fixtures: postFraseFixtures,
  mediaFixtures: POST_FRASE_MEDIA_FIXTURES,
});

export default definition;
