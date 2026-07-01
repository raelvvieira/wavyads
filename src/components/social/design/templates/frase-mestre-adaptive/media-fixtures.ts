import balancedImage from "@/assets/twitter-pure/twitter-pure-balanced.png";
import lowResImage from "@/assets/twitter-pure/twitter-pure-lowres.png";
import tallImage from "@/assets/twitter-pure/twitter-pure-tall.png";
import wideImage from "@/assets/twitter-pure/twitter-pure-wide.png";
import type { TemplateMediaFixture } from "../template-definition";

export const FRASE_MESTRE_MEDIA_FIXTURES: TemplateMediaFixture[] = [
  { id: "none", label: "Sem imagem", description: "Valida o carrossel sem apoio visual." },
  { id: "balanced", label: "Equilibrada", description: "Imagem neutra para o caso comum.", imageUrl: balancedImage },
  { id: "wide", label: "Muito larga", description: "Formato horizontal para testar corte.", imageUrl: wideImage },
  { id: "tall", label: "Muito alta", description: "Formato vertical para testar foco e crop.", imageUrl: tallImage },
  { id: "low", label: "Baixa resolucao", description: "Imagem menor para testar nitidez percebida.", imageUrl: lowResImage },
];
