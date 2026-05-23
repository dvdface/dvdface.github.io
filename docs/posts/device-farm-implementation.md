---
title: "Android Device Farm 完整实现 (3): 从代码到上线"
date: 2024-05-23
author: dvdface
tags: [Android, Device Farm, Python, 实现, 自动化测试]
---

# Android Device Farm 完整实现 (3)：从代码到上线

> 本文是 Android Device Farm 系列的第三部分。我们从 MVP 实现开始，包括完整的 Python 代码、部署脚本、Docker 化、测试框架集成，最后给出运维手册和故障排查指南。

## 第 0 部分：项目结构

推荐的项目结构如下：

```
android-device-farm/
├── README.md
├── requirements.txt
├── setup.py
│
├── src/
│  ├── __init__.py
│  ├── device_pool.py          # 核心：设备池管理
│  ├── health_monitor.py        # 后台：健康检查线程
│  ├── api_server.py            # REST API 服务
│  ├── models.py                # 数据模型（Device, Lease）
│  └── utils.py                 # 工具函数
│
├── config/
│  ├── devices.json             # 设备定义（静态）
│  ├── config.yaml              # 配置文件
│  └── logging.conf             # 日志配置
│
├── data/
│  ├── state.json               # 运行时状态（自动生成）
│  └── logs/
│
├── scripts/
│  ├── setup_device_host.ps1    # Windows 主机配置脚本
│  ├── deploy.sh                # 部署脚本
│  ├── start_services.sh        # 启动脚本
│  └── backup.sh                # 备份脚本
│
├── tests/
│  ├── test_device_pool.py      # 单元测试
│  ├── test_api.py              # API 测试
│  └── test_integration.py       # 集成测试
│
├── docs/
│  ├── API.md                   # API 文档
│  ├── DEPLOYMENT.md            # 部署指南
│  ├── TROUBLESHOOTING.md       # 故障排查
│  └── OPERATIONS.md            # 运维手册
│
└── docker/
   ├── Dockerfile              # 容器镜像
   └── docker-compose.yml      # 编排配置
```

---

## 第 1 部分：核心实现

### 1.1 数据模型 (`models.py`)

```python
# src/models.py
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime
from typing import Optional
import uuid

class DeviceState(Enum):
    """设备状态枚举"""
    OFFLINE = "offline"
    IDLE = "idle"
    RESERVED = "reserved"
    RECOVERING = "recovering"

@dataclass
class Device:
    """设备模型"""
    serial: str                        # adb serial
    model: str                         # Pixel 6, OnePlus 10, ...
    android_version: str               # 13, 14, ...
    busid: str                         # USB bus ID (如 1-1)
    host_ip: str                       # Device Host 的 IP
    state: DeviceState = DeviceState.IDLE
    reserved_by: Optional[str] = None  # 谁预留的
    last_ping_time: datetime = field(default_factory=datetime.now)
    fail_count: int = 0                # 连续失败次数
    
    def to_dict(self):
        """转为字典（用于 JSON 序列化）"""
        d = asdict(self)
        d['state'] = self.state.value
        d['last_ping_time'] = self.last_ping_time.isoformat()
        return d
    
    @classmethod
    def from_dict(cls, data):
        """从字典恢复"""
        data['state'] = DeviceState(data['state'])
        data['last_ping_time'] = datetime.fromisoformat(data['last_ping_time'])
        return cls(**data)

@dataclass
class Lease:
    """租赁（预留）记录"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    device_serial: str = ""
    reserved_by: str = ""
    start_time: datetime = field(default_factory=datetime.now)
    expected_duration: int = 3600     # 秒
    status: str = "active"            # active / expired / released
    
    def is_expired(self) -> bool:
        """检查租赁是否过期（允许 50% 超期）"""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        return elapsed > self.expected_duration * 1.5
    
    def to_dict(self):
        d = asdict(self)
        d['start_time'] = self.start_time.isoformat()
        return d
```

### 1.2 设备池核心 (`device_pool.py`)

```python
# src/device_pool.py
import json
import logging
import subprocess
import time
import threading
from collections import defaultdict
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime

from .models import Device, DeviceState, Lease

logger = logging.getLogger(__name__)

class DevicePool:
    """设备池：管理所有 USB 设备的预留、释放、健康检查"""
    
    def __init__(self, devices_file: str, state_file: str):
        self.devices_file = devices_file
        self.state_file = state_file
        
        # 内存缓存
        self.devices: Dict[str, Device] = {}
        self.leases: Dict[str, Lease] = {}
        
        # 锁
        self.lock = threading.RLock()
        self.device_locks = defaultdict(threading.Lock)
        
        # 后台线程
        self._health_check_thread = None
        self._cleanup_thread = None
        self._stop_event = threading.Event()
        
        # 加载配置
        self._load_devices()
        self._load_state()
    
    def _load_devices(self):
        """从 JSON 加载设备定义（静态）"""
        with open(self.devices_file) as f:
            data = json.load(f)
        
        self.devices = {
            d['serial']: Device(**d)
            for d in data
        }
        logger.info(f"Loaded {len(self.devices)} devices")
    
    def _load_state(self):
        """从 JSON 加载运行时状态（动态）"""
        if not Path(self.state_file).exists():
            return
        
        try:
            with open(self.state_file) as f:
                data = json.load(f)
            
            for serial, device_data in data.get('devices', {}).items():
                if serial in self.devices:
                    d = self.devices[serial]
                    d.state = DeviceState(device_data.get('state', 'idle'))
                    d.reserved_by = device_data.get('reserved_by')
                    d.fail_count = device_data.get('fail_count', 0)
                    d.last_ping_time = datetime.fromisoformat(
                        device_data.get('last_ping_time', datetime.now().isoformat())
                    )
            
            logger.info("Loaded runtime state")
        except Exception as e:
            logger.warning(f"Failed to load state: {e}")
    
    def _save_state(self):
        """将运行时状态写入 JSON"""
        state_data = {
            'devices': {
                serial: device.to_dict()
                for serial, device in self.devices.items()
            },
            'updated_at': datetime.now().isoformat()
        }
        
        with open(self.state_file, 'w') as f:
            json.dump(state_data, f, indent=2)
    
    def list_devices(self) -> List[Device]:
        """列出所有设备"""
        with self.lock:
            return list(self.devices.values())
    
    def reserve_device(self, 
                      model: Optional[str] = None,
                      android_version: Optional[str] = None) -> Optional[str]:
        """
        预留一个设备。
        
        Args:
            model: 设备型号（可选）
            android_version: Android 版本（可选）
        
        Returns:
            设备 serial，如果没有可用设备返回 None
        """
        with self.lock:
            # 查找匹配的空闲设备
            for serial, device in self.devices.items():
                if device.state != DeviceState.IDLE:
                    continue
                
                if model and device.model != model:
                    continue
                
                if android_version and device.android_version != android_version:
                    continue
                
                # 找到了！获取该设备的锁
                with self.device_locks[serial]:
                    # Double-check：再次确认状态（另一个线程可能抢先预留）
                    if device.state != DeviceState.IDLE:
                        continue
                    
                    # 原子更新
                    device.state = DeviceState.RESERVED
                    device.reserved_by = threading.current_thread().name
                    self._save_state()
                    
                    logger.info(f"Reserved {serial} by {device.reserved_by}")
                    return serial
        
        logger.debug(f"No available device matching: model={model}, android={android_version}")
        return None
    
    def reserve_device_with_lease(self, 
                                  user_id: str,
                                  duration_sec: int = 3600,
                                  model: Optional[str] = None) -> Optional[str]:
        """
        预留设备并创建租赁记录。
        
        Args:
            user_id: 用户 ID
            duration_sec: 预期租赁时长（秒）
            model: 设备型号（可选）
        
        Returns:
            设备 serial
        """
        serial = self.reserve_device(model=model)
        if not serial:
            return None
        
        lease = Lease(
            device_serial=serial,
            reserved_by=user_id,
            expected_duration=duration_sec
        )
        
        with self.lock:
            self.leases[lease.id] = lease
        
        return serial
    
    def release_device(self, serial: str) -> bool:
        """
        释放一个设备。
        
        Args:
            serial: 设备 serial
        
        Returns:
            True if successful
        """
        with self.lock:
            if serial not in self.devices:
                logger.warning(f"Device {serial} not found")
                return False
            
            device = self.devices[serial]
            device.state = DeviceState.IDLE
            device.reserved_by = None
            self._save_state()
            
            logger.info(f"Released {serial}")
            return True
    
    def mark_device_offline(self, serial: str):
        """标记设备离线"""
        with self.lock:
            if serial in self.devices:
                device = self.devices[serial]
                device.state = DeviceState.OFFLINE
                device.reserved_by = None
                self._save_state()
                
                logger.error(f"Marked {serial} as OFFLINE")
    
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
            logger.warning(f"Timeout pinging {serial}")
            return False
        except Exception as e:
            logger.warning(f"Error pinging {serial}: {e}")
            return False
    
    def _try_recovery(self, serial: str) -> bool:
        """尝试恢复离线设备"""
        device = self.devices.get(serial)
        if not device:
            return False
        
        logger.info(f"Attempting recovery for {serial}...")
        
        try:
            # 1. detach
            subprocess.run(
                ["usbip", "detach", "-p", self._get_port(serial)],
                timeout=10,
                capture_output=True
            )
            time.sleep(5)
            
            # 2. attach
            subprocess.run(
                ["usbip", "attach", "-r", device.host_ip, "-b", device.busid],
                timeout=10,
                capture_output=True
            )
            
            # 3. 等待 adb 识别（最多 20 秒）
            for attempt in range(20):
                if self._ping_device(serial):
                    logger.info(f"Successfully recovered {serial}")
                    return True
                time.sleep(1)
            
            logger.error(f"Recovery failed for {serial}")
            return False
        except Exception as e:
            logger.error(f"Recovery error for {serial}: {e}")
            return False
    
    def _get_port(self, serial: str) -> int:
        """从 usbip port 输出中查找设备对应的端口"""
        try:
            result = subprocess.run(
                ["sudo", "usbip", "port"],
                capture_output=True,
                text=True
            )
            
            # 输出格式: "Port 00: <busid>1-1</busid> ..."
            for line in result.stdout.split('\n'):
                if self.devices[serial].busid in line:
                    parts = line.split(':')
                    if parts:
                        port = parts[0].replace('Port', '').strip()
                        return int(port, 16)  # 16 进制
        except Exception as e:
            logger.warning(f"Failed to get port for {serial}: {e}")
        
        return 0
    
    def health_check_loop(self):
        """后台线程：定期健康检查"""
        logger.info("Health check thread started")
        
        while not self._stop_event.is_set():
            try:
                time.sleep(60)  # 每 60 秒检查一次
                
                with self.lock:
                    for serial, device in self.devices.items():
                        if device.state == DeviceState.OFFLINE:
                            continue
                        
                        # Ping 设备
                        alive = self._ping_device(serial)
                        
                        if alive:
                            device.fail_count = 0
                            device.last_ping_time = datetime.now()
                            continue
                        
                        # 失败计数
                        device.fail_count += 1
                        logger.warning(
                            f"Device {serial} ping failed (count={device.fail_count})"
                        )
                        
                        # 超过阈值则标记离线
                        if device.fail_count >= 3:
                            device.state = DeviceState.OFFLINE
                            device.reserved_by = None
                            logger.error(f"Device {serial} marked OFFLINE")
                        
                        # 第一次失败时尝试恢复
                        elif device.fail_count == 1:
                            if self._try_recovery(serial):
                                device.fail_count = 0
                                device.state = DeviceState.IDLE
                    
                    self._save_state()
            
            except Exception as e:
                logger.error(f"Health check error: {e}")
    
    def cleanup_loop(self):
        """后台线程：定期清理过期的租赁"""
        logger.info("Cleanup thread started")
        
        while not self._stop_event.is_set():
            try:
                time.sleep(300)  # 每 5 分钟检查一次
                
                with self.lock:
                    # 清理过期租赁
                    to_remove = []
                    for lease_id, lease in self.leases.items():
                        if lease.is_expired() and lease.status == 'active':
                            lease.status = 'expired'
                            # 强制释放设备
                            if lease.device_serial in self.devices:
                                device = self.devices[lease.device_serial]
                                if device.reserved_by == lease.reserved_by:
                                    device.state = DeviceState.IDLE
                                    device.reserved_by = None
                                    logger.warning(
                                        f"Expired lease {lease_id}, released device"
                                    )
                    
                    self._save_state()
            
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
    
    def start_background_services(self):
        """启动后台线程"""
        self._stop_event.clear()
        
        self._health_check_thread = threading.Thread(
            target=self.health_check_loop,
            daemon=False
        )
        self._health_check_thread.start()
        
        self._cleanup_thread = threading.Thread(
            target=self.cleanup_loop,
            daemon=False
        )
        self._cleanup_thread.start()
    
    def stop_background_services(self):
        """停止后台线程"""
        logger.info("Stopping background services...")
        self._stop_event.set()
        
        if self._health_check_thread:
            self._health_check_thread.join(timeout=10)
        
        if self._cleanup_thread:
            self._cleanup_thread.join(timeout=10)
        
        logger.info("Background services stopped")
    
    def export_metrics(self) -> Dict:
        """导出指标（Prometheus 格式）"""
        with self.lock:
            total = len(self.devices)
            idle = sum(1 for d in self.devices.values() 
                      if d.state == DeviceState.IDLE)
            reserved = sum(1 for d in self.devices.values() 
                          if d.state == DeviceState.RESERVED)
            offline = sum(1 for d in self.devices.values() 
                         if d.state == DeviceState.OFFLINE)
            
            return {
                'timestamp': datetime.now().isoformat(),
                'devices': {
                    'total': total,
                    'idle': idle,
                    'reserved': reserved,
                    'offline': offline,
                    'utilization': (reserved / total) if total > 0 else 0
                },
                'leases': {
                    'active': sum(1 for l in self.leases.values() 
                                 if l.status == 'active'),
                    'expired': sum(1 for l in self.leases.values() 
                                  if l.status == 'expired')
                },
                'devices_detail': [d.to_dict() for d in self.devices.values()]
            }
```

### 1.3 REST API (`api_server.py`)

```python
# src/api_server.py
import json
import logging
from flask import Flask, request, jsonify
from .device_pool import DevicePool

logger = logging.getLogger(__name__)

def create_app(device_pool: DevicePool) -> Flask:
    """工厂函数：创建 Flask 应用"""
    app = Flask(__name__)
    
    @app.route('/health', methods=['GET'])
    def health_check():
        """健康检查端点"""
        return jsonify({'status': 'ok'})
    
    @app.route('/devices', methods=['GET'])
    def list_devices():
        """列出所有设备"""
        devices = device_pool.list_devices()
        return jsonify({
            'devices': [d.to_dict() for d in devices],
            'count': len(devices)
        })
    
    @app.route('/devices/reserve', methods=['POST'])
    def reserve_device():
        """
        预留一个设备。
        
        Request:
        {
            "model": "Pixel 6",              (可选)
            "android_version": "14",         (可选)
            "timeout": 30,                   (可选，秒)
            "user_id": "test_e2e"            (可选)
        }
        
        Response (成功):
        {
            "status": "ok",
            "serial": "FA9BF1A0D1",
            "model": "Pixel 6",
            "android_version": "14"
        }
        
        Response (失败):
        {
            "status": "error",
            "reason": "timeout"
        }
        """
        data = request.json or {}
        model = data.get('model')
        android_version = data.get('android_version')
        timeout = data.get('timeout', 30)
        user_id = data.get('user_id', 'unknown')
        
        import time
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            serial = device_pool.reserve_device(
                model=model,
                android_version=android_version
            )
            
            if serial:
                device = device_pool.devices[serial]
                return jsonify({
                    'status': 'ok',
                    'serial': serial,
                    'model': device.model,
                    'android_version': device.android_version
                }), 200
            
            time.sleep(1)
        
        return jsonify({
            'status': 'error',
            'reason': 'timeout',
            'message': f'No device available after {timeout}s'
        }), 503
    
    @app.route('/devices/<serial>/release', methods=['POST'])
    def release_device(serial):
        """释放一个设备"""
        success = device_pool.release_device(serial)
        
        if success:
            return jsonify({'status': 'ok'})
        else:
            return jsonify({
                'status': 'error',
                'reason': 'device_not_found'
            }), 404
    
    @app.route('/status', methods=['GET'])
    def get_status():
        """获取系统整体状态"""
        return jsonify(device_pool.export_metrics())
    
    @app.errorhandler(Exception)
    def handle_error(error):
        """全局错误处理"""
        logger.exception("Unhandled exception")
        return jsonify({
            'status': 'error',
            'reason': 'internal_error',
            'message': str(error)
        }), 500
    
    return app
```

---

## 第 2 部分：部署和运行

### 2.1 依赖安装 (`requirements.txt`)

```
Flask==2.3.0
flask-cors==4.0.0
requests==2.31.0
pyyaml==6.0
prometheus-client==0.17.0
```

### 2.2 配置文件 (`config/devices.json`)

```json
[
  {
    "serial": "FA9BF1A0D1",
    "model": "Pixel 6 Pro",
    "android_version": "14",
    "busid": "1-1",
    "host_ip": "192.168.1.100"
  },
  {
    "serial": "R39M30MZDLZ",
    "model": "OnePlus 10 Pro",
    "android_version": "13",
    "busid": "1-2",
    "host_ip": "192.168.1.100"
  },
  {
    "serial": "RX8M50AKBPN",
    "model": "Samsung S22",
    "android_version": "13",
    "busid": "1-3",
    "host_ip": "192.168.1.101"
  }
]
```

### 2.3 启动脚本 (`scripts/start_services.sh`)

```bash
#!/bin/bash
set -e

# Android Device Farm 启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Android Device Farm Startup ==="

# 1. 创建虚拟环境（如果不存在）
VENV="$PROJECT_ROOT/venv"
if [ ! -d "$VENV" ]; then
    echo "[1] Creating virtual environment..."
    python3 -m venv "$VENV"
fi

# 2. 激活虚拟环境
source "$VENV/bin/activate"

# 3. 安装依赖
echo "[2] Installing dependencies..."
pip install -q -r "$PROJECT_ROOT/requirements.txt"

# 4. 创建 data 目录
mkdir -p "$PROJECT_ROOT/data/logs"

# 5. 启动 ADB 服务器
echo "[3] Starting ADB server..."
adb kill-server 2>/dev/null || true
sleep 1
adb start-server

# 6. 运行主程序
echo "[4] Starting Device Farm API..."
cd "$PROJECT_ROOT"

python3 -c "
import logging
from src.device_pool import DevicePool
from src.api_server import create_app

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/logs/device_farm.log'),
        logging.StreamHandler()
    ]
)

# 初始化设备池
pool = DevicePool(
    devices_file='config/devices.json',
    state_file='data/state.json'
)

# 启动后台服务
pool.start_background_services()

# 创建 Flask 应用
app = create_app(pool)

# 运行
print('Starting API server on 0.0.0.0:5000')
try:
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)
finally:
    pool.stop_background_services()
"
```

### 2.4 Docker 化 (`docker/Dockerfile`)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    android-tools-adb \
    usbip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制项目
COPY . /app

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 暴露端口
EXPOSE 5000

# 启动脚本
CMD ["python", "-m", "src.main"]
```

### 2.5 Docker Compose (`docker/docker-compose.yml`)

```yaml
version: '3.8'

services:
  device-farm-api:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    container_name: device-farm-api
    ports:
      - "5000:5000"
    volumes:
      - ../config:/app/config
      - ../data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - LOG_LEVEL=INFO
    restart: unless-stopped
    networks:
      - device-farm

  prometheus:
    image: prom/prometheus:latest
    container_name: device-farm-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    restart: unless-stopped
    networks:
      - device-farm

  grafana:
    image: grafana/grafana:latest
    container_name: device-farm-grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped
    networks:
      - device-farm

volumes:
  prometheus_data:
  grafana_data:

networks:
  device-farm:
    driver: bridge
```

---

## 第 3 部分：测试框架集成

### 3.1 pytest 集成

```python
# tests/conftest.py
import pytest
import requests
from typing import Optional

DEVICE_FARM_URL = "http://127.0.0.1:5000"

class DeviceManager:
    """设备管理器（pytest fixture）"""
    
    def __init__(self, base_url: str = DEVICE_FARM_URL):
        self.base_url = base_url
    
    def reserve(self, model: Optional[str] = None, timeout: int = 30) -> str:
        """预留一个设备"""
        response = requests.post(
            f"{self.base_url}/devices/reserve",
            json={
                "model": model,
                "timeout": timeout,
                "user_id": "pytest"
            },
            timeout=timeout + 5
        )
        
        if response.status_code != 200:
            raise RuntimeError(f"Failed to reserve device: {response.text}")
        
        return response.json()['serial']
    
    def release(self, serial: str):
        """释放一个设备"""
        response = requests.post(
            f"{self.base_url}/devices/{serial}/release",
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"Warning: Failed to release {serial}")

@pytest.fixture(scope="function")
def device_manager():
    """设备管理器 fixture"""
    return DeviceManager()

@pytest.fixture(scope="function")
def device(device_manager):
    """单个设备 fixture"""
    serial = device_manager.reserve(timeout=60)
    assert serial, "Failed to reserve device"
    
    yield serial
    
    # Teardown：释放设备
    device_manager.release(serial)
```

### 3.2 测试用例示例

```python
# tests/test_app.py
import subprocess
import pytest

def test_app_launch(device):
    """测试应用启动"""
    # 安装应用
    subprocess.run(
        ["adb", "-s", device, "install", "-r", "app.apk"],
        check=True,
        timeout=120
    )
    
    # 启动应用
    subprocess.run(
        ["adb", "-s", device, "shell", "am", "start", 
         "-n", "com.example.app/.MainActivity"],
        check=True,
        timeout=30
    )
    
    # 验证应用已启动
    result = subprocess.run(
        ["adb", "-s", device, "shell", "pidof", "com.example.app"],
        capture_output=True
    )
    
    assert result.returncode == 0, "App not running"

def test_smoke_suite(device):
    """烟雾测试套件"""
    # 运行 pytest + Appium
    result = subprocess.run(
        ["pytest", "-v", "--device", device],
        check=False
    )
    
    assert result.returncode == 0
```

### 3.3 Appium 集成

```python
# tests/test_appium.py
from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy
import pytest

@pytest.fixture
def driver(device):
    """Appium 驱动 fixture"""
    caps = {
        'platformName': 'Android',
        'deviceName': device,
        'appPackage': 'com.example.app',
        'appActivity': '.MainActivity',
        'automationName': 'UiAutomator2'
    }
    
    driver = webdriver.Remote('http://127.0.0.1:4723', caps)
    
    yield driver
    
    driver.quit()

def test_button_click(driver):
    """测试按钮点击"""
    element = driver.find_element(AppiumBy.ID, 'com.example.app:id/button')
    element.click()
    
    # 验证点击后的结果
    result = driver.find_element(AppiumBy.ID, 'com.example.app:id/result')
    assert result.text == "Success"
```

---

## 第 4 部分：运维和监控

### 4.1 Prometheus 指标导出

```python
# src/metrics_exporter.py
from prometheus_client import Counter, Gauge, start_http_server
from .device_pool import DevicePool
import time
import threading

def export_metrics(pool: DevicePool):
    """导出 Prometheus 指标"""
    
    # 定义指标
    device_total = Gauge('farm_device_total', 'Total devices')
    device_idle = Gauge('farm_device_idle', 'Idle devices')
    device_reserved = Gauge('farm_device_reserved', 'Reserved devices')
    device_offline = Gauge('farm_device_offline', 'Offline devices')
    reservation_duration = Counter('farm_reservation_seconds', 
                                   'Reservation duration')
    
    # 启动 HTTP 服务（端口 8000）
    start_http_server(8000)
    
    # 后台线程：定期更新指标
    def update_metrics():
        while True:
            metrics = pool.export_metrics()
            
            device_total.set(metrics['devices']['total'])
            device_idle.set(metrics['devices']['idle'])
            device_reserved.set(metrics['devices']['reserved'])
            device_offline.set(metrics['devices']['offline'])
            
            time.sleep(10)
    
    thread = threading.Thread(target=update_metrics, daemon=True)
    thread.start()
```

### 4.2 监控告警规则 (`config/prometheus.yml`)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'rules.yml'

scrape_configs:
  - job_name: 'device-farm'
    static_configs:
      - targets: ['localhost:8000']
```

### 4.3 告警规则 (`config/rules.yml`)

```yaml
groups:
  - name: device_farm
    interval: 15s
    rules:
      - alert: HighDeviceUtilization
        expr: farm_device_reserved / farm_device_total > 0.9
        for: 5m
        annotations:
          summary: "Device utilization is high ({{ $value | humanizePercentage }})"
      
      - alert: TooManyOfflineDevices
        expr: farm_device_offline / farm_device_total > 0.2
        for: 10m
        annotations:
          summary: "Too many devices offline ({{ $value | humanizePercentage }})"
```

---

## 第 5 部分：运维手册

### 5.1 常见操作

**启动系统**：
```bash
cd /path/to/android-device-farm
./scripts/start_services.sh
```

**查看设备状态**：
```bash
curl http://127.0.0.1:5000/status | jq
```

**手工预留设备**：
```bash
curl -X POST http://127.0.0.1:5000/devices/reserve \
  -H "Content-Type: application/json" \
  -d '{"model": "Pixel 6", "timeout": 30}'
```

**手工释放设备**：
```bash
curl -X POST http://127.0.0.1:5000/devices/FA9BF1A0D1/release
```

### 5.2 日志分析

```bash
# 查看最近 100 行日志
tail -100 data/logs/device_farm.log

# 查看错误日志
grep ERROR data/logs/device_farm.log

# 实时监控
tail -f data/logs/device_farm.log
```

### 5.3 故障排查

| 问题 | 症状 | 诊断 | 解决 |
|------|------|------|------|
| **ADB 无法识别** | `adb devices` 为空 | 检查 USB/IP 连接 | `usbip attach -r <host_ip> -b <busid>` |
| **设备卡住不释放** | 设备状态永远是 RESERVED | 检查租赁是否过期 | 手工 `POST /devices/<serial>/release` |
| **频繁离线** | 设备状态不断变化 | 检查网络、防火墙 | 增加故障阈值（fail_count >= 5） |
| **性能下降** | 预留响应慢 | 检查负载、日志大小 | 清理旧日志，重启服务 |

---

## 总结：从 MVP 到生产

这个系列的三篇文章覆盖了：

1. **第一部分**：USB/IP 的原理、命令和实践
2. **第二部分**：Device Farm 的系统设计（MVP → 完整系统）
3. **第三部分**：完整实现和部署（现在这篇）

**关键收获**：
- ✅ 理解 USB/IP 如何工作
- ✅ 能够设计一个可靠的设备共享系统
- ✅ 掌握从零到一的完整实现
- ✅ 知道如何部署、监控、运维

**下一步行动**：
1. 克隆这个项目：https://github.com/dvdface/android-device-farm
2. 按照部署指南配置你的环境
3. 运行示例测试
4. 根据需要进行定制

**社区贡献**：
- 发现 bug？提 Issue
- 有改进意见？发 PR
- 有问题？讨论区 Discussions

---

## 参考资源

**完整代码**：
- [GitHub Repository](https://github.com/dvdface/android-device-farm)
- [API 文档](./API.md)
- [部署指南](./DEPLOYMENT.md)

**相关技术**：
- [Appium 官方文档](http://appium.io/)
- [pytest 文档](https://docs.pytest.org/)
- [Prometheus 监控](https://prometheus.io/)

**社区讨论**：
- GitHub Issues
- Android 开发论坛
- 自动化测试社区

---

*本文最后更新于 2024-05-23*
