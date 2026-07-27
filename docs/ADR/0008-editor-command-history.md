# ADR 0008：独立纯数据 Command/History 编辑系统

- 状态：Accepted
- 日期：2026-07-26

## 背景

Milestone 6 需要修改 World Document，并提供 validation、Undo/Redo、Canvas 放置和 Inspector 表单。Engine 已有 TransitionPlan，但它描述 tick 中对 SimulationState 的低层原子变更；编辑则修改作者文档，必须管理 metadata、palette、layer、grid 和编辑历史。

## 决策

新增只依赖 Domain 的 `@axiom-garden/editor`。编辑输入使用 strict、runtime-validated、纯数据 `EditorCommand`；候选文档在提交前由 Domain 重新验证和规范化。文档命令产生独立 `agd1:` receipt，并以最多 100 条 canonical document 快照实现 Undo/Redo。

Editor 不依赖 Engine 或 Renderer；Web 负责把编辑文档投影为 RenderScene，并可独立做 Engine tick 0 兼容性检查。Editor command 永不转换为 TransitionPlan，revision 永不增加 simulation tick。

## 原因

- World Document 与 SimulationState 是不同事实源，复用 TransitionPlan 会混淆作者编辑和运行执行。
- 纯数据 command 可 runtime validate、确定复现、property test，并禁止 callback 或任意代码。
- 原子候选文档 + Domain validation 避免 Editor 复制或漂移领域约束。
- 快照 history 在当前 2 MiB 文档与 100-entry 上限下实现清晰，Reset 和 batch 都能准确撤销。
- Web 临时 drag preview 避免 pointer move 产生大量历史或不可变文档分配。

## 后果

- 快照 history 的内存成本高于 patch/diff，但有明确上限，行为简单可审计。
- Editor 与 Engine 各有 receipt/digest 前缀，调用方必须明确使用哪一条边界。
- Renderer 不感知 Editor；每次已提交编辑由 Web 重建 scene。
- 未来若优化 history，必须保持原子、确定、selection recovery 与版本兼容，不能把 history 嵌入 World Document。

## 未选择方案

- 复用 Engine TransitionPlan：会错误增加执行语义并污染 tick/replay 边界。
- 直接在 React state 中散布 mutation：难以原子验证、复用和测试。
- JSON Patch 库：当前规模增加依赖和语义表面，快照更清晰。
- 命令回调或插件 handler：破坏纯数据、安全和确定性约束。
