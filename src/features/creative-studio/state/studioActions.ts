/**
 * Vocabulário das ações do Criativo Studio.
 *
 * A conversa da página oferece botões, e cada botão carrega uma string que um
 * `switch` de 25 casos interpreta. Enquanto essa string era `string` livre,
 * três erros passavam sem denúncia: emitir um id que ninguém trata (botão
 * morto), tratar um id que ninguém emite (caso morto) e escrever o id errado.
 *
 * Este módulo é o primeiro passo da migração descrita no plano: o id vira
 * união tipada, o que já elimina os três casos acima em tempo de compilação.
 * O passo seguinte — ação com payload (`{ type, assetId }`) — depende de
 * mexer em todo botão do render e fica para quando a Fase 5 tocar a conversa.
 */

/** Ações abertas por botão da conversa. */
export const CONVERSATION_ACTIONS = [
  'continue-copy',
  'download-generated',
  'generate-copy-now',
  'open-assets',
  'open-assets-logo',
  'open-assets-product',
  'open-avatar-library',
  'open-copy-suggestions',
  'open-creative-factor',
  'open-design-system',
  'open-edit-image',
  'open-generated-result',
  'open-generation-summary',
  'open-paste-copy',
  'open-read-url',
  'open-reference-library',
  'open-template-detail',
  'open-upload-references',
  'skip-assets',
  'skip-references',
] as const;

/** Ações disparadas direto por controles fora da conversa. */
export const DIRECT_ACTIONS = [
  'open-avatar',
  'open-project-history',
  'open-template',
] as const;

/**
 * Ações que o `switch` trata e ninguém emite.
 *
 * Ficam declaradas em vez de removidas em silêncio: apagar um caso que o
 * histórico de projetos possa reproduzir é mudança de comportamento, e a
 * limpeza pertence à fase que reescrever a conversa.
 */
export const ORPHAN_ACTIONS = ['regenerate-art', 'template-coming-soon'] as const;

export type ConversationActionId = (typeof CONVERSATION_ACTIONS)[number];
export type DirectActionId = (typeof DIRECT_ACTIONS)[number];
export type OrphanActionId = (typeof ORPHAN_ACTIONS)[number];

export type StudioActionId = ConversationActionId | DirectActionId | OrphanActionId;

const TODAS = new Set<string>([...CONVERSATION_ACTIONS, ...DIRECT_ACTIONS, ...ORPHAN_ACTIONS]);

export function isStudioAction(value: string): value is StudioActionId {
  return TODAS.has(value);
}

/**
 * Converte um id vindo de dado persistido.
 *
 * A conversa é gravada no snapshot com os botões dentro, então um projeto
 * salvo pode trazer um id de uma versão anterior do produto. Devolver null
 * deixa o chamador ignorar o botão em vez de tentar despachar algo que não
 * existe mais.
 */
export function parseStudioAction(value: unknown): StudioActionId | null {
  return typeof value === 'string' && isStudioAction(value) ? value : null;
}
