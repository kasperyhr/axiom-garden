import { ArrowRight, Badge, Card } from "@axiom-garden/ui";
import { Link } from "react-router-dom";

import { GeometricInstrument } from "../components/GeometricInstrument";
import { HealthIndicator } from "../components/HealthIndicator";
import { usePageMetadata } from "../hooks/usePageMetadata";

const capabilities = [
  {
    number: "01",
    title: "Build Rules",
    titleZh: "构建规则",
    description: "Compose precise relationships from safe, bounded building blocks.",
  },
  {
    number: "02",
    title: "Run Worlds",
    titleZh: "运行世界",
    description: "Observe how an abstract world changes under its own axioms.",
  },
  {
    number: "03",
    title: "Explain Outcomes",
    titleZh: "解释结果",
    description: "Trace each outcome back to the rules that made it possible.",
  },
] as const;

export function HomePage() {
  usePageMetadata(
    "Home",
    "Axiom Garden is a visual laboratory for safe, rule-driven puzzle worlds.",
  );

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <Badge tone="neutral">Milestone 2 · Design System</Badge>
          <h1 id="home-title">
            <span>Axiom Garden</span>
            <small lang="zh-CN">公理花园</small>
          </h1>
          <p className="home-hero__lead">
            Build a world from rules, then discover what becomes possible.
          </p>
          <p className="home-hero__lead-zh" lang="zh-CN">
            用规则种下一座世界，再发现其中什么能够发生。
          </p>
          <div className="home-hero__actions">
            <Link className="app-link app-link--primary" to="/workspace">
              Explore workspace shell
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="app-link app-link--secondary" to="/components">
              View design system
            </Link>
          </div>
          <p className="scope-note">
            Static product foundation only — no editor or simulation is implemented.
          </p>
        </div>
        <div className="home-hero__instrument">
          <GeometricInstrument />
        </div>
      </section>

      <section className="capability-grid" aria-labelledby="capabilities-title">
        <div className="section-heading">
          <p className="eyebrow">Direction</p>
          <h2 id="capabilities-title">A laboratory for executable ideas</h2>
        </div>
        <div className="capability-grid__cards">
          {capabilities.map((capability) => (
            <Card key={capability.number}>
              <span className="capability-card__number" aria-hidden="true">
                {capability.number}
              </span>
              <h3>{capability.title}</h3>
              <p className="capability-card__zh" lang="zh-CN">
                {capability.titleZh}
              </p>
              <p>{capability.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <HealthIndicator />
    </div>
  );
}
