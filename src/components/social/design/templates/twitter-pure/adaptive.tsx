import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type Ref,
  type ReactNode,
} from "react";

type AdaptiveCarouselContextValue = {
  round: number;
  paused: boolean;
};

type SlideFrameContextValue = {
  round: number;
  paused: boolean;
  registerSlot: (id: string) => void;
  unregisterSlot: (id: string) => void;
  setSlotReady: (id: string, ready: boolean) => void;
};

const FALLBACK_CAROUSEL_CONTEXT: AdaptiveCarouselContextValue = {
  round: 6,
  paused: true,
};

const FALLBACK_SLIDE_CONTEXT: SlideFrameContextValue = {
  round: 6,
  paused: true,
  registerSlot: () => {},
  unregisterSlot: () => {},
  setSlotReady: () => {},
};

const AdaptiveCarouselContext = createContext<AdaptiveCarouselContextValue | null>(null);
const SlideFrameContext = createContext<SlideFrameContextValue | null>(null);

const waitForPaints = (count = 1) =>
  new Promise<void>((resolve) => {
    const step = (remaining: number) => {
      if (remaining <= 0) {
        resolve();
        return;
      }

      requestAnimationFrame(() => step(remaining - 1));
    };

    step(count);
  });

async function waitForFonts() {
  if ("fonts" in document && document.fonts?.ready) {
    await document.fonts.ready;
  }
}

function useAdaptiveCarousel() {
  return useContext(AdaptiveCarouselContext) ?? FALLBACK_CAROUSEL_CONTEXT;
}

function useSlideFrame() {
  return useContext(SlideFrameContext) ?? FALLBACK_SLIDE_CONTEXT;
}

export function AdaptiveCarouselProvider({
  sessionKey,
  paused = false,
  children,
}: {
  sessionKey: string;
  paused?: boolean;
  children: ReactNode;
}) {
  const [round, setRound] = useState(0);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setRound(0);
      await waitForFonts();
      await waitForPaints(2);

      for (let nextRound = 0; nextRound < 7 && !cancelled; nextRound += 1) {
        setRound(nextRound);
        await waitForPaints(1);

        if (pausedRef.current) {
          break;
        }
      }

      if (!cancelled && !pausedRef.current) {
        setRound(6);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const value = useMemo<AdaptiveCarouselContextValue>(
    () => ({
      round,
      paused,
    }),
    [round, paused],
  );

  return <AdaptiveCarouselContext.Provider value={value}>{children}</AdaptiveCarouselContext.Provider>;
}

export function SlideFrame({
  children,
  style,
  className,
  background,
  templateKey = "adaptive",
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  background?: CSSProperties["background"];
  templateKey?: string;
}) {
  const { round, paused } = useAdaptiveCarousel();
  const [slotState, setSlotState] = useState<Record<string, boolean>>({});

  const registerSlot = useCallback((id: string) => {
    setSlotState((current) => (current[id] === undefined ? { ...current, [id]: false } : current));
  }, []);

  const unregisterSlot = useCallback((id: string) => {
    setSlotState((current) => {
      if (!(id in current)) {
        return current;
      }

      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const setSlotReady = useCallback((id: string, ready: boolean) => {
    setSlotState((current) => {
      if (current[id] === ready) {
        return current;
      }

      return { ...current, [id]: ready };
    });
  }, []);

  const slideReady = Object.keys(slotState).length > 0 && Object.values(slotState).every(Boolean);

  const value = useMemo<SlideFrameContextValue>(
    () => ({
      round,
      paused,
      registerSlot,
      unregisterSlot,
      setSlotReady,
    }),
    [round, paused, registerSlot, unregisterSlot, setSlotReady],
  );

  return (
    <SlideFrameContext.Provider value={value}>
      <div
        data-slide-frame={templateKey}
        data-adaptive-ready={slideReady ? "true" : "false"}
        data-adaptive-round={round}
        data-adaptive-paused={paused ? "true" : "false"}
        className={className}
        style={style ? { background, ...style } : { background }}
      >
        {children}
      </div>
    </SlideFrameContext.Provider>
  );
}

type AdaptiveTextProps = {
  text: string;
  as?: ElementType;
  minFontSize: number;
  maxFontSize: number;
  lineHeight: number;
  fontWeight?: number;
  color?: string;
  textAlign?: CSSProperties["textAlign"];
  letterSpacing?: CSSProperties["letterSpacing"];
  style?: CSSProperties;
};

export function AdaptiveText({
  text,
  as: Tag = "div",
  minFontSize,
  maxFontSize,
  lineHeight,
  fontWeight = 700,
  color = "inherit",
  textAlign = "left",
  letterSpacing = "normal",
  style,
}: AdaptiveTextProps) {
  const id = useId().replace(/:/g, "");
  const { round, paused, registerSlot, unregisterSlot, setSlotReady } = useSlideFrame();
  const ref = useRef<HTMLElement | null>(null);
  const stateRef = useRef({
    low: minFontSize,
    high: maxFontSize,
    current: maxFontSize,
    best: minFontSize,
    settled: false,
  });
  const [fontSize, setFontSize] = useState(maxFontSize);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    stateRef.current = {
      low: minFontSize,
      high: maxFontSize,
      current: maxFontSize,
      best: minFontSize,
      settled: false,
    };
    setFontSize(maxFontSize);
    setReady(false);
    registerSlot(id);
    setSlotReady(id, false);

    return () => {
      unregisterSlot(id);
    };
  }, [id, text, minFontSize, maxFontSize, registerSlot, unregisterSlot, setSlotReady]);

  useLayoutEffect(() => {
    if (paused || stateRef.current.settled) {
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    const fits = node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1;
    const state = stateRef.current;

    if (fits) {
      state.best = state.current;
      state.low = Math.max(state.low, state.current + 1);
    } else {
      state.high = Math.min(state.high, state.current - 1);
    }

    const next = Math.floor((state.low + state.high) / 2);
    const exhausted = state.low > state.high || next === state.current || round >= 6;

    if (exhausted) {
      state.settled = true;
      setFontSize(state.best);
      setReady(true);
      setSlotReady(id, true);
      return;
    }

    state.current = next;
    setFontSize(next);
    setReady(false);
    setSlotReady(id, false);
  }, [id, paused, round, setSlotReady]);

  const Component = Tag as ElementType;

  return (
    <Component
      ref={ref as Ref<HTMLElement>}
      data-fit-ready={ready ? "true" : "false"}
      style={{
        width: "100%",
        minWidth: 0,
        display: "block",
        overflow: "hidden",
        fontSize,
        lineHeight,
        fontWeight,
        color,
        textAlign,
        letterSpacing,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        ...style,
      }}
    >
      {text}
    </Component>
  );
}

export function TextSlot(props: AdaptiveTextProps) {
  return <AdaptiveText {...props} />;
}

export function MediaSlot({
  src,
  alt,
  aspectRatio = "16 / 9",
  minHeight = 280,
  maxHeight = 520,
  objectPosition = "center",
  templateKey = "adaptive",
  style,
}: {
  src?: string;
  alt: string;
  aspectRatio?: CSSProperties["aspectRatio"];
  minHeight?: number;
  maxHeight?: number;
  objectPosition?: CSSProperties["objectPosition"];
  templateKey?: string;
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, "");
  const { registerSlot, unregisterSlot, setSlotReady } = useSlideFrame();
  const [ready, setReady] = useState(!src);

  useEffect(() => {
    registerSlot(id);
    setReady(!src);
    setSlotReady(id, !src);

    return () => {
      unregisterSlot(id);
    };
  }, [id, registerSlot, unregisterSlot, setSlotReady, src]);

  useEffect(() => {
    if (!src) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.src = src;

    const markReady = async () => {
      try {
        if ("decode" in image) {
          await image.decode();
        } else {
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("image load failed"));
          });
        }
      } catch {
        // Decode can reject on some browsers or for cached media; the fallback still keeps export moving.
      }

      if (!cancelled) {
        setReady(true);
        setSlotReady(id, true);
      }
    };

    void markReady();

    return () => {
      cancelled = true;
    };
  }, [id, setSlotReady, src]);

  if (!src) {
    return null;
  }

  return (
    <div
      data-media-slot={templateKey}
      data-media-ready={ready ? "true" : "false"}
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight,
        maxHeight,
        aspectRatio,
        borderRadius: 20,
        border: "1px solid #EFF3F4",
        background: "#0D1520",
        ...style,
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="eager"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition,
          display: "block",
          opacity: ready ? 1 : 0.92,
        }}
      />
    </div>
  );
}
