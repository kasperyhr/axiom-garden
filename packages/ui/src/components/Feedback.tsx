import { Inbox, LoaderCircle, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { IconButton } from "./Button";
import { classNames } from "../utilities/classNames";

export function Spinner({ className, ...props }: HTMLAttributes<SVGElement>) {
  return (
    <LoaderCircle {...props} className={classNames("ag-spinner", className)} aria-hidden="true" />
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classNames("ag-skeleton", className)} aria-hidden="true" />;
}

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
  readonly headingLevel?: 1 | 2 | 3;
}

export function EmptyState({
  action,
  className,
  description,
  headingLevel = 3,
  title,
  ...props
}: EmptyStateProps) {
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 2 ? "h2" : "h3";
  return (
    <div {...props} className={classNames("ag-empty-state", className)}>
      <span className="ag-empty-state__icon" aria-hidden="true">
        <Inbox />
      </span>
      <Heading>{title}</Heading>
      <p>{description}</p>
      {action}
    </div>
  );
}

export type ToastTone = "neutral" | "success" | "warning" | "danger";

interface ToastItem {
  readonly id: string;
  readonly message: string;
  readonly tone: ToastTone;
  readonly duration: number;
}

interface ToastContextValue {
  readonly notify: (message: string, tone?: ToastTone, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return value;
}

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const close = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = "neutral", duration = 5000) => {
    counter.current += 1;
    const item: ToastItem = {
      id: `toast-${counter.current}`,
      message,
      tone,
      duration,
    };
    setToasts((current) => [...current.slice(-2), item]);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="ag-toast-region"
        aria-label="Notifications"
        aria-live="polite"
        aria-relevant="additions removals"
        role="region"
      >
        {toasts.map((toast) => (
          <ToastItemView key={toast.id} toast={toast} onClose={close} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItemView({
  onClose,
  toast,
}: {
  readonly onClose: (id: string) => void;
  readonly toast: ToastItem;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onClose(toast.id);
    }, toast.duration);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [onClose, toast.duration, toast.id]);

  return (
    <div
      className={classNames("ag-toast", `ag-toast--${toast.tone}`)}
      role={toast.tone === "danger" ? "alert" : "status"}
    >
      <span>{toast.message}</span>
      <IconButton
        aria-label="Dismiss notification"
        icon={<X />}
        variant="ghost"
        size="small"
        onClick={() => {
          onClose(toast.id);
        }}
      />
    </div>
  );
}
