# Choreographer 中的 Trace 事件 & 函数对应清单

> 本清单列出 Android Choreographer 中所有的 Trace 事件，以及每个事件对应的函数、函数作用、调用时机、性能影响等信息。

---

## 第一层：VSYNC 驱动信号

### 1.1 onVsync() - VSYNC 信号回调

```
┌─────────────────────────────────────────────────────────┐
│ Trace 事件                                               │
├─────────────────────────────────────────────────────────┤
│ FrameDisplayEventReceiver#onVsync()                      │
│ （在 Perfetto 中显示为蓝色竖线）                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 对应函数                                                 │
├─────────────────────────────────────────────────────────┤
│ android.view.DisplayEventReceiver.onVsync()             │
│ （FrameDisplayEventReceiver 是 Choreographer 的内部类）  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 函数干什么？                                              │
├─────────────────────────────────────────────────────────┤
│ 1. 接收来自 SurfaceFlinger 的硬件 VSYNC 信号             │
│ 2. 记录信号到达的精确时间戳：timestampNanos              │
│ 3. 计算本帧的帧时间：frameTimeNanos = timestampNanos     │
│ 4. 发送 Handler 消息：Handler.sendMessage(MSG_DO_FRAME) │
│ 5. UI 线程随后处理消息，调用 Choreographer.doFrame()    │
│                                                          │
│ 伪代码：                                                  │
│ void onVsync(long timestampNanos, long physicalDisplayId)│
│ {                                                         │
│     mTimestampNanos = timestampNanos;                     │
│     // 发送消息给 UI 线程                                 │
│     mHandler.sendMessageAtTime(msg, timestampNanos);     │
│     // msg 会在 UI 线程触发 Choreographer.doFrame()      │
│ }                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 调用时机                                                  │
├─────────────────────────────────────────────────────────┤
│ • 硬件 VSYNC 信号到达时（60Hz: 每 16.67ms）             │
│ • 120Hz 屏幕：每 8.33ms                                  │
│ • 144Hz 屏幕：每 6.94ms                                  │
│ • **仅在 Mode 1 (USE_VSYNC=true) 时出现**                │
│ • Mode 2 (定时器模式) 中看不到这个事件                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 性能指标                                                  │
├─────────────────────────────────────────────────────────┤
│ • 执行耗时：微秒级（<0.01ms）                             │
│ • 间隔精度：±0.1ms（硬件提供）                            │
│ • 关键指标：精确度（60Hz 应该是 16.67ms 的倍数）         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Perfetto 中的表现                                        │
├─────────────────────────────────────────────────────────┤
│ • 外观：细细的蓝色竖线                                    │
│ • 位置：UI 线程轨迹上，整个帧处理之前                     │
│ • 间隔：精确均匀（Mode 1）或不均匀（Mode 2）             │
│ • 标签：FrameDisplayEventReceiver::onVsync()             │
│                                                          │
│ 例：                                                      │
│ ├─ [16.67ms] onVsync()                                   │
│ ├─ [33.34ms] onVsync()                                   │
│ ├─ [50.01ms] onVsync()  ← 精确间隔，Mode 1 的表现         │
│ └─ ...                                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 关键问题诊断                                              │
├─────────────────────────────────────────────────────────┤
│ Q: onVsync() 看不到？                                    │
│ A: 可能是 Mode 2 (USE_VSYNC=false)，检查系统属性         │
│    adb shell getprop debug.choreographer.vsync           │
│                                                          │
│ Q: onVsync() 间隔不均匀（15ms, 17ms）？                  │
│ A: Mode 2 定时器精度差，或硬件 VSYNC 异常               │
│                                                          │
│ Q: onVsync() 和 doFrame() 之间有延迟？                   │
│ A: UI 线程繁忙，Handler 消息在队列中等待                 │
└─────────────────────────────────────────────────────────┘
```

---

## 第二层：doFrame() - 帧处理核心函数

### 2.1 doFrame() - 本帧处理开始

```
┌─────────────────────────────────────────────────────────┐
│ Trace 事件                                               │
├─────────────────────────────────────────────────────────┤
│ Choreographer#doFrame()                                  │
│ （在 Perfetto 中显示为绿色/红色 bar）                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 对应函数                                                 │
├─────────────────────────────────────────────────────────┤
│ android.view.Choreographer.doFrame(long frameTimeNanos) │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 函数干什么？                                              │
├─────────────────────────────────────────────────────────┤
│ 1. 保存当前帧时间                                         │
│    mLastFrameTimeNanos = frameTimeNanos                  │
│                                                          │
│ 2. 依次调用 5 大回调队列（顺序不可变）：                  │
│    ├─ doCallbacks(CALLBACK_INPUT, frameTimeNanos)        │
│    ├─ doCallbacks(CALLBACK_ANIMATION, frameTimeNanos)    │
│    ├─ doCallbacks(CALLBACK_INSETS_ANIMATION, ...)        │
│    ├─ doCallbacks(CALLBACK_TRAVERSAL, frameTimeNanos)    │
│    └─ doCallbacks(CALLBACK_COMMIT, frameTimeNanos)       │
│                                                          │
│ 3. 调度下一帧（如果有待执行回调或 VSYNC 已注册）         │
│    scheduleFrame()                                       │
│                                                          │
│ 伪代码：                                                  │
│ void doFrame(long frameTimeNanos) {                      │
│     // 1. 保存帧时间                                     │
│     mLastFrameTimeNanos = frameTimeNanos;                │
│                                                          │
│     // 2. 执行 5 大回调（顺序严格）                       │
│     doCallbacks(CALLBACK_INPUT, frameTimeNanos);         │
│     doCallbacks(CALLBACK_ANIMATION, frameTimeNanos);     │
│     doCallbacks(CALLBACK_INSETS_ANIMATION, ...);         │
│     doCallbacks(CALLBACK_TRAVERSAL, frameTimeNanos);     │
│     doCallbacks(CALLBACK_COMMIT, frameTimeNanos);        │
│                                                          │
│     // 3. 如果有新的回调或 VSYNC 未注册，调度下一帧       │
│     if (mCallbackQueues need scheduling) {              │
│         scheduleFrame();                                 │
│     }                                                    │
│ }                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 调用时机                                                  │
├─────────────────────────────────────────────────────────┤
│ • 由 onVsync() 发送的 Handler 消息触发                    │
│ • 或由定时器到期触发（Mode 2）                            │
│ • 通常每 16ms 调用一次（60Hz）                           │
│ • 120Hz 屏幕每 8.33ms 调用一次                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 性能指标                                                  │
├─────────────────────────────────────────────────────────┤
│ • 耗时预算：16ms（60Hz）/ 8.33ms（120Hz）                │
│ • 关键指标：超时 = Jank（>16ms）                          │
│ • 分布：INPUT(1ms) + ANIM(3ms) + INSETS(1ms) +          │
│         TRAVERSAL(8ms) + COMMIT(2ms) = ~15ms             │
│ • 缓冲：约 1ms 的安全边界                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Perfetto 中的表现                                        │
├─────────────────────────────────────────────────────────┤
│ • 外观：                                                  │
│   ├─ 绿色 bar：正常（<16ms）                             │
│   ├─ 红色 bar：超时（>16ms），Jank 发生                  │
│   └─ 橙色 bar：接近超时（15-16ms）                       │
│                                                          │
│ • 位置：UI 线程轨迹上，onVsync() 之后                     │
│ • 宽度：帧处理耗时（越窄越好）                            │
│ • 标签：Choreographer::doFrame                           │
│                                                          │
│ 例：                                                      │
│ ├─ [████] doFrame (12ms) ✅ 正常                         │
│ ├─ [████████████] doFrame (18ms) ❌ Jank                │
│ └─ [███] doFrame (8ms) ✅ 很快                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 关键问题诊断                                              │
├─────────────────────────────────────────────────────────┤
│ Q: doFrame 是红色（Jank）？                              │
│ A: 找到红色段内部哪个阶段最长，那就是瓶颈                │
│    • TRAVERSAL 长 → View 树太复杂                        │
│    • ANIMATION 长 → 动画计算复杂                         │
│    • INPUT 长 → 输入处理需优化                           │
│                                                          │
│ Q: doFrame 耗时波动很大？                                │
│ A: 可能有动态内容（不同帧的 View 树复杂度不同）          │
│    或内存压力（GC 暂停）                                 │
│                                                          │
│ Q: doFrame 一直是绿色，为什么还是卡顿？                  │
│ A: 可能是后续的 SurfaceFlinger 处理耗时                  │
│    或缓冲区堆积导致的显示延迟                             │
└─────────────────────────────────────────────────────────┘
```

---

## 第三层：5 大回调阶段

### 3.1 INPUT 回调 - 处理输入事件

```
┌─────────────────────────────────────────────────────────┐
│ Trace 事件                                               │
├─────────────────────────────────────────────────────────┤
│ Choreographer#doFrame -> INPUT                           │
│ （嵌套在 doFrame 内）                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 对应函数                                                 │
├─────────────────────────────────────────────────────────┤
│ android.view.Choreographer.doCallbacks(               │
│     int callbackType = CALLBACK_INPUT,                  │
│     long frameTimeNanos                                 │
│ )                                                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 函数干什么？                                              │
├─────────────────────────────────────────────────────────┤
│ 1. 从 mCallbackQueues[CALLBACK_INPUT] 取出所有回调       │
│ 2. 遍历执行每一个回调：action.run()                      │
│ 3. 这些 run() 内部处理各种输入事件                        │
│    • 触摸事件（MotionEvent）                             │
│    • 按键事件（KeyEvent）                                │
│    • 焦点变化等                                          │
│                                                          │
│ 伪代码：                                                  │
│ void doCallbacks(int callbackType, long frameTimeNanos) │
│ {                                                         │
│     CallbackRecord[] callbacks =                         │
│         mCallbackQueues[callbackType].mHead;             │
│     while (callbacks != null) {                          │
│         callbacks.run(frameTimeNanos);  // 执行回调       │
│         callbacks = callbacks.next;                      │
│     }                                                    │
│ }                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 典型回调来源                                              │
├─────────────────────────────────────────────────────────┤
│ • InputManagerService（处理触摸、按键）                   │
│ • View#dispatchTouchEvent()（View 层处理）               │
│ • GestureDetector（手势识别）                            │
│ • InputEventListener                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 性能指标                                                  │
├─────────────────────────────────────────────────────────┤
│ • 典型耗时：1ms                                          │
│ • 最大预算：2-3ms（超过则可能导致输入卡顿）              │
│ • 关键指标：应该是 5 大回调中最快的                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Perfetto 中的表现                                        │
├─────────────────────────────────────────────────────────┤
│ • 外观：doFrame 内的第 1 段小 bar                        │
│ • 位置：5 大回调中最前                                    │
│ • 宽度：通常很小（约 1px）                               │
│ • 标签：Choreographer::doFrame -> INPUT                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 关键问题诊断                                              │
├─────────────────────────────────────────────────────────┤
│ Q: INPUT 段很长（>2ms）？                                │
│ A: 输入处理耗时，可能是：                                 │
│    • View#onTouchEvent() 中的复杂逻辑                    │
│    • GestureDetector 计算耗时                            │
│    • 在 INPUT 阶段做了不该做的操作                        │
│                                                          │
│ Q: 触摸操作响应卡顿？                                     │
│ A: 检查前一帧的 TRAVERSAL 是否超时                        │
│    如果前一帧 Jank，这一帧的 INPUT 会被延迟               │
└─────────────────────────────────────────────────────────┘
```

### 3.2 ANIMATION 回调 - 更新动画值

```
┌─────────────────────────────────────────────────────────┐
│ Trace 事件                                               │
├─────────────────────────────────────────────────────────┤
│ Choreographer#doFrame -> ANIMATION                       │
│ （嵌套在 doFrame 内）                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 对应函数                                                 │
├─────────────────────────────────────────────────────────┤
│ android.view.Choreographer.doCallbacks(               │
│     int callbackType = CALLBACK_ANIMATION,              │
│     long frameTimeNanos                                 │
│ )                                                        │
│                                                          │
│ 最终调用：                                                │
│ android.animation.AnimationHandler.doAnimationFrame()    │
│ android.animation.ValueAnimator.doAnimationFrame()       │
│ android.animation.ObjectAnimator.onAnimationUpdate()     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 函数干什么？                                              │
├─────────────────────────────────────────────────────────┤
│ 1. 从 mCallbackQueues[CALLBACK_ANIMATION] 取回调         │
│ 2. 执行动画回调（通常是 AnimationHandler）               │
│ 3. AnimationHandler.doAnimationFrame() 内部：            │
│    a) 遍历所有正在运行的动画                              │
│    b) 对每个动画调用 animator.doAnimationFrame()         │
│    c) 在 doAnimationFrame() 中：                         │
│       • 计算动画进度：progress = (now - startTime) / dur │
│       • 应用插值器：progress = interpolator.apply(prog)  │
│       • 调用回调：animationListener.onAnimationUpdate()  │
│       • 更新 View 属性：view.setTranslationX()等         │
│                                                          │
│ 伪代码：                                                  │
│ void doAnimationFrame(long frameTimeNanos) {             │
│     for (Animator anim : mRunningAnimators) {            │
│         long elapsedTime = frameTimeNanos - startTime;   │
│         float progress = elapsedTime / duration;         │
│         progress = interpolator.apply(progress);         │
│         anim.onAnimationUpdate(progress); // 更新值      │
│     }                                                    │
│ }                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 典型回调来源                                              │
├─────────────────────────────────────────────────────────┤
│ • ValueAnimator（属性动画框架）                           │
│ • ObjectAnimator（直接操作 View 属性）                    │
│ • View#postOnAnimation()（View 自定义动画）              │
│ • Animator（过渡动画）                                    │
│ • 用户自定义的 FrameCallback                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 性能指标                                                  │
├─────────────────────────────────────────────────────────┤
│ • 典型耗时：2-5ms（取决于动画数量和复杂度）              │
│ • 关键指标：计算进度和应用值的耗时                        │
│ • 最大预算：6-7ms（超过则影响 TRAVERSAL）                │
│ • 关键度量：每个动画的回调耗时（应该 <0.1ms）            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Perfetto 中的表现                                        │
├─────────────────────────────────────────────────────────┤
│ • 外观：doFrame 内的第 2 段 bar                          │
│ • 位置：在 INPUT 之后，TRAVERSAL 之前                     │
│ • 宽度：中等（通常 2-5px）                                │
│ • 标签：Choreographer::doFrame -> ANIMATION              │
│                                                          │
│ 如果看到 ANIMATION 段内有波动：                           │
│ ├─ 可能是因为动画计算导致的帧时间变化                     │
│ └─ 检查是否使用了 System.nanoTime() 而非 frameTime        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 关键问题诊断                                              │
├─────────────────────────────────────────────────────────┤
│ Q: ANIMATION 段很长（>5ms）？                            │
│ A: 可能原因：                                             │
│    • 运行中的动画太多                                     │
│    • 每个动画的回调都很耗时                               │
│    • 使用了复杂的插值器（计算密集）                       │
│                                                          │
│ Q: 动画不平滑、有 pop/卡顿？                              │
│ A: 最常见的原因是在动画回调中使用了 System.nanoTime()    │
│    改用：Choreographer.getInstance().getFrameTime()     │
│                                                          │
│ Q: ANIMATION 段耗时波动很大？                            │
│ A: 可能是：                                               │
│    • 某些帧的动画计算复杂（如计算路径、alpha混合）        │
│    • 或 GC 暂停导致                                      │
└─────────────────────────────────────────────────────────┘
```

### 3.3 INSETS_ANIMATION 回调 - 窗口 Insets 动画

```
┌─────────────────────────────────────────────────────────┐
│ Trace 事件                                               │
├─────────────────────────────────────────────────────────┤
│ Choreographer#doFrame -> INSETS_ANIMATION               │
│ （嵌套在 doFrame 内）                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 对应函数                                                 │
├─────────────────────────────────────────────────────────┤
│ android.view.Choreographer.doCallbacks(               │
│     int callbackType = CALLBACK_INSETS_ANIMATION,       │
│     long frameTimeNanos                                 │
│ )                                                        │
│                                                          │
│ 最终调用：                                                │
│ android.view.WindowInsetsController.onFrameUpdate()      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 函数干什么？                                              │
├─────────────────────────────────────────────────────────┤
│ 1. 更新窗口 Insets 的动画进度                            │
│ 2. Insets 典型场景：                                      │
│    • 输入法（IME）出现/消失                               │
│    • 系统导航栏出现/消失                                  │
│    • 状态栏出现/消失                                      │
│ 3. 按帧更新 Insets 的底部/顶部/左侧/右侧偏移             │
│ 4. 通知 View 树更新布局                                  │
│                                                          │
│ 伪代码：                                                  │
│ void onFrameUpdate(long frameTimeNanos) {                │
│     // 计算 Insets 动画进度                               │
│     float progress = calculateProgress(frameTimeNanos);  │
│     // 更新每个边的 Insets 值                             │
│     int bottom = startInsets + (endInsets - startInsets) │
│                  * progress;                             │
│     // 通知 View 进行 layout 更新                         │
│     dispatchWindowInsetsChangedIfNeeded(bottom);         │
│ }                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 典型回调来源                                              │
├─────────────────────────────────────────────────────────┤
│ • WindowInsetsController（系统 Insets 控制）             │
│ • InputMethodManager（输入法管理）                       │
│ • WindowInsetsAnimationController                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 性能指标                                                  │
├─────────────────────────────────────────────────────────┤
│ • 典型耗时：1ms（通常很快）                              │
│ • 最大预算：2ms                                          │
│ • 关键指标：每帧是否有 Insets 动画在进行                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Perfetto 中的表现                                        │
├─────────────────────────────────────────────────────────┤
│ • 外观：doFrame 内的第 3 段小 bar                        │
│ • 位置：在 ANIMATION 之后，TRAVERSAL 之前                 │
│ • 宽度：通常很小（约 1px，或看不到）                     │
│ • 标签：Choreographer::doFrame -> INSETS_ANIMATION       │
│                                                          │
│ 注：如果没有 Insets 动画（常见），这段 bar 可能不显示     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 关键问题诊断                                              │
├─────────────────────────────────────────────────────────┤
│ Q: 输入法弹出/消失时卡顿？                                │
│ A: 检查 INSETS_ANIMATION 后的 TRAVERSAL 是否超时         │
│    INSETS 变化会触发新的 layout，可能导致 Jank            │
│                                                          │
│ Q: 看不到 INSETS_ANIMATION 段？                          │
│ A: 正常，说明当前没有 Insets 动画在进行                   │
└─────────────────────────────────────────────────────────┘
```

### 3.4 TRAVERSAL 回调 - View 树遍历（最耗时）⭐

```
┌─────────────────────────────────────────────────────────┐
│ Trace 事件                                               │
├─────────────────────────────────────────────────────────┤
│ Choreographer#doFrame -> TRAVERSAL                       │
│ （嵌套在 doFrame 内，最长的段）                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 对应函数                                                 │
├─────────────────────────────────────────────────────────┤
│ android.view.Choreographer.doCallbacks(               │
│     int callbackType = CALLBACK_TRAVERSAL,              │
│     long frameTimeNanos                                 │
│ )                                                        │
│                                                          │
│ → ViewRootImpl.mTraversalRunnable.run()                  │
│ → ViewRootImpl.doTraversal()                             │
│   ├─ performMeasure(child.getMeasuredWidth/Height)      │
│   ├─ performLayout(l, t, r, b)                          │
│   └─ performDraw(canvas)                                │
│                                                          │
│ → View.measure(widthMeasureSpec, heightMeasureSpec)     │
│ → View.layout(left, top, right, bottom)                 │
│ → View.draw(canvas)                                     │
│                                                          │
│ → RenderNode.endAllUpdates()（提交绘制到 GPU）           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 函数干什么？                                              │
├─────────────────────────────────────────────────────────┤
│ ** 这是最复杂、最耗时的阶段 **                            │
│                                                          │
│ 1. ViewRootImpl.doTraversal()：                          │
│    ├─ 调用 performMeasure()                             │
│    ├─ 调用 performLayout()                              │
│    └─ 调用 performDraw()                                │
│                                                          │
│ 2. performMeasure()：                                   │
│    ├─ 从 DecorView（顶级 View）开始                     │
│    ├─ 递归调用每个 View.measure()                        │
│    ├─ 计算每个 View 的宽高（考虑约束和内容）             │
│    └─ 耗时：通常 2-4ms（可能更多如果布局复杂）           │
│                                                          │
│ 3. performLayout()：                                    │
│    ├─ 从 DecorView（顶级 View）开始                     │
│    ├─ 递归调用每个 View.layout()                         │
│    ├─ 根据 measure 结果放置 View 的位置                  │
│    └─ 耗时：通常 1-2ms                                  │
│                                                          │
│ 4. performDraw()：                                      │
│    ├─ 获取 Canvas（硬件加速或软件渲染）                  │
│    ├─ 递归调用每个 View.draw()                           │
│    ├─ 绘制 View（背景、内容、子 View 等）                │
│    ├─ 对于硬件加速，生成 DisplayList（RenderNode）      │
│    ├─ 提交到 GPU（skia 或 Vulkan）                      │
│    └─ 耗时：通常 4-6ms（可能更多如果有复杂绘制）         │
│                                                          │
│ 伪代码：                                                  │
│ void doTraversal() {                                    │
│     performMeasure(                                     │
│         MeasureSpec.makeMeasureSpec(width, EXACTLY)     │
│     );                                                  │
│     performLayout(                                      │
│         0, 0, width, height                             │
│     );                                                  │
│     performDraw();                                      │
│ }                                                         │
│                                                          │
│ void performMeasure(int widthMeasureSpec, ...) {        │
│     mView.measure(widthMeasureSpec, heightMeasureSpec); │
│     // mView 是 DecorView                               │
│     // 递归下去测量所有子 View                            │
│ }                                                         │
│                                                          │
│ void performLayout(int l, int t, int r, int b) {       │
│     mView.layout(l, t, r, b);                           │
│     // mView 是 DecorView                               │
│     // 递归下去放置所有子 View                            │
│ }                                                         │
│                                                          │
│ void performDraw() {                                    │
│     Surface surface = mSurface;                         │
│     Canvas canvas = surface.lockCanvas();               │
│     mView.draw(canvas);  // 递归绘制                    │
│     surface.unlockCanvasAndPost(canvas);                │
│ }                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 子事件（嵌套在 TRAVERSAL 内）                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ a) performMeasure                                       │
│    对应函数：ViewRootImpl.performMeasure()               │
│    含义：测量所有 View 的宽高                            │
│    耗时：2-4ms 典型                                     │
│    影响：布局层级深、内容复杂会增加耗时                   │
│                                                          │
│ b) performLayout                                        │
│    对应函数：ViewRootImpl.performLayout()                │
│    含义：计算所有 View 的位置坐标                        │
│    耗时：1-2ms 典型                                     │
│    影响：布局计算复杂（权重、约束等）会增加               │
│                                                          │
│ c) performDraw                                          │
│    对应函数：ViewRootImpl.performDraw()                  │
│    含义：绘制所有 View 到 Canvas                         │
│    耗时：4-6ms 典型                                     │
│    影响：绘制操作复杂（阴影、圆角、滤镜等）会增加         │
│                                                          │
│ d) measure (单个 View 级别)                             │
│    对应函数：View.onMeasure()                            │
│    含义：单个 View 计算自己的宽高                        │
│    耗时：<0.1ms（通常很快）                              │
│    深度：可能有数十次调用（树状递归）                     │
│                                                          │
│ e) layout (单个 View 级别)                              │
│    对应函数：View.onLayout()                             │
│    含义：单个 View 放置自己和子 View 的位置              │
│    耗时：<0.1ms（通常很快）                              │
│    深度：可能有数十次调用（树状递归）                     │
│                                                          │
│ f) draw (单个 View 级别)                                │
│    对应函数：View.onDraw()                               │
│    含义：单个 View 绘制自己                              │
│    耗时：0.01-1ms（取决于绘制复杂度）                    │
│    深度：可能有数十次调用（树状递归）                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 典型耗时分布（以 Activity 为例）                          │
├─────────────────────────────────────────────────────────┤
│ TRAVERSAL 总耗时：~8-10ms（在 16ms 预算中占 50-60%）    │
│   ├─ performMeasure：~30-35% (3-4ms)                    │
│   ├─ performLayout：~10-15% (1-2ms)                     │
│   └─ performDraw：~45-50% (4-6ms)                       │
│                                                          │
│ 如果布局复杂：                                            │
│   ├─ performMeasure：可能达到 6-8ms（深层级布局）        │
│   ├─ performLayout：可能达到 3-4ms（权重计算）           │
│   └─ performDraw：可能达到 8-10ms（复杂绘制）            │
│   → 总计：15-20ms（超过 16ms，Jank）                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 性能指标                                                  │
├─────────────────────────────────────────────────────────┤
│ • 典型耗时：8-10ms                                       │
│ • 最大预算：10-11ms（留空间给其他阶段）                   │
│ • 关键指标：如果 >10ms，下一帧会 Jank                     │
│ • 关键度量：                                              │
│   ├─ View 树深度（应 <10 层）                             │
│   ├─ 单帧 View 总数（应 <100）                            │
│   ├─ 绘制操作复杂度（阴影、滤镜数）                       │
│   └─ Insets 变化频率（会触发额外的 measure/layout）      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Perfetto 中的表现                                        │
├─────────────────────────────────────────────────────────┤
│ • 外观：doFrame 内最长的 bar（占 40-60% 的宽度）         │
│ • 颜色：                                                  │
│   ├─ 绿色：<10ms（正常）                                │
│   ├─ 橙色：10-12ms（接近超时）                          │
│   └─ 红色：>12ms（Jank，严重超时）                      │
│ • 位置：在 INPUT/ANIMATION/INSETS 之后，COMMIT 之前      │
│ • 标签：Choreographer::doFrame -> TRAVERSAL              │
│                                                          │
│ 子 bar：                                                  │
│   ├─ performMeasure bar（约占 30-40%）                  │
│   ├─ performLayout bar（约占 10-15%）                   │
│   └─ performDraw bar（约占 45-50%）                     │
│                                                          │
│ 例：                                                      │
│ doFrame (15ms) ❌                                        │
│   ├─ INPUT (0.5ms)                                      │
│   ├─ ANIMATION (2ms)                                    │
│   ├─ INSETS (0.2ms)                                     │
│   ├─ TRAVERSAL (11ms) ← 红色，超时                      │
│   │  ├─ performMeasure (4ms)                            │
│   │  ├─ performLayout (2ms)                             │
│   │  └─ performDraw (5ms) ← 这部分最耗时                │
│   └─ COMMIT (1.3ms)                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 关键问题诊断（优化方向）                                  │
├─────────────────────────────────────────────────────────┤
│ Q: TRAVERSAL 是红色（超时）？                            │
│ A: 深入看是哪个子阶段最长：                               │
│    • performMeasure 最长 → 布局层级太深或宽度计算复杂     │
│    • performLayout 最长 → 布局权重计算或约束求解耗时      │
│    • performDraw 最长 → 绘制操作复杂（阴影、圆角等）      │
│                                                          │
│ Q: measure 耗时很长？                                    │
│ A: 原因通常是：                                           │
│    • View 树太深（递归层数多）→ 扁平化布局                │
│    • View 数量太多（100+ Views）→ 减少 View 数量          │
│    • 动态大小计算（如 wrap_content）→ 使用固定大小         │
│    • 权重计算（LinearLayout with weights）→ 减少权重      │
│                                                          │
│ Q: layout 耗时很长？                                     │
│ A: 原因通常是：                                           │
│    • 约束求解复杂 → 使用 ConstraintLayout 的引擎优化      │
│    • Frame 嵌套太多 → 扁平化                             │
│    • 滚动视图嵌套 → 避免多层 ScrollView                   │
│                                                          │
│ Q: draw 耗时很长？                                       │
│ A: 原因通常是：                                           │
│    • 阴影（drop shadow）→ 缓存或预渲染                   │
│    • 圆角（border radius）→ 使用纹理或预裁剪              │
│    • 滤镜效果 → 性能最差，避免实时应用                    │
│    • 自定义绘制（onDraw）→ 优化绘制算法                   │
│    • 图片缩放/旋转 → 预处理到正确尺寸                     │
│                                                          │
│ Q: 打开/关闭某个 View 时 Jank？                          │
│ A: 可能是 Visibility 变化触发的 measure/layout             │
│    一次性显示/隐藏多个 View 时尤其明显                    │
│    解决：使用 setAnimationCacheEnabled() 或分帧处理       │
│                                                          │
│ Q: 列表滚动时 Jank？                                     │
│ A: 通常是 RecyclerView 中 onDraw 太复杂，或：             │
│    • 列表项布局太复杂                                     │
│    • onBindViewHolder 中做了重操作                        │
│    • 图片加载导致的 measure/layout                        │
│                                                          │
│ 优化建议：                                                 │
│ 1. 使用 Layout Inspector 查看 View 树深度                │
│ 2. 在 Perfetto 中启用 "Layout Profiling"                 │
│ 3. 使用 android:debugLayout="true" 查看过度绘制          │
│ 4. 使用 Choreographer.getInstance().getFrameIntervalNanos()│
│ 5. 定期测试：adb shell dumpsys gfxinfo                   │
└─────────────────────────────────────────────────────────┘
```

### 3.5 COMMIT 回调 - 缓冲区提交

```
┌─────────────────────────────────────────────────────────┐
│ Trace 事件                                               │
├─────────────────────────────────────────────────────────┤
│ Choreographer#doFrame -> COMMIT                          │
│ （嵌套在 doFrame 内，最后一段）                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 对应函数                                                 │
├─────────────────────────────────────────────────────────┤
│ android.view.Choreographer.doCallbacks(               │
│     int callbackType = CALLBACK_COMMIT,                 │
│     long frameTimeNanos                                 │
│ )                                                        │
│                                                          │
│ → HardwareRenderer.commit()（或 ThreadedRenderer）       │
│ → Surface.unlockCanvasAndPost()                         │
│ → BufferQueue::queueBuffer() (SurfaceFlinger 侧)         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 函数干什么？                                              │
├─────────────────────────────────────────────────────────┤
│ 1. 完成所有绘制操作                                       │
│ 2. 如果是硬件加速：                                       │
│    • 所有 RenderNode 已生成                               │
│    • 提交到 GPU 的 DisplayList                            │
│    • GPU 开始执行渲染（异步）                             │
│                                                          │
│ 3. 如果是软件渲染：                                       │
│    • Canvas 的所有绘制已完成                              │
│    • 缓冲区数据准备好                                     │
│                                                          │
│ 4. 通知 SurfaceFlinger：                                 │
│    • 缓冲区已就绪，可以合成显示                           │
│    • 传递 present time（预期显示时间）                    │
│    • SurfaceFlinger 在下一个 VSYNC 显示这个缓冲区         │
│                                                          │
│ 伪代码：                                                  │
│ void commit() {                                          │
│     if (hardwareAccelerated) {                           │
│         mRenderNode.endRecording();  // 完成 DisplayList  │
│         // GPU 异步渲染                                  │
│     }                                                    │
│     // 通知 SurfaceFlinger 缓冲区就绪                     │
│     mSurface.unlockCanvasAndPost();                      │
│     // 等待 GPU 完成（可能需要 sync）                     │
│ }                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 性能指标                                                  │
├─────────────────────────────────────────────────────────┤
│ • 典型耗时：1-2ms                                        │
│ • 最大预算：3ms                                          │
│ • 关键指标：如果超过 3ms，可能说明 GPU 繁忙              │
│ • 关键度量：GPU 帧时间（通过 GPU Profiler 查看）         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Perfetto 中的表现                                        │
├─────────────────────────────────────────────────────────┤
│ • 外观：doFrame 内的最后一段小 bar                       │
│ • 位置：在 TRAVERSAL 之后，doFrame 结束前                 │
│ • 宽度：通常很小（1-2px）                                │
│ • 标签：Choreographer::doFrame -> COMMIT                 │
│                                                          │
│ 注：COMMIT 阶段的耗时如果长，可能说明：                   │
│   • GPU 队列堆积（GPU 太忙）                              │
│   • 等待 GPU fence（前一帧 GPU 还没完成）                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 关键问题诊断                                              │
├─────────────────────────────────────────────────────────┤
│ Q: COMMIT 段很长（>2ms）？                               │
│ A: 可能原因：                                             │
│    • GPU 繁忙（上一帧还在渲染）                           │
│    • TRAVERSAL 的绘制操作太复杂                           │
│    • 缓冲区堆积（SurfaceFlinger 还没显示上一帧）          │
│                                                          │
│ Q: GPU profiler 显示 GPU 帧时间很长？                    │
│ A: 检查：                                                 │
│    • 是否有大量的纹理操作                                 │
│    • 是否频繁切换 GPU 着色器                              │
│    • 是否有阴影、滤镜等复杂效果                           │
└─────────────────────────────────────────────────────────┘
```

---

## 第四层：帧调度相关

### 4.1 scheduleVsyncLocked - 注册下一个 VSYNC

```
┌─────────────────────────────────────────────────────────┐
│ Trace 事件                                               │
├─────────────────────────────────────────────────────────┤
│ scheduleVsyncLocked                                      │
│ （Trace 事件很短，可能看不到）                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 对应函数                                                 │
├─────────────────────────────────────────────────────────┤
│ android.view.Choreographer.scheduleVsyncLocked()        │
│                                                          │
│ 调用链：                                                  │
│ → DisplayEventReceiver.scheduleVsync()                   │
│ → nativeScheduleVsync() (JNI)                            │
│ → FrameDisplayEventReceiver (native 对象)                │
│ → displayEventControl->requestNextVsync() (SurfaceFlinger)│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 函数干什么？                                              │
├─────────────────────────────────────────────────────────┤
│ 1. 检查是否已注册 VSYNC（避免重复注册）                   │
│ 2. 如果还没有注册，向 SurfaceFlinger 说：                │
│    "我想要下一个 VSYNC 信号"                             │
│ 3. SurfaceFlinger 会在下一个 VSYNC 发生时回调 onVsync()  │
│ 4. 这个调用通常是同步且快速的（JNI 调用）                │
│                                                          │
│ 伪代码：                                                  │
│ void scheduleVsyncLocked() {                             │
│     if (mVsyncScheduled) {                               │
│         return;  // 已经注册，无需重复                    │
│     }                                                    │
│     // 向 SurfaceFlinger 注册 VSYNC 信号请求              │
│     mDisplayEventReceiver.scheduleVsync();               │
│     mVsyncScheduled = true;                              │
│ }                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 调用时机                                                  │
├─────────────────────────────────────────────────────────┤
│ • doFrame() 即将结束时                                    │
│ • 如果还有待执行的回调或 VSYNC 未注册                     │
│ • Mode 1 (USE_VSYNC=true) 时                             │
│ • 典型频率：每 16ms 左右调用一次                          │
│ • Mode 2 (定时器模式) 不调用此函数                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 性能指标                                                  │
├─────────────────────────────────────────────────────────┤
│ • 执行耗时：<0.1ms（很快）                               │
│ • 关键指标：注册是否成功（通过看下一个 onVsync 是否到来） │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Perfetto 中的表现                                        │
├─────────────────────────────────────────────────────────┤
│ • 外观：很难看到（执行太快）                              │
│ • 如果看到：会在 doFrame 结束和下一个 VSYNC 之间         │
│ • 通常不是关注的重点（太快）                              │
└─────────────────────────────────────────────────────────┘
```

### 4.2 MSG_DO_SCHEDULE_CALLBACK - 延迟回调消息

```
┌─────────────────────────────────────────────────────────┐
│ Trace 事件                                               │
├─────────────────────────────────────────────────────────┤
│ MSG_DO_SCHEDULE_CALLBACK                                 │
│ （Handler 消息处理）                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 对应函数                                                 │
├─────────────────────────────────────────────────────────┤
│ android.view.Choreographer.postCallbackDelayed()        │
│                                                          │
│ 内部处理：                                                │
│ → Handler.sendMessageDelayed(MSG_DO_SCHEDULE_CALLBACK)  │
│ → Handler.handleMessage() 处理消息                       │
│ → Choreographer.scheduleFrameLocked()                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 函数干什么？                                              │
├─────────────────────────────────────────────────────────┤
│ 当调用 postCallbackDelayed(type, action, delayMs) 时：   │
│                                                          │
│ 1. 计算 dueTime = System.currentTimeMillis() + delayMs   │
│ 2. 如果 dueTime <= now（延迟已过期）：                    │
│    • 立即将回调加入队列                                   │
│    • 调用 scheduleFrameLocked()                          │
│                                                          │
│ 3. 如果 dueTime > now（还需等待）：                       │
│    • 计算延迟时间：delay = dueTime - now                 │
│    • 发送 Handler 消息：Handler.postDelayed(...)         │
│    • 经过 delay 毫秒后，消息被处理                        │
│    • MSG_DO_SCHEDULE_CALLBACK 被触发                     │
│    • 回调被加入队列，scheduleFrameLocked() 被调用         │
│                                                          │
│ 伪代码：                                                  │
│ void postCallbackDelayed(int callbackType,              │
│                          Runnable action,               │
│                          long delayMillis) {             │
│     long dueTime = System.currentTimeMillis() + delay;   │
│     if (dueTime <= SystemClock.uptimeMillis()) {         │
│         // 延迟已过期，立即加入                           │
│         addCallbackLocked(callbackType, action);         │
│         scheduleFrameLocked();                           │
│     } else {                                             │
│         // 延迟还未到，发送 Handler 消息                  │
│         Message msg = Message.obtain();                  │
│         msg.what = MSG_DO_SCHEDULE_CALLBACK;             │
│         msg.obj = new CallbackRecord(callbackType, ...); │
│         mHandler.sendMessageAtTime(msg, dueTime);        │
│     }                                                    │
│ }                                                         │
│                                                          │
│ // Handler 在 UI 线程处理消息                             │
│ void handleMessage(Message msg) {                        │
│     if (msg.what == MSG_DO_SCHEDULE_CALLBACK) {          │
│         CallbackRecord record = (CallbackRecord) msg.obj;│
│         addCallbackLocked(record.type, record.action);   │
│         scheduleFrameLocked();  // 调度下一帧             │
│     }                                                    │
│ }                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 调用时机                                                  │
├─────────────────────────────────────────────────────────┤
│ • 任何时刻调用 postCallbackDelayed() 时                   │
│ • 并且 delay > 0                                         │
│ • MSG_DO_SCHEDULE_CALLBACK 在 delay 毫秒后被处理          │
│ • 例：现在时刻 0，调用 postCallbackDelayed(..., 100ms)  │
│    → MSG_DO_SCHEDULE_CALLBACK 在时刻 100ms 被处理         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 性能指标                                                  │
├─────────────────────────────────────────────────────────┤
│ • 执行耗时：<0.1ms（处理消息本身很快）                    │
│ • 关键指标：delay 是否符合预期                            │
│ • 关键度量：从 postCallbackDelayed 到回调执行的总时间     │
│   = delay + 等待 VSYNC 的时间 (0-16ms)                  │
│   = delay + 0-16ms                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Perfetto 中的表现                                        │
├─────────────────────────────────────────────────────────┤
│ • 外观：在 Handler 轨迹中看到的消息处理事件                │
│ • 位置：如果有 100ms 的延迟，会有 100ms 的空白             │
│    然后是 MSG_DO_SCHEDULE_CALLBACK 的消息处理              │
│ • 标签：看不到明确的 "MSG_DO_SCHEDULE_CALLBACK" 标签      │
│         而是看到 Handler 处理消息                          │
│                                                          │
│ 典型场景：                                                │
│ ├─ [0ms] postCallbackDelayed(..., 500ms) 被调用          │
│ ├─ [0-500ms] UI 线程继续处理其他任务                      │
│ ├─ [500ms] MSG_DO_SCHEDULE_CALLBACK 被处理                │
│ ├─ [500-516ms] 等待下一个 VSYNC                          │
│ └─ [516ms] 回调在 VSYNC 时被执行                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 关键问题诊断                                              │
├─────────────────────────────────────────────────────────┤
│ Q: 看到长时间的空白（如 1000ms）？                        │
│ A: 这通常是 postCallbackDelayed 的 delay 在等待           │
│    检查：是否有意设置了这么长的延迟？                     │
│    如果是无意的，这可能导致性能问题                       │
│                                                          │
│ Q: MSG_DO_SCHEDULE_CALLBACK 的执行时间比预期晚？          │
│ A: 可能是 UI 线程繁忙，Handler 消息队列有其他任务          │
│    检查：当前 Handler 消息队列是否有堆积                  │
│                                                          │
│ Q: 延迟回调在错误的时刻执行？                             │
│ A: 检查计时是否正确                                       │
│    postCallbackDelayed 的 delay 参数是毫秒                │
│    确保没有单位转换错误                                   │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Buffer stuffing recovery - 缓冲区堆积恢复

```
┌─────────────────────────────────────────────────────────┐
│ Trace 事件                                               │
├─────────────────────────────────────────────────────────┤
│ 没有直接的 Trace 事件名称，但表现为：                     │
│ • 异常的 VSYNC 间隔（变大）                               │
│ • 某些帧的 doFrame 被跳过（没有执行）                     │
│ • "Buffer stuffing" 相关的 Trace 标记（Android 12+）     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 对应函数                                                 │
├─────────────────────────────────────────────────────────┤
│ android.view.Choreographer.onWaitForBufferRelease()     │
│                                                          │
│ 由 SurfaceFlinger 调用，通过 Binder 通信                  │
│ → SurfaceFlinger 检测到缓冲区堆积                         │
│ → 调用 Choreographer 的 onWaitForBufferRelease()         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 函数干什么？                                              │
├─────────────────────────────────────────────────────────┤
│ 场景：app 帧率很高（快速生成缓冲区），但 SurfaceFlinger │
│ 还没来得及显示（缓冲区队列堆积）。                        │
│                                                          │
│ 恢复机制：                                                │
│ 1. SurfaceFlinger 检测到：前几帧的缓冲区还在队列中         │
│ 2. SurfaceFlinger 调用：onWaitForBufferRelease(duration) │
│ 3. Choreographer 收到通知，执行恢复：                     │
│    • 增加帧延迟（frame delay）                            │
│    • 跳过某些 VSYNC 信号                                  │
│    • 暂停 app 的帧生成速度，给 SurfaceFlinger 赶上的机会 │
│ 4. 等待足够的时间后：                                     │
│    • 缓冲区队列被清空                                     │
│    • 恢复正常帧率                                         │
│                                                          │
│ 伪代码：                                                  │
│ void onWaitForBufferRelease(long durationNanos) {        │
│     // durationNanos 是建议的等待时间                     │
│     // 通常是 16ms 或 32ms（跳过 1 或 2 帧）              │
│                                                          │
│     // 增加帧延迟                                         │
│     mFrameDelay = (int) (durationNanos / 1_000_000);     │
│                                                          │
│     // 下一帧会被延迟 mFrameDelay 毫秒                    │
│     // 从而跳过某些 VSYNC 信号                            │
│ }                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 调用时机                                                  │
├─────────────────────────────────────────────────────────┤
│ • SurfaceFlinger 检测到缓冲区堆积时调用                   │
│ • 缓冲区队列长度 >= 2 时通常会触发                        │
│ • Android 10+ 有这个机制                                 │
│ • 生产设备上不常见（app 通常不会这么快）                  │
│ • 可能在高端手机、高帧率 app（90Hz+）上看到              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 性能指标                                                  │
├─────────────────────────────────────────────────────────┤
│ • 恢复时间：通常 16-32ms（跳过 1-2 帧）                   │
│ • 频率：正常情况下很少发生                                │
│ • 频繁发生说明：app 生成帧的速度超过显示速度              │
│ • 原因：通常是 TRAVERSAL 或 COMMIT 太快                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Perfetto 中的表现                                        │
├─────────────────────────────────────────────────────────┤
│ • 异常 1：VSYNC 间隔突然变大（如 16.67ms → 33.34ms）     │
│   说明跳过了一个 VSYNC                                    │
│                                                          │
│ • 异常 2：某一帧的 doFrame 缺失                           │
│   例：时刻 0 → 16.67 → 33.34 → 66.68（跳过 50ms 的帧）  │
│                                                          │
│ • 异常 3：帧时间的规律性缺口                              │
│   如果频繁看到，说明缓冲区经常堆积                         │
│                                                          │
│ 例（缓冲区恢复）：                                         │
│ ├─ [0ms] onVsync                                         │
│ ├─ [16.67ms] onVsync                                     │
│ ├─ [33.34ms] onVsync  ← 正常                             │
│ ├─ [50ms] SurfaceFlinger 检测缓冲区堆积                   │
│ │         onWaitForBufferRelease(16ms) 被调用             │
│ ├─ [66.68ms] onVsync  ← 被跳过（被框架延迟 16ms）        │
│ ├─ [83.35ms] onVsync  ← 恢复                             │
│ └─ ...                                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 关键问题诊断                                              │
├─────────────────────────────────────────────────────────┤
│ Q: 经常看到缓冲区堆积恢复？                               │
│ A: 说明 app 帧生成速度过快，而 SurfaceFlinger 跟不上      │
│    可能的原因：                                           │
│    • TRAVERSAL 太快（内容简单）                          │
│    • COMMIT 很快但提交太频繁                              │
│    • SurfaceFlinger 处理过载                             │
│                                                          │
│ Q: 缓冲区堆积导致的掉帧如何避免？                         │
│ A: 通常不需要做什么，这是框架的自适应机制                 │
│    但可以：                                               │
│    • 检查 SurfaceFlinger 的性能（通过 adb）              │
│    • 简化 TRAVERSAL（即使很快也要注意结构）              │
│    • 监测帧时间的一致性                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 总结表：所有 Trace 事件一览

| 序号 | Trace 事件 | 对应函数 | 典型耗时 | Perfetto 表现 | 优先级 |
|------|-----------|--------|--------|------------|-------|
| 1 | onVsync() | DisplayEventReceiver.onVsync() | <0.01ms | 蓝色竖线 | ⭐⭐⭐ |
| 2 | doFrame() | Choreographer.doFrame() | <16ms | 绿/红 bar | ⭐⭐⭐ |
| 3 | INPUT | doCallbacks(CALLBACK_INPUT) | ~1ms | doFrame 第 1 段 | ⭐ |
| 4 | ANIMATION | doCallbacks(CALLBACK_ANIMATION) | ~2-5ms | doFrame 第 2 段 | ⭐⭐ |
| 5 | INSETS_ANIMATION | doCallbacks(CALLBACK_INSETS_ANIMATION) | ~1ms | doFrame 第 3 段 | ⭐ |
| 6 | TRAVERSAL | doCallbacks(CALLBACK_TRAVERSAL) | ~8-10ms | doFrame 最长段 | ⭐⭐⭐ |
| 6.1 | performMeasure | ViewRootImpl.performMeasure() | ~3-4ms | TRAVERSAL 子事件 | ⭐⭐ |
| 6.2 | performLayout | ViewRootImpl.performLayout() | ~1-2ms | TRAVERSAL 子事件 | ⭐⭐ |
| 6.3 | performDraw | ViewRootImpl.performDraw() | ~4-6ms | TRAVERSAL 子事件 | ⭐⭐ |
| 7 | COMMIT | doCallbacks(CALLBACK_COMMIT) | ~1-2ms | doFrame 最后段 | ⭐⭐ |
| 8 | scheduleVsyncLocked | Choreographer.scheduleVsyncLocked() | <0.1ms | 难以看到 | ⭐ |
| 9 | MSG_DO_SCHEDULE_CALLBACK | Handler 消息处理 | 变量 | Handler 轨迹 | ⭐⭐ |
| 10 | Buffer stuffing recovery | onWaitForBufferRelease() | 16-32ms | VSYNC 间隔变大 | ⭐⭐ |

---

## 快速参考：问题诊断流程

```
看到 Trace 中有异常 → 按优先级检查

1️⃣ onVsync() 间隔不均匀？
   → Mode 1 vs Mode 2 问题
   → 检查系统属性

2️⃣ doFrame 是红色（>16ms）？
   → Jank 发生
   → 深入看哪个阶段红色

3️⃣ TRAVERSAL 很长？
   → 查看 performMeasure/Layout/Draw 哪个最长
   → 对症优化（View 树、绘制复杂度等）

4️⃣ ANIMATION 波动？
   → 检查是否使用了 System.nanoTime()
   → 改用 Choreographer.getFrameTime()

5️⃣ VSYNC 间隔变大？
   → 缓冲区堆积恢复机制
   → 检查是否频繁发生（频繁说明有问题）

6️⃣ 长时间空白（1000ms+）？
   → postCallbackDelayed 的 delay 在等待
   → 正常现象，不是问题
```

