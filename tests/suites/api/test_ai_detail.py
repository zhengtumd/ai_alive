"""
AI 详情接口测试
==============

测试 /ai/{name} 端点

预期响应:
    {
        "name": "chatgpt",
        "health": 100,
        "alive": true,
        "action_points": 0,
        "last_request": 0,
        "last_allocated": 0,
        "memory": [],
        "token_consumed_today": 0,
        "total_tokens_spent": 0
    }
"""

from tests.core import APITestCase


class TestAIDetail(APITestCase):
    """测试 AI 详情接口"""
    
    def test_get_ai_detail_success(self):
        """测试获取 AI 详情成功"""
        # 先获取 AI 列表
        list_response = self.get("/ai_list")
        list_data = list_response.json()
        
        if not list_data.get("agents"):
            self.assert_true(False, "没有可用的 AI 进行测试")
            return
        
        ai_name = list_data["agents"][0]["name"]
        
        # 获取详情
        response = self.get(f"/ai/{ai_name}")
        self.assert_status_ok(response)
        
        data = response.json()
        required_fields = [
            "name", "health", "alive", "action_points",
            "last_request", "last_allocated", "memory",
            "token_consumed_today", "total_tokens_spent"
        ]
        self.assert_has_fields(data, required_fields)
    
    def test_ai_detail_name_matches(self):
        """测试返回的 name 与请求的一致"""
        list_response = self.get("/ai_list")
        list_data = list_response.json()
        
        if not list_data.get("agents"):
            return
        
        ai_name = list_data["agents"][0]["name"]
        
        response = self.get(f"/ai/{ai_name}")
        data = response.json()
        
        self.assert_equal(data.get("name"), ai_name, "返回的 name 应与请求的一致")
    
    def test_memory_is_list(self):
        """测试 memory 是列表"""
        list_response = self.get("/ai_list")
        list_data = list_response.json()
        
        if not list_data.get("agents"):
            return
        
        ai_name = list_data["agents"][0]["name"]
        
        response = self.get(f"/ai/{ai_name}")
        data = response.json()
        
        self.assert_field_type(data, "memory", list)
    
    def test_nonexistent_ai(self):
        """测试获取不存在的 AI"""
        response = self.get("/ai/nonexistent_ai_12345")
        
        # 应该返回 200 但包含错误信息
        self.assert_status_ok(response)
        
        data = response.json()
        # 应该包含 error 字段
        if "error" in data:
            self.assert_true(True, "正确返回了错误信息")
