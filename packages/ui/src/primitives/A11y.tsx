import type { AnchorHTMLAttributes, HTMLAttributes } from "react";

import { classNames } from "../utilities/classNames";

export function VisuallyHidden({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={classNames("ag-visually-hidden", className)} />;
}

export function SkipLink({
  children = "Skip to main content",
  className,
  href = "#main-content",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...props} className={classNames("ag-skip-link", className)} href={href}>
      {children}
    </a>
  );
}

export function Separator({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      {...props}
      className={classNames("ag-separator", className)}
      aria-orientation="horizontal"
    />
  );
}
