# Axiom Garden · 公理花园

> A visual laboratory for building, simulating, explaining, and remixing rule-driven puzzle
> worlds.

Axiom Garden 是一款“可执行规则世界”创作、实验和解谜平台。用户未来可以用安全、受限、可验证的可视化规则构造抽象世界，并观察、解释和重放其演化。

## 当前状态

项目目前处于 **Milestone 1 · Foundation**。本仓库只提供产品与工程宪章、TypeScript
Monorepo、产品方向首页、共享健康契约、最小 Cloudflare Worker、自动化测试和 CI。

模拟器、网格编辑器、规则 DSL、账户、数据库、云资源和部署均未实现。

## 技术栈

- Node.js 24 LTS、Corepack、pnpm workspace、Turborepo
- TypeScript 5.9（严格模式）
- React 19、React Router 7、Vite 8、Tailwind CSS 4
- Cloudflare Workers、Hono 4
- Zod 4
- Vitest 4、React Testing Library
- ESLint 10、Prettier 3
- GitHub Actions

TypeScript 暂不升级到 7.x，因为当前 ESLint TypeScript 工具链尚未声明兼容该主版本。

## 仓库结构

```text
apps/
  web/                 React + Vite 产品方向首页
  worker/              Hono Cloudflare Worker
packages/
  protocol/            Web 与 Worker 共用的 Zod 契约
  config-eslint/       共享 ESLint flat config
  config-typescript/   共享严格 TypeScript 配置
docs/
  ADR/                 架构决策记录
  diagrams/            架构图说明
  *.md                  产品、架构、安全、测试与无障碍规范
.github/                CI 与协作模板
```

## 环境要求

- Node.js 24.x
- Corepack 0.34 或兼容版本
- Git 2.40+

pnpm 版本由根目录 `packageManager` 固定为 `11.9.0`，无需全局安装。

## 安装

```bash
corepack enable
pnpm install --frozen-lockfile
```

首次生成 lockfile 的仓库维护场景可使用 `pnpm install`；普通 clone 应始终使用
`--frozen-lockfile`。

## 本地开发

同时启动 Web 与 Worker：

```bash
pnpm dev
```

- Web：<http://localhost:5173>
- Worker：<http://localhost:8787>
- 健康检查：<http://localhost:8787/api/health>

只启动 Web：

```bash
pnpm dev:web
```

只启动 Worker：

```bash
pnpm dev:worker
```

Web 默认通过 Vite 将 `/api/*` 代理到 `http://127.0.0.1:8787`。未来拆分部署时，可在构建环境设置
`VITE_API_ORIGIN`（例如 `https://api.example.com`）；源代码没有固定生产 API 域名。

## 质量命令

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format
pnpm format:check
pnpm clean
```

`pnpm build` 只生成本地产物，不部署 Worker，也不创建 Cloudflare 资源。

## 常见问题

### 首页显示 `Unavailable`

确认 Worker 正在 `8787` 端口运行。仅运行 `pnpm dev:web` 时，Vite 代理无法连接未启动的 Worker。

### 端口被占用

关闭占用 `5173` 或 `8787` 的进程，再使用根命令启动。固定端口是为了让代理配置和文档保持一致。

### Corepack 未启用

运行 `corepack enable`，然后重新执行 `pnpm install --frozen-lockfile`。

### 是否需要 Cloudflare 账户或 Secret

不需要。开发、测试和 dry-run build 全部在本地完成；Milestone 1 不部署。

## Milestone 1 范围

已实现：

- 产品、架构、安全、测试、无障碍和贡献规范
- pnpm + Turborepo TypeScript Monorepo
- 最小产品方向首页和 Worker 三态健康显示
- `GET /api/health`
- Web/Worker 共用的 Zod health contract
- 单元/集成测试与基础 CI

尚未实现：

- 世界网格、编辑器、Canvas 交互
- 模拟引擎、规则 DSL/AST、冲突解析、时间线与重放
- 谜题、求解、生成、提示与分析
- 本地作品库、账户、数据库、云端历史、分享、Remix、协作
- DeepSeek 或任何其他 LLM
- 遥测、付费、上传、聊天、社交与正式部署

完整计划见 [docs/MILESTONES.md](docs/MILESTONES.md)。

## 许可证

Apache License 2.0，见 [LICENSE](LICENSE)。
