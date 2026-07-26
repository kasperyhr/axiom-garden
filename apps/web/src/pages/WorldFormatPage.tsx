import {
  MAX_JSON_BYTES,
  REPRESENTATIVE_WORLD_V1,
  parseWorldJson,
  serializeWorldDocument,
  type DomainIssue,
} from "@axiom-garden/domain";
import {
  Badge,
  Button,
  Callout,
  Clipboard,
  FileJson,
  Panel,
  RotateCcw,
  useToast,
} from "@axiom-garden/ui";
import { useState } from "react";

import { usePageMetadata } from "../hooks/usePageMetadata";

const EXAMPLE_JSON = serializeWorldDocument(REPRESENTATIVE_WORLD_V1);

type LabResult =
  | { readonly status: "valid"; readonly issues: readonly DomainIssue[]; readonly output: string }
  | { readonly status: "invalid"; readonly issues: readonly DomainIssue[]; readonly output: "" };

function validateSource(source: string): LabResult {
  const result = parseWorldJson(source);
  return result.success
    ? {
        status: "valid",
        issues: result.issues,
        output: serializeWorldDocument(result.data),
      }
    : { status: "invalid", issues: result.issues, output: "" };
}

function formatIssuePath(path: DomainIssue["path"]): string {
  if (path.length === 0) return "$";
  return path.reduce<string>(
    (result, segment) =>
      typeof segment === "number" ? `${result}[${segment}]` : `${result}.${segment}`,
    "$",
  );
}

export default function WorldFormatPage() {
  usePageMetadata(
    "World format v1",
    "Validate and inspect canonical Axiom Garden World Document v1 JSON.",
  );
  const { notify } = useToast();
  const [source, setSource] = useState(EXAMPLE_JSON);
  const [result, setResult] = useState<LabResult>(() => validateSource(EXAMPLE_JSON));

  const validate = () => {
    setResult(validateSource(source));
  };

  const reset = () => {
    setSource(EXAMPLE_JSON);
    setResult(validateSource(EXAMPLE_JSON));
    notify("Representative example restored.", "neutral");
  };

  const copyCanonical = async () => {
    if (result.status !== "valid") return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(result.output);
      notify("Canonical JSON copied.", "success");
    } catch {
      notify("Clipboard unavailable. Select the canonical output and copy it manually.", "danger");
    }
  };

  return (
    <div className="world-format-page">
      <header className="world-format-page__header">
        <div>
          <p className="eyebrow">Versioned document laboratory</p>
          <h1>World Document v1</h1>
          <p>
            Inspect, modify, and validate plain UTF-8 JSON against the strict Axiom Garden format.
            This laboratory does not load files, save worlds, render a grid, or run simulation.
          </p>
        </div>
        <Badge tone="info">axiom-garden/world · v1</Badge>
      </header>

      <Callout title="Untrusted input stays data" tone="info">
        JSON is size-checked, parsed, schema-validated, and checked for references and coordinates.
        It is never executed or sent over the network.
      </Callout>

      <div className="world-format-layout">
        <Panel className="format-panel">
          <div className="format-panel__heading">
            <div>
              <FileJson aria-hidden="true" />
              <div>
                <h2>JSON input</h2>
                <p>
                  Paste or edit text only. Maximum {MAX_JSON_BYTES.toLocaleString("en-US")} bytes.
                </p>
              </div>
            </div>
            <span className="format-panel__measure">
              {new TextEncoder().encode(source).byteLength.toLocaleString("en-US")} bytes
            </span>
          </div>
          <label className="format-field">
            <span>World JSON</span>
            <textarea
              value={source}
              maxLength={MAX_JSON_BYTES}
              spellCheck={false}
              onChange={(event) => {
                setSource(event.target.value);
              }}
            />
          </label>
          <div className="format-actions">
            <Button onClick={validate} leadingIcon={<FileJson />}>
              Validate
            </Button>
            <Button onClick={reset} leadingIcon={<RotateCcw />} variant="secondary">
              Reset example
            </Button>
          </div>
        </Panel>

        <div className="format-results">
          <Panel className="format-panel" aria-live="polite">
            <div className="format-panel__heading">
              <div>
                <h2>Validation result</h2>
                <p>Structured issues use stable codes and paths.</p>
              </div>
              <Badge tone={result.status === "valid" ? "success" : "danger"}>
                {result.status === "valid" ? "Valid v1 document" : "Validation failed"}
              </Badge>
            </div>
            {result.status === "valid" ? (
              <Callout title="Document is valid" tone="success">
                Canonical output is ready below.
              </Callout>
            ) : (
              <ol className="issue-list" aria-label="Validation issues">
                {result.issues.map((issue, index) => (
                  <li key={`${issue.code}-${formatIssuePath(issue.path)}-${index}`}>
                    <code>{issue.code}</code>
                    <span>{formatIssuePath(issue.path)}</span>
                    <p>{issue.message}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel className="format-panel">
            <div className="format-panel__heading">
              <div>
                <h2>Canonical output</h2>
                <p>Stable two-space JSON with one final LF.</p>
              </div>
              <Button
                disabled={result.status !== "valid"}
                leadingIcon={<Clipboard />}
                onClick={() => void copyCanonical()}
                size="small"
                variant="secondary"
              >
                Copy canonical JSON
              </Button>
            </div>
            <label className="format-field">
              <span>Read-only canonical JSON</span>
              <textarea
                aria-describedby="canonical-output-note"
                readOnly
                spellCheck={false}
                value={result.output}
              />
            </label>
            <p className="format-note" id="canonical-output-note">
              Invalid input produces no canonical output; repair the listed issues and validate
              again.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
