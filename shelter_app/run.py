#!/usr/bin/env python3
"""
后端服务启动入口
"""
import sys
import os
import uvicorn

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shelter_app.app import app

if __name__ == "__main__":
    # 解析命令行参数
    debug_mode = '--debug' in sys.argv or '-d' in sys.argv
    no_reload = '--no-reload' in sys.argv or '-n' in sys.argv
    
    # 设置日志级别
    log_level = 'debug' if debug_mode else 'info'
    reload = not no_reload
    
    print(f"启动后端服务 - Debug模式: {debug_mode}, 热重载: {reload}")
    
    uvicorn.run(
        "shelter_app.app:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=reload,
        log_level=log_level
    )