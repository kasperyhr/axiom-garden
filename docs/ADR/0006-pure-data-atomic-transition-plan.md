# ADR 0006：预计算、纯数据、原子 TransitionPlan

- 状态：Accepted
- 日期：2026-07-26

## 背景

确定性内核需要在 Rule 系统尚未存在时验证状态步进、原子性、预算、快照和摘要，同时不能提前定义 Rule、Condition 或 Action DSL。让 Engine 接收 callback 或可执行 handler 会破坏跨环境一致性和安全边界。

## 决策

Engine 只接受 strict runtime-validated 的纯数据 `TransitionPlan`。Plan 包含显式 expectedTick 和有序 operation 数组；operation 仅能完整 add/remove/replace Entity 或 sparse CellRecord。

全部 operation 按数组顺序在临时状态中预演，后续 operation 可观察前序暂存结果。只有整份 plan 有效时才原子提交并增加 tick；否则原状态保持不变。空 plan 是合法 no-op tick。

## 结果

未来 Rule/Action 层可以将已求值结果编译为这一低层边界，而 Engine 不需要知道匹配、优先级或动作语义。代价是调用方必须提供完整 record，且 TransitionPlan 不是可长期保存的 World 文件格式。Milestone 4 不实现自动 plan 生成、冲突解析或 replay 历史。
