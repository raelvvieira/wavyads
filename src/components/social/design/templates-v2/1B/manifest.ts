import { defineTemplate } from "../../templates/template-definition";
import Template1B from "./component";
import { conflictAdaptiveFixtures } from "./fixtures";
import { CONFLICT_MEDIA_FIXTURES } from "./media-fixtures";

const definition = defineTemplate({
  id: "1B",
  label: "1B Conflito",
  source: "template plugavel",
  description: "Versao adaptativa do template de conflito para o pipeline real.",
  status: "experimental",
  component: Template1B,
  slots: {
    title: { required: true, recommendedMaxCharacters: 90, hardMaxCharacters: 180 },
    body: { required: false, recommendedMaxCharacters: 180, hardMaxCharacters: 320 },
    image: { required: false, supported: true },
    profile: { required: true },
  },
  rules: {
    supportedFormats: ["cover", "content", "statement", "tension", "cta"],
    intendedFor: ["Comparacao antes/depois", "Narrativas de contraste", "Posts de conflito"],
    avoidWhen: ["A marca precisa de visual leve e aberto", "A mensagem nao comporta dualidade"],
  },
  capabilities: { adaptiveText: true, adaptiveMedia: true },
  fixtures: conflictAdaptiveFixtures,
  mediaFixtures: CONFLICT_MEDIA_FIXTURES,
});

export default definition;
