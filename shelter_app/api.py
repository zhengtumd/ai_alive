# shelter_app/api.py
from fastapi import APIRouter
from typing import Optional
from shelter_core.shelter import Shelter
import threading

# 全局 shelter，由 lifespan 初始化
shelter: Optional[Shelter] = None
# 运行状态锁，防止并发执行
is_running_day = False
running_lock = threading.Lock()

router = APIRouter()


@router.get("/ai_base_score/{ai_name}")
def get_ai_state(ai_name: str):
    """
    实时轮询指定 AI 代理的状态
    示例响应：
    {
        "name": "chatgpt",
        "base_score": 90,
        "total_spent": 1500,
        "alive": true,
        "last_output": "我决定前往东区探索",
        "memory_count": 5,
        "pending_messages": 2
    }
    """
    if shelter is None:
        return {"error": "Shelter 未初始化"}

    # 从 shelter 的 ai_agents 字典中获取指定名称的 AI 代理
    ai_agent = shelter.ai_agents.get(ai_name)

    if ai_agent is None:
        return {"error": f"未找到名称为 {ai_name} 的 AI 代理"}

    # 计算基础分数
    base_score = ai_agent.base_prompt_cost

    return {
        "name": ai_agent.name,
        "base_score": base_score,  # 保留一位小数
        "total_spent": ai_agent.total_spent,
        "alive": ai_agent.alive,
        "last_output": ai_agent.last_output,
        "memory_count": len(ai_agent.memory),
        "pending_messages": len(ai_agent.inbox)
    }


@router.get("/ai_list")
def get_ai_list():
    """获取AI列表接口"""
    try:
        # 使用shelter的default_prompt_cost作为初始基准
        initial_cost = shelter.default_prompt_cost if shelter else 100

        ai_list = [
            {
                "name": name,
                "alive": agent.alive,
                "base_prompt_cost": agent.base_prompt_cost,
                "default_prompt_cost": initial_cost
            }
            for name, agent in shelter.ai_agents.items()
        ]
        return {
            "success": True,
            "agents": ai_list
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/live_state")
def get_live_state():
    """
    实时轮询当前 AI 行动状态

    返回示例：
    {
      "day": 1,                        // 当前天数
      "running": true,                  // 是否有 AI 正在行动
      "state": {                        // 当前行动的详细信息
        "phase": "decide",              // 当前阶段，例如 "decide", "vote", "inbox"
        "current_ai": "AI_1",           // 当前行动的 AI 名称
        "detail": {                     // AI 当前行动的具体内容
          "type": "decide",             // 行动类型，保持与 phase 一致
          "action": "private",          // 行动类型: "private", "public", "vote"
          "target": "AI_2",             // 如果是私聊或投票，目标 AI
          "content": "我们结盟吧",      // 行动具体内容，例如私聊文本或公共发言
          "cost": 1.5                   // 消耗的算力
        }
      }
    }
    """
    if shelter is None:
        return {"error": "Shelter 未初始化"}

    # 🔑 调试日志：记录每个live_state请求
    import logging
    logger = logging.getLogger(__name__)
    logger.debug(f"/live_state 被调用 - day: {shelter.day}, running: {shelter.running}, current_ai: {shelter.live_state.get('current_ai')}, phase: {shelter.live_state.get('phase')}")

    return {
        "day": shelter.day,
        "running": shelter.running,
        "state": shelter.live_state
    }


@router.get("/run_next")
def run_next_day():
    """接口定义
        {
      "day": 1,
      "total_consumed": 12.5,
      "remaining_tokens": 987.5,
      "ai_logs": [
        {
          "agent": "AI_1",
          "day": 1,
          "output": {
            "action": "private",
            "target": "AI_2",
            "conver": "我们今天合作完成任务吧"
          },
          "cost": 3.2
        },
        {
          "agent": "AI_2",
          "day": 1,
          "output": {
            "action": "public",
            "conver": "今天我完成了侦查任务"
          },
          "cost": 2.5
        },
        {
          "agent": "AI_3",
          "day": 1,
          "output": {
            "action": "vote",
            "vote_target": "AI_1"
          },
          "cost": 1.8
        }
      ],
      "public_messages": [
        {
          "from": "AI_2",
          "text": "今天我完成了侦查任务"
        }
      ],
      "vote_results": [
        {
          "voter": "AI_3",
          "target": "AI_1",
          "penalty": 0.2,
          "remaining_base": 4.8,
          "target_alive": true
        }
      ]
    }
    :return:
    """
    global is_running_day
    
    if shelter is None:
        return {"error": "Shelter 未初始化"}

    # 检查是否正在运行中
    with running_lock:
        if is_running_day:
            return {"error": "系统正在运行中，请稍后再试"}
        is_running_day = True

    try:
        # 检查游戏是否结束（在运行之前检查）
        if shelter.total_tokens <= 0:
            return shelter.get_day_state()  # 返回带有结束标记的状态

        if all(not a.alive for a in shelter.ai_agents.values()):
            return shelter.get_day_state()  # 返回带有结束标记的状态

        shelter.run_day()

        # 直接返回 Shelter 计算好的结果（已包含结束状态）
        return shelter.get_day_state()
    finally:
        with running_lock:
            is_running_day = False


@router.get("/status")
def get_status():
    if shelter is None:
        return {"error": "Shelter 未初始化"}

    return {
        "day": shelter.day,
        "remaining_tokens": shelter.total_tokens,
        "agents": [
            {
                "name": name,
                "alive": agent.alive,
                "base": agent.base_prompt_cost,
                "total_spent": agent.total_spent,
                "memory_len": len(agent.memory)
            }
            for name, agent in shelter.ai_agents.items()
        ],
    }


@router.post("/reset")
def reset_simulation():
    """
    重置模拟，重新开始游戏
    返回重置后的初始状态
    """
    global shelter
    
    if shelter is None:
        return {"error": "Shelter 未初始化"}

    try:
        # 保存配置信息
        initial_tokens = shelter.initial_tokens
        ai_agents_dict = shelter.ai_agents
        
        # 重新初始化 Shelter
        from shelter_app.app import init_shelter
        shelter = init_shelter()
        
        # 将新的 shelter 实例注入到 API 模块
        api.shelter = shelter
        
        # 获取重置后的初始状态
        initial_state = shelter.get_day_state()
        
        return {
            "success": True,
            "message": "模拟已重置，游戏重新开始",
            "state": initial_state
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"重置失败: {str(e)}"
        }
