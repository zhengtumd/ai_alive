# AI Shelter 测试框架 - AI 开发指南

> **给 AI 的指令**: 当你需要测试或修改测试时，请阅读此文档。按照此文档的规范，你可以无错误地进行测试开发和维护。

---

## 📋 目录

1. [快速开始](#快速开始)
2. [目录结构](#目录结构)
3. [如何添加新测试](#如何添加新测试)
4. [测试基类 API](#测试基类-api)
5. [断言方法](#断言方法)
6. [运行测试](#运行测试)
7. [常见问题](#常见问题)

---

## 🚀 快速开始

### 运行所有测试

```bash
cd d:/Code/Python/ai_alive

# 运行所有测试套件（默认）
python -m tests.run_all

# 运行API集成测试（自动启动/停止服务）
python -m tests.run_all --api-integration

# 列出所有可用的测试套件
python -m tests.run_all --list-suites
```

### 运行特定测试

```bash
# 只运行 API 测试套件
python -m tests.suites.api

# 运行系统综合测试
python -m tests.suites.system

# 运行性能测试
python -m tests.suites.performance

# 运行API集成测试（原run_api_test.py功能）
python -m tests.run_all --api-integration

# 运行单个测试文件
python tests/suites/api/test_ai_list.py
```

---

## 📁 目录结构

```
tests/
├── core/                   # 测试框架核心（不要修改）
│   ├── __init__.py
│   ├── base.py            # BaseTest 基类
│   ├── api_case.py        # APITestCase API测试基类
│   ├── runner.py          # TestRunner 测试运行器
│   └── reporter.py        # TestReporter 报告生成器
├── suites/                 # 测试套件（在这里添加新测试）
│   ├── __init__.py
│   ├── api/               # API 接口测试
│   │   ├── __init__.py
│   │   ├── test_ai_list.py
│   │   ├── test_live_state.py
│   │   ├── test_status.py
│   │   ├── test_ai_detail.py
│   │   ├── test_run_next.py
│   │   └── test_reset.py
│   ├── system/            # 系统综合测试
│   │   ├── __init__.py
│   │   └── test_system.py
│   └── performance/       # 性能测试
│       ├── __init__.py
│       └── test_token_optimization.py
├── fixtures/              # 测试数据（可选）
├── utils/                 # 工具函数（可选）
├── logs/                  # 测试日志（自动生成）
├── reports/               # 测试报告（自动生成）
├── __init__.py            # 包初始化
├── run_all.py             # 测试主入口
└── AI_GUIDE.md            # 本文件
```

---

## ➕ 如何添加新测试

### 步骤 1: 创建测试文件

在 `tests/suites/api/` 目录下创建新文件，命名规则：`test_<功能>.py`

### 步骤 2: 编写测试类

```python
"""
<功能>接口测试
==============

测试 /<endpoint> 端点

预期响应:
    {
        "field1": "value1",
        "field2": 123
    }
"""

from tests.core import APITestCase


class Test<功能名>(APITestCase):
    """测试 <功能> 接口"""
    
    def test_<场景>_<预期结果>(self):
        """测试 <场景> 时 <预期结果>"""
        response = self.get("/<endpoint>")
        self.assert_status_ok(response)
        
        data = response.json()
        self.assert_has_fields(data, ["field1", "field2"])
        self.assert_field_type(data, "field2", int)
```

### 步骤 3: 更新 __init__.py

在 `tests/suites/api/__init__.py` 中导入新测试类：

```python
from .test_<功能> import Test<功能名>

__all__ = [
    # ... 其他测试类
    "Test<功能名>"
]
```

### 完整示例

```python
"""
用户接口测试
============

测试 /user 端点
"""

from tests.core import APITestCase


class TestUser(APITestCase):
    """测试用户接口"""
    
    def test_get_user_success(self):
        """测试获取用户成功"""
        response = self.get("/user/1")
        self.assert_status_ok(response)
        
        data = response.json()
        self.assert_has_fields(data, ["id", "name", "email"])
        self.assert_field_type(data, "id", int)
        self.assert_field_type(data, "name", str)
    
    def test_user_not_found(self):
        """测试用户不存在"""
        response = self.get("/user/99999")
        self.assert_status(response, 404)
```

---

## 🔧 测试基类 API

### APITestCase

所有 API 测试的基类。

#### 属性

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `base_url` | str | "http://localhost:8000" | API 基础 URL |
| `timeout` | int | 30 | 请求超时时间（秒） |

#### HTTP 方法

```python
# GET 请求
response = self.get("/ai_list", timeout=5)

# POST 请求
response = self.post("/reset", timeout=30)
```

#### 响应对象

```python
response = self.get("/ai_list")

# 状态码
status = response.status_code  # 200

# JSON 数据
data = response.json()

# 原始文本
text = response.text
```

---

## ✅ 断言方法

### 基础断言

```python
# 断言为真
self.assert_true(condition, "错误消息")

# 断言为假
self.assert_false(condition, "错误消息")

# 断言相等
self.assert_equal(actual, expected, "错误消息")

# 断言不为 None
self.assert_not_none(value, "错误消息")

# 断言在列表中
self.assert_in(item, container, "错误消息")
```

### API 专用断言

```python
# 断言状态码 200
self.assert_status_ok(response)

# 断言特定状态码
self.assert_status(response, 404)

# 断言响应是 JSON
self.assert_json_response(response)

# 断言 API 成功
self.assert_api_success(data)

# 断言包含字段
self.assert_has_fields(data, ["field1", "field2"])

# 断言字段类型
self.assert_field_type(data, "field", str)
self.assert_field_type(data, "count", int)
self.assert_field_type(data, "ratio", (int, float))  # 多种类型

# 断言字段范围
self.assert_field_in_range(data, "health", 0, 100)

# 断言列表非空
self.assert_list_not_empty(data, "agents")

# 断言 AI 代理结构
self.assert_agent_structure(agent)

# 断言提案结构
self.assert_proposal_structure(proposal)
```

---

## ▶️ 运行测试

### 运行所有测试

```bash
python -m tests.run_all
```

### 运行特定套件

```bash
python -m tests.suites.api
```

### 运行单个测试类

```python
from tests.core import TestRunner
from tests.suites.api import TestAIList

runner = TestRunner()
runner.add_test_class(TestAIList)
runner.run_all()
```

### 运行单个测试方法

```python
from tests.suites.api.test_ai_list import TestAIList

test = TestAIList()
test.test_get_ai_list_success()
```

---

## 📊 测试报告

运行测试后会自动生成报告：

- **JSON 报告**: `tests/reports/report_<时间戳>.json`
- **Markdown 报告**: `tests/reports/report_<时间戳>.md`
- **HTML 报告**: `tests/reports/report_<时间戳>.html` (可选)

---

## ❓ 常见问题

### Q: 如何跳过某个测试？

A: 在方法名前加 `_` 前缀：

```python
def _test_skip_this(self):  # 不会被执行
    pass
```

### Q: 如何设置更长的超时？

A: 在类中覆盖 `timeout` 属性：

```python
class TestLongOperation(APITestCase):
    timeout = 120  # 2分钟超时
```

### Q: 测试失败时如何调试？

A: 查看日志文件：
- `tests/logs/test_<时间戳>.log` - 测试日志
- `tests/logs/server_output.log` - 服务器输出

### Q: 如何添加新的断言方法？

A: 在 `tests/core/base.py` 的 `BaseTest` 类中添加，或在测试类中直接定义。

### Q: 测试类命名规范？

A: `Test<功能名>`，如 `TestAIList`、`TestRunNext`

### Q: 测试方法命名规范？

A: `test_<场景>_<预期结果>`，如 `test_get_ai_list_success`

---

## 📝 最佳实践

1. **每个测试只测一个功能点**
2. **测试方法名要清晰描述测试内容**
3. **使用断言方法而不是 if/raise**
4. **测试数据相互独立，不要依赖执行顺序**
5. **添加详细的文档字符串**
6. **测试失败时提供清晰的错误信息**

---

## 🔗 相关文件

- 测试框架核心: `tests/core/`
- API 测试套件: `tests/suites/api/`
- 测试主入口: `tests/run_all.py`
- 后端 API: `shelter_app/api.py`

---

**记住**: 当你修改测试时，确保：
1. ✅ 测试类继承 `APITestCase`
2. ✅ 测试方法以 `test_` 开头
3. ✅ 在 `__init__.py` 中导入新测试类
4. ✅ 运行 `python -m tests.run_all` 验证通过
