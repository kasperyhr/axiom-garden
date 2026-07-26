import { StatusIndicator, type Status } from "@axiom-garden/ui";
import { useEffect, useState } from "react";

import { fetchHealth } from "../api/health";

type HealthState = Extract<Status, "loading" | "healthy" | "unavailable">;

const statusCopy: Record<HealthState, { readonly label: string; readonly detail: string }> = {
  loading: {
    label: "Checking connection",
    detail: "正在检查本地 Worker",
  },
  healthy: {
    label: "Worker healthy",
    detail: "共享契约验证通过",
  },
  unavailable: {
    label: "Worker unavailable",
    detail: "可单独启动本地 Worker 后重试",
  },
};

export function HealthIndicator() {
  const [state, setState] = useState<HealthState>("loading");

  useEffect(() => {
    const controller = new AbortController();

    void fetchHealth(controller.signal)
      .then(() => {
        setState("healthy");
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setState("unavailable");
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  const copy = statusCopy[state];

  return (
    <section className="health-panel" aria-labelledby="worker-status-heading">
      <div>
        <p className="eyebrow">Local service</p>
        <h2 id="worker-status-heading">Worker status</h2>
      </div>
      <StatusIndicator status={state} label={copy.label} aria-live="polite" />
      <p>{copy.detail}</p>
    </section>
  );
}
