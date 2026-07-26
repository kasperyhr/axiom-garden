import { REPRESENTATIVE_WORLD_V1 } from "@axiom-garden/domain";
import {
  computeSimulationDigest,
  createInitialSimulationState,
  createSimulationSnapshot,
  restoreSimulationSnapshot,
  runSimulation,
  stepSimulation,
  TransitionPlanSchema,
  type EngineIssue,
  type SimulationSnapshotV1,
  type SimulationStateV1,
  type TransitionPlan,
  type TransitionReceipt,
} from "@axiom-garden/engine";
import {
  Badge,
  Button,
  Callout,
  Camera,
  Panel,
  RotateCcw,
  ShieldAlert,
  StatusIndicator,
  StepForward,
  TimerReset,
  useToast,
} from "@axiom-garden/ui";
import { useMemo, useState } from "react";

import { usePageMetadata } from "../hooks/usePageMetadata";

const DEMONSTRATION_OPERATIONS = TransitionPlanSchema.parse({
  id: "transition:demonstration",
  expectedTick: 0,
  operations: [
    {
      kind: "replaceEntity",
      operationId: "operation:demonstration-replace",
      entityId: "entity:circle-001",
      replacement: {
        id: "entity:circle-001",
        symbolId: "symbol:moss-circle",
        layerId: "layer:objects",
        coordinate: { x: 2, y: 1 },
        orientation: 90,
        properties: { active: true, phase: "demonstration" },
      },
    },
  ],
}).operations;

function requireInitialState(): SimulationStateV1 {
  const result = createInitialSimulationState(REPRESENTATIVE_WORLD_V1);
  if (!result.success) {
    throw new Error("Built-in representative world failed Engine validation");
  }
  return result.data;
}

function noOpPlan(expectedTick: number, suffix: string | number = expectedTick): TransitionPlan {
  return TransitionPlanSchema.parse({
    id: `transition:no-op-${suffix}`,
    expectedTick,
    operations: [],
  });
}

function demonstrationPlan(expectedTick: number): TransitionPlan {
  return TransitionPlanSchema.parse({
    id: "transition:demonstration",
    expectedTick,
    operations: DEMONSTRATION_OPERATIONS,
  });
}

function formatIssuePath(path: EngineIssue["path"]): string {
  if (path.length === 0) return "$";
  return path.reduce<string>(
    (result, segment) =>
      typeof segment === "number" ? `${result}[${segment}]` : `${result}.${segment}`,
    "$",
  );
}

function summaryText(receipt: TransitionReceipt): string {
  const summary = receipt.summary;
  return [
    `${summary.entitiesAdded} entities added`,
    `${summary.entitiesRemoved} removed`,
    `${summary.entitiesReplaced} replaced`,
    `${summary.cellsAdded} cells added`,
    `${summary.cellsRemoved} removed`,
    `${summary.cellsReplaced} replaced`,
  ].join(" · ");
}

export default function EnginePlaygroundPage() {
  usePageMetadata(
    "Engine playground",
    "Inspect deterministic Axiom Garden state stepping with precomputed transition data.",
  );
  const { notify } = useToast();
  const [state, setState] = useState<SimulationStateV1>(requireInitialState);
  const [receipt, setReceipt] = useState<TransitionReceipt | null>(null);
  const [issues, setIssues] = useState<readonly EngineIssue[]>([]);
  const [snapshot, setSnapshot] = useState<SimulationSnapshotV1 | null>(null);
  const initialDigest = useMemo(() => computeSimulationDigest(requireInitialState()), []);
  const digest = useMemo(() => computeSimulationDigest(state), [state]);

  const acceptStep = (result: ReturnType<typeof stepSimulation>, successMessage: string): void => {
    if (!result.success) {
      setIssues(result.issues);
      notify("Transition rejected without changing state.", "danger");
      return;
    }
    setState(result.state);
    setReceipt(result.receipt);
    setIssues([]);
    notify(successMessage, "success");
  };

  const reset = () => {
    setState(requireInitialState());
    setReceipt(null);
    setIssues([]);
    setSnapshot(null);
    notify("Engine state reset to the representative world.", "neutral");
  };

  const runTen = () => {
    const plans = Array.from({ length: 10 }, (_, index) =>
      noOpPlan(state.tick + index, `${state.tick}-${index}`),
    );
    const result = runSimulation(state, plans, { maxSteps: 10 });
    if (!result.success) {
      setState(result.state);
      setReceipt(result.receipts.at(-1) ?? null);
      setIssues(result.issues);
      notify("Bounded run stopped at a rejected plan.", "danger");
      return;
    }
    setState(result.state);
    setReceipt(result.receipts.at(-1) ?? null);
    setIssues([]);
    notify("Ten deterministic no-op ticks completed.", "success");
  };

  const createSnapshot = () => {
    setSnapshot(createSimulationSnapshot(state));
    setIssues([]);
    notify("In-memory snapshot created.", "success");
  };

  const restoreSnapshot = () => {
    if (snapshot === null) {
      setIssues([
        {
          code: "invalid_snapshot",
          severity: "error",
          path: [],
          message: "Create a snapshot before restoring it",
        },
      ]);
      return;
    }
    const result = restoreSimulationSnapshot(snapshot);
    if (!result.success) {
      setIssues(result.issues);
      notify("Snapshot restore rejected.", "danger");
      return;
    }
    setState(result.data);
    setIssues([]);
    setReceipt(null);
    notify("Snapshot restored and verified.", "success");
  };

  const tamperSnapshot = () => {
    const source = snapshot ?? createSimulationSnapshot(state);
    const tampered = JSON.parse(JSON.stringify(source)) as {
      snapshotVersion: number;
      state: SimulationStateV1;
      digest: string;
    };
    tampered.state = { ...tampered.state, tick: tampered.state.tick + 1 };
    const result = restoreSimulationSnapshot(tampered);
    if (result.success) {
      setIssues([]);
      return;
    }
    setIssues(result.issues);
    notify("Tampered in-memory snapshot was rejected.", "warning");
  };

  return (
    <div className="engine-page">
      <header className="engine-page__header">
        <div>
          <h1>Engine Playground</h1>
          <p>
            Inspect atomic state steps, receipts, snapshots, and a stable cross-runtime digest using
            the built-in representative world.
          </p>
        </div>
        <Badge tone="success">Engine state v1</Badge>
      </header>

      <Callout title="Deterministic data boundary" tone="info">
        This playground applies precomputed transition data. No rule language is implemented.
      </Callout>

      <section className="engine-summary" aria-label="Simulation state summary">
        <Panel className="engine-summary__identity">
          <div>
            <StatusIndicator status="healthy" label="Engine core ready" />
            <h2>{state.sourceWorldId}</h2>
            <p>
              {state.grid.width} × {state.grid.height} bounded square grid source
            </p>
          </div>
          <dl>
            <div>
              <dt>Current tick</dt>
              <dd data-testid="engine-tick">{state.tick}</dd>
            </div>
            <div>
              <dt>Entities</dt>
              <dd>{state.entities.length}</dd>
            </div>
            <div>
              <dt>Cells</dt>
              <dd>{state.cells.length}</dd>
            </div>
          </dl>
        </Panel>
        <Panel className="engine-digest">
          <div>
            <h2>Digest comparison</h2>
            <p>FNV-1a 64-bit over canonical UTF-8 state; consistency only, not authentication.</p>
          </div>
          <dl>
            <div>
              <dt>Initial</dt>
              <dd>
                <code>{initialDigest}</code>
              </dd>
            </div>
            <div>
              <dt>Current</dt>
              <dd>
                <code data-testid="engine-digest">{digest}</code>
              </dd>
            </div>
          </dl>
        </Panel>
      </section>

      <Panel className="engine-controls">
        <div>
          <h2>Bounded execution controls</h2>
          <p>Every successful control creates a new immutable state value.</p>
        </div>
        <div className="engine-controls__buttons">
          <Button
            leadingIcon={<StepForward />}
            onClick={() => {
              acceptStep(stepSimulation(state, noOpPlan(state.tick)), "No-op tick committed.");
            }}
          >
            No-op step
          </Button>
          <Button
            leadingIcon={<StepForward />}
            onClick={() => {
              acceptStep(
                stepSimulation(state, demonstrationPlan(state.tick)),
                "Demonstration transition committed.",
              );
            }}
            variant="secondary"
          >
            Apply demonstration transition
          </Button>
          <Button leadingIcon={<TimerReset />} onClick={runTen} variant="secondary">
            Run 10 no-op ticks
          </Button>
          <Button leadingIcon={<RotateCcw />} onClick={reset} variant="ghost">
            Reset
          </Button>
        </div>
      </Panel>

      <div className="engine-detail-grid">
        <Panel className="engine-plan">
          <h2>Transition plan preview</h2>
          <p>Built-in pure data; operation order is part of the plan semantics.</p>
          <ol>
            <li>
              <code>operation:demonstration-replace</code>
              <span>Replace a complete abstract entity record</span>
            </li>
          </ol>
        </Panel>

        <Panel className="engine-receipt" aria-live="polite">
          <h2>Latest receipt</h2>
          {receipt === null ? (
            <p>No transition committed yet.</p>
          ) : (
            <dl>
              <div>
                <dt>Transition</dt>
                <dd>{receipt.transitionId}</dd>
              </div>
              <div>
                <dt>Tick</dt>
                <dd>
                  {receipt.tickBefore} → {receipt.tickAfter}
                </dd>
              </div>
              <div>
                <dt>Operations</dt>
                <dd>{receipt.operationCount}</dd>
              </div>
              <div>
                <dt>Summary</dt>
                <dd>{summaryText(receipt)}</dd>
              </div>
            </dl>
          )}
        </Panel>
      </div>

      <Panel className="engine-snapshot">
        <div>
          <h2>In-memory snapshot integrity</h2>
          <p>Create, restore, or demonstrate rejection of a modified snapshot copy.</p>
        </div>
        <div className="engine-controls__buttons">
          <Button leadingIcon={<Camera />} onClick={createSnapshot} variant="secondary">
            Create snapshot
          </Button>
          <Button disabled={snapshot === null} onClick={restoreSnapshot} variant="secondary">
            Restore snapshot
          </Button>
          <Button leadingIcon={<ShieldAlert />} onClick={tamperSnapshot} variant="danger">
            Tamper snapshot demo
          </Button>
        </div>
        <p className="engine-snapshot__status">
          {snapshot === null
            ? "No snapshot held."
            : `Snapshot held at tick ${snapshot.state.tick} · ${snapshot.digest}`}
        </p>
      </Panel>

      <Panel className="engine-issues" aria-live="polite">
        <h2>Structured issues</h2>
        {issues.length === 0 ? (
          <p>No Engine issues.</p>
        ) : (
          <ol aria-label="Engine issues">
            {issues.map((issue, index) => (
              <li key={`${issue.code}-${formatIssuePath(issue.path)}-${index}`}>
                <code>{issue.code}</code>
                <span>{formatIssuePath(issue.path)}</span>
                <p>{issue.message}</p>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
