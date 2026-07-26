import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { serializeWorldDocumentV1JsonSchema } from "../src/schema/json-schema";
import { REPRESENTATIVE_WORLD_V1 } from "../src/examples/representative";
import { serializeWorldDocument } from "../src/serialization/serialize";

const schemaUrl = new URL("../schema/axiom-garden-world-v1.schema.json", import.meta.url);
await mkdir(fileURLToPath(new URL("../schema/", import.meta.url)), { recursive: true });
await writeFile(fileURLToPath(schemaUrl), serializeWorldDocumentV1JsonSchema(), "utf8");
await writeFile(
  fileURLToPath(new URL("../test/fixtures/representative-valid-world-v1.json", import.meta.url)),
  serializeWorldDocument(REPRESENTATIVE_WORLD_V1),
  "utf8",
);
