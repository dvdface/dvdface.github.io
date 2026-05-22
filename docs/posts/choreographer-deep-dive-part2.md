# Choreographer 深度指南（第二部分）：Framework 回调链路完全解析

> 逐帧追踪 Android Framework 在 INPUT、ANIMATION、INSETS_ANIMATION、TRAVERSAL、COMMIT 五大阶段的精确调用点，从 SurfaceFlinger 同步信号到 View 树遍历的完整序列。

---

## 前言

在[第一部分](./choreographer-deep-dive.html)中，我们了解了 Choreographer 的公开接口、调用场景和内部机制。本文深入 **Framework 层面**，逐个解析 5 个回调阶段是在**哪些具体类、哪些具体方法**被调用的。

本文通过序列图 + 源码路径的形式，让你清楚看到整个帧处理链路。

---

## 一、5 大回调阶段的调用顺序与职责

```
INPUT(0)                    ← 输入事件分发
    ↓
ANIMATION(1)                ← 动画更新
    ↓
INSETS_ANIMATION(2)         ← Window Inset 动画
    ↓
TRAVERSAL(3)                ← 布局测量绘制
    ↓
COMMIT(4)                   ← 缓冲区提交
```

每个阶段都由 Framework 的不同模块驱动。

---

## 二、INPUT 阶段：事件分发的入口

### 调用触发点

| 来源 | 方法 | 作用 |
|-----|-----|-----|
| InputEventReceiver | onInputEvent() | 接收原始输入事件 |
| ViewRootImpl | scheduleProcessInputEvents() | 调度输入处理 |
| Choreographer | postCallback(CALLBACK_INPUT, ...) | 注册 INPUT 回调 |

### 序列流程

```
InputEventReceiver.onInputEvent()
  ↓
WindowInputEventReceiver (ViewRootImpl 内部类)
  ↓
ViewRootImpl.enqueueInputEvent(event)
  ↓
mChoreographer.postCallback(CALLBACK_INPUT, 
    mProcessInputRunnable, null)
  ↓
下一帧 INPUT 阶段触发 mProcessInputRunnable
  ↓
ViewRootImpl.processInputEvents()
  ↓
ViewRootImpl.deliverInputEvent(queuedEvent)
  ↓
mView.dispatchPointerEvent(event) 或 mView.dispatchTrackballEvent(event)
  ↓
View 树遍历分发
```

### 核心代码位置

```java
// frameworks/base/core/java/android/view/ViewRootImpl.java

// 1. 接收输入事件
private final class WindowInputEventReceiver extends InputEventReceiver {
    @Override
    public void onInputEvent(InputEvent event, int displayId) {
        enqueueInputEvent(event, this, 0, false);
    }
}

// 2. 入队并注册 INPUT 回调
void enqueueInputEvent(...) {
    QueuedInputEvent q = obtainQueuedInputEvent(event, receiver, flags, ...);
    
    if (mInputEventConsumer != null) {
        mInputEventConsumer.consumeInputEvent(q);
    } else {
        enqueueInputEventImpl(q);
    }
    
    scheduleProcessInputEvents();
}

// 3. 注册 INPUT 回调
void scheduleProcessInputEvents() {
    if (!mProcessInputQueued) {
        mProcessInputQueued = true;
        mChoreographer.postCallback(Choreographer.CALLBACK_INPUT,
            mProcessInputRunnable, null);
    }
}

// 4. INPUT 阶段执行
private final Runnable mProcessInputRunnable = new Runnable() {
    @Override
    public void run() {
        processInputEvents();
    }
};

void processInputEvents() {
    while (mCurrentInputEvent != null) {
        deliverInputEvent(mCurrentInputEvent);
    }
}

void deliverInputEvent(QueuedInputEvent q) {
    InputStage stage = mFirstInputStage;
    ...
    stage.deliver(q);
}
```

### 时间点估算

- **INPUT 回调时间** = 帧开始后 0-1 ms（最早执行）
- **典型耗时** = 1-3 ms（取决于触摸点、View 深度）

---

## 三、ANIMATION 阶段：动画属性更新

### 调用触发点

| 来源 | 方法 | 作用 |
|-----|-----|-----|
| ValueAnimator | doAnimationFrame() | 动画帧更新 |
| AnimationHandler | run() | 动画驱动器 |
| Choreographer | postCallback(CALLBACK_ANIMATION, ...) | 注册 ANIMATION 回调 |

### 序列流程

```
Choreographer.postCallback(CALLBACK_ANIMATION, ...)
  ↓
下一帧 ANIMATION 阶段触发
  ↓
ValueAnimator.doAnimationFrame(frameTime)
  ↓
更新动画值：fraction = (frameTime - startTime) / duration
  ↓
ObjectAnimator.animateValue(fraction)
  ↓
target.setProperty(value)
  ↓
View.setAlpha() / setTranslationX() / ... 或 PropertyValuesHolder
  ↓
View 发起 invalidate() 请求重绘
```

### 核心代码位置

```java
// frameworks/base/core/java/android/animation/ValueAnimator.java

private static class AnimationHandler extends Handler {
    private static final int ANIMATION_FRAME = 1;
    
    private void scheduleAnimation() {
        if (!mAnimationScheduled) {
            mChoreographer.postCallback(
                Choreographer.CALLBACK_ANIMATION,
                mAnimationFrameCallback,
                null);
            mAnimationScheduled = true;
        }
    }
    
    private final Choreographer.FrameCallback mAnimationFrameCallback =
        new Choreographer.FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                doAnimationFrame(frameTimeNanos);
            }
        };
}

void doAnimationFrame(long frameTimeNanos) {
    final long currentTime = SystemClock.uptimeMillis();
    
    for (int i = 0; i < mAnimations.size(); i++) {
        ValueAnimator anim = mAnimations.get(i);
        if (anim.doAnimationFrame(currentTime)) {
            mEndingAnims.add(anim);
        }
    }
}

// ValueAnimator.java
public final boolean doAnimationFrame(long currentTime) {
    if (mStartTime < 0) {
        mStartTime = currentTime;
    }
    
    final long durationMillis = getScaledDuration();
    if ((currentTime - mStartTime) >= durationMillis) {
        // 动画结束
        fraction = 1f;
        mCurrentIteration = mRepeatCount;
    } else {
        long elapsed = currentTime - mStartTime;
        fraction = elapsed / (float) durationMillis;
    }
    
    animateValue(fraction);
    return !done;
}

private void animateValue(float fraction) {
    fraction = mInterpolator.getInterpolation(fraction);
    
    for (int i = 0; i < mValues.length; i++) {
        mValues[i].calculateValue(fraction);
    }
    
    if (mUpdateListeners != null) {
        for (AnimatorUpdateListener listener : mUpdateListeners) {
            listener.onAnimationUpdate(this);
        }
    }
}
```

### 时间点估算

- **ANIMATION 回调时间** = INPUT 后 0.5-2 ms
- **典型耗时** = 0.5-2 ms（取决于动画数量和属性更新）

---

## 四、INSETS_ANIMATION 阶段：Window Inset 动画

### 调用触发点

| 来源 | 方法 | 作用 |
|-----|-----|-----|
| InsetsAnimationControllerImpl | scheduleAnimation() | Inset 动画控制器 |
| WindowInsetsAnimationControllerCompat | setProgress() | 进度更新 |
| Choreographer | postCallback(CALLBACK_INSETS_ANIMATION, ...) | 注册回调 |

### 序列流程

```
系统触发 IME 或导航栏动画
  ↓
InsetsAnimationControllerImpl.scheduleAnimation()
  ↓
mChoreographer.postCallback(CALLBACK_INSETS_ANIMATION, ...)
  ↓
下一帧 INSETS_ANIMATION 阶段触发
  ↓
InsetsAnimationControllerImpl.onAnimationFrameReceived()
  ↓
updateLayers() / updateInsets()
  ↓
ViewRootImpl.setInsetsAnimationProgress()
  ↓
View.dispatchWindowInsetsAnimationProgress(animator, fraction)
  ↓
应用可设置 padding / margin 等响应 Inset 变化
```

### 核心代码位置

```java
// frameworks/base/core/java/android/view/InsetsAnimationControllerImpl.java

class InsetsAnimationControllerImpl {
    private void scheduleAnimation() {
        if (!mAnimationScheduled) {
            mChoreographer.postCallback(
                Choreographer.CALLBACK_INSETS_ANIMATION,
                this::onAnimationFrameReceived,
                null);
            mAnimationScheduled = true;
        }
    }
    
    private void onAnimationFrameReceived(long frameTimeNanos) {
        // 计算 Inset 动画进度
        float progress = computeProgress(frameTimeNanos);
        
        updateLayers(progress);
        updateInsets(progress);
        
        if (!finished) {
            scheduleAnimation(); // 继续下一帧
        }
    }
    
    private void updateInsets(float progress) {
        mViewRootImpl.setInsetsAnimationProgress(
            mSourceInsets,
            mTargetInsets,
            progress);
    }
}

// frameworks/base/core/java/android/view/ViewRootImpl.java
void setInsetsAnimationProgress(InsetsState sourceState, 
    InsetsState targetState, float progress) {
    
    // 计算当前帧的 Insets
    InsetsState current = InsetsState.interpolate(
        sourceState, targetState, progress);
    
    mWindowAttributes.setInsetsState(current);
    
    mView.dispatchWindowInsetsAnimationProgress(
        mInsetsAnimationController, progress);
}
```

### 时间点估算

- **INSETS_ANIMATION 回调时间** = ANIMATION 后 0.5-1 ms
- **典型耗时** = 0.5-1 ms（系统级 Inset 更新）

---

## 五、TRAVERSAL 阶段：View 树遍历（最关键）

### 调用触发点

| 来源 | 方法 | 作用 |
|-----|-----|-----|
| ViewRootImpl | scheduleTraversals() | 调度遍历 |
| Choreographer | postCallback(CALLBACK_TRAVERSAL, ...) | 注册回调 |
| doTraversal() | measure / layout / draw | 三大流程 |

### 序列流程

```
View.invalidate() / requestLayout() / requestFocus()
  ↓
ViewRootImpl.scheduleTraversals()
  ↓
mChoreographer.postCallback(CALLBACK_TRAVERSAL, mTraversalRunnable, null)
  ↓
下一帧 TRAVERSAL 阶段触发 mTraversalRunnable
  ↓
ViewRootImpl.doTraversal()
  ↓
┌─ performMeasure(childWidthMeasureSpec, childHeightMeasureSpec)
│   ↓
│   View.measure() → onMeasure() (递归)
│   ↓
│   更新所有 View 尺寸
│
├─ performLayout(l, t, r, b)
│   ↓
│   View.layout() → onLayout() (递归)
│   ↓
│   更新所有 View 位置
│
└─ performDraw()
    ↓
    View.draw() (递归)
    ↓
    绘制所有 View 到 Canvas/Vulkan
    ↓
    mSurface.lockCanvas() / lockHardwareCanvas()
```

### 核心代码位置

```java
// frameworks/base/core/java/android/view/ViewRootImpl.java

// 1. 触发遍历调度
void scheduleTraversals() {
    if (!mTraversalScheduled) {
        mTraversalScheduled = true;
        mTraversalBarrier = mHandler.getLooper().getQueue()
            .postSyncBarrier();
        
        mChoreographer.postCallback(
            Choreographer.CALLBACK_TRAVERSAL,
            mTraversalRunnable,
            null);
    }
}

// 2. 遍历执行体
private final Runnable mTraversalRunnable = new Runnable() {
    @Override
    public void run() {
        doTraversal();
    }
};

void doTraversal() {
    if (mTraversalScheduled) {
        mTraversalScheduled = false;
        mHandler.getLooper().getQueue()
            .removeSyncBarrier(mTraversalBarrier);
        
        if (mProfile) {
            Debug.startMethodTracing("ViewAncestor");
        }
        
        // 测量
        performMeasure(childWidthMeasureSpec, childHeightMeasureSpec);
        
        // 布局
        performLayout(lp, mWidth, mHeight);
        
        // 绘制
        performDraw();
    }
}

// 3. 测量阶段
private void performMeasure(int childWidthMeasureSpec, int childHeightMeasureSpec) {
    Trace.traceBegin(Trace.TRACE_TAG_VIEW, "measure");
    try {
        mView.measure(childWidthMeasureSpec, childHeightMeasureSpec);
    } finally {
        Trace.traceEnd(Trace.TRACE_TAG_VIEW);
    }
}

// 4. 布局阶段
private void performLayout(ViewGroup.LayoutParams lp, int desiredWindowWidth,
        int desiredWindowHeight) {
    Trace.traceBegin(Trace.TRACE_TAG_VIEW, "layout");
    try {
        host.layout(0, 0, host.getMeasuredWidth(), host.getMeasuredHeight());
    } finally {
        Trace.traceEnd(Trace.TRACE_TAG_VIEW);
    }
}

// 5. 绘制阶段
private void performDraw() {
    Trace.traceBegin(Trace.TRACE_TAG_VIEW, "draw");
    try {
        draw(fullRedrawNeeded);
    } finally {
        Trace.traceEnd(Trace.TRACE_TAG_VIEW);
    }
}

// View.java - 测量
public final void measure(int widthMeasureSpec, int heightMeasureSpec) {
    ...
    onMeasure(widthMeasureSpec, heightMeasureSpec);
}

// View.java - 布局
public void layout(int l, int t, int r, int b) {
    ...
    onLayout(changed, l, t, r, b);
}

// ViewGroup.java - 递归布局子 View
@Override
protected void onLayout(boolean changed, int l, int t, int r, int b) {
    for (int i = 0; i < getChildCount(); i++) {
        View child = getChildAt(i);
        child.layout(childLeft, childTop, childRight, childBottom);
    }
}

// View.java - 绘制
public void draw(Canvas canvas) {
    // 1. 绘制背景
    drawBackground(canvas);
    
    // 2. 如果需要保存图层
    int saveCount = canvas.save();
    
    // 3. 绘制内容
    onDraw(canvas);
    
    // 4. 绘制子 View
    dispatchDraw(canvas);
    
    // 5. 恢复 Canvas
    canvas.restoreToCount(saveCount);
}
```

### 时间点估算

- **TRAVERSAL 回调时间** = INSETS_ANIMATION 后 0.5-1 ms
- **典型耗时** = 5-20 ms（取决于 View 树深度、布局复杂度）
  - measure: 2-8 ms
  - layout: 1-5 ms
  - draw: 2-10 ms

---

## 六、COMMIT 阶段：缓冲区提交与合成

### 调用触发点

| 来源 | 方法 | 作用 |
|-----|-----|-----|
| ViewRootImpl | performDraw() | 完成绘制后 |
| HardwareRenderer | updateRootDisplayList() | 硬件渲染 |
| Choreographer | postCallback(CALLBACK_COMMIT, ...) | 注册回调 |

### 序列流程

```
performDraw() 绘制完成
  ↓
HardwareRenderer.updateRootDisplayList()
  ↓
mChoreographer.postCallback(CALLBACK_COMMIT, mCommitRunnable, null)
  ↓
下一帧 COMMIT 阶段触发
  ↓
HardwareRenderer.flushAndWait()
  ↓
RenderThread.finishFrame()
  ↓
Buffer 提交给 SurfaceFlinger
  ↓
SurfaceFlinger.onVsync() 下一帧检查 Buffer
  ↓
Composite & Present to Display
```

### 核心代码位置

```java
// frameworks/base/core/java/android/view/ViewRootImpl.java

private void performDraw() {
    ...
    boolean canUseAsync = draw(fullRedrawNeeded);
    if (canUseAsync) {
        mAttachInfo.mThreadedRenderer.syncAndDrawFrame();
    }
}

// frameworks/base/core/java/android/view/HardwareRenderer.java

public void syncAndDrawFrame() {
    // 1. 更新 DisplayList
    updateRootDisplayList();
    
    // 2. 注册 COMMIT 回调
    scheduleCommit();
}

private void scheduleCommit() {
    mChoreographer.postCallback(
        Choreographer.CALLBACK_COMMIT,
        this::doCommit,
        null);
}

private void doCommit() {
    // 1. 等待硬件渲染完成
    mRenderThread.flushAndWait();
    
    // 2. 通知 SurfaceFlinger 缓冲区已准备
    mSurface.flushAndWait();
    
    // COMMIT 阶段完成，本帧渲染流程结束
    // 等待下一个 VSYNC 信号触发 SurfaceFlinger 合成与显示
}
```

### 时间点估算

- **COMMIT 回调时间** = TRAVERSAL 后 15-30 ms
- **典型耗时** = 1-3 ms（硬件等待与同步）

---

## 七、完整帧处理序列图

```
VSYNC Signal (T=0)
  │
  ├─→ Choreographer.scheduleFrame() 触发本帧回调
  │
  ├─────────────────────────────────────────────
  │
  ├─ INPUT 阶段 (T=0-1ms)
  │  ├─ InputEventReceiver.onInputEvent()
  │  ├─ WindowInputEventReceiver.enqueueInputEvent()
  │  ├─ ViewRootImpl.deliverInputEvent()
  │  └─ View.dispatchTouchEvent() / dispatchKeyEvent()
  │
  ├─ ANIMATION 阶段 (T=1-3ms)
  │  ├─ ValueAnimator.doAnimationFrame()
  │  ├─ ObjectAnimator.animateValue()
  │  └─ View.setAlpha() / setTranslationX() / ... 
  │     └─ View.invalidate() (请求重绘)
  │
  ├─ INSETS_ANIMATION 阶段 (T=3-4ms)
  │  ├─ InsetsAnimationControllerImpl.onAnimationFrameReceived()
  │  ├─ ViewRootImpl.setInsetsAnimationProgress()
  │  └─ View.dispatchWindowInsetsAnimationProgress()
  │
  ├─ TRAVERSAL 阶段 (T=4-24ms) ★ 最耗时
  │  ├─ ViewRootImpl.doTraversal()
  │  ├─ ┌─ performMeasure() (T=4-12ms)
  │  │  │  └─ View.measure() / onMeasure() (递归)
  │  │  │
  │  │  ├─ performLayout() (T=12-17ms)
  │  │  │  └─ View.layout() / onLayout() (递归)
  │  │  │
  │  │  └─ performDraw() (T=17-24ms)
  │  │     ├─ View.draw() / onDraw() (递归)
  │  │     ├─ Canvas 绘制或 Vulkan 命令编码
  │  │     └─ mSurface.lockCanvas() / lockHardwareCanvas()
  │  │
  │  └─ HardwareRenderer.updateRootDisplayList()
  │
  ├─ COMMIT 阶段 (T=24-27ms)
  │  ├─ HardwareRenderer.scheduleCommit()
  │  ├─ HardwareRenderer.flushAndWait()
  │  ├─ RenderThread.finishFrame()
  │  └─ Buffer 提交给 SurfaceFlinger
  │
  └─────────────────────────────────────────────
       └─ 本帧处理完成，Buffer 在队列中等待
          下一个 VSYNC 时 SurfaceFlinger 合成与显示
          
          
下一个 VSYNC Signal (T=16.67ms) @ 60Hz
  │
  └─→ SurfaceFlinger.onVsync()
     ├─ 检查各 Layer 缓冲区
     ├─ 合成多个 Layer 到 FrameBuffer
     └─ 输出到 Display (耗时 0-3ms)
```

---

## 八、各阶段常见瓶颈与优化

| 阶段 | 瓶颈 | 优化方案 |
|-----|-----|--------|
| **INPUT** | 触摸分发链太长 / 处理逻辑重 | 简化 onTouchEvent()，避免嵌套 View 深度 |
| **ANIMATION** | 动画数量过多 / PropertyAnimation + Layout 动画重叠 | 使用 RenderThread 动画（Transition），减少 Layout 触发 |
| **INSETS_ANIMATION** | Inset 变化引发全局 requestLayout() | 使用 setWindowInsetsAnimationCallback()，只响应特定 View |
| **TRAVERSAL** | View 树太深 / 频繁 invalidate() | 降低 View 树深度（< 10），避免嵌套 merge / include |
| **COMMIT** | 硬件渲染缓冲区溢出 | 减少 GPU 操作数量，使用 RenderEffect（硬件滤镜）而非 Canvas |

---

## 九、使用 Perfetto Trace 验证

### 查看各阶段耗时

```bash
# 在 Perfetto UI (ui.perfetto.dev) 中，搜索以下事件：
# 1. "measure" - 对应 performMeasure()
# 2. "layout" - 对应 performLayout()
# 3. "draw" - 对应 performDraw()
# 4. "FrameDeadlineMissed" - 掉帧标记

# 查看 Choreographer 调度情况：
# - 搜索 "Choreographer" 或 "doFrame"
# - 观察 INPUT / ANIMATION / TRAVERSAL / COMMIT 的相对时间
```

### 导出与分析

```python
# 使用 Perfetto Python API 分析各阶段耗时
from perfetto.trace_processor import TraceProcessor

tp = TraceProcessor("trace.pf")

# 查询 TRAVERSAL 阶段耗时
result = tp.query("""
  SELECT 
    name,
    dur / 1000.0 as dur_ms
  FROM slice
  WHERE name IN ('measure', 'layout', 'draw')
  ORDER BY ts
""")

for row in result:
    print(f"{row.name}: {row.dur_ms:.2f} ms")
```

---

## 十、总结

Android 帧处理的 5 大阶段对应 Framework 中的关键调用：

1. **INPUT** (0-1ms) — 输入事件分发（ViewRootImpl → View 树）
2. **ANIMATION** (1-3ms) — 动画属性更新（ValueAnimator → View setters）
3. **INSETS_ANIMATION** (3-4ms) — 系统 Inset 动画（InsetsAnimationController）
4. **TRAVERSAL** (4-24ms) — View 树遍历（measure / layout / draw）
5. **COMMIT** (24-27ms) — 缓冲区提交（HardwareRenderer → RenderThread）

**关键优化方向**：
- 减少 TRAVERSAL 阶段的耗时（View 树深度、重复测量）
- 避免 INPUT / ANIMATION 阶段频繁触发 requestLayout()
- 使用硬件加速动画（Transition API / RenderEffect）而非 PropertyAnimation
- 通过 Perfetto 精确测量瓶颈，不盲目优化

---

## 参考资源

- [Android 官方文档：App Performance Fundamentals](https://developer.android.google.cn/topic/performance)
- [Perfetto 官网](https://perfetto.dev)
- [Android 源码：Choreographer.java](https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-14.0.0_r1/core/java/android/view/Choreographer.java)
- [Android 源码：ViewRootImpl.java](https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-14.0.0_r1/core/java/android/view/ViewRootImpl.java)
