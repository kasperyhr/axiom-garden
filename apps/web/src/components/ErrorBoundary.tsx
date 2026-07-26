import { Button, Callout } from "@axiom-garden/ui";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ErrorBoundary extends Component<{ readonly children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Axiom Garden render error", error, info);
    }
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="error-page">
        <Callout tone="error" title="The interface could not be displayed">
          No error details were uploaded. You can reload the local page or return safely to Home.
        </Callout>
        <div className="error-page__actions">
          <Button
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload page
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.assign("/");
            }}
          >
            Return Home
          </Button>
        </div>
      </main>
    );
  }
}
