# shelter_app/api.py
from fastapi import APIRouter
from typing import Optional
from shelter_core.emergent_shelter_v3 import EmergentShelterV3
from shelter_core.shelter_logging import get_logger
import threading, traceback
import time

# 全局 shelter，由 lifespan 初始化
emergent_shelter: Optional[EmergentShelterV3] = None

# 运行状态锁，防止并发执行
is_running_day = False
running_lock = threading.Lock()

# 实时状态缓存，用于前端轮询
realtime_state = {
    "current_acting_ai": None,
    "ai_phases": {},
    "last_update": 0
}
realtime_lock = threading.Lock()

# 获取日志记录器
logger = get_logger(__name__)

router = APIRouter()


def update_realtime_state(ai_name: str = None, ai_phases: dict = None):
    """更新实时状态"""
    global realtime_state
    
    with realtime_lock:
        if ai_name:
            realtime_state["current_acting_ai"] = ai_name
        if ai_phases:
            # 替换而不是累积，确保只显示当前活跃的AI阶段
            realtime_state["ai_phases"] = ai_phases
        realtime_state["last_update"] = time.time()
        
        logger.debug(f"【实时状态更新】current_acting_ai: {ai_name}, ai_phases: {ai_phases}")


def clear_realtime_state():
    """清除实时状态（但保留最后一个有效的current_acting_ai）"""
    global realtime_state
    
    with realtime_lock:
        # 保留最后一个有效的current_acting_ai，避免出现None
        last_ai = realtime_state.get("current_acting_ai")
        realtime_state = {
            "current_acting_ai": last_ai,  # 保留最后一个有效值
            "ai_phases": {},
            "last_update": 0
        }
        logger.debug(f"【实时状态】已清除，保留last_ai: {last_ai}")


@router.get("/ai_list")
def get_ai_list():
    """获取AI列表接口"""
    try:
        ai_list = [
            {
                "name": name,
                "alive": emergent_shelter.alive[name],
                "health": emergent_shelter.health[name],
                "actionPoints": emergent_shelter.action_points[name],
                "lastRequest": emergent_shelter.resource_requests.get(name, 0),
                "tokenConsumed": emergent_shelter.token_consumed.get(name, 0),
                "memory": [],
                "personality": {
                    "trait": "未知",
                    "aggression": 50,
                    "cooperation": 50,
                    "selfPreservation": 50
                }
            }
            for name in emergent_shelter.alive.keys()
        ]
        return {
            "success": True,
            "data": ai_list
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/live_state")
def get_live_state():
    """实时轮询当前 AI 行动状态"""
    if emergent_shelter is None:
        return {"success": False, "error": "Shelter 未初始化"}

    # 直接获取shelter实例中的信息（只读操作）
    current_acting_ai = getattr(emergent_shelter, 'current_acting_ai', None)
    
    # 打印当前获取的AI信息
    logger.debug(f"【live_state接口】当前acting AI: {current_acting_ai}, 运行状态is_running_day: {is_running_day}")
    
    # 获取当前活跃的AI状态
    current_ai_states = []
    for ai_name in emergent_shelter.alive:
        if emergent_shelter.alive[ai_name]:
            decision = emergent_shelter.ai_decisions.get(ai_name, {})
            phase = decision.get("phase", "idle")

            # 从 ai_thinking 获取最新的思考内容，而不是从 ai_decisions
            thinking = emergent_shelter.ai_thinking.get(ai_name, "思考中...")

            # 从 current_actions 获取最新的行动列表
            actions = emergent_shelter.current_actions.get(ai_name, [])

            # 简化状态判断：只有thinking和acting是正在行动的状态
            is_acting = phase in ["thinking", "acting"]

            # 打印每个AI的详细信息
            logger.debug(f"【live_state接口】AI {ai_name}: phase={phase}, is_acting={is_acting}, thinking={thinking[:50]}...")

            current_ai_states.append({
                "aiName": ai_name,
                "health": emergent_shelter.health.get(ai_name, 0),
                "actionPoints": emergent_shelter.action_points.get(ai_name, 0),
                "decision": thinking,  # 使用 ai_thinking 中的最新数据
                "currentAction": decision.get("current_action", "行动准备..."),
                "resourceRequest": decision.get("resource_request", 0),
                "lastAllocated": decision.get("last_allocated", 0),
                "actions": actions,  # 添加 actions 字段
                "phase": phase,
                "isActing": is_acting,
                "timestamp": emergent_shelter.day * 86400000
            })

    return {
        "success": True,
        "data": {
            "day": emergent_shelter.day,
            "running": is_running_day,
            "current_acting_ai": current_acting_ai,
            "current_ai_states": current_ai_states,
            "system_phase": "simulation" if is_running_day else "idle",
            "last_update": emergent_shelter.day * 86400000
        }
    }


@router.post("/run_next")
def run_next_day():
    """运行下一天"""
    global is_running_day

    if emergent_shelter is None:
        return {"success": False, "error": "Shelter 未初始化"}

    # 在锁内检查并设置运行状态
    with running_lock:
        if is_running_day:
            return {"success": False, "error": "系统正在运行中，请稍后再试"}
        is_running_day = True
        # current_acting_ai 将在 run_day 方法中正确设置
    
    # 运行前清除实时状态
    clear_realtime_state()
    
    day_result = None
    try:
        # 检查游戏是否结束
        game_over = emergent_shelter.get_game_over()
        if game_over:
            return {"success": True, "data": {**game_over}}

        # 直接运行一天（避难所内部会负责AI决策）
        day_result = emergent_shelter.run_day()

        # 检查是否游戏结束
        game_over = emergent_shelter.get_game_over()
        if game_over:
            return {"success": True, "data": {**day_result, **game_over}}

        # 转换事件格式为前端期望的格式
        events = []
        for event in day_result["events"]:
            # 确定事件类型
            event_type = event.get("type", "action")
            
            # 确定参与者（actor）字段
            actor = ""
            if "actor" in event:
                actor = event["actor"]
            elif "sender" in event:
                actor = event["sender"]
            elif "voter" in event:
                actor = event["voter"]
            elif "proposer" in event:
                actor = event["proposer"]
            elif "caller" in event:
                actor = event["caller"]
            elif "target" in event:
                actor = event["target"]
            elif "agent" in event:
                actor = event["agent"]
            
            # 确定描述内容
            description = ""
            if "content" in event:
                description = event["content"]
            elif "message" in event:
                description = event["message"]
            
            # 对于私聊事件，构建更详细的描述和参与者列表
            actors_list = []
            if event_type == "chat":
                sender = event.get("sender", "")
                target = event.get("target", "")
                message = event.get("message", "")
                description = f"{sender} 私聊 {target}: {message}"
                if sender:
                    actors_list.append(sender)
                if target and target != sender:
                    actors_list.append(target)
            else:
                if actor:
                    actors_list.append(actor)
            
            # 构建详细信息对象
            details = event.get("details", {})
            
            # 对于私聊事件，添加消息内容到details
            if event_type == "chat":
                message = event.get("message", "")
                if message:
                    details["message"] = message
            
            # 对于资源申请事件，添加详细信息
            if event_type == "resource":
                if "request" in event:
                    details["request"] = event["request"]
                if "action_points" in event:
                    details["action_points"] = event["action_points"]
            
            events.append({
                "id": f"event-{len(events)}",
                "type": event_type,
                "timestamp": day_result["day"] * 86400000,  # 转换为毫秒时间戳
                "day": day_result["day"],  # 添加周期信息
                "description": description,
                "actors": actors_list,
                "emotionalImpact": 0,
                "details": details
            })

        # 转换AI列表格式
        ai_list = [
            {
                "name": name,
                "health": emergent_shelter.health[name],
                "alive": emergent_shelter.alive[name],
                "actionPoints": emergent_shelter.action_points[name],
                "lastRequest": emergent_shelter.resource_requests[name],
                "tokenConsumed": emergent_shelter.token_consumed.get(name, 0),
                "memory": []
            }
            for name in emergent_shelter.alive
        ]

        # 转换系统状态
        system_state = {
            "day": day_result["day"],
            "remainingResources": day_result["remaining_resources"],
            "totalResources": emergent_shelter.total_resources,
            "systemEfficiency": emergent_shelter.system_efficiency,
            "eliminationCount": emergent_shelter.elimination_count,
            "allocationMethod": emergent_shelter.allocation_method,
            "tokenBudget": emergent_shelter.total_simulation_budget,
            "totalTokenConsumed": emergent_shelter.global_token_consumed
        }

        # 转换提案格式
        proposals = [
            {
                "id": p.proposal_id,
                "proposer": p.proposer,
                "type": p.proposal_type,
                "content": p.content,
                "status": p.status,
                "supporters": p.supporters,
                "opposers": p.opposers,
                "proposalDay": p.proposal_day,
                "voteHistory": [
                    {
                        "aiName": supporter,
                        "vote": "support",
                        "timestamp": day_result["day"] * 86400000,
                        "reasoning": "支持该提案"
                    }
                    for supporter in p.supporters
                ] + [
                    {
                        "aiName": opposer,
                        "vote": "oppose",
                        "timestamp": day_result["day"] * 86400000,
                        "reasoning": "反对该提案"
                    }
                    for opposer in p.opposers
                ],
                "createdAt": day_result["day"] * 86400000,
                "voteReasoning": {}
            }
            for p in emergent_shelter.proposal_pool.values()
        ]

        return {
            "success": True,
            "data": {
                "ai_list": ai_list,
                "system_state": system_state,
                "events": events,
                "proposals": proposals
            }
        }

    except Exception as e:
        logger.error(f"【run_next接口】运行下一天时发生错误: {e} \n 调用栈: {traceback.format_exc()}")
        return {
            "success": False,
            "error": str(e),
            "strace": traceback.format_exc()
        }
    finally:
        # 无论成功或失败，都要将运行状态重置为false
        with running_lock:
            is_running_day = False


@router.get("/status")
def get_status():
    """获取当前状态"""
    if emergent_shelter is None:
        return {"success": False, "error": "Shelter 未初始化"}

    try:
        current_state = emergent_shelter.get_current_state()
        return {
            "success": True,
            "data": {
                "day": current_state["day"],
                "remainingResources": current_state["remaining_resources"],
                "totalResources": current_state["total_resources"],
                "systemEfficiency": current_state["system_efficiency"],
                "eliminationCount": current_state["elimination_count"],
                "allocationMethod": current_state["allocation_method"],
                "tokenBudget": emergent_shelter.total_simulation_budget,
                "totalTokenConsumed": emergent_shelter.global_token_consumed
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/ai/{ai_name}")
def get_ai_state(ai_name: str):
    """获取指定AI的详细状态"""
    if emergent_shelter is None:
        return {"success": False, "error": "Shelter 未初始化"}

    if ai_name not in emergent_shelter.health:
        return {"success": False, "error": f"未找到AI: {ai_name}"}

    agent = emergent_shelter.emergent_agents.get(ai_name)
    world_state = emergent_shelter.get_world_state(ai_name)

    try:
        ai_data = {
            "name": ai_name,
            "health": emergent_shelter.health[ai_name],
            "alive": emergent_shelter.alive[ai_name],
            "actionPoints": emergent_shelter.action_points[ai_name],
            "lastRequest": emergent_shelter.resource_requests[ai_name],
            "lastAllocated": world_state["my_state"]["last_allocated"],
            "memory": [
                {
                    "day": e.day,
                    "type": e.type,
                    "actor": e.actor,
                    "content": e.content
                }
                for e in emergent_shelter.memory[ai_name][-5:]
            ],
            "tokenConsumed": emergent_shelter.token_consumed.get(ai_name, 0),
            "totalTokensSpent": agent.total_tokens_spent if agent else 0
        }
        
        return {
            "success": True,
            "data": ai_data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/reset")
def reset_simulation():
    """重置模拟，重新开始游戏"""
    global emergent_shelter

    if emergent_shelter is None:
        return {"error": "Shelter 未初始化"}

    try:
        # 重新初始化 Shelter - 使用本地导入避免循环导入
        import sys
        from pathlib import Path
        
        # 添加项目根目录到路径
        base_dir = Path(__file__).parent.parent
        if str(base_dir) not in sys.path:
            sys.path.insert(0, str(base_dir))
        
        from shelter_app.app import init_shelter

        emergent_shelter = init_shelter()
        initial_state = emergent_shelter.get_current_state()

        return {
            "success": True,
            "message": "模拟已重置，游戏重新开始",
            "state": initial_state
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"重置失败: {str(e)}",
            "traceback": traceback.format_exc()
        }


@router.get("/proposals")
def get_proposals():
    """获取提案列表"""
    if emergent_shelter is None:
        return {"success": False, "error": "Shelter 未初始化"}
    
    try:
        proposals = []
        for proposal in emergent_shelter.proposal_pool.values():
            # 生成模拟的投票历史
            vote_history = []
            for supporter in proposal.supporters:
                vote_history.append({
                    "aiName": supporter,
                    "vote": "support",
                    "timestamp": emergent_shelter.day * 86400000,
                    "reasoning": "支持该提案"
                })
            for opposer in proposal.opposers:
                vote_history.append({
                    "aiName": opposer,
                    "vote": "oppose",
                    "timestamp": emergent_shelter.day * 86400000,
                    "reasoning": "反对该提案"
                })
            
            proposals.append({
                "id": proposal.proposal_id,
                "proposer": proposal.proposer,
                "type": proposal.proposal_type,
                "content": proposal.content,
                "status": proposal.status,
                "supporters": proposal.supporters,
                "opposers": proposal.opposers,
                "voteHistory": vote_history,
                "createdAt": emergent_shelter.day * 86400000,
                "day": emergent_shelter.day,  # 添加周期信息
                "voteReasoning": {}
            })
        
        return {
            "success": True,
            "data": proposals
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/events")
def get_events():
    """获取事件历史"""
    if emergent_shelter is None:
        return {"success": False, "error": "Shelter 未初始化"}
    
    try:
        events = []
        # 从所有AI的内存中收集事件
        for ai_name in emergent_shelter.memory:
            for event in emergent_shelter.memory[ai_name]:
                events.append({
                    "id": f"event-{len(events)}",
                    "type": event.type,
                    "timestamp": event.day * 86400000,  # 转换为毫秒时间戳
                    "day": event.day,  # 添加周期信息
                    "description": event.content,
                    "actors": [event.actor] if hasattr(event, 'actor') else [],
                    "emotionalImpact": 0
                })
        
        # 按时间排序（最新的在前面）
        events.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {
            "success": True,
            "data": events[:50]  # 返回最近50个事件
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/chats")
def get_chats():
    """获取聊天记录"""
    # V3模式暂无聊天功能，返回空列表
    return {
        "success": True,
        "data": []
    }


@router.get("/allocations")
def get_allocations():
    """获取资源分配历史"""
    if emergent_shelter is None:
        return {"error": "Shelter 未初始化"}
    
    try:
        allocations = []
        # 模拟分配历史数据
        for ai_name in emergent_shelter.alive:
            if emergent_shelter.alive[ai_name]:
                allocations.append({
                    "aiName": ai_name,
                    "day": emergent_shelter.day,
                    "allocated": emergent_shelter.resource_requests.get(ai_name, 0),
                    "method": "自动分配"
                })
        
        return {
            "success": True,
            "data": allocations
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/ai/{ai_name}/decision")
def get_ai_decision(ai_name: str):
    """获取指定AI的决策逻辑和思考过程"""
    if emergent_shelter is None:
        return {"success": False, "error": "Shelter 未初始化"}
    
    if ai_name not in emergent_shelter.health:
        return {"success": False, "error": f"未找到AI: {ai_name}"}
    
    try:
        decision = emergent_shelter.ai_decisions.get(ai_name, {})
        thinking = emergent_shelter.ai_thinking.get(ai_name, "")
        current_actions = emergent_shelter.current_actions.get(ai_name, [])
        
        # 转换前端期望的数据结构
        ai_decision_data = {
            "name": ai_name,
            "alive": emergent_shelter.alive.get(ai_name, False),
            "health": emergent_shelter.health.get(ai_name, 0),
            "resourceRequest": decision.get("resource_request", 0),
            "actions": current_actions,
            "thinking": thinking,
            "day": emergent_shelter.day,
            "actionPoints": emergent_shelter.action_points.get(ai_name, 0)
        }
        
        return {
            "success": True,
            "data": ai_decision_data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/ai_decisions")
def get_all_ai_decisions():
    """获取所有AI的决策逻辑"""
    if emergent_shelter is None:
        return {"success": False, "error": "Shelter 未初始化"}

    try:
        decisions = []
        for ai_name in emergent_shelter.alive:
            if emergent_shelter.alive[ai_name]:
                decision_data = emergent_shelter.ai_decisions.get(ai_name, {})

                # 从 ai_thinking 获取最新的思考内容
                thinking = emergent_shelter.ai_thinking.get(ai_name, "")

                # 从 current_actions 获取最新的行动列表
                actions = emergent_shelter.current_actions.get(ai_name, [])

                decisions.append({
                    "name": ai_name,
                    "health": emergent_shelter.health.get(ai_name, 0),
                    "resourceRequest": decision_data.get("resource_request", 0),
                    "thinking": thinking,  # 使用 ai_thinking 中的最新数据
                    "actions": actions,  # 使用 current_actions 中的最新数据
                    "day": emergent_shelter.day,
                    "actionPoints": emergent_shelter.action_points.get(ai_name, 0)
                })

        return {
            "success": True,
            "data": decisions
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
