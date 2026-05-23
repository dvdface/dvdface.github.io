---
title: "USB/IP 完全指南 (1): 原理、命令与实践"
date: 2024-05-23
author: dvdface
tags: [Android, USB/IP, Device Farm, 网络共享]
---

# USB/IP 完全指南 (1)：原理、命令与实践

> 本文是 Android Device Farm 系列的第一部分。我们从 USB/IP 的诞生背景开始，逐步深入命令使用，最后通过实际示例演示如何用 USB/IP 共享 Android 设备。

## 前置背景：为什么需要 USB/IP？

### 问题场景

想象以下场景：

- **多人开发**：团队 5 个开发者，但只有 3 部 Pixel 手机。开发者 A 在用手机时，开发者 B 和 C 无法进行测试。
- **自动化测试**：CI/CD 流水线需要在 10 部不同型号的 Android 设备上跑测试，但办公室只有 3 部设备连接在某个工作站上。
- **远程工作**：你在家，但公司的高端测试机房有 20 部设备，无法物理携带。
- **多位置部署**：在北京、上海、深圳都有办公点，每个地方只有几部设备，但希望统一管理。

**传统解决方案**：
- 每个开发者配置一部手机（成本高，管理复杂）
- 轮流使用（效率低）
- 手工搬运设备（容易损坏）

**USB/IP 解决方案**：
一台主机连接 N 部物理 USB 设备，通过网络将这些设备"虚拟化"共享给其他机器，就像设备连接在本地一样。

---

## USB/IP 的演进历史

### 起源：Linux 内核项目 (2000s)

USB/IP 最初是日本产业技术综合研究所（AIST）的一个开源项目，用于在 Linux 系统间通过网络共享 USB 设备。

**核心想法**：
- USB 本质上就是一个"请求-响应"协议
- 为什么不能把这些请求通过网络传输呢？

**关键里程碑**：
| 时间 | 事件 |
|------|------|
| ~2003 | USB/IP 概念提出，Linux 社区开发 |
| 2013 | 进入 Linux 内核主线（`drivers/usb/usbip/`） |
| 2017 | 微软开始支持 WSL 1 |
| 2019 | **Project USBIP for Windows** 启动（dorssel 开源版本） |
| 2022 | Windows 11 官方支持，`usbipd-win` 成为标准工具 |

### 为什么现在才流行？

1. **容器化和虚拟化时代**：Docker、Kubernetes、WSL 2 让开发环境更加灵活，远程设备共享的需求暴增。
2. **自动化测试爆炸**：移动应用测试需要真实设备，云测试平台 (Amazon Device Farm、Saucelabs 等) 用 USB/IP 作为核心技术。
3. **硬件成本**：高端测试设备（如最新的 iPhone、Pixel）价格昂贵，集中采购共享比分散部署便宜。
4. **微软开源支持**：Project USBIP for Windows 降低了 Windows 用户的使用门槛。

---

## USB/IP 的工作原理

### 架构简图

```
┌─────────────────────────────────────────────────────────┐
│                    局域网 (Gigabit Ethernet)              │
└────────────┬──────────────────────────────┬──────────────┘
             │                              │
    ┌────────▼─────────┐          ┌────────▼─────────┐
    │  Device Host     │          │   Test Machine   │
    │  (Server Side)   │          │  (Client Side)   │
    │                  │          │                  │
    │  ┌──────────┐    │          │  ┌────────────┐  │
    │  │ usbipd   │    │          │  │ usbip cli  │  │
    │  │ (Server) │    │          │  │ (Client)   │  │
    │  └──────────┘    │          │  └────────────┘  │
    │       △          │          │        △         │
    │       │          │          │        │         │
    │       │ USB      │          │        │         │
    │  ┌────┴────┐     │          │        │ ADB     │
    │  │ Phone 1 │     │          │    ┌───┴──────┐  │
    │  │ Phone 2 │     │          │    │ Virtual  │  │
    │  │ Phone 3 │     │          │    │ USB Dev  │  │
    │  └─────────┘     │          │    └──────────┘  │
    │                  │          │                  │
    └──────────────────┘          └──────────────────┘
         Port 3240 (TCP)
```

### 核心概念

**1. 设备共享的两个角色**

| 角色 | 组件 | 功能 |
|------|------|------|
| **Server (设备拥有者)** | `usbipd` | 监听本地 USB 设备，通过网络暴露它们 |
| **Client (设备使用者)** | `usbip` (Linux) / `usbipd-win` | 通过网络连接到 Server，将远程设备本地化 |

**2. 设备生命周期**

```
NOT SHARED          SHARED              ATTACHED
   ↓                  ↓                    ↓
┌──────┐      ┌────────────┐       ┌──────────┐
│ 本地 │ bind │ Server暴露 │ attach│ 本地可用 │
│ USB  │ ---> │  (port     │ ----->│ (ADB等) │
│ 设备 │      │  3240)     │       │ 可见    │
└──────┘      └────────────┘       └──────────┘
```

三个状态的转换命令：
```bash
# NOT SHARED → SHARED
usbipd bind -b <BUS_ID>

# SHARED → ATTACHED (Server 端)
usbipd attach -r <CLIENT_IP> -b <BUS_ID>

# ATTACHED → SHARED (Client 端)
usbip attach -r <SERVER_IP> -b <BUS_ID>

# 回退
usbipd detach -b <BUS_ID>
usbipd unbind -b <BUS_ID>
```

**3. USB 请求的网络封装**

USB/IP 不是直接复制 USB 数据流，而是：

1. **Server 端**：拦截发往 USB 设备的请求（URBs：USB Request Blocks）
2. **编码**：将请求序列化成 TCP 包
3. **传输**：通过网络发送到 Client
4. **Client 端**：解码请求，虚拟化为本地 USB 设备
5. **响应**：逆过程返回结果

```
┌─────────────────────────────────────────────────────────┐
│  USB Request (URB):                                      │
│  ┌──────────────┬──────────┬────────┬──────────────┐   │
│  │ Direction    │ Type     │ Data   │ Timeout      │   │
│  │ (IN/OUT)     │ (CTRL..) │ ...    │              │   │
│  └──────────────┴──────────┴────────┴──────────────┘   │
│                          ↓                              │
│              TCP Packet Encapsulation                   │
│                          ↓                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ usbip_header (cmd, devid, seqnum, ...)         │   │
│  │ + payload (request data)                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Windows 和 Linux 上的 USB/IP 实现

### Windows: usbipd-win

**特点**：
- 由 Dorssel（社区开发者）主导的开源项目
- 现已成为 Windows 上的标准方案
- 与 WSL 2 无缝集成（开发者常用）

**安装**：
```powershell
# 从 GitHub 下载最新 Release
# https://github.com/dorssel/usbipd-win/releases

# 安装 .msi 文件后，验证
usbipd --version
# usbipd-win 5.1.0
```

**版本区别**：

| 版本 | 时间 | 特性 | 推荐场景 |
|------|------|------|--------|
| 4.x | 2021-2022 | 基础功能，不够稳定 | 已淘汰 |
| 5.0 | 2023 | 策略管理、自动重连 | 稳定生产环境 |
| 5.1+ | 2024 | IPv6、更好的错误处理 | **推荐** |

### Linux: usbip-utils + 内核模块

**特点**：
- 集成在 Linux 内核中
- 需要手工编译和加载模块
- 支持所有 Linux 发行版（Ubuntu、Debian、CentOS 等）

**安装**：
```bash
# Ubuntu/Debian
sudo apt-get install usbip

# CentOS/RHEL
sudo yum install usbip

# 验证
usbip --version
# usbip (usbip-utils) [版本号]

# 加载内核模块
sudo modprobe usbip_host
sudo modprobe vhci_hcd
```

**架构对比**：

| 特性 | Windows (usbipd-win) | Linux (usbip-utils) |
|------|-------|---------|
| **安装复杂度** | 极简（一键 .msi） | 中等（需要模块） |
| **性能** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **稳定性** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **隔离性** | 良好（WSL 2 友好） | 优秀（原生支持） |
| **调试困难度** | 简单 | 中等（需要内核日志） |

---

## USB/IP 命令完全参考

### usbipd（Server 端命令）

#### 1. `usbipd list` - 列出所有 USB 设备

```powershell
usbipd list
```

**输出示例**：
```
BUSID  VID:PID    DEVICE                                STATE
1-1    18d1:4ee1  Google Inc. Pixel 6 Pro              Not shared
1-2    05ac:2c0c  Apple Inc. iPhone 14                 Not shared
1-3    2717:ff40  OnePlus OnePlus 10 Pro 5G            Shared
2-1    0e8d:0003  MediaTek USB VCOM                    Shared
```

**字段解释**：
- `BUSID`：USB 总线 ID（后续命令使用）
- `VID:PID`：Vendor ID 和 Product ID（设备唯一标识）
- `DEVICE`：设备名称
- `STATE`：
  - `Not shared`：本地 Windows 管理
  - `Shared`：已 bind，可以被 attach
  - `Attached`：已被 Client 连接

#### 2. `usbipd bind` - 绑定设备

```powershell
# 按 BUSID 绑定
usbipd bind -b 1-1

# 按 VID:PID 绑定
usbipd bind --vid 18d1 --pid 4ee1

# 批量绑定（脚本中常用）
@("1-1", "1-2", "2-1") | ForEach-Object { usbipd bind -b $_ }
```

**bind 做了什么**？
- 将设备的驱动控制权从 Windows 转移给 usbipd
- 设备状态变为 `Shared`
- 设备暂时不能在 Windows 本地使用（会在设备管理器中显示黄色感叹号）

**注意**：需要**管理员权限**。

#### 3. `usbipd attach` - 连接到 Client

```powershell
# 基础用法：attach 给某个 IP 的 Client
usbipd attach -r 192.168.1.50 -b 1-1

# attach 给本地 WSL 2
usbipd attach -r 127.0.0.1 -b 1-1

# 按 VID:PID 指定设备
usbipd attach -r 192.168.1.50 --vid 18d1 --pid 4ee1

# 批量 attach（常见在自动化脚本中）
@("1-1", "1-2", "1-3") | ForEach-Object { 
    usbipd attach -r 192.168.1.50 -b $_
    Start-Sleep -Seconds 1  # 避免请求风暴
}
```

**attach 后的行为**：
- Client 机器上，设备在几秒内出现（如 `adb devices` 可见）
- Server 和 Client 之间保持 TCP 连接
- 如果网络中断，attach 会断裂

#### 4. `usbipd detach` - 断开连接

```powershell
# 从指定 Client 断开
usbipd detach -r 192.168.1.50 -b 1-1

# 不指定 Client IP，直接断开（如果只有一个 Client）
usbipd detach -b 1-1
```

**detach 后的状态**：
- 设备回到 `Shared` 状态
- 可以被其他 Client attach，或者 unbind 回 Windows

#### 5. `usbipd unbind` - 解绑设备

```powershell
usbipd unbind -b 1-1
```

**unbind 做了什么**？
- 将设备控制权交还给 Windows
- 设备状态变为 `Not shared`
- 设备恢复在 Windows 本地可用

**unbind 通常在以下场景**：
- 不再需要共享该设备
- 想在 Windows 本地使用该设备
- 设备故障排查

#### 6. `usbipd state` - 查看全局状态

```powershell
usbipd state
```

**输出示例**（JSON 格式）：
```json
{
  "devices": [
    {
      "busid": "1-1",
      "vid": "18d1",
      "pid": "4ee1",
      "state": "Shared",
      "attachedClient": "192.168.1.50"
    }
  ]
}
```

**用途**：
- 脚本化查询（可以解析 JSON）
- 监控系统集成
- 故障诊断

#### 7. `usbipd policy` - 访问控制策略

```powershell
# 列出现有策略
usbipd policy list

# 允许特定用户访问特定设备
usbipd policy add --vid 18d1 --pid 4ee1 --user <USERNAME>

# 允许特定 Client IP 访问
usbipd policy add -b 1-1 --client 192.168.1.50

# 删除策略
usbipd policy remove --vid 18d1 --pid 4ee1
```

**为什么需要策略？**
- **安全性**：防止未授权的 Client 连接
- **防误操作**：仅允许特定用户 bind/attach
- **多用户场景**：在公共设备池中隔离权限

### usbip（Client 端命令，Linux/WSL）

#### 1. `usbip list -r <SERVER_IP>` - 列出 Server 的设备

```bash
usbip list -r 192.168.1.100
```

**输出示例**：
```
Exportable USB devices
======================
 - 192.168.1.100:1-1
   MediaTek Inc. Adb Interface (18d1:4ee1)

 - 192.168.1.100:1-2
   Apple Inc. iPhone 14 (05ac:2c0c)
```

#### 2. `usbip attach -r <SERVER_IP> -b <BUS_ID>` - 连接设备

```bash
# 连接单个设备
usbip attach -r 192.168.1.100 -b 1-1

# Client 端需要 root 权限
sudo usbip attach -r 192.168.1.100 -b 1-1
```

**attach 完成后**：
```bash
# 验证 ADB 可见设备
adb devices

# 输出应该看到远程设备（通过 USB/IP 连接）
List of attached devices
emulator-5554          device
FA9BF0A0              device   # 这个就是通过 USB/IP 连接的
```

#### 3. `usbip detach -p <PORT>` - 断开连接

```bash
# 查看已连接的端口
sudo usbip port

# 输出示例
Imported USB devices
====================
Port 00: <busid>1-1</busid> (18d1:4ee1)
       -> usbip://192.168.1.100:3240/1-1

# 断开 Port 00
sudo usbip detach -p 00
```

---

## 实战示例

### 场景 1：本地开发 - Windows + WSL 2

**目标**：在 WSL 2 中使用 Windows 主机上的 USB 设备。

**步骤**：

1. **Windows 主机**：
```powershell
# 1. 列出设备
usbipd list

# 2. bind Pixel 手机
usbipd bind -b 1-1

# 3. attach 给 WSL 2（使用回环地址）
usbipd attach -r 127.0.0.1 -b 1-1
```

2. **WSL 2 (Linux 端)**：
```bash
# 1. 列出 Server 的设备
usbip list -r 127.0.0.1

# 2. attach 设备
sudo usbip attach -r 127.0.0.1 -b 1-1

# 3. 验证
adb devices
# 输出中应该看到手机的序列号
```

### 场景 2：网络共享 - 多人团队

**目标**：一台主机上有 3 部手机，3 个开发者通过网络共享使用。

**硬件**：
- Device Host (Windows 11)：连接 Pixel 6、OnePlus 10、Samsung S22
- Developer A (macOS)：通过网络使用
- Developer B (Linux)：通过网络使用  
- Developer C (Windows)：通过网络使用

**部署**：

Device Host (IP: 192.168.1.100)：
```powershell
# bind 所有设备
$devices = @("1-1", "1-2", "1-3")
$devices | ForEach-Object {
    usbipd bind -b $_
}

# 设备现在处于 "Shared" 状态，等待 Client 连接
# 如果需要限制访问，设置策略
usbipd policy add -b 1-1 --client 192.168.1.101  # Developer A
usbipd policy add -b 1-2 --client 192.168.1.102  # Developer B
usbipd policy add -b 1-3 --client 192.168.1.103  # Developer C
```

Developer A (macOS, IP: 192.168.1.101)：
```bash
# 连接 Pixel 6
sudo usbip attach -r 192.168.1.100 -b 1-1
adb devices

# 连接 OnePlus 10
sudo usbip attach -r 192.168.1.100 -b 1-2
adb devices
```

**问题**：多人同时使用可能冲突。更好的做法是用设备池（第二部分会讲）。

---

## USB/IP 的性能和限制

### 性能指标

| 指标 | 本地 USB | USB/IP (局域网) | USB/IP (广域网) |
|------|---------|----------------|----------------|
| **延迟** | < 1ms | 1-5ms | 10-100ms |
| **吞吐量** | 400 MB/s (USB 3.0) | 100-120 MB/s | 网络带宽限制 |
| **稳定性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

**关键发现**：
- **局域网**：USB/IP 性能接近本地 USB，完全可用于生产
- **广域网**：延迟和丢包会显著影响，仅用于低频操作（如 adb install）
- **吞吐量限制**：网络瓶颈，不适合大文件传输

### USB/IP 的局限

1. **不支持部分设备类型**：
   - ✅ 支持：HID（键鼠）、USB Serial、Bulk Transfer（ADB）
   - ❌ 不支持：某些专有驱动、实时音频设备、高精度计时设备

2. **热插拔不完善**：
   - 网络断线不会自动恢复（需要手工 detach + attach）
   - 设备重启后需要重新 attach

3. **安全隐患**：
   - 默认无加密，局域网 OK；广域网需要 VPN
   - 任何知道 Server IP 和端口的人都可以连接（除非设置了 policy）

4. **驱动兼容性**：
   - Linux 内核版本可能影响性能
   - Windows 版本过旧可能不支持

---

## 故障排查

### 问题 1：`usbipd list` 显示设备但 `attach` 失败

**现象**：
```powershell
usbipd list
# 显示设备状态是 "Shared"

usbipd attach -r 192.168.1.50 -b 1-1
# 错误：Device not found
```

**原因**：
- 防火墙阻止了 3240 端口
- Client 和 Server 网络不通
- Server IP 地址配置错误

**解决**：
```powershell
# 1. 检查防火墙
netsh advfirewall show allprofiles

# 2. 开放 3240 端口
netsh advfirewall firewall add rule name="USBIP" dir=in action=allow protocol=tcp localport=3240

# 3. 测试网络连通性
Test-NetConnection -ComputerName 192.168.1.50 -Port 3240
```

### 问题 2：`adb devices` 看不到通过 USB/IP 连接的设备

**现象**：
```bash
sudo usbip attach -r 192.168.1.100 -b 1-1
# 显示成功

adb devices
# 列表为空或找不到新设备
```

**原因**：
- ADB daemon 没有识别新设备
- 设备权限问题（Linux）
- USB/IP 连接还未完全建立

**解决**：
```bash
# 1. 重启 ADB daemon
adb kill-server
sleep 2
adb start-server

# 2. 重新列出设备
adb devices

# 3. 检查 USB/IP 状态
sudo usbip port

# 4. 如果还是不行，检查内核日志
sudo dmesg | grep usb
```

### 问题 3：网络断线后无法恢复

**现象**：
设备曾经可见，但网络中断后（如网线拔掉），即使网络恢复也找不到设备。

**原因**：
USB/IP 没有自动重连机制。

**解决**（临时）：
```bash
# Client 端断开
sudo usbip detach -p 00

# Server 端断开
usbipd detach -b 1-1

# 重新 attach
usbipd attach -r 192.168.1.50 -b 1-1
```

**解决（长期）**：
使用监控脚本（第三部分会详细讲）。

---

## 总结

这一部分我们深入理解了：

1. **USB/IP 的来源**：从学术项目演进到工业级应用
2. **核心原理**：将 USB 请求序列化为网络包
3. **Windows vs Linux**：两种平台的实现和命令差异
4. **命令速查**：完整的 usbipd 和 usbip 命令参考
5. **实战示例**：从简单到复杂的部署场景
6. **性能和限制**：什么时候适用，什么时候不适用

**下一步**：[第二部分](/posts/device-farm-design.md) 我们将设计一个完整的 Android Device Farm 系统，支持多用户、故障恢复、自动扩展。

---

## 参考资源

- **官方文档**：
  - [usbipd-win GitHub](https://github.com/dorssel/usbipd-win)
  - [Linux USB/IP Documentation](https://www.kernel.org/doc/html/latest/usb/usbip_protocol.html)

- **相关工具**：
  - Android ADB：`android-tools-adb` (Linux) / Android SDK Platform Tools (Windows)
  - Appium：跨平台 UI 自动化框架

- **社区讨论**：
  - Stack Overflow: `[usbip]` tag
  - GitHub Issues: dorssel/usbipd-win

---

*本文最后更新于 2024-05-23*
