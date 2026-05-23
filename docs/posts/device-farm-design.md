---
title: "Android Device Farm 系统设计 (2): MVP 到完整架构"
date: 2024-05-23
author: dvdface
tags: [Android, Device Farm, 系统设计, 自动化测试, 架构]
---

# Android Device Farm 系统设计 (2)：MVP 到完整架构

> 本文是 Android Device Farm 系列的第二部分。我们从产品需求出发，先设计一个 MVP（最小可行产品），然后逐步迭代到支持多用户、故障恢复、自动扩展的完整系统。核心是用流程图展示**正常流**和**异常流**，帮助你理解系统如何处理边界情况。

## 第 0 部分：需求分析

### 用户角色

定义系统中的主要参与者：

| 角色 | 职责 | 典型操作 |
|------|------|--------|
| **内部用户（开发者/QA）** | 使用设备执行测试 | 预留设备 → 运行测试 → 释放设备 |
| **外部用户（CI/CD 流水线）** | 自动化执行大规模测试 | 通过 API 批量申请设备 → 并行执行 → 收集报告 |
| **运维人员** | 管理设备、监控健康状态 | 绑定/解绑设备、故障排查、容量规划 |
| **系统本身** | 自动化管理和恢复 | 健康检查、自动重连、故障告警 |

### 核心需求

**功能需求**：
- ✅ 多个 Windows 主机 + 多个 Linux 客户端
- ✅ 设备预留和释放（避免冲突）
- ✅ 支持按设备型号、Android 版本、功能筛选
- ✅ 设备故障自动检测和恢复
- ✅ 实时可视化设备状态

**非功能需求**：
- 可靠性：99.5% 设备可用率
- 延迟：设备预留 < 5 秒
- 扩展性：支持 50+ 设备，无需重构
- 易用性：傻瓜式 API 给测试框架调用

---

## 第 1 部分：MVP 设计（最小可行产品）

### MVP 的约束

为了快速验证核心价值，我们有意做减法：

**MVP 支持的场景**：
- ✅ 单个 Windows 主机 + 单个 Linux 测试机
- ✅ 最多 10 部设备
- ✅ 同步设备预留（一个一个来）
- ✅ 基础的健康检查（每 60 秒一次）

**MVP 不支持的**（下个版本加）：
- ❌ 多个主机
- ❌ 异步并发预留
- ❌ 细粒度权限管理
- ❌ 自动故障转移

### MVP 架构图

```
┌──────────────────────────────────────────────────┐
│        Windows Device Host (192.168.1.100)       │
│                                                  │
│  ┌────────────────┐  ┌──────────────────────┐  │
│  │   usbipd       │  │ USB Devices (10台)   │  │
│  │   Server       │  │ - 5× Pixel           │  │
│  │   (Port 3240)  │  │ - 3× OnePlus         │  │
│  └────────────────┘  │ - 2× Samsung         │  │
│          ▲           └──────────────────────┘  │
│          │ USB                                  │
└──────────┼──────────────────────────────────────┘
           │ TCP (Gigabit)
           │
┌──────────▼──────────────────────────────────────┐
│    Linux Test Machine (192.168.1.50)            │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │  Device Pool Manager (Python Script)   │   │
│  │                                        │   │
│  │  ┌──────────────────────────────────┐ │   │
│  │  │ Component 1: Device Discovery    │ │   │
│  │  │ - usbip attach/detach 管理       │ │   │
│  │  │ - adb devices 扫描               │ │   │
│  │  └──────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────┐ │   │
│  │  │ Component 2: Pool Management     │ │   │
│  │  │ - 设备在线/离线状态              │ │   │
│  │  │ - 预留/释放锁                    │ │   │
│  │  └──────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────┐ │   │
│  │  │ Component 3: Health Monitor      │ │   │
│  │  │ - 后台线程：每 60s ping 一次     │ │   │
│  │  │ - 故障自动标记                   │ │   │
│  │  └──────────────────────────────────┘ │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │  API 服务 (Flask, Port 5000)           │   │
│  │                                        │   │
│  │  GET  /devices           查看所有设备  │   │
│  │  POST /devices/reserve   预留一个设备  │   │
│  │  POST /devices/release   释放一个设备  │   │
│  │  GET  /status            查看系统状态  │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │  Tests (pytest, Appium, DroidAgent)    │   │
│  │  调用 API 预留设备，运行测试            │   │
│  └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### MVP 的核心数据结构

```python
# Device 状态模型
class DeviceState(Enum):
    OFFLINE = "offline"           # 物理故障或网络断线
    IDLE = "idle"                 # 在线且可用
    RESERVED = "reserved"         # 被预留，测试进行中
    RECOVERING = "recovering"     # 故障恢复中

@dataclass
class Device:
    serial: str                    # adb serial
    model: str                     # Pixel 6, OnePlus 10, ...
    android_version: str           # 13, 14, ...
    state: DeviceState             # 当前状态
    reserved_by: Optional[str]     # 谁预留的（测试名称）
    last_ping_time: datetime       # 最后健康检查时间
    fail_count: int = 0            # 连续失败次数
```

### MVP 的正常流：单个设备预留

```
预留请求
   ↓
┌─────────────────────────────────────┐
│  1. 查询设备池                       │
│     过滤条件：                      │
│     - state == IDLE                │
│     - model 匹配（可选）            │
│     - android_version 匹配（可选）   │
└─────────────────────────────────────┘
   │
   ├─ 找到匹配设备 ──→ ✓ FOUND
   │
   └─ 未找到        ──→ ✗ TIMEOUT（等待 30s 后重试）
                        如果 30s 内仍未找到 → 返回失败
   
   ↓ (FOUND 分支)
┌─────────────────────────────────────┐
│  2. 获取设备锁                       │
│     threading.Lock(device.serial)    │
│     避免多个请求同时预留同一设备     │
└─────────────────────────────────────┘
   │
   ├─ 锁获取成功 ──→ ✓ LOCKED
   │
   └─ 锁超时（2s） ──→ ✗ 其他线程也在预留
                        重试或返回其他设备
   
   ↓ (LOCKED 分支)
┌─────────────────────────────────────┐
│  3. 原子更新设备状态                 │
│     state = RESERVED                │
│     reserved_by = test_name         │
│     timestamp = now()               │
└─────────────────────────────────────┘
   │
   ↓
┌─────────────────────────────────────┐
│  4. 返回设备信息给调用方              │
│     {                               │
│       "serial": "FA9BF...",        │
│       "model": "Pixel 6 Pro",       │
│       "status": "ready"             │
│     }                               │
└─────────────────────────────────────┘
   │
   ↓
┌─────────────────────────────────────┐
│  5. 测试运行（由调用方负责）          │
│     adb -s <serial> shell ...       │
│     pytest --device <serial>        │
└─────────────────────────────────────┘
   │
   ↓
┌─────────────────────────────────────┐
│  6. 测试完成，调用方请求释放          │
│     POST /devices/release           │
│     { serial: "FA9BF..." }          │
└─────────────────────────────────────┘
   │
   ↓
┌─────────────────────────────────────┐
│  7. 后端释放设备                      │
│     state = IDLE                    │
│     reserved_by = None              │
│     释放锁                           │
└─────────────────────────────────────┘
   │
   ✓ 完成
```

### MVP 的异常流：设备故障

#### 异常流 1：测试中设备掉线

```
测试运行中
┌────────────────────────────┐
│  adb -s <serial> shell ... │  ← 设备突然离线（网络断线）
└────────────────────────────┘
          │
          ✗ 命令超时或返回 "device offline"
          │
          ↓
┌────────────────────────────────────────┐
│  测试框架检测到故障                     │
│  （应该有 timeout 和 retry 机制）       │
│                                        │
│  建议做法：                            │
│  try:                                 │
│      adb.shell(cmd, timeout=30s)      │
│  except AdbTimeoutError:              │
│      # 通知 Device Farm 该设备故障     │
│      POST /devices/FAULT               │
│      { serial: "...", reason: "..." }  │
└────────────────────────────────────────┘
          │
          ↓
┌────────────────────────────────────────┐
│  Device Farm 后端：标记设备为 OFFLINE  │
│  device.state = OFFLINE                │
│  device.reserved_by = None   (强制释放)│
│  fail_count = 1                        │
│                                        │
│  通知测试框架：设备不可用，请重试     │
│  Response: {status: "device_fault"}    │
└────────────────────────────────────────┘
          │
          ↓
┌────────────────────────────────────────┐
│  后台健康检查线程发现该设备离线         │
│  （定期 ping：adb shell echo OK）      │
│                                        │
│  自动尝试恢复：                         │
│  1. detach 该设备（usbip detach）      │
│  2. 等待 10 秒                         │
│  3. attach 该设备（usbip attach）      │
│  4. 等待 adb 识别（最多 20 秒）        │
│  5. 再次 ping                          │
│                                        │
│  如果恢复成功：                        │
│    device.state = IDLE                │
│    device.fail_count = 0              │
│    日志：[RECOVERY] Device recovered   │
│                                        │
│  如果恢复失败：                        │
│    device.fail_count += 1             │
│    如果 fail_count >= 3               │
│      device.state = OFFLINE（标记坏掉）│
│      告警：Device repeated failure     │
└────────────────────────────────────────┘
```

#### 异常流 2：测试框架未正确释放设备

```
测试运行中
┌────────────────────────────┐
│  device.state = RESERVED   │
│  测试被 kill 或崩溃          │
│  （没有调用 /release API）   │
└────────────────────────────┘
          │
          ↓ （设备卡在 RESERVED 状态）
┌────────────────────────────────────────┐
│  后台清理线程（每 5 分钟运行一次）      │
│                                        │
│  对于每个 RESERVED 的设备：            │
│  if (now - reserved_time > 30 min)    │
│      device.state = IDLE   (强制释放)  │
│      device.reserved_by = None         │
│      日志：[CLEANUP] Released stale ... │
│      告警：Test didn't release device  │
└────────────────────────────────────────┘
```

### MVP 数据持久化

简单方案：**JSON 文件 + 内存缓存**

```python
# 目录结构
device_farm/
├── data/
│  ├── devices.json       # 设备定义（静态）
│  ├── state.json         # 设备运行时状态（动态）
│  └── logs/
│     └── device_farm.log # 操作日志
└── scripts/
   ├── device_farm.py     # 核心逻辑
   └── monitor.py         # 健康检查
```

```json
// devices.json - 设备定义（静态）
[
  {
    "serial": "FA9BF1A0D1",
    "model": "Pixel 6 Pro",
    "android_version": "14",
    "busid": "1-1"
  },
  {
    "serial": "R39M30MZDLZ",
    "model": "OnePlus 10 Pro",
    "android_version": "13",
    "busid": "1-2"
  }
]

// state.json - 运行时状态（每次更新时写入）
{
  "devices": {
    "FA9BF1A0D1": {
      "state": "reserved",
      "reserved_by": "test_e2e_checkout",
      "last_ping": "2024-05-23T10:15:30Z",
      "fail_count": 0
    },
    "R39M30MZDLZ": {
      "state": "idle",
      "reserved_by": null,
      "last_ping": "2024-05-23T10:15:31Z",
      "fail_count": 0
    }
  }
}
```

---

## 第 2 部分：MVP 的实现要点

### 1. 线程安全

由于多个测试框架可能同时申请设备，必须用锁保护共享状态：

```python
from threading import Lock, RLock

class DevicePool:
    def __init__(self):
        self.devices = {}
        self.lock = RLock()  # 可重入锁（同个线程可以多次获取）
        self.device_locks = defaultdict(Lock)  # 每个设备一个锁
    
    def reserve_device(self, criteria=None) -> Optional[str]:
        with self.lock:
            # 查找匹配设备
            candidate = self._find_idle_device(criteria)
            if not candidate:
                return None
            
            # 获取该设备的锁
            with self.device_locks[candidate['serial']]:
                # 再次检查状态（double-check pattern）
                if candidate['state'] != 'idle':
                    return None  # 被其他线程抢先预留了
                
                # 原子更新
                candidate['state'] = 'reserved'
                candidate['reserved_by'] = threading.current_thread().name
                self._save_state()  # 持久化
                
                return candidate['serial']
```

### 2. 健康检查线程

```python
def health_check_loop(self):
    """后台线程：定期检查设备健康状态"""
    while True:
        time.sleep(60)  # 每 60 秒检查一次
        
        for serial, device in self.devices.items():
            if device['state'] == 'offline':
                continue  # 已离线的设备，跳过
            
            # 1. Ping 设备
            alive = self._ping_device(serial)
            
            if alive:
                device['fail_count'] = 0  # 恢复计数重置
                continue
            
            # 2. 失败计数
            device['fail_count'] += 1
            print(f"[HEALTH] {serial} ping failed (count={device['fail_count']})")
            
            # 3. 超过阈值则标记离线
            if device['fail_count'] >= 3:
                device['state'] = 'offline'
                device['reserved_by'] = None  # 强制释放
                self._alert(f"Device {serial} marked OFFLINE")
            
            # 4. 尝试恢复（可选，MVP 中简单实现）
            elif device['fail_count'] == 1:
                self._try_recovery(serial)
    
    def _ping_device(self, serial: str) -> bool:
        """用 adb 检查设备是否在线"""
        try:
            result = subprocess.run(
                ["adb", "-s", serial, "shell", "echo", "OK"],
                capture_output=True,
                timeout=10
            )
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            return False
    
    def _try_recovery(self, serial: str):
        """尝试恢复离线设备"""
        print(f"[RECOVERY] Attempting to recover {serial}...")
        try:
            # 1. detach
            subprocess.run(
                ["usbip", "detach", "-p", self._get_port(serial)],
                timeout=10
            )
            time.sleep(5)
            
            # 2. attach
            subprocess.run(
                ["usbip", "attach", "-r", self.server_ip, "-b", 
                 self.devices[serial]['busid']],
                timeout=10
            )
            
            # 3. 等待 adb 识别
            for _ in range(20):
                if self._ping_device(serial):
                    print(f"[RECOVERY] {serial} recovered!")
                    return
                time.sleep(1)
            
            print(f"[RECOVERY] {serial} recovery failed")
        except Exception as e:
            print(f"[RECOVERY] Error: {e}")
```

### 3. API 设计

```python
from flask import Flask, request, jsonify

app = Flask(__name__)
pool = DevicePool(...)

@app.route('/devices', methods=['GET'])
def list_devices():
    """列出所有设备及其状态"""
    return jsonify({
        'devices': list(pool.devices.values()),
        'summary': {
            'total': len(pool.devices),
            'idle': sum(1 for d in pool.devices.values() if d['state'] == 'idle'),
            'reserved': sum(1 for d in pool.devices.values() if d['state'] == 'reserved'),
            'offline': sum(1 for d in pool.devices.values() if d['state'] == 'offline'),
        }
    })

@app.route('/devices/reserve', methods=['POST'])
def reserve_device():
    """预留一个设备"""
    data = request.json
    model = data.get('model')
    android_version = data.get('android_version')
    timeout = data.get('timeout', 30)  # 秒
    
    # 轮询等待，直到找到可用设备或超时
    start_time = time.time()
    while time.time() - start_time < timeout:
        serial = pool.reserve_device({
            'model': model,
            'android_version': android_version
        })
        
        if serial:
            return jsonify({'status': 'ok', 'serial': serial})
        
        time.sleep(1)  # 等待 1 秒后重试
    
    return jsonify({'status': 'error', 'reason': 'timeout'}), 503

@app.route('/devices/<serial>/release', methods=['POST'])
def release_device(serial):
    """释放一个设备"""
    pool.release_device(serial)
    return jsonify({'status': 'ok'})

@app.route('/status', methods=['GET'])
def get_status():
    """获取系统整体状态"""
    return jsonify(pool.export_metrics())

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)
```

---

## 第 3 部分：从 MVP 到完整系统（迭代路线）

### 迭代 1：多主机支持

**MVP 的限制**：单个 Windows 主机

**完整系统的方案**：多个 Device Host

```
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ Device Host 1      │  │ Device Host 2      │  │ Device Host 3      │
│ (IP: 192.168.1.100)│  │ (IP: 192.168.1.101)│  │ (IP: 192.168.1.102)│
│                    │  │                    │  │                    │
│ usbipd Server      │  │ usbipd Server      │  │ usbipd Server      │
│ Port 3240          │  │ Port 3240          │  │ Port 3240          │
│                    │  │                    │  │                    │
│ 5× Pixel           │  │ 3× OnePlus         │  │ 2× Samsung         │
└────────────────────┘  └────────────────────┘  └────────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Central Manager      │
                    │  (Linux)              │
                    │                       │
                    │ Multi-Host Sync       │
                    │ - 定期拉取每个主机的   │
                    │   设备列表              │
                    │ - 合并到统一资源池     │
                    │ - 智能负载均衡         │
                    └───────────────────────┘
```

**关键组件**：
1. **Host Registry**：维护所有 Device Host 的地址和状态
2. **Device Aggregator**：定期从每个主机拉取设备列表
3. **Smart Attach**：当预留设备时，自动选择最空闲的主机并 attach

### 迭代 2：用户权限和租赁

**新增特性**：设备租赁（Lease）模型

```python
@dataclass
class Lease:
    id: str                    # 租赁 ID
    device_serial: str         # 设备序列号
    reserved_by: str           # 租赁人（用户/流程名）
    start_time: datetime       # 开始时间
    expected_duration: int     # 预期租赁时长（秒）
    status: str                # active / expired / released
    
class DevicePool:
    def reserve_device_with_lease(self, user_id: str, duration_sec: int):
        """预留设备并创建租赁记录"""
        serial = self.reserve_device()
        
        lease = Lease(
            id=str(uuid.uuid4()),
            device_serial=serial,
            reserved_by=user_id,
            start_time=datetime.now(),
            expected_duration=duration_sec
        )
        
        self.leases[lease.id] = lease
        return lease

    def enforce_lease_timeout(self):
        """后台线程：强制执行租赁超时"""
        while True:
            time.sleep(30)
            
            for lease_id, lease in self.leases.items():
                if lease.status != 'active':
                    continue
                
                elapsed = (datetime.now() - lease.start_time).total_seconds()
                if elapsed > lease.expected_duration * 1.5:  # 允许 50% 超期
                    # 强制释放
                    self.release_device(lease.device_serial)
                    lease.status = 'expired'
                    
                    alert(f"Lease {lease_id} expired, device released")
```

### 迭代 3：故障转移和自动恢复

**新增特性**：当设备故障时，自动转移到其他主机的相同设备

```python
class SmartDevicePool(DevicePool):
    def get_similar_device(self, serial: str):
        """找到一个相同型号的设备"""
        device = self.devices[serial]
        
        # 查找其他在线的相同设备
        for d in self.devices.values():
            if (d['model'] == device['model'] and 
                d['android_version'] == device['android_version'] and
                d['state'] == 'idle' and
                d['host_ip'] != device['host_ip']):  # 不同主机
                return d
        
        return None
    
    def handle_device_failure(self, serial: str, test_context: dict):
        """
        设备故障处理：
        1. 尝试恢复原设备
        2. 如果失败，转移到备用设备
        3. 通知测试框架
        """
        device = self.devices[serial]
        
        # 1. 尝试本地恢复（2 次）
        for attempt in range(2):
            self._try_recovery(serial)
            if self._ping_device(serial):
                print(f"Recovery succeeded for {serial}")
                return None  # 恢复成功
        
        # 2. 尝试自动转移
        alternative = self.get_similar_device(serial)
        if alternative:
            print(f"Failover: {serial} -> {alternative['serial']}")
            # 强制释放故障设备
            self.devices[serial]['state'] = 'offline'
            # 预留备用设备
            self.reserve_device({'model': device['model']})
            return alternative['serial']
        
        # 3. 没有备用设备
        print(f"No similar device available for failover")
        return None
```

### 迭代 4：自动扩展和容量规划

**新增特性**：监控设备利用率，提示运维何时添加新设备

```python
def capacity_analysis(self):
    """容量分析：预测是否需要扩展"""
    # 1. 计算利用率指标
    total = len(self.devices)
    idle = sum(1 for d in self.devices.values() if d['state'] == 'idle')
    utilization = (total - idle) / total if total > 0 else 0
    
    # 2. 分析预留等待时间（过去 1 小时）
    recent_waits = self._get_reservation_wait_times(hours=1)
    avg_wait = sum(recent_waits) / len(recent_waits) if recent_waits else 0
    
    # 3. 触发告警的条件
    if utilization > 0.9:
        alert(f"Device utilization too high: {utilization*100:.1f}%")
    
    if avg_wait > 60:  # 平均等待超过 1 分钟
        alert(f"Average reservation wait time: {avg_wait}s (recommend +3 devices)")
    
    # 4. 生成容量规划报告
    return {
        'current_devices': total,
        'utilization': utilization,
        'avg_wait_time': avg_wait,
        'recommended_devices': self._calculate_needed_capacity()
    }

def _calculate_needed_capacity(self):
    """根据历史数据和增长趋势，推荐需要多少设备"""
    # 简单方案：确保 p99 的预留延迟 < 30 秒
    peak_utilization = self._get_peak_utilization(hours=24)
    
    # Little's Law: L = λ * W
    # L: 平均占用设备数
    # λ: 预留速率（requests/sec）
    # W: 测试平均耗时（sec）
    
    needed_devices = ceil(peak_utilization / (1 - target_wait_ratio))
    return needed_devices
```

---

## 第 4 部分：完整系统的高可用部署

### 完整架构（生产就绪）

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (nginx)                     │
│                    (Port 80/443)                             │
└────────────┬──────────────────────────────────┬──────────────┘
             │                                  │
    ┌────────▼────────┐              ┌─────────▼────────┐
    │  Manager-1      │              │  Manager-2       │
    │  (Primary)      │              │  (Backup)        │
    │                 │              │                  │
    │ Device Pool API │              │ Device Pool API  │
    │ Health Check    │              │ Health Check     │
    │ State Sync      │◄──────────────►│ State Sync       │
    └────────┬────────┘              └─────────┬────────┘
             │                                  │
             │ ┌──────────────────────────────┘
             │ │
             └─┴─► Distributed Cache (Redis)
                  {device_state, leases, ...}
    
    ┌────────────────────────────────────────┐
    │   Monitoring & Alerting                │
    │   - Prometheus (metrics export)        │
    │   - Grafana (visualization)            │
    │   - PagerDuty (on-call alerts)        │
    └────────────────────────────────────────┘
```

### 可靠性指标

| 指标 | MVP | 完整系统 |
|------|-----|--------|
| **可用性** | 95% | 99.5% |
| **MTTR**(故障恢复时间) | 5+ 分钟 | < 1 分钟 |
| **单点故障** | 存在 | 无（冗余设计） |
| **设备故障转移** | 手工 | 自动 |
| **容量规划** | 手工 | 自动建议 |

---

## 总结：从 MVP 到完整系统

| 阶段 | 范围 | 关键工作 | 完成时间 |
|------|------|--------|--------|
| **MVP** | 单主机，≤10 台设备 | 核心预留/释放、健康检查 | 1-2 周 |
| **迭代 1** | 多主机支持 | Host registry、Device aggregator | 1 周 |
| **迭代 2** | 权限和租赁 | User isolation、Lease enforcement | 1 周 |
| **迭代 3** | 故障转移 | Failover logic、Similar device detection | 1 周 |
| **迭代 4** | 自动扩展 | Capacity analysis、Metrics export | 1 周 |
| **生产就绪** | 高可用 | Load balancer、Redis、Monitoring | 2 周 |

**推荐策略**：
1. 先上线 MVP（2 周），验证核心价值
2. 根据实际使用反馈，优先做「用户投诉最多的」功能
3. 不必一次实现所有功能，逐步演进

---

## 下一步

[第三部分](/posts/device-farm-implementation.md) 我们将讲解如何从零开始**实现**这个系统，包括完整代码、部署脚本和运维手册。

---

*本文最后更新于 2024-05-23*
