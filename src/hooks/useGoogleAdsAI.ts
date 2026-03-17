import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Frente {
  id: string;
  nome: string;
  icone: string;
  descricao: string;
  potencial: string;
}

export interface AnalyzeResult {
  empresa: string;
  segmento: string;
  cidade: string;
  cta: string;
  diferenciais: string[];
  frentes: Frente[];
}

export interface Titulo {
  num: number;
  texto: string;
  fixar: boolean;
}

export interface TitlesResult {
  grupo: string;
  caminhoExibicao: string;
  textoUnico: string;
  titulos: Titulo[];
  titulosLongos: { texto: string }[];
}

export interface DescriptionsResult {
  descricoes: { texto: string }[];
}

export interface Sitelink {
  texto: string;
  descricao1: string;
  descricao2: string;
  url: string;
}

export interface KeywordsResult {
  palavrasChave: string[];
  frasesDestaque: string[];
  snippets: string[];
  negativasEspecificas: string[];
  negativasGlobais: string[];
  temasIndicadores: string[];
  segmentoPublico: string[];
  sitelinks: Sitelink[];
  diretrizes: { exclusoes: string[]; restricoes: string[] };
  instrucoesCampanha: {
    tipoCampanha: string;
    metodoConversao: string;
    expansaoUrl: boolean;
    otimizacaoRecursos: boolean;
    publicoIdade: string;
    publicoGenero: string;
    dicas: string[];
  };
}

export interface FrenteResult {
  frente: Frente;
  titles?: TitlesResult;
  descriptions?: DescriptionsResult;
  keywords?: KeywordsResult;
  loadingTitles: boolean;
  loadingDescriptions: boolean;
  loadingKeywords: boolean;
  regeneratingTexto?: boolean;
}

type Step = 1 | 2 | 3;

function fixTitulos(titulos: Titulo[]): Titulo[] {
  return titulos.map((t, i) => ({
    ...t,
    fixar: i < 2 ? true : false,
  }));
}

export function useGoogleAdsAI() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [selectedFrentes, setSelectedFrentes] = useState<string[]>([]);
  const [cta, setCta] = useState('');
  const [cidadeCampanha, setCidadeCampanha] = useState('');
  const [frentesResults, setFrentesResults] = useState<Record<string, FrenteResult>>({});
  const [generating, setGenerating] = useState(false);
  const [currentFrenteIndex, setCurrentFrenteIndex] = useState(0);

  const callEdge = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('google-ads-ai-gen', { body });
    if (error) {
      const msg = (error as any)?.message || 'Erro na chamada da IA';
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const analyze = useCallback(async (site: string, descricao: string) => {
    setAnalyzing(true);
    try {
      const result = await callEdge({ action: 'analyze', site, descricao, cidadeCampanha }) as AnalyzeResult;
      setAnalyzeResult(result);
      setCta(result.cta || 'whatsapp');
      setSelectedFrentes(result.frentes.map(f => f.id));
      setStep(2);
    } catch (e: any) {
      toast({ title: 'Erro na análise', description: e.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  }, [callEdge, toast, cidadeCampanha]);

  const generateForFrentes = useCallback(async () => {
    if (!analyzeResult) return;
    setGenerating(true);
    setStep(3);

    const chosen = analyzeResult.frentes.filter(f => selectedFrentes.includes(f.id));
    const diferenciais = analyzeResult.diferenciais.join(', ');
    const baseParams = {
      empresa: analyzeResult.empresa,
      cidade: analyzeResult.cidade,
      segmento: analyzeResult.segmento,
      diferenciais,
      cta,
      cidadeCampanha,
    };

    const initial: Record<string, FrenteResult> = {};
    chosen.forEach(f => {
      initial[f.id] = { frente: f, loadingTitles: true, loadingDescriptions: true, loadingKeywords: true };
    });
    setFrentesResults(initial);
    setCurrentFrenteIndex(0);

    for (let i = 0; i < chosen.length; i++) {
      const f = chosen[i];
      setCurrentFrenteIndex(i);

      try {
        const titles = await callEdge({ action: 'titles', ...baseParams, servico: f.nome }) as TitlesResult;
        titles.titulos = fixTitulos(titles.titulos);
        setFrentesResults(prev => ({
          ...prev,
          [f.id]: { ...prev[f.id], titles, loadingTitles: false },
        }));

        const descriptions = await callEdge({ action: 'descriptions', ...baseParams, servico: f.nome }) as DescriptionsResult;
        setFrentesResults(prev => ({
          ...prev,
          [f.id]: { ...prev[f.id], descriptions, loadingDescriptions: false },
        }));

        const keywords = await callEdge({ action: 'keywords', ...baseParams, servico: f.nome }) as KeywordsResult;
        setFrentesResults(prev => ({
          ...prev,
          [f.id]: { ...prev[f.id], keywords, loadingKeywords: false },
        }));
      } catch (e: any) {
        toast({ title: `Erro gerando "${f.nome}"`, description: e.message, variant: 'destructive' });
        setFrentesResults(prev => ({
          ...prev,
          [f.id]: { ...prev[f.id], loadingTitles: false, loadingDescriptions: false, loadingKeywords: false },
        }));
      }
    }

    setGenerating(false);
  }, [analyzeResult, selectedFrentes, cta, cidadeCampanha, callEdge, toast]);

  const regenerateTextoUnico = useCallback(async (frenteId: string) => {
    const fr = frentesResults[frenteId];
    if (!fr?.titles || !analyzeResult) return;

    setFrentesResults(prev => ({
      ...prev,
      [frenteId]: { ...prev[frenteId], regeneratingTexto: true },
    }));

    try {
      const result = await callEdge({
        action: 'regenerate_texto_unico',
        empresa: analyzeResult.empresa,
        servico: fr.frente.nome,
        cidade: analyzeResult.cidade,
        cidadeCampanha,
        diferenciais: analyzeResult.diferenciais.join(', '),
        cta,
        textoAtual: fr.titles.textoUnico,
      }) as { textoUnico: string };

      setFrentesResults(prev => ({
        ...prev,
        [frenteId]: {
          ...prev[frenteId],
          titles: { ...prev[frenteId].titles!, textoUnico: result.textoUnico },
          regeneratingTexto: false,
        },
      }));
      toast({ title: 'Texto único regenerado!' });
    } catch (e: any) {
      toast({ title: 'Erro ao regenerar', description: e.message, variant: 'destructive' });
      setFrentesResults(prev => ({
        ...prev,
        [frenteId]: { ...prev[frenteId], regeneratingTexto: false },
      }));
    }
  }, [frentesResults, analyzeResult, cidadeCampanha, cta, callEdge, toast]);

  const reset = useCallback(() => {
    setStep(1);
    setAnalyzeResult(null);
    setSelectedFrentes([]);
    setCta('');
    setFrentesResults({});
    setGenerating(false);
    setCurrentFrenteIndex(0);
  }, []);

  return {
    step, setStep,
    analyzing, analyze,
    analyzeResult,
    selectedFrentes, setSelectedFrentes,
    cta, setCta,
    cidadeCampanha, setCidadeCampanha,
    frentesResults,
    generating, generateForFrentes,
    currentFrenteIndex,
    regenerateTextoUnico,
    reset,
  };
}
