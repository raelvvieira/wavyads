// Mapa pattern → componente de design.
// Estratégia: reaproveita os templates existentes (sem renomear arquivos) e os reapresenta
// com os IDs canônicos da Wavy Copy Skill.
import type { ComponentType } from "react";
import { Template1 } from "./Template1";              // Editorial Dark/Light
import { Template2A as Tutorial } from "./Template2A"; // Twitter elaborado / Tutorial
import { Template1B } from "./Template1B";            // Conflito de Dois Mundos (NEW)
import { Template3 as PostFraseUnico } from "./Template3"; // Post único c/ frase grande
import { Template4 as FraseMestre } from "./Template4";    // 5 slides interdependentes
import type { TemplateSlideProps, TemplateId } from "./shared";

type C = ComponentType<TemplateSlideProps>;

// Wrappers leves para forçar modo (light/dark) no Template1 (Editorial)
const Template2A_Storytelling: C = (props) => <Template1 {...props} mode="light" />;
const Template2B_EditorialDark: C = (props) => <Template1 {...props} mode="dark" />;

export const PATTERN_TEMPLATES: Record<TemplateId, C> = {
  "1A": Tutorial,
  "1B": Template1B,
  "2A": Template2A_Storytelling,
  "2B": Template2B_EditorialDark,
  "4":  PostFraseUnico,
  "5":  FraseMestre,
};
