import {
  Badge,
  Button,
  Callout,
  Card,
  Check,
  Dialog,
  DropdownMenu,
  EmptyState,
  IconButton,
  Info,
  Panel,
  Popover,
  Separator,
  Skeleton,
  Spinner,
  StatusIndicator,
  Tabs,
  Tooltip,
  useToast,
} from "@axiom-garden/ui";

import { usePageMetadata } from "../hooks/usePageMetadata";

const tokens = [
  ["Canvas", "canvas"],
  ["Surface", "surface"],
  ["Text", "text-primary"],
  ["Border", "border"],
  ["Clay", "accent-clay"],
  ["Moss", "accent-moss"],
  ["Brass", "accent-brass"],
  ["Success", "success"],
  ["Warning", "warning"],
  ["Danger", "danger"],
  ["Info", "info"],
] as const;

function Specimen({
  children,
  description,
  title,
}: {
  readonly children: React.ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <section className="specimen" aria-labelledby={`specimen-${title}`}>
      <div className="specimen__heading">
        <h2 id={`specimen-${title}`}>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="specimen__body">{children}</div>
    </section>
  );
}

function ToastDemo() {
  const { notify } = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() => {
        notify("Local preview notification", "success");
      }}
    >
      Show notification
    </Button>
  );
}

export default function ComponentsPage() {
  usePageMetadata("Components", "A development preview of the Axiom Garden design system.");

  return (
    <div className="components-page">
      <header className="components-page__header">
        <div>
          <p className="eyebrow">Development preview</p>
          <h1>Design system</h1>
          <p>
            A responsive acceptance surface for semantic tokens and shared UI primitives. It remains
            available in production builds so reviewers can verify the foundation without a separate
            service.
          </p>
        </div>
        <Badge tone="success">Milestone 2</Badge>
      </header>

      <section className="theme-samples" aria-labelledby="theme-samples-title">
        <h2 id="theme-samples-title">Theme surfaces</h2>
        <div className="theme-samples__grid">
          <div className="theme-sample theme-sample--light" data-theme="light">
            <strong>Light</strong>
            <span>Warm paper instrument</span>
            <Button size="small">Primary</Button>
          </div>
          <div className="theme-sample theme-sample--dark" data-theme="dark">
            <strong>Dark</strong>
            <span>Low-luminance instrument</span>
            <Button size="small">Primary</Button>
          </div>
        </div>
      </section>

      <Specimen
        title="Semantic tokens"
        description="Names communicate purpose; values adapt with the active theme."
      >
        <div className="token-grid">
          {tokens.map(([label, token]) => (
            <div className="token-swatch" key={token}>
              <span style={{ background: `var(--ag-color-${token})` }} />
              <strong>{label}</strong>
              <code>{`--ag-color-${token}`}</code>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        title="Typography & spacing"
        description="System fonts keep the interface private, fast, and offline-ready."
      >
        <div className="type-specimens">
          <p className="type-display">Display · Axiom Garden</p>
          <p className="type-heading">Heading · Instrumental clarity</p>
          <p className="type-body">Body · Calm language supports precise decisions.</p>
          <p className="type-label">LABEL · SEMANTIC CONTROL</p>
          <p className="type-caption">Caption · Measured with care</p>
          <code>Monospace · token: 4px</code>
        </div>
        <div className="spacing-specimens" aria-label="Spacing scale">
          {[1, 2, 3, 4, 6, 8].map((step) => (
            <div key={step}>
              <span style={{ width: `var(--ag-space-${step})` }} />
              <code>{step * 4}px</code>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        title="Buttons"
        description="Actions use explicit hierarchy and stable loading dimensions."
      >
        <div className="specimen-row">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <IconButton aria-label="Confirm preview" icon={<Check />} />
        </div>
      </Specimen>

      <Specimen
        title="Cards & panels"
        description="Cards group information; panels define durable regions."
      >
        <div className="card-specimens">
          <Card>
            <h3>Default card</h3>
            <p>Neutral information grouping.</p>
          </Card>
          <Card state="interactive" tabIndex={0}>
            <h3>Interactive card</h3>
            <p>Focus and hover affordance.</p>
          </Card>
          <Card state="selected">
            <h3>Selected card</h3>
            <p>Border and surface identify selection.</p>
          </Card>
          <Card state="disabled">
            <h3>Disabled card</h3>
            <p>Unavailable state is also semantic.</p>
          </Card>
          <Panel>
            <h3>Panel</h3>
            <p>Reserved for shell regions and supporting information.</p>
          </Panel>
        </div>
      </Specimen>

      <Specimen
        title="Badges & status"
        description="Every state includes readable text, never color alone."
      >
        <div className="status-specimens">
          <div className="specimen-row">
            {(["neutral", "info", "success", "warning", "danger"] as const).map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </div>
          <div className="specimen-row">
            <StatusIndicator status="idle" />
            <StatusIndicator status="loading" />
            <StatusIndicator status="healthy" />
            <StatusIndicator status="unavailable" />
          </div>
        </div>
      </Specimen>

      <Specimen
        title="Tabs"
        description="Arrow keys, Home, and End move focus across the tab list."
      >
        <Tabs
          ariaLabel="Component guidance"
          defaultValue="usage"
          items={[
            { value: "usage", label: "Usage", content: "Choose tabs for related peer views." },
            { value: "keyboard", label: "Keyboard", content: "Use arrow, Home, and End keys." },
            {
              value: "limits",
              label: "Limits",
              content: "Do not hide unrelated workflows in tabs.",
            },
          ]}
        />
      </Specimen>

      <Specimen
        title="Overlays"
        description="Radix primitives provide focus, Escape, and dismissal behavior."
      >
        <div className="specimen-row">
          <Tooltip content="Supplementary context, available on focus">
            <IconButton aria-label="Show tooltip example" icon={<Info />} />
          </Tooltip>
          <Popover
            title="Popover guidance"
            content="Use this for short, non-blocking contextual details."
          >
            <Button variant="secondary">Open popover</Button>
          </Popover>
          <Dialog
            trigger={<Button variant="secondary">Open dialog</Button>}
            title="Foundation dialog"
            description="Dialog focus is trapped until this surface closes."
          >
            <Callout title="Local content only">
              This demonstration does not load a remote service.
            </Callout>
          </Dialog>
          <DropdownMenu
            ariaLabel="Open example menu"
            label="Dropdown menu"
            items={[
              { label: "First action" },
              { label: "Second action" },
              { label: "Unavailable action", disabled: true },
            ]}
          />
        </div>
      </Specimen>

      <Specimen
        title="Feedback & empty states"
        description="Progress, absence, and notices use clear semantics."
      >
        <div className="feedback-grid">
          <div className="skeleton-demo">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
          <EmptyState
            title="Nothing to display"
            description="This component explains an intentional absence."
            action={<Button variant="secondary">Example action</Button>}
          />
          <div className="callout-stack">
            <Callout title="Information">Neutral context for the current surface.</Callout>
            <Callout tone="warning" title="Review needed">
              A visible caution without alarm.
            </Callout>
            <Callout tone="error" title="Action unavailable">
              A safe local error message.
            </Callout>
            <Callout tone="success" title="Ready">
              The foundation check completed.
            </Callout>
          </div>
          <div className="spinner-demo">
            <Spinner />
            <span>Spinner</span>
            <Separator />
            <ToastDemo />
          </div>
        </div>
      </Specimen>
    </div>
  );
}
