import type { ComponentType } from "react";
import type { SlideTipo } from "@/types/social";
import type { FormatoSlide, TemplateSlideProps } from "./shared";

export type TemplatePluginStatus = "experimental" | "active" | "deprecated";
export type TemplateFixtureId = "short" | "medium" | "extreme";

export interface TemplateFixtureSlide {
  tipo: SlideTipo;
  titulo: string;
  corpo: string;
}

export interface TemplateFixture {
  id: TemplateFixtureId;
  label: string;
  description: string;
  slides: TemplateFixtureSlide[];
}

export interface TemplateMediaFixture {
  id: string;
  label: string;
  description: string;
  imageUrl?: string;
}

export interface TemplateTextSlot {
  required: boolean;
  recommendedMaxCharacters: number;
  hardMaxCharacters: number;
}

export interface TemplatePluginDefinition {
  id: string;
  label: string;
  source: string;
  description: string;
  status: TemplatePluginStatus;
  component: ComponentType<TemplateSlideProps>;
  slots: {
    title: TemplateTextSlot;
    body: TemplateTextSlot;
    image: { required: boolean; supported: boolean };
    profile: { required: boolean };
  };
  rules: {
    supportedFormats: FormatoSlide[];
    intendedFor: string[];
    avoidWhen: string[];
  };
  capabilities: {
    adaptiveText: boolean;
    adaptiveMedia: boolean;
  };
  fixtures: Record<TemplateFixtureId, TemplateFixture>;
  mediaFixtures?: TemplateMediaFixture[];
}

export function defineTemplate<const T extends TemplatePluginDefinition>(definition: T): T {
  return definition;
}
