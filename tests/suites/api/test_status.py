"""
系统状态接口测试
===============

测试 /status 端点

预期响应:
    {
        "day": 0,
        "remaining_resources": 5000,
        "total_resources": 5000,
        "system_efficiency": 1.0,
        "elimination_count": 0,
        "agents": [...],
        "proposals": [...]
    }
"""

from tests.core import APITestCase


class TestStatus(APITestCase):
    """测试系统状态接口"""
    
    def test_get_status_success(self):
        """测试获取系统状态成功"""
        response = self.get("/status")
        self.assert_status_ok(response)
        
        data = response.json()
        required_fields = [
            "day", "remaining_resources", "total_resources",
            "system_efficiency", "elimination_count", "agents", "proposals"
        ]
        self.assert_has_fields(data, required_fields)
    
    def test_resource_fields(self):
        """测试资源字段类型和关系"""
        response = self.get("/status")
        data = response.json()
        
        # 类型检查
        self.assert_field_type(data, "remaining_resources", (int, float))
        self.assert_field_type(data, "total_resources", (int, float))
        
        # 剩余资源不应超过总资源
        remaining = data.get("remaining_resources", 0)
        total = data.get("total_resources", 0)
        self.assert_true(
            remaining <= total,
            f"剩余资源 {remaining} 不应超过总资源 {total}"
        )
    
    def test_system_efficiency_range(self):
        """测试系统效率在有效范围内"""
        response = self.get("/status")
        data = response.json()
        
        efficiency = data.get("system_efficiency", 1.0)
        self.assert_true(
            0 <= efficiency <= 1,
            f"系统效率 {efficiency} 应在 [0, 1] 范围内"
        )
    
    def test_agents_is_list(self):
        """测试 agents 是列表"""
        response = self.get("/status")
        data = response.json()
        
        self.assert_field_type(data, "agents", list)
    
    def test_proposals_is_list(self):
        """测试 proposals 是列表"""
        response = self.get("/status")
        data = response.json()
        
        self.assert_field_type(data, "proposals", list)
    
    def test_elimination_count_non_negative(self):
        """测试淘汰数非负"""
        response = self.get("/status")
        data = response.json()
        
        count = data.get("elimination_count", 0)
        self.assert_true(count >= 0, "淘汰数不应为负数")
