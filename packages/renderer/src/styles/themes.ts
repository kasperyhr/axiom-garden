import type { RendererTheme } from "../scene/types";

const lightColors = {
  moss: "#59684b",
  clay: "#aa5034",
  brass: "#8a6728",
  graphite: "#343731",
  paper: "#f7f1e7",
  blue: "#376b85",
  amber: "#b87b22",
} as const;

const darkColors = {
  moss: "#9aad82",
  clay: "#dc8061",
  brass: "#c9a75f",
  graphite: "#b9bdb3",
  paper: "#ece6da",
  blue: "#72a7be",
  amber: "#d9a34f",
} as const;

export const LIGHT_RENDERER_THEME: RendererTheme = Object.freeze({
  name: "light",
  background: "#f8f4ec",
  gridMinor: "#ddd7ca",
  gridMajor: "#b8b09e",
  boundary: "#575b50",
  cellMarker: "#8a6728",
  selection: "#873822",
  hover: "#2c6e8f",
  keyboardFocus: "#2c6e8f",
  text: "#32352f",
  glyphText: "#fffaf5",
  domainColors: lightColors,
});

export const DARK_RENDERER_THEME: RendererTheme = Object.freeze({
  name: "dark",
  background: "#171a17",
  gridMinor: "#30352f",
  gridMajor: "#4b5147",
  boundary: "#a6ad9f",
  cellMarker: "#c9a75f",
  selection: "#ef9a78",
  hover: "#79b8d6",
  keyboardFocus: "#79b8d6",
  text: "#e9e7df",
  glyphText: "#111310",
  domainColors: darkColors,
});
