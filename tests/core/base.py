"""
测试框架基础模块
================

所有测试类的基类，提供通用的测试功能。

示例用法:
    class MyTest(BaseTest):
        def test_example(self):
            result = self.do_something()
            self.assert_true(result, "操作应该成功")
"""

import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field


@dataclass
class TestResult:
    """单个测试结果"""
    name: str
    success: bool
    duration: float = 0.0
    error: Optional[str] = None
    data: Any = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class BaseTest:
    """
    所有测试类的基类
    
    子类应该:
    1. 继承 BaseTest
    2. 实现以 test_ 开头的方法
    3. 使用 self.assert_* 方法进行断言
    
    示例:
        class APITest(BaseTest):
            def test_get_ai_list(self):
                response = self.get("/ai_list")
                self.assert_status_ok(response)
                self.assert_has_fields(response.json(), ["agents"])
    """
    
    def __init__(self):
        self.results: List[TestResult] = []
        self.current_test: Optional[str] = None
        self.start_time: Optional[datetime] = None
        self.logger = TestLogger()
        
    def setup(self):
        """测试前的设置，子类可以重写"""
        pass
        
    def teardown(self):
        """测试后的清理，子类可以重写"""
        pass
        
    def run_all(self) -> List[TestResult]:
        """运行所有测试方法"""
        self.results = []
        
        # 获取所有 test_ 开头的方法
        test_methods = [
            getattr(self, method_name) 
            for method_name in dir(self) 
            if method_name.startswith("test_") and callable(getattr(self, method_name))
        ]
        
        self.logger.info(f"发现 {len(test_methods)} 个测试")
        
        for test_method in test_methods:
            self._run_single_test(test_method)
            
        return self.results
    
    def _run_single_test(self, test_method: Callable):
        """运行单个测试方法"""
        test_name = test_method.__name__
        self.current_test = test_name
        
        self.logger.info(f"运行: {test_name}")
        
        start = datetime.now()
        error = None
        success = False
        
        try:
            self.setup()
            test_method()
            success = True
            self.logger.success(f"通过: {test_name}")
        except AssertionError as e:
            error = str(e)
            self.logger.error(f"失败: {test_name} - {error}")
        except Exception as e:
            error = f"{type(e).__name__}: {str(e)}"
            self.logger.error(f"异常: {test_name} - {error}")
            traceback.print_exc()
        finally:
            try:
                self.teardown()
            except Exception as e:
                self.logger.warning(f"清理失败: {e}")
                
        duration = (datetime.now() - start).total_seconds()
        
        result = TestResult(
            name=test_name,
            success=success,
            duration=duration,
            error=error
        )
        self.results.append(result)
        
    # ========== 断言方法 ==========
    
    def assert_true(self, condition: bool, message: str = ""):
        """断言条件为真"""
        if not condition:
            raise AssertionError(message or "期望为真，实际为假")
    
    def assert_false(self, condition: bool, message: str = ""):
        """断言条件为假"""
        if condition:
            raise AssertionError(message or "期望为假，实际为真")
    
    def assert_equal(self, actual: Any, expected: Any, message: str = ""):
        """断言两个值相等"""
        if actual != expected:
            msg = message or f"期望 {expected!r}，实际 {actual!r}"
            raise AssertionError(msg)
    
    def assert_not_none(self, value: Any, message: str = ""):
        """断言值不为 None"""
        if value is None:
            raise AssertionError(message or "期望非None值")
    
    def assert_has_fields(self, data: dict, fields: List[str], message: str = ""):
        """断言字典包含指定字段"""
        missing = [f for f in fields if f not in data]
        if missing:
            msg = message or f"缺少字段: {missing}，实际字段: {list(data.keys())}"
            raise AssertionError(msg)
    
    def assert_in(self, item: Any, container: list, message: str = ""):
        """断言元素在列表中"""
        if item not in container:
            msg = message or f"期望 {item!r} 在 {container!r} 中"
            raise AssertionError(msg)
    
    def assert_type(self, value: Any, expected_type: type, message: str = ""):
        """断言值的类型"""
        if not isinstance(value, expected_type):
            msg = message or f"期望类型 {expected_type.__name__}，实际 {type(value).__name__}"
            raise AssertionError(msg)


class TestLogger:
    """简单的测试日志记录器"""
    
    def __init__(self):
        self.logs: List[str] = []
        
    def _log(self, level: str, msg: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        line = f"[{timestamp}] [{level}] {msg}"
        self.logs.append(line)
        print(line)
        
    def debug(self, msg: str): self._log("DEBUG", msg)
    def info(self, msg: str): self._log("INFO", msg)
    def success(self, msg: str): self._log("SUCCESS", msg)
    def warning(self, msg: str): self._log("WARNING", msg)
    def error(self, msg: str): self._log("ERROR", msg)
