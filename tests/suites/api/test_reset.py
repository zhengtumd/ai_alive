"""
重置接口测试
============

测试 /reset 端点

预期响应:
    {
        "success": true,
        "message": "模拟已重置，游戏重新开始",
        "state": {
            "day": 0,
            "remaining_resources": 5000,
            "agents": [...],
            ...
        }
    }
"""

from tests.core import APITestCase


class TestReset(APITestCase):
    """测试重置接口"""
    
    timeout = 30
    
    def test_reset_success(self):
        """测试重置成功"""
        response = self.post("/reset", timeout=self.timeout)
        self.assert_status_ok(response)
        
        data = response.json()
        self.assert_has_fields(data, ["success", "message", "state"])
        self.assert_api_success(data)
    
    def test_reset_message(self):
        """测试重置返回正确消息"""
        response = self.post("/reset", timeout=self.timeout)
        data = response.json()
        
        message = data.get("message", "")
        self.assert_true(
            "重置" in message or "restart" in message.lower(),
            f"消息应包含'重置'或'restart': {message}"
        )
    
    def test_reset_state_structure(self):
        """测试重置后的 state 结构正确"""
        response = self.post("/reset", timeout=self.timeout)
        data = response.json()
        
        state = data.get("state", {})
        self.assert_has_fields(state, ["day", "agents"])
    
    def test_reset_day_is_zero(self):
        """测试重置后天数为 0"""
        response = self.post("/reset", timeout=self.timeout)
        data = response.json()
        
        state = data.get("state", {})
        day = state.get("day", -1)
        
        self.assert_equal(day, 0, f"重置后天数应为 0，实际是 {day}")
    
    def test_reset_resources_restored(self):
        """测试重置后资源恢复"""
        # 先运行一天消耗资源
        self.get("/run_next", timeout=120)
        
        # 获取运行后的资源
        status_response = self.get("/status")
        status_data = status_response.json()
        resources_after_run = status_data.get("remaining_resources", 0)
        
        # 重置
        reset_response = self.post("/reset", timeout=self.timeout)
        reset_data = reset_response.json()
        
        # 检查资源是否恢复
        state = reset_data.get("state", {})
        resources_after_reset = state.get("remaining_resources", 0)
        total_resources = state.get("total_resources", 5000)
        
        self.assert_equal(
            resources_after_reset, total_resources,
            f"重置后资源应恢复为 {total_resources}，实际是 {resources_after_reset}"
        )
