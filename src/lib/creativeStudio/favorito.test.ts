import { describe, expect, it } from 'vitest';
import { lerFavorito, avisoDasReferenciasIgnoradas } from './favorito';

const arte = (metadata: any, filename = 'Editorial com faixa') => ({
  id: 'f1', type: 'template', filename, metadata,
} as any);

describe('lerFavorito', () => {
  it('traz o sistema visual que a arte já carrega, sem reler a imagem', () => {
    // Reler a imagem custaria uma chamada de visão para chegar a um
    // documento PARECIDO com o que já está no banco — pagando mais para
    // perder fidelidade.
    const f = lerFavorito(arte({
      designSystemDoc: '## Palette\nOff-white #F4F0E8',
      antiPadroes: ['NEVER use cold blue lighting'],
    }))!;
    expect(f.designSystemDoc).toContain('Off-white');
    expect(f.antiPadroes).toEqual(['NEVER use cold blue lighting']);
  });

  it('NUNCA liga a cláusula anti-cópia de marca', () => {
    // `designSystemFromReference` proíbe reproduzir a marca da peça de
    // origem — correto para arte de terceiros, e exatamente errado aqui:
    // proibiria a arte de usar a marca do próprio cliente, que é o que o
    // favorito foi salvo para repetir.
    const f = lerFavorito(arte({ designSystemDoc: 'x' }))!;
    expect(f.designSystemFromReference).toBe(false);
  });

  it('traz o formato junto', () => {
    const f = lerFavorito(arte({ containerId: 'antes_depois' }))!;
    expect(f.containerId).toBe('antes_depois');
  });

  it('NÃO traz a cena — o estilo é do favorito, o assunto é do pedido', () => {
    // Herdar a direção de arte produziria a mesma foto com texto novo,
    // quando o que se pediu foi o mesmo ESTILO para um assunto novo.
    const f = lerFavorito(arte({
      designSystemDoc: 'x',
      artDirection: { mainSubject: 'Dentista com escala de cor', composition: 'c' },
    }))!;
    expect(JSON.stringify(f)).not.toContain('Dentista');
  });

  it('arte sem nada aproveitável devolve null, em vez de prometer estilo vazio', () => {
    expect(lerFavorito(arte({}))).toBeNull();
    expect(lerFavorito(arte({ artDirection: { mainSubject: 'x' } }))).toBeNull();
    expect(lerFavorito(null)).toBeNull();
  });

  it('documento em branco não conta como documento', () => {
    expect(lerFavorito(arte({ designSystemDoc: '   ' }))).toBeNull();
  });

  it('o mood vem explícito como null — campo ausente faria reler as referências', () => {
    // `referenceReading` é um Pick completo: um campo que falta ali devolve
    // `undefined` e a leitura das referências roda de novo, que é o custo
    // que este caminho existe para evitar.
    const f = lerFavorito(arte({ designSystemDoc: 'x' }))!;
    expect('mood' in f).toBe(true);
    expect(f.mood).toBeNull();
  });

  it('sem nome, o favorito ainda tem como ser chamado na proposta', () => {
    expect(lerFavorito(arte({ designSystemDoc: 'x' }, ''))!.nome).toBe('favorito');
  });
});

describe('o favorito manda no estilo, e diz', () => {
  const f = lerFavorito(arte({ designSystemDoc: 'x' }))!;

  it('avisa quando passou por cima de uma referência', () => {
    // Misturar dois sistemas visuais produz uma terceira coisa que não é
    // nenhum dos dois; escolher em silêncio deixa a pessoa achando que as
    // referências entraram.
    expect(avisoDasReferenciasIgnoradas(f, 1)).toMatch(/não foi lida/);
    expect(avisoDasReferenciasIgnoradas(f, 3)).toMatch(/as 3 referências/);
  });

  it('sem referência anexada, não há aviso nenhum', () => {
    expect(avisoDasReferenciasIgnoradas(f, 0)).toBeNull();
  });

  it('favorito sem documento não passa por cima de nada', () => {
    const soFormato = lerFavorito(arte({ containerId: 'antes_depois' }))!;
    expect(avisoDasReferenciasIgnoradas(soFormato, 2)).toBeNull();
  });
});
