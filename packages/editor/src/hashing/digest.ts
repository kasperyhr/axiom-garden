import { serializeWorldDocument, type WorldDocumentV1 } from "@axiom-garden/domain";

import { EDITOR_DOCUMENT_DIGEST_PREFIX } from "../limits/constants";

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;

export function computeEditorDocumentDigest(document: WorldDocumentV1): string {
  let hash = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(serializeWorldDocument(document))) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & UINT64_MASK;
  }
  return `${EDITOR_DOCUMENT_DIGEST_PREFIX}${hash.toString(16).padStart(16, "0")}`;
}
