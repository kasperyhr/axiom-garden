import { ArrowRight, EmptyState } from "@axiom-garden/ui";
import { Link } from "react-router-dom";

import { usePageMetadata } from "../hooks/usePageMetadata";

export default function NotFoundPage() {
  usePageMetadata("Page not found", "The requested Axiom Garden page does not exist.");

  return (
    <div className="not-found-page">
      <EmptyState
        headingLevel={1}
        title="Page not found"
        description="The requested route is not part of the current product foundation."
        action={
          <div className="not-found-page__actions">
            <Link className="app-link app-link--primary" to="/">
              Return Home
            </Link>
            <Link className="app-link app-link--secondary" to="/workspace">
              Workspace shell
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        }
      />
    </div>
  );
}
