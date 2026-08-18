import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guarda contra cor cega a tema no chrome do produto.
 *
 * O tema claro quebrou no Criativo Studio por uma linha só: a raiz da página
 * cravava `bg-[#0C0C0E]`. O fundo continuou preto enquanto a tinta seguiu o
 * tema, e o resultado foi texto escuro sobre preto. Nada errou em build,
 * typecheck ou teste — só apareceu quando alguém abriu a tela.
 *
 * Este teste procura o padrão, não a linha: superfície escura escrita
 * literalmente dentro do chrome.
 *
 * Fora do escopo ficam os arquivos que descrevem ARTE — a paleta do criativo
 * é conteúdo do cliente e não deve seguir o tema do app. E casos deliberados
 * (preto atrás de imagem, cor de marca de terceiro) se declaram com
 * `tema-fixo:` num comentário na mesma linha ou nas quatro anteriores.
 */

const RAIZ = 'src';

// Arte entregue ao cliente: paleta é conteúdo, não interface.
const FORA_DO_ESCOPO = [
  'components/social/design/templates',
  'components/social/design/lab',
  'lib/designStarters.ts',
  'lib/copyTemplates.ts',
];

const ESCAPE = 'tema-fixo:';
const COR_LITERAL = /\b(?:bg|from|via|to)-\[#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\]|\b(bg-black)\b(?!\/)/g;

/** Luminância relativa (WCAG). É ela que diz se a cor é escura, não o hex. */
function luminancia(hex: string): number {
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const canais = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

describe('cor cega a tema', () => {
  it('classifica escuro por luminância, não pelo hex', () => {
    // Sem isto a regra confundiria o azul do Twitter (#1DA1F2) com carvão só
    // porque os dois começam com 1.
    expect(luminancia('0C0C0E')).toBeLessThan(0.15);
    expect(luminancia('111113')).toBeLessThan(0.15);
    expect(luminancia('1DA1F2')).toBeGreaterThan(0.15);
    expect(luminancia('FF831E')).toBeGreaterThan(0.15);
  });

  it('nenhum chrome pinta superfície escura em cor literal', () => {
    const infratores: string[] = [];

    for (const caminho of arquivos(RAIZ)) {
      const relativo = caminho.slice(RAIZ.length + 1);
      if (FORA_DO_ESCOPO.some((p) => relativo.startsWith(p))) continue;
      if (/\.test\.tsx?$/.test(relativo)) continue;

      const linhas = readFileSync(caminho, 'utf8').split('\n');
      linhas.forEach((linha, i) => {
        // Janela de algumas linhas: a justificativa costuma ocupar mais de
        // uma linha logo acima do atributo que ela explica.
        const contexto = linhas.slice(Math.max(0, i - 4), i + 1).join('\n');
        if (contexto.includes(ESCAPE)) return;

        for (const m of linha.matchAll(COR_LITERAL)) {
          const escura = m[2] ? true : luminancia(m[1]) < 0.15;
          if (escura) infratores.push(`${relativo}:${i + 1} → ${m[0]}`);
        }
      });
    }

    // A lista inteira de uma vez: assim a falha diz onde estão todos, em vez
    // de revelar um por execução.
    expect(infratores).toEqual([]);
  });
});
