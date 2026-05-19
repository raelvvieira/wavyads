import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Item {
  id: string;
  title: string;
  thumbnail: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultQuery: string;
  onPick: (url: string) => void;
}

export function FreepikSearchDialog({ open, onOpenChange, defaultQuery, onPick }: Props) {
  const [q, setQ] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("freepik-search", {
        body: { query: q.trim(), per_page: 12 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setItems(data?.items || []);
    } catch (e: any) {
      toast({ title: "Falha na busca", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Buscar imagem no Freepik</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="ex: business meeting, sunset, abstract pattern"
            className="glass-input flex-1 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={run}
            disabled={loading}
            className="btn-accent rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => {
                onPick(it.thumbnail);
                onOpenChange(false);
              }}
              className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-accent/60 transition-all"
            >
              <img src={it.thumbnail} alt={it.title} className="w-full h-full object-cover" />
            </button>
          ))}
          {!loading && items.length === 0 && (
            <p className="col-span-full text-center text-sm text-white/40 py-8">
              Faça uma busca para ver resultados
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
