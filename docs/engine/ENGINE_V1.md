# Axiom Garden Engine v1

## 目标与边界

`@axiom-garden/engine` 是纯 TypeScript、无框架依赖的确定性最小执行内核。它依赖 `@axiom-garden/domain`，Web 可以调用 Engine；Domain、UI、Worker 和 Protocol 不反向依赖 Engine。

Engine 不读取 DOM、网络、文件、localStorage、IndexedDB、环境变量、当前时间或隐式随机数。它不接受 callback、function、JavaScript source、动态 module path、class instance operation 或自定义 executable handler。

## SimulationStateV1

当前 `CURRENT_SIMULATION_STATE_VERSION = 1`，独立于 World `schemaVersion`。State 包含来源 world/schema、tick、metadata、grid、symbols、layers、cells 和 entities。Canonical state 只使用 JSON-compatible arrays/objects，不保存 Map 或 Set。

State 从 `WorldDocumentV1` 防御性复制创建，tick 从 0 开始。返回值按 immutable value 设计，并深度冻结作为额外开发保护；正确性不依赖调用方修改或 `Object.freeze`。

## Canonical ordering

- symbols：ID
- layers：order，再 ID
- cells/entities：layer order、y、x、ID
- tags：code-point 去重排序
- properties：code-point key 排序

所有比较不使用 locale。输入集合顺序不同但语义相同，会创建相同 canonical state 和 digest。

## Derived indexes 与 selectors

Entity、Symbol、Layer ID 以及 coordinate 索引可从 canonical arrays 重建，不进入 snapshot 或 digest。公开 selectors 为 `getEntityById`、`getSymbolById`、`getLayerById`、`getCellRecordAt`、`getEntitiesAt`、`getEntitiesInLayer`、`countEntities`；返回 defensive copy，调用方不依赖内部 Map。

## TransitionPlan

TransitionPlan 是预计算、受信任边界的纯数据，不是 Rule、Condition、Action DSL 或用户世界格式。它包含：

- 安全 `transition:` ID
- 与当前 state 相等的 `expectedTick`
- 按数组顺序执行的 operations

Operation 具有唯一 `operation:` ID，只允许 Add/Remove/Replace Entity 和 Add/Remove/Replace CellRecord。Replace 必须保持目标 ID；多个 Entity 可以同格，Engine 不执行碰撞检查。

## Sequential staging 与 atomic commit

Plan 中后续 operation 会看到前序 operation 的暂存结果，因此“先删除、再添加同 ID”被允许。所有 operation 都在临时 arrays 中预演；任一 issue 会拒绝整个 plan，原 state、tick 和 digest 不变。成功才生成 canonical next state，tick 加 1。

空 operations 是合法确定性 no-op，仍增加 tick，并因 tick 属于 canonical state 而改变 digest。

## Receipt 与 EngineIssue

成功 receipt 包含 transition ID、前后 tick、operation IDs、operation count、前后 digest 和六类数量摘要。它不含时间、随机值、耗时或完整 state。

失败返回稳定顺序的 `EngineIssue[]`，包括结构化 path、稳定 code、英文 message 和受限 details，不依赖异常控制用户数据错误。

## 多步执行

`runSimulation` 只接受有限 plan array。它按顺序执行，失败时返回最后成功 state、已有 receipts、失败 plan index 和 issues；不接受 iterator、rule evaluator callback 或后台任务。

## Snapshot、clone 与 comparison

Snapshot v1 是 `{ snapshotVersion, state, digest }` 普通 JSON-compatible data。Restore 会重新验证 state 并核对 digest；tamper 会被拒绝。Clone 不共享 mutable reference；comparison 返回 digest、tick、数量及 changed IDs 摘要。Snapshot 不保存到文件或数据库，也不是 Milestone 14 的完整 timeline/replay。

## Digest

`computeSimulationDigest` 对 canonical compact JSON 加单个 LF 后的 UTF-8 bytes 执行 FNV-1a 64-bit，固定格式 `ag1:xxxxxxxxxxxxxxxx`。

它用于一致性、缓存与测试，不抗碰撞，不是安全签名或认证。算法、输入序列化或前缀发生变化必须显式增加 digest 版本，不得静默改变。Representative initial state 的 golden vector 为 `ag1:370c165ed799a537`。

## Limits

| Limit                          |     Value |
| ------------------------------ | --------: |
| MAX_TICK                       | 1,000,000 |
| MAX_OPERATIONS_PER_TRANSITION  |     4,096 |
| MAX_RUN_STEPS                  |    10,000 |
| MAX_ENGINE_ENTITIES            |     4,096 |
| MAX_ENGINE_CELL_RECORDS        |     2,048 |
| Transition/operation ID length |       128 |

Engine entity/cell 上限低于 Domain 文件上限，用于限制交互执行成本。所有 step 有界，无无限循环。

## Determinism contract

相同 normalized World、Engine 版本和 TransitionPlan sequence 必须产生相同逐步 state、receipt、issue 顺序、canonical representation、digest 和 final state。性能耗时、内存地址、console output 与测试调度不属于确定性内容。

## 性能与安全

核心 operation 预演使用有界 arrays、Set/Map 查找和 canonical sorting。宽松 benchmark 覆盖 initial state、100 ticks、约 1000 operations 与 digest，用于发现复杂度回归。

Plan 和 snapshot 均经过 runtime validation；没有 eval、Function、dynamic import、HTML/SVG/CSS/URL 注入、远程请求或用户代码执行。

## Future Rule integration

未来正式 Rule/Condition/Action 层可以把已求值、已解决冲突的结果编译为 TransitionPlan。Engine 不反向持有 Rule 类型，也不猜测 replace 表示移动、旋转或任何动作。Milestone 4 不生成 plan、不匹配邻居、不定义优先级或冲突解析。
