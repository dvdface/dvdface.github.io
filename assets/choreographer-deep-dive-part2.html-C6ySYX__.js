import{_ as p,c as l,b as s,e as a,d as t,w as i,a as c,r as o,o as u}from"./app-Ckd5dk4A.js";const r={};function d(v,n){const e=o("RouteLink");return u(),l("div",null,[n[7]||(n[7]=s("h1",{id:"choreographer-深度指南-第二部分-framework-回调链路完全解析",tabindex:"-1"},[s("a",{class:"header-anchor",href:"#choreographer-深度指南-第二部分-framework-回调链路完全解析"},[s("span",null,"Choreographer 深度指南（第二部分）：Framework 回调链路完全解析")])],-1)),n[8]||(n[8]=s("blockquote",null,[s("p",null,"逐帧追踪 Android Framework 在 INPUT、ANIMATION、INSETS_ANIMATION、TRAVERSAL、COMMIT 五大阶段的精确调用点，从 SurfaceFlinger 同步信号到 View 树遍历的完整序列。")],-1)),n[9]||(n[9]=s("hr",null,null,-1)),n[10]||(n[10]=s("h2",{id:"前言",tabindex:"-1"},[s("a",{class:"header-anchor",href:"#前言"},[s("span",null,"前言")])],-1)),s("p",null,[n[1]||(n[1]=a("在",-1)),t(e,{to:"/posts/choreographer-deep-dive.html"},{default:i(()=>[...n[0]||(n[0]=[a("第一部分",-1)])]),_:1}),n[2]||(n[2]=a("中，我们了解了 Choreographer 的公开接口、调用场景和内部机制。本文深入 ",-1)),n[3]||(n[3]=s("strong",null,"Framework 层面",-1)),n[4]||(n[4]=a("，逐个解析 5 个回调阶段是在",-1)),n[5]||(n[5]=s("strong",null,"哪些具体类、哪些具体方法",-1)),n[6]||(n[6]=a("被调用的。",-1))]),n[11]||(n[11]=c(`<p>本文通过序列图 + 源码路径的形式，让你清楚看到整个帧处理链路。</p><hr><h2 id="一、5-大回调阶段的调用顺序与职责" tabindex="-1"><a class="header-anchor" href="#一、5-大回调阶段的调用顺序与职责"><span>一、5 大回调阶段的调用顺序与职责</span></a></h2><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">INPUT(0)                    ← 输入事件分发</span>
<span class="line">    ↓</span>
<span class="line">ANIMATION(1)                ← 动画更新</span>
<span class="line">    ↓</span>
<span class="line">INSETS_ANIMATION(2)         ← Window Inset 动画</span>
<span class="line">    ↓</span>
<span class="line">TRAVERSAL(3)                ← 布局测量绘制</span>
<span class="line">    ↓</span>
<span class="line">COMMIT(4)                   ← 缓冲区提交</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>每个阶段都由 Framework 的不同模块驱动。</p><hr><h2 id="二、input-阶段-事件分发的入口" tabindex="-1"><a class="header-anchor" href="#二、input-阶段-事件分发的入口"><span>二、INPUT 阶段：事件分发的入口</span></a></h2><h3 id="调用触发点" tabindex="-1"><a class="header-anchor" href="#调用触发点"><span>调用触发点</span></a></h3><table><thead><tr><th>来源</th><th>方法</th><th>作用</th></tr></thead><tbody><tr><td>InputEventReceiver</td><td>onInputEvent()</td><td>接收原始输入事件</td></tr><tr><td>ViewRootImpl</td><td>scheduleProcessInputEvents()</td><td>调度输入处理</td></tr><tr><td>Choreographer</td><td>postCallback(CALLBACK_INPUT, ...)</td><td>注册 INPUT 回调</td></tr></tbody></table><h3 id="序列流程" tabindex="-1"><a class="header-anchor" href="#序列流程"><span>序列流程</span></a></h3><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">InputEventReceiver.onInputEvent()</span>
<span class="line">  ↓</span>
<span class="line">WindowInputEventReceiver (ViewRootImpl 内部类)</span>
<span class="line">  ↓</span>
<span class="line">ViewRootImpl.enqueueInputEvent(event)</span>
<span class="line">  ↓</span>
<span class="line">mChoreographer.postCallback(CALLBACK_INPUT, </span>
<span class="line">    mProcessInputRunnable, null)</span>
<span class="line">  ↓</span>
<span class="line">下一帧 INPUT 阶段触发 mProcessInputRunnable</span>
<span class="line">  ↓</span>
<span class="line">ViewRootImpl.processInputEvents()</span>
<span class="line">  ↓</span>
<span class="line">ViewRootImpl.deliverInputEvent(queuedEvent)</span>
<span class="line">  ↓</span>
<span class="line">mView.dispatchPointerEvent(event) 或 mView.dispatchTrackballEvent(event)</span>
<span class="line">  ↓</span>
<span class="line">View 树遍历分发</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="核心代码位置" tabindex="-1"><a class="header-anchor" href="#核心代码位置"><span>核心代码位置</span></a></h3><div class="language-java line-numbers-mode" data-highlighter="prismjs" data-ext="java"><pre><code class="language-java"><span class="line"><span class="token comment">// frameworks/base/core/java/android/view/ViewRootImpl.java</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// 1. 接收输入事件</span></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">final</span> <span class="token keyword">class</span> <span class="token class-name">WindowInputEventReceiver</span> <span class="token keyword">extends</span> <span class="token class-name">InputEventReceiver</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token annotation punctuation">@Override</span></span>
<span class="line">    <span class="token keyword">public</span> <span class="token keyword">void</span> <span class="token function">onInputEvent</span><span class="token punctuation">(</span><span class="token class-name">InputEvent</span> event<span class="token punctuation">,</span> <span class="token keyword">int</span> displayId<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token function">enqueueInputEvent</span><span class="token punctuation">(</span>event<span class="token punctuation">,</span> <span class="token keyword">this</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// 2. 入队并注册 INPUT 回调</span></span>
<span class="line"><span class="token keyword">void</span> <span class="token function">enqueueInputEvent</span><span class="token punctuation">(</span><span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token class-name">QueuedInputEvent</span> q <span class="token operator">=</span> <span class="token function">obtainQueuedInputEvent</span><span class="token punctuation">(</span>event<span class="token punctuation">,</span> receiver<span class="token punctuation">,</span> flags<span class="token punctuation">,</span> <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">if</span> <span class="token punctuation">(</span>mInputEventConsumer <span class="token operator">!=</span> <span class="token keyword">null</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        mInputEventConsumer<span class="token punctuation">.</span><span class="token function">consumeInputEvent</span><span class="token punctuation">(</span>q<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token function">enqueueInputEventImpl</span><span class="token punctuation">(</span>q<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line">    </span>
<span class="line">    <span class="token function">scheduleProcessInputEvents</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// 3. 注册 INPUT 回调</span></span>
<span class="line"><span class="token keyword">void</span> <span class="token function">scheduleProcessInputEvents</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>mProcessInputQueued<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        mProcessInputQueued <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span></span>
<span class="line">        mChoreographer<span class="token punctuation">.</span><span class="token function">postCallback</span><span class="token punctuation">(</span><span class="token class-name">Choreographer</span><span class="token punctuation">.</span><span class="token constant">CALLBACK_INPUT</span><span class="token punctuation">,</span></span>
<span class="line">            mProcessInputRunnable<span class="token punctuation">,</span> <span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// 4. INPUT 阶段执行</span></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">final</span> <span class="token class-name">Runnable</span> mProcessInputRunnable <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Runnable</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token annotation punctuation">@Override</span></span>
<span class="line">    <span class="token keyword">public</span> <span class="token keyword">void</span> <span class="token function">run</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token function">processInputEvents</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span><span class="token punctuation">;</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">void</span> <span class="token function">processInputEvents</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">while</span> <span class="token punctuation">(</span>mCurrentInputEvent <span class="token operator">!=</span> <span class="token keyword">null</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token function">deliverInputEvent</span><span class="token punctuation">(</span>mCurrentInputEvent<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">void</span> <span class="token function">deliverInputEvent</span><span class="token punctuation">(</span><span class="token class-name">QueuedInputEvent</span> q<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token class-name">InputStage</span> stage <span class="token operator">=</span> mFirstInputStage<span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span></span>
<span class="line">    stage<span class="token punctuation">.</span><span class="token function">deliver</span><span class="token punctuation">(</span>q<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="时间点估算" tabindex="-1"><a class="header-anchor" href="#时间点估算"><span>时间点估算</span></a></h3><ul><li><strong>INPUT 回调时间</strong> = 帧开始后 0-1 ms（最早执行）</li><li><strong>典型耗时</strong> = 1-3 ms（取决于触摸点、View 深度）</li></ul><hr><h2 id="三、animation-阶段-动画属性更新" tabindex="-1"><a class="header-anchor" href="#三、animation-阶段-动画属性更新"><span>三、ANIMATION 阶段：动画属性更新</span></a></h2><h3 id="调用触发点-1" tabindex="-1"><a class="header-anchor" href="#调用触发点-1"><span>调用触发点</span></a></h3><table><thead><tr><th>来源</th><th>方法</th><th>作用</th></tr></thead><tbody><tr><td>ValueAnimator</td><td>doAnimationFrame()</td><td>动画帧更新</td></tr><tr><td>AnimationHandler</td><td>run()</td><td>动画驱动器</td></tr><tr><td>Choreographer</td><td>postCallback(CALLBACK_ANIMATION, ...)</td><td>注册 ANIMATION 回调</td></tr></tbody></table><h3 id="序列流程-1" tabindex="-1"><a class="header-anchor" href="#序列流程-1"><span>序列流程</span></a></h3><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">Choreographer.postCallback(CALLBACK_ANIMATION, ...)</span>
<span class="line">  ↓</span>
<span class="line">下一帧 ANIMATION 阶段触发</span>
<span class="line">  ↓</span>
<span class="line">ValueAnimator.doAnimationFrame(frameTime)</span>
<span class="line">  ↓</span>
<span class="line">更新动画值：fraction = (frameTime - startTime) / duration</span>
<span class="line">  ↓</span>
<span class="line">ObjectAnimator.animateValue(fraction)</span>
<span class="line">  ↓</span>
<span class="line">target.setProperty(value)</span>
<span class="line">  ↓</span>
<span class="line">View.setAlpha() / setTranslationX() / ... 或 PropertyValuesHolder</span>
<span class="line">  ↓</span>
<span class="line">View 发起 invalidate() 请求重绘</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="核心代码位置-1" tabindex="-1"><a class="header-anchor" href="#核心代码位置-1"><span>核心代码位置</span></a></h3><div class="language-java line-numbers-mode" data-highlighter="prismjs" data-ext="java"><pre><code class="language-java"><span class="line"><span class="token comment">// frameworks/base/core/java/android/animation/ValueAnimator.java</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">static</span> <span class="token keyword">class</span> <span class="token class-name">AnimationHandler</span> <span class="token keyword">extends</span> <span class="token class-name">Handler</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">private</span> <span class="token keyword">static</span> <span class="token keyword">final</span> <span class="token keyword">int</span> <span class="token constant">ANIMATION_FRAME</span> <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">scheduleAnimation</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>mAnimationScheduled<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">            mChoreographer<span class="token punctuation">.</span><span class="token function">postCallback</span><span class="token punctuation">(</span></span>
<span class="line">                <span class="token class-name">Choreographer</span><span class="token punctuation">.</span><span class="token constant">CALLBACK_ANIMATION</span><span class="token punctuation">,</span></span>
<span class="line">                mAnimationFrameCallback<span class="token punctuation">,</span></span>
<span class="line">                <span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">            mAnimationScheduled <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span></span>
<span class="line">        <span class="token punctuation">}</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">private</span> <span class="token keyword">final</span> <span class="token class-name">Choreographer<span class="token punctuation">.</span>FrameCallback</span> mAnimationFrameCallback <span class="token operator">=</span></span>
<span class="line">        <span class="token keyword">new</span> <span class="token class-name">Choreographer<span class="token punctuation">.</span>FrameCallback</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">            <span class="token annotation punctuation">@Override</span></span>
<span class="line">            <span class="token keyword">public</span> <span class="token keyword">void</span> <span class="token function">doFrame</span><span class="token punctuation">(</span><span class="token keyword">long</span> frameTimeNanos<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">                <span class="token function">doAnimationFrame</span><span class="token punctuation">(</span>frameTimeNanos<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">            <span class="token punctuation">}</span></span>
<span class="line">        <span class="token punctuation">}</span><span class="token punctuation">;</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">void</span> <span class="token function">doAnimationFrame</span><span class="token punctuation">(</span><span class="token keyword">long</span> frameTimeNanos<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">final</span> <span class="token keyword">long</span> currentTime <span class="token operator">=</span> <span class="token class-name">SystemClock</span><span class="token punctuation">.</span><span class="token function">uptimeMillis</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> mAnimations<span class="token punctuation">.</span><span class="token function">size</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token class-name">ValueAnimator</span> anim <span class="token operator">=</span> mAnimations<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span>i<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        <span class="token keyword">if</span> <span class="token punctuation">(</span>anim<span class="token punctuation">.</span><span class="token function">doAnimationFrame</span><span class="token punctuation">(</span>currentTime<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">            mEndingAnims<span class="token punctuation">.</span><span class="token function">add</span><span class="token punctuation">(</span>anim<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        <span class="token punctuation">}</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// ValueAnimator.java</span></span>
<span class="line"><span class="token keyword">public</span> <span class="token keyword">final</span> <span class="token keyword">boolean</span> <span class="token function">doAnimationFrame</span><span class="token punctuation">(</span><span class="token keyword">long</span> currentTime<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">if</span> <span class="token punctuation">(</span>mStartTime <span class="token operator">&lt;</span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        mStartTime <span class="token operator">=</span> currentTime<span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">final</span> <span class="token keyword">long</span> durationMillis <span class="token operator">=</span> <span class="token function">getScaledDuration</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token punctuation">(</span>currentTime <span class="token operator">-</span> mStartTime<span class="token punctuation">)</span> <span class="token operator">&gt;=</span> durationMillis<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token comment">// 动画结束</span></span>
<span class="line">        fraction <span class="token operator">=</span> <span class="token number">1f</span><span class="token punctuation">;</span></span>
<span class="line">        mCurrentIteration <span class="token operator">=</span> mRepeatCount<span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token keyword">long</span> elapsed <span class="token operator">=</span> currentTime <span class="token operator">-</span> mStartTime<span class="token punctuation">;</span></span>
<span class="line">        fraction <span class="token operator">=</span> elapsed <span class="token operator">/</span> <span class="token punctuation">(</span><span class="token keyword">float</span><span class="token punctuation">)</span> durationMillis<span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line">    </span>
<span class="line">    <span class="token function">animateValue</span><span class="token punctuation">(</span>fraction<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token keyword">return</span> <span class="token operator">!</span>done<span class="token punctuation">;</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">animateValue</span><span class="token punctuation">(</span><span class="token keyword">float</span> fraction<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    fraction <span class="token operator">=</span> mInterpolator<span class="token punctuation">.</span><span class="token function">getInterpolation</span><span class="token punctuation">(</span>fraction<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> mValues<span class="token punctuation">.</span>length<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        mValues<span class="token punctuation">[</span>i<span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token function">calculateValue</span><span class="token punctuation">(</span>fraction<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">if</span> <span class="token punctuation">(</span>mUpdateListeners <span class="token operator">!=</span> <span class="token keyword">null</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token class-name">AnimatorUpdateListener</span> listener <span class="token operator">:</span> mUpdateListeners<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">            listener<span class="token punctuation">.</span><span class="token function">onAnimationUpdate</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        <span class="token punctuation">}</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="时间点估算-1" tabindex="-1"><a class="header-anchor" href="#时间点估算-1"><span>时间点估算</span></a></h3><ul><li><strong>ANIMATION 回调时间</strong> = INPUT 后 0.5-2 ms</li><li><strong>典型耗时</strong> = 0.5-2 ms（取决于动画数量和属性更新）</li></ul><hr><h2 id="四、insets-animation-阶段-window-inset-动画" tabindex="-1"><a class="header-anchor" href="#四、insets-animation-阶段-window-inset-动画"><span>四、INSETS_ANIMATION 阶段：Window Inset 动画</span></a></h2><h3 id="调用触发点-2" tabindex="-1"><a class="header-anchor" href="#调用触发点-2"><span>调用触发点</span></a></h3><table><thead><tr><th>来源</th><th>方法</th><th>作用</th></tr></thead><tbody><tr><td>InsetsAnimationControllerImpl</td><td>scheduleAnimation()</td><td>Inset 动画控制器</td></tr><tr><td>WindowInsetsAnimationControllerCompat</td><td>setProgress()</td><td>进度更新</td></tr><tr><td>Choreographer</td><td>postCallback(CALLBACK_INSETS_ANIMATION, ...)</td><td>注册回调</td></tr></tbody></table><h3 id="序列流程-2" tabindex="-1"><a class="header-anchor" href="#序列流程-2"><span>序列流程</span></a></h3><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">系统触发 IME 或导航栏动画</span>
<span class="line">  ↓</span>
<span class="line">InsetsAnimationControllerImpl.scheduleAnimation()</span>
<span class="line">  ↓</span>
<span class="line">mChoreographer.postCallback(CALLBACK_INSETS_ANIMATION, ...)</span>
<span class="line">  ↓</span>
<span class="line">下一帧 INSETS_ANIMATION 阶段触发</span>
<span class="line">  ↓</span>
<span class="line">InsetsAnimationControllerImpl.onAnimationFrameReceived()</span>
<span class="line">  ↓</span>
<span class="line">updateLayers() / updateInsets()</span>
<span class="line">  ↓</span>
<span class="line">ViewRootImpl.setInsetsAnimationProgress()</span>
<span class="line">  ↓</span>
<span class="line">View.dispatchWindowInsetsAnimationProgress(animator, fraction)</span>
<span class="line">  ↓</span>
<span class="line">应用可设置 padding / margin 等响应 Inset 变化</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="核心代码位置-2" tabindex="-1"><a class="header-anchor" href="#核心代码位置-2"><span>核心代码位置</span></a></h3><div class="language-java line-numbers-mode" data-highlighter="prismjs" data-ext="java"><pre><code class="language-java"><span class="line"><span class="token comment">// frameworks/base/core/java/android/view/InsetsAnimationControllerImpl.java</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">class</span> <span class="token class-name">InsetsAnimationControllerImpl</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">scheduleAnimation</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>mAnimationScheduled<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">            mChoreographer<span class="token punctuation">.</span><span class="token function">postCallback</span><span class="token punctuation">(</span></span>
<span class="line">                <span class="token class-name">Choreographer</span><span class="token punctuation">.</span><span class="token constant">CALLBACK_INSETS_ANIMATION</span><span class="token punctuation">,</span></span>
<span class="line">                <span class="token keyword">this</span><span class="token operator">::</span><span class="token function">onAnimationFrameReceived</span><span class="token punctuation">,</span></span>
<span class="line">                <span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">            mAnimationScheduled <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span></span>
<span class="line">        <span class="token punctuation">}</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">onAnimationFrameReceived</span><span class="token punctuation">(</span><span class="token keyword">long</span> frameTimeNanos<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token comment">// 计算 Inset 动画进度</span></span>
<span class="line">        <span class="token keyword">float</span> progress <span class="token operator">=</span> <span class="token function">computeProgress</span><span class="token punctuation">(</span>frameTimeNanos<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        </span>
<span class="line">        <span class="token function">updateLayers</span><span class="token punctuation">(</span>progress<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        <span class="token function">updateInsets</span><span class="token punctuation">(</span>progress<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        </span>
<span class="line">        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>finished<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">            <span class="token function">scheduleAnimation</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 继续下一帧</span></span>
<span class="line">        <span class="token punctuation">}</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">updateInsets</span><span class="token punctuation">(</span><span class="token keyword">float</span> progress<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        mViewRootImpl<span class="token punctuation">.</span><span class="token function">setInsetsAnimationProgress</span><span class="token punctuation">(</span></span>
<span class="line">            mSourceInsets<span class="token punctuation">,</span></span>
<span class="line">            mTargetInsets<span class="token punctuation">,</span></span>
<span class="line">            progress<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// frameworks/base/core/java/android/view/ViewRootImpl.java</span></span>
<span class="line"><span class="token keyword">void</span> <span class="token function">setInsetsAnimationProgress</span><span class="token punctuation">(</span><span class="token class-name">InsetsState</span> sourceState<span class="token punctuation">,</span> </span>
<span class="line">    <span class="token class-name">InsetsState</span> targetState<span class="token punctuation">,</span> <span class="token keyword">float</span> progress<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment">// 计算当前帧的 Insets</span></span>
<span class="line">    <span class="token class-name">InsetsState</span> current <span class="token operator">=</span> <span class="token class-name">InsetsState</span><span class="token punctuation">.</span><span class="token function">interpolate</span><span class="token punctuation">(</span></span>
<span class="line">        sourceState<span class="token punctuation">,</span> targetState<span class="token punctuation">,</span> progress<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    mWindowAttributes<span class="token punctuation">.</span><span class="token function">setInsetsState</span><span class="token punctuation">(</span>current<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    mView<span class="token punctuation">.</span><span class="token function">dispatchWindowInsetsAnimationProgress</span><span class="token punctuation">(</span></span>
<span class="line">        mInsetsAnimationController<span class="token punctuation">,</span> progress<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="时间点估算-2" tabindex="-1"><a class="header-anchor" href="#时间点估算-2"><span>时间点估算</span></a></h3><ul><li><strong>INSETS_ANIMATION 回调时间</strong> = ANIMATION 后 0.5-1 ms</li><li><strong>典型耗时</strong> = 0.5-1 ms（系统级 Inset 更新）</li></ul><hr><h2 id="五、traversal-阶段-view-树遍历-最关键" tabindex="-1"><a class="header-anchor" href="#五、traversal-阶段-view-树遍历-最关键"><span>五、TRAVERSAL 阶段：View 树遍历（最关键）</span></a></h2><h3 id="调用触发点-3" tabindex="-1"><a class="header-anchor" href="#调用触发点-3"><span>调用触发点</span></a></h3><table><thead><tr><th>来源</th><th>方法</th><th>作用</th></tr></thead><tbody><tr><td>ViewRootImpl</td><td>scheduleTraversals()</td><td>调度遍历</td></tr><tr><td>Choreographer</td><td>postCallback(CALLBACK_TRAVERSAL, ...)</td><td>注册回调</td></tr><tr><td>doTraversal()</td><td>measure / layout / draw</td><td>三大流程</td></tr></tbody></table><h3 id="序列流程-3" tabindex="-1"><a class="header-anchor" href="#序列流程-3"><span>序列流程</span></a></h3><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">View.invalidate() / requestLayout() / requestFocus()</span>
<span class="line">  ↓</span>
<span class="line">ViewRootImpl.scheduleTraversals()</span>
<span class="line">  ↓</span>
<span class="line">mChoreographer.postCallback(CALLBACK_TRAVERSAL, mTraversalRunnable, null)</span>
<span class="line">  ↓</span>
<span class="line">下一帧 TRAVERSAL 阶段触发 mTraversalRunnable</span>
<span class="line">  ↓</span>
<span class="line">ViewRootImpl.doTraversal()</span>
<span class="line">  ↓</span>
<span class="line">┌─ performMeasure(childWidthMeasureSpec, childHeightMeasureSpec)</span>
<span class="line">│   ↓</span>
<span class="line">│   View.measure() → onMeasure() (递归)</span>
<span class="line">│   ↓</span>
<span class="line">│   更新所有 View 尺寸</span>
<span class="line">│</span>
<span class="line">├─ performLayout(l, t, r, b)</span>
<span class="line">│   ↓</span>
<span class="line">│   View.layout() → onLayout() (递归)</span>
<span class="line">│   ↓</span>
<span class="line">│   更新所有 View 位置</span>
<span class="line">│</span>
<span class="line">└─ performDraw()</span>
<span class="line">    ↓</span>
<span class="line">    View.draw() (递归)</span>
<span class="line">    ↓</span>
<span class="line">    绘制所有 View 到 Canvas/Vulkan</span>
<span class="line">    ↓</span>
<span class="line">    mSurface.lockCanvas() / lockHardwareCanvas()</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="核心代码位置-3" tabindex="-1"><a class="header-anchor" href="#核心代码位置-3"><span>核心代码位置</span></a></h3><div class="language-java line-numbers-mode" data-highlighter="prismjs" data-ext="java"><pre><code class="language-java"><span class="line"><span class="token comment">// frameworks/base/core/java/android/view/ViewRootImpl.java</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// 1. 触发遍历调度</span></span>
<span class="line"><span class="token keyword">void</span> <span class="token function">scheduleTraversals</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>mTraversalScheduled<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        mTraversalScheduled <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span></span>
<span class="line">        mTraversalBarrier <span class="token operator">=</span> mHandler<span class="token punctuation">.</span><span class="token function">getLooper</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">getQueue</span><span class="token punctuation">(</span><span class="token punctuation">)</span></span>
<span class="line">            <span class="token punctuation">.</span><span class="token function">postSyncBarrier</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        </span>
<span class="line">        mChoreographer<span class="token punctuation">.</span><span class="token function">postCallback</span><span class="token punctuation">(</span></span>
<span class="line">            <span class="token class-name">Choreographer</span><span class="token punctuation">.</span><span class="token constant">CALLBACK_TRAVERSAL</span><span class="token punctuation">,</span></span>
<span class="line">            mTraversalRunnable<span class="token punctuation">,</span></span>
<span class="line">            <span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// 2. 遍历执行体</span></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">final</span> <span class="token class-name">Runnable</span> mTraversalRunnable <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Runnable</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token annotation punctuation">@Override</span></span>
<span class="line">    <span class="token keyword">public</span> <span class="token keyword">void</span> <span class="token function">run</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token function">doTraversal</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span><span class="token punctuation">;</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">void</span> <span class="token function">doTraversal</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">if</span> <span class="token punctuation">(</span>mTraversalScheduled<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        mTraversalScheduled <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span></span>
<span class="line">        mHandler<span class="token punctuation">.</span><span class="token function">getLooper</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">getQueue</span><span class="token punctuation">(</span><span class="token punctuation">)</span></span>
<span class="line">            <span class="token punctuation">.</span><span class="token function">removeSyncBarrier</span><span class="token punctuation">(</span>mTraversalBarrier<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        </span>
<span class="line">        <span class="token keyword">if</span> <span class="token punctuation">(</span>mProfile<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">            <span class="token class-name">Debug</span><span class="token punctuation">.</span><span class="token function">startMethodTracing</span><span class="token punctuation">(</span><span class="token string">&quot;ViewAncestor&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        <span class="token punctuation">}</span></span>
<span class="line">        </span>
<span class="line">        <span class="token comment">// 测量</span></span>
<span class="line">        <span class="token function">performMeasure</span><span class="token punctuation">(</span>childWidthMeasureSpec<span class="token punctuation">,</span> childHeightMeasureSpec<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        </span>
<span class="line">        <span class="token comment">// 布局</span></span>
<span class="line">        <span class="token function">performLayout</span><span class="token punctuation">(</span>lp<span class="token punctuation">,</span> mWidth<span class="token punctuation">,</span> mHeight<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        </span>
<span class="line">        <span class="token comment">// 绘制</span></span>
<span class="line">        <span class="token function">performDraw</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// 3. 测量阶段</span></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">performMeasure</span><span class="token punctuation">(</span><span class="token keyword">int</span> childWidthMeasureSpec<span class="token punctuation">,</span> <span class="token keyword">int</span> childHeightMeasureSpec<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token function">traceBegin</span><span class="token punctuation">(</span><span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token constant">TRACE_TAG_VIEW</span><span class="token punctuation">,</span> <span class="token string">&quot;measure&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token keyword">try</span> <span class="token punctuation">{</span></span>
<span class="line">        mView<span class="token punctuation">.</span><span class="token function">measure</span><span class="token punctuation">(</span>childWidthMeasureSpec<span class="token punctuation">,</span> childHeightMeasureSpec<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span> <span class="token keyword">finally</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token function">traceEnd</span><span class="token punctuation">(</span><span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token constant">TRACE_TAG_VIEW</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// 4. 布局阶段</span></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">performLayout</span><span class="token punctuation">(</span><span class="token class-name">ViewGroup<span class="token punctuation">.</span>LayoutParams</span> lp<span class="token punctuation">,</span> <span class="token keyword">int</span> desiredWindowWidth<span class="token punctuation">,</span></span>
<span class="line">        <span class="token keyword">int</span> desiredWindowHeight<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token function">traceBegin</span><span class="token punctuation">(</span><span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token constant">TRACE_TAG_VIEW</span><span class="token punctuation">,</span> <span class="token string">&quot;layout&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token keyword">try</span> <span class="token punctuation">{</span></span>
<span class="line">        host<span class="token punctuation">.</span><span class="token function">layout</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">,</span> host<span class="token punctuation">.</span><span class="token function">getMeasuredWidth</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span> host<span class="token punctuation">.</span><span class="token function">getMeasuredHeight</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span> <span class="token keyword">finally</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token function">traceEnd</span><span class="token punctuation">(</span><span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token constant">TRACE_TAG_VIEW</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// 5. 绘制阶段</span></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">performDraw</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token function">traceBegin</span><span class="token punctuation">(</span><span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token constant">TRACE_TAG_VIEW</span><span class="token punctuation">,</span> <span class="token string">&quot;draw&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token keyword">try</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token function">draw</span><span class="token punctuation">(</span>fullRedrawNeeded<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span> <span class="token keyword">finally</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token function">traceEnd</span><span class="token punctuation">(</span><span class="token class-name">Trace</span><span class="token punctuation">.</span><span class="token constant">TRACE_TAG_VIEW</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// View.java - 测量</span></span>
<span class="line"><span class="token keyword">public</span> <span class="token keyword">final</span> <span class="token keyword">void</span> <span class="token function">measure</span><span class="token punctuation">(</span><span class="token keyword">int</span> widthMeasureSpec<span class="token punctuation">,</span> <span class="token keyword">int</span> heightMeasureSpec<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span></span>
<span class="line">    <span class="token function">onMeasure</span><span class="token punctuation">(</span>widthMeasureSpec<span class="token punctuation">,</span> heightMeasureSpec<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// View.java - 布局</span></span>
<span class="line"><span class="token keyword">public</span> <span class="token keyword">void</span> <span class="token function">layout</span><span class="token punctuation">(</span><span class="token keyword">int</span> l<span class="token punctuation">,</span> <span class="token keyword">int</span> t<span class="token punctuation">,</span> <span class="token keyword">int</span> r<span class="token punctuation">,</span> <span class="token keyword">int</span> b<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span></span>
<span class="line">    <span class="token function">onLayout</span><span class="token punctuation">(</span>changed<span class="token punctuation">,</span> l<span class="token punctuation">,</span> t<span class="token punctuation">,</span> r<span class="token punctuation">,</span> b<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// ViewGroup.java - 递归布局子 View</span></span>
<span class="line"><span class="token annotation punctuation">@Override</span></span>
<span class="line"><span class="token keyword">protected</span> <span class="token keyword">void</span> <span class="token function">onLayout</span><span class="token punctuation">(</span><span class="token keyword">boolean</span> changed<span class="token punctuation">,</span> <span class="token keyword">int</span> l<span class="token punctuation">,</span> <span class="token keyword">int</span> t<span class="token punctuation">,</span> <span class="token keyword">int</span> r<span class="token punctuation">,</span> <span class="token keyword">int</span> b<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token function">getChildCount</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token class-name">View</span> child <span class="token operator">=</span> <span class="token function">getChildAt</span><span class="token punctuation">(</span>i<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">        child<span class="token punctuation">.</span><span class="token function">layout</span><span class="token punctuation">(</span>childLeft<span class="token punctuation">,</span> childTop<span class="token punctuation">,</span> childRight<span class="token punctuation">,</span> childBottom<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// View.java - 绘制</span></span>
<span class="line"><span class="token keyword">public</span> <span class="token keyword">void</span> <span class="token function">draw</span><span class="token punctuation">(</span><span class="token class-name">Canvas</span> canvas<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token comment">// 1. 绘制背景</span></span>
<span class="line">    <span class="token function">drawBackground</span><span class="token punctuation">(</span>canvas<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment">// 2. 如果需要保存图层</span></span>
<span class="line">    <span class="token keyword">int</span> saveCount <span class="token operator">=</span> canvas<span class="token punctuation">.</span><span class="token function">save</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment">// 3. 绘制内容</span></span>
<span class="line">    <span class="token function">onDraw</span><span class="token punctuation">(</span>canvas<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment">// 4. 绘制子 View</span></span>
<span class="line">    <span class="token function">dispatchDraw</span><span class="token punctuation">(</span>canvas<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment">// 5. 恢复 Canvas</span></span>
<span class="line">    canvas<span class="token punctuation">.</span><span class="token function">restoreToCount</span><span class="token punctuation">(</span>saveCount<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="时间点估算-3" tabindex="-1"><a class="header-anchor" href="#时间点估算-3"><span>时间点估算</span></a></h3><ul><li><strong>TRAVERSAL 回调时间</strong> = INSETS_ANIMATION 后 0.5-1 ms</li><li><strong>典型耗时</strong> = 5-20 ms（取决于 View 树深度、布局复杂度） <ul><li>measure: 2-8 ms</li><li>layout: 1-5 ms</li><li>draw: 2-10 ms</li></ul></li></ul><hr><h2 id="六、commit-阶段-缓冲区提交与合成" tabindex="-1"><a class="header-anchor" href="#六、commit-阶段-缓冲区提交与合成"><span>六、COMMIT 阶段：缓冲区提交与合成</span></a></h2><h3 id="调用触发点-4" tabindex="-1"><a class="header-anchor" href="#调用触发点-4"><span>调用触发点</span></a></h3><table><thead><tr><th>来源</th><th>方法</th><th>作用</th></tr></thead><tbody><tr><td>ViewRootImpl</td><td>performDraw()</td><td>完成绘制后</td></tr><tr><td>HardwareRenderer</td><td>updateRootDisplayList()</td><td>硬件渲染</td></tr><tr><td>Choreographer</td><td>postCallback(CALLBACK_COMMIT, ...)</td><td>注册回调</td></tr></tbody></table><h3 id="序列流程-4" tabindex="-1"><a class="header-anchor" href="#序列流程-4"><span>序列流程</span></a></h3><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">performDraw() 绘制完成</span>
<span class="line">  ↓</span>
<span class="line">HardwareRenderer.updateRootDisplayList()</span>
<span class="line">  ↓</span>
<span class="line">mChoreographer.postCallback(CALLBACK_COMMIT, mCommitRunnable, null)</span>
<span class="line">  ↓</span>
<span class="line">下一帧 COMMIT 阶段触发</span>
<span class="line">  ↓</span>
<span class="line">HardwareRenderer.flushAndWait()</span>
<span class="line">  ↓</span>
<span class="line">RenderThread.finishFrame()</span>
<span class="line">  ↓</span>
<span class="line">Buffer 提交给 SurfaceFlinger</span>
<span class="line">  ↓</span>
<span class="line">SurfaceFlinger.onVsync() 下一帧检查 Buffer</span>
<span class="line">  ↓</span>
<span class="line">Composite &amp; Present to Display</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="核心代码位置-4" tabindex="-1"><a class="header-anchor" href="#核心代码位置-4"><span>核心代码位置</span></a></h3><div class="language-java line-numbers-mode" data-highlighter="prismjs" data-ext="java"><pre><code class="language-java"><span class="line"><span class="token comment">// frameworks/base/core/java/android/view/ViewRootImpl.java</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">performDraw</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span></span>
<span class="line">    <span class="token keyword">boolean</span> canUseAsync <span class="token operator">=</span> <span class="token function">draw</span><span class="token punctuation">(</span>fullRedrawNeeded<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token keyword">if</span> <span class="token punctuation">(</span>canUseAsync<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        mAttachInfo<span class="token punctuation">.</span>mThreadedRenderer<span class="token punctuation">.</span><span class="token function">syncAndDrawFrame</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// frameworks/base/core/java/android/view/HardwareRenderer.java</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">public</span> <span class="token keyword">void</span> <span class="token function">syncAndDrawFrame</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token comment">// 1. 更新 DisplayList</span></span>
<span class="line">    <span class="token function">updateRootDisplayList</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment">// 2. 注册 COMMIT 回调</span></span>
<span class="line">    <span class="token function">scheduleCommit</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">scheduleCommit</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    mChoreographer<span class="token punctuation">.</span><span class="token function">postCallback</span><span class="token punctuation">(</span></span>
<span class="line">        <span class="token class-name">Choreographer</span><span class="token punctuation">.</span><span class="token constant">CALLBACK_COMMIT</span><span class="token punctuation">,</span></span>
<span class="line">        <span class="token keyword">this</span><span class="token operator">::</span><span class="token function">doCommit</span><span class="token punctuation">,</span></span>
<span class="line">        <span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">private</span> <span class="token keyword">void</span> <span class="token function">doCommit</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token comment">// 1. 等待硬件渲染完成</span></span>
<span class="line">    mRenderThread<span class="token punctuation">.</span><span class="token function">flushAndWait</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment">// 2. 通知 SurfaceFlinger 缓冲区已准备</span></span>
<span class="line">    mSurface<span class="token punctuation">.</span><span class="token function">flushAndWait</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment">// COMMIT 阶段完成，本帧渲染流程结束</span></span>
<span class="line">    <span class="token comment">// 等待下一个 VSYNC 信号触发 SurfaceFlinger 合成与显示</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="时间点估算-4" tabindex="-1"><a class="header-anchor" href="#时间点估算-4"><span>时间点估算</span></a></h3><ul><li><strong>COMMIT 回调时间</strong> = TRAVERSAL 后 15-30 ms</li><li><strong>典型耗时</strong> = 1-3 ms（硬件等待与同步）</li></ul><hr><h2 id="七、完整帧处理序列图" tabindex="-1"><a class="header-anchor" href="#七、完整帧处理序列图"><span>七、完整帧处理序列图</span></a></h2><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">VSYNC Signal (T=0)</span>
<span class="line">  │</span>
<span class="line">  ├─→ Choreographer.scheduleFrame() 触发本帧回调</span>
<span class="line">  │</span>
<span class="line">  ├─────────────────────────────────────────────</span>
<span class="line">  │</span>
<span class="line">  ├─ INPUT 阶段 (T=0-1ms)</span>
<span class="line">  │  ├─ InputEventReceiver.onInputEvent()</span>
<span class="line">  │  ├─ WindowInputEventReceiver.enqueueInputEvent()</span>
<span class="line">  │  ├─ ViewRootImpl.deliverInputEvent()</span>
<span class="line">  │  └─ View.dispatchTouchEvent() / dispatchKeyEvent()</span>
<span class="line">  │</span>
<span class="line">  ├─ ANIMATION 阶段 (T=1-3ms)</span>
<span class="line">  │  ├─ ValueAnimator.doAnimationFrame()</span>
<span class="line">  │  ├─ ObjectAnimator.animateValue()</span>
<span class="line">  │  └─ View.setAlpha() / setTranslationX() / ... </span>
<span class="line">  │     └─ View.invalidate() (请求重绘)</span>
<span class="line">  │</span>
<span class="line">  ├─ INSETS_ANIMATION 阶段 (T=3-4ms)</span>
<span class="line">  │  ├─ InsetsAnimationControllerImpl.onAnimationFrameReceived()</span>
<span class="line">  │  ├─ ViewRootImpl.setInsetsAnimationProgress()</span>
<span class="line">  │  └─ View.dispatchWindowInsetsAnimationProgress()</span>
<span class="line">  │</span>
<span class="line">  ├─ TRAVERSAL 阶段 (T=4-24ms) ★ 最耗时</span>
<span class="line">  │  ├─ ViewRootImpl.doTraversal()</span>
<span class="line">  │  ├─ ┌─ performMeasure() (T=4-12ms)</span>
<span class="line">  │  │  │  └─ View.measure() / onMeasure() (递归)</span>
<span class="line">  │  │  │</span>
<span class="line">  │  │  ├─ performLayout() (T=12-17ms)</span>
<span class="line">  │  │  │  └─ View.layout() / onLayout() (递归)</span>
<span class="line">  │  │  │</span>
<span class="line">  │  │  └─ performDraw() (T=17-24ms)</span>
<span class="line">  │  │     ├─ View.draw() / onDraw() (递归)</span>
<span class="line">  │  │     ├─ Canvas 绘制或 Vulkan 命令编码</span>
<span class="line">  │  │     └─ mSurface.lockCanvas() / lockHardwareCanvas()</span>
<span class="line">  │  │</span>
<span class="line">  │  └─ HardwareRenderer.updateRootDisplayList()</span>
<span class="line">  │</span>
<span class="line">  ├─ COMMIT 阶段 (T=24-27ms)</span>
<span class="line">  │  ├─ HardwareRenderer.scheduleCommit()</span>
<span class="line">  │  ├─ HardwareRenderer.flushAndWait()</span>
<span class="line">  │  ├─ RenderThread.finishFrame()</span>
<span class="line">  │  └─ Buffer 提交给 SurfaceFlinger</span>
<span class="line">  │</span>
<span class="line">  └─────────────────────────────────────────────</span>
<span class="line">       └─ 本帧处理完成，Buffer 在队列中等待</span>
<span class="line">          下一个 VSYNC 时 SurfaceFlinger 合成与显示</span>
<span class="line">          </span>
<span class="line">          </span>
<span class="line">下一个 VSYNC Signal (T=16.67ms) @ 60Hz</span>
<span class="line">  │</span>
<span class="line">  └─→ SurfaceFlinger.onVsync()</span>
<span class="line">     ├─ 检查各 Layer 缓冲区</span>
<span class="line">     ├─ 合成多个 Layer 到 FrameBuffer</span>
<span class="line">     └─ 输出到 Display (耗时 0-3ms)</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="八、各阶段常见瓶颈与优化" tabindex="-1"><a class="header-anchor" href="#八、各阶段常见瓶颈与优化"><span>八、各阶段常见瓶颈与优化</span></a></h2><table><thead><tr><th>阶段</th><th>瓶颈</th><th>优化方案</th></tr></thead><tbody><tr><td><strong>INPUT</strong></td><td>触摸分发链太长 / 处理逻辑重</td><td>简化 onTouchEvent()，避免嵌套 View 深度</td></tr><tr><td><strong>ANIMATION</strong></td><td>动画数量过多 / PropertyAnimation + Layout 动画重叠</td><td>使用 RenderThread 动画（Transition），减少 Layout 触发</td></tr><tr><td><strong>INSETS_ANIMATION</strong></td><td>Inset 变化引发全局 requestLayout()</td><td>使用 setWindowInsetsAnimationCallback()，只响应特定 View</td></tr><tr><td><strong>TRAVERSAL</strong></td><td>View 树太深 / 频繁 invalidate()</td><td>降低 View 树深度（&lt; 10），避免嵌套 merge / include</td></tr><tr><td><strong>COMMIT</strong></td><td>硬件渲染缓冲区溢出</td><td>减少 GPU 操作数量，使用 RenderEffect（硬件滤镜）而非 Canvas</td></tr></tbody></table><hr><h2 id="九、使用-perfetto-trace-验证" tabindex="-1"><a class="header-anchor" href="#九、使用-perfetto-trace-验证"><span>九、使用 Perfetto Trace 验证</span></a></h2><h3 id="查看各阶段耗时" tabindex="-1"><a class="header-anchor" href="#查看各阶段耗时"><span>查看各阶段耗时</span></a></h3><div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh"><pre><code class="language-bash"><span class="line"><span class="token comment"># 在 Perfetto UI (ui.perfetto.dev) 中，搜索以下事件：</span></span>
<span class="line"><span class="token comment"># 1. &quot;measure&quot; - 对应 performMeasure()</span></span>
<span class="line"><span class="token comment"># 2. &quot;layout&quot; - 对应 performLayout()</span></span>
<span class="line"><span class="token comment"># 3. &quot;draw&quot; - 对应 performDraw()</span></span>
<span class="line"><span class="token comment"># 4. &quot;FrameDeadlineMissed&quot; - 掉帧标记</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 查看 Choreographer 调度情况：</span></span>
<span class="line"><span class="token comment"># - 搜索 &quot;Choreographer&quot; 或 &quot;doFrame&quot;</span></span>
<span class="line"><span class="token comment"># - 观察 INPUT / ANIMATION / TRAVERSAL / COMMIT 的相对时间</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="导出与分析" tabindex="-1"><a class="header-anchor" href="#导出与分析"><span>导出与分析</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token comment"># 使用 Perfetto Python API 分析各阶段耗时</span></span>
<span class="line"><span class="token keyword">from</span> perfetto<span class="token punctuation">.</span>trace_processor <span class="token keyword">import</span> TraceProcessor</span>
<span class="line"></span>
<span class="line">tp <span class="token operator">=</span> TraceProcessor<span class="token punctuation">(</span><span class="token string">&quot;trace.pf&quot;</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 查询 TRAVERSAL 阶段耗时</span></span>
<span class="line">result <span class="token operator">=</span> tp<span class="token punctuation">.</span>query<span class="token punctuation">(</span><span class="token triple-quoted-string string">&quot;&quot;&quot;</span>
<span class="line">  SELECT </span>
<span class="line">    name,</span>
<span class="line">    dur / 1000.0 as dur_ms</span>
<span class="line">  FROM slice</span>
<span class="line">  WHERE name IN (&#39;measure&#39;, &#39;layout&#39;, &#39;draw&#39;)</span>
<span class="line">  ORDER BY ts</span>
<span class="line">&quot;&quot;&quot;</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">for</span> row <span class="token keyword">in</span> result<span class="token punctuation">:</span></span>
<span class="line">    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;</span><span class="token interpolation"><span class="token punctuation">{</span>row<span class="token punctuation">.</span>name<span class="token punctuation">}</span></span><span class="token string">: </span><span class="token interpolation"><span class="token punctuation">{</span>row<span class="token punctuation">.</span>dur_ms<span class="token punctuation">:</span><span class="token format-spec">.2f</span><span class="token punctuation">}</span></span><span class="token string"> ms&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="十、总结" tabindex="-1"><a class="header-anchor" href="#十、总结"><span>十、总结</span></a></h2><p>Android 帧处理的 5 大阶段对应 Framework 中的关键调用：</p><ol><li><strong>INPUT</strong> (0-1ms) — 输入事件分发（ViewRootImpl → View 树）</li><li><strong>ANIMATION</strong> (1-3ms) — 动画属性更新（ValueAnimator → View setters）</li><li><strong>INSETS_ANIMATION</strong> (3-4ms) — 系统 Inset 动画（InsetsAnimationController）</li><li><strong>TRAVERSAL</strong> (4-24ms) — View 树遍历（measure / layout / draw）</li><li><strong>COMMIT</strong> (24-27ms) — 缓冲区提交（HardwareRenderer → RenderThread）</li></ol><p><strong>关键优化方向</strong>：</p><ul><li>减少 TRAVERSAL 阶段的耗时（View 树深度、重复测量）</li><li>避免 INPUT / ANIMATION 阶段频繁触发 requestLayout()</li><li>使用硬件加速动画（Transition API / RenderEffect）而非 PropertyAnimation</li><li>通过 Perfetto 精确测量瓶颈，不盲目优化</li></ul><hr><h2 id="参考资源" tabindex="-1"><a class="header-anchor" href="#参考资源"><span>参考资源</span></a></h2><ul><li><a href="https://developer.android.google.cn/topic/performance" target="_blank" rel="noopener noreferrer">Android 官方文档：App Performance Fundamentals</a></li><li><a href="https://perfetto.dev" target="_blank" rel="noopener noreferrer">Perfetto 官网</a></li><li><a href="https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-14.0.0_r1/core/java/android/view/Choreographer.java" target="_blank" rel="noopener noreferrer">Android 源码：Choreographer.java</a></li><li><a href="https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-14.0.0_r1/core/java/android/view/ViewRootImpl.java" target="_blank" rel="noopener noreferrer">Android 源码：ViewRootImpl.java</a></li></ul>`,76))])}const m=p(r,[["render",d]]),b=JSON.parse('{"path":"/posts/choreographer-deep-dive-part2.html","title":"Choreographer 深度指南（第二部分）：Framework 回调链路完全解析","lang":"zh-CN","frontmatter":{},"git":{"contributors":[{"name":"DingYi","username":"DingYi","email":"dvdface@users.noreply.github.com","commits":1,"url":"https://github.com/DingYi"}],"changelog":[{"hash":"39f28776f2cb05bc61ef30a029439bb3133f9c47","time":1779430899000,"email":"dvdface@users.noreply.github.com","author":"DingYi","message":"feat(android): Update Choreographer article series and homepage"}]},"filePathRelative":"posts/choreographer-deep-dive-part2.md"}');export{m as comp,b as data};
