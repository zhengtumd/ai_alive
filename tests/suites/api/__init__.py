"""
API 接口测试套件
================

测试后端 API 的所有接口。

测试列表:
    - TestAIList: AI 列表接口
    - TestLiveState: 实时状态接口
    - TestStatus: 系统状态接口
    - TestAIDetail: AI 详情接口
    - TestRunNext: 运行下一天接口
    - TestReset: 重置接口
"""

from .test_ai_list import TestAIList
from .test_live_state import TestLiveState
from .test_status import TestStatus
from .test_ai_detail import TestAIDetail
from .test_run_next import TestRunNext
from .test_reset import TestReset

__all__ = [
    "TestAIList",
    "TestLiveState", 
    "TestStatus",
    "TestAIDetail",
    "TestRunNext",
    "TestReset"
]
