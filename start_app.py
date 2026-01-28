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


def check_installation():
    """检查是否已经完成安装"""
    # 检查安装标记文件
    install_marker = Path(".installed")
    if install_marker.exists():
        return True
    
    # 检查虚拟环境和依赖
    venv_path = Path(".venv")
    if not venv_path.exists():
        return False
    
    # 检查Python依赖
    try:
        venv_python = venv_path / ("Scripts" if os.name == 'nt' else "bin") / ("python.exe" if os.name == 'nt' else "python")
        result = subprocess.run([str(venv_python), "-c", "import fastapi, uvicorn, yaml"], 
                              capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False
    
    # 检查前端依赖
    frontend_modules = Path("shelter-ui") / "node_modules"
    if not frontend_modules.exists():
        return False
    
    return True


def mark_installed():
    """标记为已安装"""
    install_marker = Path(".installed")
    install_marker.touch()
    print_success("安装完成标记已设置")


def install_dependencies():
    """安装所有依赖和环境"""
    print_header()
    print_info("开始安装AI Shelter依赖和环境...")
    
    # 检查虚拟环境
    print_info("检查虚拟环境...")
    venv_path = Path(".venv")
    if not venv_path.exists():
        print_warning("虚拟环境不存在，正在创建...")
        try:
            # 尝试使用uv创建虚拟环境（如果已安装）
            try:
                subprocess.run(["uv", "venv", ".venv"], capture_output=True, check=True)
                print_success("虚拟环境创建成功！（使用uv）")
            except (subprocess.CalledProcessError, FileNotFoundError):
                # 回退到标准venv
                subprocess.run([sys.executable, "-m", "venv", ".venv"], check=True)
                print_success("虚拟环境创建成功！（使用venv）")
        except subprocess.CalledProcessError:
            print_error("创建虚拟环境失败！")
            sys.exit(1)
    else:
        print_success("虚拟环境已存在")
    
    # 获取虚拟环境Python路径
    if os.name == 'nt':  # Windows
        venv_python = venv_path / "Scripts" / "python.exe"
    else:  # Unix
        venv_python = venv_path / "bin" / "python"
    
    # 安装Python依赖（使用uv管理）
    print_info("安装Python依赖（使用uv）...")
    
    # 检查是否已安装uv
    try:
        subprocess.run(["uv", "--version"], capture_output=True, check=True)
        print_success("uv已安装，使用uv管理依赖")
        use_uv = True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_warning("uv未安装，使用pip作为备用方案")
        print_info("推荐安装uv以获得更好的依赖管理：")
        print_info("  Windows: curl -LsSf https://astral.sh/uv/install.sh | sh")
        print_info("  Linux/Mac: curl -LsSf https://astral.sh/uv/install.sh | sh")
        use_uv = False
    
    if use_uv:
        # 使用uv安装依赖
        try:
            # 创建虚拟环境（如果不存在）
            if not venv_path.exists():
                subprocess.run(["uv", "venv", ".venv"], check=True)
                print_success("虚拟环境创建成功！")
            
            # 使用uv同步依赖
            subprocess.run(["uv", "sync", "--frozen"], check=True)
            print_success("Python依赖安装成功！（使用uv）")
            
            # 验证安装版本
            print_info("验证依赖版本...")
            result = subprocess.run([str(venv_python), "-m", "pip", "show", "openai"], capture_output=True, text=True, check=False)
            if "1.44.0" in result.stdout:
                print_success("OpenAI版本验证通过 (1.44.0)")
            else:
                print_warning(f"OpenAI版本可能不正确: {result.stdout}")
                
        except subprocess.CalledProcessError as e:
            print_error(f"uv依赖安装失败: {e}")
            print_info("回退到pip安装...")
            use_uv = False
    
    if not use_uv:
        # 回退到pip安装
        try:
            # 先升级pip
            subprocess.run([str(venv_python), "-m", "pip", "install", "--upgrade", "pip"], check=False)
            
            # 强制卸载并重新安装OpenAI，确保使用指定版本
            print_info("确保OpenAI使用指定版本...")
            subprocess.run([str(venv_python), "-m", "pip", "uninstall", "-y", "openai"], check=False)
            
            # 强制安装所有依赖，使用指定版本
            subprocess.run([str(venv_python), "-m", "pip", "install", "-r", "requirements.txt", "--force-reinstall", "--no-cache-dir"], check=True)
            print_success("Python依赖安装成功！（使用pip）")
            
            # 验证安装版本
            print_info("验证依赖版本...")
            result = subprocess.run([str(venv_python), "-m", "pip", "show", "openai"], capture_output=True, text=True, check=False)
            if "1.44.0" in result.stdout:
                print_success("OpenAI版本验证通过 (1.44.0)")
            else:
                print_warning(f"OpenAI版本可能不正确: {result.stdout}")
                
        except subprocess.CalledProcessError:
            print_error("Python依赖安装失败！尝试使用忽略已安装选项...")
            # 第二次尝试，忽略已安装的包
            try:
                subprocess.run([str(venv_python), "-m", "pip", "install", "-r", "requirements.txt", "--force-reinstall", "--ignore-installed", "--no-cache-dir"], check=True)
                print_success("Python依赖安装成功！")
            except subprocess.CalledProcessError:
                print_error("Python依赖安装最终失败！")
                sys.exit(1)
    
    # 安装前端依赖
    print_info("安装前端依赖...")
    frontend_modules = Path("shelter-ui") / "node_modules"
    if not frontend_modules.exists():
        try:
            if sys.platform == 'win32':
                subprocess.run("npm install", cwd="shelter-ui", shell=True, check=True, encoding='gbk', errors='ignore')
            else:
                subprocess.run("npm install", cwd="shelter-ui", shell=True, check=True)
            print_success("前端依赖安装成功！")
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print_error(f"前端依赖安装失败: {e}")
            print_error("请确保Node.js和npm已安装")
            sys.exit(1)
    else:
        print_success("前端依赖已存在")
    
    # 构建前端
    print_info("构建前端应用...")
    frontend_build_path = Path("shelter-ui") / "build"
    try:
        # 删除旧的 build 目录以确保完全重新构建
        if frontend_build_path.exists():
            import shutil
            shutil.rmtree(frontend_build_path)
            print_success("旧构建目录已清理")
        
        # 设置生产环境构建变量
        build_env = os.environ.copy()
        build_env["REACT_APP_API_URL"] = ""
        
        print_info("运行: npm run build")
        if sys.platform == 'win32':
            subprocess.run(
                "npm run build",
                cwd="shelter-ui",
                shell=True,
                check=True,
                stdout=sys.stdout,
                stderr=sys.stderr,
                encoding='gbk',
                errors='ignore',
                env=build_env
            )
        else:
            subprocess.run(
                "npm run build",
                cwd="shelter-ui",
                shell=True,
                check=True,
                stdout=sys.stdout,
                stderr=sys.stderr,
                env=build_env
            )
        
        if frontend_build_path.exists():
            print_success("前端构建成功！")
        else:
            print_error("前端构建失败，构建目录未找到")
            sys.exit(1)
            
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print_error(f"前端构建失败: {e}")
        print_error("请确保Node.js和npm已正确安装")
        sys.exit(1)
    
    # 设置安装标记
    mark_installed()
    print_success("所有依赖和环境安装完成！")


def main():

    # 解析命令行参数
    if len(sys.argv) > 1 and sys.argv[1] == "install":
        install_dependencies()
        return

    print_header()

    # 检查是否已安装
    if not check_installation():
        print_error("环境未安装！")
        print_info("请先运行安装命令: python start_app.py install")
        print_info("或手动安装依赖和环境")
        sys.exit(1)
    
    print_success("检测到环境已安装，跳过安装步骤")

    # 用于存储子进程
    processes = []

    # 解析其他命令行参数
    debug_mode = '--debug' in sys.argv
    dev_mode = '--dev' in sys.argv

    if debug_mode:
        print_warning("完整调试模式已启用：后端详细日志 + 前端开发模式")
    if dev_mode:
        print_warning("前端开发模式已启用：React热重载")

    try:
        # 统一端口配置：使用环境变量或默认值
        backend_port = int(os.getenv("BACKEND_PORT", "8000"))
        frontend_dev_port = int(os.getenv("FRONTEND_DEV_PORT", "3000"))
        
        print_info(f"Checking port {backend_port} availability...")
        if not check_port(backend_port):
            print_warning(f"Port {backend_port} is already in use!")
            choice = input(f"Use alternative port {backend_port + 1}? [Y/n]: ").strip().lower()
            if choice != 'n':
                backend_port = backend_port + 1
                print_success(f"Using port {backend_port}")
            else:
                print_warning(f"Trying with port {backend_port}...")

        # 激活虚拟环境
        print_success("激活虚拟环境...")
        venv_path = Path(".venv")
        if os.name == 'nt':  # Windows
            venv_python = venv_path / "Scripts" / "python.exe"
        else:  # Unix
            venv_python = venv_path / "bin" / "python"

        # 检查前端构建
        print_info("Checking frontend build...")
        frontend_build_path = Path("shelter-ui") / "build"

        # 检查是否使用前端开发模式或调试模式
        if dev_mode or debug_mode:
            print_success("前端开发模式已启用，跳过构建步骤")
            print_info("请在另一个终端运行: cd shelter-ui && npm start")
            print_info("然后访问: http://localhost:3000")
        else:
            # 正常模式：检查是否已构建前端
            if frontend_build_path.exists():
                print_success("前端已构建，跳过构建步骤")
            else:
                print_error("前端未构建，请先运行: python start_app.py install")
                print_info("或手动构建: cd shelter-ui && npm run build")
                sys.exit(1)



        # 统一端口配置：前端端口在正常模式下使用后端端口，开发模式下使用前端开发端口
        frontend_port = backend_port  # 正常模式下前端由后端服务
        frontend_dev_port = int(os.getenv("FRONTEND_DEV_PORT", "3000"))  # 开发模式前端端口

        # 启动服务
        print("\n" + "=" * 40)
        print(f"{Colors.BOLD}    Starting Services{Colors.ENDC}")
        print("=" * 40 + "\n")

        if dev_mode or debug_mode:
            print_warning("前端开发模式：React热重载已启用")
            print_info(f"前端地址: http://localhost:{frontend_dev_port}")
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
        env["BACKEND_PORT"] = str(backend_port)  # 传递端口到后端

        if debug_mode:
            env["PYTHONUNBUFFERED"] = "1"  # 确保Python输出不被缓冲

        try:
            print_info("启动后端服务...")
            print("=" * 50)
            # 启动成功后显示访问信息
            print("\n" + "=" * 40)
            print(f"{Colors.BOLD}    Access Your Application{Colors.ENDC}")
            print("=" * 40)
            if dev_mode or debug_mode:
                print_info(f"Open in browser: http://localhost:{frontend_dev_port}")
            else:
                print_info(f"Open in browser: http://localhost:{backend_port}")
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
        print_error(f"启动过程中发生错误: {e}")
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
