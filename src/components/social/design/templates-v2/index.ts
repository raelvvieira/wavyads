import type { ComponentType } from "react";
import type { TemplateId, TemplateSlideProps } from "../templates/shared";
import type { TemplatePluginDefinition, TemplatePluginStatus } from "../templates/template-definition";

const manifestModules = import.meta.glob<{ default: TemplatePluginDefinition }>("./*/manifest.ts", {
  eager: true,
});

export const TEMPLATE_DEFINITIONS = Object.values(manifestModules)
  .map((module) => module.default)
  .sort((a, b) => a.label.localeCompare(b.label));

export type TemplatePickerOption = {
  id: TemplateId;
  label: string;
  description: string;
  source: string;
  status?: TemplatePluginStatus;
  preview: string;
  textColor: string;
};

const PREVIEW_STYLES: Array<{ preview: string; textColor: string }> = [
  { preview: "linear-gradient(135deg,#F5F2EE 0%,#E8E5E0 100%)", textColor: "#0A0A0A" },
  { preview: "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#3D1414 100%)", textColor: "#fff" },
  { preview: "linear-gradient(135deg,#F5F2EE 0%,#FD4638 100%)", textColor: "#0A0A0A" },
  { preview: "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#FD4638 100%)", textColor: "#fff" },
  { preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)", textColor: "#fff" },
  { preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)", textColor: "#fff" },
];

function styleFor(id: string): { preview: string; textColor: string } {
  const index = Math.abs(Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0)) % PREVIEW_STYLES.length;
  return PREVIEW_STYLES[index];
}

export const PRODUCTION_TEMPLATE_OPTIONS: TemplatePickerOption[] = TEMPLATE_DEFINITIONS.map((definition) => ({
  id: definition.id as TemplateId,
  label: definition.label,
  description: definition.description,
  source: definition.source,
  status: definition.status,
  ...styleFor(definition.id),
}));

export const PATTERN_TEMPLATES = TEMPLATE_DEFINITIONS.reduce<Record<TemplateId, ComponentType<TemplateSlideProps>>>((acc, definition) => {
  acc[definition.id as TemplateId] = definition.component;
  return acc;
}, {} as Record<TemplateId, ComponentType<TemplateSlideProps>>);

export function getProductionTemplate(id: TemplateId | string): TemplatePluginDefinition | undefined {
  return TEMPLATE_DEFINITIONS.find((template) => template.id === id);
}

export function getProductionTemplateOption(id: TemplateId | string): TemplatePickerOption | undefined {
  return PRODUCTION_TEMPLATE_OPTIONS.find((template) => template.id === id);
}
