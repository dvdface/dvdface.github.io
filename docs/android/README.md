# Android 专栏

本栏目用于存放 Android 工程实践相关内容，重点覆盖性能优化、架构治理与稳定性建设。

## 专栏文章

### 🎬 Choreographer 深度指南（系列）

- **[第一部分：Android Frame Rendering 的心脏](/posts/choreographer-deep-dive.html)** — 从帧驱动机制到性能优化的完整解析。涵盖 VSYNC 同步、帧时间计算、5 大回调链路、缓冲区堆积恢复、Jank 根因分析，以及高刷屏幕适配。包含初始化流程、帧处理顺序图、性能优化清单和常见陷阱。[阅读全文](/posts/choreographer-deep-dive.html)

- **[第二部分：Framework 回调链路完全解析](/posts/choreographer-deep-dive-part2.html)** — 逐帧追踪 Android Framework 在 INPUT、ANIMATION、INSETS_ANIMATION、TRAVERSAL、COMMIT 五大阶段的精确调用点。从 SurfaceFlinger 同步信号到 View 树遍历的完整序列，包含源码位置、时间点估算、Perfetto 验证方法与性能瓶颈对症下药。[阅读全文](/posts/choreographer-deep-dive-part2.html)

### 📊 I/O 优化

- [Android I/O 优化实战：从启动卡顿到稳定低延迟的技术洞察](/posts/android-io-optimization-insights.html) — 一篇面向生产环境的 I/O 优化指南：如何用 StrictMode + Perfetto 找到瓶颈，如何在启动阶段做分层初始化，如何优化 DataStore/Room/文件读写和后台任务调度，并建立可持续监控与回归机制。[阅读全文](/posts/android-io-optimization-insights.html)
