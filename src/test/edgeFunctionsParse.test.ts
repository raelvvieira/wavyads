import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/**
 * As edge functions precisam ao menos COMPILAR.
 *
 * Este teste nasceu de um prejuízo concreto. O prompt de sistema do
 * `criativo-fator` é um template literal gigante, e uma frase escrita em
 * markdown dentro dele — com um par de crases em volta de um nome de campo —
 * fechou a string no meio. O arquivo virou lixo sintático, a função parou de
 * subir, e o sintoma que chegou ao usuário foi o Fator Criativo continuar
 * respondendo com o código ANTIGO, porque o deploy da versão nova falhava em
 * silêncio. Levou três rodadas de investigação para achar.
 *
 * Nada mais no repositório pegava isso: as funções são Deno e o vitest só
 * inclui `src/**`, então elas não passavam por nenhum compilador antes de
 * chegar em produção. Aqui não há execução nem tipagem cruzada — só a
 * pergunta mais barata e mais valiosa: o parser aceita este arquivo?
 */

const RAIZ = join(process.cwd(), 'supabase', 'functions');

function funcoesDeBorda(): string[] {
  return readdirSync(RAIZ)
    .map((nome) => join(RAIZ, nome))
    .filter((caminho) => statSync(caminho).isDirectory())
    .map((dir) => join(dir, 'index.ts'))
    .filter((arquivo) => {
      try { return statSync(arquivo).isFile(); } catch { return false; }
    });
}

describe('edge functions', () => {
  const arquivos = funcoesDeBorda();

  it('existem para serem verificadas', () => {
    // Se a varredura voltar vazia, o teste abaixo passaria sem olhar nada —
    // um verde que não significa nada é pior que um vermelho.
    expect(arquivos.length).toBeGreaterThan(5);
  });

  it.each(arquivos.map((a) => [a.replace(RAIZ + '/', ''), a]))(
    '%s compila',
    (_nome, caminho) => {
      const fonte = readFileSync(caminho as string, 'utf8');
      const sf = ts.createSourceFile(caminho as string, fonte, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
      const erros = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? [];

      const legiveis = erros.map((d) => {
        const linha = d.start != null ? sf.getLineAndCharacterOfPosition(d.start).line + 1 : '?';
        return `linha ${linha}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`;
      });

      expect(legiveis).toEqual([]);
    },
  );
});
