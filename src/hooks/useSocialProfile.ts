import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PROFILE, type SocialProfile, type TemplateId } from "@/components/social/design/templates/shared";

export interface UseSocialProfileResult {
  profile: SocialProfile;
  template: TemplateId;
  loading: boolean;
  save: (p: Partial<SocialProfile> & { template?: TemplateId }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string | null>;
}

const VALID: TemplateId[] = ["1A", "1B", "2A", "2B", "4", "5"];

// Compat: pipelines salvos com IDs antigos do Design ("1","2A","2B","3","4")
const LEGACY_MAP: Record<string, TemplateId> = {
  "1": "2A",   // Editorial Dark/Light → Storytelling (light por default)
  "2A": "1A",  // Twitter Tutorial → Tutorial
  "2B": "1B",  // Twitter Puro → Conflito (mais próximo)
  "3": "4",    // Post Frase → Post Frase
  "4": "5",    // Frase Mestre → Frase Mestre
};

export function useSocialProfile(): UseSocialProfileResult {
  const [profile, setProfile] = useState<SocialProfile>(DEFAULT_PROFILE);
  const [template, setTemplate] = useState<TemplateId>("2A");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase
          .from("social_profiles")
          .select("nome, handle, avatar_url, template_padrao")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setProfile({
            nome: data.nome || DEFAULT_PROFILE.nome,
            handle: data.handle || DEFAULT_PROFILE.handle,
            avatarUrl: data.avatar_url || DEFAULT_PROFILE.avatarUrl,
          });
          const raw = data.template_padrao as string | null;
          const normalized = raw && (VALID.includes(raw as TemplateId) ? (raw as TemplateId) : LEGACY_MAP[raw]);
          if (normalized) setTemplate(normalized);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (p: Partial<SocialProfile> & { template?: TemplateId }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = { ...profile, ...p };
    setProfile({ nome: next.nome, handle: next.handle, avatarUrl: next.avatarUrl });
    if (p.template) setTemplate(p.template);
    await supabase.from("social_profiles").upsert({
      user_id: user.id,
      nome: next.nome,
      handle: next.handle,
      avatar_url: next.avatarUrl,
      template_padrao: p.template ?? template,
    });
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    const path = `avatar-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("social-media").upload(path, file, { contentType: file.type });
    if (error) return null;
    const { data } = supabase.storage.from("social-media").getPublicUrl(path);
    return data.publicUrl;
  };

  return { profile, template, loading, save, uploadAvatar };
}
