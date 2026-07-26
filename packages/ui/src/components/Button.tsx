import { LoaderCircle } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { classNames } from "../utilities/classNames";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled = false,
    leadingIcon,
    loading = false,
    size = "medium",
    type = "button",
    variant = "primary",
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      ref={ref}
      className={classNames("ag-button", `ag-button--${variant}`, `ag-button--${size}`, className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      type={type}
    >
      <span className="ag-button__icon" aria-hidden="true">
        {loading ? <LoaderCircle className="ag-spinner" /> : leadingIcon}
      </span>
      <span className="ag-button__label">{children}</span>
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, "children" | "leadingIcon"> {
  readonly "aria-label": string;
  readonly icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, icon, size = "medium", ...props },
  ref,
) {
  return (
    <Button
      {...props}
      ref={ref}
      className={classNames("ag-icon-button", className)}
      size={size}
      leadingIcon={icon}
    >
      <span className="ag-visually-hidden">{props["aria-label"]}</span>
    </Button>
  );
});
