import type { TemplatePluginDefinition } from "./template-definition";

const manifestModules = import.meta.glob<{ default: TemplatePluginDefinition }>("./*/manifest.ts", {
  eager: true,
});

export const PLUGGABLE_TEMPLATES = Object.values(manifestModules)
  .map((module) => module.default)
  .sort((a, b) => a.label.localeCompare(b.label));

export function getPluggableTemplate(id: string): TemplatePluginDefinition | undefined {
  return PLUGGABLE_TEMPLATES.find((template) => template.id === id);
}
