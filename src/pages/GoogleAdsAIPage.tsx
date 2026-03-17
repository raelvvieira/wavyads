import { useState } from 'react';
import { useGoogleAdsAI, FrenteResult } from '@/hooks/useGoogleAdsAI';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Globe, FileText, Copy, Check, RotateCcw, ChevronRight, Download, Lock, X, Plus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Copiar">
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CharBadge({ length, max }: { length: number; max: number }) {
  const ok = length <= max;
  return (
    <span className={cn('text-xs font-mono tabular-nums', ok ? 'text-muted-foreground' : 'text-destructive font-semibold')}>
      {length}/{max} {ok ? '✅' : '❌'}
    </span>
  );
}

function SectionCard({ title, children, copyText }: { title: string; children: React.ReactNode; copyText?: string }) {
  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {copyText && <CopyButton text={copyText} />}
      </div>
      {children}
    </GlassCard>
  );
}

function SkeletonSection({ title }: { title: string }) {
  return (
    <GlassCard className="p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </GlassCard>
  );
}

function EditableExclusions({ initial }: { initial: string[] }) {
  const [exclusions, setExclusions] = useState<string[]>(initial);
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  const remove = (index: number) => setExclusions(prev => prev.filter((_, i) => i !== index));
  const add = () => {
    const val = newValue.trim();
    if (val && !exclusions.includes(val)) {
      setExclusions(prev => [...prev, val]);
    }
    setNewValue('');
    setAdding(false);
  };

  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-1">Exclusões:</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {exclusions.map((e, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-foreground border border-white/10">
            {e}
            <button onClick={() => remove(i)} className="hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      {adding ? (
        <div className="flex items-center gap-2">
          <Input
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Novo termo..."
            className="glass-input h-7 text-xs"
            autoFocus
          />
          <Button variant="ghost" size="sm" onClick={add} className="h-7 text-xs">OK</Button>
          <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewValue(''); }} className="h-7 text-xs">Cancelar</Button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs text-accent hover:underline flex items-center gap-1">
          <Plus className="h-3 w-3" /> Adicionar exclusão
        </button>
      )}
    </div>
  );
}

function FrenteResultView({ result, frenteId, onRegenerateTexto }: { result: FrenteResult; frenteId: string; onRegenerateTexto: (id: string) => void }) {
  const { titles, descriptions, keywords, loadingTitles, loadingDescriptions, loadingKeywords, regeneratingTexto } = result;

  const exportAll = () => {
    const lines: string[] = [];
    if (titles) {
      lines.push(`== ${titles.grupo} ==\n`);
      lines.push(`Caminho: ${titles.caminhoExibicao}\n`);
      lines.push(`Texto Único: ${titles.textoUnico}\n`);
      lines.push('\n--- Títulos Curtos ---');
      titles.titulos.forEach(t => lines.push(`${t.num}. ${t.texto} (${t.texto.length} chars)${t.fixar ? ' [FIXAR]' : ''}`));
      lines.push('\n--- Títulos Longos ---');
      titles.titulosLongos.forEach((t, i) => lines.push(`${i + 1}. ${t.texto} (${t.texto.length} chars)`));
    }
    if (descriptions) {
      lines.push('\n--- Descrições ---');
      descriptions.descricoes.forEach((d, i) => lines.push(`${i + 1}. ${d.texto} (${d.texto.length} chars)`));
    }
    if (keywords) {
      lines.push('\n--- Palavras-Chave ---');
      keywords.palavrasChave.forEach(k => lines.push(k));
      lines.push('\n--- Frases de Destaque ---');
      keywords.frasesDestaque.forEach(f => lines.push(f));
      lines.push('\n--- Snippets ---');
      keywords.snippets.forEach(s => lines.push(s));
      lines.push('\n--- Negativos Específicos ---');
      keywords.negativasEspecificas.forEach(n => lines.push(n));
      lines.push('\n--- Negativos Globais ---');
      keywords.negativasGlobais.forEach(n => lines.push(n));
      lines.push('\n--- Sitelinks ---');
      keywords.sitelinks.forEach((s, i) => lines.push(`${i + 1}. ${s.texto} | ${s.descricao1} | ${s.descricao2} | ${s.url}`));
      lines.push('\n--- Segmento de Público ---');
      keywords.segmentoPublico.forEach(s => lines.push(s));
    }
    navigator.clipboard.writeText(lines.join('\n'));
  };

  // C7: merge exclusões from diretrizes + negativasGlobais
  const mergedExclusions = keywords
    ? [...new Set([...keywords.diretrizes.exclusoes, ...keywords.negativasGlobais])]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportAll} className="gap-2 border-white/10 text-foreground hover:bg-muted">
          <Download className="h-4 w-4" /> Exportar Tudo
        </Button>
      </div>

      {/* 1. Caminho de exibição */}
      {loadingTitles ? <SkeletonSection title="Caminho de Exibição" /> : titles && (
        <SectionCard title="Caminho de Exibição" copyText={titles.caminhoExibicao}>
          <p className="text-sm text-muted-foreground font-mono">{titles.caminhoExibicao}</p>
        </SectionCard>
      )}

      {/* 2. Texto Único — C1: botão regenerar se > 280 */}
      {loadingTitles ? <SkeletonSection title="Texto Único" /> : titles && (
        <SectionCard title="Texto Único" copyText={titles.textoUnico}>
          <p className="text-sm text-muted-foreground">{titles.textoUnico}</p>
          <div className="flex items-center gap-2">
            <CharBadge length={titles.textoUnico.length} max={280} />
            {titles.textoUnico.length > 280 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRegenerateTexto(frenteId)}
                disabled={regeneratingTexto}
                className="h-6 text-xs gap-1 border-white/10 text-foreground hover:bg-muted"
              >
                {regeneratingTexto ? <Sparkles className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Regenerar Texto Único
              </Button>
            )}
          </div>
        </SectionCard>
      )}

      {/* 3. Títulos Curtos — C2: lock icon for 1-2 */}
      {loadingTitles ? <SkeletonSection title="Títulos Curtos (15)" /> : titles && (
        <SectionCard title="Títulos Curtos (15)" copyText={titles.titulos.map(t => t.texto).join('\n')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-white/10">
                  <th className="text-left py-2 w-8">#</th>
                  <th className="text-left py-2">Texto</th>
                  <th className="text-center py-2 w-16">Chars</th>
                  <th className="text-center py-2 w-12">Fixar</th>
                  <th className="text-center py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {titles.titulos.map((t, idx) => (
                  <tr key={t.num} className="border-b border-white/5">
                    <td className="py-2 text-muted-foreground">{t.num}</td>
                    <td className="py-2 text-foreground">{t.texto}</td>
                    <td className="py-2 text-center"><CharBadge length={t.texto.length} max={30} /></td>
                    <td className="py-2 text-center">
                      {idx < 2 ? <Lock className="h-3.5 w-3.5 text-accent mx-auto" /> : null}
                    </td>
                    <td className="py-2"><CopyButton text={t.texto} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* 4. Títulos Longos */}
      {loadingTitles ? <SkeletonSection title="Títulos Longos (5)" /> : titles && (
        <SectionCard title="Títulos Longos (5)" copyText={titles.titulosLongos.map(t => t.texto).join('\n')}>
          <div className="space-y-2">
            {titles.titulosLongos.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1">
                <span className="text-sm text-foreground flex-1">{t.texto}</span>
                <CharBadge length={t.texto.length} max={90} />
                <CopyButton text={t.texto} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 5. Descrições */}
      {loadingDescriptions ? <SkeletonSection title="Descrições (5)" /> : descriptions && (
        <SectionCard title="Descrições (5)" copyText={descriptions.descricoes.map(d => d.texto).join('\n')}>
          <div className="space-y-2">
            {descriptions.descricoes.map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1">
                <span className="text-sm text-foreground flex-1">{d.texto}</span>
                <CharBadge length={d.texto.length} max={90} />
                <CopyButton text={d.texto} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 6-14: Keywords sections */}
      {loadingKeywords ? (
        <>
          <SkeletonSection title="Palavras-Chave" />
          <SkeletonSection title="Frases de Destaque" />
          <SkeletonSection title="Sitelinks" />
        </>
      ) : keywords && (
        <>
          <SectionCard title="Palavras-Chave" copyText={keywords.palavrasChave.join('\n')}>
            <div className="flex flex-wrap gap-2">
              {keywords.palavrasChave.map((k, i) => (
                <Badge key={i} variant="secondary" className="bg-muted text-foreground border-white/10">{k}</Badge>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Frases de Destaque" copyText={keywords.frasesDestaque.join('\n')}>
            <ul className="space-y-1">
              {keywords.frasesDestaque.map((f, i) => <li key={i} className="text-sm text-muted-foreground">• {f}</li>)}
            </ul>
          </SectionCard>

          {/* C3: Snippets with 25 char validation */}
          <SectionCard title="Snippets" copyText={keywords.snippets.join('\n')}>
            <div className="space-y-1">
              {keywords.snippets.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">• {s}</span>
                  <CharBadge length={s.length} max={25} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Negativos Específicos" copyText={keywords.negativasEspecificas.join('\n')}>
            <div className="flex flex-wrap gap-2">
              {keywords.negativasEspecificas.map((n, i) => (
                <Badge key={i} variant="outline" className="text-destructive border-destructive/30">{n}</Badge>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Negativos Globais" copyText={keywords.negativasGlobais.join('\n')}>
            <div className="flex flex-wrap gap-2">
              {keywords.negativasGlobais.map((n, i) => (
                <Badge key={i} variant="outline" className="text-destructive border-destructive/30">{n}</Badge>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Temas Indicadores" copyText={keywords.temasIndicadores.join('\n')}>
            <div className="flex flex-wrap gap-2">
              {keywords.temasIndicadores.map((t, i) => (
                <Badge key={i} variant="secondary" className="bg-muted text-foreground border-white/10">{t}</Badge>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Segmento de Público" copyText={keywords.segmentoPublico.join('\n')}>
            <ul className="space-y-1">
              {keywords.segmentoPublico.map((s, i) => <li key={i} className="text-sm text-muted-foreground">• {s}</li>)}
            </ul>
          </SectionCard>

          <SectionCard title="Sitelinks" copyText={keywords.sitelinks.map(s => `${s.texto} | ${s.descricao1} | ${s.descricao2} | ${s.url}`).join('\n')}>
            <div className="grid gap-3">
              {keywords.sitelinks.map((s, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{s.texto}</span>
                    <span className="text-xs text-muted-foreground">{s.texto.length}/25</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.descricao1} <CharBadge length={s.descricao1.length} max={35} /></p>
                  <p className="text-xs text-muted-foreground">{s.descricao2} <CharBadge length={s.descricao2.length} max={35} /></p>
                  <p className="text-xs text-accent truncate">{s.url}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* C7: Editable exclusions pre-filled with negativasGlobais */}
          <SectionCard title="Diretrizes de Texto">
            <div className="space-y-2">
              <EditableExclusions initial={mergedExclusions} />
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Restrições:</p>
                <ul>{keywords.diretrizes.restricoes.map((r, i) => <li key={i} className="text-xs text-muted-foreground">• {r}</li>)}</ul>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Instruções de Campanha">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Tipo:</strong> {keywords.instrucoesCampanha.tipoCampanha}</p>
              <p><strong className="text-foreground">Conversão:</strong> {keywords.instrucoesCampanha.metodoConversao}</p>
              <p><strong className="text-foreground">Expansão URL:</strong> {keywords.instrucoesCampanha.expansaoUrl ? 'Sim' : 'Não'}</p>
              <p><strong className="text-foreground">Otimização:</strong> {keywords.instrucoesCampanha.otimizacaoRecursos ? 'Sim' : 'Não'}</p>
              <p><strong className="text-foreground">Público:</strong> {keywords.instrucoesCampanha.publicoIdade}, {keywords.instrucoesCampanha.publicoGenero}</p>
              <div className="mt-2">
                <p className="text-xs font-medium text-foreground mb-1">Dicas:</p>
                <ul>{keywords.instrucoesCampanha.dicas.map((d, i) => <li key={i} className="text-xs">• {d}</li>)}</ul>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

export default function GoogleAdsAIPage() {
  const {
    step, analyzing, analyze, analyzeResult,
    selectedFrentes, setSelectedFrentes,
    cta, setCta,
    cidadeCampanha, setCidadeCampanha,
    frentesResults, generating, generateForFrentes,
    currentFrenteIndex, regenerateTextoUnico, reset,
  } = useGoogleAdsAI();

  const [site, setSite] = useState('');
  const [descricao, setDescricao] = useState('');
  const [viewingFrente, setViewingFrente] = useState<string | null>(null);

  const frenteIds = Object.keys(frentesResults);
  const activeFrente = viewingFrente || frenteIds[0] || null;

  const handleAnalyze = () => analyze(site, descricao);
  const handleGenerate = () => {
    generateForFrentes();
    setViewingFrente(null);
  };

  const toggleFrente = (id: string) => {
    setSelectedFrentes(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Google Ads I.A</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerador inteligente de anúncios para Google Ads Performance Max</p>
        </div>
        {step > 1 && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-2 border-white/10 text-foreground hover:bg-muted">
            <RotateCcw className="h-4 w-4" /> Recomeçar
          </Button>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-colors',
              step >= s ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {s}
            </div>
            <span className={cn('text-sm hidden sm:inline', step >= s ? 'text-foreground' : 'text-muted-foreground')}>
              {s === 1 ? 'Análise' : s === 2 ? 'Seleção' : 'Resultados'}
            </span>
            {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Steps 1 & 2 */}
        <div className="lg:col-span-4 space-y-4">
          {/* Step 1 — C4: campo cidade obrigatório */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent" />
              <h3 className="text-base font-semibold text-foreground">Etapa 1 — Informações</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">URL do site</label>
                <Input
                  value={site}
                  onChange={e => setSite(e.target.value)}
                  placeholder="https://www.exemplo.com.br"
                  className="glass-input"
                  disabled={step > 1}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cidade desta campanha <span className="text-destructive">*</span></label>
                <Input
                  value={cidadeCampanha}
                  onChange={e => setCidadeCampanha(e.target.value)}
                  placeholder="Ex: Florianópolis, Porto Alegre, São Paulo"
                  className="glass-input"
                  disabled={step > 1}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Descrição da empresa / oferta</label>
                <Textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Descreva a empresa, serviços, diferenciais..."
                  rows={4}
                  className="glass-input resize-none"
                  disabled={step > 1}
                />
              </div>
              {step === 1 && (
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || (!site && !descricao) || !cidadeCampanha.trim()}
                  className="w-full btn-accent gap-2"
                >
                  {analyzing ? (
                    <><Sparkles className="h-4 w-4 animate-spin" /> Analisando...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Analisar com I.A</>
                  )}
                </Button>
              )}
            </div>
          </GlassCard>

          {/* Step 2 */}
          {step >= 2 && analyzeResult && (
            <GlassCard className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                <h3 className="text-base font-semibold text-foreground">Etapa 2 — Resumo & Seleção</h3>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Empresa</span><span className="text-foreground font-medium">{analyzeResult.empresa}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Segmento</span><span className="text-foreground font-medium">{analyzeResult.segmento}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cidade</span><span className="text-foreground font-medium">{cidadeCampanha || analyzeResult.cidade}</span></div>
                <div>
                  <span className="text-muted-foreground text-xs">Diferenciais:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analyzeResult.diferenciais.map((d, i) => (
                      <Badge key={i} variant="secondary" className="bg-muted text-foreground border-white/10 text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CTA principal</label>
                <Select value={cta} onValueChange={setCta} disabled={step > 2}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="formulario">Formulário</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Frentes de anúncio</label>
                <div className="space-y-2">
                  {analyzeResult.frentes.map(f => (
                    <label key={f.id} className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                      selectedFrentes.includes(f.id)
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-white/10 bg-transparent hover:bg-white/5'
                    )}>
                      <Checkbox
                        checked={selectedFrentes.includes(f.id)}
                        onCheckedChange={() => toggleFrente(f.id)}
                        disabled={step > 2}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span>{f.icone}</span>
                          <span className="text-sm font-medium text-foreground">{f.nome}</span>
                          <Badge variant={f.potencial === 'alto' ? 'default' : 'secondary'} className="text-xs ml-auto">
                            {f.potencial}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{f.descricao}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {step === 2 && (
                <Button
                  onClick={handleGenerate}
                  disabled={generating || selectedFrentes.length === 0}
                  className="w-full btn-accent gap-2"
                >
                  {generating ? (
                    <><Sparkles className="h-4 w-4 animate-spin" /> Gerando...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Gerar Anúncios ({selectedFrentes.length} frente{selectedFrentes.length > 1 ? 's' : ''})</>
                  )}
                </Button>
              )}
            </GlassCard>
          )}
        </div>

        {/* Right column: Step 3 results */}
        <div className="lg:col-span-8">
          {step < 3 ? (
            <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">Etapa 3 — Resultados</h3>
              <p className="text-sm text-muted-foreground/60 mt-2 max-w-md">
                Os anúncios gerados aparecerão aqui após a análise e seleção das frentes de anúncio.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {frenteIds.length > 1 && (
                <Select value={activeFrente || ''} onValueChange={setViewingFrente}>
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Selecione a frente" />
                  </SelectTrigger>
                  <SelectContent>
                    {frenteIds.map(id => {
                      const fr = frentesResults[id];
                      return (
                        <SelectItem key={id} value={id}>
                          {fr.frente.icone} {fr.frente.nome}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}

              {generating && (
                <div className="flex items-center gap-2 text-sm text-accent">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Gerando frente {currentFrenteIndex + 1} de {frenteIds.length}...
                </div>
              )}

              {activeFrente && frentesResults[activeFrente] && (
                <FrenteResultView
                  result={frentesResults[activeFrente]}
                  frenteId={activeFrente}
                  onRegenerateTexto={regenerateTextoUnico}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
