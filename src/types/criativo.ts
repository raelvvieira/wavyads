export interface VisualAnalysis {
  composicao: { formato: string; estrutura: string; hierarquia: string; silencio: string };
  fotografia: { tipo: string; luz: string; tratamento: string; integracao: string };
  paleta: { dominante: string; secundaria: string; acento: string; saturacao: string; hexes: string[] };
  tipografia: { familiaA: string; familiaB: string; contraste: string; alinhamento: string };
  camadas: string[];
  hierarquiaVisual: string;
  espaco: string;
  mood: { adjetivos: string[]; referencias: string[]; evita: string[] };
  designSystemDoc: string;
}

export interface CopyResult {
  angulo?: string;
  label: string;
  titulo: string;
  subtitulo: string;
  dados: string;
  cta: string;
  avaliacao: { clareza: string; hierarquia: string; brevidade: string; gatilho: string; tom: string };
  justificativa: string;
}

export interface ClientEditorial {
  id: string;
  client_id: string;
  design_system_doc: string;
  visual_analysis: VisualAnalysis;
  updated_at: string;
}
