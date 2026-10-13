import { describe, expect, it } from 'vitest';
import {
  avisoDaIntegracao, avisoDosAnuncios, diagnosticarAnuncios, diagnosticarCampanhas,
  TETO_LEGADO_DE_CAMPANHAS,
} from './metaIntegrationHealth';
import { derivarStatusAnuncio, derivarStatusCampanha } from './campaignStatus';

/** Como a tela recebe hoje, com a função ANTIGA no ar. */
const doFormatoAntigo = (status: string) =>
  ({ status: derivarStatusCampanha({ status_legado: status } as any) });
/** Como receberia com a função nova implantada. */
const doFormatoNovo = (efeito: string) =>
  ({ status: derivarStatusCampanha({ efeito_bruto: efeito, veiculacao: { tem_anuncio_ativo: true } } as any) });

describe('diagnosticarCampanhas', () => {
  it('reconhece o formato antigo pela ausência do status bruto', () => {
    // A ponte de compatibilidade não tem o que pôr em `bruto` — ela recebe
    // `active`/`paused`/`ended` e mais nada. É essa ausência que denuncia
    // qual versão da função está no ar.
    const d = diagnosticarCampanhas([doFormatoAntigo('active'), doFormatoAntigo('paused')]);
    expect(d.modoLegado).toBe(true);
  });

  it('com a função nova, não há aviso nenhum', () => {
    const d = diagnosticarCampanhas([doFormatoNovo('ACTIVE'), doFormatoNovo('ACTIVE')]);
    expect(d.modoLegado).toBe(false);
    expect(avisoDaIntegracao(d)).toBeNull();
  });

  it('lista no teto é lista cortada — e as ativas podem estar do lado de fora', () => {
    // A Meta não devolve as ativas primeiro. Numa conta com mais de 200
    // campanhas, filtrar por "Veiculando" e receber zero não significa que
    // não há nenhuma: significa que nenhuma das 200 que couberam é ativa.
    const muitas = Array.from({ length: TETO_LEGADO_DE_CAMPANHAS }, () => doFormatoAntigo('paused'));
    const d = diagnosticarCampanhas(muitas);
    expect(d.truncada).toBe(true);
    expect(avisoDaIntegracao(d)).toContain('nem chegaram aqui');
  });

  it('lista abaixo do teto avisa do status, mas não inventa truncamento', () => {
    const d = diagnosticarCampanhas([doFormatoAntigo('active')]);
    expect(d.truncada).toBe(false);
    expect(avisoDaIntegracao(d)).not.toContain('nem chegaram');
    expect(avisoDaIntegracao(d)).toContain('versão antiga');
  });

  it('tela sem campanhas não acusa nada', () => {
    const d = diagnosticarCampanhas([]);
    expect(d.modoLegado).toBe(false);
    expect(avisoDaIntegracao(d)).toBeNull();
  });

  it('uma campanha com status bruto já basta para não ser modo legado', () => {
    // Misturar os dois formatos não acontece na prática, mas afirmar "modo
    // antigo" com uma resposta nova na mão seria avisar sobre um problema
    // que não existe — e um aviso que mente é pior que nenhum.
    const d = diagnosticarCampanhas([doFormatoAntigo('active'), doFormatoNovo('ACTIVE')]);
    expect(d.modoLegado).toBe(false);
  });
});

describe('diagnosticarAnuncios', () => {
  it('reconhece o formato antigo e explica o que "Veiculando" significa nele', () => {
    // A galeria mostra, em "Veiculando", criativos de campanhas já
    // desligadas. Não é a leitura que erra: o payload antigo traz a chave
    // do ANÚNCIO e nada da hierarquia acima dele.
    const antigos = [
      { status: derivarStatusAnuncio(null, 'active') },
      { status: derivarStatusAnuncio(null, 'paused') },
    ];
    const d = diagnosticarAnuncios(antigos);
    expect(d.modoLegado).toBe(true);
    expect(avisoDosAnuncios(d)).toContain('campanha ou de um conjunto já pausado');
  });

  it('com o effective_status do anúncio, nada a avisar', () => {
    // É esse valor que carrega CAMPAIGN_PAUSED e ADSET_PAUSED dentro.
    const novos = [{ status: derivarStatusAnuncio('CAMPAIGN_PAUSED') }];
    expect(avisoDosAnuncios(diagnosticarAnuncios(novos))).toBeNull();
  });

  it('galeria vazia não acusa nada', () => {
    expect(avisoDosAnuncios(diagnosticarAnuncios([]))).toBeNull();
  });
});
