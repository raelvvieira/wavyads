import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { recordAiUsage } from "@/lib/aiUsageTracker";

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
  const [raw, setRaw] = useState<Record<string, any>>({});
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
    setRaw({});
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("apify-scrape", { body: params });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      recordAiUsage("apify-scrape", 1);
      setResults(data?.items || []);
      setRaw(data?.raw || {});
    } catch (e: any) {
      setError(e?.message || "Falha ao buscar virais");
    } finally {
      setLoading(false);
    }
  };

  const getRaw = (id: string) => raw[id];

  return { loading, results, error, search, getRaw };
}
