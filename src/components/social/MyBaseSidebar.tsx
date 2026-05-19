import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

const KEY = "wavy:social:base";
const DEFAULTS = [
  "@brmetaverso",
  "@noevarner.ai",
  "@kylewhitrow",
  "@paidotrafego",
  "@pedrosobral",
  "@caduneiva",
  "@g4.business",
  "@v4company",
  "@nateherkai",
  "@oreidotrafego",
];

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(DEFAULTS));
      return DEFAULTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULTS;
  }
}

export function useMyBase() {
  const [profiles, setProfiles] = useState<string[]>([]);
  useEffect(() => setProfiles(load()), []);

  const persist = (next: string[]) => {
    setProfiles(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const add = (handle: string) => {
    const clean = "@" + handle.replace(/^@/, "").trim();
    if (!clean || clean === "@") return;
    if (profiles.includes(clean)) return;
    if (profiles.length >= 10) return;
    persist([...profiles, clean]);
  };

  const remove = (handle: string) => persist(profiles.filter((p) => p !== handle));

  return { profiles, add, remove };
}

export function MyBaseSidebar({ profiles, onAdd, onRemove }: {
  profiles: string[];
  onAdd: (h: string) => void;
  onRemove: (h: string) => void;
}) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);

  const submit = () => {
    if (!input.trim()) return;
    onAdd(input);
    setInput("");
    setAdding(false);
  };

  return (
    <div className="glass rounded-xl p-4 w-full lg:w-[260px] flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40 font-medium">Minha Base</div>
          <div className="text-[10px] text-white/30">{profiles.length}/10 perfis</div>
        </div>
        <button
          onClick={() => setAdding((s) => !s)}
          className="h-7 w-7 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 flex items-center justify-center transition-colors"
          disabled={profiles.length >= 10}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {adding && (
        <div className="mb-3 flex gap-1.5">
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="@perfil"
            className="glass-input flex-1 rounded-lg px-2 py-1.5 text-xs"
          />
          <button onClick={submit} className="btn-accent rounded-lg px-2 text-xs">OK</button>
        </div>
      )}

      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {profiles.map((p) => (
          <div key={p} className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-sm text-white/80">
            <span className="truncate">{p}</span>
            <button
              onClick={() => onRemove(p)}
              className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-destructive transition-opacity"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {profiles.length === 0 && (
          <div className="text-xs text-white/30 px-2 py-4 text-center">Nenhum perfil ainda.</div>
        )}
      </div>
    </div>
  );
}
