import { useEffect, useState } from "react";

import { fetchHealth } from "../api/health";

type HealthState = "loading" | "healthy" | "unavailable";

const statusCopy: Record<HealthState, { label: string; detail: string }> = {
  loading: {
    label: "Checking connection…",
    detail: "正在检查连接",
  },
  healthy: {
    label: "Healthy",
    detail: "服务运行正常",
  },
  unavailable: {
    label: "Unavailable",
    detail: "服务暂时不可用",
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
    <section className="health" aria-labelledby="worker-status-heading">
      <div className="health__mark" data-state={state} aria-hidden="true">
        <span />
      </div>
      <div className="health__heading">
        <h2 id="worker-status-heading">Worker status</h2>
        <p>边缘服务状态</p>
      </div>
      <div className="health__divider" aria-hidden="true" />
      <div className="health__reading" role="status" aria-live="polite">
        <strong>{copy.label}</strong>
        <span>{copy.detail}</span>
      </div>
    </section>
  );
}
