# Axiom Garden（公理花园）

> A visual laboratory for building, simulating, explaining, and remixing rule-driven puzzle worlds.

Axiom Garden 是一款“可执行规则世界”创作、实验和解谜平台。当前仓库完成 **Milestone 2：设计系统与应用壳**，只提供产品外壳、共享 UI、主题、静态 Workspace 预览、组件验收页与健康检查；尚未实现领域模型、编辑器、规则语言、模拟器或持久化。

## 当前可用页面

- `/`：使用设计系统重构的品牌首页。
- `/workspace`：静态 App Shell 布局预览，不包含 Canvas 引擎或产品数据。
- `/components`：项目内设计系统展示与人工验收入口，生产构建保留，便于无独立 Storybook 的审阅。
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
pnpm build
pnpm test:ui
pnpm test:e2e
pnpm test:a11y
pnpm test:smoke
```

- `test`：Protocol、Worker、UI、Web unit/integration tests。
- `test:e2e`：导航、健康状态、移动 Inspector、主题、Help Dialog、404 与水平溢出。
- `test:a11y`：对 Home、Workspace、Components、Not Found 及打开 Dialog 的状态执行完整 axe 扫描。
- `test:smoke`：先构建 Web/Worker，再验证关键路由与 Worker/Protocol 契约。
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

## Milestone 2 范围

已完成：

- 独立 UI package、语义 token、light/dark/system 主题
- Button、Card、Panel、Badge、Status、Tabs、Tooltip、Popover、Dialog、Dropdown、Toast 等基础组件
- App Shell、响应式导航、静态 Workspace、Components、404、Error Boundary
- 页面 metadata、SVG favicon、键盘与 focus 基础
- unit、E2E、axe accessibility、smoke 与 CI

明确未实现：

- World、Cell、Entity、Rule 等 Milestone 3 领域模型
- 网格、Canvas 编辑、拖拽、缩放、Undo/Redo
- DSL、AST、模拟器、时间轴、重放、求解器、谜题
- 本地作品库、账户、登录、数据库、上传、分享、协作
- DeepSeek 或其他 LLM、遥测、付费服务、正式部署

详细边界见 [docs/MILESTONES.md](docs/MILESTONES.md) 与 [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)。
