import { Laptop, Moon, Sun } from "lucide-react";

import { DropdownMenu } from "./Overlays";
import { useTheme, type ThemePreference } from "../hooks/theme";

const labels: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const icons = {
  light: <Sun />,
  dark: <Moon />,
  system: <Laptop />,
} as const;

export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="ag-theme-switcher">
      <span aria-hidden="true">{icons[preference]}</span>
      <DropdownMenu
        ariaLabel={`Theme: ${labels[preference]}`}
        label={labels[preference]}
        items={(["system", "light", "dark"] as const).map((theme) => ({
          label: labels[theme],
          onSelect: () => {
            setPreference(theme);
          },
        }))}
      />
    </div>
  );
}
