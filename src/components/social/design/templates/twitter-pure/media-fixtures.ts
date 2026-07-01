import balancedImage from "@/assets/twitter-pure/twitter-pure-balanced.png";
import lowResImage from "@/assets/twitter-pure/twitter-pure-lowres.png";
import tallImage from "@/assets/twitter-pure/twitter-pure-tall.png";
import wideImage from "@/assets/twitter-pure/twitter-pure-wide.png";

export type TwitterPureMediaFixtureId = "none" | "balanced" | "wide" | "tall" | "low";

export interface TwitterPureMediaFixture {
  id: TwitterPureMediaFixtureId;
  label: string;
  description: string;
  imageUrl?: string;
}

export const TWITTER_PURE_MEDIA_FIXTURES: TwitterPureMediaFixture[] = [
  {
    id: "none",
    label: "Sem imagem",
    description: "Valida o fluxo quando o card precisa se resolver sem media.",
  },
  {
    id: "balanced",
    label: "Equilibrada",
    description: "Imagem padrao com proporcao neutra.",
    imageUrl: balancedImage,
  },
  {
    id: "wide",
    label: "Muito larga",
    description: "Formato horizontal extremo para testar o crop.",
    imageUrl: wideImage,
  },
  {
    id: "tall",
    label: "Muito alta",
    description: "Formato vertical extremo para testar o crop.",
    imageUrl: tallImage,
  },
  {
    id: "low",
    label: "Baixa resolucao",
    description: "Imagem menor para validar upscale e nitidez percebida.",
    imageUrl: lowResImage,
  },
];

export function getTwitterPureMediaFixture(id: TwitterPureMediaFixtureId): TwitterPureMediaFixture {
  return TWITTER_PURE_MEDIA_FIXTURES.find((fixture) => fixture.id === id) ?? TWITTER_PURE_MEDIA_FIXTURES[1];
}
