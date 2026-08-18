import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { CreativeAsset } from '../types/creative';
import { ASSET_ORIGIN_LABELS } from '../types/creative';

interface AssetPreviewDialogProps {
  asset: CreativeAsset | null;
  onClose: () => void;
}

/**
 * Visualização em tamanho completo.
 *
 * O inspetor mostra a arte numa coluna de ~320px — suficiente para
 * confirmar QUAL arte está selecionada, insuficiente para julgar como ela
 * ficou. Este overlay existe só para essa segunda pergunta: a imagem
 * inteira, centrada, no maior tamanho que a tela permite.
 *
 * `object-contain`, ao contrário do `object-cover` do card do inspetor:
 * ali a imagem preenche uma coluna estreita, aqui ela precisa aparecer
 * inteira, sem cortar nada.
 */
export function AssetPreviewDialog({ asset, onClose }: AssetPreviewDialogProps) {
  const url = asset?.url ?? null;

  return (
    <Dialog open={!!asset && !!url} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex w-auto max-w-[min(94vw,1200px)] flex-col items-center gap-3 border-white/10 bg-background/95 p-4 backdrop-blur-xl sm:rounded-2xl">
        {/* Radix exige um título acessível; a imagem já se explica visualmente. */}
        <DialogTitle className="sr-only">Arte em tamanho completo</DialogTitle>
        <DialogDescription className="sr-only">Visualização ampliada da arte selecionada.</DialogDescription>
        {url && (
          <img
            src={url}
            alt={asset?.prompt?.slice(0, 160) ?? 'Arte gerada'}
            className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
          />
        )}
        {asset && (
          <p className="text-center text-xs text-white/50">
            {asset.aspectRatio ?? '—'} · {ASSET_ORIGIN_LABELS[asset.type] ?? asset.type}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
