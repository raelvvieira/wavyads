import { Component, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { compileDesign } from "@/lib/designCode";

interface CompiledState {
  Comp?: ComponentType<any>;
  error?: string;
  loading: boolean;
}

/** Compila (async) o código de design; null/vazio => sem custom (usa builtin). */
export function useCompiledDesign(code?: string | null): CompiledState {
  const [state, setState] = useState<CompiledState>({ loading: !!code?.trim() });

  useEffect(() => {
    if (!code || !code.trim()) {
      setState({ loading: false });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    compileDesign(code)
      .then((Comp) => { if (alive) setState({ Comp, loading: false }); })
      .catch((e) => { if (alive) setState({ error: e?.message || "Falha ao compilar", loading: false }); });
    return () => { alive = false; };
  }, [code]);

  return state;
}

interface BoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (msg: string) => void;
  /** Muda para forçar reset do boundary (ex.: novo código). */
  resetKey?: string;
}

/** Captura erros de RENDER do componente de design custom, sem derrubar o app. */
export class DesignErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError?.(error.message);
  }
  componentDidUpdate(prev: BoundaryProps) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
