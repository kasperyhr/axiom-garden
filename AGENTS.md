# Axiom Garden Codex 开发约束

本文件约束所有后续 Codex 开发工作。

1. 全程使用中文汇报。
2. 每次只实施用户明确指定的一个 Milestone。
3. 不得提前开发后续 Milestone 功能。
4. 修改前阅读相关文档、现有实现和测试。
5. 不得通过删除、跳过或弱化测试来修复失败。
6. 不随意使用 `any`、`@ts-ignore`、`@ts-expect-error` 或 `eslint-disable`；确有必要时必须说明原因并缩小范围。
7. 所有外部输入必须在系统边界验证。
8. 核心模拟逻辑不得放入 React 组件。
9. 核心模拟逻辑不得依赖 Cloudflare runtime。
10. Web 不得直接导入 Worker 内部实现。
11. Worker 不得导入 Web。
12. Web 与 Worker 的共享契约放在 `packages/protocol`。
13. 后续核心引擎必须放在独立、确定性、无框架依赖的 TypeScript package。
14. 不允许执行用户提供的 JavaScript 或其他任意代码。
15. 不允许引入政治、宗教、种族、暴力、血腥、仇恨、成人、赌博和攻击性内容。
16. 不允许调用、扫描或攻击任意第三方网站。
17. 不得提交 Secret、Token、API Key、`.env`、本地数据库、日志或构建产物。
18. 修改依赖时必须说明原因，并优先保证稳定兼容。
19. 每次完成后运行 lint、typecheck、test、build 和 format check。
20. 最终汇报必须说明：
    - 修改了什么；
    - 为什么这样做；
    - 测试结果；
    - 已知限制；
    - commit hash；
    - push 状态；
    - 下一 Milestone 尚未实现的内容。
