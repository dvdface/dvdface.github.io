# Choreographer 深度指南：Android Frame Rendering 的心脏

> 从帧驱动机制到性能优化的完整解析，涵盖 VSYNC 同步、帧时间计算、回调链路与 Jank 根因分析。

---

## 前言

Choreographer 是 Android UI 渲染的**中枢调度器**，负责协调 VSYNC 信号、帧时间、回调执行与缓冲区管理。  
本文从三个维度系统性地解析 Choreographer：

1. **对外接口** — 什么时候调用、怎么用
2. **调用场景** — Framework 和应用层的实际用法
3. **内部机制** — 初始化、VSYNC 驱动、帧处理、性能优化

---

## 一、Choreographer 对外接口完全清单

### 1.1 获取 Choreographer 实例

```java
// 获取当前线程的 Choreographer（绑定到 Looper）
public static Choreographer getInstance()

// 获取主线程的 Choreographer（可能为 null）
public static Choreographer getMainThreadInstance()

// 基于 SurfaceControl 创建专用 Choreographer
static Choreographer getInstanceForSurfaceControl(long layerHandle, Looper looper)

// 释放当前线程的 Choreographer
public static void releaseInstance()
```

**约束：** Choreographer 必须在有 Looper 的线程中创建。通常是 UI 线程或后台 Handler 线程。

### 1.2 帧时间查询（最常用）

这组接口提供**稳定的帧时间**，而非 `System.nanoTime()`。所有同一帧内的回调看到相同的帧时间，确保动画的平滑性。

```java
// 当前帧的时间（毫秒，uptimeMillis 基准）
public long getFrameTime()

// 当前帧的时间（纳秒，nanoTime 基准）
public long getFrameTimeNanos()

// 最后一帧的时间（纳秒）
public long getLastFrameTimeNanos()

// 当前帧的预期呈现时间（纳秒）
public long getExpectedPresentationTimeNanos()

// 最新的预期呈现时间（包含 Binder 调用到 SurfaceFlinger）
public long getLatestExpectedPresentTimeNanos()

// 获取帧间隔（纳秒）— 重要！用于动画计算
public long getFrameIntervalNanos()

// 获取 VSYNC ID（用于与 SurfaceFlinger 帧关联）
public long getVsyncId()

// 获取当前帧的截止时间（deadline）
public long getFrameDeadline()
```

**使用约束：**
- `getFrameTime*` 和 `getVsyncId` **只能在 Frame Callback 中调用**
- 在回调外调用会抛出 `IllegalStateException`

**为什么需要 frameTime 而不是 System.nanoTime()？**

```
使用 System.nanoTime()：                使用 frameTime：
动画值在帧内随机波动 ← ┐               所有回调共用同一时间 ← ┐
帧时间可能回退 ← ┐                      帧时间严格递增 ← ┐
解决方案：                               结果：
① 帧内时间不一致                        ① 动画平滑，无 pop
② 可能导致帧波动                        ② Jank 检测更准确
③ 需要额外的时间校准逻辑                ③ 与屏幕刷新精确同步
```

### 1.3 Frame Callback 接口（低级）

适用于需要每帧更新的场景，如自定义 OpenGL 渲染、游戏引擎。

```java
public interface FrameCallback {
    void doFrame(long frameTimeNanos);
}

// 注册帧回调
public void postFrameCallback(FrameCallback callback)

// 延迟注册帧回调
public void postFrameCallbackDelayed(FrameCallback callback, long delayMillis)

// 移除帧回调
public void removeFrameCallback(FrameCallback callback)
```

**特点：** 每帧回调一次，自动移除。用户需手动重新注册以继续接收。

### 1.4 VsyncCallback 接口（高级，Android 12+）

适用于需要精细帧时间信息的场景，如多屏幕、高精度同步。

```java
public interface VsyncCallback {
    void onVsync(@NonNull FrameData data);
}

public void postVsyncCallback(@NonNull VsyncCallback callback)
public void removeVsyncCallback(@Nullable VsyncCallback callback)

// FrameData 包含详细的帧信息
public static class FrameData {
    public long getFrameTimeNanos()
    public FrameTimeline[] getFrameTimelines()      // 多个可能的时间线
    public FrameTimeline getPreferredFrameTimeline() // 优选时间线
}

public static class FrameTimeline {
    public long getVsyncId()                        // 帧 ID
    public long getExpectedPresentationTimeNanos()  // 预期呈现时间
    public long getDeadlineNanos()                  // 帧截止时间
}
```

### 1.5 通用 Callback 接口（Framework 内部）

Framework 使用这组接口来驱动整个帧处理流程。

```java
public void postCallback(int callbackType, Runnable action, Object token)
public void postCallbackDelayed(int callbackType, Runnable action, Object token, long delayMillis)
public void removeCallbacks(int callbackType, Runnable action, Object token)

// Callback 类型（执行顺序严格递序）
public static final int CALLBACK_INPUT            = 0  // 输入事件处理
public static final int CALLBACK_ANIMATION        = 1  // 动画更新
public static final int CALLBACK_INSETS_ANIMATION = 2  // 窗口 Insets 动画
public static final int CALLBACK_TRAVERSAL        = 3  // View measure/layout/draw
public static final int CALLBACK_COMMIT           = 4  // 帧后处理与缓冲区提交
```

**执行顺序（每帧固定）：**

```
INPUT → ANIMATION → INSETS_ANIMATION → TRAVERSAL → COMMIT
  ↓         ↓             ↓              ↓          ↓
1ms      2-5ms          1ms            8-10ms     1-2ms
(典型耗时示例)
```

### 1.6 其他配置接口

```java
// 获取/设置帧延迟（毫秒）
public static long getFrameDelay()
public static void setFrameDelay(long frameDelay)

// 从延迟中减去帧延迟时间
public static long subtractFrameDelay(long delayMillis)

// 缓冲区堆积恢复
public void onWaitForBufferRelease(long durationNanos)

// FPS 分频器（降低刷新率实验）
void setFPSDivisor(int divisor)
```

---

## 二、实际调用场景分析

### 2.1 Framework 内部如何使用

#### **场景 1：View.postOnAnimation() — 应用动画同步**

当应用调用 `View.postOnAnimation()` 时，ViewRootImpl 会将回调注册到 Choreographer。

```java
// View.java
public void postOnAnimation(Runnable action) {
    ViewRootImpl viewRoot = getViewRootImpl();
    if (viewRoot != null) {
        viewRoot.mChoreographer.postCallback(
            Choreographer.CALLBACK_ANIMATION, action, null);
    }
}

// 实际使用场景
button.postOnAnimation(() -> {
    updatePosition(10);  // 在稳定帧时间内更新位置
    button.postOnAnimation(this);  // 继续下一帧
});
```

**关键点：** 使用 `CALLBACK_ANIMATION` 确保与动画更新同步。

#### **场景 2：ViewRootImpl.scheduleTraversals() — 主循环驱动**

View Tree 的 measure/layout/draw 通过 Choreographer 驱动，确保与屏幕刷新同步。

```java
// ViewRootImpl.java 伪代码
public void scheduleTraversals() {
    if (!mTraversalScheduled) {
        mTraversalScheduled = true;
        // 注册 TRAVERSAL 回调
        mChoreographer.postCallback(
            Choreographer.CALLBACK_TRAVERSAL,
            mTraversalRunnable,
            null);
    }
}

private final Runnable mTraversalRunnable = new Runnable() {
    @Override
    public void run() {
        doTraversal();  // 执行 measure/layout/draw
    }
};
```

**触发条件：**
- 应用首次显示 Window
- 调用 `View.requestLayout()`
- 调用 `View.invalidate()`

#### **场景 3：ValueAnimator — 帧动画框架**

Android Animation Framework 依赖 Choreographer 来实现帧同步动画。

```java
// ValueAnimator.java 伪代码
public void start() {
    mAnimationHandler.addAnimationFrameCallback(this);
}

// AnimationHandler 内部
class AnimationHandler {
    private Choreographer mChoreographer = Choreographer.getInstance();
    
    void addAnimationFrameCallback(ValueAnimator animator) {
        mChoreographer.postFrameCallback(mFrameCallback);
    }
}
```

**示例：**

```java
ObjectAnimator.ofFloat(view, "translationX", 0f, 100f)
    .setDuration(300)
    .start();  // ← 内部自动使用 Choreographer
```

#### **场景 4：SurfaceFlinger VSYNC 同步**

Choreographer 接收 SurfaceFlinger 的硬件 VSYNC 信号，驱动整个帧处理。

```java
// FrameDisplayEventReceiver.java
@Override
public void onVsync(long timestampNanos, long physicalDisplayId, int frame,
                    VsyncEventData vsyncEventData) {
    // 收到 VSYNC 信号
    // 发送 MSG_DO_FRAME 消息到 Handler
    Message msg = Message.obtain(mHandler, this);
    msg.setAsynchronous(true);
    mHandler.sendMessageAtTime(msg, timestampNanos / TimeUtils.NANOS_PER_MS);
}
```

**关键点：** VSYNC 是硬件级时钟，确保帧时间与屏幕刷新精确同步。

### 2.2 应用层如何使用

#### **场景 A：自定义 OpenGL 渲染线程**

游戏或 3D 应用需要与屏幕刷新同步，但渲染在独立线程中。

```java
public class GLSurfaceView extends View {
    private Choreographer mChoreographer;
    private GLRenderThread mRenderThread;
    
    public void startRendering() {
        mChoreographer = Choreographer.getInstance();
        mChoreographer.postFrameCallback(new Choreographer.FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                // 获取稳定的帧时间
                mRenderThread.queueFrame(frameTimeNanos);
                
                // 继续监听下一帧
                mChoreographer.postFrameCallback(this);
            }
        });
    }
}

// GL 线程使用帧时间更新动画
class GLRenderThread extends Thread {
    void queueFrame(long frameTimeNanos) {
        synchronized (this) {
            mFrameTimeNanos = frameTimeNanos;
            notify();
        }
    }
}
```

**优点：** GL 线程获得与 UI 线程相同的帧时间，避免时间不对齐导致的渲染卡顿。

#### **场景 B：性能监测（Jank 检测）**

测量帧间隔，检测掉帧（Jank）。

```java
public class JankDetector {
    private Choreographer mChoreographer;
    private long mLastFrameTime = 0;
    
    public void startMonitoring() {
        mChoreographer = Choreographer.getInstance();
        mChoreographer.postFrameCallback(new Choreographer.FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                if (mLastFrameTime > 0) {
                    long deltaMs = (frameTimeNanos - mLastFrameTime) / 1_000_000;
                    
                    // 60Hz 帧间隔应为 ~16.67ms
                    if (deltaMs > 16 + 3) {  // 允许 3ms 容差
                        Log.w("Jank", "Detected jank: " + deltaMs + "ms");
                        // 上报到性能平台
                        Analytics.trackJank(deltaMs);
                    }
                }
                mLastFrameTime = frameTimeNanos;
                mChoreographer.postFrameCallback(this);
            }
        });
    }
}
```

**应用场景：** Firebase Crashlytics、性能监控 SDK

#### **场景 C：精细帧时间分析（Android 12+）**

某些高精度场景需要多个可能的帧时间线和截止时间。

```java
public class FrameTimingAnalyzer {
    public void analyzeFrameTiming() {
        Choreographer choreographer = Choreographer.getInstance();
        choreographer.postVsyncCallback(new Choreographer.VsyncCallback() {
            @Override
            public void onVsync(@NonNull Choreographer.FrameData data) {
                long frameTimeNanos = data.getFrameTimeNanos();
                Choreographer.FrameTimeline preferred = 
                    data.getPreferredFrameTimeline();
                
                Log.d("FrameTiming",
                    String.format(
                        "Frame: %d, Deadline: %d, ExpectedPresent: %d",
                        frameTimeNanos,
                        preferred.getDeadlineNanos(),
                        preferred.getExpectedPresentationTimeNanos()));
            }
        });
    }
}
```

---

## 三、Choreographer 内部工作机制

### 3.1 初始化流程（线程本地存储）

```
应用首次调用 Choreographer.getInstance()
           ↓
    [线程本地存储检查]
    sThreadInstance.get()
           ↓
    ┌─ 第一次调用？
    │
    ├─→ YES：创建新实例
    │        ├─ 检查当前线程是否有 Looper
    │        │  (无 Looper → 抛出 IllegalStateException)
    │        │
    │        ├─ 创建 Choreographer 实例
    │        │  ├─ 初始化 mLooper 引用
    │        │  ├─ 创建 FrameHandler(looper)
    │        │  │  └─ 处理 MSG_DO_FRAME、MSG_DO_SCHEDULE_VSYNC 等消息
    │        │  ├─ 如果 USE_VSYNC = true
    │        │  │  └─ 创建 FrameDisplayEventReceiver
    │        │  │     └─ 注册 Native VSYNC 监听（到 SurfaceFlinger）
    │        │  ├─ 初始化 mCallbackQueues[5]
    │        │  │  └─ INPUT / ANIMATION / INSETS_ANIMATION / TRAVERSAL / COMMIT
    │        │  ├─ 获取屏幕刷新率
    │        │  │  └─ mFrameIntervalNanos = 1e9 / refreshRate
    │        │  │     (60Hz → 16,666,666 ns; 120Hz → 8,333,333 ns)
    │        │  └─ 设置 FPSDivisor
    │        │
    │        └─ 如果是主线程 → 缓存到 mMainInstance
    │
    └─→ NO：返回已缓存的实例

返回 Choreographer
```

**关键点：** Choreographer 是线程级单例，每个 Looper 线程一个实例。

### 3.2 VSYNC 驱动的帧渲染完整流程

```
═══════════════════════════════════════════════════════════════════

[硬件 VSYNC 周期]  t=0ms        t=16.67ms      t=33.34ms      t=50ms
                   │               │              │              │
                   ▼               ▼              ▼              ▼
            ┌──────────────┐
            │ VSYNC 信号   │
            │ 来自显示子   │
            │ 系统         │
            └──────┬───────┘
                   ↓
    FrameDisplayEventReceiver.onVsync(
        timestampNanos,
        vsyncEventData)
        │
        ├─→ 检查时间戳是否在未来
        │   (图形 HAL 时钟漂移检测)
        │
        ├─→ 检查是否已有待处理的 VSYNC
        │   mHavePendingVsync
        │
        └─→ 发送 MSG_DO_FRAME 消息
            msg.sendMessageAtTime(msg, timestampNanos)
            ↓
    [Handler 消息队列排队]
    (其他更早时间戳的消息会先执行)
            ↓
    FrameHandler.handleMessage(MSG_DO_FRAME)
            ↓
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃             doFrame() 开始执行                    ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
            ↓
    [1] 缓冲区堆积检测与恢复
        updateBufferStuffingState()
        ├─ 如果检测到缓冲区堆积
        │  ├─ 执行 OFFSET：调整帧时间偏移
        │  └─ 执行 DELAY_FRAME：延迟帧处理
        └─ 如果空闲期结束 → 重置恢复状态
            ↓
    [2] 帧时间计算与调整
        ├─ 计算 Jitter = startNanos - frameTimeNanos
        │  (实际执行时间 - 预期执行时间)
        │
        ├─ 如果 Jitter >= frameInterval
        │  ├─ 跳帧检测：skipCount = Jitter / frameInterval
        │  ├─ 调整 frameTime 为最近 VSYNC 边界
        │  └─ 警告日志（如果跳帧超过阈值）
        │
        ├─ 如果 frameTime 回退（时间戳变小）
        │  ├─ 日志警告
        │  └─ 等待下一个 VSYNC
        │
        └─ 如果启用 FPSDivisor
           └─ 故意跳帧以降低渲染速率
            ↓
    [3] 记录帧元数据
        mFrameInfo.setVsync(
            intendedFrameTime,  // 原始 VSYNC 时间
            adjustedFrameTime,  // 调整后的帧时间
            vsyncId,
            deadline,
            startNanos,
            frameInterval)
            ↓
    [4] 动画时钟锁定
        AnimationUtils.lockAnimationClock(
            frameTime_ms,
            expectedPresentationTime_ns)
        ├─ 所有回调在此帧内使用相同的时间
        └─ 确保帧内动画值一致性
            ↓
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃         执行 5 个回调阶段（顺序严格）                   ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
            ↓
    [5] CALLBACK_INPUT
        mFrameInfo.markInputHandlingStart()
        doCallbacks(CALLBACK_INPUT, frameInterval)
        └─ 执行输入事件处理回调
            ↓
    [6] CALLBACK_ANIMATION
        mFrameInfo.markAnimationsStart()
        doCallbacks(CALLBACK_ANIMATION, frameInterval)
        └─ 执行动画更新、postOnAnimation() 等回调
            ↓
    [7] CALLBACK_INSETS_ANIMATION
        doCallbacks(CALLBACK_INSETS_ANIMATION, frameInterval)
        └─ 执行 IME、导航栏等 Insets 动画
            ↓
    [8] CALLBACK_TRAVERSAL
        mFrameInfo.markPerformTraversalsStart()
        doCallbacks(CALLBACK_TRAVERSAL, frameInterval)
        └─ 执行 View.measure / layout / draw
            ↓
    [9] CALLBACK_COMMIT
        doCallbacks(CALLBACK_COMMIT, frameInterval)
        ├─ 检查 Jitter >= 2 * frameInterval
        │  └─ 如果是 → 调整 frameTime 以确保单调递增
        └─ 执行帧后处理（缓冲区提交、资源清理）
            ↓
    [10] 动画时钟解锁
        AnimationUtils.unlockAnimationClock()
        └─ 为下一帧做准备
            ↓
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃      一帧处理完成，等待下一个 VSYNC 信号         ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### 3.3 回调执行细节

#### **doCallbacks(callbackType) 的内部流程**

```java
void doCallbacks(int callbackType, long frameIntervalNanos) {
    // 第1步：提取所有到期的回调
    CallbackRecord callbacks = mCallbackQueues[callbackType]
        .extractDueCallbacksLocked(now / 1e6);
    
    if (callbacks == null) {
        return;  // 没有回调要执行
    }
    
    // 第2步：CALLBACK_COMMIT 特殊处理
    // 检查是否因为严重延迟导致帧时间需要调整
    if (callbackType == CALLBACK_COMMIT) {
        long jitterNanos = now - frameTimeNanos;
        if (frameIntervalNanos > 0 && jitterNanos >= 2 * frameIntervalNanos) {
            // 延迟超过 2 个帧间隔 → 调整 frameTime
            final long lastFrameOffset = jitterNanos % frameIntervalNanos 
                    + frameIntervalNanos;
            frameTimeNanos = now - lastFrameOffset;
            mLastFrameTimeNanos = frameTimeNanos;
            // 更新帧时间线数据
            mFrameData.update(frameTimeNanos, mDisplayEventReceiver, jitterNanos);
        }
    }
    
    // 第3步：标记回调运行中（允许调用 getFrameTime()）
    mCallbacksRunning = true;
    
    // 第4步：执行所有回调
    try {
        Trace.traceBegin(TRACE_TAG_VIEW, CALLBACK_TRACE_TITLES[callbackType]);
        for (CallbackRecord c = callbacks; c != null; c = c.next) {
            if (c.token == VSYNC_CALLBACK_TOKEN) {
                ((VsyncCallback) c.action).onVsync(mFrameData);
            } else if (c.token == FRAME_CALLBACK_TOKEN) {
                ((FrameCallback) c.action).doFrame(frameTimeNanos);
            } else {
                ((Runnable) c.action).run();
            }
        }
    } finally {
        // 第5步：清理与回收
        mCallbacksRunning = false;
        do {
            final CallbackRecord next = callbacks.next;
            recycleCallbackLocked(callbacks);  // 回收到对象池
            callbacks = next;
        } while (callbacks != null);
    }
}
```

### 3.4 关键时间指标

#### **Jitter 计算与处理**

```
定义：Jitter = 实际执行时间 - 预期执行时间
            = startNanos - frameTimeNanos

示例 1：正常情况
  预期执行：0ms
  实际执行：0.5ms
  Jitter = 0.5ms < 16.67ms ✓ 无跳帧

示例 2：主线程卡顿，跳过 2 帧
  预期执行：0ms (VSYNC1)
  实际执行：33.5ms (VSYNC3 之后)
  Jitter = 33.5ms ≈ 2 * 16.67ms
  处理：
    skipCount = 33.5 / 16.67 = 2
    调整 frameTime = 33.5 - (33.5 % 16.67) = 33.34ms (最近的 VSYNC)
    mFrameInfo 记录为 2 帧跳过

示例 3：时间戳漂移（罕见）
  frameTime 看起来在回退
  处理：
    等待下一个 VSYNC，中止本帧处理
    Log: "Frame time appears to be going backwards"
```

#### **缓冲区堆积恢复（Buffer Stuffing Recovery）**

```
背景：
  应用帧生产速率 > SurfaceFlinger 消费速率
  → BufferQueue 堆积 → 新帧需等待 dequeueBuffer
  → 下一帧处理被延迟 → Jank

检测：
  onWaitForBufferRelease(durationNanos)
  if (durationNanos > mLastFrameIntervalNanos / 2) {
      mBufferStuffingState.isStuffed.set(true)
  }

恢复策略：
  ① OFFSET：向动画提供负偏移的帧时间
     offsetFrameTime = frameTime - frameInterval
     效果：动画"追赶"SurfaceFlinger，减少队列深度

  ② DELAY_FRAME：延迟帧处理
     scheduleVsyncLocked()
     效果：主动跳过本帧，减少生产速率

结束条件：
  vsyncsSinceLastCallback > totalFrameDelays
  (检测到空闲期，说明缓冲区已 drain)
  → 重置恢复状态
```

### 3.5 无 VSYNC 模式（备用）

如果硬件不支持 VSYNC 或被禁用（`USE_VSYNC = false`），Choreographer 使用 Handler 消息队列作为时钟源。

```java
// USE_VSYNC = false 时的帧调度
scheduleFrameLocked(now) {
    if (!mFrameScheduled) {
        mFrameScheduled = true;
        
        // 计算下一帧时间
        final long nextFrameTime = Math.max(
            mLastFrameTimeNanos / 1e6 + sFrameDelay,  // 帧延迟
            now);
        
        // 发送 MSG_DO_FRAME 消息到 Handler
        Message msg = mHandler.obtainMessage(MSG_DO_FRAME);
        msg.setAsynchronous(true);
        mHandler.sendMessageAtTime(msg, nextFrameTime);
    }
}

// Handler 按消息时间戳排队处理
// 默认帧延迟 = 10ms（保守估计，允许系统繁忙时做出反应）
```

---

## 四、性能优化与常见问题

### 4.1 为什么动画会 pop（突跳）？

**原因 1：未使用 frameTime，改用 System.nanoTime()**

```java
// ✗ BAD：导致帧内时间波动
long now = System.nanoTime();
animationValue += velocity * (now - lastTime) / 1e9f;
```

解决方案：
```java
// ✓ GOOD：所有回调共享同一帧时间
Choreographer.getInstance().postFrameCallback(
    new Choreographer.FrameCallback() {
        @Override
        public void doFrame(long frameTimeNanos) {
            float deltaSeconds = 
                (frameTimeNanos - lastFrameTimeNanos) / 1e9f;
            animationValue += velocity * deltaSeconds;
            lastFrameTimeNanos = frameTimeNanos;
            
            // 继续下一帧
            Choreographer.getInstance().postFrameCallback(this);
        }
    });
```

**原因 2：帧时间不连续（向后回退）**

Choreographer 自动检测并修复：
```java
if (frameTimeNanos < mLastFrameTimeNanos) {
    Log.d(TAG, "Frame time goes backward. Waiting for next vsync.");
    scheduleVsyncLocked();  // 等待下一个 VSYNC
    return;
}
```

**原因 3：跨帧的帧间隔计算错误**

```java
// ✗ BAD：硬编码 16ms（假设 60Hz）
if (elapsed > 16) skipFrame();

// ✓ GOOD：使用动态帧间隔
long frameIntervalMs = 
    Choreographer.getInstance().getFrameIntervalNanos() / 1_000_000;
if (elapsed > frameIntervalMs) skipFrame();
```

### 4.2 高刷屏幕（120Hz/144Hz）适配

```java
// 获取动态帧间隔
long frameIntervalNanos = 
    Choreographer.getInstance().getFrameIntervalNanos();

// 120Hz: 8,333,333 ns ≈ 8.33ms
// 60Hz:  16,666,666 ns ≈ 16.67ms

// 动画计算时使用动态间隔
Choreographer.getInstance().postFrameCallback(
    new Choreographer.FrameCallback() {
        private long lastFrameTime = 0;
        
        @Override
        public void doFrame(long frameTimeNanos) {
            if (lastFrameTime > 0) {
                long deltaMs = 
                    (frameTimeNanos - lastFrameTime) / 1_000_000;
                float deltaSeconds = deltaMs / 1000f;
                
                // 根据实际帧间隔计算位移
                animationValue += velocity * deltaSeconds;
            }
            lastFrameTime = frameTimeNanos;
        }
    });
```

### 4.3 Jank 监测最佳实践

```java
public class JankMonitor {
    private static final int FRAME_INTERVAL_60HZ = 16;  // ms
    private static final int JANK_THRESHOLD = FRAME_INTERVAL_60HZ + 3;  // 3ms 容差
    
    private long mLastFrameTime = 0;
    
    public void startMonitoring(Context context) {
        Choreographer choreographer = 
            Choreographer.getInstance();
        
        choreographer.postFrameCallback(
            new Choreographer.FrameCallback() {
                @Override
                public void doFrame(long frameTimeNanos) {
                    if (mLastFrameTime > 0) {
                        long deltaMs = 
                            (frameTimeNanos - mLastFrameTime) / 1_000_000;
                        
                        if (deltaMs > JANK_THRESHOLD) {
                            int skippedFrames = 
                                (int) (deltaMs / FRAME_INTERVAL_60HZ) - 1;
                            
                            // 上报 Jank
                            reportJank(skippedFrames, deltaMs);
                            
                            Log.w("JankMonitor", 
                                String.format(
                                    "Jank detected: %dms (%d frames skipped)",
                                    deltaMs, skippedFrames));
                        }
                    }
                    mLastFrameTime = frameTimeNanos;
                    
                    // 继续监测
                    Choreographer.getInstance()
                        .postFrameCallback(this);
                }
            });
    }
    
    private void reportJank(int skippedFrames, long deltaMs) {
        // 上报到分析平台（Firebase、DataDog 等）
    }
}
```

### 4.4 避免常见陷阱

| 陷阱 | 后果 | 解决方案 |
|-----|-----|--------|
| 在 CALLBACK_TRAVERSAL 做复杂计算 | measure/layout/draw 超时 → Jank | 预计算，或移到后台线程 |
| 在 CALLBACK_COMMIT 触发新的 invalidate() | 帧重新进入处理 → 掉帧 | 批量更新，避免帧内递归 |
| 使用硬编码的 16ms 帧间隔 | 高刷屏幕适配错误 | 使用 `getFrameIntervalNanos()` |
| 从回调外调用 `getFrameTime()` | IllegalStateException | 仅在回调中调用 |
| 频繁注册/移除回调 | GC 压力增加 | 复用回调对象，或使用对象池 |

### 4.5 性能分析工具与命令

#### **启用 Choreographer Debug 日志**

```bash
# 打印每帧回调信息（高产量）
adb shell setprop debug.choreographer.frames true

# 打印 Jank 检测日志（低产量）
adb shell setprop debug.choreographer.jank true

# 打印帧时间变化
adb shell setprop debug.choreographer.frametime true

# 跳帧警告阈值（默认 30）
adb shell setprop debug.choreographer.skipwarning 10
```

#### **使用 Perfetto 追踪 Choreographer**

```
关键 Trace Tags：
- Trace.TRACE_TAG_VIEW
  └─ Choreographer#doFrame（每帧的总体耗时）
  └─ INPUT / ANIMATION / TRAVERSAL / COMMIT（各阶段耗时）
  └─ "Choreographer#scheduleVsyncLocked"（VSYNC 注册）
  └─ "Buffer stuffing recovery"（缓冲区恢复）

Perfetto 可以直观展示：
1. VSYNC 信号到来的时间点
2. 每帧 doFrame() 的执行时间和耗时
3. 5 个回调阶段各自的耗时分布
4. Jank 帧的标记
5. 跳帧情况（skipCount）
```

---

## 五、深度技术细节

### 5.1 CallbackRecord 对象池

Choreographer 维护一个 `CallbackRecord` 对象池，避免频繁分配回调记录导致的 GC。

```java
private CallbackRecord mCallbackPool;  // 对象池头

private CallbackRecord obtainCallbackLocked(long dueTime, Object action, Object token) {
    // 从池中取对象，如果池空则创建新对象
    CallbackRecord callback = mCallbackPool;
    if (callback == null) {
        callback = new CallbackRecord();
    } else {
        mCallbackPool = callback.next;
        callback.next = null;
    }
    callback.dueTime = dueTime;
    callback.action = action;
    callback.token = token;
    return callback;
}

private void recycleCallbackLocked(CallbackRecord callback) {
    // 回到对象池
    callback.action = null;
    callback.token = null;
    callback.next = mCallbackPool;
    mCallbackPool = callback;
}
```

**性能影响：** 每帧可能创建数十个回调对象，对象池避免了频繁的 GC pause。

### 5.2 CallbackQueue 数据结构

使用有序链表维护待执行的回调，避免排序开销。

```java
private final class CallbackQueue {
    private CallbackRecord mHead;
    
    // 按 dueTime 有序插入（O(n) 最坏）
    public void addCallbackLocked(long dueTime, Object action, Object token) {
        CallbackRecord callback = obtainCallbackLocked(dueTime, action, token);
        CallbackRecord entry = mHead;
        
        // 链表有序遍历，找到插入位置
        if (entry == null) {
            mHead = callback;
            return;
        }
        
        if (dueTime < entry.dueTime) {
            callback.next = entry;
            mHead = callback;
            return;
        }
        
        while (entry.next != null && dueTime >= entry.next.dueTime) {
            entry = entry.next;
        }
        
        callback.next = entry.next;
        entry.next = callback;
    }
    
    // 提取所有到期回调（O(n)）
    public CallbackRecord extractDueCallbacksLocked(long now) {
        CallbackRecord callbacks = mHead;
        if (callbacks == null || callbacks.dueTime > now) {
            return null;
        }
        
        CallbackRecord last = callbacks;
        CallbackRecord next = last.next;
        while (next != null) {
            if (next.dueTime > now) {
                last.next = null;
                break;
            }
            last = next;
            next = next.next;
        }
        mHead = next;
        return callbacks;
    }
}
```

**权衡：** 
- 插入时无排序开销（不需要排序库函数）
- 提取时 O(n)，但实际很快（通常只遍历个位数的回调）

### 5.3 FrameTimeline 多屏幕支持（Android 12+）

现代 Android 支持多个可能的帧时间线（如多屏输出、不同刷新率）。

```java
public static class FrameData {
    private long mFrameTimeNanos;
    private FrameTimeline[] mFrameTimelines;      // 多条时间线
    private int mPreferredFrameTimelineIndex;     // 优选索引
    
    // 更新帧数据
    FrameTimeline update(long frameTimeNanos, 
                         DisplayEventReceiver.VsyncEventData vsyncEventData) {
        allocateFrameTimelines(vsyncEventData.frameTimelinesLength);
        mFrameTimeNanos = frameTimeNanos;
        mPreferredFrameTimelineIndex = vsyncEventData.preferredFrameTimelineIndex;
        
        // 从 VsyncEventData 填充每条时间线
        for (int i = 0; i < mFrameTimelines.length; i++) {
            mFrameTimelines[i].update(
                vsyncEventData.frameTimelines[i].vsyncId,
                vsyncEventData.frameTimelines[i].expectedPresentationTime,
                vsyncEventData.frameTimelines[i].deadline);
        }
        
        return mFrameTimelines[mPreferredFrameTimelineIndex];
    }
}
```

**用途：** 某些场景需要多个帧时间线（如不同的输出设备有不同的 deadline）。

### 5.4 线程安全性

Choreographer 使用一个 `mLock` 保护所有共享状态。

```java
private final Object mLock = new Object();

// 所有状态修改都在锁下
synchronized (mLock) {
    mCallbackQueues[callbackType].addCallbackLocked(dueTime, action, token);
    // ...
}
```

**设计考量：**
- 多线程可以从不同线程调用 `postCallback()`（线程安全）
- 但 `getFrameTime()` 等查询函数只能从 Choreographer 所属线程调用
- Choreographer 本身绑定到一个 Looper 线程，所有回调在那个线程执行

---

## 六、总结与最佳实践

### 优化清单

```
✓ 使用 frameTime 而非 System.nanoTime() 计算动画
  → 减少帧波动，避免 pop

✓ 使用 getFrameIntervalNanos() 而非硬编码 16ms
  → 自动适配高刷屏幕

✓ 避免在 CALLBACK_TRAVERSAL 中做复杂计算
  → measure/layout/draw 必须控制在 16ms 以内

✓ 避免在 CALLBACK_COMMIT 中触发新的 invalidate()
  → 可能导致帧递归与掉帧

✓ 监测帧间隔，捕捉 Jank 并上报
  → 及时发现性能回归

✓ 考虑在独立线程渲染时使用 postFrameCallback()
  → 与 UI 线程帧时间同步，避免撕裂

✓ 在 Android 12+ 使用 VsyncCallback 获取详细帧信息
  → 更精细的帧时间控制
```

### 相关资源

- **Android Framework 源码：** `android.view.Choreographer`
- **性能工具：** Perfetto (systrace 继任者)、Android Profiler、Android GPU Inspector
- **文档：** Android Developers — Rendering Performance

---

**最后修订：** 2026 年 5 月  
**源码版本：** Android Framework (AOSP)  
**关键类：** `Choreographer.java` (1714 行)
