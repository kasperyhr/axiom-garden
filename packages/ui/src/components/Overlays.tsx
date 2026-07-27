import { ChevronDown, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { DropdownMenu as DropdownPrimitive } from "radix-ui";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { IconButton } from "./Button";

export function Tooltip({
  children,
  content,
}: {
  readonly children: ReactNode;
  readonly content: ReactNode;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={350}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="ag-tooltip" sideOffset={8} collisionPadding={12}>
            {content}
            <TooltipPrimitive.Arrow className="ag-tooltip__arrow" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export function Popover({
  children,
  content,
  title,
}: {
  readonly children: ReactNode;
  readonly content: ReactNode;
  readonly title: string;
}) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="ag-popover"
          sideOffset={8}
          collisionPadding={12}
          aria-label={title}
        >
          <strong>{title}</strong>
          <div>{content}</div>
          <PopoverPrimitive.Arrow className="ag-popover__arrow" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export interface DialogProps {
  readonly trigger?: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function Dialog({ children, description, onOpenChange, open, title, trigger }: DialogProps) {
  return (
    <DialogPrimitive.Root
      {...(open === undefined ? {} : { open })}
      {...(onOpenChange ? { onOpenChange } : {})}
    >
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ag-dialog__overlay" />
        <DialogPrimitive.Content className="ag-dialog__content">
          <DialogPrimitive.Title className="ag-dialog__title">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="ag-dialog__description">
            {description}
          </DialogPrimitive.Description>
          <div className="ag-dialog__body">{children}</div>
          <DialogPrimitive.Close asChild>
            <IconButton
              className="ag-dialog__close"
              aria-label="Close dialog"
              icon={<X />}
              variant="ghost"
              size="small"
            />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface DropdownItem {
  readonly label: string;
  readonly onSelect?: () => void;
  readonly disabled?: boolean;
}

export function DropdownMenu({
  ariaLabel,
  items,
  label,
}: {
  readonly ariaLabel: string;
  readonly items: readonly DropdownItem[];
  readonly label: string;
}) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger className="ag-dropdown__trigger" aria-label={ariaLabel}>
        <span>{label}</span>
        <ChevronDown aria-hidden="true" />
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          className="ag-dropdown__content"
          sideOffset={6}
          collisionPadding={12}
        >
          {items.map((item) => (
            <DropdownPrimitive.Item
              className="ag-dropdown__item"
              {...(item.disabled === undefined ? {} : { disabled: item.disabled })}
              key={item.label}
              {...(item.onSelect ? { onSelect: item.onSelect } : {})}
            >
              {item.label}
            </DropdownPrimitive.Item>
          ))}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}
