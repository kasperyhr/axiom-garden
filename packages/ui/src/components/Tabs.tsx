import { Tabs as TabsPrimitive } from "radix-ui";
import type { ReactNode } from "react";

export interface TabItem {
  readonly value: string;
  readonly label: string;
  readonly content: ReactNode;
}

export interface TabsProps {
  readonly ariaLabel: string;
  readonly defaultValue: string;
  readonly items: readonly TabItem[];
}

export function Tabs({ ariaLabel, defaultValue, items }: TabsProps) {
  return (
    <TabsPrimitive.Root className="ag-tabs" defaultValue={defaultValue} orientation="horizontal">
      <TabsPrimitive.List className="ag-tabs__list" aria-label={ariaLabel}>
        {items.map((item) => (
          <TabsPrimitive.Trigger className="ag-tabs__trigger" key={item.value} value={item.value}>
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content className="ag-tabs__content" key={item.value} value={item.value}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
