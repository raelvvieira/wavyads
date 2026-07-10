import { ArrowRight, Heart, Eye } from "lucide-react";
import type { ViralPost } from "@/hooks/useViralScraper";
import { proxiedImageUrl } from "@/lib/socialImage";

function fmt(n: number) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function ViralResultsList({
  posts,
  loading,
  onPick,
  skeletonCount = 6,
}: {
  posts: ViralPost[];
  loading: boolean;
  onPick: (p: ViralPost) => void;
  skeletonCount?: number;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="glass rounded-xl h-48 shimmer" />
        ))}
      </div>
    );
  }
  if (!posts.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
      {posts.map((p) => (
        <div key={p.id} className="glass rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <a href={p.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-white hover:text-accent truncate">
              @{p.username}
            </a>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">
              {p.type}
            </span>
          </div>

          {p.thumbnail && (
            <a href={p.url} target="_blank" rel="noreferrer" className="block aspect-video rounded-lg overflow-hidden bg-white/5">
              <img
                src={p.thumbnail}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  const proxied = proxiedImageUrl(p.thumbnail);
                  if (proxied && img.src !== proxied) img.src = proxied;
                }}
              />
            </a>
          )}

          <p className="text-xs text-white/60 line-clamp-3 whitespace-pre-line">{p.caption || "Sem legenda"}</p>

          <div className="flex items-center gap-3 text-[11px] text-white/50">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmt(p.views)}</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{fmt(p.likes)}</span>
          </div>

          <button
            onClick={() => onPick(p)}
            className="btn-accent rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            Usar como referência <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
