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
    然后在另一个终端运行：cd shelter_ui && npm start
    访问 http://localhost:3000
"""
import os
import sys
import subprocess
import socket
import time
from pathlib import Path

# 设置标准输出编码为UTF-8,解决Windows编码问题
if sys.platform == 'win32':
    import codecs
    try:
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    except:
        # 如果 stdout 不是二进制模式，重新打开
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
else:
    # Linux/Mac 设置输出编码
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

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






def get_uv_path():
    """获取 uv 可执行文件的绝对路径"""
    # 尝试多个可能的安装位置
    possible_paths = []

    if sys.platform == "win32":
        # Windows 环境下的可能路径
        user_profile = os.environ.get("USERPROFILE", "")
        possible_paths.extend([
            os.path.expanduser(r"~\.cargo\bin\uv.exe"),
            os.path.expanduser(r"~\.local\bin\uv.exe"),
            os.path.expanduser(r"~\AppData\Local\Programs\uv\uv.exe"),
            os.path.join(user_profile, r".cargo\bin\uv.exe") if user_profile else None,
            "uv.exe",  # PATH 中
            "uv",  # PATH 中（有些情况）
        ])
    else:
        # Linux/Mac 环境下的可能路径
        possible_paths.extend([
            os.path.expanduser("~/.local/bin/uv"),
            os.path.expanduser("~/.cargo/bin/uv"),
            "/usr/local/bin/uv",
            "uv",  # PATH 中
        ])

    # 过滤掉 None 值
    possible_paths = [p for p in possible_paths if p is not None]

    for path in possible_paths:
        if os.path.exists(path):
            return path

    # 如果所有路径都不存在，尝试使用 which/where 命令查找
    try:
        if sys.platform == "win32":
            result = subprocess.run(["where", "uv.exe"], capture_output=True, text=True, check=True)
            if result.stdout.strip():
                return result.stdout.strip().split("\n")[0]
        else:
            result = subprocess.run(["which", "uv"], capture_output=True, text=True, check=True)
            if result.stdout.strip():
                return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    # 如果还是找不到，返回默认路径
    if sys.platform == "win32":
        return os.path.expanduser(r"~\.cargo\bin\uv.exe")
    else:
        return os.path.expanduser("~/.local/bin/uv")


def check_installation():
    """检查是否已经完成安装"""
    # 检查安装标记文件
    install_marker = Path(".installed")
    if install_marker.exists():
        print_info("检测到安装标记，跳过依赖检查")
        return True

    # 如果没有标记文件，检查关键依赖
    print_info("未检测到安装标记，检查依赖...")

    # 获取 uv 路径
    uv_path = get_uv_path()
    print_info(f"check_installation: uv 路径 = {uv_path}")
    print_info(f"check_installation: uv 存在 = {os.path.exists(uv_path)}")

    # 检查uv是否存在
    try:
        result = subprocess.run([uv_path, "--version"], capture_output=True, text=True, check=True)
        print_info(f"uv 版本: {result.stdout.strip()}")
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print_warning(f"uv 未安装或无法访问: {e}")
        return False

    # 检查Python依赖（使用uv绝对路径）
    try:
        subprocess.run(
            [uv_path, "run", "python", "-c", "import fastapi, uvicorn, yaml"],
            capture_output=True,
            check=True
        )
        print_info("Python 依赖检查通过")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_warning("Python 依赖不完整")
        return False

    # 检查前端依赖
    frontend_modules = Path("shelter_ui") / "node_modules"
    if not frontend_modules.exists():
        print_warning("前端依赖未安装")
        return False
    print_info("前端依赖检查通过")

    # 检查前端构建（Vite 默认输出到 dist，但也兼容 build）
    frontend_build_path = Path("shelter_ui") / "build"
    vite_build_path = Path("shelter_ui") / "dist"
    if not frontend_build_path.exists() and not vite_build_path.exists():
        print_warning("前端未构建")
        return False
    print_info("前端构建检查通过")

    # 所有检查通过后，创建安装标记
    install_marker.touch()
    print_success("依赖检查完成，已创建安装标记")

    return True


def mark_installed():
    """标记为已安装"""
    install_marker = Path(".installed")
    install_marker.touch()
    print_success("安装完成标记已设置")


def install_dependencies():
    """安装所有依赖和环境（使用uv统一管理）"""
    print_header()
    print_info("开始安装AI Shelter依赖和环境...")

    # 检查uv是否可用，如果未安装则自动安装
    uv_installed = False
    try:
        subprocess.run(["uv", "--version"], capture_output=True, check=True)
        print_success("uv 已安装并可用")
        uv_installed = True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_warning("uv 未安装，正在自动安装...")

        # 自动安装 uv
        try:
            if sys.platform == "win32":
                # Windows 系统使用 PowerShell 安装
                subprocess.run(
                    ["powershell", "-Command", "irm https://astral.sh/uv/install.ps1 | iex"],
                    check=True
                )
                print_success("uv 安装成功！（Windows）")
            else:
                # Linux/Mac 系统使用 shell 安装
                subprocess.run(
                    "curl -LsSf https://astral.sh/uv/install.sh | sh",
                    shell=True,
                    check=True
                )
                print_success("uv 安装成功！（Linux/Mac）")

            # 添加 uv 到 PATH（使用绝对路径）
            # 在 Windows 上，使用 where 命令查找 uv 的实际位置
            if sys.platform == "win32":
                try:
                    result = subprocess.run(["where", "uv.exe"], capture_output=True, text=True, check=True)
                    if result.stdout.strip():
                        uv_path = result.stdout.strip().split("\n")[0]
                        print_success(f"通过 where 找到 uv: {uv_path}")
                    else:
                        uv_path = get_uv_path()
                except (subprocess.CalledProcessError, FileNotFoundError):
                    uv_path = get_uv_path()
            else:
                uv_path = get_uv_path()

            uv_bin_dir = os.path.dirname(uv_path)
            print_info(f"检测到 uv 路径: {uv_path}")
            print_info(f"uv 目录: {uv_bin_dir}")
            print_info(f"文件存在: {os.path.exists(uv_path)}")
            if os.path.exists(uv_path):
                print_info("更新 PATH 环境变量...")
                os.environ["PATH"] = uv_bin_dir + os.pathsep + os.environ.get("PATH", "")

                # 给系统一点时间更新
                time.sleep(2)

                # 重新检查 uv 是否可用（使用绝对路径）
                try:
                    result = subprocess.run([uv_path, "--version"], capture_output=True, text=True, check=True)
                    print_success(f"uv 验证通过：{result.stdout.strip()}")
                    uv_installed = True
                except subprocess.CalledProcessError:
                    print_error("uv 安装失败或无法执行")
                    sys.exit(1)
            else:
                print_error("uv 安装失败，找不到可执行文件")
                print_info("请手动安装 uv 或确认安装位置")
                sys.exit(1)

        except subprocess.CalledProcessError as e:
            print_error(f"uv 自动安装失败: {e}")
            print_info("请手动安装 uv：")
            print_info("  - Linux/Mac: curl -LsSf https://astral.sh/uv/install.sh | sh")
            print_info("  - Windows: powershell -c \"irm https://astral.sh/uv/install.ps1 | iex\"")
            sys.exit(1)

    if not uv_installed:
        print_error("uv 未能正确安装")
        sys.exit(1)

    # 同步Python依赖（uv自动管理虚拟环境）
    print_info("同步Python依赖（使用 uv sync）...")
    try:
        # 使用统一函数获取 uv 路径
        uv_path = get_uv_path()
        print_info(f"uv sync: uv 路径 = {uv_path}, 存在 = {os.path.exists(uv_path)}")
        if os.path.exists(uv_path):
            subprocess.run([uv_path, "sync"], check=True)
            print_success("Python依赖安装成功！（使用 uv）")

            # 验证安装版本
            result = subprocess.run([uv_path, "run", "python", "-c", "import openai; print(openai.__version__)"],
                               capture_output=True, text=True, check=True)
            if "1.44.0" in result.stdout:
                print_success("OpenAI版本验证通过 (1.44.0)")
            else:
                print_warning(f"OpenAI版本: {result.stdout.strip()}")
        else:
            print_error("未找到 uv 可执行文件")
            sys.exit(1)
    except subprocess.CalledProcessError as e:
        print_error(f"Python依赖安装失败: {e}")
        sys.exit(1)

    # 安装前端依赖
    print_info("安装前端依赖...")
    frontend_modules = Path("shelter_ui") / "node_modules"
    frontend_dir = Path("shelter_ui")
    package_lock = frontend_dir / "package-lock.json"

    # 检测是否在 WSL 环境中
    is_wsl = sys.platform.startswith('linux') and os.name != 'nt'
    is_windows = sys.platform == 'win32'

    # 统一平台兼容性清理：清理所有平台相关的 esbuild 依赖
    print_info("检查并清理平台相关的依赖...")
    if frontend_modules.exists():
        esbuild_win = frontend_modules / "@esbuild" / "win32-x64"
        esbuild_linux = frontend_modules / "@esbuild" / "linux-x64"
        esbuild_darwin = frontend_modules / "@esbuild" / "darwin-x64"

        needs_cleanup = False
        platforms_to_clean = []

        # 检测当前环境不匹配的平台
        if is_wsl and esbuild_win.exists():
            platforms_to_clean.append("win32-x64")
            needs_cleanup = True
        elif is_windows and (esbuild_linux.exists() or esbuild_darwin.exists()):
            if esbuild_linux.exists():
                platforms_to_clean.append("linux-x64")
            if esbuild_darwin.exists():
                platforms_to_clean.append("darwin-x64")
            needs_cleanup = True

        # 在 WSL 环境中，额外清理 macOS 平台依赖
        if is_wsl and esbuild_darwin.exists():
            if "darwin-x64" not in platforms_to_clean:
                platforms_to_clean.append("darwin-x64")
            needs_cleanup = True

        # 如果检测到多个平台依赖，统一清理并重新安装
        if needs_cleanup:
            platforms_str = ", ".join(platforms_to_clean)
            print_warning(f"检测到不匹配的平台依赖: {platforms_str}")
            print_info("清理所有平台依赖并重新安装...")

            try:
                # 清理命令：根据平台选择
                if is_windows:
                    # Windows: 使用 PowerShell 删除
                    subprocess.run(
                        "if exist node_modules rmdir /s /q node_modules",
                        cwd="shelter_ui",
                        shell=True,
                        check=True
                    )
                    subprocess.run(
                        "if exist package-lock.json del /q package-lock.json",
                        cwd="shelter_ui",
                        shell=True,
                        check=True
                    )
                else:
                    # Linux/WSL: 使用 Unix 命令
                    subprocess.run(
                        "rm -rf node_modules package-lock.json",
                        cwd="shelter_ui",
                        shell=True,
                        check=True
                    )
                print_success("平台依赖已清理")
                frontend_modules_exists = False
            except subprocess.CalledProcessError as e:
                print_warning(f"清理失败: {e}")
                # 即使清理失败，也尝试继续安装
                frontend_modules_exists = True
        else:
            print_success("前端依赖平台兼容")
            frontend_modules_exists = True
    else:
        frontend_modules_exists = False

    # 安装前端依赖
    if not frontend_modules_exists:
        try:
            print_info("正在安装前端依赖...")

            # 先尝试修复 npm 缓存权限问题（Linux/WSL 环境）
            if not is_windows:
                print_info("检查并修复 npm 缓存权限...")
                try:
                    # 尝试使用 sudo 修复缓存权限
                    subprocess.run(
                        "sudo chown -R $(whoami) ~/.npm",
                        shell=True,
                        check=True,
                        capture_output=True
                    )
                    print_success("npm 缓存权限已修复")
                except (subprocess.CalledProcessError, FileNotFoundError):
                    print_info("无法自动修复 npm 缓存权限，尝试使用 --unsafe-perm")

            # 执行 npm install
            if sys.platform == 'win32':
                subprocess.run("npm install", cwd="shelter_ui", shell=True, check=True, encoding='gbk', errors='ignore')
            else:
                # Linux/WSL 环境：使用特定配置确保平台兼容
                install_cmd = "npm install"

                # 如果在 WSL 中，清理缓存并使用 --unsafe-perm
                if is_wsl:
                    install_cmd = "npm cache clean --force && npm install --unsafe-perm"
                else:
                    install_cmd = "npm cache clean --force && npm install"

                subprocess.run(install_cmd, cwd="shelter_ui", shell=True, check=True)

            print_success("前端依赖安装成功！")
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print_error(f"前端依赖安装失败: {e}")

            # 针对 WSL/Linux 环境的缓存权限问题给出具体建议
            if not is_windows:
                print_info("提示：可能是 npm 缓存权限问题")
                print_info("请尝试手动执行以下命令:")
                print_info("  sudo chown -R $(whoami) ~/.npm")
                print_info("  cd shelter_ui && npm install --unsafe-perm")
            else:
                print_error("请确保Node.js和npm已安装")
            sys.exit(1)
    else:
        print_success("前端依赖已存在")

    # 构建前端
    print_info("构建前端应用...")
    frontend_build_path = Path("shelter_ui") / "build"
    frontend_dir = Path("shelter_ui")

    try:
        # 检测平台环境
        is_wsl = sys.platform.startswith('linux') and os.name != 'nt'
        is_windows = sys.platform == 'win32'

        # 检查 esbuild 平台兼容性（双重检查）
        if frontend_modules.exists():
            esbuild_win = frontend_modules / "node_modules" / "@esbuild" / "win32-x64"
            esbuild_linux = frontend_modules / "node_modules" / "@esbuild" / "linux-x64"
            esbuild_darwin = frontend_modules / "node_modules" / "@esbuild" / "darwin-x64"

            # 检查是否有不匹配的平台依赖
            if is_wsl and (esbuild_win.exists() or esbuild_darwin.exists()):
                print_warning("检测到不匹配的平台依赖，清理后重新构建...")
                # 清理并重新安装
                if is_windows:
                    subprocess.run("if exist node_modules rmdir /s /q node_modules", cwd="shelter_ui", shell=True, check=True)
                    subprocess.run("if exist package-lock.json del /q package-lock.json", cwd="shelter_ui", shell=True, check=True)
                else:
                    subprocess.run("rm -rf node_modules package-lock.json", cwd="shelter_ui", shell=True, check=True)

                subprocess.run("npm cache clean --force && npm install", cwd="shelter_ui", shell=True, check=True)
                print_success("依赖已重新安装为当前平台")
            elif is_windows and (esbuild_linux.exists() or esbuild_darwin.exists()):
                print_warning("检测到不匹配的平台依赖，清理后重新构建...")
                subprocess.run("if exist node_modules rmdir /s /q node_modules", cwd="shelter_ui", shell=True, check=True)
                subprocess.run("if exist package-lock.json del /q package-lock.json", cwd="shelter_ui", shell=True, check=True)
                subprocess.run("npm cache clean --force && npm install", cwd="shelter_ui", shell=True, check=True)
                print_success("依赖已重新安装为当前平台")

        # 删除旧的 build 目录以确保完全重新构建
        if frontend_build_path.exists():
            import shutil
            shutil.rmtree(frontend_build_path)
            print_success("旧构建目录已清理")

        # 设置生产环境构建变量
        build_env = os.environ.copy()
        build_env["REACT_APP_API_URL"] = ""
        # 设置 Vite 环境变量，用于前端构建时注入 API 地址
        backend_port = os.getenv("BACKEND_PORT", "8000")
        build_env["VITE_BACKEND_PORT"] = backend_port
        
        # 优先使用用户自定义的 VITE_API_BASE_URL，否则生产环境使用空字符串（相对路径）
        if "VITE_API_BASE_URL" not in os.environ:
            # 生产环境默认使用空字符串，前端将使用相对路径访问当前域名
            build_env["VITE_API_BASE_URL"] = ""
            print_info("生产环境: 未设置 VITE_API_BASE_URL，使用相对路径（前端访问当前域名）")
        else:
            print_info(f"使用自定义 API 地址: {os.environ['VITE_API_BASE_URL']}")

        print_info("运行: npm run build")
        if sys.platform == 'win32':
            subprocess.run(
                "npm run build",
                cwd="shelter_ui",
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
                cwd="shelter_ui",
                shell=True,
                check=True,
                stdout=sys.stdout,
                stderr=sys.stderr,
                env=build_env
            )

        # Vite 默认输出到 dist 目录，检查 dist 或 build
        vite_build_path = frontend_dir / "dist"
        if vite_build_path.exists():
            # 如果 dist 存在，创建 build 目录并移动内容（向后兼容）
            if not frontend_build_path.exists():
                import shutil
                shutil.move(str(vite_build_path), str(frontend_build_path))
                print_success("前端构建成功！（已从 dist 重命名为 build）")
            else:
                # build 已存在，直接删除 dist 并使用 build
                import shutil
                shutil.rmtree(vite_build_path)
                print_success("前端构建成功！")
        elif frontend_build_path.exists():
            print_success("前端构建成功！")
        else:
            print_error("前端构建失败，构建目录未找到")
            sys.exit(1)

    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print_error(f"前端构建失败: {e}")
        print_error("请确保Node.js和npm已正确安装")

        # 提供平台兼容性建议
        is_wsl = sys.platform.startswith('linux') and os.name != 'nt'
        if is_wsl:
            print_info("提示：在 WSL 环境中，确保删除 node_modules 后重新安装依赖")

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

        # 使用 uv 运行（自动管理虚拟环境）
        print_success("使用 uv 管理环境...")

        # 检查前端构建
        print_info("Checking frontend build...")
        frontend_build_path = Path("shelter_ui") / "build"
        vite_build_path = Path("shelter_ui") / "dist"

        # 检查是否使用前端开发模式或调试模式
        if dev_mode or debug_mode:
            # 创建或更新前端开发环境变量文件
            env_file_path = Path("shelter_ui") / ".env.development.local"
            try:
                env_file_path.write_text(f"VITE_BACKEND_PORT={backend_port}\n", encoding="utf-8")
                print_success(f"已创建前端环境文件: {env_file_path}")
            except Exception as e:
                print_warning(f"无法创建环境文件: {e}")
                print_info(f"请手动设置环境变量: VITE_BACKEND_PORT={backend_port}")
            
            print_success("前端开发模式已启用，跳过构建步骤")
            print_info("请在另一个终端运行: cd shelter_ui && npm start")
            print_info("然后访问: http://localhost:3000")
        else:
            # 正常模式：检查是否已构建前端
            if frontend_build_path.exists():
                print_success("前端已构建，跳过构建步骤")
            elif vite_build_path.exists():
                # 如果只有 dist 存在，重命名为 build
                import shutil
                print_info("检测到 Vite 构建输出 dist 目录，重命名为 build...")
                shutil.move(str(vite_build_path), str(frontend_build_path))
                print_success("前端已构建")
            else:
                print_error("前端未构建，请先运行: python start_app.py install")
                print_info("或手动构建: cd shelter_ui && npm run build")
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
            print_warning("请在另一个终端运行: cd shelter_ui && npm start (环境变量 VITE_BACKEND_PORT 已自动设置)")
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

        # 确保 uv 路径在子进程的 PATH 中
        # 使用 where/which 查找 uv 的实际位置
        uv_path = None
        if sys.platform == "win32":
            try:
                print_info("尝试使用 where 查找 uv.exe...")
                result = subprocess.run(["where", "uv.exe"], capture_output=True, text=True, check=True)
                print_info(f"where 命令返回码: {result.returncode}")
                print_info(f"where 命令输出: {result.stdout}")
                print_info(f"where 命令错误: {result.stderr}")
                if result.stdout.strip():
                    uv_path = result.stdout.strip().split("\n")[0]
                    print_success(f"通过 where 找到 uv: {uv_path}")
                else:
                    print_warning("where 命令未找到 uv.exe")
            except (subprocess.CalledProcessError, FileNotFoundError) as e:
                print_warning(f"where 命令执行失败: {e}")

        if not uv_path:
            # 如果 where/which 没找到，尝试手动检查常见位置
            if sys.platform == "win32":
                user_profile = os.environ.get("USERPROFILE", "")
                possible_paths = [
                    os.path.join(user_profile, ".cargo", "bin", "uv.exe"),
                    os.path.join(user_profile, ".local", "bin", "uv.exe"),
                    r"C:	oolsăvăv.exe",  # 可能安装在这里
                ]
                for path in possible_paths:
                    if os.path.exists(path):
                        uv_path = path
                        print_success(f"在常见位置找到 uv: {uv_path}")
                        break

        if not uv_path:
            uv_path = get_uv_path()
            print_info(f"使用默认 uv 路径: {uv_path}")

        uv_bin_dir = os.path.dirname(uv_path)
        print_info(f"main: uv 路径 = {uv_path}, 目录 = {uv_bin_dir}, 存在 = {os.path.exists(uv_path)}")

        if not os.path.exists(uv_path):
            print_error(f"uv 可执行文件不存在: {uv_path}")
            print_error("请手动安装 uv：")
            print_error("  Windows: powershell -c \"irm https://astral.sh/uv/install.ps1 | iex\"")
            print_error("  或使用: pip install uv")
            print_error("  安装完成后请重新运行此脚本")
            sys.exit(1)

        if uv_bin_dir not in env.get("PATH", ""):
            env["PATH"] = uv_bin_dir + os.pathsep + env.get("PATH", "")
            print_info(f"已更新 PATH: {uv_bin_dir} 添加到 PATH")

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
            
            # 使用uv run启动后端服务
            uvicorn_args = ["shelter_app/run.py"]
            if debug_mode:
                uvicorn_args.append("--debug")

            uv_path = get_uv_path()
            backend_process = subprocess.Popen(
                [uv_path, "run"] + uvicorn_args,
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
