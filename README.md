# Axiom Garden（公理花园）

> A visual laboratory for building, simulating, explaining, and remixing rule-driven puzzle worlds.

Axiom Garden 是一款“可执行规则世界”创作、实验和解谜平台。当前仓库完成 **Milestone 4：确定性模拟器最小内核**，提供严格的 World Document v1、纯 TypeScript Engine、原子 TransitionPlan 与只读实验页面；尚未实现规则系统、网格渲染器、编辑器或持久化。

## 当前可用页面

- `/`：使用设计系统重构的品牌首页。
- `/workspace`：静态 App Shell 布局预览，不包含 Canvas 引擎或产品数据。
- `/components`：项目内设计系统展示与人工验收入口，生产构建保留，便于无独立 Storybook 的审阅。
- `/world-format`：World Document v1 JSON 的只读验证与 canonical output 实验室。
- `/engine`：使用内置 world 和预计算纯数据计划的确定性 Engine Playground。
- `*`：安全、可恢复的 Not Found 页面。
- `/api/health`：本地 Worker 健康检查，由 Vite proxy 转发。

默认地址：

- Web：`http://127.0.0.1:5173`
- Worker：`http://127.0.0.1:8787`
- Worker health：`http://127.0.0.1:8787/api/health`

## 技术栈

- Node.js 24 LTS、Corepack、pnpm workspace、Turborepo、TypeScript strict
- React 19、React Router、Vite、Tailwind CSS 4
- 独立 `@axiom-garden/ui` package、语义 CSS Custom Properties
- 独立、无框架依赖的 `@axiom-garden/domain` package、strict Zod schema、JSON Schema
- 独立、无框架依赖的 `@axiom-garden/engine` package、确定性状态、原子 transition、稳定 digest
- Radix UI headless primitives、Lucide React 图标
- Cloudflare Workers、Hono、Zod
- Vitest、React Testing Library、Playwright、axe-core
- ESLint、Prettier、GitHub Actions

## 仓库结构

```text
apps/
  web/                 React/Vite Web 与 App Shell
  worker/              Hono Cloudflare Worker
packages/
  domain/              World Document v1、validation、migration、canonical JSON
  engine/              SimulationState、TransitionPlan、snapshot、digest
  ui/                  token、主题、通用组件与 UI 单元测试
  protocol/            Web/Worker 共享 Zod 契约
  config-eslint/       共享 ESLint 配置
  config-typescript/   共享 strict TypeScript 配置
e2e/                   Playwright E2E、axe、smoke
scripts/               本地浏览器测试编排
docs/                  产品、架构、安全、测试与设计系统文档
```

## 环境要求

- Node.js 24 LTS（`.nvmrc` 为 `24`）
- Corepack
- Git

```bash
node --version
corepack --version
corepack enable
pnpm --version
```

Windows PowerShell 若禁止执行 `pnpm.ps1`，可将下面的 `pnpm` 等价替换为 `pnpm.cmd`。

## 安装

```bash
git clone https://github.com/kasperyhr/axiom-garden.git
cd axiom-garden
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

CI 在 Ubuntu 上使用 `pnpm exec playwright install --with-deps chromium` 安装浏览器及系统依赖。

## 本地开发

同时启动 Web 与 Worker：

```bash
pnpm dev
```

分别启动：

```bash
pnpm dev:web
pnpm dev:worker
```

Web 默认以相对路径请求 `/api/health`，Vite 将请求代理到本地 Worker。未来前后端拆分部署时可使用 `VITE_API_ORIGIN` 覆盖 API origin；本仓库不提交 `.env`，也未执行部署。

## 主题

顶部主题菜单支持 `System`、`Light`、`Dark`。默认使用系统设置，用户选择仅以非敏感键 `axiom-garden-theme` 保存在 `localStorage`。本地 `theme-init.js` 在 React 启动前应用主题，以降低首次渲染闪烁；不加载远程字体或第三方脚本。

## 质量命令

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:domain
pnpm test:engine
pnpm benchmark:engine
pnpm build
pnpm test:ui
pnpm test:e2e
pnpm test:a11y
pnpm test:smoke
pnpm schema:check
pnpm schema:generate
```

- `test`：Domain、Engine、Protocol、Worker、UI、Web tests；包含 property、prototype、determinism、immutability、atomicity 与 schema drift。
- `test:engine`：Engine correctness、determinism、hash golden vectors、snapshot 与 property tests。
- `benchmark:engine`：本地宽松性能预算，覆盖 initial state、100 ticks、约 1000 operations 与 digest；不作为 CI 的硬毫秒基准。
- `test:e2e`：导航、World Format、Engine controls/snapshot、健康状态、主题、404 与水平溢出。
- `test:a11y`：包含 Engine 初始、receipt 和 issue 状态的完整 axe 扫描。
- `test:smoke`：构建后验证关键路由、Worker/Protocol、Domain schema 与 Engine 确定性契约。
- `schema:check`：确认生成的 JSON Schema 与已提交文件字节一致。
- `schema:generate`：从 Zod 单一来源重新生成 `packages/domain/schema/axiom-garden-world-v1.schema.json`。
- Playwright 失败时写入被 `.gitignore` 排除的 `test-results/` 与 `playwright-report/`；CI 只在失败时上传诊断 artifact。

格式化与清理：

```bash
pnpm format
pnpm clean
```

## 常见问题

### 首页显示 Worker unavailable

确认 `pnpm dev:worker` 正在 `127.0.0.1:8787` 运行，或使用 `pnpm dev` 同时启动。首页本身仍可独立浏览。

### Playwright 找不到浏览器

```bash
pnpm exec playwright install chromium
```

Linux CI 或容器通常需要：

```bash
pnpm exec playwright install --with-deps chromium
```

### 为什么 `/components` 保留在生产构建？

Milestone 2 不引入 Storybook。保留该轻量路由可让设计、无障碍与组件状态在同一构建中接受人工和自动验收；它不包含内部数据、业务能力或调试 Secret。

### 是否需要 Cloudflare 账户？

不需要。Worker 开发、dry-run build 与测试均为本地流程，不创建 D1、KV、Durable Object 或任何真实 Cloudflare 资源。

## World Document v1

格式是普通 UTF-8 JSON，根标识为 `axiom-garden/world`，整数 `schemaVersion` 当前为 `1`。公开 API：

```ts
import { parseWorldJson, serializeWorldDocument } from "@axiom-garden/domain";

const result = parseWorldJson(jsonText);
if (result.success) {
  const canonicalJson = serializeWorldDocument(result.data);
}
```

解析会先检查 2 MiB UTF-8 字节上限，再依次完成 JSON、strict schema、引用/坐标语义验证与安全规范化。完整规范见 [docs/formats/WORLD_V1.md](docs/formats/WORLD_V1.md)。

## Deterministic Engine v1

`@axiom-garden/engine` 从经过 Domain 验证的 `WorldDocumentV1` 创建 tick 0 的 immutable canonical state。Engine 只接收 runtime-validated 的纯数据 `TransitionPlan`：

```ts
import {
  createInitialSimulationState,
  stepSimulation,
  TransitionPlanSchema,
} from "@axiom-garden/engine";

const initial = createInitialSimulationState(world);
if (initial.success) {
  const noOp = TransitionPlanSchema.parse({
    id: "transition:example",
    expectedTick: 0,
    operations: [],
  });
  const next = stepSimulation(initial.data, noOp);
}
```

空 plan 是合法 no-op tick。完整契约见 [docs/engine/ENGINE_V1.md](docs/engine/ENGINE_V1.md)。TransitionPlan 是未来规则求值之后的低层提交格式，不是 Rule、Condition、Action DSL 或用户文件。

## Milestone 4 范围

已完成：

- `@axiom-garden/engine`、SimulationStateV1、canonical ordering 与 selectors
- 预计算纯数据 TransitionPlan、顺序预演、原子提交、receipt 与有界多步执行
- snapshot/restore、clone/comparison 与 `ag1:` 稳定非密码学 digest
- unit/property/determinism/immutability/atomicity/golden/benchmark tests
- lazy-loaded Engine Playground、E2E、axe、smoke 与 CI 覆盖

明确未实现：

- Rule、Condition、Action、DSL、AST 与冲突解析
- Milestone 5 的基础网格渲染器，以及 Canvas 编辑、拖拽、缩放、Undo/Redo
- 时间轴、重放、求解器、谜题
- 本地作品库、账户、登录、数据库、上传、分享、协作
- DeepSeek 或其他 LLM、遥测、付费服务、正式部署

详细边界见 [docs/MILESTONES.md](docs/MILESTONES.md) 与 [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)。
