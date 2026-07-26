import { GeometricInstrument } from "../components/GeometricInstrument";
import { HealthIndicator } from "../components/HealthIndicator";

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
];

export function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Axiom Garden 公理花园首页">
          <span>Axiom Garden</span>
          <span aria-hidden="true" />
          <span lang="zh-CN">公理花园</span>
        </a>
        <p>Milestone 1 · Foundation</p>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__copy">
            <h1 id="hero-title">
              <span>Axiom Garden</span>
              <span lang="zh-CN">公理花园</span>
            </h1>
            <div className="hero__rule" aria-hidden="true" />
            <p className="hero__lead">
              Build a world from rules, then discover what becomes possible.
            </p>
            <p className="hero__lead-zh" lang="zh-CN">
              用规则种下一座世界，再发现其中什么能够发生。
            </p>
          </div>
          <GeometricInstrument />
        </section>

        <section className="capabilities" aria-label="产品能力方向">
          {capabilities.map((capability) => (
            <article className="capability" key={capability.number}>
              <span className="capability__number" aria-hidden="true">
                {capability.number}
              </span>
              <div>
                <h2>{capability.title}</h2>
                <p className="capability__title-zh" lang="zh-CN">
                  {capability.titleZh}
                </p>
                <p className="capability__description">{capability.description}</p>
              </div>
            </article>
          ))}
        </section>

        <HealthIndicator />
      </main>

      <footer className="site-footer">
        <span aria-hidden="true" />
        <p>A visual laboratory for rule-driven puzzle worlds.</p>
        <span aria-hidden="true" />
      </footer>
    </>
  );
}
