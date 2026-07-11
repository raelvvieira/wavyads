import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TEMPLATES, type CopyTemplate } from "@/lib/copyTemplates";
import type { CopyPatternId } from "@/types/social";

interface Row {
  template_key: string;
  nome: string;
  emoji: string;
  preview: string;
  carrossel: boolean;
  slides_min: number;
  slides_max: number;
  slides_default: number;
  base_layout: string;
  prompt_body: string;
  design_code: string | null;
}

function rowToTemplate(row: Row): CopyTemplate {
  const builtinMatch = DEFAULT_TEMPLATES.find((t) => t.key === row.template_key);
  const layoutBase =
    builtinMatch || DEFAULT_TEMPLATES.find((t) => t.baseLayout === row.base_layout) || DEFAULT_TEMPLATES[2];
  return {
    key: row.template_key,
    nome: row.nome,
    emoji: row.emoji,
    preview: row.preview,
    carrossel: row.carrossel,
    slidesMin: row.slides_min,
    slidesMax: row.slides_max,
    slidesDefault: row.slides_default,
    baseLayout: (row.base_layout as CopyPatternId) || "2A",
    promptBody: row.prompt_body,
    structure: layoutBase.structure,
    builtin: !!builtinMatch,
    designCode: row.design_code || undefined,
  };
}

function templateToRow(t: CopyTemplate, userId: string) {
  return {
    user_id: userId,
    template_key: t.key,
    nome: t.nome,
    emoji: t.emoji,
    preview: t.preview,
    carrossel: t.carrossel,
    slides_min: t.slidesMin,
    slides_max: t.slidesMax,
    slides_default: t.slidesDefault,
    base_layout: t.baseLayout,
    prompt_body: t.promptBody,
    builtin: t.builtin,
    design_code: t.designCode ?? null,
  };
}

/** Mescla DEFAULT_TEMPLATES com overrides (builtins editados) e customs do usuário. */
function merge(rows: Row[]): CopyTemplate[] {
  const byKey = new Map(rows.map((r) => [r.template_key, rowToTemplate(r)]));
  const merged = DEFAULT_TEMPLATES.map((d) => byKey.get(d.key) || d);
  const customs = rows
    .filter((r) => !DEFAULT_TEMPLATES.some((d) => d.key === r.template_key))
    .map(rowToTemplate);
  return [...merged, ...customs];
}

export function useCopyTemplates() {
  const [templates, setTemplates] = useState<CopyTemplate[]>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("social_copy_templates")
      .select("*")
      .eq("user_id", user.id);
    setTemplates(merge(Array.isArray(data) ? (data as Row[]) : []));
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const saveTemplate = useCallback(async (t: CopyTemplate) => {
    setTemplates((arr) => arr.map((x) => (x.key === t.key ? t : x)));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão expirada — faça login novamente.");
    const { error } = await (supabase as any)
      .from("social_copy_templates")
      .upsert(templateToRow(t, user.id), { onConflict: "user_id,template_key" });
    if (error) throw new Error(error.message || "Falha ao salvar template");
  }, []);

  const createTemplate = useCallback(async (fields: {
    nome: string; promptBody: string; baseLayout: CopyPatternId;
    carrossel: boolean; emoji?: string; designCode?: string;
  }): Promise<CopyTemplate> => {
    const key = `custom-${crypto.randomUUID()}`;
    const layoutBase = DEFAULT_TEMPLATES.find((t) => t.baseLayout === fields.baseLayout) || DEFAULT_TEMPLATES[2];
    const t: CopyTemplate = {
      key,
      nome: fields.nome,
      emoji: fields.emoji || "✨",
      preview: layoutBase.preview,
      carrossel: fields.carrossel,
      slidesMin: fields.carrossel ? 5 : (fields.baseLayout === "3" ? 0 : 1),
      slidesMax: fields.carrossel ? 10 : (fields.baseLayout === "3" ? 0 : 1),
      slidesDefault: fields.carrossel ? 7 : (fields.baseLayout === "3" ? 0 : 1),
      baseLayout: fields.baseLayout,
      promptBody: fields.promptBody,
      structure: layoutBase.structure,
      builtin: false,
      designCode: fields.designCode,
    };
    setTemplates((arr) => [...arr, t]);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão expirada — faça login novamente.");
    const { error } = await (supabase as any)
      .from("social_copy_templates")
      .upsert(templateToRow(t, user.id), { onConflict: "user_id,template_key" });
    if (error) throw new Error(error.message || "Falha ao criar template");
    return t;
  }, []);

  const deleteTemplate = useCallback(async (key: string) => {
    // Só customs podem ser deletados; builtins usam resetTemplate.
    if (DEFAULT_TEMPLATES.some((d) => d.key === key)) return;
    setTemplates((arr) => arr.filter((x) => x.key !== key));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão expirada — faça login novamente.");
    const { error } = await (supabase as any)
      .from("social_copy_templates")
      .delete()
      .eq("user_id", user.id)
      .eq("template_key", key);
    if (error) throw new Error(error.message || "Falha ao excluir template");
  }, []);

  const resetTemplate = useCallback(async (key: string) => {
    const original = DEFAULT_TEMPLATES.find((d) => d.key === key);
    if (!original) return;
    setTemplates((arr) => arr.map((x) => (x.key === key ? original : x)));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão expirada — faça login novamente.");
    const { error } = await (supabase as any)
      .from("social_copy_templates")
      .delete()
      .eq("user_id", user.id)
      .eq("template_key", key);
    if (error) throw new Error(error.message || "Falha ao restaurar template");
  }, []);

  return { templates, loading, saveTemplate, createTemplate, deleteTemplate, resetTemplate };
}
