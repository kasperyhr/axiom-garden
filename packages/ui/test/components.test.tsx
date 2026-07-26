import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Info } from "lucide-react";

import {
  Button,
  Dialog,
  IconButton,
  StatusIndicator,
  Tabs,
  ToastProvider,
  Tooltip,
  useToast,
} from "../src";

describe("Button", () => {
  it("applies the requested variant and preserves loading semantics", () => {
    const { rerender } = render(<Button variant="danger">Remove</Button>);
    expect(screen.getByRole("button", { name: "Remove" })).toHaveClass("ag-button--danger");

    rerender(<Button loading>Save changes</Button>);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("gives an icon button an accessible name", () => {
    render(<IconButton aria-label="More information" icon={<Info />} />);
    expect(screen.getByRole("button", { name: "More information" })).toBeVisible();
  });
});

describe("StatusIndicator", () => {
  it("renders icon-independent status text", () => {
    render(<StatusIndicator status="healthy" label="Worker healthy" />);
    expect(screen.getByRole("status")).toHaveTextContent("Worker healthy");
    expect(screen.getByRole("status")).toHaveClass("ag-status--healthy");
  });
});

describe("Tabs", () => {
  it("supports arrow, Home, and End keyboard navigation", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        ariaLabel="Example sections"
        defaultValue="one"
        items={[
          { value: "one", label: "Overview", content: "First panel" },
          { value: "two", label: "Details", content: "Second panel" },
          { value: "three", label: "Notes", content: "Third panel" },
        ]}
      />,
    );

    const overview = screen.getByRole("tab", { name: "Overview" });
    await user.click(overview);
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Details" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Notes" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(overview).toHaveFocus();
  });
});

describe("Dialog", () => {
  it("opens, closes with Escape, and returns focus", async () => {
    const user = userEvent.setup();
    render(
      <Dialog
        trigger={<Button>Open guide</Button>}
        title="Guide"
        description="A short local guide."
      >
        <Button>Inside action</Button>
      </Dialog>,
    );

    const trigger = screen.getByRole("button", { name: "Open guide" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Guide" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Inside action" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("Tooltip", () => {
  it("appears when its trigger receives keyboard focus", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Helpful context">
        <IconButton aria-label="Information" icon={<Info />} />
      </Tooltip>,
    );
    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Helpful context");
  });
});

function ToastExample() {
  const { notify } = useToast();
  return (
    <Button
      onClick={() => {
        notify("Saved locally", "success", 30_000);
      }}
    >
      Notify
    </Button>
  );
}

describe("ToastProvider", () => {
  it("announces and manually dismisses a notification", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastExample />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Notify" }));
    expect(screen.getByText("Saved locally")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByText("Saved locally")).not.toBeInTheDocument();
  });
});
