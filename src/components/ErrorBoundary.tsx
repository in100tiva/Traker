import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 p-8 text-center">
          <div>
            <h1 className="text-xl font-semibold">Algo deu errado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.state.error.message || "Erro desconhecido na aplicação."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleReset}>
              Tentar de novo
            </Button>
            <Button onClick={() => window.location.reload()}>
              Recarregar página
            </Button>
          </div>
          {this.state.error.stack && (
            <details className="mt-4 max-w-xl text-left text-xs text-muted-foreground">
              <summary className="cursor-pointer">Detalhes</summary>
              <pre className="mt-2 overflow-auto rounded bg-muted p-3">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
