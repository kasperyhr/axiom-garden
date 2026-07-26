import { describe, expect, it } from "vitest";

import { MAX_JSON_BYTES, parseWorldJson } from "../src";
import { fixtureText } from "./helpers";

describe("JSON parsing boundary", () => {
  it("accepts valid JSON and normalizes it", async () => {
    const result = parseWorldJson(await fixtureText("representative-valid-world-v1.json"));
    expect(result.success).toBe(true);
  });

  it("returns syntax and root issues without throwing", () => {
    expect(parseWorldJson("{").issues[0]?.code).toBe("invalid_json");
    expect(parseWorldJson("[]").issues[0]?.code).toBe("invalid_root");
    expect(parseWorldJson("null").issues[0]?.code).toBe("invalid_root");
  });

  it("measures UTF-8 bytes before JSON.parse", () => {
    const text = `"${"界".repeat(Math.ceil(MAX_JSON_BYTES / 3) + 1)}"`;
    const result = parseWorldJson(text);
    expect(result.success).toBe(false);
    expect(result.issues[0]?.code).toBe("json_too_large");
  });
});
