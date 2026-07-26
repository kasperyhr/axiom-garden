import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Skeleton } from "@axiom-garden/ui";

import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomePage } from "./pages/HomePage";

const WorkspacePage = lazy(async () => import("./pages/WorkspacePage"));
const ComponentsPage = lazy(async () => import("./pages/ComponentsPage"));
const WorldFormatPage = lazy(async () => import("./pages/WorldFormatPage"));
const NotFoundPage = lazy(async () => import("./pages/NotFoundPage"));

function RouteFallback() {
  return (
    <div className="route-fallback" aria-label="Loading page">
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/components" element={<ComponentsPage />} />
            <Route path="/world-format" element={<WorldFormatPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AppShell>
    </ErrorBoundary>
  );
}
