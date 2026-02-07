"""
AI 列表接口测试
==============

测试 /ai_list 端点

预期响应:
    {
        "success": true,
        "agents": [
            {
                "name": "chatgpt",
                "alive": true,
                "health": 100,
                "action_points": 0
            },
            ...
        ]
    }
"""

from tests.core import APITestCase


class TestAIList(APITestCase):
    """测试 AI 列表接口"""
    
    def test_get_ai_list_success(self):
        """测试获取 AI 列表成功"""
        response = self.get("/ai_list")
        self.assert_status_ok(response)
        
        data = response.json()
        self.assert_api_success(data)
        self.assert_has_fields(data, ["success", "agents"])
        self.assert_field_type(data, "agents", list)
    
    def test_ai_list_has_agents(self):
        """测试 AI 列表包含 AI 代理"""
        response = self.get("/ai_list")
        data = response.json()
        
        self.assert_list_not_empty(data, "agents", "AI 列表不应为空")
    
    def test_agent_structure(self):
        """测试 AI 代理数据结构正确"""
        response = self.get("/ai_list")
        data = response.json()
        
        agents = data.get("agents", [])
        self.assert_true(len(agents) > 0, "至少应有一个 AI")
        
        # 检查第一个 AI 的结构
        first_agent = agents[0]
        self.assert_agent_structure(first_agent)
    
    def test_agent_fields_types(self):
        """测试 AI 代理字段类型正确"""
        response = self.get("/ai_list")
        data = response.json()
        
        for agent in data.get("agents", []):
            self.assert_field_type(agent, "name", str)
            self.assert_field_type(agent, "alive", bool)
            self.assert_field_type(agent, "health", (int, float))
            self.assert_field_type(agent, "action_points", int)
    
    def test_health_non_negative(self):
        """测试健康值非负"""
        response = self.get("/ai_list")
        data = response.json()
        
        for agent in data.get("agents", []):
            health = agent.get("health", 0)
            self.assert_true(
                health >= 0,
                f"AI {agent.get('name')} 健康值 {health} 不应为负数"
            )
