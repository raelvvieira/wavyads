import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WAVY_STYLES, type WavyStyle } from "@/lib/wavyImageStyles";

interface Row {
  style_id: string;
  prompt_template: string;
  nome: string | null;
  emoji: string | null;
  resumo: string | null;
  descricao_longa: string | null;
  caminho: string | null;
}

function rowToStyle(row: Row): WavyStyle {
  const builtinMatch = WAVY_STYLES.find((s) => s.id === row.style_id);
  return {
    id: row.style_id,
    nome: row.nome || builtinMatch?.nome || row.style_id,
    caminho: (row.caminho as WavyStyle["caminho"]) || "ia",
    resumo: row.resumo || builtinMatch?.resumo || "",
    quando: builtinMatch?.quando || "",
    emoji: row.emoji || builtinMatch?.emoji || "✨",
    descricao_longa: row.descricao_longa || builtinMatch?.descricao_longa || "",
    promptTemplate: row.prompt_template,
    builtin: !!builtinMatch,
  };
}

function styleToRow(s: WavyStyle, userId: string) {
  return {
    user_id: userId,
    style_id: s.id,
    prompt_template: s.promptTemplate,
    nome: s.nome,
    emoji: s.emoji,
    resumo: s.resumo,
    descricao_longa: s.descricao_longa,
    caminho: s.caminho,
    builtin: s.builtin,
  };
}

/** Mescla WAVY_STYLES com overrides (builtins editados) e estilos custom. */
function merge(rows: Row[]): WavyStyle[] {
  const byId = new Map(rows.map((r) => [r.style_id, rowToStyle(r)]));
  const merged = WAVY_STYLES.map((d) => byId.get(d.id) || d);
  const customs = rows
    .filter((r) => !WAVY_STYLES.some((d) => d.id === r.style_id))
    .map(rowToStyle);
  return [...merged, ...customs];
}

export function useImageStyles() {
  const [styles, setStyles] = useState<WavyStyle[]>(WAVY_STYLES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await (supabase as any)
          .from("social_image_style_skills")
          .select("style_id, prompt_template, nome, emoji, resumo, descricao_longa, caminho")
          .eq("user_id", user.id);
        setStyles(merge(Array.isArray(data) ? (data as Row[]) : []));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveStyle = useCallback(async (style: WavyStyle) => {
    setStyles((arr) => arr.map((s) => (s.id === style.id ? style : s)));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão expirada — faça login novamente.");
    const { error } = await (supabase as any)
      .from("social_image_style_skills")
      .upsert(styleToRow(style, user.id), { onConflict: "user_id,style_id" });
    if (error) throw new Error(error.message || "Falha ao salvar estilo");
  }, []);

  const createStyle = useCallback(async (fields: {
    nome: string; promptTemplate: string; resumo?: string; emoji?: string;
  }): Promise<WavyStyle> => {
    const style: WavyStyle = {
      id: `custom-${crypto.randomUUID()}`,
      nome: fields.nome,
      caminho: "ia",
      builtin: false,
      emoji: fields.emoji || "✨",
      resumo: fields.resumo || "",
      quando: "",
      descricao_longa: fields.resumo || "",
      promptTemplate: fields.promptTemplate,
    };
    setStyles((arr) => [...arr, style]);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão expirada — faça login novamente.");
    const { error } = await (supabase as any)
      .from("social_image_style_skills")
      .upsert(styleToRow(style, user.id), { onConflict: "user_id,style_id" });
    if (error) throw new Error(error.message || "Falha ao criar estilo");
    return style;
  }, []);

  const deleteStyle = useCallback(async (id: string) => {
    if (WAVY_STYLES.some((d) => d.id === id)) return; // builtins não deletam
    setStyles((arr) => arr.filter((s) => s.id !== id));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão expirada — faça login novamente.");
    const { error } = await (supabase as any)
      .from("social_image_style_skills")
      .delete()
      .eq("user_id", user.id)
      .eq("style_id", id);
    if (error) throw new Error(error.message || "Falha ao excluir estilo");
  }, []);

  const resetStyle = useCallback(async (id: string) => {
    const original = WAVY_STYLES.find((s) => s.id === id);
    if (!original) return;
    setStyles((arr) => arr.map((s) => (s.id === id ? original : s)));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão expirada — faça login novamente.");
    const { error } = await (supabase as any)
      .from("social_image_style_skills")
      .delete()
      .eq("user_id", user.id)
      .eq("style_id", id);
    if (error) throw new Error(error.message || "Falha ao restaurar estilo");
  }, []);

  return { styles, loading, saveStyle, createStyle, deleteStyle, resetStyle };
}
