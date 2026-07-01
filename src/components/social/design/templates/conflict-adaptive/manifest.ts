import { defineTemplate } from "../template-definition";
import { ConflictAdaptiveTemplate } from "./component";
import { conflictAdaptiveFixtures } from "./fixtures";
import { CONFLICT_MEDIA_FIXTURES } from "./media-fixtures";

const conflictAdaptiveDefinition = defineTemplate({
  id: "conflict-adaptive",
  label: "Conflito Adaptive",
  source: "template plugavel",
  description: "Versao adaptativa do Template1B para o laboratorio.",
  status: "experimental",
  component: ConflictAdaptiveTemplate,
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
  capabilities: {
    adaptiveText: true,
    adaptiveMedia: true,
  },
  fixtures: conflictAdaptiveFixtures,
  mediaFixtures: CONFLICT_MEDIA_FIXTURES,
});

export default conflictAdaptiveDefinition;
