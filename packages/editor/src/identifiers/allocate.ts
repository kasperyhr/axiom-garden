const SAFE_SEGMENT = /[^a-z0-9_-]+/gu;

function normalizeBaseLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, "-")
    .replace(SAFE_SEGMENT, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);
  return normalized.length > 0 ? normalized : "item";
}

export function allocateDeterministicId(
  namespace: "entity" | "cell" | "layer" | "symbol" | "command",
  baseLabel: string,
  usedIds: readonly string[],
): string {
  const used = new Set(usedIds);
  const root = `${namespace}:${normalizeBaseLabel(baseLabel)}`;
  if (!used.has(root)) return root;
  let suffix = 2;
  while (used.has(`${root}-${suffix}`)) suffix += 1;
  return `${root}-${suffix}`;
}
