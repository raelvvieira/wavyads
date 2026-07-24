import { useRef, useState } from "react";
import { Upload, Loader2, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SocialProfile } from "./templates/shared";

interface Props {
  profile: SocialProfile;
  onChange: (p: Partial<SocialProfile>) => void;
  onUploadAvatar: (file: File) => Promise<string | null>;
}

export function ProfileEditor({ profile, onChange, onUploadAvatar }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUploadAvatar(file);
    setUploading(false);
    if (url) onChange({ avatarUrl: url });
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Identidade tipo tweet: avatar + nome + @handle + selo */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => fileInput.current?.click()}
          className="relative h-12 w-12 rounded-full overflow-hidden border border-white/15 hover:border-accent/60"
          title="Trocar avatar"
        >
          <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
          )}
        </button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleFile} />

        <input
          value={profile.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
          placeholder="Nome"
          className="glass-input rounded-lg px-3 py-2 text-sm w-32"
        />
        <input
          value={profile.handle}
          onChange={(e) => onChange({ handle: e.target.value })}
          placeholder="@handle"
          className="glass-input rounded-lg px-3 py-2 text-sm w-40"
        />
        <button
          onClick={() => onChange({ verificado: !profile.verificado })}
          title={profile.verificado ? "Selo verificado: ligado" : "Selo verificado: desligado"}
          className={cn(
            "rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5 transition-colors",
            profile.verificado ? "bg-[#1DA1F2]/15 text-[#1DA1F2]" : "glass text-white/50 hover:bg-white/5",
          )}
        >
          <BadgeCheck className="h-3.5 w-3.5" /> Selo
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          className="glass rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5 hover:bg-white/5"
        >
          <Upload className="h-3.5 w-3.5" /> Avatar
        </button>
      </div>

      {/* Masthead editorial (topo do slide): veículo + tag */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-white/35 w-16">Masthead</span>
        <input
          value={profile.veiculo ?? ""}
          onChange={(e) => onChange({ veiculo: e.target.value })}
          placeholder="Veículo (ex.: Wavy)"
          className="glass-input rounded-lg px-3 py-2 text-sm w-40"
        />
        <input
          value={profile.veiculoTag ?? ""}
          onChange={(e) => onChange({ veiculoTag: e.target.value })}
          placeholder="Tag (ex.: Conteúdo com IA)"
          className="glass-input rounded-lg px-3 py-2 text-sm w-52"
        />
      </div>
    </div>
  );
}
