import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const allowedProjects = new Set(["e2e", "a11y", "smoke"]);
const project = process.argv[2];

if (!project || !allowedProjects.has(project)) {
  throw new Error("Browser test project must be one of: e2e, a11y, smoke");
}

const root = process.cwd();
const viteEntry = path.join(root, "apps", "web", "node_modules", "vite", "bin", "vite.js");
const playwrightEntry = path.join(root, "node_modules", "@playwright", "test", "cli.js");

const vite = spawn(
  process.execPath,
  [
    viteEntry,
    "apps/web",
    "--config",
    "apps/web/vite.config.ts",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
    "--strictPort",
  ],
  { cwd: root, stdio: "inherit" },
);

async function waitForWeb() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (vite.exitCode !== null) {
      throw new Error(`Vite exited before becoming ready (${vite.exitCode})`);
    }
    try {
      const response = await fetch("http://127.0.0.1:5173");
      if (response.ok) return;
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for the local Web app");
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

try {
  await waitForWeb();
  const playwright = spawn(process.execPath, [playwrightEntry, "test", `--project=${project}`], {
    cwd: root,
    stdio: "inherit",
  });
  process.exitCode = await waitForExit(playwright);
} finally {
  if (vite.exitCode === null) {
    vite.kill();
    await Promise.race([waitForExit(vite), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  }
}
