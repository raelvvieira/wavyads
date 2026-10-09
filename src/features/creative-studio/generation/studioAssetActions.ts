import type { CreativeAsset, CreativeAspectRatio, CreativeResolution } from '../types/creative';
import { IMAGE_GENERATION_MODEL, IMAGE_EDIT_MODEL } from './capabilities';
import {
  buildFactorVariationRequest,
  buildAvatarRequest,
  buildEditRequest,
  buildGenerationRequest,
  buildResizeRequest,
  buildRetryRequest,
} from './generationRequests';
import type { AvatarPersona } from '../types/avatarPersona';
import type { FactorCreativeOutput, FactorVariation } from '../types/factorCreative';
import type { ArtDirectionInput, ArtDirectionResult } from '../api/artDirection';
import type { ReferenceAnalysis } from '../api/referenceAnalysis';
import { briefingDaArte } from '@/lib/creativeStudio/briefing';


/**
 * Orquestra gerar/editar/redimensionar/retentar contra as edge functions
 * reais, gravando o ciclo `generating` → `ready`/`failed` no banco.
 *
 * Todo acesso externo entra por dependência injetada — nenhum import de
 * Supabase aqui. É o que permite testar a orquestração inteira (a ordem das
 * chamadas, o que grava antes e depois, o que acontece quando o provedor
 * falha) sem rede e sem mock de módulo.
 */
export interface StudioAssetActionsDeps {
  ensureProjectId(): Promise<string>;
  clientId: string | null;
  invoke(name: string, body: unknown, timeoutMs: number): Promise<{ data: any; error: unknown }>;
  extractErrorMessage(error: unknown): Promise<string>;
  // `any` de propósito: aceita tanto `CreateCreativeAssetInput`/
  // `UpdateCreativeAssetInput` reais quanto os objetos soltos que os testes
  // usam para simular o banco, sem duplicar os dois tipos aqui.
  createAsset(input: any): Promise<CreativeAsset>;
  updateAsset(id: string, patch: any): Promise<CreativeAsset>;
  /** Só o Fator usa: as 5 variações nascem irmãs de um lote. */
  createGroup?(input: any): Promise<{ id: string }>;
  /**
   * Escreve o que aparece no quadro antes da imagem existir.
   *
   * Opcional porque a geração precisa continuar funcionando sem ela — é
   * uma camada a mais de qualidade, não um pré-requisito.
   */
  directArt?(input: ArtDirectionInput): Promise<ArtDirectionResult>;
  /** Lê as referências anexadas e devolve o sistema visual delas. */
  analyzeReferences?(urls: string[]): Promise<ReferenceAnalysis | null>;
  /**
   * Busca uma linha inteira pelo id — com `prompt` e `metadata`.
   *
   * O Fator usa para SUBIR A LINHAGEM quando a arte-base chega sem sistema
   * visual. Opcional: sem ela, o Fator segue com o que a base tiver, que é
   * o comportamento de antes.
   */
  getAsset?(id: string): Promise<CreativeAsset | null>;
  recordUsage(usageKey: string): void;
}

/** Os estágios que o dock mostra enquanto a arte não existe. */
export type GenerationStage = 'reading-references' | 'directing' | 'generating';

/**
 * O que o sistema entendeu do pedido, antes de qualquer imagem.
 *
 * Esta leitura SEMPRE existiu — ela rodava no meio do `generate`, entre a
 * criação da linha e a chamada ao provedor, e ia direto para o prompt. O
 * usuário via um spinner e uma arte pronta.
 *
 * Separá-la num passo próprio não acrescenta trabalho: é a mesma leitura,
 * só que devolvida a quem pediu antes de ser gasta. É o que permite
 * mostrá-la, corrigi-la com uma frase, e só então gerar.
 */
export interface StudioInterpretation {
  artDirection: ArtDirectionResult['artDirection'];
  copyBlocks: ArtDirectionResult['copyBlocks'];
  designSystemDoc: string | null;
  antiPadroes: string[] | null;
  mood: ReferenceAnalysis['mood'] | null;
  /** O documento de estilo saiu de arte de terceiros? */
  designSystemFromReference: boolean;
}

export interface GenerationOptions {
  resolution?: CreativeResolution;
  /** Default `IMAGE_GENERATION_MODEL.id` — parametrizável para a Fase 7. */
  modelId?: string;
  /** Texto final anexado via "Anexar copy" — renderizado verbatim. */
  copy?: string | null;
  logoImageUrl?: string | null;
  /**
   * As referências de ESTILO.
   *
   * NÃO viajam como imagem para o gerador, em caminho nenhum. São lidas por
   * `analyzeReferences` e viram texto — `designSystemDoc`, `mood`,
   * `antiPadroes`. Foi anexá-las ao gerador que fez uma arte sair com a
   * pessoa e a logo de uma peça de terceiros no lugar das do cliente: o
   * prompt as declarava como "the PRODUCT being advertised", e o modelo
   * obedeceu.
   *
   * A garantia aqui é estrutural, não uma instrução a ser respeitada: é
   * impossível copiar um rosto que o modelo nunca viu.
   */
  referenceImageUrls?: string[];
  /** Fotos de PRODUTO — objeto, embalagem. */
  productImageUrls?: string[];
  /** Fotos de PESSOAS reais, anexadas pelo painel de produto. Recebem a
   *  mesma proteção de identidade do avatar. */
  personImageUrls?: string[];
  /** Avatares anexados — entram como talento do anúncio. */
  avatarImageUrls?: string[];
  /** Contexto que ajuda a direção de arte a acertar o tom. */
  clientName?: string | null;
  language?: string;
  /**
   * A leitura já feita.
   *
   * Quando vem preenchida, `generate` NÃO relê referências nem redirige a
   * arte: ela já foi lida uma vez, mostrada ao usuário e aprovada por ele.
   * Reler aqui custaria duas chamadas de IA para chegar a um resultado
   * possivelmente diferente do que foi aprovado — ou seja, geraria uma arte
   * que não é a que ele disse sim.
   */
  interpretation?: StudioInterpretation | null;
  /**
   * O lugar desta peça num pedido de várias.
   *
   * Fica no metadata, e não num `asset_group`: `asset_groups.type` tem CHECK
   * no banco, e inventar um tipo novo é exatamente o que derrubou o insert
   * inteiro do Fator (23514, em `factor_axis`). O agrupamento visual pode
   * vir depois, com a migração dele; a procedência não precisa esperar.
   */
  batch?: { indice: number; total: number } | null;
  /**
   * A leitura das REFERÊNCIAS já feita.
   *
   * Num pedido de duas peças, `interpret` roda duas vezes — e sem isto as
   * mesmas referências seriam decodificadas duas vezes, por duas chamadas
   * de visão, para chegar ao mesmo documento de estilo. É o mesmo custo que
   * `interpretation` evita na geração, um degrau acima.
   */
  referenceReading?: Pick<
    StudioInterpretation,
    'designSystemDoc' | 'antiPadroes' | 'mood' | 'designSystemFromReference'
  > | null;
  /**
   * Avisa em que etapa a geração está.
   *
   * Sem isso, ler referência e dirigir a arte somam segundos em que a tela
   * fica parada dizendo só "gerando" — e um usuário que não vê progresso
   * clica de novo.
   */
  onStage?: (stage: GenerationStage) => void;
  /**
   * Avisa que a linha existe, ainda em `generating`.
   *
   * Dispara ANTES de ler referências e de escrever a direção de arte — que
   * juntas levam segundos. Sem isso o canvas ficava vazio o pedido inteiro
   * e a arte aparecia do nada no fim; com isso o card de carregando ocupa
   * desde já o lugar onde ela vai nascer.
   */
  onAssetCreated?: (asset: CreativeAsset) => void;
}

export interface StudioAssetActions {
  /**
   * Lê o pedido e os anexos, sem gerar nada e sem gravar linha.
   *
   * Nenhuma chamada ao provedor de imagem acontece aqui — e é essa a razão
   * de existir: a leitura custa segundos e nada de dinheiro, a geração
   * custa os dois. Parar entre as duas é o que torna possível corrigir.
   */
  interpret(brief: string, aspectRatio: CreativeAspectRatio, options?: GenerationOptions): Promise<StudioInterpretation>;
  generate(brief: string, aspectRatio: CreativeAspectRatio, options?: GenerationOptions): Promise<CreativeAsset>;
  /** Retrato de uma persona — vira asset `avatar`, reutilizável depois. */
  generateAvatar(
    persona: AvatarPersona,
    /** Fotos DA pessoa, para o retrato sair com a semelhança dela. */
    likenessImageUrls?: string[],
    /** A linha em `generating`, para o card aparecer antes da imagem. */
    onCreated?: (asset: CreativeAsset) => void,
  ): Promise<CreativeAsset>;
  /**
   * Fator Criativo V2: 5 variações estratégicas da arte-base.
   *
   * Devolve as 5 linhas já criadas em `generating` e chama `onSlotDone` a
   * cada uma que conclui — o canvas mostra o lote inteiro na hora e cada
   * card resolve sozinho, em vez de tudo aparecer no fim.
   */
  factorCriativo(input: {
    base: CreativeAsset;
    variations: FactorVariation[];
    diagnosis?: FactorCreativeOutput['originalDiagnosis'] | null;
    /**
     * As 5 linhas assim que existem, todas em `generating`.
     *
     * O comentário abaixo dizia que "as 5 linhas nascem ANTES de qualquer
     * imagem: é o que faz o lote inteiro aparecer no canvas de uma vez" —
     * e nascer elas nasciam, só que ninguém avisava a tela. O canvas
     * continuava vazio até a primeira arte ficar pronta.
     */
    onSlotsCreated?: (assets: CreativeAsset[]) => void;
    onSlotDone?: (asset: CreativeAsset) => void;
  }): Promise<CreativeAsset[]>;
  retry(asset: CreativeAsset): Promise<CreativeAsset>;
  edit(
    asset: CreativeAsset,
    feedback: string,
    onCreated?: (asset: CreativeAsset) => void,
  ): Promise<CreativeAsset>;
  resize(asset: CreativeAsset, onCreated?: (asset: CreativeAsset) => void): Promise<CreativeAsset>;
}

/**
 * Fecha uma chamada de geração: grava a linha ANTES de chamar o provedor
 * (para o card aparecer "gerando" de verdade), chama, e grava o resultado
 * na MESMA linha — sucesso ou falha.
 *
 * A linha nascer antes da resposta é o que distingue isto de só inserir no
 * fim: uma falha a meio do caminho não desaparece muda, ela chega ao card.
 */
async function runGeneration(
  deps: StudioAssetActionsDeps,
  row: CreativeAsset,
  body: unknown,
): Promise<CreativeAsset> {
  try {
    const { data, error } = await deps.invoke('criativo-generate', body, 90_000);
    if (error) throw new Error(await deps.extractErrorMessage(error));
    const apiError = (data as any)?.error;
    if (apiError) throw new Error(apiError);
    const url = (data as any).imageUrl as string;
    deps.recordUsage(IMAGE_GENERATION_MODEL.usageKey);
    return await deps.updateAsset(row.id, { status: 'ready', url, thumbnailUrl: url });
  } catch (e: any) {
    return await deps.updateAsset(row.id, { status: 'failed', errorMessage: e?.message || 'Erro desconhecido' });
  }
}

/**
 * A leitura do pedido: as referências viram texto, e o pedido vira direção.
 *
 * As duas etapas MELHORAM a arte; nenhuma delas pode impedi-la. Uma IA fora
 * do ar, um modelo descontinuado ou uma referência que o provedor não
 * conseguiu ler viram uma geração mais simples, nunca uma geração a menos —
 * o usuário pediu uma arte, não um relatório de indisponibilidade.
 */
async function lerOPedido(
  deps: StudioAssetActionsDeps,
  brief: string,
  aspectRatio: CreativeAspectRatio,
  options: GenerationOptions,
): Promise<StudioInterpretation> {
  const referencias = options.referenceImageUrls ?? [];
  const produtos = options.productImageUrls ?? [];
  const pessoas = options.personImageUrls ?? [];
  const avatares = options.avatarImageUrls ?? [];

  // Lê as REFERÊNCIAS, e só elas. Isto lia `produtos` — o erro inverso do
  // relatado, e igualmente errado: a foto da embalagem do cliente era
  // decodificada como se fosse a linguagem visual a imitar, e ainda custava
  // uma chamada de visão em toda geração com produto.
  const jaLido = options.referenceReading ?? null;
  let analise: ReferenceAnalysis | null = null;
  if (!jaLido && referencias.length > 0 && deps.analyzeReferences) {
    options.onStage?.('reading-references');
    try {
      analise = await deps.analyzeReferences(referencias);
    } catch {
      analise = null;
    }
  }
  const estilo = jaLido ?? {
    designSystemDoc: analise?.designSystemDoc ?? null,
    antiPadroes: analise?.antiPadroes ?? null,
    mood: analise?.mood ?? null,
    // O documento saiu de arte de terceiros: a cláusula que proíbe
    // reproduzir a marca de origem só existe quando houve referência.
    designSystemFromReference: referencias.length > 0,
  };

  let direcao: ArtDirectionResult = { artDirection: null, copyBlocks: null };
  if (deps.directArt) {
    options.onStage?.('directing');
    try {
      direcao = await deps.directArt({
        brief,
        copy: options.copy ?? null,
        clientName: options.clientName ?? null,
        language: options.language,
        aspectRatio,
        designSystemDoc: estilo.designSystemDoc,
        hasReferences: referencias.length > 0,
        hasProduct: produtos.length > 0,
        // Pessoa e avatar são a MESMA pergunta para a direção de arte:
        // "há um humano real no quadro?". Mapear aqui é o que dispensa
        // um campo novo — e, com ele, um deploy da edge function.
        hasAvatar: avatares.length + pessoas.length > 0,
        hasLogo: !!options.logoImageUrl,
      });
    } catch {
      direcao = { artDirection: null, copyBlocks: null };
    }
  }

  return {
    artDirection: direcao.artDirection,
    copyBlocks: direcao.copyBlocks,
    ...estilo,
  };
}

/** As chaves que descrevem a MARCA da peça — as que não podem faltar no Fator. */
const CHAVES_DE_MARCA = [
  'designSystemDoc', 'antiPadroes', 'designSystemFromReference',
  'artDirection', 'copyBlocks', 'logoImage',
] as const;

/**
 * Completa o metadata da arte-base com o do ancestral mais próximo.
 *
 * Sobe no máximo três degraus: uma cadeia original → resize → edição →
 * edição já é longa, e cada degrau custa uma ida ao banco. Três cobre o que
 * existe no acervo sem transformar um clique em cinco consultas.
 *
 * Só preenche o que está FALTANDO. O que a base tem vence sempre — ela é a
 * peça que o usuário escolheu, e sobrescrevê-la com o avô seria desfazer
 * uma edição deliberada.
 */
async function herdarDoAncestral(
  deps: StudioAssetActionsDeps,
  base: CreativeAsset,
): Promise<CreativeAsset> {
  const falta = CHAVES_DE_MARCA.filter((k) => (base.metadata as any)?.[k] == null);
  if (falta.length === 0 || !deps.getAsset) return base;

  let metadata: Record<string, unknown> = { ...(base.metadata ?? {}) };
  let faltando = [...falta];
  let paiId = base.parentAssetId ?? null;

  for (let degrau = 0; degrau < 3 && paiId && faltando.length > 0; degrau++) {
    let pai: CreativeAsset | null = null;
    try {
      pai = await deps.getAsset(paiId);
    } catch {
      break; // uma consulta que falha não pode impedir a geração
    }
    if (!pai) break;

    for (const k of faltando) {
      const v = (pai.metadata as any)?.[k];
      if (v != null) metadata[k] = v;
    }
    faltando = faltando.filter((k) => metadata[k] == null);
    paiId = pai.parentAssetId ?? null;
  }

  // O briefing também sobe: é ele que o estrategista lê como "a peça
  // aprovada", e um reenquadramento o teria substituído por texto de corte.
  const briefing = briefingDaArte({ prompt: base.prompt, metadata } as any);
  return { ...base, prompt: briefing || base.prompt, metadata } as CreativeAsset;
}

export function createStudioAssetActions(deps: StudioAssetActionsDeps): StudioAssetActions {
  return {
    interpret(brief, aspectRatio, options = {}) {
      return lerOPedido(deps, brief, aspectRatio, options);
    },

    async generate(brief, aspectRatio, options = {}) {
      const referencias = options.referenceImageUrls ?? [];
      const produtos = options.productImageUrls ?? [];
      const pessoas = options.personImageUrls ?? [];
      const avatares = options.avatarImageUrls ?? [];
      const anexos = {
        lote: options.batch ?? null,
        logoImage: options.logoImageUrl ?? null,
        productImages: produtos,
        personImages: pessoas,
        avatarImages: avatares,
        // Gravadas para procedência e para a contagem de uso do menu de
        // anexos — nunca relidas como imagem de geração.
        referenceImages: referencias,
      };

      /**
       * A linha nasce ANTES do enriquecimento.
       *
       * O prompt preliminar já é um prompt válido — a direção de arte e o
       * sistema visual são camadas por cima, não pré-requisitos. Criar a
       * linha aqui é o que faz o card "gerando" ocupar o lugar da arte no
       * instante do pedido, em vez de depois dos segundos que a leitura de
       * referência e a direção consomem. Também é o que faz uma aba fechada
       * no meio do caminho deixar uma linha recuperável em vez de nada.
       */
      const preliminar = buildGenerationRequest({
        brief,
        aspectRatio,
        resolution: options.resolution,
        modelId: options.modelId,
        copy: options.copy,
        logoImageUrl: options.logoImageUrl,
        productImageUrls: produtos,
        personImageUrls: pessoas,
        avatarImageUrls: avatares,
      });
      const projectId = await deps.ensureProjectId();
      const row = await deps.createAsset({
        projectId,
        clientId: deps.clientId,
        type: 'original',
        status: 'generating',
        aspectRatio,
        resolution: options.resolution ?? '2K',
        prompt: preliminar.prompt,
        model: options.modelId ?? IMAGE_GENERATION_MODEL.id,
        metadata: anexos,
      });
      options.onAssetCreated?.(row);

      /*
       * A leitura, quando ela ainda não foi feita.
       *
       * Com a proposta ligada ela JÁ foi: o usuário leu o que o sistema
       * entendeu e disse sim àquilo. Reler aqui chamaria duas IAs de novo
       * para possivelmente chegar a outra interpretação — e gerar uma arte
       * que não é a que ele aprovou.
       */
      const leitura = options.interpretation
        ?? await lerOPedido(deps, brief, aspectRatio, options);

      options.onStage?.('generating');
      const { prompt, body } = buildGenerationRequest({
        brief,
        aspectRatio,
        resolution: options.resolution,
        modelId: options.modelId,
        copy: options.copy,
        logoImageUrl: options.logoImageUrl,
        productImageUrls: produtos,
        personImageUrls: pessoas,
        avatarImageUrls: avatares,
        artDirection: leitura.artDirection,
        copyBlocks: leitura.copyBlocks,
        designSystemDoc: leitura.designSystemDoc,
        designSystemIsThirdParty: leitura.designSystemFromReference,
        antiPadroes: leitura.antiPadroes,
        mood: leitura.mood,
      });
      // A linha já existe; o que muda agora é o prompt definitivo e o que a
      // arte recebeu de direção. As URLs dos anexos não sobrevivem no
      // PROMPT — ele só MENCIONA logo/produto ("a brand logo is
      // provided...") —, e é por isso que o metadata as guarda: é o que
      // permite o retry devolver os mesmos anexos.
      const comPrompt = await deps.updateAsset(row.id, {
        prompt,
        metadata: {
          ...anexos,
          // O que a arte recebeu de direção fica gravado com ela. É o que
          // permite ao inspetor explicar por que a peça saiu como saiu — e
          // é sobre isso que o usuário vai querer iterar, não sobre o
          // prompt de 4 mil caracteres.
          artDirection: leitura.artDirection,
          copyBlocks: leitura.copyBlocks,
          designSystemDoc: leitura.designSystemDoc,
          antiPadroes: leitura.antiPadroes,
          // O Fator e o retry precisam saber que o sistema visual veio de
          // fora, para reemitir a proibição de reproduzir a marca de
          // origem. `undefined` marca linha gerada antes desta separação.
          designSystemFromReference: leitura.designSystemFromReference,
        },
      });
      return runGeneration(deps, comPrompt, body);
    },

    async generateAvatar(persona, likenessImageUrls = [], onCreated) {
      const { prompt, body } = buildAvatarRequest({ persona, likenessImageUrls });
      const projectId = await deps.ensureProjectId();
      const row = await deps.createAsset({
        projectId,
        clientId: deps.clientId,
        type: 'avatar',
        status: 'generating',
        aspectRatio: '4:5',
        resolution: '2K',
        prompt,
        model: IMAGE_GENERATION_MODEL.id,
        filename: persona.name,
        // Os traços ficam guardados, não só o prompt: é o que permite
        // reabrir o customizador com o que foi escolhido e regerar a
        // persona depois, em vez de só olhar o retrato pronto.
        // `likenessImages`, e não `referenceImages`: neste metadata elas são
        // fotos DA pessoa, a serem copiadas — o oposto do que
        // `referenceImages` passou a significar numa arte gerada.
        metadata: { persona, likenessImages: likenessImageUrls },
      });
      onCreated?.(row);
      return runGeneration(deps, row, body);
    },

    async factorCriativo({ base: baseBruta, variations, diagnosis = null, onSlotsCreated, onSlotDone }) {
      /*
       * A herança por linhagem.
       *
       * O Fator lê `base.metadata.designSystemDoc` para dar às cinco o
       * sistema visual da peça aprovada. Mas uma arte EDITADA ou
       * REENQUADRADA nascia sem essas chaves — e o montador, que só emite
       * `[DESIGN SYSTEM]` com o documento preenchido, não punha nada no
       * lugar. Era assim que cinco variações de uma clínica creme e dourada
       * saíam em preto, azul e bege, cada uma inventando a própria marca.
       *
       * Os escritores já foram corrigidos, mas as artes GRAVADAS pobres
       * continuam no acervo — são elas que estão no canvas de quem usa
       * agora. Subir a linhagem é o que as recupera, e de quebra protege
       * de qualquer ação derivada futura que esqueça uma chave.
       *
       * Falhar aqui não impede nada: segue-se com a base como veio.
       */
      const base = await herdarDoAncestral(deps, baseBruta);
      const projectId = await deps.ensureProjectId();
      const ratio = (base.aspectRatio as CreativeAspectRatio) || '4:5';
      const backendAspect = ratio === '1:1' ? 'square' : 'story';

      // O grupo é o que torna as 5 irmãs, não cinco artes soltas. Falhar
      // aqui não impede a geração — só perde o agrupamento.
      let groupId: string | null = null;
      try {
        const grupo = await deps.createGroup?.({
          projectId,
          type: 'factor',
          parentAssetId: base.id,
          title: 'Fator Criativo',
          metadata: {
            version: 'factor-v2',
            angles: variations.map((v) => v.strategy.angle),
            diagnosis,
          },
        });
        groupId = grupo?.id ?? null;
      } catch {
        groupId = null;
      }

      // Cada variação vira prompt pelo mesmo montador da geração normal.
      const pedidos = variations.map((v) => buildFactorVariationRequest({
        variation: v,
        originalPrompt: base.prompt ?? '',
        aspectRatio: ratio,
        resolution: base.resolution as CreativeResolution | null,
        logoImageUrl: base.metadata?.logoImage ?? null,
        productImageUrls: base.metadata?.productImages ?? [],
        personImageUrls: base.metadata?.personImages ?? [],
        storyReferenceUrl: base.url,
        designSystemDoc: base.metadata?.designSystemDoc ?? null,
        designSystemIsThirdParty: base.metadata?.designSystemFromReference ?? false,
        antiPadroes: base.metadata?.antiPadroes ?? null,
      }));

      // As 5 linhas nascem ANTES de qualquer imagem: é o que faz o lote
      // inteiro aparecer no canvas de uma vez, gerando de verdade.
      const linhas = await Promise.all(variations.map((v, i) => deps.createAsset({
        projectId,
        clientId: deps.clientId,
        type: 'factor',
        status: 'generating',
        parentAssetId: base.id,
        groupId,
        // `factor_axis` fica NULO nas linhas V2. O CHECK dessa coluna só
        // conhece os cinco eixos da V1, então gravar um ângulo novo aí
        // derrubava o insert inteiro (23514) em qualquer banco onde a
        // migração da V2 ainda não tivesse rodado. O rótulo sai de
        // `strategic_angle`, com `metadata.strategy` como última queda.
        factorAxis: null,
        strategicAngle: v.strategy.angle,
        angleSubtype: v.strategy.angleSubtype,
        strategicThesis: v.strategy.strategicThesis,
        awarenessLevel: v.audience.awarenessLevel,
        dominantEmotion: v.execution.dominantEmotion,
        qualityScore: v.validation.qualityScore,
        strategyJson: { strategy: v.strategy, audience: v.audience, execution: v.execution },
        validationJson: v.validation,
        generationVersion: 'factor-v2',
        aspectRatio: ratio,
        resolution: base.resolution,
        prompt: pedidos[i].prompt,
        model: IMAGE_GENERATION_MODEL.id,
        filename: v.label,
        // A estratégia inteira também vive aqui. `metadata` é jsonb e
        // sempre existe — é o que mantém a arte legível mesmo quando as
        // colunas dedicadas não existirem no banco.
        metadata: {
          slot: v.slot,
          label: v.label,
          copy: v.copy,
          strategy: v.strategy,
          audience: v.audience,
          execution: v.execution,
          visualDirection: v.visualDirection,
          validation: v.validation,
          logoImage: base.metadata?.logoImage ?? null,
          productImages: base.metadata?.productImages ?? [],
          personImages: base.metadata?.personImages ?? [],
          // O sistema visual e a procedência dele também descem para as
          // cinco. Sem isto, um retry de variação perdia o design system da
          // base — ele só vivia no prompt — e reemitia a arte sem a camada
          // que a fazia parecer com a peça aprovada.
          designSystemDoc: base.metadata?.designSystemDoc ?? null,
          antiPadroes: base.metadata?.antiPadroes ?? null,
          designSystemFromReference: base.metadata?.designSystemFromReference ?? false,
        },
      })));

      onSlotsCreated?.(linhas);

      // Falha ISOLADA por slot: uma variação recusada não derruba as outras
      // quatro, e o card dela fica `failed` com o botão de retentar.
      return Promise.all(linhas.map(async (linha, i) => {
        const pronta = await runGeneration(deps, linha, {
          ...pedidos[i].body,
          prompt: linha.prompt,
          aspectRatio: backendAspect,
          formatRatio: ratio,
          isVariation: true,
        });
        onSlotDone?.(pronta);
        return pronta;
      }));
    },

    async retry(asset) {
      // Mesma linha, não uma nova: a arte que falhou não deixou artefato
      // nenhum, então tentar de novo é completar o que já existe, não criar
      // outra pendência ao lado dela.
      const { body } = buildRetryRequest({
        prompt: asset.prompt,
        aspectRatio: asset.aspectRatio,
        logoImage: asset.metadata?.logoImage ?? null,
        productImages: asset.metadata?.productImages ?? [],
        personImages: asset.metadata?.personImages ?? [],
        avatarImages: asset.metadata?.avatarImages ?? [],
        sourceImage: asset.metadata?.sourceImage ?? null,
      });
      const retomada = await deps.updateAsset(asset.id, { status: 'generating', errorMessage: null });
      return runGeneration(deps, retomada, body);
    },

    async edit(asset, feedback, onCreated) {
      if (!asset.url) throw new Error('Esta arte ainda não tem imagem para editar.');
      if (!feedback.trim()) throw new Error('Descreva o que você quer alterar nesta arte.');
      const ratio = (asset.aspectRatio as CreativeAspectRatio) || '4:5';
      const { body } = buildEditRequest({
        imageUrl: asset.url,
        feedback,
        originalPrompt: asset.prompt ?? '',
        aspectRatio: ratio,
      });
      const projectId = await deps.ensureProjectId();
      const row = await deps.createAsset({
        projectId,
        clientId: deps.clientId,
        type: 'edited',
        status: 'generating',
        parentAssetId: asset.id,
        aspectRatio: ratio,
        resolution: asset.resolution,
        prompt: asset.prompt,
        model: IMAGE_EDIT_MODEL.id,
        // A linha guarda o que o prompt dela pressupõe. Sem isto, "tentar
        // novamente" numa edição que falhou reenviava o prompt da arte
        // original sem nenhum dos anexos que ele menciona.
        metadata: {
          feedback,
          sourceImage: asset.url,
          logoImage: asset.metadata?.logoImage ?? null,
          productImages: asset.metadata?.productImages ?? [],
          personImages: asset.metadata?.personImages ?? [],
          avatarImages: asset.metadata?.avatarImages ?? [],
          referenceImages: asset.metadata?.referenceImages ?? [],
          /*
           * O sistema visual desce para a arte editada.
           *
           * Sem estas três chaves, rodar o Fator Criativo sobre uma edição
           * lia `designSystemDoc: null` — e o montador, que emite
           * `[DESIGN SYSTEM]` só com o documento preenchido, simplesmente
           * não emitia o bloco. Nem ele, nem o rider [STYLE REFERENCE], nem
           * os anti-padrões no [DO NOT INCLUDE]. A perda era silenciosa e
           * total: a paleta e a tipografia da marca sumiam do prompt sem
           * nada no lugar.
           */
          designSystemDoc: asset.metadata?.designSystemDoc ?? null,
          antiPadroes: asset.metadata?.antiPadroes ?? null,
          designSystemFromReference: asset.metadata?.designSystemFromReference ?? false,
          // A leitura do pedido que produziu a peça. O inspetor e o Fator
          // explicam a arte por ela.
          artDirection: asset.metadata?.artDirection ?? null,
          copyBlocks: asset.metadata?.copyBlocks ?? null,
          // O briefing que descreve o ANÚNCIO, separado do texto que foi
          // enviado ao gerador. Ver `briefingDaArte`.
          promptDeOrigem: briefingDaArte(asset),
        },
      });
      onCreated?.(row);
      try {
        const { data, error } = await deps.invoke('criativo-edit-image', body, 90_000);
        if (error) throw new Error(await deps.extractErrorMessage(error));
        const apiError = (data as any)?.error;
        if (apiError) throw new Error(apiError);
        const url = (data as any).editedImageUrl as string;
        deps.recordUsage(IMAGE_EDIT_MODEL.usageKey);
        return await deps.updateAsset(row.id, { status: 'ready', url, thumbnailUrl: url });
      } catch (e: any) {
        return await deps.updateAsset(row.id, { status: 'failed', errorMessage: e?.message || 'Erro desconhecido' });
      }
    },

    async resize(asset, onCreated) {
      if (!asset.prompt) throw new Error('Esta arte não tem prompt salvo para redimensionar.');
      if (asset.aspectRatio === '1:1') throw new Error('Esta arte já é 1:1.');
      if (!asset.url) throw new Error('Esta arte ainda não tem imagem para reenquadrar.');
      const { prompt, body } = buildResizeRequest({
        originalPrompt: asset.prompt,
        originalImageUrl: asset.url,
      });
      const projectId = await deps.ensureProjectId();
      const row = await deps.createAsset({
        projectId,
        clientId: deps.clientId,
        type: 'resize',
        status: 'generating',
        parentAssetId: asset.id,
        aspectRatio: '1:1',
        resolution: asset.resolution,
        prompt,
        model: IMAGE_GENERATION_MODEL.id,
        /*
         * `sourceImage` é o que sustenta o prompt desta linha: ele abre
         * dizendo que a imagem anexada É a arte. Sem guardar aqui, o
         * "tentar novamente" mandava esse texto sem anexar imagem nenhuma —
         * o mesmo bug que o reenquadramento acabou de corrigir, de volta
         * pela porta dos fundos.
         *
         * O resto desce do pai porque isto era o metadata mais pobre do
         * sistema: uma linha só, apagando de uma vez a logo, o produto, o
         * sistema visual e a direção de arte. Qualquer Fator ou edição
         * rodando sobre um reenquadramento herdava o nada.
         */
        metadata: {
          sourceImage: asset.url,
          logoImage: asset.metadata?.logoImage ?? null,
          productImages: asset.metadata?.productImages ?? [],
          personImages: asset.metadata?.personImages ?? [],
          avatarImages: asset.metadata?.avatarImages ?? [],
          referenceImages: asset.metadata?.referenceImages ?? [],
          designSystemDoc: asset.metadata?.designSystemDoc ?? null,
          antiPadroes: asset.metadata?.antiPadroes ?? null,
          designSystemFromReference: asset.metadata?.designSystemFromReference ?? false,
          artDirection: asset.metadata?.artDirection ?? null,
          copyBlocks: asset.metadata?.copyBlocks ?? null,
          /*
           * O briefing da peça, à parte do texto de recorte.
           *
           * `prompt` PRECISA continuar sendo o texto de reenquadramento: é
           * ele que o "tentar novamente" reenvia. Mas o Fator manda
           * `prompt` ao estrategista como "a peça aprovada" — e rodar o
           * Fator sobre um reenquadramento fazia as cinco teses nascerem de
           * `[REFRAME — THIS IS NOT A NEW ARTWORK]`.
           */
          promptDeOrigem: briefingDaArte(asset),
        },
      });
      onCreated?.(row);
      return runGeneration(deps, row, body);
    },
  };
}
