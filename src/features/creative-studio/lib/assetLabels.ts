import { FACTOR_AXIS_LABELS, type CreativeAsset } from '../types/creative';

/**
 * Nomes estáveis e distinguíveis para as artes de um projeto.
 *
 * Sem isso duas artes originais aparecem as duas como "Arte original", e a
 * seção do Fator Criativo diz "baseado em Arte original" sem dizer em qual —
 * justamente a informação que a linhagem existe para dar.
 *
 * A numeração segue a ordem de criação, então o nome de uma arte não muda
 * quando outra é gerada depois, e é POR PROJETO: na galeria, que atravessa
 * projetos, contar de forma contínua daria "Arte 07" para a primeira arte de
 * uma campanha — um número que não significa nada para quem olha.
 */
export function buildAssetLabels(assets: CreativeAsset[]): Map<string, string> {
  const ordered = [...assets].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const counters: Record<string, number> = {};
  const labels = new Map<string, string>();

  const nextIndex = (bucket: string, projectId: string | null) => {
    const key = `${projectId ?? 'sem-projeto'}:${bucket}`;
    counters[key] = (counters[key] ?? 0) + 1;
    return String(counters[key]).padStart(2, '0');
  };

  for (const asset of ordered) {
    switch (asset.type) {
      case 'original':
      case 'imported':
        labels.set(asset.id, `Arte ${nextIndex('original', asset.projectId)}`);
        break;
      case 'factor': {
        // O nome que a IA deu à variação é mais informativo que o eixo cru.
        const named = asset.metadata?.nome ? String(asset.metadata.nome) : null;
        const axis = asset.factorAxis ? FACTOR_AXIS_LABELS[asset.factorAxis] : null;
        labels.set(asset.id, named || axis || `Variação ${nextIndex('factor', asset.projectId)}`);
        break;
      }
      case 'edited':
        labels.set(asset.id, `Edição ${nextIndex('edited', asset.projectId)}`);
        break;
      case 'resize':
        labels.set(asset.id, `1080 · ${nextIndex('resize', asset.projectId)}`);
        break;
      default:
        labels.set(asset.id, 'Arte');
    }
  }

  return labels;
}

export function labelFor(labels: Map<string, string>, asset: CreativeAsset | null | undefined): string {
  if (!asset) return '—';
  return labels.get(asset.id) ?? 'Arte';
}
