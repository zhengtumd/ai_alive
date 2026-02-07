"""
前端接口自动化测试 - 所有输出写入日志文件
用法: python tests/run_api_test.py
日志位置: tests/logs/
报告位置: tests/reports/
"""
import requests
import json
import sys
import os
import time
import traceback
import subprocess
import signal
from datetime import datetime
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

BASE_URL = "http://localhost:8000"
LOG_DIR = Path(__file__).parent / "logs"
REPORT_DIR = Path(__file__).parent / "reports"

# 确保目录存在
LOG_DIR.mkdir(exist_ok=True)
REPORT_DIR.mkdir(exist_ok=True)

# 日志文件路径
TEST_LOG = LOG_DIR / f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
SERVER_LOG = LOG_DIR / "server_output.log"
ERROR_LOG = LOG_DIR / "test_errors.log"
REPORT_FILE = REPORT_DIR / f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

class Logger:
    """文件日志记录器"""
    def __init__(self, log_file):
        self.log_file = log_file
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        
    def log(self, level, msg):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{timestamp}] [{level}] {msg}\n"
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(line)
        # 同时输出到控制台
        print(line.strip())
        
    def info(self, msg): self.log("INFO", msg)
    def success(self, msg): self.log("SUCCESS", msg)
    def error(self, msg): self.log("ERROR", msg)
    def warning(self, msg): self.log("WARNING", msg)
    def debug(self, msg): self.log("DEBUG", msg)

logger = Logger(TEST_LOG)

def check_server():
    """检查服务是否运行"""
    try:
        r = requests.get(f"{BASE_URL}/ai_list", timeout=3)
        return r.status_code == 200
    except:
        return False

def start_server():
    """启动后端服务（后台运行）"""
    logger.info("正在启动后端服务...")
    
    # 清理旧日志
    if SERVER_LOG.exists():
        SERVER_LOG.unlink()
    
    # 使用 subprocess 启动服务，输出重定向到文件
    proc = subprocess.Popen(
        [sys.executable, "start_app.py"],
        stdout=open(SERVER_LOG, "w", encoding="utf-8"),
        stderr=subprocess.STDOUT,
        cwd=str(Path(__file__).parent.parent),
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
    )
    
    logger.info(f"服务进程已启动 (PID: {proc.pid})")
    
    # 等待服务初始化
    logger.info("等待服务初始化...")
    for i in range(30):  # 最多等待30秒
        time.sleep(1)
        if check_server():
            logger.success("后端服务已就绪")
            return proc
        logger.debug(f"等待中... {i+1}s")
    
    logger.error("服务启动超时")
    return None

def stop_server(proc):
    """停止后端服务"""
    if proc:
        logger.info(f"停止服务进程 (PID: {proc.pid})")
        try:
            if sys.platform == "win32":
                proc.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                proc.terminate()
            proc.wait(timeout=5)
        except:
            proc.kill()
        logger.info("服务已停止")

def test_endpoint(name, method, endpoint, expected_fields=None, timeout=30):
    """测试单个端点"""
    url = f"{BASE_URL}{endpoint}"
    logger.info(f"测试: {name} ({method} {endpoint})")
    
    try:
        if method == "GET":
            r = requests.get(url, timeout=timeout)
        else:
            r = requests.post(url, timeout=timeout)
        
        logger.info(f"  状态码: {r.status_code}")
        
        if r.status_code != 200:
            logger.error(f"状态码错误: {r.status_code}")
            logger.error(f"  响应: {r.text[:500]}")
            return False, None, f"状态码错误: {r.status_code}"
        
        data = r.json()
        
        # 检查预期字段
        if expected_fields:
            missing = [f for f in expected_fields if f not in data]
            if missing:
                logger.error(f"缺少字段: {missing}")
                logger.error(f"  实际字段: {list(data.keys())}")
                return False, data, f"缺少字段: {missing}"
        
        logger.success(f"{name} 通过")
        return True, data, None
        
    except requests.exceptions.Timeout:
        logger.error(f"请求超时 (>{timeout}s)")
        return False, None, "请求超时"
    except Exception as e:
        logger.error(f"请求异常: {e}")
        with open(ERROR_LOG, "a") as f:
            f.write(f"\n[{datetime.now()}] {name} 测试异常:\n")
            f.write(traceback.format_exc())
        return False, None, str(e)

def run_all_tests():
    """运行所有测试"""
    results = []
    
    logger.info("="*60)
    logger.info("前端接口自动化测试开始")
    logger.info("="*60)
    logger.info(f"测试日志: {TEST_LOG}")
    logger.info(f"服务日志: {SERVER_LOG}")
    logger.info(f"错误日志: {ERROR_LOG}")
    logger.info("="*60)
    
    # 检查/启动服务
    server_proc = None
    if not check_server():
        server_proc = start_server()
        if not server_proc:
            logger.error("无法启动后端服务")
            return False
    else:
        logger.info("后端服务已在运行")
    
    try:
        # 1. 测试 AI列表
        success, data, error = test_endpoint(
            "AI列表", "GET", "/ai_list",
            expected_fields=["success", "agents"],
            timeout=5
        )
        results.append({"name": "AI列表", "success": success, "error": error})
        
        first_ai = None
        if success and data:
            agents = data.get("agents", [])
            logger.info(f"  找到 {len(agents)} 个AI代理")
            if agents:
                first_ai = agents[0]["name"]
        
        # 2. 测试 实时状态
        success, data, error = test_endpoint(
            "实时状态", "GET", "/live_state",
            expected_fields=["day", "running", "state"],
            timeout=5
        )
        results.append({"name": "实时状态", "success": success, "error": error})
        
        # 3. 测试 系统状态
        success, data, error = test_endpoint(
            "系统状态", "GET", "/status",
            expected_fields=["day", "remaining_resources", "agents", "proposals"],
            timeout=5
        )
        results.append({"name": "系统状态", "success": success, "error": error})
        
        # 4. 测试 AI详情
        if first_ai:
            success, data, error = test_endpoint(
                f"AI详情 ({first_ai})", "GET", f"/ai/{first_ai}",
                expected_fields=["name", "health", "alive", "action_points"],
                timeout=5
            )
            results.append({"name": "AI详情", "success": success, "error": error})
        
        # 5. 测试 运行下一天 - 关键测试
        logger.info("")
        logger.info("="*60)
        logger.info("关键测试: /run_next (运行下一天)")
        logger.info("此测试会触发AI决策，可能需要较长时间...")
        logger.info("="*60)
        
        success, data, error = test_endpoint(
            "运行下一天", "GET", "/run_next",
            expected_fields=["day", "remaining_resources", "agents", "day_events", "proposals"],
            timeout=120  # 给足够时间
        )
        results.append({"name": "运行下一天", "success": success, "error": error})
        
        if success and data:
            logger.info(f"  当前天数: {data.get('day')}")
            logger.info(f"  剩余资源: {data.get('remaining_resources')}")
            logger.info(f"  AI数量: {len(data.get('agents', []))}")
            logger.info(f"  事件数量: {len(data.get('day_events', []))}")
            logger.info(f"  提案数量: {len(data.get('proposals', []))}")
        
        # 6. 测试 重置
        logger.info("")
        logger.info("="*60)
        logger.info("测试: /reset (重置模拟)")
        logger.info("="*60)
        
        success, data, error = test_endpoint(
            "重置模拟", "POST", "/reset",
            expected_fields=["success", "message", "state"],
            timeout=30
        )
        results.append({"name": "重置模拟", "success": success, "error": error})
        
    finally:
        # 生成报告
        generate_report(results)
        
        # 如果是由我们启动的服务，则停止它
        if server_proc:
            stop_server(server_proc)
    
    return results

def generate_report(results):
    """生成测试报告"""
    logger.info("")
    logger.info("="*60)
    logger.info("测试报告")
    logger.info("="*60)
    
    total = len(results)
    passed = sum(1 for r in results if r["success"])
    failed = total - passed
    
    logger.info(f"总测试数: {total}")
    logger.success(f"通过: {passed}")
    if failed > 0:
        logger.error(f"失败: {failed}")
    
    logger.info("")
    logger.info("详细结果:")
    for r in results:
        status = "✓ 通过" if r["success"] else "✗ 失败"
        if r["success"]:
            logger.success(f"  {status} - {r['name']}")
        else:
            logger.error(f"  {status} - {r['name']}: {r.get('error', '')}")
    
    # 保存JSON报告
    report = {
        "timestamp": datetime.now().isoformat(),
        "total": total,
        "passed": passed,
        "failed": failed,
        "results": results
    }
    
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    logger.info("")
    logger.info(f"报告已保存: {REPORT_FILE}")
    logger.info("="*60)
    
    return failed == 0

def main():
    try:
        results = run_all_tests()
        if isinstance(results, list):
            failed = sum(1 for r in results if not r["success"])
            sys.exit(0 if failed == 0 else 1)
        else:
            sys.exit(1)
    except KeyboardInterrupt:
        logger.warning("\n测试被用户中断")
        sys.exit(1)
    except Exception as e:
        logger.error(f"测试过程发生错误: {e}")
        with open(ERROR_LOG, "a") as f:
            f.write(f"\n[{datetime.now()}] 测试过程错误:\n")
            f.write(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
