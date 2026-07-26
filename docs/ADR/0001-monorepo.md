# ADR 0001：使用 TypeScript Monorepo

- 状态：Accepted
- 日期：2026-07-26

## 背景

Web、Worker、共享 API 契约和未来纯模拟引擎需要在同一产品中演进。跨仓库发布会在早期增加版本同步、
契约漂移和贡献门槛。

## 决策

使用 pnpm workspace + Turborepo 的 TypeScript Monorepo。可运行入口放在 `apps`，共享能力放在
`packages`，通过 workspace 依赖明确边界并统一质量门禁。

## 结果

优点是原子变更、共享 lockfile、快速本地开发和可追踪依赖图。代价是仓库 CI 需要关注缓存和任务边界，
配置 package 也必须保持精简。Monorepo 不意味着允许任意互相导入；架构文档中的单向依赖仍是强约束。
