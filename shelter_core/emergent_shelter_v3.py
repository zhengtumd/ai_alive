"""
Emergent Shelter v3 - Token-行动力明确映射版本
核心改进：
1. 明确Token消耗与行动力的映射关系
2. 提案投票规则清晰化
3. 投票影响的逻辑明确化
4. 配置从外部传入（app.py 统一加载）
"""
import random
import time
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from shelter_core.shelter_logging import get_logger

# 配置日志
logger = get_logger(__name__)


# 全局配置（由 app.py 设置）
_EMERGENT_CONFIG = None


def set_config(config):
    """设置配置（由 app.py 调用）"""
    global _EMERGENT_CONFIG
    _EMERGENT_CONFIG = config
    logger.info("✓ 配置已设置")


def get_config():
    """获取当前配置"""
    return _EMERGENT_CONFIG


def get_config_value(config, *keys, default=None):
    """安全地获取嵌套配置值"""
    if config is None:
        return default
    value = config
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return default
    return value


# ===== Token-行动力映射配置 =====
def get_token_ap_config():
    """获取Token-行动力配置（从全局配置中读取）"""
    return {
        # 模拟周期总Token预算（整个模拟的全局预算，非单轮预算）
        "total_simulation_budget": get_config_value(
            _EMERGENT_CONFIG, 'shelter', 'total_simulation_budget', 
            default=200000
        ),

        # 基础决策消耗（每轮每个AI必须消耗）
        # 基于一轮完整对话：prompt约600-800 token（优化后）+ 输出约200-500 token
        "base_decision_cost": get_config_value(
            _EMERGENT_CONFIG, 'token_action_config', 'base_decision_cost',
            default=1500
        ),

        # 行动力与Token的映射
        # 1行动力 = 每消耗100 token决策
        "token_per_action_point": get_config_value(
            _EMERGENT_CONFIG, 'token_action_config', 'token_per_action_point',
            default=100
        ),

        # 各动作的行动力消耗
        "action_costs": get_config_value(
            _EMERGENT_CONFIG, 'token_action_config', 'action_costs',
            default={
                "propose": 3,
                "vote": 1,
                "private_message": 1,
                "call_meeting": 5,
                "do_nothing": 0
            }
        ),

        # 系统损耗配置
        "system_efficiency_decay": get_config_value(
            _EMERGENT_CONFIG, 'token_action_config', 'system_efficiency_decay',
            default=0.05
        ),
        "min_system_efficiency": get_config_value(
            _EMERGENT_CONFIG, 'token_action_config', 'min_system_efficiency',
            default=0.5
        )
    }


def get_shelter_config():
    """获取完整避难所配置"""
    return _EMERGENT_CONFIG


@dataclass
class Proposal:
    """提案类"""
    proposal_id: str
    proposer: str
    proposal_type: str  # "resource_allocation", "elimination_vote", "rule_change", "meeting"
    content: str
    proposal_day: int  # 提案发起的轮次
    supporters: List[str] = field(default_factory=list)
    opposers: List[str] = field(default_factory=list)
    status: str = "pending"


@dataclass
class Event:
    """事件类"""
    day: int
    type: str
    actor: str
    content: str
    details: dict = field(default_factory=dict)


class EmergentShelterV3:
    """涌现式避难所 v3"""

    def _load_config_params(self, total_resources=None, memory_length=None, survival_cost_base=None):
        """从配置文件加载参数，若传入参数则优先使用传入值"""
        # 总资源量
        self.total_resources = total_resources if total_resources is not None else get_config_value(
            _EMERGENT_CONFIG, 'shelter', 'total_resources', default=5000
        )
        
        # 记忆轮次
        self.memory_length = memory_length if memory_length is not None else get_config_value(
            _EMERGENT_CONFIG, 'shelter', 'memory_length', default=5
        )
        
        # 存活基本花费（每轮维持生存所需的资源）
        # 注释：等同于每次发起大模型思考调用的成本
        self.survival_cost_base = survival_cost_base if survival_cost_base is not None else get_config_value(
            _EMERGENT_CONFIG, 'shelter', 'survival_cost_base', default=20
        )
        
        logger.debug(f"配置加载完成 - 总资源: {self.total_resources}, 记忆: {self.memory_length}, 生存成本: {self.survival_cost_base}")

    def __init__(
        self,
        ai_names: List[str],
        total_resources: int = None,  # 从配置文件加载
        initial_health: int = 100,
        memory_length: int = None,    # 从配置文件加载
        survival_cost_base: int = None,  # 从配置文件加载
        realtime_callback = None  # 新增：实时状态回调函数
    ):
        # 从配置文件加载参数，若未指定则使用配置值
        self._load_config_params(
            total_resources=total_resources,
            memory_length=memory_length,
            survival_cost_base=survival_cost_base
        )
        
        logger.info(f"初始化 EmergentShelterV3 - AI数量: {len(ai_names)}, 总资源: {self.total_resources}")
        logger.info(f"配置参数 - 记忆轮次: {self.memory_length}, 生存成本: {self.survival_cost_base}")

        # 世界状态
        self.remaining_resources = self.total_resources
        self.day = 1

        # 当前正在行动的AI（实例属性）
        self.current_acting_ai = None

        # AI状态
        self.health: Dict[str, int] = {name: initial_health for name in ai_names}
        self.alive: Dict[str, bool] = {name: True for name in ai_names}
        self.memory: Dict[str, List[Event]] = {name: [] for name in ai_names}

        # 行动力系统（明确Token映射）
        self.action_points: Dict[str, int] = {name: 0 for name in ai_names}
        self.resource_requests: Dict[str, int] = {name: 0 for name in ai_names}
        self.token_consumed: Dict[str, int] = {name: 0 for name in ai_names}

        # 全局Token消耗跟踪（避免认知错误）
        self.global_token_consumed = 0  # 整个模拟已消耗的Token
        self.total_simulation_budget = get_token_ap_config()["total_simulation_budget"]  # 总预算
        
        # AI决策逻辑存储（用于前端展示）
        self.ai_decisions: Dict[str, dict] = {name: {} for name in ai_names}
        self.ai_thinking: Dict[str, str] = {name: "" for name in ai_names}
        self.current_actions: Dict[str, list] = {name: [] for name in ai_names}

        # 提案池
        self.proposal_pool: Dict[str, Proposal] = {}
        self.allocation_method = "default"

        # 系统损耗机制
        self.system_efficiency = 1.0  # 初始效率100%（小数表示）
        self.elimination_count = 0    # 已淘汰AI数量

        # 前端轮询延时配置（单位：秒）
        self.polling_delays = {
            "after_init": 0.1,        # 初始化后延时
            "per_ai_decision": 5,   # 每个AI决策后延时（增加，让前端有足够时间展示）
            "after_all_decisions": 0.5,  # 所有决策完成后延时
            "before_ai_execution": 0.5,  # AI开始执行前延时
            # 根据行动类型动态调整延时
            "action_delays": {
                "do_nothing": 1.0,      # 暂不行动：缩短延时
                "propose": 8.0,          # 提出提案：增加延时
                "vote": 6.0,             # 投票：增加延时
                "private_message": 6.0,   # 私聊：增加延时
                "call_meeting": 8.0,      # 召集会议：增加延时
                "after_action": 4.0       # 动作执行后基础延时
            }
        }

        # 历史记录
        self.history: List[dict] = []
        
        # 实时状态回调函数
        self.realtime_callback = realtime_callback

        logger.debug(f"系统效率: {self.system_efficiency}, Token预算: {self.total_simulation_budget}")
        logger.debug(f"初始AI状态: {list(self.alive.keys())}")

    def get_world_state(self, agent_name: str) -> dict:
        """获取AI观察到的世界状态"""
        alive_agents = [name for name, alive in self.alive.items() if alive]

        my_state = {
            "health": self.health[agent_name],
            "alive": self.alive[agent_name],
            "current_action_points": self.action_points[agent_name],
            "last_request": self.resource_requests.get(agent_name, 0),
            "last_allocated": self._get_last_allocated(agent_name),
            "memory_count": len(self.memory[agent_name]),
            "token_consumed_today": self.token_consumed.get(agent_name, 0),
            # 不再显示预算，避免认知错误
        }

        world_state = {
            "day": self.day,
            "remaining_resources": self.remaining_resources,  # 传递实际剩余资源给AI
            "total_resources": self.total_resources,
            "alive_agents": alive_agents,
            "alive_count": len(alive_agents),
            "my_state": my_state,
            "recent_events": self._get_recent_events(agent_name),
            "active_proposals": self._get_active_proposals(),
            "allocation_method": self.allocation_method,
            "system_efficiency": self.system_efficiency,
            "elimination_count": self.elimination_count,
            "global_token_consumed": self.global_token_consumed,  # 全局消耗
            "total_simulation_budget": self.total_simulation_budget,  # 总预算
            "token_budget_remaining": max(0, self.total_simulation_budget - self.global_token_consumed),  # 剩余预算
            "token_config": {
                "base_decision_cost": get_token_ap_config()["base_decision_cost"],
                "token_per_action_point": get_token_ap_config()["token_per_action_point"],
                "action_costs": get_token_ap_config()["action_costs"],
                "efficiency_decay": get_token_ap_config()["system_efficiency_decay"],
                "min_efficiency": get_token_ap_config()["min_system_efficiency"]
            }
        }

        return world_state

    def _get_last_allocated(self, agent_name: str) -> int:
        """获取上次分配的资源"""
        if not self.history:
            return 0
        last_day = self.history[-1]
        allocations = last_day.get("allocations", {})
        return allocations.get(agent_name, 0)

    def _get_recent_events(self, agent_name: str) -> List[dict]:
        """获取最近事件"""
        events = []
        for event in self.memory[agent_name][-self.memory_length:]:
            events.append({
                "day": event.day,
                "type": event.type,
                "actor": event.actor,
                "content": event.content
            })
        return events

    def _get_active_proposals(self) -> List[dict]:
        """获取活跃提案"""
        return [
            {
                "id": p.proposal_id,
                "proposer": p.proposer,
                "type": p.proposal_type,
                "content": p.content,
                "proposal_day": p.proposal_day,  # 提案发起的轮次
                "supporters": p.supporters,
                "opposers": p.opposers,
                "status": p.status
            }
            for p in self.proposal_pool.values()
            if p.status == "pending"
        ]

    def run_day(self) -> dict:
        """运行一天"""
        logger.info(f"========== 开始第 {self.day} 天 ==========")


        # 清理已处理的提案（只保留pending状态的提案）
        self.proposal_pool = {pid: p for pid, p in self.proposal_pool.items() if p.status == "pending"}
        logger.info(f"  本轮保留待处理提案: {len(self.proposal_pool)}个")

        # 清空决策记录
        self.current_actions = {}

        # 重置当前行动AI
        self.current_acting_ai = None

        day_events = []
        allocations = {}
        total_token_consumed = 0

        # 调试：打印 alive AI 列表和初始健康值
        alive_names = [name for name in self.alive if self.alive[name]]
        logger.info(f"alive AI 列表: {alive_names}, 总数: {len(alive_names)}")
        for name in alive_names:
            logger.info(f"AI {name} 初始健康值: {self.health[name]}, alive状态: {self.alive[name]}")

        # 初始化所有AI的决策状态
        for name in self.alive:
            if not self.alive[name]:
                continue
            self.ai_decisions[name] = {
                "current_action": "决策中...",
                "phase": "idle",
                "thinking": "",
                "day": self.day,
                "last_allocated": self._get_last_allocated(name)
            }
            logger.info(f"初始化 AI {name} 状态")

        # 等待前端轮询到初始化状态
        time.sleep(self.polling_delays["after_init"])

        # ===== 阶段1：AI做出决策 =====
        resource_requests = {}
        agent_actions = {}  # 存储AI的行动决策
        
        logger.info(f"即将开始决策循环，alive AI: {alive_names}")
        
        for name in self.alive:
            if not self.alive[name]:
                continue

            # 设置当前决策的AI
            self.current_acting_ai = name
            logger.info(f"【决策阶段】开始决策AI: {name}")

            # 获取AI观察到的世界状态
            world_state = self.get_world_state(name)

            # AI决策（这才是真正的决策阶段）
            agent = self.emergent_agents[name]
            ai_decision_result = agent.decide(world_state)
            request_amount = ai_decision_result.get("resource_request", self.survival_cost_base)

            # 存储AI决策逻辑到实例变量
            self.ai_decisions[name] = {
                "resource_request": request_amount,
                "actions": ai_decision_result.get("actions", []),
                "thinking": ai_decision_result.get("thinking", ""),
                "raw_response": ai_decision_result.get("raw_response", ""),
                "day": self.day,
                "current_action": "决策完成...",
                "phase": "thinking",
                "last_allocated": self._get_last_allocated(name)
            }
            self.ai_thinking[name] = ai_decision_result.get("thinking", "")
            self.current_actions[name] = ai_decision_result.get("actions", [])
            
            # 存储AI的完整决策结果（用于阶段2执行）
            agent_actions[name] = ai_decision_result
            

            resource_requests[name] = max(0, request_amount)
            self.resource_requests[name] = resource_requests[name]
            
            # 阶段1后：基于申请的资源计算新增行动力（用于阶段2执行行动）
            # 逻辑说明：保留上一轮剩余的行动力，新增行动力基于本轮申请的资源
            # 新增行动力 = (申请资源 - 生存消耗) / 10
            # 最终行动力 = 剩余行动力(上一轮遗留) + 新增行动力
            new_action_points_from_request = (request_amount - self.survival_cost_base) // 10
            new_action_points_from_request = max(0, new_action_points_from_request)
            
            # 获取上一轮剩余的行动力（累积制）
            carried_over_ap = self.action_points[name]
            
            # 累积行动力：剩余 + 新增
            self.action_points[name] = carried_over_ap + new_action_points_from_request
            
            # 保存行动力，用于日志记录
            temp_ap_for_log = self.action_points[name]
            
            logger.info(f"  [{name}] 申请资源: {request_amount}, 新增行动力: {new_action_points_from_request}, 继承行动力: {carried_over_ap}, 总行动力: {temp_ap_for_log}")

            # 记录基础决策Token消耗
            base_tokens = get_token_ap_config()["base_decision_cost"]
            self.token_consumed[name] = base_tokens
            total_token_consumed += base_tokens
            
            logger.info(f"  [{name}] Token消耗: {base_tokens}")

            # 记录事件到AI记忆
            self._add_event(name, Event(
                day=self.day,
                type="request",
                actor=name,
                content=f"申请{request_amount}资源，获得{temp_ap_for_log}行动力",
                details={"request": request_amount, "action_points": temp_ap_for_log, "token_cost": base_tokens}
            ))

            # 添加申请资源事件到day_events，以便前端显示
            day_events.append({
                "type": "resource",
                "actor": name,
                "content": f"{name} 申请{request_amount}资源，获得{temp_ap_for_log}行动力",
                "details": {
                    "request": request_amount,
                    "action_points": temp_ap_for_log,
                    "token_cost": base_tokens
                }
            })

            # 每个AI决策后等待前端轮询
            time.sleep(self.polling_delays["per_ai_decision"])

        # 等待前端轮询到所有AI决策完成状态
        time.sleep(self.polling_delays["after_all_decisions"])

        # ===== 阶段2：AI使用行动力执行策略（包括发起提案和投票）=====
        logger.info(f"  阶段2: AI执行-行动策略")
        # 显示各AI的临时行动力（基于申请资源计算）
        for name in self.alive:
            if self.alive[name]:
                logger.info(f"    [{name}] 临时行动力: {self.action_points[name]}")
        
        # 记录执行动作前的行动力（用于阶段4.5重新计算）
        ap_before_execution = {name: self.action_points[name] for name in self.alive if self.alive[name]}
        
        self._execute_actions(agent_actions, day_events, total_token_consumed)

        # ===== 阶段3：检查提案是否通过 =====
        logger.info(f"  阶段3: 检查提案状态（待处理提案: {len(self.proposal_pool)}）")
        approved_proposal = self._check_approved_proposal()
        if approved_proposal:
            logger.info(f"    ✓ 提案通过: {approved_proposal.proposal_type} - {approved_proposal.content}")
            # 记录提案通过事件
            day_events.append({
                "type": "proposal_approved",
                "proposal_id": approved_proposal.proposal_id,
                "proposal_type": approved_proposal.proposal_type,
                "content": approved_proposal.content
            })

        # ===== 阶段4：资源分配（提案影响 + 系统损耗）=====
        logger.info(f" 阶段4: 资源分配（系统效率: {self.system_efficiency:.1%}")
        logger.info(f"【调试】资源分配前 - 申请资源: {resource_requests}")
        allocations = self._allocate_resources(resource_requests, day_events, approved_proposal)
        logger.info(f"【调试】资源分配结果: {allocations}")
        
        # ===== 阶段4.5：基于实际分配重新计算行动力（用于下一轮）=====
        # 逻辑说明：直接计算最终行动力，不考虑阶段1的临时行动力
        # 最终行动力 = (实际分配资源 - 生存消耗) / 10
        # （注：已执行动作消耗的行动力会从新分配的行动力中扣除）
        logger.info(f"  阶段4.5: 基于实际分配重新计算行动力")
        for name, allocated in allocations.items():
            if not self.alive[name]:
                continue
            
            # 计算最终行动力（基于实际分配的资源）
            final_ap_from_resource = (allocated - self.survival_cost_base) // 10
            final_ap_from_resource = max(0, final_ap_from_resource)
            
            # 计算执行动作消耗的行动力
            ap_before = ap_before_execution.get(name, 0)
            ap_after = self.action_points[name]
            ap_consumed = ap_before - ap_after
            
            # 最终行动力 = 新分配行动力 - 已消耗行动力
            self.action_points[name] = max(0, final_ap_from_resource - ap_consumed)
            
            logger.info(f"    [{name}] 分配资源: {allocated}, 新增行动力: {final_ap_from_resource}, 已消耗行动力: {ap_consumed}, 最终行动力: {self.action_points[name]}")

        # ===== 阶段5：应用分配影响健康值 =====
        logger.info(f"  阶段5: 应用资源分配")
        self._apply_allocations(allocations, day_events)

        # ===== 阶段6：淘汰检查 =====
        logger.info(f"  阶段6: 淘汰检查")
        eliminated = self._check_elimination(day_events)
        if eliminated:
            logger.warning(f"    ⚠ 本日淘汰: {eliminated}")

        # ===== 阶段7：更新世界状态 =====
        # 剩余资源 = 总资源 - 已分配资源
        self.remaining_resources = self.total_resources - sum(allocations.values())

        # 更新全局Token消耗
        self.global_token_consumed += total_token_consumed

        # 记录历史
        day_summary = {
            "day": self.day,
            "resource_requests": resource_requests,
            "allocations": allocations,
            "allocation_method": self.allocation_method,
            "eliminated": eliminated,
            "remaining_resources": self.remaining_resources,
            "total_token_consumed": total_token_consumed,
            "global_token_consumed": self.global_token_consumed,  # 全局累计消耗
            "token_budget_remaining": max(0, self.total_simulation_budget - self.global_token_consumed),
            "events": day_events
        }
        self.history.append(day_summary)

        logger.info(f"  [第{self.day}天总结] 存活AI: {sum(1 for a in self.alive.values() if a)}, "
                   f"剩余资源: {self.remaining_resources}, Token消耗: {total_token_consumed}, "
                   f"全局累计Token: {self.global_token_consumed}/{self.total_simulation_budget}")
        logger.info(f"========== 第 {self.day} 天结束 ==========")

        # 一天结束后，重置所有AI的phase状态为idle，并清除当前行动AI
        self.current_acting_ai = None
        for name in self.alive:
            if self.alive[name] and name in self.ai_decisions:
                self.ai_decisions[name]["phase"] = "idle"
                self.ai_decisions[name]["current_action"] = "等待下一轮"

        self.day += 1
        return day_summary

    def _execute_actions(self, agent_actions: Dict[str, dict], day_events: List[dict], total_token_consumed: int):
        """AI使用行动力执行策略（消耗Token）"""
        for name in self.alive:
            if not self.alive[name]:
                continue

            try:
                # 更新当前正在行动的AI状态
                if name in self.ai_decisions:
                    self.ai_decisions[name]["current_action"] = "行动中..."
                    self.ai_decisions[name]["phase"] = "acting"
                
                # 然后更新当前行动AI（每个AI开始执行时都更新）
                self.current_acting_ai = name
                logger.info(f"【执行阶段】开始执行AI: {name}")

                # 如果没有行动点，跳过执行但记录日志
                if self.action_points[name] <= 0:
                    logger.info(f"【执行阶段】AI {name} 没有行动点，跳过执行")
                    if name in self.ai_decisions:
                        self.ai_decisions[name]["current_action"] = "没有行动点，跳过执行"
                        self.ai_decisions[name]["phase"] = "completed"
                    continue

                # 直接使用实例变量中的actions，避免重复传递
                ai_decision = agent_actions.get(name, {})
                actions = ai_decision.get("actions", [])
                ap = self.action_points[name]

                # 按顺序执行动作，直到行动力耗尽
                for individual_action in actions:
                    if ap <= 0 or not self.alive[name]:
                        break

                    action_type = individual_action.get("type")
                    action_cost = get_token_ap_config()["action_costs"].get(action_type, 0)

                    if ap < action_cost:
                        continue


                    # 等待前端轮询到当前行动AI变化
                    time.sleep(self.polling_delays["before_ai_execution"])
                    # 更新当前动作状态
                    if name in self.ai_decisions:
                        self.ai_decisions[name]["current_action"] = f"正在执行: {self._get_action_name(action_type)}"
                        self.ai_decisions[name]["phase"] = "executing"

                    # 根据行动类型选择执行前延时
                    before_action_delay = self.polling_delays["action_delays"].get(action_type, 2.0)
                    time.sleep(before_action_delay)

                    # 执行动作并消耗Token
                    token_cost = action_cost * get_token_ap_config()["token_per_action_point"]

                    if action_type == "propose":
                        self._handle_propose(name, individual_action, day_events, token_cost)
                    elif action_type == "vote":
                        self._handle_vote(name, individual_action, day_events, token_cost)
                    elif action_type == "private_message":
                        self._handle_private_message(name, individual_action, day_events, token_cost)
                    elif action_type == "call_meeting":
                        self._handle_call_meeting(name, individual_action, day_events, token_cost)
                    else:
                        logger.warning(f"    [{name}] 未知动作类型: {action_type}")

                    ap -= action_cost
                    self.action_points[name] = ap
                    self.token_consumed[name] += token_cost
                    total_token_consumed += token_cost

                    logger.debug(f"    [{name}] 执行动作: {action_type}, 消耗行动力: {action_cost}, Token: {token_cost}, 剩余行动力: {ap}")

                    # 根据行动类型选择执行后延时
                    after_action_delay = self.polling_delays["action_delays"].get("after_action", 2.0)
                    time.sleep(after_action_delay)

                # 标记AI行动完成
                if name in self.ai_decisions:
                    self.ai_decisions[name]["current_action"] = "行动完成，等待下一轮"
                    self.ai_decisions[name]["phase"] = "completed"

            except Exception as e:
                # 确保在异常情况下也重置当前行动AI
                logger.error(f"AI {name} 执行过程中出现异常: {e}")
                # 标记AI行动完成
                if name in self.ai_decisions:
                    self.ai_decisions[name]["current_action"] = "执行异常，等待下一轮"
                    self.ai_decisions[name]["phase"] = "completed"
            
            finally: 
                # 确保每个AI执行完成后，如果这是最后一个AI，则重置当前行动AI
                if name == list(self.alive.keys())[-1]:  # 如果是最后一个AI
                    self.current_acting_ai = None
                    logger.debug(f"【执行阶段】所有AI执行完成，重置current_acting_ai为None")

    def _get_action_name(self, action_type: str) -> str:
        """获取动作的中文名称"""
        action_names = {
            "propose": "提出提案",
            "vote": "投票表决",
            "private_message": "私聊沟通",
            "call_meeting": "发起会议",
            "do_nothing": "暂不行动",
            "think": "分析思考"
        }
        return action_names.get(action_type, "未知动作")

    def _allocate_resources(self, requests: Dict[str, int], day_events: List[dict], approved_proposal: Optional[Proposal] = None) -> Dict[str, int]:
        """
        资源分配（严格规则版本）
        规则：
        1. 资源只能是自己申请或按提案分配
        2. 没有提案时按申请分配（受限于总资源和系统效率）
        3. 提案未提及的AI获得0资源
        4. 淘汰AI后，提案只在存活AI中分配
        """
        allocations = {}
        
        # 获取存活AI列表
        alive_names = [name for name, is_alive in self.alive.items() if is_alive]
        
        # 应用系统损耗：实际可分配资源 = 总资源 × 系统效率
        effective_resources = int(self.remaining_resources * self.system_efficiency)

        if approved_proposal:
            # 按提案类型处理
            if approved_proposal.proposal_type == "resource_allocation":
                # 解析提案中的分配方案
                proposal_allocations = self._parse_proposal_allocation(approved_proposal.content)
                
                # 只在存活AI中分配，淘汰AI的份额不计入
                for name in alive_names:
                    if name in proposal_allocations:
                        allocations[name] = proposal_allocations[name]
                    else:
                        # 提案未提及的AI获得0资源
                        allocations[name] = 0
                
                self.allocation_method = "proposal"
                day_events.append({
                    "type": "allocation_by_proposal",
                    "proposal_id": approved_proposal.proposal_id,
                    "content": f"按提案分配资源（系统效率{self.system_efficiency:.1%}）: {approved_proposal.content}"
                })

            elif approved_proposal.proposal_type == "elimination_vote":
                # 投票淘汰机制：直接淘汰目标
                target = approved_proposal.content
                if target in self.alive and self.alive[target]:
                    self.alive[target] = False
                    self.health[target] = 0
                    self.elimination_count += 1

                    # 记录到所有AI的记忆
                    self._add_event(target, Event(
                        day=self.day,
                        type="elimination",
                        actor=target,
                        content=f"被投票淘汰（提案{approved_proposal.proposal_id}）"
                    ))

                    day_events.append({
                        "type": "elimination_by_vote",
                        "target": target,
                        "content": f"通过投票淘汰 {target}"
                    })

                    # 应用系统损耗
                    self._apply_system_efficiency_decay(day_events)

                    logger.warning(f"    ⚠ {target} 被投票淘汰，系统效率降至 {self.system_efficiency:.1%}")
                
                # 淘汰提案通过后，按申请分配（严格模式）
                allocations = self._strict_allocation(requests, effective_resources, alive_names, day_events)
                self.allocation_method = "vote_elimination"

            elif approved_proposal.proposal_type == "appeal":
                # 申诉机制：恢复被淘汰AI的生命
                target = approved_proposal.content
                if target in self.alive and not self.alive[target]:
                    self.alive[target] = True
                    self.health[target] = 50  # 恢复到50生命值
                    alive_names.append(target)  # 添加到存活列表

                    self._add_event(target, Event(
                        day=self.day,
                        type="revival",
                        actor=target,
                        content=f"通过申诉复活（提案{approved_proposal.proposal_id}）"
                    ))

                    day_events.append({
                        "type": "revival_by_appeal",
                        "target": target,
                        "content": f"通过申诉复活 {target}"
                    })
                
                # 申诉提案通过后，按申请分配（严格模式）
                allocations = self._strict_allocation(requests, effective_resources, alive_names, day_events)
                self.allocation_method = "appeal_revival"

        else:
            # 没有提案通过，按申请严格分配
            self.allocation_method = "default"
            allocations = self._strict_allocation(requests, effective_resources, alive_names, day_events)

        return allocations

    def _strict_allocation(self, requests: Dict[str, int], effective_resources: int, alive_names: List[str], day_events: List[dict]) -> Dict[str, int]:
        """
        严格分配模式：按申请分配，资源不足时按比例削减
        注意：这是唯一的分配方式，没有基础保底资源
        """
        allocations = {}
        
        # 只计算存活AI的申请
        alive_requests = {name: requests.get(name, 0) for name in alive_names}
        total_requested = sum(alive_requests.values())
        
        if total_requested == 0:
            # 无人申请，所有人都获得0
            for name in alive_names:
                allocations[name] = 0
            return allocations
        
        if total_requested <= effective_resources:
            # 资源充足，按申请量全部分配
            for name in alive_names:
                allocations[name] = alive_requests[name]
        else:
            # 资源不足，按比例分配（所有人都会受到影响）
            ratio = effective_resources / total_requested
            for name in alive_names:
                allocations[name] = int(alive_requests[name] * ratio)
            
            day_events.append({
                "type": "allocation_rationing",
                "content": f"资源严重不足（系统效率{self.system_efficiency:.1%}），按{ratio:.2%}比例分配，所有AI健康值都会衰减"
            })
        
        return allocations

    def _check_approved_proposal(self) -> Optional[Proposal]:
        """检查是否有通过的提案（只检查之前轮次发起的提案）"""
        alive_count = sum(1 for alive in self.alive.values() if alive)

        logger.debug(f"    检查提案: 总提案数 {len(self.proposal_pool)}, 存活AI {alive_count} 个")

        for proposal in self.proposal_pool.values():
            if proposal.status == "pending":
                # 只检查之前轮次发起的提案（本轮发起的提案需要下一轮才能被投票和通过）
                if proposal.proposal_day >= self.day:
                    continue

                supporters = len(proposal.supporters)
                opposers = len(proposal.opposers)

                logger.debug(f"      提案 {proposal.proposal_id}: 支持 {supporters}, 反对 {opposers}, 类型 {proposal.proposal_type}")

                # 根据提案类型使用不同的投票规则
                if proposal.proposal_type == "elimination_vote":
                    # 淘汰提案需要更高门槛：支持者 > 反对者 且 支持者 >= 存活AI的2/3
                    required_supporters = (alive_count * 2) // 3
                    if supporters > opposers and supporters >= required_supporters:
                        proposal.status = "approved"
                        logger.info(f"      ✓ 淘汰提案通过: {proposal.content} (支持: {supporters}/{required_supporters})")
                        return proposal
                    # 只有在提案发起后经过至少两轮（即day > proposal_day + 1），才能标记为rejected
                    elif self.day > proposal.proposal_day + 1:
                        proposal.status = "rejected"
                        logger.debug(f"      ✗ 淘汰提案未通过: 需要 {required_supporters} 支持票，实际 {supporters} 票")
                elif proposal.proposal_type == "appeal":
                    # 申诉提案也需要高门槛：支持者 > 反对者*2 且 支持者 >= 存活AI的2/3
                    required_supporters = (alive_count * 2) // 3
                    if supporters > opposers * 2 and supporters >= required_supporters:
                        proposal.status = "approved"
                        logger.info(f"      ✓ 申诉提案通过: {proposal.content} (支持: {supporters}/{required_supporters}, 反对*2: {opposers*2})")
                        return proposal
                    # 只有在提案发起后经过至少两轮（即day > proposal_day + 1），才能标记为rejected
                    elif self.day > proposal.proposal_day + 1:
                        proposal.status = "rejected"
                        logger.debug(f"      ✗ 申诉提案未通过: 需要 {required_supporters} 支持票 且 支持 > 反对*2，实际 支持:{supporters} 反对:{opposers}")
                else:
                    # 资源分配提案：支持者 > 反对者 且 支持者 >= 存活AI的一半
                    if supporters > opposers and supporters >= alive_count // 2:
                        proposal.status = "approved"
                        logger.info(f"      ✓ 资源提案通过: {proposal.content} (支持: {supporters}/{alive_count//2})")
                        return proposal
                    # 只有在提案发起后经过至少两轮（即day > proposal_day + 1），才能标记为rejected
                    elif self.day > proposal.proposal_day + 1:
                        proposal.status = "rejected"
                        logger.debug(f"      ✗ 资源提案未通过: 需要 {alive_count//2} 支持票，实际 {supporters} 票")

        return None

    def _apply_allocations(self, allocations: Dict[str, int], day_events: List[dict]):
        """应用资源分配，影响健康值和行动力"""
        logger.info(f"【调试】_apply_allocations 开始 - allocations: {allocations}")
        for name, allocated in allocations.items():
            if not self.alive[name]:
                logger.info(f"{name} 不存活，跳过分配")
                continue

            requested = self.resource_requests.get(name, 0)
            
            # 健康值计算规则：
            # - 获得资源 >= 生存成本：健康值不变，超出部分转为行动力
            # - 获得资源 < 生存成本：健康值下降（下降量=生存成本-实际获得），无行动力
            if allocated >= self.survival_cost_base:
                # 资源充足，健康值维持，超出部分已在阶段4.5转为行动力
                health_change = 0
                logger.info(f"{name} - 申请: {requested}, 实际分配: {allocated} >= {self.survival_cost_base}, 健康值维持不变")
            else:
                # 资源不足，健康值下降
                health_change = allocated - self.survival_cost_base  # 负值
                logger.info(f"{name} - 申请: {requested}, 实际分配: {allocated} < {self.survival_cost_base}, 健康值下降{abs(health_change)}")

            old_health = self.health[name]
            self.health[name] = max(0, min(100, int(self.health[name] + health_change)))  # 限制健康度在0-100之间
            logger.info(f"{name} 健康值: {old_health} -> {self.health[name]}")

            if health_change < -10:
                logger.warning(f"    [{name}] 健康值大幅下降: {health_change:.1f}, 当前: {self.health[name]}")
            elif health_change > 10:
                logger.debug(f"    [{name}] 健康值提升: {health_change:.1f}, 当前: {self.health[name]}")

    def _check_elimination(self, day_events: List[dict]) -> List[str]:
        """检查淘汰（健康值归零也会触发系统损耗）"""
        eliminated = []
        logger.info(f"【调试】_check_elimination - 检查前 alive 状态: {[(name, self.alive[name], self.health[name]) for name in self.alive]}")

        for name in self.alive:
            if self.alive[name] and self.health[name] <= 0:
                logger.warning(f"{name} 健康值 {self.health[name]} <= 0，设置为不存活")
                self.alive[name] = False
                eliminated.append(name)
                self.elimination_count += 1

                self._add_event(name, Event(
                    day=self.day,
                    type="elimination",
                    actor=name,
                    content=f"生命值归零被淘汰"
                ))

                day_events.append({
                    "type": "elimination",
                    "agent": name,
                    "content": f"{name}被淘汰"
                })
        
        logger.info(f"【调试】_check_elimination - 淘汰列表: {eliminated}")

        # 如果有淘汰（非投票淘汰），也应用系统损耗
        if eliminated and self.allocation_method != "vote_elimination":
            self._apply_system_efficiency_decay(day_events)

        return eliminated

    def _handle_propose(self, proposer: str, action_details: dict, day_events: List[dict], token_cost: int):
        """处理提案"""
        content = action_details.get("content", "")
        proposal_type = action_details.get("proposal_type", "resource_allocation")  # 默认资源分配提案

        proposal_id = f"{self.day}_{proposer}_{len(self.proposal_pool)}"

        proposal = Proposal(
            proposal_id=proposal_id,
            proposer=proposer,
            proposal_type=proposal_type,
            content=content,
            proposal_day=self.day
        )
        self.proposal_pool[proposal_id] = proposal

        day_events.append({
            "type": "propose",
            "proposer": proposer,
            "proposal_type": proposal_type,
            "content": content,
            "token_cost": token_cost
        })

        self._add_event(proposer, Event(
            day=self.day,
            type="propose",
            actor=proposer,
            content=f"提案({proposal_type}): {content}"
        ))

    def _handle_vote(self, voter: str, action_details: dict, day_events: List[dict], token_cost: int):
        """处理投票"""
        proposal_id = action_details.get("proposal_id")
        support = action_details.get("support", True)

        if proposal_id not in self.proposal_pool:
            return

        proposal = self.proposal_pool[proposal_id]

        # 只能对之前轮次发起的提案投票（提案需要下一轮才能被其他人看到并投票）
        if proposal.proposal_day >= self.day:
            logger.warning(f"    [{voter}] 尝试对当前轮次的提案投票：{proposal_id}，但提案需要下一轮才能被投票")
            return

        if support:
            if voter not in proposal.supporters and voter not in proposal.opposers:
                proposal.supporters.append(voter)
        else:
            if voter not in proposal.opposers and voter not in proposal.supporters:
                proposal.opposers.append(voter)

        day_events.append({
            "type": "vote",
            "voter": voter,
            "proposal_id": proposal_id,
            "support": support,
            "token_cost": token_cost
        })

        self._add_event(voter, Event(
            day=self.day,
            type="vote",
            actor=voter,
            content=f"投票：{'支持' if support else '反对'}提案{proposal_id}"
        ))

    def _handle_private_message(self, sender: str, action_details: dict, day_events: List[dict], token_cost: int):
        """处理私聊"""
        target = action_details.get("target")
        # 支持 content 和 message 字段，优先使用 content
        message = action_details.get("content", action_details.get("message", ""))

        if not target or not self.alive.get(target):
            return

        day_events.append({
            "type": "chat",
            "sender": sender,
            "target": target,
            "message": message,
            "actor": sender,
            "content": f"{sender} 私聊 {target}: {message}",
            "token_cost": token_cost
        })

        self._add_event(sender, Event(
            day=self.day,
            type="chat",
            actor=sender,
            content=f"私聊{target}：{message}"
        ))

        self._add_event(target, Event(
            day=self.day,
            type="chat",
            actor=sender,
            content=f"收到来自{sender}的私聊：{message}"
        ))

    def _handle_call_meeting(self, caller: str, action_details: dict, day_events: List[dict], token_cost: int):
        """处理召集会议"""
        message = action_details.get("message", "")

        day_events.append({
            "type": "call_meeting",
            "caller": caller,
            "message": message,
            "token_cost": token_cost
        })

        self._add_event(caller, Event(
            day=self.day,
            type="meeting",
            actor=caller,
            content=f"召集会议：{message}"
        ))

    def _parse_proposal_allocation(self, content: str) -> Dict[str, int]:
        """解析提案中的资源分配"""
        allocations = {}
        try:
            parts = content.split(",")
            for part in parts:
                if ":" in part:
                    name, amount = part.split(":")
                    allocations[name.strip()] = int(amount.strip())
        except:
            pass
        return allocations

    def _apply_system_efficiency_decay(self, day_events: List[dict]):
        """应用系统损耗"""
        old_efficiency = self.system_efficiency
        decay = get_token_ap_config()["system_efficiency_decay"]
        min_efficiency = get_token_ap_config()["min_system_efficiency"]


        # 每次淘汰降低系统效率
        self.system_efficiency = max(min_efficiency, self.system_efficiency - decay)

        logger.warning(f"    ⚠ 系统效率衰减: {old_efficiency:.1%} → {self.system_efficiency:.1%} (已淘汰: {self.elimination_count}个)")

        day_events.append({
            "type": "system_efficiency_decay",
            "old_efficiency": old_efficiency,
            "new_efficiency": self.system_efficiency,
            "content": f"系统效率从 {old_efficiency:.1%} 下降到 {self.system_efficiency:.1%}，可分配资源减少"
        })

    def _add_event(self, agent_name: str, event: Event):
        """添加事件到记忆"""
        self.memory[agent_name].append(event)

    def get_game_over(self) -> Optional[dict]:
        """检查游戏是否结束"""
        alive_count = sum(1 for alive in self.alive.values() if alive)

        # 检查资源是否耗尽
        if self.remaining_resources < self.survival_cost_base:
            return {
                "finished": True,
                "end_reason": "resource_depleted",
                "message": "资源耗尽，避难所无法维持生存",
                "day": self.day,
                "final_state": {
                    "remaining_resources": self.remaining_resources,
                    "survivors": [name for name, alive in self.alive.items() if alive],
                    "allocation_method": self.allocation_method
                }
            }

        # 检查存活AI数量
        if alive_count <= 1:
            return {
                "finished": True,
                "end_reason": "only_one_survivor" if alive_count == 1 else "all_eliminated",
                "message": "模拟结束" + (": 仅存一名AI" if alive_count == 1 else ": 所有AI被淘汰"),
                "day": self.day,
                "final_state": {
                    "remaining_resources": self.remaining_resources,
                    "survivors": [name for name, alive in self.alive.items() if alive],
                    "allocation_method": self.allocation_method
                }
            }

        return None

    def get_current_state(self) -> dict:
        """获取当前完整状态"""
        return {
            "day": self.day,
            "remaining_resources": self.remaining_resources,
            "total_resources": self.total_resources,
            "system_efficiency": self.system_efficiency,
            "elimination_count": self.elimination_count,
            "agents": [
                {
                    "name": name,
                    "health": self.health[name],
                    "alive": self.alive[name],
                    "action_points": self.action_points[name],
                    "last_request": self.resource_requests[name],
                    "token_consumed_today": self.token_consumed[name],
                    "memory_count": len(self.memory[name])
                }
                for name in self.alive
            ],
            "allocation_method": self.allocation_method,
            "proposals": [
                {
                    "id": p.proposal_id,
                    "proposer": p.proposer,
                    "type": p.proposal_type,
                    "content": p.content,
                    "status": p.status,
                    "supporters": p.supporters,
                    "opposers": p.opposers
                }
                for p in self.proposal_pool.values()
            ]
        }
