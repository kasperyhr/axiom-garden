import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Info,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utilities/classNames";

export type CardState = "default" | "interactive" | "selected" | "disabled";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  readonly state?: CardState;
}

export function Card({ className, state = "default", ...props }: CardProps) {
  return (
    <article
      {...props}
      className={classNames("ag-card", `ag-card--${state}`, className)}
      aria-disabled={state === "disabled" || undefined}
    />
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={classNames("ag-panel", className)} />;
}

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return <span {...props} className={classNames("ag-badge", `ag-badge--${tone}`, className)} />;
}

export type Status = "loading" | "healthy" | "unavailable" | "idle";

const statusContent: Record<Status, { readonly icon: ReactNode; readonly defaultLabel: string }> = {
  loading: {
    icon: <CircleDashed className="ag-spinner" />,
    defaultLabel: "Loading",
  },
  healthy: { icon: <CheckCircle2 />, defaultLabel: "Healthy" },
  unavailable: { icon: <XCircle />, defaultLabel: "Unavailable" },
  idle: { icon: <CircleDashed />, defaultLabel: "Idle" },
};

export interface StatusIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  readonly status: Status;
  readonly label?: string;
}

export function StatusIndicator({ className, label, status, ...props }: StatusIndicatorProps) {
  const content = statusContent[status];
  return (
    <span
      {...props}
      className={classNames("ag-status", `ag-status--${status}`, className)}
      role="status"
    >
      <span className="ag-status__icon" aria-hidden="true">
        {content.icon}
      </span>
      <span>{label ?? content.defaultLabel}</span>
    </span>
  );
}

export type CalloutTone = "info" | "warning" | "error" | "success";

const calloutIcons: Record<CalloutTone, ReactNode> = {
  info: <Info />,
  warning: <TriangleAlert />,
  error: <AlertCircle />,
  success: <CheckCircle2 />,
};

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: CalloutTone;
  readonly title: string;
}

export function Callout({ children, className, title, tone = "info", ...props }: CalloutProps) {
  return (
    <div {...props} className={classNames("ag-callout", `ag-callout--${tone}`, className)}>
      <span className="ag-callout__icon" aria-hidden="true">
        {calloutIcons[tone]}
      </span>
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </div>
  );
}
