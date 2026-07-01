import { defineTemplate } from "../template-definition";
import { EditorialDarkTemplate } from "./component";
import { editorialFixtures } from "../editorial/fixtures";
import { EDITORIAL_MEDIA_FIXTURES } from "../editorial/media-fixtures";

const editorialDarkDefinition = defineTemplate({
  id: "editorial-dark",
  label: "Editorial Dark Adaptive",
  source: "template plugavel",
  description: "Versao adaptativa do Template1 em modo escuro para o laboratorio.",
  status: "experimental",
  component: EditorialDarkTemplate,
  slots: {
    title: { required: true, recommendedMaxCharacters: 90, hardMaxCharacters: 180 },
    body: { required: false, recommendedMaxCharacters: 180, hardMaxCharacters: 320 },
    image: { required: false, supported: true },
    profile: { required: true },
  },
  rules: {
    supportedFormats: ["cover", "content", "statement", "tension", "cta"],
    intendedFor: ["Textos editoriais", "Narrativas dramaticas", "Posts com mais contraste"],
    avoidWhen: ["O briefing pede fundo claro e arejado", "A imagem precisa dominar completamente o slide"],
  },
  capabilities: {
    adaptiveText: true,
    adaptiveMedia: true,
  },
  fixtures: editorialFixtures,
  mediaFixtures: EDITORIAL_MEDIA_FIXTURES,
});

export default editorialDarkDefinition;
