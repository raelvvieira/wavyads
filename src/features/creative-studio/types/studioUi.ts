import type { LucideIcon } from 'lucide-react';

/**
 * Vocabulário da interface V2.
 *
 * Vive separado do domínio (`types/creative.ts`) de propósito: o que o canvas
 * DESENHA e o que o banco GUARDA mudam por motivos diferentes, e misturar os
 * dois é como um modo de visualização acaba virando coluna de tabela.
 */

/** Como o canvas organiza as artes. */
export type CanvasViewMode = 'grid' | 'lineage';

/** O que ocupa o painel direito. Nunca dois ao mesmo tempo no desktop. */
export type SidePanelMode = 'none' | 'inspector' | 'copilot';

/** Destinos da ilha de bibliotecas do Studio. */
export type StudioLibraryId =
  | 'all'
  | 'generations'
  | 'references'
  | 'products'
  | 'avatars'
  | 'templates'
  | 'approved';

export interface StudioLibraryEntry {
  id: StudioLibraryId;
  label: string;
  icon: LucideIcon;
  /** Ausente quando a contagem ainda não é conhecida — 0 e "não sei" são coisas distintas. */
  count?: number;
}

/** O que o menu de anexos do dock sabe anexar. */
export type DockAttachmentKind = 'reference' | 'logo' | 'copy' | 'product' | 'avatar';

export interface DockAttachment {
  id: string;
  kind: DockAttachmentKind;
  label: string;
  thumbnailUrl?: string | null;
  /** URL para reference/logo/file; o texto em si para copy. */
  value: string;
}
