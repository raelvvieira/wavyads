/**
 * O substantivo curto do que a campanha entrega.
 *
 * A tabela já tem um rótulo por tipo de resultado, mas ele é cabeçalho de
 * coluna: plural e descritivo — "Conversas por mensagem iniciadas",
 * "Visualizações da página de destino". Dentro de uma frase isso quebra a
 * leitura: *"R$ 11,18 por conversas por mensagem iniciadas na média da
 * conta"*.
 *
 * Cabeçalho e frase são trabalhos diferentes. Aqui mora o substantivo que
 * cabe numa frase: singular, curto, do jeito que o cliente fala do próprio
 * negócio.
 */

const UNIDADE: Record<string, string> = {
  'onsite_conversion.messaging_conversation_started_7d': 'conversa',
  'onsite_conversion.lead_grouped': 'lead',
  'offsite_conversion.fb_pixel_lead': 'lead',
  'lead': 'lead',
  'purchase': 'compra',
  'offsite_conversion.fb_pixel_purchase': 'compra',
  'omni_purchase': 'compra',
  'link_click': 'clique',
  'landing_page_view': 'visita',
  'video_view': 'visualização',
  'post_engagement': 'interação',
  'page_engagement': 'interação',
  'add_to_cart': 'carrinho',
  'initiate_checkout': 'checkout',
};

/**
 * `resultado` é o padrão de propósito.
 *
 * Um tipo que não está no mapa viria como o identificador cru da Meta
 * (`offsite_conversion.custom.123…`) — ilegível numa frase. Genérico e
 * correto vence específico e incompreensível.
 */
export function unidadeDoResultado(resultType: string | null | undefined): string {
  const k = (resultType ?? '').trim();
  return UNIDADE[k] ?? 'resultado';
}

/** O plural, para quando a frase conta mais de um. */
export function pluralDoResultado(resultType: string | null | undefined, quantidade: number): string {
  const u = unidadeDoResultado(resultType);
  if (quantidade === 1) return u;
  // `visualização` → `visualizações`; o resto só ganha o `s`.
  return u.endsWith('ão') ? `${u.slice(0, -2)}ões` : `${u}s`;
}
