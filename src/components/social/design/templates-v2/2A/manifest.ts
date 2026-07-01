import { defineTemplate } from "../../templates/template-definition";
import Template2A from "./component";
import { editorialFixtures } from "./fixtures";
import { EDITORIAL_MEDIA_FIXTURES } from "./media-fixtures";

const definition = defineTemplate({
  id: "2A",
  label: "2A Storytelling",
  source: "template plugavel",
  description: "Versao adaptativa do editorial claro para storytelling.",
  status: "experimental",
  component: Template2A,
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
  capabilities: { adaptiveText: true, adaptiveMedia: true },
  fixtures: editorialFixtures,
  mediaFixtures: EDITORIAL_MEDIA_FIXTURES,
});

export default definition;
