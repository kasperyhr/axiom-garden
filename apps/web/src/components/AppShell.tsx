import {
  CircleHelp,
  Component,
  Dialog,
  Home,
  IconButton,
  LayoutPanelLeft,
  SkipLink,
  ThemeSwitcher,
  VisuallyHidden,
} from "@axiom-garden/ui";
import { useEffect, useRef, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { BrandMark } from "./BrandMark";

const navigation = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/workspace", label: "Workspace", icon: LayoutPanelLeft, end: false },
  { to: "/components", label: "Components", icon: Component, end: false },
] as const;

function areaTitle(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname === "/workspace") return "Workspace";
  if (pathname === "/components") return "Components";
  if (pathname === "/world-format") return "World format v1";
  if (pathname === "/engine") return "Engine playground";
  if (pathname === "/viewer") return "World viewer";
  return "Page not found";
}

export function AppShell({ children }: { readonly children: ReactNode }) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <SkipLink>跳到主要内容</SkipLink>
      <header className="top-bar">
        <NavLink className="shell-brand" to="/" aria-label="Axiom Garden 公理花园首页">
          <BrandMark />
          <span className="shell-brand__name">
            Axiom Garden
            <small lang="zh-CN">公理花园</small>
          </span>
        </NavLink>
        <span className="top-bar__area">
          <VisuallyHidden>Current area: </VisuallyHidden>
          {areaTitle(location.pathname)}
        </span>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map(({ end, icon: Icon, label, to }) => (
            <NavLink
              className={({ isActive }) =>
                `primary-nav__link${isActive ? " primary-nav__link--active" : ""}`
              }
              end={end}
              key={to}
              to={to}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="top-bar__actions">
          <ThemeSwitcher />
          <Dialog
            trigger={<IconButton aria-label="Open help" icon={<CircleHelp />} variant="ghost" />}
            title="About this foundation"
            description="A local guide to the current product shell."
          >
            <p>
              Milestone 5 adds a read-only Canvas 2D renderer for validated world and simulation
              state data.
            </p>
            <p>
              Editing, rules, automatic transition generation, file upload, persistence, and
              playback remain intentionally unavailable.
            </p>
            <NavLink className="app-link app-link--secondary" to="/world-format">
              Open World Format Lab
            </NavLink>
            <NavLink className="app-link app-link--secondary" to="/engine">
              Open Engine Playground
            </NavLink>
            <NavLink className="app-link app-link--secondary" to="/viewer">
              Open World Viewer
            </NavLink>
          </Dialog>
        </div>
      </header>
      <main className="app-main" id="main-content" ref={mainRef} tabIndex={-1}>
        {children}
      </main>
      <nav className="mobile-nav" aria-label="Mobile primary navigation">
        {navigation.map(({ end, icon: Icon, label, to }) => (
          <NavLink
            className={({ isActive }) =>
              `mobile-nav__link${isActive ? " mobile-nav__link--active" : ""}`
            }
            end={end}
            key={to}
            to={to}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
