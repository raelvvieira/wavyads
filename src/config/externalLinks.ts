/**
 * Endereços de sistemas que não são este app.
 *
 * Constante e não variável de ambiente de propósito: é a página pública de
 * login do CRM, não um segredo. Um `.env` aqui seria mais um lugar para
 * esquecer de configurar — e sem valor definido o item de menu apontaria
 * para lugar nenhum, que é pior do que apontar para um endereço fixo.
 *
 * Se um dia houver ambiente de homologação com outro CRM, este é o ponto
 * único a trocar.
 */
export const CRM_URL = 'https://crm.wavymarketing.com.br/';
