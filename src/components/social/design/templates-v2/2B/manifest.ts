import { defineTemplate } from "../../templates/template-definition";
import Template2B from "./component";
import { editorialFixtures } from "./fixtures";
import { EDITORIAL_MEDIA_FIXTURES } from "./media-fixtures";

const definition = defineTemplate({
  id: "2B",
  label: "2B Editorial Dark",
  source: "template plugavel",
  description: "Versao adaptativa do editorial escuro para o pipeline real.",
  status: "experimental",
  component: Template2B,
  slots: {
    title: { required: true, recommendedMaxCharacters: 90, hardMaxCharacters: 180 },
    body: { required: false, recommendedMaxCharacters: 180, hardMaxCharacters: 320 },
    image: { required: false, supported: true },
    profile: { required: true },
  },
  rules: {
    supportedFormats: ["cover", "content", "statement", "tension", "cta"],
    intendedFor: ["Textos editoriais", "Narrativas dramáticas", "Posts com mais contraste"],
    avoidWhen: ["O briefing pede fundo claro e arejado", "A imagem precisa dominar completamente o slide"],
  },
  capabilities: { adaptiveText: true, adaptiveMedia: true },
  fixtures: editorialFixtures,
  mediaFixtures: EDITORIAL_MEDIA_FIXTURES,
});

export default definition;
