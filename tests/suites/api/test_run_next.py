"""
运行下一天接口测试
=================

测试 /run_next 端点

预期响应:
    {
        "day": 1,
        "remaining_resources": 270,
        "total_resources": 5000,
        "system_efficiency": 1.0,
        "elimination_count": 0,
        "global_token_consumed": 7500,
        "token_budget_remaining": 192500,
        "agents": [...],
        "day_events": [...],
        "proposals": [...]
    }

注意: 此测试会触发 AI 决策，可能需要较长时间
"""

from tests.core import APITestCase


class TestRunNext(APITestCase):
    """测试运行下一天接口"""
    
    timeout = 120  # 给更多时间，因为涉及 AI 决策
    
    def test_run_next_success(self):
        """测试运行下一天成功"""
        response = self.get("/run_next", timeout=self.timeout)
        self.assert_status_ok(response)
        
        data = response.json()
        required_fields = [
            "day", "remaining_resources", "total_resources",
            "system_efficiency", "elimination_count", "global_token_consumed",
            "token_budget_remaining", "agents", "day_events", "proposals"
        ]
        self.assert_has_fields(data, required_fields)
    
    def test_day_incremented(self):
        """测试天数增加"""
        # 获取当前状态
        status_response = self.get("/status")
        status_data = status_response.json()
        initial_day = status_data.get("day", 0)
        
        # 运行下一天
        run_response = self.get("/run_next", timeout=self.timeout)
        run_data = run_response.json()
        
        new_day = run_data.get("day", 0)
        expected_day = initial_day + 1
        
        self.assert_equal(
            new_day, expected_day,
            f"天数应从 {initial_day} 增加到 {expected_day}，实际是 {new_day}"
        )
    
    def test_agents_present(self):
        """测试返回包含 agents"""
        response = self.get("/run_next", timeout=self.timeout)
        data = response.json()
        
        self.assert_list_not_empty(data, "agents", "应返回 AI 代理列表")
        
        # 检查每个 agent 的结构
        for agent in data.get("agents", []):
            self.assert_agent_structure(agent)
    
    def test_day_events_is_list(self):
        """测试 day_events 是列表"""
        response = self.get("/run_next", timeout=self.timeout)
        data = response.json()
        
        self.assert_field_type(data, "day_events", list)
    
    def test_proposals_is_list(self):
        """测试 proposals 是列表"""
        response = self.get("/run_next", timeout=self.timeout)
        data = response.json()
        
        self.assert_field_type(data, "proposals", list)
    
    def test_resources_decreased_or_same(self):
        """测试资源没有增加（可能减少或不变）"""
        # 获取当前资源
        status_response = self.get("/status")
        status_data = status_response.json()
        initial_resources = status_data.get("remaining_resources", 0)
        
        # 运行下一天
        run_response = self.get("/run_next", timeout=self.timeout)
        run_data = run_response.json()
        new_resources = run_data.get("remaining_resources", 0)
        
        self.assert_true(
            new_resources <= initial_resources,
            f"资源不应增加: {initial_resources} -> {new_resources}"
        )
    
    def test_token_consumed_increased(self):
        """测试 Token 消耗增加"""
        response = self.get("/run_next", timeout=self.timeout)
        data = response.json()
        
        consumed = data.get("global_token_consumed", 0)
        self.assert_true(consumed > 0, "应有 Token 消耗")
