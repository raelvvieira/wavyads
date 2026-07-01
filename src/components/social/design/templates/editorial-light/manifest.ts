import { defineTemplate } from "../template-definition";
import { EditorialLightTemplate } from "./component";
import { editorialFixtures } from "../editorial/fixtures";
import { EDITORIAL_MEDIA_FIXTURES } from "../editorial/media-fixtures";

const editorialLightDefinition = defineTemplate({
  id: "editorial-light",
  label: "Editorial Light Adaptive",
  source: "template plugavel",
  description: "Versao adaptativa do Template1 em modo claro para o laboratorio.",
  status: "experimental",
  component: EditorialLightTemplate,
  slots: {
    title: { required: true, recommendedMaxCharacters: 90, hardMaxCharacters: 180 },
    body: { required: false, recommendedMaxCharacters: 180, hardMaxCharacters: 320 },
    image: { required: false, supported: true },
    profile: { required: true },
  },
  rules: {
    supportedFormats: ["cover", "content", "statement", "tension", "cta"],
    intendedFor: ["Textos editoriais", "Narrativas informativas", "Posts com hierarquia clara"],
    avoidWhen: ["O layout precisa ser ultra compacto", "A proposta exige fundo totalmente escuro"],
  },
  capabilities: {
    adaptiveText: true,
    adaptiveMedia: true,
  },
  fixtures: editorialFixtures,
  mediaFixtures: EDITORIAL_MEDIA_FIXTURES,
});

export default editorialLightDefinition;
