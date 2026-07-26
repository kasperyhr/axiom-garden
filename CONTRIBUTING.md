# 贡献指南

感谢参与 Axiom Garden。所有贡献都必须服从当前整数 Milestone 的范围。

## 开始之前

1. 阅读 `README.md`、`AGENTS.md` 和相关 `docs/` 文档。
2. 确认 issue 或变更属于当前 Milestone。
3. 不在修复型小数 Milestone 中新增功能。
4. 不提交 Secret、`.env`、构建产物、本地数据库或日志。

## 本地流程

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

提交前运行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

## 代码要求

- 保持 TypeScript strict，不用 `any` 绕过设计问题。
- 所有外部数据必须用共享 schema 或明确验证器验证。
- Web、Worker 和未来 Engine 遵守单向依赖边界。
- 测试失败应修复实现或测试的真实缺陷，不得删除测试掩盖问题。
- 新依赖需要解释用途、兼容性和安全影响。

## Pull Request

PR 应保持单一目的，说明所属 Milestone、变更原因、验证命令、风险和未实现范围。安全问题请勿公开提交
issue，改用 [SECURITY.md](SECURITY.md) 中的私密报告流程。
