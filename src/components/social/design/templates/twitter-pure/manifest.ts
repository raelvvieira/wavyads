import { defineTemplate } from "../template-definition";
import { TwitterPureTemplate } from "./component";
import { twitterPureFixtures } from "./fixtures";
import { TWITTER_PURE_MEDIA_FIXTURES } from "./media-fixtures";

const twitterPureDefinition = defineTemplate({
  id: "twitter-pure",
  label: "Twitter Puro",
  source: "template plugavel",
  description: "Replica limpa de uma publicacao do Twitter/X para carrosseis educativos.",
  status: "experimental",
  component: TwitterPureTemplate,
  slots: {
    title: { required: true, recommendedMaxCharacters: 90, hardMaxCharacters: 150 },
    body: { required: false, recommendedMaxCharacters: 180, hardMaxCharacters: 320 },
    image: { required: false, supported: true },
    profile: { required: true },
  },
  rules: {
    supportedFormats: ["cover", "content", "statement", "tension", "cta"],
    intendedFor: ["Tutoriais", "Opinioes", "Listas educativas"],
    avoidWhen: ["A imagem precisa ser o elemento principal", "O texto excede os limites rigidos"],
  },
  capabilities: {
    adaptiveText: true,
    adaptiveMedia: true,
  },
  fixtures: twitterPureFixtures,
  mediaFixtures: TWITTER_PURE_MEDIA_FIXTURES,
});

export default twitterPureDefinition;
