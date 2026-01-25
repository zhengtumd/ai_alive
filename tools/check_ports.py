#!/usr/bin/env python3
"""
端口检测工具 - 检查并自动选择可用端口
"""
import socket
import sys

def is_port_available(port):
    """检查端口是否可用"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            result = sock.connect_ex(('localhost', port))
            # 0 表示端口被占用，但需要区分系统进程和用户进程
            if result == 0:
                # 端口被占用，但可能是系统进程
                return False
            else:
                # 端口可用
                return True
    except Exception:
        return False

def find_available_port(start_port, max_tries=10):
    """从指定端口开始查找可用端口"""
    for port in range(start_port, start_port + max_tries):
        if is_port_available(port):
            return port
    return None

def check_ports():
    """检查主端口并返回可用端口信息"""
    backend_port = 8000
    frontend_port = 3000
    
    backend_available = is_port_available(backend_port)
    frontend_available = is_port_available(frontend_port)
    
    result = {
        'backend': {
            'port': backend_port,
            'available': backend_available,
            'alternative': None
        },
        'frontend': {
            'port': frontend_port,
            'available': frontend_available,
            'alternative': None
        }
    }
    
    # 如果主端口不可用，查找备用端口
    if not backend_available:
        result['backend']['alternative'] = find_available_port(8001)
    
    if not frontend_available:
        result['frontend']['alternative'] = find_available_port(3001)
    
    return result

def main():
    """主函数 - 用于命令行调用"""
    port_info = check_ports()
    
    print("端口检测结果:")
    print(f"后端服务 (默认端口 {port_info['backend']['port']}):")
    if port_info['backend']['available']:
        print("  ✓ 端口可用")
    else:
        print("  ✗ 端口被占用")
        if port_info['backend']['alternative']:
            print(f"  → 建议使用端口: {port_info['backend']['alternative']}")
    
    print(f"前端服务 (默认端口 {port_info['frontend']['port']}):")
    if port_info['frontend']['available']:
        print("  ✓ 端口可用")
    else:
        print("  ✗ 端口被占用")
        if port_info['frontend']['alternative']:
            print(f"  → 建议使用端口: {port_info['frontend']['alternative']}")
    
    # 返回退出码：0=所有端口可用，1=有端口被占用
    if port_info['backend']['available'] and port_info['frontend']['available']:
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())