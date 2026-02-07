"""
测试主入口
==========

运行所有测试套件。

用法:
    # 运行所有测试套件（默认）
    python -m tests.run_all
    
    # 运行API集成测试（自动管理服务）
    python -m tests.run_all --api-integration
    
    # 只运行 API 测试套件
    python -m tests.suites.api
    
    # 运行特定测试类
    python -c "from tests.suites.api import TestAIList; from tests.core import TestRunner; r = TestRunner(); r.add_test_class(TestAIList); r.run_all()"
"""

import sys
import os
import argparse

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.core import TestRunner


def run_all_suites():
    """运行所有测试套件"""
    print("="*60)
    print("AI Shelter 测试套件")
    print("="*60)
    print()
    
    runner = TestRunner(verbose=True)
    
    # 自动发现 tests/suites 下的所有测试
    runner.discover("tests.suites")
    
    if not runner.test_classes:
        print("未发现测试类！")
        return 1
    
    print(f"\n共发现 {len(runner.test_classes)} 个测试类")
    print()
    
    # 运行所有测试
    results = runner.run_all()
    
    # 返回退出码
    return 0 if runner.all_passed else 1


def run_api_integration():
    """运行API集成测试（自动管理服务）"""
    print("="*60)
    print("API集成测试（自动服务管理）")
    print("="*60)
    print("注意: 此测试将自动启动和停止后端服务")
    print("="*60)
    print()
    
    # 通过子进程运行原run_api_test.py以保持其完整功能
    import subprocess
    import sys
    
    try:
        # 获取当前Python解释器和脚本路径
        python_exe = sys.executable
        script_path = os.path.join(os.path.dirname(__file__), "run_api_test.py")
        
        print(f"运行: {python_exe} {script_path}")
        print()
        
        # 运行脚本并等待完成
        result = subprocess.run([python_exe, script_path], check=False)
        
        print()
        print("="*60)
        print(f"API集成测试完成，退出码: {result.returncode}")
        print("="*60)
        
        return result.returncode
        
    except FileNotFoundError:
        print(f"错误: 找不到脚本文件 {script_path}")
        print("请确保 tests/run_api_test.py 文件存在")
        return 1
    except Exception as e:
        print(f"运行API集成测试时发生错误: {e}")
        import traceback
        traceback.print_exc()
        return 1


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="AI Shelter 测试运行器")
    parser.add_argument(
        "--api-integration",
        action="store_true",
        help="运行API集成测试（自动启动/停止服务）"
    )
    parser.add_argument(
        "--list-suites",
        action="store_true",
        help="列出所有可用的测试套件"
    )
    
    args = parser.parse_args()
    
    if args.list_suites:
        print("可用测试套件:")
        print("  - tests.suites.api        # API接口测试")
        print("  - tests.suites.system     # 系统综合测试")
        print("  - tests.suites.performance # 性能测试")
        print("  --api-integration         # API集成测试（自动服务管理）")
        return 0
    
    if args.api_integration:
        return run_api_integration()
    else:
        return run_all_suites()


if __name__ == "__main__":
    sys.exit(main())
