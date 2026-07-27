# Editor v1

## 目标与边界

`@axiom-garden/editor` 为经过 Domain 验证的 `WorldDocumentV1` 提供安全、确定、原子、可撤销的内存编辑。它只依赖 Domain，不依赖 Engine、Renderer、React、DOM、网络、文件系统、时间、随机数或持久化。

Editor 修改世界作者数据；Engine TransitionPlan 修改模拟运行状态。两者不可互换：Editor command 不增加 tick、不产生 Engine receipt，也不写入 World Document。

## EditorStateV1

状态包含：

- `editorStateVersion: 1`
- canonical `document`
- 单一 `selection`
- `activeLayerId` 与 `activeTool`
- Entity/Cell 内存 `clipboard`
- `undoStack`、`redoStack`
- 从 0 开始的 `revision`
- 最近一次 document `lastReceipt`

状态和输入均做防御性复制并作为不可变值使用。viewport、hover 与 drag preview 属于 Web 临时状态，不进入 EditorState。

## Revision

成功的 document command 使 revision 加一。Selection、tool、active layer 与 clipboard command 不改变 revision。失败命令不改变 revision。Undo 恢复 entry 的 `beforeRevision`，Redo 恢复 `afterRevision`；revision 与 Engine tick 完全独立。

## Tools

v1 仅支持 `inspect`、`pan`、`placeEntity`、`placeCell`。工具状态不进入 World Document。不存在 rule、connect、timeline、simulation 或任意样式工具。

## Command 模型

每个 command 都是 strict、runtime-validated 的纯数据，包含安全有限的 `commandId`、discriminated `kind`、`expectedRevision` 与明确 payload。

Document command：

- Entity：add、remove、replace、move
- Cell Record：add、remove、replace
- Symbol：add、replace、remove
- Layer：add、replace、remove
- metadata：更新 title、description、tags，同时保留固定时间
- grid：只修改 1–256 的 width/height
- reset：以明确文档替换当前文档并保留 Undo

Editor-only command：

- set/clear selection
- set active layer/tool
- copy selection/clear clipboard

Command 不接受 callback、class instance、函数、源码、表达式、任意 handler 或嵌套 batch。

## 验证与原子性

执行顺序固定：

1. 检查输入是有限、无危险 key 的纯数据。
2. strict Zod schema 解析。
3. 核对 `expectedRevision`。
4. 检查 locked layer、存在性、引用、ID、grid 与删除约束。
5. 构建完整候选 World Document。
6. 使用 Domain API 做 strict validation 与 normalization。
7. 全部通过后才提交新 EditorState、history entry 与 receipt。

任一步失败都返回稳定顺序的 `EditorIssue[]`，原 state、revision 和 history 不变。结构化 issue 包含 code、severity、path、英文 message 与受限 details，不回显完整文档。

## Atomic batch

`EditorCommandBatch` 最多包含 100 个 document command，禁止嵌套。子命令严格按数组顺序暂存，后续命令看到前序候选结果；任一失败拒绝整批。成功 batch 只增加一次 revision、只产生一个 history entry。

## Selection

选择 union 为 `none | entity | cell | coordinate | layer | symbol`，v1 只有单选。文档命令、Undo 与 Redo 后重新验证选择；引用已删除对象时自动清除。隐藏 layer 中的对象由 Web/Renderer hit testing 阻止新选中。

## Clipboard 与确定性 ID

内部 clipboard 只保存 Entity 或 Cell Record 的纯数据深拷贝，不使用系统 clipboard、localStorage 或 World Document。Paste 必须由调用方提供新 ID、目标坐标和目标 layer。

`allocateDeterministicId(namespace, baseLabel, usedIds)` 以稳定 code-unit 规则返回首个可用 ID，例如 `entity:circle`、`entity:circle-2`。它不读取时间或随机数，结果仍经过 Domain validation。系统 clipboard 只用于复制 canonical World JSON 文本。

## Undo/Redo

成功 document command 保存 normalized before/after document 快照、command ID/kind、before/after revision、summary 和 affected IDs。历史上限为 100；超过时丢弃最旧 entry。新 document command 清空 redo。失败命令和 UI-only command 不入栈。

快照策略实现简单且确定，但内存成本与文档大小、历史长度近似线性增长。当前上限控制资源；未来若需优化，应在保持 canonical 语义和可恢复性的前提下设计正式版本，而不是把 history 写入 World Document。

## Locked layer

locked layer 的 Entity/Cell 可查看，但添加、删除、替换和移动均拒绝。Layer 本身可以被解锁。删除含引用的 layer 拒绝且不级联；至少保留一个 layer。删除被 Entity 引用的 Symbol 同样拒绝。

## Canvas 与 Inspector 集成

Web 将 `EditorState.document` 转为 RenderScene。Place 每次点击提交一个 command；Entity drag 超过 threshold 后只更新 ephemeral preview，pointer up 提交一次 move，Escape 取消。Inspector 使用受控 draft，Apply 提交一次 command，Cancel 丢弃 draft；properties 仅允许 Domain scalar 与一维数组。

移动端 Tools/Symbols、Layers 与 Inspector 使用 UI Dialog；Canvas 支持 Pointer Events 和键盘工具快捷键。

## JSON Preview 与 Engine 边界

Editor JSON Preview 只读，展示 canonical JSON、revision、`agd1:` digest，并允许验证和复制文本。直接 JSON 编辑仍留在 World Format Lab；不存在上传、下载或文件选择。

Web 可调用 `createInitialSimulationState` 做 tick 0 兼容性验证并展示 Engine digest。Editor package 不导入 Engine，也不执行 tick、transition 或 simulation history。

## Digest

`agd1:` 使用纯 TypeScript FNV-1a 64-bit 对 Domain canonical JSON 计算。它用于一致性、receipt 和测试，不是密码学哈希、签名或认证机制。算法若改变必须使用新前缀。

## 安全、性能与持久化

- 所有 command runtime validate；候选文档再次 Domain validate。
- history 100、batch 100，properties 与集合沿用 Domain 限制。
- 不执行用户代码，不解析任意系统 clipboard，不接受 CSS、SVG、URL 或图片。
- drag preview 不重建 EditorState；pointer up 才提交。
- 4,000 Entity move 和 Renderer scene rebuild 有宽松 benchmark。
- world 不写 localStorage、IndexedDB、文件、网络或云端；刷新恢复 representative world。

Milestone 7 的 Rule DSL、Rule/Condition/Action、AST、求值与冲突解析不属于 Editor v1。
