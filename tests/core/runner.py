"""
测试运行器
==========

负责发现和运行测试套件。

用法:
    runner = TestRunner()
    runner.discover("tests/suites")  # 自动发现测试
    runner.run_all()                  # 运行所有测试
    
    # 或运行特定测试类
    runner.run_test_class(TestAIList)
"""

import sys
import importlib
import pkgutil
from pathlib import Path
from typing import List, Type, Optional
from datetime import datetime
from .base import BaseTest, TestResult
from .reporter import TestReporter


class TestRunner:
    """
    测试运行器
    
    自动发现和运行测试类。
    
    示例:
        runner = TestRunner()
        results = runner.run_all()
        
        if runner.all_passed:
            print("所有测试通过!")
    """
    
    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self.test_classes: List[Type[BaseTest]] = []
        self.results: List[TestResult] = []
        self.reporter = TestReporter()
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        
    def discover(self, package_path: str = "tests.suites") -> List[Type[BaseTest]]:
        """
        自动发现测试类
        
        扫描指定包及其子包，找到所有 BaseTest 的子类
        
        Args:
            package_path: 要扫描的包路径 (如 "tests.suites")
            
        Returns:
            发现的测试类列表
        """
        self.test_classes = []
        
        try:
            package = importlib.import_module(package_path)
            package_dir = Path(package.__file__).parent
        except ImportError:
            print(f"无法导入包: {package_path}")
            return []
        
        # 遍历包中的所有模块
        for _, module_name, is_pkg in pkgutil.iter_modules([str(package_dir)]):
            full_module_name = f"{package_path}.{module_name}"
            
            try:
                if is_pkg:
                    # 递归扫描子包
                    self.discover(full_module_name)
                else:
                    # 导入模块
                    module = importlib.import_module(full_module_name)
                    
                    # 查找测试类
                    for attr_name in dir(module):
                        attr = getattr(module, attr_name)
                        if (isinstance(attr, type) and 
                            issubclass(attr, BaseTest) and 
                            attr is not BaseTest and
                            attr not in self.test_classes):
                            self.test_classes.append(attr)
                            if self.verbose:
                                print(f"发现测试类: {attr.__module__}.{attr.__name__}")
                                
            except Exception as e:
                if self.verbose:
                    print(f"导入模块失败 {full_module_name}: {e}")
        
        return self.test_classes
    
    def add_test_class(self, test_class: Type[BaseTest]):
        """手动添加测试类"""
        if test_class not in self.test_classes:
            self.test_classes.append(test_class)
    
    def run_test_class(self, test_class: Type[BaseTest]) -> List[TestResult]:
        """运行单个测试类"""
        print(f"\n{'='*60}")
        print(f"运行测试类: {test_class.__name__}")
        print(f"{'='*60}")
        
        try:
            test_instance = test_class()
            results = test_instance.run_all()
            self.results.extend(results)
            return results
        except Exception as e:
            print(f"运行测试类失败: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def run_all(self) -> List[TestResult]:
        """运行所有发现的测试类"""
        self.results = []
        self.start_time = datetime.now()
        
        print("="*60)
        print("测试开始")
        print("="*60)
        print(f"发现 {len(self.test_classes)} 个测试类")
        
        for test_class in self.test_classes:
            self.run_test_class(test_class)
        
        self.end_time = datetime.now()
        
        # 生成报告
        self._print_summary()
        self.reporter.generate_report(self.results, self.start_time, self.end_time)
        
        return self.results
    
    def _print_summary(self):
        """打印测试摘要"""
        total = len(self.results)
        passed = sum(1 for r in self.results if r.success)
        failed = total - passed
        
        duration = 0.0
        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()
        
        print("\n" + "="*60)
        print("测试摘要")
        print("="*60)
        print(f"总测试数: {total}")
        print(f"通过: {passed}")
        print(f"失败: {failed}")
        print(f"耗时: {duration:.2f}秒")
        
        if failed > 0:
            print("\n失败详情:")
            for r in self.results:
                if not r.success:
                    print(f"  ✗ {r.name}: {r.error}")
        
        print("="*60)
    
    @property
    def all_passed(self) -> bool:
        """检查是否所有测试通过"""
        return all(r.success for r in self.results)
    
    @property
    def passed_count(self) -> int:
        """通过的测试数"""
        return sum(1 for r in self.results if r.success)
    
    @property
    def failed_count(self) -> int:
        """失败的测试数"""
        return sum(1 for r in self.results if not r.success)
