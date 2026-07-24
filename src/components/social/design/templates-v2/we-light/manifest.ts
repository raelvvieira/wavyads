import { defineTemplate } from "../../templates/template-definition";
import WavyEditorialLight from "./component";
import { editorialFixtures } from "./fixtures";
import { EDITORIAL_MEDIA_FIXTURES } from "../2B/media-fixtures";

const definition = defineTemplate({
  id: "we-light",
  label: "Wavy Editorial · Claro",
  source: "template plugavel",
  description: "Editorial minimalista tipo print de tweet, fundo claro. Masthead, título bold, imagem só de apoio.",
  status: "active",
  component: WavyEditorialLight,
  slots: {
    title: { required: true, recommendedMaxCharacters: 90, hardMaxCharacters: 200 },
    body: { required: false, recommendedMaxCharacters: 200, hardMaxCharacters: 360 },
    image: { required: false, supported: true },
    profile: { required: true },
  },
  rules: {
    supportedFormats: ["cover", "content", "statement", "tension", "cta"],
    intendedFor: ["Qualquer conteúdo", "Autoridade editorial", "Slides puro texto ou com foto de apoio"],
    avoidWhen: ["O briefing pede fundo escuro/dramático (use a variante Escuro)"],
  },
  capabilities: { adaptiveText: true, adaptiveMedia: true },
  fixtures: editorialFixtures,
  mediaFixtures: EDITORIAL_MEDIA_FIXTURES,
});

export default definition;
