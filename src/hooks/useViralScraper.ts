import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ViralSource = "base" | "theme" | "url" | "top";

export interface ViralPost {
  id: string;
  username: string;
  type: "Reel" | "Carrossel" | "Post";
  views: number;
  likes: number;
  caption: string;
  url: string;
  thumbnail: string | null;
}

export function useViralScraper() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ViralPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = async (params: {
    source: ViralSource;
    profiles?: string[];
    theme?: string;
    url?: string;
  }) => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("apify-scrape", { body: params });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setResults(data?.items || []);
    } catch (e: any) {
      setError(e?.message || "Falha ao buscar virais");
    } finally {
      setLoading(false);
    }
  };

  return { loading, results, error, search };
}
