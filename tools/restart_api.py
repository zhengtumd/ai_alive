#!/usr/bin/env python3
"""
API 重启工具 - 用于重启后端服务
"""
import requests
import time
import sys

def restart_api():
    """重启后端 API 服务"""
    try:
        # 尝试访问 API 检查是否正在运行
        response = requests.get("http://localhost:8000/status", timeout=5)
        if response.status_code == 200:
            print("API 服务正在运行，正在重启...")
            # 发送重启请求
            restart_response = requests.post("http://localhost:8000/reset", timeout=10)
            if restart_response.status_code == 200:
                print("API 重启成功！")
                return True
            else:
                print(f"重启请求失败: {restart_response.status_code}")
                return False
        else:
            print("API 服务未运行或无法访问")
            return False
    except requests.exceptions.RequestException as e:
        print(f"无法连接到 API 服务: {e}")
        print("请确保后端服务正在运行")
        return False

def main():
    """主函数"""
    print("正在重启 AI Shelter API 服务...")
    
    if restart_api():
        print("重启完成！")
        return 0
    else:
        print("重启失败，请检查后端服务状态")
        return 1

if __name__ == "__main__":
    sys.exit(main())