"""
API 测试基类
============

专门用于测试后端 API 的基类。

示例:
    class TestAIList(APITestCase):
        def test_get_ai_list(self):
            response = self.get("/ai_list")
            self.assert_status_ok(response)
            data = response.json()
            self.assert_has_fields(data, ["success", "agents"])
"""

import requests
import json
from typing import Any, Dict, Optional
from .base import BaseTest


class APITestCase(BaseTest):
    """
    API 测试基类
    
    提供 HTTP 请求方法和 API 专用断言
    
    配置:
        base_url: API 基础 URL (默认: http://localhost:8000)
        timeout: 请求超时时间 (默认: 30秒)
    """
    
    base_url: str = "http://localhost:8000"
    timeout: int = 30
    
    def __init__(self):
        super().__init__()
        self.session = requests.Session()
        self.last_response: Optional[requests.Response] = None
        
    def setup(self):
        """检查服务器是否可用"""
        try:
            self.get("/ai_list", timeout=5)
        except Exception as e:
            self.logger.warning(f"服务器可能未就绪: {e}")
    
    # ========== HTTP 请求方法 ==========
    
    def get(self, endpoint: str, timeout: Optional[int] = None, **kwargs) -> requests.Response:
        """发送 GET 请求"""
        url = f"{self.base_url}{endpoint}"
        timeout = timeout or self.timeout
        
        self.logger.debug(f"GET {url}")
        response = self.session.get(url, timeout=timeout, **kwargs)
        self.last_response = response
        return response
    
    def post(self, endpoint: str, timeout: Optional[int] = None, **kwargs) -> requests.Response:
        """发送 POST 请求"""
        url = f"{self.base_url}{endpoint}"
        timeout = timeout or self.timeout
        
        self.logger.debug(f"POST {url}")
        response = self.session.post(url, timeout=timeout, **kwargs)
        self.last_response = response
        return response
    
    # ========== API 专用断言 ==========
    
    def assert_status_ok(self, response: requests.Response, message: str = ""):
        """断言 HTTP 状态码为 200"""
        if response.status_code != 200:
            msg = message or f"期望状态码 200，实际 {response.status_code}"
            msg += f"\n响应: {response.text[:500]}"
            raise AssertionError(msg)
    
    def assert_status(self, response: requests.Response, expected: int, message: str = ""):
        """断言 HTTP 状态码"""
        if response.status_code != expected:
            msg = message or f"期望状态码 {expected}，实际 {response.status_code}"
            raise AssertionError(msg)
    
    def assert_json_response(self, response: requests.Response, message: str = ""):
        """断言响应是有效的 JSON"""
        try:
            return response.json()
        except json.JSONDecodeError as e:
            msg = message or f"响应不是有效的 JSON: {e}\n响应: {response.text[:500]}"
            raise AssertionError(msg)
    
    def assert_api_success(self, data: dict, message: str = ""):
        """断言 API 返回 success=true"""
        if data.get("success") is not True:
            msg = message or f"API 返回失败: {data}"
            raise AssertionError(msg)
    
    def assert_field_type(self, data: dict, field: str, expected_type: type, message: str = ""):
        """断言字段类型"""
        if field not in data:
            raise AssertionError(f"字段 {field} 不存在")
        
        value = data[field]
        if not isinstance(value, expected_type):
            msg = message or f"字段 {field} 期望类型 {expected_type.__name__}，实际 {type(value).__name__}"
            raise AssertionError(msg)
    
    def assert_field_in_range(self, data: dict, field: str, min_val: Any, max_val: Any, message: str = ""):
        """断言字段值在范围内"""
        if field not in data:
            raise AssertionError(f"字段 {field} 不存在")
        
        value = data[field]
        if not (min_val <= value <= max_val):
            msg = message or f"字段 {field} 期望范围 [{min_val}, {max_val}]，实际 {value}"
            raise AssertionError(msg)
    
    def assert_list_not_empty(self, data: dict, field: str, message: str = ""):
        """断言列表字段非空"""
        if field not in data:
            raise AssertionError(f"字段 {field} 不存在")
        
        value = data[field]
        if not isinstance(value, list):
            raise AssertionError(f"字段 {field} 不是列表")
        
        if len(value) == 0:
            msg = message or f"列表 {field} 为空"
            raise AssertionError(msg)
    
    def assert_agent_structure(self, agent: dict, message: str = ""):
        """断言 AI 代理数据结构正确"""
        required_fields = ["name", "alive", "health", "action_points"]
        self.assert_has_fields(agent, required_fields, message)
        
        # 类型检查
        self.assert_field_type(agent, "name", str)
        self.assert_field_type(agent, "alive", bool)
        self.assert_field_type(agent, "health", (int, float))
        self.assert_field_type(agent, "action_points", int)
    
    def assert_proposal_structure(self, proposal: dict, message: str = ""):
        """断言提案数据结构正确"""
        required_fields = ["id", "proposer", "type", "content", "status", "supporters", "opposers"]
        self.assert_has_fields(proposal, required_fields, message)
        
        # 类型检查
        self.assert_field_type(proposal, "id", str)
        self.assert_field_type(proposal, "proposer", str)
        self.assert_field_type(proposal, "type", str)
        self.assert_field_type(proposal, "supporters", list)
        self.assert_field_type(proposal, "opposers", list)
