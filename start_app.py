#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""AI Shelter 启动脚本

使用方法:
    python start_app.py        # 正常模式（每次启动自动重新构建前端）
    python start_app.py --debug  # 完整调试模式（后端详细日志 + 前端热重载）
    python start_app.py --dev    # 前端开发模式（React热重载，不自动构建）

说明:
    - 正常模式：每次启动自动构建前端，后端支持热重载
    - 完整调试模式：后端详细日志 + 前端开发模式，最佳调试体验
    - 前端开发模式：跳过构建，需要手动运行 npm start，前端代码热重载

前端开发模式使用：
    python start_app.py --dev
    然后在另一个终端运行：cd shelter-ui && npm start
    访问 http://localhost:3000
"""
import os
import sys
import subprocess
import socket
import time
import locale
from pathlib import Path

# 设置标准输出编码为UTF-8,解决Windows编码问题
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# ANSI 颜色代码
class Colors:
    """ANSI 颜色代码"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

    @staticmethod
    def disable():
        """禁用颜色（用于不支持 ANSI 的终端）"""
        Colors.HEADER = ''
        Colors.OKBLUE = ''
        Colors.OKCYAN = ''
        Colors.OKGREEN = ''
        Colors.WARNING = ''
        Colors.FAIL = ''
        Colors.ENDC = ''
        Colors.BOLD = ''
        Colors.UNDERLINE = ''


def check_port(port):
    """检查端口是否可用"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', port))
        return True
    except OSError:
        return False


def print_header():
    """打印标题"""
    print("\n" + "=" * 40)
    print(f"{Colors.BOLD}    AI Shelter Startup Script{Colors.ENDC}")
    print("=" * 40 + "\n")


def print_info(msg):
    print(f"{Colors.OKBLUE}[INFO]{Colors.ENDC} {msg}")
    sys.stdout.flush()


def print_success(msg):
    print(f"{Colors.OKGREEN}[SUCCESS]{Colors.ENDC} {msg}")
    sys.stdout.flush()


def print_warning(msg):
    print(f"{Colors.WARNING}[WARNING]{Colors.ENDC} {msg}")
    sys.stdout.flush()


def print_error(msg):
    print(f"{Colors.FAIL}[ERROR]{Colors.ENDC} {msg}")
    sys.stdout.flush()


def main():

    print_header()

    # 用于存储子进程
    processes = []

    # 解析命令行参数
    debug_mode = '--debug' in sys.argv
    dev_mode = '--dev' in sys.argv

    if debug_mode:
        print_warning("完整调试模式已启用：后端详细日志 + 前端开发模式")
    if dev_mode:
        print_warning("前端开发模式已启用：React热重载")

    try:
        # 检查后端端口
        backend_port = 8000
        print_info("Checking port 8000 availability...")
        if not check_port(backend_port):
            print_warning("Port 8000 is already in use!")
            choice = input("Use alternative port 8001? [Y/n]: ").strip().lower()
            if choice != 'n':
                backend_port = 8001
                print_success(f"Using port {backend_port}")
            else:
                print_warning("Trying with port 8000...")

        # 检查虚拟环境
        print_info("Checking virtual environment...")
        venv_path = Path(".venv")
        if not venv_path.exists():
            print_error("Virtual environment not found!")
            choice = input("Create virtual environment now? [Y/n]: ").strip().lower()
            if choice != 'n':
                print_info("Creating virtual environment...")
                try:
                    subprocess.run([sys.executable, "-m", "venv", ".venv"], check=True)
                    print_success("Virtual environment created successfully!\n")
                except subprocess.CalledProcessError:
                    print_error("Failed to create virtual environment!")
                    sys.exit(1)
            else:
                print_error("Cannot continue without virtual environment.")
                sys.exit(1)

        # 激活虚拟环境
        print_success("Activating virtual environment...")
        if os.name == 'nt':  # Windows
            activate_script = venv_path / "Scripts" / "activate.bat"
            # 在 Windows 中，我们需要设置环境变量
            venv_python = venv_path / "Scripts" / "python.exe"
        else:  # Unix
            venv_python = venv_path / "bin" / "python"

        # 安装 Python 依赖
        print_info("Checking Python dependencies...")
        print_info("Running: pip install -r requirements.txt")
        subprocess.run([str(venv_python), "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print_success("Python dependencies checked successfully!")

        # 检查前端依赖
        print_info("Checking frontend dependencies...")
        if not (Path("shelter-ui") / "node_modules").exists():
            print_warning("Frontend dependencies not found!")
            choice = input("Install frontend dependencies? [Y/n]: ").strip().lower()
            if choice != 'n':
                print_info("Installing frontend dependencies...")
                try:
                    # Windows上使用GBK编码读取输出,忽略编码错误
                    if sys.platform == 'win32':
                        subprocess.run(
                            "npm install",
                            cwd="shelter-ui",
                            shell=True,
                            check=True,
                            encoding='gbk',
                            errors='ignore'
                        )
                    else:
                        subprocess.run(
                            "npm install",
                            cwd="shelter-ui",
                            shell=True,
                            check=True
                        )
                    print_success("Frontend dependencies installed successfully!\n")
                except (subprocess.CalledProcessError, FileNotFoundError) as e:
                    print_error(f"Failed to install frontend dependencies: {e}")
                    print_error("Please make sure Node.js and npm are installed.")
                    sys.exit(1)
            else:
                print_error("Cannot start without frontend dependencies.")
                sys.exit(1)
        else:
            print_success("Frontend dependencies already installed!")

        # 检查前端构建
        print_info("Checking frontend build...")
        frontend_build_path = Path("shelter-ui") / "build"

        # 检查是否使用前端开发模式或调试模式
        if dev_mode or debug_mode:
            print_success("前端开发模式已启用，跳过构建步骤")
            print_info("请在另一个终端运行: cd shelter-ui && npm start")
            print_info("然后访问: http://localhost:3000")
        else:
            # 正常模式：每次都重新构建前端
            print_info("Building frontend (rebuild every time)...")
            try:
                # 删除旧的 build 目录以确保完全重新构建
                if frontend_build_path.exists():
                    print_info("Cleaning old build directory...")
                    import shutil
                    shutil.rmtree(frontend_build_path)
                    print_success("Old build directory removed")
                else:
                    print_info("No old build directory found")
                
                sys.stdout.flush()
                
                # 先删除 node_modules/.cache 避免缓存问题
                cache_path = Path("shelter-ui") / "node_modules" / ".cache"
                if cache_path.exists():
                    import shutil
                    shutil.rmtree(cache_path)
                    print_info("Cleared node_modules/.cache")
                    sys.stdout.flush()
                
                print_info("Running: npm run build")
                print_info("Current directory:", str(Path.cwd()))
                print_info("Build target:", str(frontend_build_path))
                sys.stdout.flush()
                
                # Windows上使用GBK编码读取输出,避免编码错误
                if sys.platform == 'win32':
                    result = subprocess.run(
                        "npm run build",
                        cwd="shelter-ui",
                        shell=True,
                        check=True,
                        stdout=sys.stdout,
                        stderr=sys.stderr,
                        encoding='gbk',
                        errors='ignore'
                    )
                else:
                    result = subprocess.run(
                        "npm run build",
                        cwd="shelter-ui",
                        shell=True,
                        check=True,
                        stdout=sys.stdout,
                        stderr=sys.stderr
                    )
                
                # 检查构建是否成功
                if frontend_build_path.exists():
                    print_success("Frontend built successfully!")
                    # 列出构建产物
                    import os
                    if (frontend_build_path / "static").exists():
                        js_files = list((frontend_build_path / "static" / "js").glob("*.js"))
                        print_info(f"Generated {len(js_files)} JS files")
                        for js_file in js_files:
                            print_info(f"  - {js_file.name}")
                    print()
                else:
                    print_error("Build directory not found after build!")
                    sys.exit(1)
                    
            except (subprocess.CalledProcessError, FileNotFoundError) as e:
                print_error(f"Failed to build frontend: {e}")
                print_error("Please make sure Node.js and npm are installed.")
                sys.exit(1)



        # 读取前端端口配置(现在主要用后端端口)
        frontend_port = 8000
        env_file = Path("shelter-ui") / ".env"
        if env_file.exists():
            # 使用UTF-8编码打开.env文件,并忽略编码错误
            with open(env_file, encoding='utf-8', errors='ignore') as f:
                for line in f:
                    if line.startswith("REACT_APP_FRONTEND_PORT="):
                        frontend_port = int(line.split("=")[1].strip())
                        break

        # 启动服务
        print("\n" + "=" * 40)
        print(f"{Colors.BOLD}    Starting Services{Colors.ENDC}")
        print("=" * 40 + "\n")

        if dev_mode or debug_mode:
            print_warning("前端开发模式：React热重载已启用")
            print_info(f"前端地址: http://localhost:3000")
            print_info(f"后端地址: http://localhost:{backend_port}")
            print_warning("请在另一个终端运行: cd shelter-ui && npm start")
        else:
            print_info(f"后端服务器: http://localhost:{backend_port} (包含前端静态文件)")

        if debug_mode:
            print_warning("调试模式：详细日志已启用")

        print("=" * 40)
        print(f"{Colors.BOLD}Server logs will appear below:{Colors.ENDC}")
        print("=" * 40 + "\n")

        # 设置环境变量并启动后端
        env = os.environ.copy()
        env["PYTHONPATH"] = str(Path.cwd())

        if debug_mode:
            env["PYTHONUNBUFFERED"] = "1"  # 确保Python输出不被缓冲

        try:
            print_info("启动后端服务...")
            print("=" * 50)
            # 启动成功后显示访问信息
            print("\n" + "=" * 40)
            print(f"{Colors.BOLD}    Access Your Application{Colors.ENDC}")
            print("=" * 40)
            print_info(f"Open in browser: http://localhost:{frontend_port}")
            print("=" * 40)
            print("")
            
            # 使用Popen启动后端服务，以便正确传递Ctrl+C信号
            uvicorn_args = ["shelter_app/run.py"]
            if debug_mode:
                uvicorn_args.append("--debug")

            backend_process = subprocess.Popen(
                [str(venv_python)] + uvicorn_args,
                env=env,
                stdout=sys.stdout,
                stderr=sys.stderr
            )
            
            # 等待进程结束，并处理Ctrl+C
            try:
                backend_process.wait()
                
                # 后端服务正常退出后显示成功信息
                if backend_process.returncode == 0:
                    print_success("后端服务已正常停止")
                else:
                    print_error(f"后端服务异常退出，退出码: {backend_process.returncode}")
                    
            except KeyboardInterrupt:
                print("\n")
                print_info("接收到中断信号，正在停止服务...")
                
                # 在Windows上发送CTRL_BREAK_EVENT信号
                if os.name == 'nt':
                    try:
                        backend_process.send_signal(subprocess.signal.CTRL_BREAK_EVENT)
                    except:
                        pass
                
                # 终止进程
                backend_process.terminate()
                
                # 等待进程结束
                try:
                    backend_process.wait(timeout=5)
                    print_success("服务已成功停止")
                except subprocess.TimeoutExpired:
                    backend_process.kill()
                    print_warning("服务被强制终止")
            
        except Exception as e:
            print_error(f"启动后端服务时发生错误: {e}")
            
        finally:
            print_info("应用已停止运行")

    except Exception as e:
        print_error(f"Error during startup: {e}")
        # 确保在异常情况下也清理进程
        for proc in processes:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
        sys.exit(1)


if __name__ == "__main__":
    main()
