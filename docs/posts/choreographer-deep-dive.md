# Choreographer 深度指南（第一部分）：Android Frame Rendering 的心脏

> 从两种工作模式、接口族清单、执行原理、到 Perfetto 诊断的完整解析。面向 Android 开发/测试人员。

---

## 前言

Choreographer 是 Android UI 渲染的**中枢调度器**。它的核心职责是：

- **接收帧驱动信号**（VSYNC 或定时器）
- **管理 5 大回调队列**（INPUT → ANIMATION → INSETS → TRAVERSAL → COMMIT）
- **执行回调**（measure/layout/draw）
- **提交到 SurfaceFlinger**

本文从三个维度系统性地解析 Choreographer，适合 Android 开发/测试人员理解和诊断性能问题：

1. **是什么** — 核心认知、工作模式、接口族清单
2. **怎么用** — 常见用法、最佳实践、陷阱避坑
3. **原理 + Trace** — 执行流程、Perfetto 观察、性能诊断

---

## 一、核心认知：两种工作模式

### 1.1 Choreographer 不是"只等 VSYNC"

常见的错误理解是：
```
Choreographer = "等待硬件 VSYNC" → "执行回调"
```

实际上，Choreographer 有**两种完全不同的工作模式**，由系统属性控制：

```java
boolean USE_VSYNC = SystemProperties.getBoolean(
    "debug.choreographer.vsync", 
    true  // 默认值
)
```

### 1.2 Mode 1：VSYNC 驱动（USE_VSYNC = true）

**这是 99% 的生产设备使用的模式。**

```
硬件 VSYNC 信号（来自 SurfaceFlinger）
    ↓
DisplayEventReceiver（监听信号）
    ↓
onVsync() 回调触发
    ↓
发送 Handler 消息（MSG_DO_FRAME）
    ↓
UI 线程处理消息
    ↓
Choreographer.doFrame(frameTimeNanos)
    ↓
顺序执行 5 大回调：
  INPUT → ANIMATION → INSETS → TRAVERSAL → COMMIT
    ↓
提交到 SurfaceFlinger
    ↓
下一个 VSYNC 到来时重复
```

**特点**：
- 帧时间由硬件 VSYNC 决定（精确）
- 60Hz 屏幕：每 16.67ms 一个 VSYNC
- 120Hz 屏幕：每 8.33ms 一个 VSYNC
- **自动适配高刷屏幕**
- 省电（等待信号，不轮询）

**关键类**：`DisplayEventReceiver`（接收 SurfaceFlinger 的 VSYNC）

### 1.3 Mode 2：定时器驱动（USE_VSYNC = false）

**用于低端设备或模拟器（没有硬件 VSYNC）。**

```
应用启动 或 上一帧完成
    ↓
Choreographer.scheduleFrame()
    ↓
Handler.postDelayed(doFrame, ~16ms)  ← 硬编码定时器
    ↓
定时器到期
    ↓
Handler 回调 doFrame()
    ↓
顺序执行 5 大回调：
  INPUT → ANIMATION → INSETS → TRAVERSAL → COMMIT
    ↓
递归调用 scheduleFrame()，继续下一帧
```

**特点**：
- 帧时间由软件定时器决定（不精确）
- 总是硬编码 16ms（60Hz）
- **无法自动适配高刷屏幕**
- 与硬件 VSYNC 不同步 → 可能撕裂、抖动
- 高耗电（频繁 Timer 唤醒）

**关键问题**：定时器偏差（如 15ms 或 17ms）会导致帧率不稳定

### 1.4 如何判断当前是哪种模式？

**通过 adb 命令**：
```bash
adb shell getprop debug.choreographer.vsync
# 输出：true（Mode 1）或 false（Mode 2）
```

**在 Perfetto Trace 中**：
- **Mode 1**：看得到 `FrameDisplayEventReceiver#onVsync()`，VSYNC 间隔精确（±0.1ms）
- **Mode 2**：看不到 onVsync()，只有 Handler 定时器，间隔不稳定（±2-3ms）

---

## 二、接口族清单

Choreographer 暴露 18 个接口，按功能分为 4 个族。

### 接口族 1：实例获取族

**用途**：获取或释放 Choreographer 实例

**接口清单**：
- `getInstance()` - 获取当前线程的 Choreographer（绑定到 Looper）
- `getMainThreadInstance()` - 获取主线程的 Choreographer（可能为 null）
- `getInstanceForSurfaceControl(layerHandle, looper)` - 基于 SurfaceControl 创建专用实例
- `releaseInstance()` - 释放当前线程的 Choreographer

**使用场景**：
- 动画、自定义渲染时获取实例
- 后台线程需要独立的 Choreographer 实例
- 线程销毁前释放实例避免内存泄漏

**关键约束**：Choreographer 必须在有 Looper 的线程中创建

---

### 接口族 2：帧时间查询族

**用途**：查询帧时间、帧间隔、预期呈现时间等

**接口清单**：
- `getFrameTime()` - 当前帧时间（毫秒）
- `getFrameTimeNanos()` - 当前帧时间（纳秒）
- `getLastFrameTimeNanos()` - 最后一帧的时间
- `getExpectedPresentationTimeNanos()` - 当前帧的预期呈现时间
- `getLatestExpectedPresentTimeNanos()` - 最新的预期呈现时间（包含 Binder 调用）
- `getFrameIntervalNanos()` - 帧间隔（纳秒，动态）
- `getVsyncId()` - 当前帧的 VSYNC ID（用于与 SurfaceFlinger 帧关联）
- `getFrameDeadline()` - 当前帧的截止时间

**使用场景**：
- 动画计算、帧同步
- **高刷屏幕（120Hz/144Hz）适配**
- 帧时间精度要求高的场景

**关键约束**：`getFrameTime*` 和 `getVsyncId` **只能在 Frame Callback 中调用**

**为什么不用 System.nanoTime()？**

| 问题 | System.nanoTime() | frameTime |
|------|------------------|-----------|
| 帧内时间一致性 | ❌ 波动 | ✅ 一致 |
| 时间顺序 | ❌ 可能回退 | ✅ 严格递增 |
| 与屏幕同步 | ❌ 需手动校准 | ✅ 精确同步 |
| 结果 | 动画 pop、Jank 检测失败 | 平滑、精准 |

---

### 接口族 3：帧回调族

**用途**：注册与帧处理同步的回调

#### 3.1 通用帧回调（与 VSYNC 同步、执行顺序确定）

**接口清单**：
- `postCallback(callbackType, action, token)` - 注册回调（立即）
- `postCallbackDelayed(callbackType, action, token, delayMillis)` - 注册回调（延迟）
- `removeCallbacks(callbackType, action, token)` - 移除回调

**5 大回调类型**（执行顺序固定，不可改变）：

```
CALLBACK_INPUT (0)            ← 处理输入事件        (~1ms)
  ↓
CALLBACK_ANIMATION (1)        ← 更新动画值          (~2-5ms)
  ↓
CALLBACK_INSETS_ANIMATION (2) ← 窗口 Insets 动画    (~1ms)
  ↓
CALLBACK_TRAVERSAL (3)        ← measure/layout/draw (~8-10ms)
  ↓
CALLBACK_COMMIT (4)           ← 缓冲区提交          (~1-2ms)
  ↓
总耗时预算：16ms（60Hz）/ 8.33ms（120Hz）
```

**使用场景**：
- **Framework 内部驱动**（ViewRootImpl.scheduleTraversals）
- 动画框架（ValueAnimator、ObjectAnimator）
- 需要精确执行顺序的场景

---

#### 3.2 简化帧回调（每帧一次，自动移除）

**接口清单**：
- `postFrameCallback(callback)` - 注册每帧回调
- `removeFrameCallback(callback)` - 移除回调

**特点**：
- 每帧自动执行一次
- 执行后自动移除（需手动重新注册继续下一帧）
- 不受 callbackType 限制

**使用场景**：
- 游戏引擎（帧循环）
- 自定义 OpenGL/Vulkan 渲染
- 实时数据更新（动画、物理模拟）

---

#### 3.3 高精度帧回调（Android 12+，多时间线）

**接口清单**：
- `postVsyncCallback(callback)` - 注册 VSYNC 回调
- `removeVsyncCallback(callback)` - 移除回调

**用途**：获取精细的帧时间信息（多条时间线）

**使用场景**：
- 多屏幕场景（不同屏幕有不同的时间线）
- 高精度同步需求
- 帧时间预测

**特点**：提供 FrameData 对象，包含多条可能的 FrameTimeline（vsyncId、expectedPresentationTime、deadline）

---

### 接口族 4：配置族

**用途**：配置帧处理的全局参数

**接口清单**：
- `setFrameDelay(frameDelay)` - 设置帧延迟（毫秒）
- `getFrameDelay()` - 获取帧延迟
- `subtractFrameDelay(delayMillis)` - 从延迟中减去帧延迟时间
- `setFPSDivisor(divisor)` - 设置 FPS 分频器（降低刷新率）
- `onWaitForBufferRelease(durationNanos)` - 缓冲区堆积恢复通知

**使用场景**：
- 低端设备优化（增加帧延迟以降低功耗）
- 缓冲区堆积恢复（SurfaceFlinger 通知）
- FPS 降频实验

---

## 三、执行原理

### 3.1 postCallback vs postCallbackDelayed

这两个接口的区别决定了**何时把回调加入队列**。

**postCallback()（立即入队）**：

```
postCallback(CALLBACK_ANIMATION, runnable)
    ↓
立即加入回调队列（不等待）
    ↓
[等待下一个 VSYNC / 定时器]
    ↓
Mode 1: 下一个 VSYNC 到来时执行
Mode 2: 下一个定时器到期时执行
```

**总延迟**：0-16ms（取决于 VSYNC 相位或定时器精度）

---

**postCallbackDelayed()（延迟入队）**：

```
postCallbackDelayed(CALLBACK_ANIMATION, runnable, 100ms)
    ↓
计算 dueTime = now + 100ms
    ↓
[时间判断]
├─ dueTime ≤ now  → 立即加入队列（延迟已到期）
└─ dueTime > now  → 发送 Handler 延迟消息（MSG_DO_SCHEDULE_CALLBACK）
                   等待 100ms 后再加入队列
    ↓
[Mode 1] 加入队列后，等待下一个 VSYNC（0-16.67ms）
[Mode 2] 加入队列后，等待下一个定时器（0-16ms，但精度差）
```

**总延迟**：100ms + 0-16ms

---

### 3.2 五大回调阶段的耗时分布

每帧 16ms 的预算如何分配？

```
0ms ─────────────────────────────────────────────── 16ms
│                                                      │
├─ INPUT (0-1ms)         ↓
│  处理触摸、按键事件
│
├─ ANIMATION (1-5ms)     ↓
│  更新动画值、位移、缩放等
│
├─ INSETS (5-6ms)        ↓
│  窗口 Insets 动画
│
├─ TRAVERSAL (6-14ms)    ↓ ← 最耗时
│  measure/layout/draw
│  这里通常是瓶颈
│
├─ COMMIT (14-16ms)      ↓
│  缓冲区提交
│
└─ 用户感知到的帧在屏幕上（约 16ms 后）
```

**关键认识**：
- TRAVERSAL 是最耗时的阶段（8-10ms）
- 如果 TRAVERSAL 超过 10ms，下一帧会 Jank
- INPUT 必须快速响应（<1ms），否则操作卡顿

---

### 3.3 Mode 1 vs Mode 2 下的行为差异

| 场景 | Mode 1 (VSYNC) | Mode 2 (定时器) |
|------|---|---|
| **doFrame 触发** | VSYNC 信号精确触发 | 定时器大约 16ms 触发 |
| **帧间隔** | 精确 16.67ms（60Hz）、8.33ms（120Hz） | 不精确，波动 2-3ms |
| **高刷适配** | ✅ 自动精确匹配 120Hz/144Hz | ❌ 硬编码 16ms，无法适配 |
| **postCallbackDelayed 后** | 精确等待下一个 VSYNC | 等待不精确的定时器 |
| **功耗** | 低（等待，不轮询） | 高（频繁 Timer 唤醒） |

---

## 四、Perfetto 中的观察与诊断

### 4.1 采集 Trace

**方式 1：Android Studio Profiler**
```
Profiler → System Trace → Record
（运行 UI 操作，30 秒后自动停止）
```

**方式 2：adb 命令**
```bash
adb shell perfetto \
    --config <(echo 'buffers { size_kb: 32768 }
        data_sources { config { name: "linux.ftrace" } }
    ') \
    --out /data/perfetto-trace.pb

# 在应用中运行 UI 操作...

adb pull /data/perfetto-trace.pb
# 在 https://ui.perfetto.dev 打开
```

### 4.2 关键观察点

打开 Perfetto UI 后，切换到 **Main Thread** 视图，观察 6 个关键信号：

| 信号 | 含义 | 对应代码 | 正常表现 |
|------|------|--------|--------|
| **Choreographer#doFrame** | 帧处理总耗时 | doFrame() 执行时间 | 绿色 bar，<16ms |
| **INPUT / ANIMATION / TRAVERSAL / COMMIT** | 5 大阶段耗时分布 | 各阶段的 doCallbacks() | 显示在 doFrame 内 |
| **VSYNC 竖线** | 硬件 VSYNC 信号到达 | onVsync() 触发 | 蓝色竖线，16.67ms 间隔（60Hz） |
| **空白间隔** | 没有 UI 操作的阶段 | 等待下一个 VSYNC | 正常，通常 0-16ms |
| **MessageQueue#next** | Handler 消息队列等待 | 处理 Handler 消息 | 如果看到长时间等待，说明有延迟消息 |
| **measure/layout/draw** | View 树遍历 | ViewRootImpl.doTraversal() | 耗时最长的阶段 |

### 4.3 快速诊断流程

**问题 A：应用掉帧了（Jank）**

```
采集 Trace
    ↓
打开 Perfetto → Main Thread 视图
    ↓
找到红色 bar（>16ms 的 doFrame）
    ↓
检查：
├─ TRAVERSAL 耗时过长？ → View 树太复杂，measure/layout/draw 超时
├─ INPUT 被延迟？ → 前一帧的 TRAVERSAL 过长，导致输入卡顿
└─ VSYNC 间隔不均？ → 可能是 Mode 2（定时器），或缓冲区堆积
    ↓
针对根因优化
```

**问题 B：动画不平滑（pop/闪烁）**

```
采集 Trace
    ↓
在 ANIMATION 阶段，检查回调中的 frameTime 值
    ↓
如果 frameTime 波动：
├─ 应用使用了 System.nanoTime()  → 改为 Choreographer.getFrameTime()
└─ 或 Mode 2 定时器精度不够    → 建议用 Mode 1
```

**问题 C：延迟回调问题**

```
采集 Trace
    ↓
在 Main Thread 上看 Handler 消息队列
    ↓
如果看到长时间等待（如 1000ms+ 空白）：
├─ 说明有 postCallbackDelayed 的延迟消息在等待
├─ 确认 dueTime 是否符合预期
└─ 检查是否意外设置了过大的延迟
```

---

## 四(补充)：Trace 事件与函数对照清单

在 Perfetto 中看到的每一条轨迹都对应 Choreographer 源码中的 Trace 调用。理解这些对应关系，才能快速定位问题。

### 4.4 核心 Trace 事件清单

| # | Trace 事件 | 对应函数 | 含义 | 耗时 | Perfetto 表现 |
|---|-----------|--------|------|------|------------|
| 1 | `onVsync()` | `FrameDisplayEventReceiver.onVsync()` | VSYNC 信号到达 | 即时 | 蓝色竖线，精确间隔 |
| 2 | `doFrame()` | `Choreographer.doFrame()` | 帧处理核心函数 | <16ms | 绿色/红色 bar |
| 3 | `INPUT` | `doCallbacks(CALLBACK_INPUT)` | 处理输入事件 | ~1ms | doFrame 内第 1 段 |
| 4 | `ANIMATION` | `doCallbacks(CALLBACK_ANIMATION)` | 更新动画值 | ~2-5ms | doFrame 内第 2 段 |
| 5 | `INSETS_ANIMATION` | `doCallbacks(CALLBACK_INSETS_ANIMATION)` | 窗口 Insets 动画 | ~1ms | doFrame 内第 3 段 |
| 6 | `TRAVERSAL` | `doCallbacks(CALLBACK_TRAVERSAL)` | **measure/layout/draw** | ~8-10ms | doFrame 内最长段 |
| 6.1 | `performMeasure()` | `ViewRootImpl.performMeasure()` | 测量所有 View | 子事件 | 嵌套在 TRAVERSAL 内 |
| 6.2 | `performLayout()` | `ViewRootImpl.performLayout()` | 放置所有 View | 子事件 | 嵌套在 TRAVERSAL 内 |
| 6.3 | `performDraw()` | `ViewRootImpl.performDraw()` | 绘制所有 View | 子事件 | 嵌套在 TRAVERSAL 内 |
| 7 | `COMMIT` | `doCallbacks(CALLBACK_COMMIT)` | 缓冲区提交 | ~1-2ms | doFrame 内最后段 |
| 8 | `scheduleVsyncLocked()` | `Choreographer.scheduleVsyncLocked()` | 注册下一个 VSYNC | 快速 | 短事件 |
| 9 | `MSG_DO_SCHEDULE_VSYNC` | Handler 消息处理 | 线程切换（后台线程调用） | +1-2ms | Handler 轨迹 |
| 10 | `MSG_DO_SCHEDULE_CALLBACK` | Handler 消息处理 | 延迟回调到期 | 等待 | Handler 轨迹 |
| 11 | `Buffer stuffing recovery` | 缓冲区恢复机制 | 缓冲区堆积恢复 | 可变 | VSYNC 间隔变大 |

### 4.5 快速诊断对照表

**看到这个现象，说明什么？**

| 现象 | 根因 | 是否正常 | 优化方案 |
|-----|------|---------|--------|
| onVsync() 精确 16.67ms 间隔 | Mode 1 (VSYNC 驱动) | ✅ 正常 | 无需优化 |
| onVsync() 间隔波动（15-17ms） | Mode 2 (定时器)或硬件异常 | ⚠️ | 检查系统属性 |
| doFrame < 16ms，全绿 bar | 帧处理正常 | ✅ 正常 | 无需优化 |
| doFrame > 16ms，红色 bar | **Jank 发生** | ❌ | 找到红色段，优化 |
| TRAVERSAL 段很长（>10ms） | measure/layout/draw 耗时 | ❌ | 优化 View 树（扁平化、避免嵌套） |
| ANIMATION 波动、不连贯 | 使用了 System.nanoTime() | ❌ | 改用 Choreographer.getFrameTime() |
| 长时间空白（如 1000ms） | postCallbackDelayed 延迟消息在等待 | ✅ 正常 | 无需优化 |
| measure/layout/draw 嵌套很深 | View 树层级太深 | ❌ | 扁平化布局 |
| Buffer stuffing recovery 频繁出现 | 缓冲区堆积 | ❌ | 检查 TRAVERSAL 是否超时 |

### 4.6 完整执行序列（时间轴）

```
时刻 T0:
├─ VSYNC 信号从硬件到达
└─ onVsync() 被回调
   └─ 发送 Handler 消息 MSG_DO_FRAME

时刻 T0+ (几微秒后):
└─ doFrame() 开始执行
   ├─ [1ms]   INPUT 回调 → 处理用户输入
   ├─ [3ms]   ANIMATION 回调 → 更新动画值
   ├─ [1ms]   INSETS_ANIMATION 回调 → Insets 更新
   ├─ [8ms]   TRAVERSAL 回调 → measure/layout/draw ← 最耗时
   │          ├─ performMeasure() → 测量所有 View
   │          ├─ performLayout() → 放置所有 View
   │          └─ performDraw() → 绘制所有 View
   └─ [2ms]   COMMIT 回调 → 提交到 SurfaceFlinger

时刻 T0+16ms (约):
└─ doFrame() 结束（如果超过 16ms → Jank）
└─ scheduleVsyncLocked() 注册下一个 VSYNC

时刻 T0+16-33ms:
└─ 等待下一个 VSYNC 信号（或定时器）

时刻 T0+33ms (约):
└─ 下一个 VSYNC 到来，重复循环...
```

### 4.7 5 个关键观察点（优先级）

开发者在诊断性能时，应该按以下优先级查看：

1. **onVsync() 间隔** - 判断是 Mode 1（精确）还是 Mode 2（不精确）
2. **doFrame 的红色 bar** - 直接指示 Jank（>16ms）
3. **TRAVERSAL 段长度** - 通常是最大的瓶颈
4. **ANIMATION 一致性** - frameTime 波动说明使用了 System.nanoTime()
5. **缓冲区恢复** - 频繁出现说明 TRAVERSAL 经常超时

---

## 五、常见陷阱与最佳实践

### 5.1 五大陷阱

| 陷阱 | 后果 | 根因 | 解决方案 | Trace 表现 |
|------|------|-----|--------|----------|
| **在 TRAVERSAL 做复杂计算** | TRAVERSAL 超时 → Jank | CPU 繁忙 | 预计算或后台线程 | 红色 bar，TRAVERSAL 段很长 |
| **频繁在回调中 invalidate()** | 帧内递归，掉帧加倍 | 反复触发 TRAVERSAL | 批量更新，避免递归 | 多个 doFrame bar 紧密排列 |
| **硬编码 16ms 帧间隔** | 120Hz 屏幕动画错乱 | 没有用 getFrameIntervalNanos() | 用动态帧间隔 | Trace 中 VSYNC 间隔异常 |
| **从回调外调用 getFrameTime()** | IllegalStateException | 框架限制 | 仅在回调中调用 | Crash log 清晰 |
| **从后台线程频繁 postCallback()** | 线程切换开销累积 | 1-2ms × N 次 | 改为批量或在 UI 线程调用 | Handler 消息队列繁忙 |

### 5.2 最佳实践清单

✓ **使用 frameTime 而非 System.nanoTime()**
```
动画会平滑，无波动和 pop
在 Trace 中看到 ANIMATION 的 frameTime 一致
```

✓ **使用 getFrameIntervalNanos() 而非硬编码 16ms**
```
自动适配 60Hz/90Hz/120Hz/144Hz 屏幕
在 Trace 中看到 VSYNC 间隔与屏幕刷新率匹配
```

✓ **避免在 TRAVERSAL 中做重操作**
```
measure/layout/draw 必须 < 10ms
在 Trace 中看到 TRAVERSAL 段为绿色，不是红色
```

✓ **监测帧间隔，建立 Jank 告警**
```
记录 frameTime 差值，超过 16.67ms 则上报
在性能基线中建立 Jank 率告警阈值
```

✓ **高刷屏幕适配**
```
动画、滚动、拖拽都要用 getFrameIntervalNanos()
在 120Hz 屏幕测试，Trace 中 VSYNC 应该是 8.33ms 间隔
```

---

## 六、总结

### 核心三层认知

**第 1 层：工作模式**
```
Mode 1 (99%): VSYNC 驱动 → 精确、省电、自动适配高刷
Mode 2 (1%):  定时器驱动 → 不精确、耗电、低端设备
```

**第 2 层：执行顺序**
```
VSYNC/定时器 → doFrame() → INPUT → ANIMATION → INSETS → TRAVERSAL → COMMIT
（每次按固定顺序，不可变）
```

**第 3 层：诊断方法**
```
掉帧 → 看 doFrame 耗时 → 找到红色 bar → 定位是哪个阶段超时
不平滑 → 看 frameTime 一致性 → 检查是否用了 System.nanoTime()
延迟 → 看 Handler 消息队列 → 检查 postCallbackDelayed 的 dueTime
```

### 性能优化的要点

1. **把耗时操作从 TRAVERSAL 移出**（measure/layout/draw 必须快）
2. **用 getFrameTime() 而非 System.nanoTime()**（保证一致性）
3. **高刷屏幕用 getFrameIntervalNanos()**（自动适配）
4. **在 Perfetto 中观察 5 大阶段的耗时分布**（快速定位瓶颈）
5. **建立 Jank 告警机制**（及时发现性能回归）

---

**最后修订**：2026 年 5 月  
**关键类**：`android.view.Choreographer.java`  
**关键工具**：Perfetto (https://ui.perfetto.dev)

