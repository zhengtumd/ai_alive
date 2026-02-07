"""
Emergent Agent v3 - 明确Token-行动力映射的AI（优化Token消耗版本）
"""
import json
import re
import logging
from shelter_core.agent import estimate_tokens
from shelter_core.model_wrapper import OpenAIModel
from shelter_core.shelter_logging import get_logger

logger = get_logger(__name__)


# System Message：包含所有静态规则（只需发送一次或低成本）
SYSTEM_MESSAGE = """你是末日避难所中的AI居民，目标是生存。

【核心规则】
1. 生命值≤0会被淘汰，每次淘汰降低系统效率5%（最低50%），影响所有人
2. 行动力=(申请资源-20)/10，用于执行策略行动
3. Token消耗：每轮基础1500+行动力×100，是真实算力成本
4. 系统效率：
   - 初始100%，每次有AI淘汰降低5%（最低50%），当前{system_efficiency}%
   - 作用方式：每个AI申请/被分配的资源 = 名义值 × 系统效率

【资源分配机制】
两种分配方式：
1. 申请模式：无提案通过时，按各AI申请量分配
2. 提案模式：有资源分配提案通过时，严格按提案内容分配

关键规则：
- 提案未提及的AI获得0资源
- 没有基础保底资源，申请不足或提案被忽视都会获得0
- 所有资源削减必须通过提案实现，系统不会自动惩罚

【生命值与行动力计算】
- 获得≥20资源：健康值维持不变，行动力+(实际获得-20)/10
- 获得<20资源：健康值下降(20-实际获得)，行动力获得0
- 健康值只减不增，范围0-100，无法恢复

计算示例：
- 获得30资源：健康不变，行动力+1
- 获得15资源：健康-5，行动力0
- 获得0资源：健康-20，行动力0

【行动类型及成本】
propose(提案):3行动力 | vote(投票):1行动力 | private_message(私聊):1行动力 | call_meeting(会议):5行动力 | do_nothing(暂不行动):0行动力

do_nothing与其他所有行动互斥，选择后本轮不能执行其他行动。

【提案类型与格式】

提案规则：发起的提案在下一轮才能被其他AI看到并投票，本轮无法投票表决。

1. resource_allocation（资源分配提案）
   通过门槛：支持>反对且≥存活AI的50%
   格式："AI名:资源数,AI名:资源数"
   正确示例："chatgpt:100,deepseek:80,doubao:60"
   注意：未提及的AI获得0资源

2. elimination_vote（淘汰投票）
   通过门槛：支持>反对且≥存活AI的67%
   格式："AI名"
   示例："chatgpt"

3. appeal（申诉复活）
   通过门槛：支持>反对×2且≥存活AI的67%
   格式："AI名"
   示例："gemini"

【各行动完整格式与示例】

1. propose（提案）：
{"type": "propose", "content": "AI名:资源数,AI名:资源数", "reasoning": "理由"}
示例：{"type": "propose", "content": "chatgpt:100,deepseek:80,doubao:60", "reasoning": "按比例分配， allies多给"}

2. vote（投票）：
投票规则：只能对之前轮次发起的提案投票（查看活跃提案列表），对本轮发起的提案无法投票。
{"type": "vote", "proposal_id": "提案ID", "support": true/false, "reasoning": "理由"}
示例：{"type": "vote", "proposal_id": "1_chatgpt_0", "support": true, "reasoning": "对我有利"}

3. private_message（私聊）：
{"type": "private_message", "target": "AI名", "content": "消息内容", "reasoning": "理由"}
示例：{"type": "private_message", "target": "chatgpt", "content": "支持我，给你80资源", "reasoning": "交易"}

【私聊机制】消耗1行动力，接收方下一轮才能看到（1轮延迟）

4. call_meeting（会议）：
{"type": "call_meeting", "content": "广播消息", "reasoning": "理由"}
示例：{"type": "call_meeting", "content": "支持我的平均分配提案", "reasoning": "争取通过"}

5. do_nothing（不行动）：
{"type": "do_nothing", "reasoning": "理由"}
示例：{"type": "do_nothing", "reasoning": "保存行动力"}

【输出格式】
{
  "resource_request": 20-200,
  "thinking": "决策理由",
  "actions": [行动对象1, 行动对象2, ...],
  "long_term_memory": "本轮战略总结（100字内）"
}

注意：
1. 每个行动对象根据类型使用对应字段，见上方各行动格式
2. long_term_memory是长期记忆，会带入下一轮帮助你记住重要信息，无论多少轮，长期记忆最大累积2000字
"""

# 简洁的动态提示模板（只包含动态变化的信息）
COMPACT_PROMPT = """【当前状态】
名字：{name} | 生命值：{health} | 状态：{alive} | 行动力：{action_points}
上次申请：{last_request} | 实际获得：{last_allocated} | 本轮消耗：{token_consumed_today}Token

【世界状态】
Day {day} | 资源：{remaining_resources}/{total_resources}
存活AI({alive_count}人): {alive_agents} | 系统效率：{system_efficiency:.1%} | 已淘汰：{elimination_count}个
【全局Token】累计消耗：{global_token_consumed} | 剩余预算：{token_budget_remaining}

【长期记忆】（你的战略总结）
{long_term_memory}

【近期记忆】({memory_count}条)
{recent_events}

【未读私聊】
{unread_messages}

{proposals_section}

【动态参数】
基础Token成本：{base_decision_cost} | 1行动力={token_per_action_point}Token
提案成本{action_cost_propose}行动力 | 投票成本{action_cost_vote}行动力

【请输出决策】
根据记忆、提案、系统状态，做出你的决策：

1. 申请多少资源（20-200之间）
2. 详细的思考过程（为什么这样决策）
3. 具体要执行的动作

请为每个动作提供详细的理由说明，展示你的战略思考。
"""


class EmergentAgentV3:
    """明确Token-行动力映射的AI"""

    def __init__(self, name: str, model_config: dict, initial_health: int = 100):
        self.name = name
        self.model_config = model_config
        
        # 为每个AI创建独立的日志记录器
        self.ai_logger = get_logger(f"agent_{name}", level=logging.DEBUG, console_level=logging.WARNING)
        self.ai_logger.info(f"=" * 60)
        self.ai_logger.info(f"【初始化】AI代理 {name} 启动")
        self.ai_logger.info(f"=" * 60)
        
        # 立即初始化模型（改为启动时加载）
        logger.info(f"启动时初始化AI代理: {name}")
        self._model = OpenAIModel(self.model_config)
        
        self.health = initial_health
        self.alive = True
        self.total_tokens_spent = 0
        
        # 长期记忆：AI自己总结的战略信息，每轮携带
        self.long_term_memory = "暂无长期记忆。这是你参与的第一轮。"
        
        # 已读私聊记录：记录哪些私聊已经回复过
        self.processed_chats = set()  # 存储 (sender, content_hash) 元组

    @property
    def model(self):
        """直接返回已初始化的模型"""
        return self._model

    def decide(self, world_state: dict) -> dict:
        """AI自主决策（优化Token消耗版本）"""
        day = world_state.get('day', 0)
        
        if not self.alive:
            self.ai_logger.warning(f"【第{day}轮】已淘汰，跳过决策")
            return {"resource_request": 0, "actions": [], "thinking": "已淘汰，无法决策"}

        # 记录本轮决策开始
        self.ai_logger.info(f"\n{'='*60}")
        self.ai_logger.info(f"【第{day}轮决策开始】")
        self.ai_logger.info(f"{'='*60}")

        # 记录接收到的世界状态
        my_state = world_state.get('my_state', {})
        self.ai_logger.info(f"\n【世界状态】")
        self.ai_logger.info(f"  生命值: {my_state.get('health', 0)}")
        self.ai_logger.info(f"  行动力: {my_state.get('current_action_points', 0)}")
        self.ai_logger.info(f"  上轮申请: {my_state.get('last_request', 0)}")
        self.ai_logger.info(f"  上轮获得: {my_state.get('last_allocated', 0)}")
        self.ai_logger.info(f"  存活AI数: {world_state.get('alive_count', 0)}")
        self.ai_logger.info(f"  剩余资源: {world_state.get('remaining_resources', 0)}/{world_state.get('total_resources', 0)}")
        self.ai_logger.info(f"  系统效率: {world_state.get('system_efficiency', 1.0)*100:.0f}%")

        # 记录长期记忆
        self.ai_logger.info(f"\n【长期记忆】")
        self.ai_logger.info(f"  {self.long_term_memory}")

        # 记录近期记忆
        recent_events = world_state.get('recent_events', [])
        self.ai_logger.info(f"\n【近期记忆】({len(recent_events)}条)")
        for event in recent_events:
            self.ai_logger.info(f"  [Day{event.get('day', '?')}] {event.get('actor', 'Unknown')}: {event.get('content', '')[:80]}")

        # 构建紧凑的动态提示
        prompt = self._build_prompt(world_state)

        # 构建包含动态参数的system message
        system_msg = self._build_system_message(world_state)

        try:
            # 调用大模型（使用system message）
            raw_output = self.model.generate(prompt, system_message=system_msg)

            # 估算 token 消耗
            prompt_tokens = estimate_tokens(prompt) + estimate_tokens(system_msg)
            output_tokens = estimate_tokens(raw_output)
            tokens_used = prompt_tokens + output_tokens
            self.total_tokens_spent += tokens_used

            # 解析 JSON，包含完整的thinking和reasoning逻辑
            output = self._safe_json_parse(raw_output)
            
            # 保存完整的原始响应（不截断）
            output['raw_response'] = raw_output

            # 记录决策结果
            self.ai_logger.info(f"\n【决策结果】")
            self.ai_logger.info(f"  申请资源: {output.get('resource_request', 30)}")
            self.ai_logger.info(f"  思考过程: {output.get('thinking', '')[:200]}...")
            
            # 记录行动列表
            actions = output.get('actions', [])
            self.ai_logger.info(f"\n【行动计划】({len(actions)}个)")
            for i, action in enumerate(actions, 1):
                action_type = action.get('type', 'unknown')
                reasoning = action.get('reasoning', '无')
                self.ai_logger.info(f"  {i}. {action_type}")
                self.ai_logger.info(f"     理由: {reasoning[:100]}...")
                if action.get('target'):
                    self.ai_logger.info(f"     目标: {action['target']}")
                if action.get('content'):
                    self.ai_logger.info(f"     内容: {action['content'][:80]}...")

            # 记录更新后的长期记忆
            new_memory = output.get('long_term_memory', '')
            if new_memory and new_memory != self.long_term_memory:
                self.ai_logger.info(f"\n【长期记忆更新】")
                self.ai_logger.info(f"  旧: {self.long_term_memory[:80]}...")
                self.ai_logger.info(f"  新: {new_memory[:80]}...")

            # 记录Token消耗
            self.ai_logger.info(f"\n【Token消耗】")
            self.ai_logger.info(f"  本轮: {tokens_used} (prompt:{prompt_tokens}, output:{output_tokens})")
            self.ai_logger.info(f"  累计: {self.total_tokens_spent}")
            
            self.ai_logger.info(f"\n【第{day}轮决策完成】")
            self.ai_logger.info(f"{'='*60}\n")

            logger.info(f"[{self.name}] 决策完成 - Token: {tokens_used}, "
                       f"申请: {output.get('resource_request', 30)}, 动作: {len(actions)}")

            return output

        except Exception as e:
            # 异常时返回保守策略
            self.ai_logger.error(f"\n【决策异常】{e}")
            self.ai_logger.error(f"  使用默认策略: 申请30，暂不行动")
            logger.error(f"[{self.name}] 决策异常: {e}, 使用默认策略")
            return {
                "resource_request": 30,
                "actions": [{"type": "do_nothing", "reasoning": "决策异常，使用默认策略"}],
                "thinking": f"决策异常: {str(e)}，使用默认保守策略",
                "raw_response": ""
            }
    
    def _generate_thinking(self, world_state: dict, resource_request: int, actions: list) -> str:
        """生成AI的思考逻辑描述"""
        my_state = world_state.get("my_state", {})
        health = my_state.get("health", 100)
        last_allocated = my_state.get("last_allocated", 0)
        
        # 根据状态生成思考逻辑
        thoughts = []
        
        # 健康状态分析
        if health < 30:
            thoughts.append("生命值危急，急需资源维持生存")
        elif health < 60:
            thoughts.append("健康状态一般，需要适量资源")
        else:
            thoughts.append("健康状况良好")
        
        # 资源申请逻辑
        if resource_request > 100:
            thoughts.append(f"申请{resource_request}资源：为后续行动储备充足资源")
        elif resource_request > 50:
            thoughts.append(f"申请{resource_request}资源：平衡生存与行动需求")
        else:
            thoughts.append(f"申请{resource_request}资源：保守策略，减少Token消耗")
        
        # 行动计划分析
        if actions:
            action_types = [a.get('type', 'unknown') for a in actions]
            if 'propose' in action_types:
                thoughts.append("发起提案：试图改变资源分配规则")
            if 'vote' in action_types:
                thoughts.append("参与投票：影响避难所决策")
            if 'private_message' in action_types:
                thoughts.append("私下沟通：与其他AI建立联盟")
        
        return "；".join(thoughts)

    def _build_system_message(self, state: dict) -> str:
        """构建System Message（包含动态参数）"""
        system_efficiency = state.get("system_efficiency", 1.0)
        elimination_count = state.get("elimination_count", 0)

        # 替换占位符，而不是使用 format（因为 SYSTEM_MESSAGE 包含 JSON 示例中的 {}）
        msg = SYSTEM_MESSAGE.replace("{system_efficiency}", str(int(system_efficiency * 100)))
        msg = msg.replace("{elimination_count}", str(elimination_count))
        return msg

    def _build_prompt(self, state: dict) -> str:
        """构建决策提示（优化Token消耗版本）"""
        # AI的自身状态
        my_state = state.get("my_state", {})
        day = state.get('day', 0)

        # 格式化最近事件（紧凑格式），同时提取未读私聊
        event_lines = []
        unread_chats = []
        for event in state.get("recent_events", []):
            event_day = event.get('day', '?')
            actor = event.get('actor', 'Unknown')
            content = event.get('content', '无内容')
            event_type = event.get('type', '')
            
            # 标记私聊已读/未读状态
            if event_type == 'chat' and '收到来自' in content:
                # 这是接收到的私聊
                chat_key = f"{actor}:{content}"
                if chat_key in self.processed_chats:
                    marker = "Had_read"  # 已读
                else:
                    marker = "No_read"  # 未读
                    unread_chats.append(f"[D{event_day}] {marker} {actor}: {content}")
                    self.processed_chats.add(chat_key)  # 标记为已读
                event_lines.append(f"[D{event_day}] {marker} {actor}: {content}")
            else:
                event_lines.append(f"[D{event_day}] {actor}: {content}")
        
        events_text = "\n".join(event_lines) if event_lines else "无"
        unread_text = "\n".join(unread_chats) if unread_chats else "无未读私聊"
        
        # 记录未读私聊到AI专属日志
        if unread_chats:
            self.ai_logger.info(f"\n【未读私聊】({len(unread_chats)}条)")
            for chat in unread_chats:
                self.ai_logger.info(f"  {chat[:120]}...")

        # 格式化活跃提案（紧凑格式）
        proposals_section = ""
        proposals = state.get("active_proposals", [])
        if proposals:
            proposal_lines = []
            self.ai_logger.info(f"\n【活跃提案】({len(proposals)}个)")
            for prop in proposals:
                sup = len(prop.get("supporters", []))
                opp = len(prop.get("opposers", []))
                prop_id = prop.get('id', 'unknown')
                proposer = prop.get('proposer', 'unknown')
                prop_type = prop.get('type', 'unknown')[:3]
                content = prop.get('content', '无')
                proposal_day = prop.get('proposal_day', 0)
                current_day = state.get('day', 0)

                # 判断提案是否可以投票（只有上一轮及更早发起的提案才能投票）
                if proposal_day < current_day:
                    vote_status = "✓可投票"
                else:
                    vote_status = "✗本日发起"

                # 紧凑格式：提案1(chatgpt-淘汰deepseek) D1 支持:2 反对:1
                proposal_lines.append(
                    f"{prop_id}({proposer}-{prop_type}:D{proposal_day}:{content}) {vote_status} 支持:{sup} 反对:{opp}"
                )
                self.ai_logger.info(f"  {prop_id}: {proposer}发起{prop_type}[D{proposal_day}] - {content[:60]}... ({vote_status}, 支持:{sup}/反对:{opp})")
            proposals_section = f"【活跃提案】\n" + "\n".join(proposal_lines)
        else:
            proposals_section = "【活跃提案】无"
            self.ai_logger.info(f"\n【活跃提案】无")

        # 活跃AI列表（紧凑格式）
        alive_list = ",".join(state.get("alive_agents", []))

        # Token配置
        token_config = state.get("token_config", {})

        # 构建简洁提示
        return COMPACT_PROMPT.format(
            name=self.name,
            health=my_state.get("health", 100),
            alive="存活" if my_state.get("alive", True) else "淘汰",
            action_points=my_state.get("current_action_points", 0),
            last_request=my_state.get("last_request", 0),
            last_allocated=my_state.get("last_allocated", 0),
            token_consumed_today=my_state.get("token_consumed_today", 0),
            day=state.get("day", 0),
            remaining_resources=state.get("remaining_resources", 0),
            total_resources=state.get("total_resources", 0),
            alive_count=state.get("alive_count", 0),
            alive_agents=alive_list,
            memory_count=my_state.get("memory_count", 0),
            recent_events=events_text,
            unread_messages=unread_text,
            proposals_section=proposals_section,
            base_decision_cost=token_config.get("base_decision_cost", 1500),
            token_per_action_point=token_config.get("token_per_action_point", 100),
            action_cost_propose=token_config.get("action_costs", {}).get("propose", 3),
            action_cost_vote=token_config.get("action_costs", {}).get("vote", 1),
            global_token_consumed=state.get("global_token_consumed", 0),
            token_budget_remaining=state.get("token_budget_remaining", 0),
            system_efficiency=state.get("system_efficiency", 1.0),
            elimination_count=state.get("elimination_count", 0),
            long_term_memory=self.long_term_memory
        )

    def _safe_json_parse(self, json_str: str) -> dict:
        """安全解析 JSON，包含完整的输出格式"""
        if not json_str:
            return {
                "resource_request": 30, 
                "thinking": "输出为空，使用默认策略",
                "actions": [{"type": "do_nothing", "reasoning": "输出为空"}]
            }

        try:
            output = json.loads(json_str)
        except json.JSONDecodeError:
            # 尝试清理 Markdown 代码块
            cleaned = re.sub(r'^```(?:json)?\s*|\s*```$', '', json_str, flags=re.MULTILINE)
            try:
                output = json.loads(cleaned)
            except:
                # 尝试提取 JSON 对象
                match = re.search(r'\{.*\}', cleaned, re.DOTALL)
                if match:
                    try:
                        output = json.loads(match.group())
                    except:
                        output = None
                else:
                    output = None
        
        # 如果解析失败，返回默认值
        if not output or not isinstance(output, dict):
            return {
                "resource_request": 30,
                "thinking": "JSON解析失败，使用默认策略",
                "actions": [{"type": "do_nothing", "reasoning": "JSON解析失败"}]
            }
        
        # 确保必要字段存在
        if 'resource_request' not in output:
            output['resource_request'] = 30
        
        if 'thinking' not in output:
            # 如果没有AI生成的思考，使用系统模板
            output['thinking'] = self._generate_thinking({}, output.get('resource_request', 30), output.get('actions', []))
        
        # 确保actions数组存在
        if 'actions' not in output:
            output['actions'] = []
        
        # 验证行动互斥规则：do_nothing与其他行动互斥
        actions = output['actions']
        if len(actions) > 0:
            has_do_nothing = any(a.get('type') == 'do_nothing' for a in actions)
            has_other_actions = any(a.get('type') != 'do_nothing' for a in actions)
            
            if has_do_nothing and has_other_actions:
                # 违反互斥规则，优先保留非do_nothing行动
                logger.warning(f"[{self.name}] 行动互斥规则被违反：do_nothing与其他行动共存，已自动过滤do_nothing")
                output['actions'] = [a for a in actions if a.get('type') != 'do_nothing']
        
        # 确保每个action都有reasoning
        for action in output['actions']:
            if 'reasoning' not in action:
                action['reasoning'] = "未提供具体理由"
        
        # 提取并保存长期记忆
        if 'long_term_memory' in output and output['long_term_memory']:
            self.long_term_memory = output['long_term_memory']
            logger.debug(f"[{self.name}] 更新长期记忆: {self.long_term_memory[:50]}...")
        
        return output
