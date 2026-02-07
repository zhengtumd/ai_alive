"""
测试配置
========

集中管理测试配置。

使用:
    from tests.config import config
    
    url = config.api.base_url
    timeout = config.api.timeout
"""

from dataclasses import dataclass
from typing import List


@dataclass
class APIConfig:
    """API 配置"""
    base_url: str = "http://localhost:8000"
    timeout: int = 30
    long_timeout: int = 120  # 用于 AI 决策等长时间操作


@dataclass
class LogConfig:
    """日志配置"""
    log_dir: str = "tests/logs"
    report_dir: str = "tests/reports"
    keep_logs: int = 10  # 保留最近10个日志文件


@dataclass
class TestConfig:
    """测试配置"""
    api: APIConfig = None
    log: LogConfig = None
    verbose: bool = True
    stop_on_first_error: bool = False
    generate_html_report: bool = False
    generate_markdown_report: bool = True
    generate_json_report: bool = True
    
    def __post_init__(self):
        if self.api is None:
            self.api = APIConfig()
        if self.log is None:
            self.log = LogConfig()


# 全局配置实例
config = TestConfig()


# 预期的 API 响应字段定义（用于文档和验证）
EXPECTED_RESPONSES = {
    "ai_list": {
        "description": "AI列表接口",
        "required_fields": ["success", "agents"],
        "agent_fields": ["name", "alive", "health", "action_points"]
    },
    "live_state": {
        "description": "实时状态接口",
        "required_fields": ["day", "running", "state"],
        "state_fields": ["current_ai", "phase", "detail"],
        "detail_fields": ["type", "action", "target", "content", "cost"]
    },
    "status": {
        "description": "系统状态接口",
        "required_fields": [
            "day", "remaining_resources", "total_resources",
            "system_efficiency", "elimination_count", "agents", "proposals"
        ]
    },
    "ai_detail": {
        "description": "AI详情接口",
        "required_fields": [
            "name", "health", "alive", "action_points",
            "last_request", "last_allocated", "memory",
            "token_consumed_today", "total_tokens_spent"
        ]
    },
    "run_next": {
        "description": "运行下一天接口",
        "required_fields": [
            "day", "remaining_resources", "total_resources",
            "system_efficiency", "elimination_count", "global_token_consumed",
            "token_budget_remaining", "agents", "day_events", "proposals"
        ]
    },
    "reset": {
        "description": "重置接口",
        "required_fields": ["success", "message", "state"]
    }
}


# 测试数据夹具
FIXTURES = {
    "valid_ai_names": ["chatgpt", "deepseek", "doubao", "qwen", "gemini"],
    "invalid_ai_name": "nonexistent_ai_12345",
    "expected_agent_count": 5,
    "initial_resources": 5000,
    "initial_health": 100
}
