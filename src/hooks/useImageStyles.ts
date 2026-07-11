import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WAVY_STYLES, type WavyStyle } from "@/lib/wavyImageStyles";

/**
 * Carrega os estilos de imagem (defaults) mesclados com os promptTemplate
 * customizados pelo usuário (social_image_style_skills). Permite salvar e
 * resetar o skill de cada estilo.
 */
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
          .select("style_id, prompt_template")
          .eq("user_id", user.id);
        if (Array.isArray(data) && data.length) {
          const overrides = new Map<string, string>(
            data.map((r: any) => [r.style_id, r.prompt_template]),
          );
          setStyles(WAVY_STYLES.map((s) =>
            overrides.has(s.id) ? { ...s, promptTemplate: overrides.get(s.id)! } : s,
          ));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveStyle = useCallback(async (styleId: string, promptTemplate: string) => {
    setStyles((arr) => arr.map((s) => (s.id === styleId ? { ...s, promptTemplate } : s)));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from("social_image_style_skills").upsert(
      { user_id: user.id, style_id: styleId, prompt_template: promptTemplate },
      { onConflict: "user_id,style_id" },
    );
  }, []);

  const resetStyle = useCallback(async (styleId: string) => {
    const original = WAVY_STYLES.find((s) => s.id === styleId);
    if (!original) return;
    setStyles((arr) => arr.map((s) => (s.id === styleId ? { ...s, promptTemplate: original.promptTemplate } : s)));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any)
      .from("social_image_style_skills")
      .delete()
      .eq("user_id", user.id)
      .eq("style_id", styleId);
  }, []);

  return { styles, loading, saveStyle, resetStyle };
}
