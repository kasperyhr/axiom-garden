import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function fixtureText(name: string): Promise<string> {
  return readFile(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8");
}

export async function fixtureValue(name: string): Promise<unknown> {
  return JSON.parse(await fixtureText(name));
}
