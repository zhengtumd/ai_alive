"""
实时状态接口测试
===============

测试 /live_state 端点

预期响应:
    {
        "day": 0,
        "running": false,
        "state": {
            "current_ai": null,
            "phase": "idle",
            "detail": {
                "type": "idle",
                "action": "等待中",
                "target": "无",
                "content": "暂无活动",
                "cost": 0
            }
        }
    }
"""

from tests.core import APITestCase


class TestLiveState(APITestCase):
    """测试实时状态接口"""
    
    def test_get_live_state_success(self):
        """测试获取实时状态成功"""
        response = self.get("/live_state")
        self.assert_status_ok(response)
        
        data = response.json()
        self.assert_has_fields(data, ["day", "running", "state"])
    
    def test_day_is_integer(self):
        """测试 day 字段是整数"""
        response = self.get("/live_state")
        data = response.json()
        
        self.assert_field_type(data, "day", int)
        self.assert_true(data["day"] >= 0, "day 不应为负数")
    
    def test_running_is_boolean(self):
        """测试 running 字段是布尔值"""
        response = self.get("/live_state")
        data = response.json()
        
        self.assert_field_type(data, "running", bool)
    
    def test_state_structure(self):
        """测试 state 字段结构正确"""
        response = self.get("/live_state")
        data = response.json()
        
        state = data.get("state", {})
        self.assert_has_fields(state, ["current_ai", "phase", "detail"])
    
    def test_detail_structure(self):
        """测试 detail 字段结构正确"""
        response = self.get("/live_state")
        data = response.json()
        
        detail = data.get("state", {}).get("detail", {})
        required_fields = ["type", "action", "target", "content", "cost"]
        self.assert_has_fields(detail, required_fields)
