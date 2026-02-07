"""
AI Shelter 测试框架
===================

这是一个模块化的测试框架，用于测试 AI Shelter 后端 API。

使用方法:
    python -m tests.run_all          # 运行所有测试
    python -m tests.suites.api       # 只运行 API 测试
    python -m tests.suites.backend   # 只运行后端测试

目录结构:
    tests/
    ├── core/           # 测试框架核心
    │   ├── base.py     # 基础测试类
    │   ├── runner.py   # 测试运行器
    │   └── reporter.py # 报告生成器
    ├── suites/         # 测试套件
    │   ├── api/        # API 接口测试
    │   ├── backend/    # 后端逻辑测试
    │   └── integration/# 集成测试
    ├── fixtures/       # 测试数据和夹具
    ├── utils/          # 工具函数
    ├── logs/           # 测试日志
    └── reports/        # 测试报告

AI 开发指南:
    1. 阅读 AI_GUIDE.md 了解如何添加新测试
    2. 使用 BaseTest 类作为所有测试的基类
    3. 测试方法命名: test_<功能>_<场景>
    4. 使用 self.assert_* 方法进行断言
"""

__version__ = "1.0.0"
__all__ = ["BaseTest", "TestRunner", "APITestCase"]

from tests.core.base import BaseTest
from tests.core.runner import TestRunner
from tests.core.api_case import APITestCase
