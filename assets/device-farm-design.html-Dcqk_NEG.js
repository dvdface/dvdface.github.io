import{_ as p,c as l,a as t,b as s,d as i,w as c,e as a,r as o,o as u}from"./app-CoGhoRHR.js";const r={};function d(v,n){const e=o("RouteLink");return u(),l("div",null,[n[4]||(n[4]=t(`<h1 id="android-device-farm-系统设计-2-mvp-到完整架构" tabindex="-1"><a class="header-anchor" href="#android-device-farm-系统设计-2-mvp-到完整架构"><span>Android Device Farm 系统设计 (2)：MVP 到完整架构</span></a></h1><blockquote><p>本文是 Android Device Farm 系列的第二部分。我们从产品需求出发，先设计一个 MVP（最小可行产品），然后逐步迭代到支持多用户、故障恢复、自动扩展的完整系统。核心是用流程图展示<strong>正常流</strong>和<strong>异常流</strong>，帮助你理解系统如何处理边界情况。</p></blockquote><h2 id="第-0-部分-需求分析" tabindex="-1"><a class="header-anchor" href="#第-0-部分-需求分析"><span>第 0 部分：需求分析</span></a></h2><h3 id="用户角色" tabindex="-1"><a class="header-anchor" href="#用户角色"><span>用户角色</span></a></h3><p>定义系统中的主要参与者：</p><table><thead><tr><th>角色</th><th>职责</th><th>典型操作</th></tr></thead><tbody><tr><td><strong>内部用户（开发者/QA）</strong></td><td>使用设备执行测试</td><td>预留设备 → 运行测试 → 释放设备</td></tr><tr><td><strong>外部用户（CI/CD 流水线）</strong></td><td>自动化执行大规模测试</td><td>通过 API 批量申请设备 → 并行执行 → 收集报告</td></tr><tr><td><strong>运维人员</strong></td><td>管理设备、监控健康状态</td><td>绑定/解绑设备、故障排查、容量规划</td></tr><tr><td><strong>系统本身</strong></td><td>自动化管理和恢复</td><td>健康检查、自动重连、故障告警</td></tr></tbody></table><h3 id="核心需求" tabindex="-1"><a class="header-anchor" href="#核心需求"><span>核心需求</span></a></h3><p><strong>功能需求</strong>：</p><ul><li>✅ 多个 Windows 主机 + 多个 Linux 客户端</li><li>✅ 设备预留和释放（避免冲突）</li><li>✅ 支持按设备型号、Android 版本、功能筛选</li><li>✅ 设备故障自动检测和恢复</li><li>✅ 实时可视化设备状态</li></ul><p><strong>非功能需求</strong>：</p><ul><li>可靠性：99.5% 设备可用率</li><li>延迟：设备预留 &lt; 5 秒</li><li>扩展性：支持 50+ 设备，无需重构</li><li>易用性：傻瓜式 API 给测试框架调用</li></ul><hr><h2 id="第-1-部分-mvp-设计-最小可行产品" tabindex="-1"><a class="header-anchor" href="#第-1-部分-mvp-设计-最小可行产品"><span>第 1 部分：MVP 设计（最小可行产品）</span></a></h2><h3 id="mvp-的约束" tabindex="-1"><a class="header-anchor" href="#mvp-的约束"><span>MVP 的约束</span></a></h3><p>为了快速验证核心价值，我们有意做减法：</p><p><strong>MVP 支持的场景</strong>：</p><ul><li>✅ 单个 Windows 主机 + 单个 Linux 测试机</li><li>✅ 最多 10 部设备</li><li>✅ 同步设备预留（一个一个来）</li><li>✅ 基础的健康检查（每 60 秒一次）</li></ul><p><strong>MVP 不支持的</strong>（下个版本加）：</p><ul><li>❌ 多个主机</li><li>❌ 异步并发预留</li><li>❌ 细粒度权限管理</li><li>❌ 自动故障转移</li></ul><h3 id="mvp-架构图" tabindex="-1"><a class="header-anchor" href="#mvp-架构图"><span>MVP 架构图</span></a></h3><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">┌──────────────────────────────────────────────────┐</span>
<span class="line">│        Windows Device Host (192.168.1.100)       │</span>
<span class="line">│                                                  │</span>
<span class="line">│  ┌────────────────┐  ┌──────────────────────┐  │</span>
<span class="line">│  │   usbipd       │  │ USB Devices (10台)   │  │</span>
<span class="line">│  │   Server       │  │ - 5× Pixel           │  │</span>
<span class="line">│  │   (Port 3240)  │  │ - 3× OnePlus         │  │</span>
<span class="line">│  └────────────────┘  │ - 2× Samsung         │  │</span>
<span class="line">│          ▲           └──────────────────────┘  │</span>
<span class="line">│          │ USB                                  │</span>
<span class="line">└──────────┼──────────────────────────────────────┘</span>
<span class="line">           │ TCP (Gigabit)</span>
<span class="line">           │</span>
<span class="line">┌──────────▼──────────────────────────────────────┐</span>
<span class="line">│    Linux Test Machine (192.168.1.50)            │</span>
<span class="line">│                                                 │</span>
<span class="line">│  ┌────────────────────────────────────────┐   │</span>
<span class="line">│  │  Device Pool Manager (Python Script)   │   │</span>
<span class="line">│  │                                        │   │</span>
<span class="line">│  │  ┌──────────────────────────────────┐ │   │</span>
<span class="line">│  │  │ Component 1: Device Discovery    │ │   │</span>
<span class="line">│  │  │ - usbip attach/detach 管理       │ │   │</span>
<span class="line">│  │  │ - adb devices 扫描               │ │   │</span>
<span class="line">│  │  └──────────────────────────────────┘ │   │</span>
<span class="line">│  │  ┌──────────────────────────────────┐ │   │</span>
<span class="line">│  │  │ Component 2: Pool Management     │ │   │</span>
<span class="line">│  │  │ - 设备在线/离线状态              │ │   │</span>
<span class="line">│  │  │ - 预留/释放锁                    │ │   │</span>
<span class="line">│  │  └──────────────────────────────────┘ │   │</span>
<span class="line">│  │  ┌──────────────────────────────────┐ │   │</span>
<span class="line">│  │  │ Component 3: Health Monitor      │ │   │</span>
<span class="line">│  │  │ - 后台线程：每 60s ping 一次     │ │   │</span>
<span class="line">│  │  │ - 故障自动标记                   │ │   │</span>
<span class="line">│  │  └──────────────────────────────────┘ │   │</span>
<span class="line">│  └────────────────────────────────────────┘   │</span>
<span class="line">│                                                 │</span>
<span class="line">│  ┌────────────────────────────────────────┐   │</span>
<span class="line">│  │  API 服务 (Flask, Port 5000)           │   │</span>
<span class="line">│  │                                        │   │</span>
<span class="line">│  │  GET  /devices           查看所有设备  │   │</span>
<span class="line">│  │  POST /devices/reserve   预留一个设备  │   │</span>
<span class="line">│  │  POST /devices/release   释放一个设备  │   │</span>
<span class="line">│  │  GET  /status            查看系统状态  │   │</span>
<span class="line">│  └────────────────────────────────────────┘   │</span>
<span class="line">│                                                 │</span>
<span class="line">│  ┌────────────────────────────────────────┐   │</span>
<span class="line">│  │  Tests (pytest, Appium, DroidAgent)    │   │</span>
<span class="line">│  │  调用 API 预留设备，运行测试            │   │</span>
<span class="line">│  └────────────────────────────────────────┘   │</span>
<span class="line">└─────────────────────────────────────────────────┘</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="mvp-的核心数据结构" tabindex="-1"><a class="header-anchor" href="#mvp-的核心数据结构"><span>MVP 的核心数据结构</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token comment"># Device 状态模型</span></span>
<span class="line"><span class="token keyword">class</span> <span class="token class-name">DeviceState</span><span class="token punctuation">(</span>Enum<span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">    OFFLINE <span class="token operator">=</span> <span class="token string">&quot;offline&quot;</span>           <span class="token comment"># 物理故障或网络断线</span></span>
<span class="line">    IDLE <span class="token operator">=</span> <span class="token string">&quot;idle&quot;</span>                 <span class="token comment"># 在线且可用</span></span>
<span class="line">    RESERVED <span class="token operator">=</span> <span class="token string">&quot;reserved&quot;</span>         <span class="token comment"># 被预留，测试进行中</span></span>
<span class="line">    RECOVERING <span class="token operator">=</span> <span class="token string">&quot;recovering&quot;</span>     <span class="token comment"># 故障恢复中</span></span>
<span class="line"></span>
<span class="line"><span class="token decorator annotation punctuation">@dataclass</span></span>
<span class="line"><span class="token keyword">class</span> <span class="token class-name">Device</span><span class="token punctuation">:</span></span>
<span class="line">    serial<span class="token punctuation">:</span> <span class="token builtin">str</span>                    <span class="token comment"># adb serial</span></span>
<span class="line">    model<span class="token punctuation">:</span> <span class="token builtin">str</span>                     <span class="token comment"># Pixel 6, OnePlus 10, ...</span></span>
<span class="line">    android_version<span class="token punctuation">:</span> <span class="token builtin">str</span>           <span class="token comment"># 13, 14, ...</span></span>
<span class="line">    state<span class="token punctuation">:</span> DeviceState             <span class="token comment"># 当前状态</span></span>
<span class="line">    reserved_by<span class="token punctuation">:</span> Optional<span class="token punctuation">[</span><span class="token builtin">str</span><span class="token punctuation">]</span>     <span class="token comment"># 谁预留的（测试名称）</span></span>
<span class="line">    last_ping_time<span class="token punctuation">:</span> datetime       <span class="token comment"># 最后健康检查时间</span></span>
<span class="line">    fail_count<span class="token punctuation">:</span> <span class="token builtin">int</span> <span class="token operator">=</span> <span class="token number">0</span>            <span class="token comment"># 连续失败次数</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="mvp-的正常流-单个设备预留" tabindex="-1"><a class="header-anchor" href="#mvp-的正常流-单个设备预留"><span>MVP 的正常流：单个设备预留</span></a></h3><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">预留请求</span>
<span class="line">   ↓</span>
<span class="line">┌─────────────────────────────────────┐</span>
<span class="line">│  1. 查询设备池                       │</span>
<span class="line">│     过滤条件：                      │</span>
<span class="line">│     - state == IDLE                │</span>
<span class="line">│     - model 匹配（可选）            │</span>
<span class="line">│     - android_version 匹配（可选）   │</span>
<span class="line">└─────────────────────────────────────┘</span>
<span class="line">   │</span>
<span class="line">   ├─ 找到匹配设备 ──→ ✓ FOUND</span>
<span class="line">   │</span>
<span class="line">   └─ 未找到        ──→ ✗ TIMEOUT（等待 30s 后重试）</span>
<span class="line">                        如果 30s 内仍未找到 → 返回失败</span>
<span class="line">   </span>
<span class="line">   ↓ (FOUND 分支)</span>
<span class="line">┌─────────────────────────────────────┐</span>
<span class="line">│  2. 获取设备锁                       │</span>
<span class="line">│     threading.Lock(device.serial)    │</span>
<span class="line">│     避免多个请求同时预留同一设备     │</span>
<span class="line">└─────────────────────────────────────┘</span>
<span class="line">   │</span>
<span class="line">   ├─ 锁获取成功 ──→ ✓ LOCKED</span>
<span class="line">   │</span>
<span class="line">   └─ 锁超时（2s） ──→ ✗ 其他线程也在预留</span>
<span class="line">                        重试或返回其他设备</span>
<span class="line">   </span>
<span class="line">   ↓ (LOCKED 分支)</span>
<span class="line">┌─────────────────────────────────────┐</span>
<span class="line">│  3. 原子更新设备状态                 │</span>
<span class="line">│     state = RESERVED                │</span>
<span class="line">│     reserved_by = test_name         │</span>
<span class="line">│     timestamp = now()               │</span>
<span class="line">└─────────────────────────────────────┘</span>
<span class="line">   │</span>
<span class="line">   ↓</span>
<span class="line">┌─────────────────────────────────────┐</span>
<span class="line">│  4. 返回设备信息给调用方              │</span>
<span class="line">│     {                               │</span>
<span class="line">│       &quot;serial&quot;: &quot;FA9BF...&quot;,        │</span>
<span class="line">│       &quot;model&quot;: &quot;Pixel 6 Pro&quot;,       │</span>
<span class="line">│       &quot;status&quot;: &quot;ready&quot;             │</span>
<span class="line">│     }                               │</span>
<span class="line">└─────────────────────────────────────┘</span>
<span class="line">   │</span>
<span class="line">   ↓</span>
<span class="line">┌─────────────────────────────────────┐</span>
<span class="line">│  5. 测试运行（由调用方负责）          │</span>
<span class="line">│     adb -s &lt;serial&gt; shell ...       │</span>
<span class="line">│     pytest --device &lt;serial&gt;        │</span>
<span class="line">└─────────────────────────────────────┘</span>
<span class="line">   │</span>
<span class="line">   ↓</span>
<span class="line">┌─────────────────────────────────────┐</span>
<span class="line">│  6. 测试完成，调用方请求释放          │</span>
<span class="line">│     POST /devices/release           │</span>
<span class="line">│     { serial: &quot;FA9BF...&quot; }          │</span>
<span class="line">└─────────────────────────────────────┘</span>
<span class="line">   │</span>
<span class="line">   ↓</span>
<span class="line">┌─────────────────────────────────────┐</span>
<span class="line">│  7. 后端释放设备                      │</span>
<span class="line">│     state = IDLE                    │</span>
<span class="line">│     reserved_by = None              │</span>
<span class="line">│     释放锁                           │</span>
<span class="line">└─────────────────────────────────────┘</span>
<span class="line">   │</span>
<span class="line">   ✓ 完成</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="mvp-的异常流-设备故障" tabindex="-1"><a class="header-anchor" href="#mvp-的异常流-设备故障"><span>MVP 的异常流：设备故障</span></a></h3><h4 id="异常流-1-测试中设备掉线" tabindex="-1"><a class="header-anchor" href="#异常流-1-测试中设备掉线"><span>异常流 1：测试中设备掉线</span></a></h4><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">测试运行中</span>
<span class="line">┌────────────────────────────┐</span>
<span class="line">│  adb -s &lt;serial&gt; shell ... │  ← 设备突然离线（网络断线）</span>
<span class="line">└────────────────────────────┘</span>
<span class="line">          │</span>
<span class="line">          ✗ 命令超时或返回 &quot;device offline&quot;</span>
<span class="line">          │</span>
<span class="line">          ↓</span>
<span class="line">┌────────────────────────────────────────┐</span>
<span class="line">│  测试框架检测到故障                     │</span>
<span class="line">│  （应该有 timeout 和 retry 机制）       │</span>
<span class="line">│                                        │</span>
<span class="line">│  建议做法：                            │</span>
<span class="line">│  try:                                 │</span>
<span class="line">│      adb.shell(cmd, timeout=30s)      │</span>
<span class="line">│  except AdbTimeoutError:              │</span>
<span class="line">│      # 通知 Device Farm 该设备故障     │</span>
<span class="line">│      POST /devices/FAULT               │</span>
<span class="line">│      { serial: &quot;...&quot;, reason: &quot;...&quot; }  │</span>
<span class="line">└────────────────────────────────────────┘</span>
<span class="line">          │</span>
<span class="line">          ↓</span>
<span class="line">┌────────────────────────────────────────┐</span>
<span class="line">│  Device Farm 后端：标记设备为 OFFLINE  │</span>
<span class="line">│  device.state = OFFLINE                │</span>
<span class="line">│  device.reserved_by = None   (强制释放)│</span>
<span class="line">│  fail_count = 1                        │</span>
<span class="line">│                                        │</span>
<span class="line">│  通知测试框架：设备不可用，请重试     │</span>
<span class="line">│  Response: {status: &quot;device_fault&quot;}    │</span>
<span class="line">└────────────────────────────────────────┘</span>
<span class="line">          │</span>
<span class="line">          ↓</span>
<span class="line">┌────────────────────────────────────────┐</span>
<span class="line">│  后台健康检查线程发现该设备离线         │</span>
<span class="line">│  （定期 ping：adb shell echo OK）      │</span>
<span class="line">│                                        │</span>
<span class="line">│  自动尝试恢复：                         │</span>
<span class="line">│  1. detach 该设备（usbip detach）      │</span>
<span class="line">│  2. 等待 10 秒                         │</span>
<span class="line">│  3. attach 该设备（usbip attach）      │</span>
<span class="line">│  4. 等待 adb 识别（最多 20 秒）        │</span>
<span class="line">│  5. 再次 ping                          │</span>
<span class="line">│                                        │</span>
<span class="line">│  如果恢复成功：                        │</span>
<span class="line">│    device.state = IDLE                │</span>
<span class="line">│    device.fail_count = 0              │</span>
<span class="line">│    日志：[RECOVERY] Device recovered   │</span>
<span class="line">│                                        │</span>
<span class="line">│  如果恢复失败：                        │</span>
<span class="line">│    device.fail_count += 1             │</span>
<span class="line">│    如果 fail_count &gt;= 3               │</span>
<span class="line">│      device.state = OFFLINE（标记坏掉）│</span>
<span class="line">│      告警：Device repeated failure     │</span>
<span class="line">└────────────────────────────────────────┘</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="异常流-2-测试框架未正确释放设备" tabindex="-1"><a class="header-anchor" href="#异常流-2-测试框架未正确释放设备"><span>异常流 2：测试框架未正确释放设备</span></a></h4><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">测试运行中</span>
<span class="line">┌────────────────────────────┐</span>
<span class="line">│  device.state = RESERVED   │</span>
<span class="line">│  测试被 kill 或崩溃          │</span>
<span class="line">│  （没有调用 /release API）   │</span>
<span class="line">└────────────────────────────┘</span>
<span class="line">          │</span>
<span class="line">          ↓ （设备卡在 RESERVED 状态）</span>
<span class="line">┌────────────────────────────────────────┐</span>
<span class="line">│  后台清理线程（每 5 分钟运行一次）      │</span>
<span class="line">│                                        │</span>
<span class="line">│  对于每个 RESERVED 的设备：            │</span>
<span class="line">│  if (now - reserved_time &gt; 30 min)    │</span>
<span class="line">│      device.state = IDLE   (强制释放)  │</span>
<span class="line">│      device.reserved_by = None         │</span>
<span class="line">│      日志：[CLEANUP] Released stale ... │</span>
<span class="line">│      告警：Test didn&#39;t release device  │</span>
<span class="line">└────────────────────────────────────────┘</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="mvp-数据持久化" tabindex="-1"><a class="header-anchor" href="#mvp-数据持久化"><span>MVP 数据持久化</span></a></h3><p>简单方案：<strong>JSON 文件 + 内存缓存</strong></p><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token comment"># 目录结构</span></span>
<span class="line">device_farm<span class="token operator">/</span></span>
<span class="line">├── data<span class="token operator">/</span></span>
<span class="line">│  ├── devices<span class="token punctuation">.</span>json       <span class="token comment"># 设备定义（静态）</span></span>
<span class="line">│  ├── state<span class="token punctuation">.</span>json         <span class="token comment"># 设备运行时状态（动态）</span></span>
<span class="line">│  └── logs<span class="token operator">/</span></span>
<span class="line">│     └── device_farm<span class="token punctuation">.</span>log <span class="token comment"># 操作日志</span></span>
<span class="line">└── scripts<span class="token operator">/</span></span>
<span class="line">   ├── device_farm<span class="token punctuation">.</span>py     <span class="token comment"># 核心逻辑</span></span>
<span class="line">   └── monitor<span class="token punctuation">.</span>py         <span class="token comment"># 健康检查</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-json line-numbers-mode" data-highlighter="prismjs" data-ext="json"><pre><code class="language-json"><span class="line"><span class="token comment">// devices.json - 设备定义（静态）</span></span>
<span class="line"><span class="token punctuation">[</span></span>
<span class="line">  <span class="token punctuation">{</span></span>
<span class="line">    <span class="token property">&quot;serial&quot;</span><span class="token operator">:</span> <span class="token string">&quot;FA9BF1A0D1&quot;</span><span class="token punctuation">,</span></span>
<span class="line">    <span class="token property">&quot;model&quot;</span><span class="token operator">:</span> <span class="token string">&quot;Pixel 6 Pro&quot;</span><span class="token punctuation">,</span></span>
<span class="line">    <span class="token property">&quot;android_version&quot;</span><span class="token operator">:</span> <span class="token string">&quot;14&quot;</span><span class="token punctuation">,</span></span>
<span class="line">    <span class="token property">&quot;busid&quot;</span><span class="token operator">:</span> <span class="token string">&quot;1-1&quot;</span></span>
<span class="line">  <span class="token punctuation">}</span><span class="token punctuation">,</span></span>
<span class="line">  <span class="token punctuation">{</span></span>
<span class="line">    <span class="token property">&quot;serial&quot;</span><span class="token operator">:</span> <span class="token string">&quot;R39M30MZDLZ&quot;</span><span class="token punctuation">,</span></span>
<span class="line">    <span class="token property">&quot;model&quot;</span><span class="token operator">:</span> <span class="token string">&quot;OnePlus 10 Pro&quot;</span><span class="token punctuation">,</span></span>
<span class="line">    <span class="token property">&quot;android_version&quot;</span><span class="token operator">:</span> <span class="token string">&quot;13&quot;</span><span class="token punctuation">,</span></span>
<span class="line">    <span class="token property">&quot;busid&quot;</span><span class="token operator">:</span> <span class="token string">&quot;1-2&quot;</span></span>
<span class="line">  <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">]</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">// state.json - 运行时状态（每次更新时写入）</span></span>
<span class="line"><span class="token punctuation">{</span></span>
<span class="line">  <span class="token property">&quot;devices&quot;</span><span class="token operator">:</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token property">&quot;FA9BF1A0D1&quot;</span><span class="token operator">:</span> <span class="token punctuation">{</span></span>
<span class="line">      <span class="token property">&quot;state&quot;</span><span class="token operator">:</span> <span class="token string">&quot;reserved&quot;</span><span class="token punctuation">,</span></span>
<span class="line">      <span class="token property">&quot;reserved_by&quot;</span><span class="token operator">:</span> <span class="token string">&quot;test_e2e_checkout&quot;</span><span class="token punctuation">,</span></span>
<span class="line">      <span class="token property">&quot;last_ping&quot;</span><span class="token operator">:</span> <span class="token string">&quot;2024-05-23T10:15:30Z&quot;</span><span class="token punctuation">,</span></span>
<span class="line">      <span class="token property">&quot;fail_count&quot;</span><span class="token operator">:</span> <span class="token number">0</span></span>
<span class="line">    <span class="token punctuation">}</span><span class="token punctuation">,</span></span>
<span class="line">    <span class="token property">&quot;R39M30MZDLZ&quot;</span><span class="token operator">:</span> <span class="token punctuation">{</span></span>
<span class="line">      <span class="token property">&quot;state&quot;</span><span class="token operator">:</span> <span class="token string">&quot;idle&quot;</span><span class="token punctuation">,</span></span>
<span class="line">      <span class="token property">&quot;reserved_by&quot;</span><span class="token operator">:</span> <span class="token null keyword">null</span><span class="token punctuation">,</span></span>
<span class="line">      <span class="token property">&quot;last_ping&quot;</span><span class="token operator">:</span> <span class="token string">&quot;2024-05-23T10:15:31Z&quot;</span><span class="token punctuation">,</span></span>
<span class="line">      <span class="token property">&quot;fail_count&quot;</span><span class="token operator">:</span> <span class="token number">0</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line">  <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="第-2-部分-mvp-的实现要点" tabindex="-1"><a class="header-anchor" href="#第-2-部分-mvp-的实现要点"><span>第 2 部分：MVP 的实现要点</span></a></h2><h3 id="_1-线程安全" tabindex="-1"><a class="header-anchor" href="#_1-线程安全"><span>1. 线程安全</span></a></h3><p>由于多个测试框架可能同时申请设备，必须用锁保护共享状态：</p><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token keyword">from</span> threading <span class="token keyword">import</span> Lock<span class="token punctuation">,</span> RLock</span>
<span class="line"></span>
<span class="line"><span class="token keyword">class</span> <span class="token class-name">DevicePool</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token keyword">def</span> <span class="token function">__init__</span><span class="token punctuation">(</span>self<span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">        self<span class="token punctuation">.</span>devices <span class="token operator">=</span> <span class="token punctuation">{</span><span class="token punctuation">}</span></span>
<span class="line">        self<span class="token punctuation">.</span>lock <span class="token operator">=</span> RLock<span class="token punctuation">(</span><span class="token punctuation">)</span>  <span class="token comment"># 可重入锁（同个线程可以多次获取）</span></span>
<span class="line">        self<span class="token punctuation">.</span>device_locks <span class="token operator">=</span> defaultdict<span class="token punctuation">(</span>Lock<span class="token punctuation">)</span>  <span class="token comment"># 每个设备一个锁</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">def</span> <span class="token function">reserve_device</span><span class="token punctuation">(</span>self<span class="token punctuation">,</span> criteria<span class="token operator">=</span><span class="token boolean">None</span><span class="token punctuation">)</span> <span class="token operator">-</span><span class="token operator">&gt;</span> Optional<span class="token punctuation">[</span><span class="token builtin">str</span><span class="token punctuation">]</span><span class="token punctuation">:</span></span>
<span class="line">        <span class="token keyword">with</span> self<span class="token punctuation">.</span>lock<span class="token punctuation">:</span></span>
<span class="line">            <span class="token comment"># 查找匹配设备</span></span>
<span class="line">            candidate <span class="token operator">=</span> self<span class="token punctuation">.</span>_find_idle_device<span class="token punctuation">(</span>criteria<span class="token punctuation">)</span></span>
<span class="line">            <span class="token keyword">if</span> <span class="token keyword">not</span> candidate<span class="token punctuation">:</span></span>
<span class="line">                <span class="token keyword">return</span> <span class="token boolean">None</span></span>
<span class="line">            </span>
<span class="line">            <span class="token comment"># 获取该设备的锁</span></span>
<span class="line">            <span class="token keyword">with</span> self<span class="token punctuation">.</span>device_locks<span class="token punctuation">[</span>candidate<span class="token punctuation">[</span><span class="token string">&#39;serial&#39;</span><span class="token punctuation">]</span><span class="token punctuation">]</span><span class="token punctuation">:</span></span>
<span class="line">                <span class="token comment"># 再次检查状态（double-check pattern）</span></span>
<span class="line">                <span class="token keyword">if</span> candidate<span class="token punctuation">[</span><span class="token string">&#39;state&#39;</span><span class="token punctuation">]</span> <span class="token operator">!=</span> <span class="token string">&#39;idle&#39;</span><span class="token punctuation">:</span></span>
<span class="line">                    <span class="token keyword">return</span> <span class="token boolean">None</span>  <span class="token comment"># 被其他线程抢先预留了</span></span>
<span class="line">                </span>
<span class="line">                <span class="token comment"># 原子更新</span></span>
<span class="line">                candidate<span class="token punctuation">[</span><span class="token string">&#39;state&#39;</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token string">&#39;reserved&#39;</span></span>
<span class="line">                candidate<span class="token punctuation">[</span><span class="token string">&#39;reserved_by&#39;</span><span class="token punctuation">]</span> <span class="token operator">=</span> threading<span class="token punctuation">.</span>current_thread<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>name</span>
<span class="line">                self<span class="token punctuation">.</span>_save_state<span class="token punctuation">(</span><span class="token punctuation">)</span>  <span class="token comment"># 持久化</span></span>
<span class="line">                </span>
<span class="line">                <span class="token keyword">return</span> candidate<span class="token punctuation">[</span><span class="token string">&#39;serial&#39;</span><span class="token punctuation">]</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-健康检查线程" tabindex="-1"><a class="header-anchor" href="#_2-健康检查线程"><span>2. 健康检查线程</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token keyword">def</span> <span class="token function">health_check_loop</span><span class="token punctuation">(</span>self<span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token triple-quoted-string string">&quot;&quot;&quot;后台线程：定期检查设备健康状态&quot;&quot;&quot;</span></span>
<span class="line">    <span class="token keyword">while</span> <span class="token boolean">True</span><span class="token punctuation">:</span></span>
<span class="line">        time<span class="token punctuation">.</span>sleep<span class="token punctuation">(</span><span class="token number">60</span><span class="token punctuation">)</span>  <span class="token comment"># 每 60 秒检查一次</span></span>
<span class="line">        </span>
<span class="line">        <span class="token keyword">for</span> serial<span class="token punctuation">,</span> device <span class="token keyword">in</span> self<span class="token punctuation">.</span>devices<span class="token punctuation">.</span>items<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">            <span class="token keyword">if</span> device<span class="token punctuation">[</span><span class="token string">&#39;state&#39;</span><span class="token punctuation">]</span> <span class="token operator">==</span> <span class="token string">&#39;offline&#39;</span><span class="token punctuation">:</span></span>
<span class="line">                <span class="token keyword">continue</span>  <span class="token comment"># 已离线的设备，跳过</span></span>
<span class="line">            </span>
<span class="line">            <span class="token comment"># 1. Ping 设备</span></span>
<span class="line">            alive <span class="token operator">=</span> self<span class="token punctuation">.</span>_ping_device<span class="token punctuation">(</span>serial<span class="token punctuation">)</span></span>
<span class="line">            </span>
<span class="line">            <span class="token keyword">if</span> alive<span class="token punctuation">:</span></span>
<span class="line">                device<span class="token punctuation">[</span><span class="token string">&#39;fail_count&#39;</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token number">0</span>  <span class="token comment"># 恢复计数重置</span></span>
<span class="line">                <span class="token keyword">continue</span></span>
<span class="line">            </span>
<span class="line">            <span class="token comment"># 2. 失败计数</span></span>
<span class="line">            device<span class="token punctuation">[</span><span class="token string">&#39;fail_count&#39;</span><span class="token punctuation">]</span> <span class="token operator">+=</span> <span class="token number">1</span></span>
<span class="line">            <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;[HEALTH] </span><span class="token interpolation"><span class="token punctuation">{</span>serial<span class="token punctuation">}</span></span><span class="token string"> ping failed (count=</span><span class="token interpolation"><span class="token punctuation">{</span>device<span class="token punctuation">[</span><span class="token string">&#39;fail_count&#39;</span><span class="token punctuation">]</span><span class="token punctuation">}</span></span><span class="token string">)&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line">            </span>
<span class="line">            <span class="token comment"># 3. 超过阈值则标记离线</span></span>
<span class="line">            <span class="token keyword">if</span> device<span class="token punctuation">[</span><span class="token string">&#39;fail_count&#39;</span><span class="token punctuation">]</span> <span class="token operator">&gt;=</span> <span class="token number">3</span><span class="token punctuation">:</span></span>
<span class="line">                device<span class="token punctuation">[</span><span class="token string">&#39;state&#39;</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token string">&#39;offline&#39;</span></span>
<span class="line">                device<span class="token punctuation">[</span><span class="token string">&#39;reserved_by&#39;</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token boolean">None</span>  <span class="token comment"># 强制释放</span></span>
<span class="line">                self<span class="token punctuation">.</span>_alert<span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;Device </span><span class="token interpolation"><span class="token punctuation">{</span>serial<span class="token punctuation">}</span></span><span class="token string"> marked OFFLINE&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line">            </span>
<span class="line">            <span class="token comment"># 4. 尝试恢复（可选，MVP 中简单实现）</span></span>
<span class="line">            <span class="token keyword">elif</span> device<span class="token punctuation">[</span><span class="token string">&#39;fail_count&#39;</span><span class="token punctuation">]</span> <span class="token operator">==</span> <span class="token number">1</span><span class="token punctuation">:</span></span>
<span class="line">                self<span class="token punctuation">.</span>_try_recovery<span class="token punctuation">(</span>serial<span class="token punctuation">)</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">def</span> <span class="token function">_ping_device</span><span class="token punctuation">(</span>self<span class="token punctuation">,</span> serial<span class="token punctuation">:</span> <span class="token builtin">str</span><span class="token punctuation">)</span> <span class="token operator">-</span><span class="token operator">&gt;</span> <span class="token builtin">bool</span><span class="token punctuation">:</span></span>
<span class="line">        <span class="token triple-quoted-string string">&quot;&quot;&quot;用 adb 检查设备是否在线&quot;&quot;&quot;</span></span>
<span class="line">        <span class="token keyword">try</span><span class="token punctuation">:</span></span>
<span class="line">            result <span class="token operator">=</span> subprocess<span class="token punctuation">.</span>run<span class="token punctuation">(</span></span>
<span class="line">                <span class="token punctuation">[</span><span class="token string">&quot;adb&quot;</span><span class="token punctuation">,</span> <span class="token string">&quot;-s&quot;</span><span class="token punctuation">,</span> serial<span class="token punctuation">,</span> <span class="token string">&quot;shell&quot;</span><span class="token punctuation">,</span> <span class="token string">&quot;echo&quot;</span><span class="token punctuation">,</span> <span class="token string">&quot;OK&quot;</span><span class="token punctuation">]</span><span class="token punctuation">,</span></span>
<span class="line">                capture_output<span class="token operator">=</span><span class="token boolean">True</span><span class="token punctuation">,</span></span>
<span class="line">                timeout<span class="token operator">=</span><span class="token number">10</span></span>
<span class="line">            <span class="token punctuation">)</span></span>
<span class="line">            <span class="token keyword">return</span> result<span class="token punctuation">.</span>returncode <span class="token operator">==</span> <span class="token number">0</span></span>
<span class="line">        <span class="token keyword">except</span> subprocess<span class="token punctuation">.</span>TimeoutExpired<span class="token punctuation">:</span></span>
<span class="line">            <span class="token keyword">return</span> <span class="token boolean">False</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">def</span> <span class="token function">_try_recovery</span><span class="token punctuation">(</span>self<span class="token punctuation">,</span> serial<span class="token punctuation">:</span> <span class="token builtin">str</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">        <span class="token triple-quoted-string string">&quot;&quot;&quot;尝试恢复离线设备&quot;&quot;&quot;</span></span>
<span class="line">        <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;[RECOVERY] Attempting to recover </span><span class="token interpolation"><span class="token punctuation">{</span>serial<span class="token punctuation">}</span></span><span class="token string">...&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line">        <span class="token keyword">try</span><span class="token punctuation">:</span></span>
<span class="line">            <span class="token comment"># 1. detach</span></span>
<span class="line">            subprocess<span class="token punctuation">.</span>run<span class="token punctuation">(</span></span>
<span class="line">                <span class="token punctuation">[</span><span class="token string">&quot;usbip&quot;</span><span class="token punctuation">,</span> <span class="token string">&quot;detach&quot;</span><span class="token punctuation">,</span> <span class="token string">&quot;-p&quot;</span><span class="token punctuation">,</span> self<span class="token punctuation">.</span>_get_port<span class="token punctuation">(</span>serial<span class="token punctuation">)</span><span class="token punctuation">]</span><span class="token punctuation">,</span></span>
<span class="line">                timeout<span class="token operator">=</span><span class="token number">10</span></span>
<span class="line">            <span class="token punctuation">)</span></span>
<span class="line">            time<span class="token punctuation">.</span>sleep<span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span></span>
<span class="line">            </span>
<span class="line">            <span class="token comment"># 2. attach</span></span>
<span class="line">            subprocess<span class="token punctuation">.</span>run<span class="token punctuation">(</span></span>
<span class="line">                <span class="token punctuation">[</span><span class="token string">&quot;usbip&quot;</span><span class="token punctuation">,</span> <span class="token string">&quot;attach&quot;</span><span class="token punctuation">,</span> <span class="token string">&quot;-r&quot;</span><span class="token punctuation">,</span> self<span class="token punctuation">.</span>server_ip<span class="token punctuation">,</span> <span class="token string">&quot;-b&quot;</span><span class="token punctuation">,</span> </span>
<span class="line">                 self<span class="token punctuation">.</span>devices<span class="token punctuation">[</span>serial<span class="token punctuation">]</span><span class="token punctuation">[</span><span class="token string">&#39;busid&#39;</span><span class="token punctuation">]</span><span class="token punctuation">]</span><span class="token punctuation">,</span></span>
<span class="line">                timeout<span class="token operator">=</span><span class="token number">10</span></span>
<span class="line">            <span class="token punctuation">)</span></span>
<span class="line">            </span>
<span class="line">            <span class="token comment"># 3. 等待 adb 识别</span></span>
<span class="line">            <span class="token keyword">for</span> _ <span class="token keyword">in</span> <span class="token builtin">range</span><span class="token punctuation">(</span><span class="token number">20</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">                <span class="token keyword">if</span> self<span class="token punctuation">.</span>_ping_device<span class="token punctuation">(</span>serial<span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">                    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;[RECOVERY] </span><span class="token interpolation"><span class="token punctuation">{</span>serial<span class="token punctuation">}</span></span><span class="token string"> recovered!&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line">                    <span class="token keyword">return</span></span>
<span class="line">                time<span class="token punctuation">.</span>sleep<span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span></span>
<span class="line">            </span>
<span class="line">            <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;[RECOVERY] </span><span class="token interpolation"><span class="token punctuation">{</span>serial<span class="token punctuation">}</span></span><span class="token string"> recovery failed&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line">        <span class="token keyword">except</span> Exception <span class="token keyword">as</span> e<span class="token punctuation">:</span></span>
<span class="line">            <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;[RECOVERY] Error: </span><span class="token interpolation"><span class="token punctuation">{</span>e<span class="token punctuation">}</span></span><span class="token string">&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_3-api-设计" tabindex="-1"><a class="header-anchor" href="#_3-api-设计"><span>3. API 设计</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token keyword">from</span> flask <span class="token keyword">import</span> Flask<span class="token punctuation">,</span> request<span class="token punctuation">,</span> jsonify</span>
<span class="line"></span>
<span class="line">app <span class="token operator">=</span> Flask<span class="token punctuation">(</span>__name__<span class="token punctuation">)</span></span>
<span class="line">pool <span class="token operator">=</span> DevicePool<span class="token punctuation">(</span><span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token decorator annotation punctuation">@app<span class="token punctuation">.</span>route</span><span class="token punctuation">(</span><span class="token string">&#39;/devices&#39;</span><span class="token punctuation">,</span> methods<span class="token operator">=</span><span class="token punctuation">[</span><span class="token string">&#39;GET&#39;</span><span class="token punctuation">]</span><span class="token punctuation">)</span></span>
<span class="line"><span class="token keyword">def</span> <span class="token function">list_devices</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token triple-quoted-string string">&quot;&quot;&quot;列出所有设备及其状态&quot;&quot;&quot;</span></span>
<span class="line">    <span class="token keyword">return</span> jsonify<span class="token punctuation">(</span><span class="token punctuation">{</span></span>
<span class="line">        <span class="token string">&#39;devices&#39;</span><span class="token punctuation">:</span> <span class="token builtin">list</span><span class="token punctuation">(</span>pool<span class="token punctuation">.</span>devices<span class="token punctuation">.</span>values<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span></span>
<span class="line">        <span class="token string">&#39;summary&#39;</span><span class="token punctuation">:</span> <span class="token punctuation">{</span></span>
<span class="line">            <span class="token string">&#39;total&#39;</span><span class="token punctuation">:</span> <span class="token builtin">len</span><span class="token punctuation">(</span>pool<span class="token punctuation">.</span>devices<span class="token punctuation">)</span><span class="token punctuation">,</span></span>
<span class="line">            <span class="token string">&#39;idle&#39;</span><span class="token punctuation">:</span> <span class="token builtin">sum</span><span class="token punctuation">(</span><span class="token number">1</span> <span class="token keyword">for</span> d <span class="token keyword">in</span> pool<span class="token punctuation">.</span>devices<span class="token punctuation">.</span>values<span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">if</span> d<span class="token punctuation">[</span><span class="token string">&#39;state&#39;</span><span class="token punctuation">]</span> <span class="token operator">==</span> <span class="token string">&#39;idle&#39;</span><span class="token punctuation">)</span><span class="token punctuation">,</span></span>
<span class="line">            <span class="token string">&#39;reserved&#39;</span><span class="token punctuation">:</span> <span class="token builtin">sum</span><span class="token punctuation">(</span><span class="token number">1</span> <span class="token keyword">for</span> d <span class="token keyword">in</span> pool<span class="token punctuation">.</span>devices<span class="token punctuation">.</span>values<span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">if</span> d<span class="token punctuation">[</span><span class="token string">&#39;state&#39;</span><span class="token punctuation">]</span> <span class="token operator">==</span> <span class="token string">&#39;reserved&#39;</span><span class="token punctuation">)</span><span class="token punctuation">,</span></span>
<span class="line">            <span class="token string">&#39;offline&#39;</span><span class="token punctuation">:</span> <span class="token builtin">sum</span><span class="token punctuation">(</span><span class="token number">1</span> <span class="token keyword">for</span> d <span class="token keyword">in</span> pool<span class="token punctuation">.</span>devices<span class="token punctuation">.</span>values<span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">if</span> d<span class="token punctuation">[</span><span class="token string">&#39;state&#39;</span><span class="token punctuation">]</span> <span class="token operator">==</span> <span class="token string">&#39;offline&#39;</span><span class="token punctuation">)</span><span class="token punctuation">,</span></span>
<span class="line">        <span class="token punctuation">}</span></span>
<span class="line">    <span class="token punctuation">}</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token decorator annotation punctuation">@app<span class="token punctuation">.</span>route</span><span class="token punctuation">(</span><span class="token string">&#39;/devices/reserve&#39;</span><span class="token punctuation">,</span> methods<span class="token operator">=</span><span class="token punctuation">[</span><span class="token string">&#39;POST&#39;</span><span class="token punctuation">]</span><span class="token punctuation">)</span></span>
<span class="line"><span class="token keyword">def</span> <span class="token function">reserve_device</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token triple-quoted-string string">&quot;&quot;&quot;预留一个设备&quot;&quot;&quot;</span></span>
<span class="line">    data <span class="token operator">=</span> request<span class="token punctuation">.</span>json</span>
<span class="line">    model <span class="token operator">=</span> data<span class="token punctuation">.</span>get<span class="token punctuation">(</span><span class="token string">&#39;model&#39;</span><span class="token punctuation">)</span></span>
<span class="line">    android_version <span class="token operator">=</span> data<span class="token punctuation">.</span>get<span class="token punctuation">(</span><span class="token string">&#39;android_version&#39;</span><span class="token punctuation">)</span></span>
<span class="line">    timeout <span class="token operator">=</span> data<span class="token punctuation">.</span>get<span class="token punctuation">(</span><span class="token string">&#39;timeout&#39;</span><span class="token punctuation">,</span> <span class="token number">30</span><span class="token punctuation">)</span>  <span class="token comment"># 秒</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment"># 轮询等待，直到找到可用设备或超时</span></span>
<span class="line">    start_time <span class="token operator">=</span> time<span class="token punctuation">.</span>time<span class="token punctuation">(</span><span class="token punctuation">)</span></span>
<span class="line">    <span class="token keyword">while</span> time<span class="token punctuation">.</span>time<span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">-</span> start_time <span class="token operator">&lt;</span> timeout<span class="token punctuation">:</span></span>
<span class="line">        serial <span class="token operator">=</span> pool<span class="token punctuation">.</span>reserve_device<span class="token punctuation">(</span><span class="token punctuation">{</span></span>
<span class="line">            <span class="token string">&#39;model&#39;</span><span class="token punctuation">:</span> model<span class="token punctuation">,</span></span>
<span class="line">            <span class="token string">&#39;android_version&#39;</span><span class="token punctuation">:</span> android_version</span>
<span class="line">        <span class="token punctuation">}</span><span class="token punctuation">)</span></span>
<span class="line">        </span>
<span class="line">        <span class="token keyword">if</span> serial<span class="token punctuation">:</span></span>
<span class="line">            <span class="token keyword">return</span> jsonify<span class="token punctuation">(</span><span class="token punctuation">{</span><span class="token string">&#39;status&#39;</span><span class="token punctuation">:</span> <span class="token string">&#39;ok&#39;</span><span class="token punctuation">,</span> <span class="token string">&#39;serial&#39;</span><span class="token punctuation">:</span> serial<span class="token punctuation">}</span><span class="token punctuation">)</span></span>
<span class="line">        </span>
<span class="line">        time<span class="token punctuation">.</span>sleep<span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>  <span class="token comment"># 等待 1 秒后重试</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">return</span> jsonify<span class="token punctuation">(</span><span class="token punctuation">{</span><span class="token string">&#39;status&#39;</span><span class="token punctuation">:</span> <span class="token string">&#39;error&#39;</span><span class="token punctuation">,</span> <span class="token string">&#39;reason&#39;</span><span class="token punctuation">:</span> <span class="token string">&#39;timeout&#39;</span><span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token number">503</span></span>
<span class="line"></span>
<span class="line"><span class="token decorator annotation punctuation">@app<span class="token punctuation">.</span>route</span><span class="token punctuation">(</span><span class="token string">&#39;/devices/&lt;serial&gt;/release&#39;</span><span class="token punctuation">,</span> methods<span class="token operator">=</span><span class="token punctuation">[</span><span class="token string">&#39;POST&#39;</span><span class="token punctuation">]</span><span class="token punctuation">)</span></span>
<span class="line"><span class="token keyword">def</span> <span class="token function">release_device</span><span class="token punctuation">(</span>serial<span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token triple-quoted-string string">&quot;&quot;&quot;释放一个设备&quot;&quot;&quot;</span></span>
<span class="line">    pool<span class="token punctuation">.</span>release_device<span class="token punctuation">(</span>serial<span class="token punctuation">)</span></span>
<span class="line">    <span class="token keyword">return</span> jsonify<span class="token punctuation">(</span><span class="token punctuation">{</span><span class="token string">&#39;status&#39;</span><span class="token punctuation">:</span> <span class="token string">&#39;ok&#39;</span><span class="token punctuation">}</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token decorator annotation punctuation">@app<span class="token punctuation">.</span>route</span><span class="token punctuation">(</span><span class="token string">&#39;/status&#39;</span><span class="token punctuation">,</span> methods<span class="token operator">=</span><span class="token punctuation">[</span><span class="token string">&#39;GET&#39;</span><span class="token punctuation">]</span><span class="token punctuation">)</span></span>
<span class="line"><span class="token keyword">def</span> <span class="token function">get_status</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token triple-quoted-string string">&quot;&quot;&quot;获取系统整体状态&quot;&quot;&quot;</span></span>
<span class="line">    <span class="token keyword">return</span> jsonify<span class="token punctuation">(</span>pool<span class="token punctuation">.</span>export_metrics<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">if</span> __name__ <span class="token operator">==</span> <span class="token string">&#39;__main__&#39;</span><span class="token punctuation">:</span></span>
<span class="line">    app<span class="token punctuation">.</span>run<span class="token punctuation">(</span>host<span class="token operator">=</span><span class="token string">&#39;0.0.0.0&#39;</span><span class="token punctuation">,</span> port<span class="token operator">=</span><span class="token number">5000</span><span class="token punctuation">,</span> threaded<span class="token operator">=</span><span class="token boolean">True</span><span class="token punctuation">)</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="第-3-部分-从-mvp-到完整系统-迭代路线" tabindex="-1"><a class="header-anchor" href="#第-3-部分-从-mvp-到完整系统-迭代路线"><span>第 3 部分：从 MVP 到完整系统（迭代路线）</span></a></h2><h3 id="迭代-1-多主机支持" tabindex="-1"><a class="header-anchor" href="#迭代-1-多主机支持"><span>迭代 1：多主机支持</span></a></h3><p><strong>MVP 的限制</strong>：单个 Windows 主机</p><p><strong>完整系统的方案</strong>：多个 Device Host</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐</span>
<span class="line">│ Device Host 1      │  │ Device Host 2      │  │ Device Host 3      │</span>
<span class="line">│ (IP: 192.168.1.100)│  │ (IP: 192.168.1.101)│  │ (IP: 192.168.1.102)│</span>
<span class="line">│                    │  │                    │  │                    │</span>
<span class="line">│ usbipd Server      │  │ usbipd Server      │  │ usbipd Server      │</span>
<span class="line">│ Port 3240          │  │ Port 3240          │  │ Port 3240          │</span>
<span class="line">│                    │  │                    │  │                    │</span>
<span class="line">│ 5× Pixel           │  │ 3× OnePlus         │  │ 2× Samsung         │</span>
<span class="line">└────────────────────┘  └────────────────────┘  └────────────────────┘</span>
<span class="line">         │                      │                      │</span>
<span class="line">         └──────────────────────┼──────────────────────┘</span>
<span class="line">                                │</span>
<span class="line">                    ┌───────────▼───────────┐</span>
<span class="line">                    │  Central Manager      │</span>
<span class="line">                    │  (Linux)              │</span>
<span class="line">                    │                       │</span>
<span class="line">                    │ Multi-Host Sync       │</span>
<span class="line">                    │ - 定期拉取每个主机的   │</span>
<span class="line">                    │   设备列表              │</span>
<span class="line">                    │ - 合并到统一资源池     │</span>
<span class="line">                    │ - 智能负载均衡         │</span>
<span class="line">                    └───────────────────────┘</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>关键组件</strong>：</p><ol><li><strong>Host Registry</strong>：维护所有 Device Host 的地址和状态</li><li><strong>Device Aggregator</strong>：定期从每个主机拉取设备列表</li><li><strong>Smart Attach</strong>：当预留设备时，自动选择最空闲的主机并 attach</li></ol><h3 id="迭代-2-用户权限和租赁" tabindex="-1"><a class="header-anchor" href="#迭代-2-用户权限和租赁"><span>迭代 2：用户权限和租赁</span></a></h3><p><strong>新增特性</strong>：设备租赁（Lease）模型</p><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token decorator annotation punctuation">@dataclass</span></span>
<span class="line"><span class="token keyword">class</span> <span class="token class-name">Lease</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token builtin">id</span><span class="token punctuation">:</span> <span class="token builtin">str</span>                    <span class="token comment"># 租赁 ID</span></span>
<span class="line">    device_serial<span class="token punctuation">:</span> <span class="token builtin">str</span>         <span class="token comment"># 设备序列号</span></span>
<span class="line">    reserved_by<span class="token punctuation">:</span> <span class="token builtin">str</span>           <span class="token comment"># 租赁人（用户/流程名）</span></span>
<span class="line">    start_time<span class="token punctuation">:</span> datetime       <span class="token comment"># 开始时间</span></span>
<span class="line">    expected_duration<span class="token punctuation">:</span> <span class="token builtin">int</span>     <span class="token comment"># 预期租赁时长（秒）</span></span>
<span class="line">    status<span class="token punctuation">:</span> <span class="token builtin">str</span>                <span class="token comment"># active / expired / released</span></span>
<span class="line">    </span>
<span class="line"><span class="token keyword">class</span> <span class="token class-name">DevicePool</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token keyword">def</span> <span class="token function">reserve_device_with_lease</span><span class="token punctuation">(</span>self<span class="token punctuation">,</span> user_id<span class="token punctuation">:</span> <span class="token builtin">str</span><span class="token punctuation">,</span> duration_sec<span class="token punctuation">:</span> <span class="token builtin">int</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">        <span class="token triple-quoted-string string">&quot;&quot;&quot;预留设备并创建租赁记录&quot;&quot;&quot;</span></span>
<span class="line">        serial <span class="token operator">=</span> self<span class="token punctuation">.</span>reserve_device<span class="token punctuation">(</span><span class="token punctuation">)</span></span>
<span class="line">        </span>
<span class="line">        lease <span class="token operator">=</span> Lease<span class="token punctuation">(</span></span>
<span class="line">            <span class="token builtin">id</span><span class="token operator">=</span><span class="token builtin">str</span><span class="token punctuation">(</span>uuid<span class="token punctuation">.</span>uuid4<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span></span>
<span class="line">            device_serial<span class="token operator">=</span>serial<span class="token punctuation">,</span></span>
<span class="line">            reserved_by<span class="token operator">=</span>user_id<span class="token punctuation">,</span></span>
<span class="line">            start_time<span class="token operator">=</span>datetime<span class="token punctuation">.</span>now<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span></span>
<span class="line">            expected_duration<span class="token operator">=</span>duration_sec</span>
<span class="line">        <span class="token punctuation">)</span></span>
<span class="line">        </span>
<span class="line">        self<span class="token punctuation">.</span>leases<span class="token punctuation">[</span>lease<span class="token punctuation">.</span><span class="token builtin">id</span><span class="token punctuation">]</span> <span class="token operator">=</span> lease</span>
<span class="line">        <span class="token keyword">return</span> lease</span>
<span class="line"></span>
<span class="line">    <span class="token keyword">def</span> <span class="token function">enforce_lease_timeout</span><span class="token punctuation">(</span>self<span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">        <span class="token triple-quoted-string string">&quot;&quot;&quot;后台线程：强制执行租赁超时&quot;&quot;&quot;</span></span>
<span class="line">        <span class="token keyword">while</span> <span class="token boolean">True</span><span class="token punctuation">:</span></span>
<span class="line">            time<span class="token punctuation">.</span>sleep<span class="token punctuation">(</span><span class="token number">30</span><span class="token punctuation">)</span></span>
<span class="line">            </span>
<span class="line">            <span class="token keyword">for</span> lease_id<span class="token punctuation">,</span> lease <span class="token keyword">in</span> self<span class="token punctuation">.</span>leases<span class="token punctuation">.</span>items<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">                <span class="token keyword">if</span> lease<span class="token punctuation">.</span>status <span class="token operator">!=</span> <span class="token string">&#39;active&#39;</span><span class="token punctuation">:</span></span>
<span class="line">                    <span class="token keyword">continue</span></span>
<span class="line">                </span>
<span class="line">                elapsed <span class="token operator">=</span> <span class="token punctuation">(</span>datetime<span class="token punctuation">.</span>now<span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">-</span> lease<span class="token punctuation">.</span>start_time<span class="token punctuation">)</span><span class="token punctuation">.</span>total_seconds<span class="token punctuation">(</span><span class="token punctuation">)</span></span>
<span class="line">                <span class="token keyword">if</span> elapsed <span class="token operator">&gt;</span> lease<span class="token punctuation">.</span>expected_duration <span class="token operator">*</span> <span class="token number">1.5</span><span class="token punctuation">:</span>  <span class="token comment"># 允许 50% 超期</span></span>
<span class="line">                    <span class="token comment"># 强制释放</span></span>
<span class="line">                    self<span class="token punctuation">.</span>release_device<span class="token punctuation">(</span>lease<span class="token punctuation">.</span>device_serial<span class="token punctuation">)</span></span>
<span class="line">                    lease<span class="token punctuation">.</span>status <span class="token operator">=</span> <span class="token string">&#39;expired&#39;</span></span>
<span class="line">                    </span>
<span class="line">                    alert<span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;Lease </span><span class="token interpolation"><span class="token punctuation">{</span>lease_id<span class="token punctuation">}</span></span><span class="token string"> expired, device released&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="迭代-3-故障转移和自动恢复" tabindex="-1"><a class="header-anchor" href="#迭代-3-故障转移和自动恢复"><span>迭代 3：故障转移和自动恢复</span></a></h3><p><strong>新增特性</strong>：当设备故障时，自动转移到其他主机的相同设备</p><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token keyword">class</span> <span class="token class-name">SmartDevicePool</span><span class="token punctuation">(</span>DevicePool<span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token keyword">def</span> <span class="token function">get_similar_device</span><span class="token punctuation">(</span>self<span class="token punctuation">,</span> serial<span class="token punctuation">:</span> <span class="token builtin">str</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">        <span class="token triple-quoted-string string">&quot;&quot;&quot;找到一个相同型号的设备&quot;&quot;&quot;</span></span>
<span class="line">        device <span class="token operator">=</span> self<span class="token punctuation">.</span>devices<span class="token punctuation">[</span>serial<span class="token punctuation">]</span></span>
<span class="line">        </span>
<span class="line">        <span class="token comment"># 查找其他在线的相同设备</span></span>
<span class="line">        <span class="token keyword">for</span> d <span class="token keyword">in</span> self<span class="token punctuation">.</span>devices<span class="token punctuation">.</span>values<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">            <span class="token keyword">if</span> <span class="token punctuation">(</span>d<span class="token punctuation">[</span><span class="token string">&#39;model&#39;</span><span class="token punctuation">]</span> <span class="token operator">==</span> device<span class="token punctuation">[</span><span class="token string">&#39;model&#39;</span><span class="token punctuation">]</span> <span class="token keyword">and</span> </span>
<span class="line">                d<span class="token punctuation">[</span><span class="token string">&#39;android_version&#39;</span><span class="token punctuation">]</span> <span class="token operator">==</span> device<span class="token punctuation">[</span><span class="token string">&#39;android_version&#39;</span><span class="token punctuation">]</span> <span class="token keyword">and</span></span>
<span class="line">                d<span class="token punctuation">[</span><span class="token string">&#39;state&#39;</span><span class="token punctuation">]</span> <span class="token operator">==</span> <span class="token string">&#39;idle&#39;</span> <span class="token keyword">and</span></span>
<span class="line">                d<span class="token punctuation">[</span><span class="token string">&#39;host_ip&#39;</span><span class="token punctuation">]</span> <span class="token operator">!=</span> device<span class="token punctuation">[</span><span class="token string">&#39;host_ip&#39;</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">:</span>  <span class="token comment"># 不同主机</span></span>
<span class="line">                <span class="token keyword">return</span> d</span>
<span class="line">        </span>
<span class="line">        <span class="token keyword">return</span> <span class="token boolean">None</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">def</span> <span class="token function">handle_device_failure</span><span class="token punctuation">(</span>self<span class="token punctuation">,</span> serial<span class="token punctuation">:</span> <span class="token builtin">str</span><span class="token punctuation">,</span> test_context<span class="token punctuation">:</span> <span class="token builtin">dict</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">        <span class="token triple-quoted-string string">&quot;&quot;&quot;</span>
<span class="line">        设备故障处理：</span>
<span class="line">        1. 尝试恢复原设备</span>
<span class="line">        2. 如果失败，转移到备用设备</span>
<span class="line">        3. 通知测试框架</span>
<span class="line">        &quot;&quot;&quot;</span></span>
<span class="line">        device <span class="token operator">=</span> self<span class="token punctuation">.</span>devices<span class="token punctuation">[</span>serial<span class="token punctuation">]</span></span>
<span class="line">        </span>
<span class="line">        <span class="token comment"># 1. 尝试本地恢复（2 次）</span></span>
<span class="line">        <span class="token keyword">for</span> attempt <span class="token keyword">in</span> <span class="token builtin">range</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">            self<span class="token punctuation">.</span>_try_recovery<span class="token punctuation">(</span>serial<span class="token punctuation">)</span></span>
<span class="line">            <span class="token keyword">if</span> self<span class="token punctuation">.</span>_ping_device<span class="token punctuation">(</span>serial<span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">                <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;Recovery succeeded for </span><span class="token interpolation"><span class="token punctuation">{</span>serial<span class="token punctuation">}</span></span><span class="token string">&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line">                <span class="token keyword">return</span> <span class="token boolean">None</span>  <span class="token comment"># 恢复成功</span></span>
<span class="line">        </span>
<span class="line">        <span class="token comment"># 2. 尝试自动转移</span></span>
<span class="line">        alternative <span class="token operator">=</span> self<span class="token punctuation">.</span>get_similar_device<span class="token punctuation">(</span>serial<span class="token punctuation">)</span></span>
<span class="line">        <span class="token keyword">if</span> alternative<span class="token punctuation">:</span></span>
<span class="line">            <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;Failover: </span><span class="token interpolation"><span class="token punctuation">{</span>serial<span class="token punctuation">}</span></span><span class="token string"> -&gt; </span><span class="token interpolation"><span class="token punctuation">{</span>alternative<span class="token punctuation">[</span><span class="token string">&#39;serial&#39;</span><span class="token punctuation">]</span><span class="token punctuation">}</span></span><span class="token string">&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line">            <span class="token comment"># 强制释放故障设备</span></span>
<span class="line">            self<span class="token punctuation">.</span>devices<span class="token punctuation">[</span>serial<span class="token punctuation">]</span><span class="token punctuation">[</span><span class="token string">&#39;state&#39;</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token string">&#39;offline&#39;</span></span>
<span class="line">            <span class="token comment"># 预留备用设备</span></span>
<span class="line">            self<span class="token punctuation">.</span>reserve_device<span class="token punctuation">(</span><span class="token punctuation">{</span><span class="token string">&#39;model&#39;</span><span class="token punctuation">:</span> device<span class="token punctuation">[</span><span class="token string">&#39;model&#39;</span><span class="token punctuation">]</span><span class="token punctuation">}</span><span class="token punctuation">)</span></span>
<span class="line">            <span class="token keyword">return</span> alternative<span class="token punctuation">[</span><span class="token string">&#39;serial&#39;</span><span class="token punctuation">]</span></span>
<span class="line">        </span>
<span class="line">        <span class="token comment"># 3. 没有备用设备</span></span>
<span class="line">        <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;No similar device available for failover&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line">        <span class="token keyword">return</span> <span class="token boolean">None</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="迭代-4-自动扩展和容量规划" tabindex="-1"><a class="header-anchor" href="#迭代-4-自动扩展和容量规划"><span>迭代 4：自动扩展和容量规划</span></a></h3><p><strong>新增特性</strong>：监控设备利用率，提示运维何时添加新设备</p><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token keyword">def</span> <span class="token function">capacity_analysis</span><span class="token punctuation">(</span>self<span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token triple-quoted-string string">&quot;&quot;&quot;容量分析：预测是否需要扩展&quot;&quot;&quot;</span></span>
<span class="line">    <span class="token comment"># 1. 计算利用率指标</span></span>
<span class="line">    total <span class="token operator">=</span> <span class="token builtin">len</span><span class="token punctuation">(</span>self<span class="token punctuation">.</span>devices<span class="token punctuation">)</span></span>
<span class="line">    idle <span class="token operator">=</span> <span class="token builtin">sum</span><span class="token punctuation">(</span><span class="token number">1</span> <span class="token keyword">for</span> d <span class="token keyword">in</span> self<span class="token punctuation">.</span>devices<span class="token punctuation">.</span>values<span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">if</span> d<span class="token punctuation">[</span><span class="token string">&#39;state&#39;</span><span class="token punctuation">]</span> <span class="token operator">==</span> <span class="token string">&#39;idle&#39;</span><span class="token punctuation">)</span></span>
<span class="line">    utilization <span class="token operator">=</span> <span class="token punctuation">(</span>total <span class="token operator">-</span> idle<span class="token punctuation">)</span> <span class="token operator">/</span> total <span class="token keyword">if</span> total <span class="token operator">&gt;</span> <span class="token number">0</span> <span class="token keyword">else</span> <span class="token number">0</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment"># 2. 分析预留等待时间（过去 1 小时）</span></span>
<span class="line">    recent_waits <span class="token operator">=</span> self<span class="token punctuation">.</span>_get_reservation_wait_times<span class="token punctuation">(</span>hours<span class="token operator">=</span><span class="token number">1</span><span class="token punctuation">)</span></span>
<span class="line">    avg_wait <span class="token operator">=</span> <span class="token builtin">sum</span><span class="token punctuation">(</span>recent_waits<span class="token punctuation">)</span> <span class="token operator">/</span> <span class="token builtin">len</span><span class="token punctuation">(</span>recent_waits<span class="token punctuation">)</span> <span class="token keyword">if</span> recent_waits <span class="token keyword">else</span> <span class="token number">0</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment"># 3. 触发告警的条件</span></span>
<span class="line">    <span class="token keyword">if</span> utilization <span class="token operator">&gt;</span> <span class="token number">0.9</span><span class="token punctuation">:</span></span>
<span class="line">        alert<span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;Device utilization too high: </span><span class="token interpolation"><span class="token punctuation">{</span>utilization<span class="token operator">*</span><span class="token number">100</span><span class="token punctuation">:</span><span class="token format-spec">.1f</span><span class="token punctuation">}</span></span><span class="token string">%&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line">    </span>
<span class="line">    <span class="token keyword">if</span> avg_wait <span class="token operator">&gt;</span> <span class="token number">60</span><span class="token punctuation">:</span>  <span class="token comment"># 平均等待超过 1 分钟</span></span>
<span class="line">        alert<span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;Average reservation wait time: </span><span class="token interpolation"><span class="token punctuation">{</span>avg_wait<span class="token punctuation">}</span></span><span class="token string">s (recommend +3 devices)&quot;</span></span><span class="token punctuation">)</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment"># 4. 生成容量规划报告</span></span>
<span class="line">    <span class="token keyword">return</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token string">&#39;current_devices&#39;</span><span class="token punctuation">:</span> total<span class="token punctuation">,</span></span>
<span class="line">        <span class="token string">&#39;utilization&#39;</span><span class="token punctuation">:</span> utilization<span class="token punctuation">,</span></span>
<span class="line">        <span class="token string">&#39;avg_wait_time&#39;</span><span class="token punctuation">:</span> avg_wait<span class="token punctuation">,</span></span>
<span class="line">        <span class="token string">&#39;recommended_devices&#39;</span><span class="token punctuation">:</span> self<span class="token punctuation">.</span>_calculate_needed_capacity<span class="token punctuation">(</span><span class="token punctuation">)</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">def</span> <span class="token function">_calculate_needed_capacity</span><span class="token punctuation">(</span>self<span class="token punctuation">)</span><span class="token punctuation">:</span></span>
<span class="line">    <span class="token triple-quoted-string string">&quot;&quot;&quot;根据历史数据和增长趋势，推荐需要多少设备&quot;&quot;&quot;</span></span>
<span class="line">    <span class="token comment"># 简单方案：确保 p99 的预留延迟 &lt; 30 秒</span></span>
<span class="line">    peak_utilization <span class="token operator">=</span> self<span class="token punctuation">.</span>_get_peak_utilization<span class="token punctuation">(</span>hours<span class="token operator">=</span><span class="token number">24</span><span class="token punctuation">)</span></span>
<span class="line">    </span>
<span class="line">    <span class="token comment"># Little&#39;s Law: L = λ * W</span></span>
<span class="line">    <span class="token comment"># L: 平均占用设备数</span></span>
<span class="line">    <span class="token comment"># λ: 预留速率（requests/sec）</span></span>
<span class="line">    <span class="token comment"># W: 测试平均耗时（sec）</span></span>
<span class="line">    </span>
<span class="line">    needed_devices <span class="token operator">=</span> ceil<span class="token punctuation">(</span>peak_utilization <span class="token operator">/</span> <span class="token punctuation">(</span><span class="token number">1</span> <span class="token operator">-</span> target_wait_ratio<span class="token punctuation">)</span><span class="token punctuation">)</span></span>
<span class="line">    <span class="token keyword">return</span> needed_devices</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="第-4-部分-完整系统的高可用部署" tabindex="-1"><a class="header-anchor" href="#第-4-部分-完整系统的高可用部署"><span>第 4 部分：完整系统的高可用部署</span></a></h2><h3 id="完整架构-生产就绪" tabindex="-1"><a class="header-anchor" href="#完整架构-生产就绪"><span>完整架构（生产就绪）</span></a></h3><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">┌─────────────────────────────────────────────────────────────┐</span>
<span class="line">│                    Load Balancer (nginx)                     │</span>
<span class="line">│                    (Port 80/443)                             │</span>
<span class="line">└────────────┬──────────────────────────────────┬──────────────┘</span>
<span class="line">             │                                  │</span>
<span class="line">    ┌────────▼────────┐              ┌─────────▼────────┐</span>
<span class="line">    │  Manager-1      │              │  Manager-2       │</span>
<span class="line">    │  (Primary)      │              │  (Backup)        │</span>
<span class="line">    │                 │              │                  │</span>
<span class="line">    │ Device Pool API │              │ Device Pool API  │</span>
<span class="line">    │ Health Check    │              │ Health Check     │</span>
<span class="line">    │ State Sync      │◄──────────────►│ State Sync       │</span>
<span class="line">    └────────┬────────┘              └─────────┬────────┘</span>
<span class="line">             │                                  │</span>
<span class="line">             │ ┌──────────────────────────────┘</span>
<span class="line">             │ │</span>
<span class="line">             └─┴─► Distributed Cache (Redis)</span>
<span class="line">                  {device_state, leases, ...}</span>
<span class="line">    </span>
<span class="line">    ┌────────────────────────────────────────┐</span>
<span class="line">    │   Monitoring &amp; Alerting                │</span>
<span class="line">    │   - Prometheus (metrics export)        │</span>
<span class="line">    │   - Grafana (visualization)            │</span>
<span class="line">    │   - PagerDuty (on-call alerts)        │</span>
<span class="line">    └────────────────────────────────────────┘</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="可靠性指标" tabindex="-1"><a class="header-anchor" href="#可靠性指标"><span>可靠性指标</span></a></h3><table><thead><tr><th>指标</th><th>MVP</th><th>完整系统</th></tr></thead><tbody><tr><td><strong>可用性</strong></td><td>95%</td><td>99.5%</td></tr><tr><td><strong>MTTR</strong>(故障恢复时间)</td><td>5+ 分钟</td><td>&lt; 1 分钟</td></tr><tr><td><strong>单点故障</strong></td><td>存在</td><td>无（冗余设计）</td></tr><tr><td><strong>设备故障转移</strong></td><td>手工</td><td>自动</td></tr><tr><td><strong>容量规划</strong></td><td>手工</td><td>自动建议</td></tr></tbody></table><hr><h2 id="总结-从-mvp-到完整系统" tabindex="-1"><a class="header-anchor" href="#总结-从-mvp-到完整系统"><span>总结：从 MVP 到完整系统</span></a></h2><table><thead><tr><th>阶段</th><th>范围</th><th>关键工作</th><th>完成时间</th></tr></thead><tbody><tr><td><strong>MVP</strong></td><td>单主机，≤10 台设备</td><td>核心预留/释放、健康检查</td><td>1-2 周</td></tr><tr><td><strong>迭代 1</strong></td><td>多主机支持</td><td>Host registry、Device aggregator</td><td>1 周</td></tr><tr><td><strong>迭代 2</strong></td><td>权限和租赁</td><td>User isolation、Lease enforcement</td><td>1 周</td></tr><tr><td><strong>迭代 3</strong></td><td>故障转移</td><td>Failover logic、Similar device detection</td><td>1 周</td></tr><tr><td><strong>迭代 4</strong></td><td>自动扩展</td><td>Capacity analysis、Metrics export</td><td>1 周</td></tr><tr><td><strong>生产就绪</strong></td><td>高可用</td><td>Load balancer、Redis、Monitoring</td><td>2 周</td></tr></tbody></table><p><strong>推荐策略</strong>：</p><ol><li>先上线 MVP（2 周），验证核心价值</li><li>根据实际使用反馈，优先做「用户投诉最多的」功能</li><li>不必一次实现所有功能，逐步演进</li></ol><hr><h2 id="下一步" tabindex="-1"><a class="header-anchor" href="#下一步"><span>下一步</span></a></h2>`,73)),s("p",null,[i(e,{to:"/posts/device-farm-implementation.html"},{default:c(()=>[...n[0]||(n[0]=[a("第三部分",-1)])]),_:1}),n[1]||(n[1]=a(" 我们将讲解如何从零开始",-1)),n[2]||(n[2]=s("strong",null,"实现",-1)),n[3]||(n[3]=a("这个系统，包括完整代码、部署脚本和运维手册。",-1))]),n[5]||(n[5]=s("hr",null,null,-1)),n[6]||(n[6]=s("p",null,[s("em",null,"本文最后更新于 2024-05-23")],-1))])}const m=p(r,[["render",d]]),b=JSON.parse('{"path":"/posts/device-farm-design.html","title":"Android Device Farm 系统设计 (2): MVP 到完整架构","lang":"zh-CN","frontmatter":{"title":"Android Device Farm 系统设计 (2): MVP 到完整架构","date":"2024-05-23T00:00:00.000Z","author":"dvdface","tags":["Android","Device Farm","系统设计","自动化测试","架构"]},"git":{"contributors":[{"name":"BlogBot","username":"BlogBot","email":"bot@example.com","commits":1,"url":"https://github.com/BlogBot"}],"changelog":[{"hash":"00aefd6add2acc77a9630baf3b5ef383ed85e397","time":1779591381000,"email":"bot@example.com","author":"BlogBot","message":"docs: 更新首页 - 添加 Device Farm 系列导航和特性展示"}]},"filePathRelative":"posts/device-farm-design.md"}');export{m as comp,b as data};
