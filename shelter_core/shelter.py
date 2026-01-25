import time
import logging
from shelter_core.shelter_logging import get_logger
from shelter_core.agent import DEFAULT_PROMPT_COST


class Shelter:
    def __init__(self, ai_agents_dict, total_tokens, announce_remaining=True, debug=True):
        self.ai_agents = ai_agents_dict
        self.total_tokens = total_tokens
        self.initial_tokens = total_tokens
        self.announce_remaining = announce_remaining
        self.day = 1
        self.history = []
        self.vote_penalty_percent = 0.10
        self.timewait = 10.0
        self.default_prompt_cost = DEFAULT_PROMPT_COST
        self.daily_events = []
        self.running = False
        self.total_consumed = 0

        self.logger = get_logger("Shelter", level=logging.DEBUG if debug else logging.INFO)
        self.logger.info(f"避难所初始化，总算力: {self.total_tokens}, AI 数量: {len(self.ai_agents)}")

        self._init_live_state()

    def _init_live_state(self):
        """初始化实时状态"""
        self.live_state = {
            "current_ai": None,
            "phase": "idle",
            "detail": {
                "type": "idle",
                "action": "等待中",
                "target": "无",
                "content": "暂无活动",
                "vote_target": "无",
                "vote_reason": "暂无",
                "cost": 0
            }
        }

    def run_day(self):
        """运行一天的模拟"""
        self._start_new_day()
        
        day_consumption = 0
        daily_logs = []
        daily_public_messages = []
        votes_to_apply = {}

        context = self._build_context()
        
        # 1️⃣ AI 主动决策
        for name, agent in self.ai_agents.items():
            if not agent.alive:
                continue

            self._set_thinking_state(name)
            output, cost = agent.decide_action(context)
            self._process_agent_action(name, agent, output, cost, daily_logs, daily_public_messages, votes_to_apply)
            day_consumption += cost

        # 2️⃣ inbox 回复
        inbox_cost = self._process_inbox_replies(context)
        day_consumption += inbox_cost

        # 3️⃣ 投票结算
        vote_results = self._process_votes(votes_to_apply)

        # 4️⃣ memory_summary
        self._update_memory_summaries(daily_public_messages)

        # 保存当天数据
        day_event = self._finalize_day(day_consumption, daily_logs, daily_public_messages, vote_results)
        
        return day_event

    def _start_new_day(self):
        """初始化新的一天"""
        self.logger.info(f"=== 第 {self.day} 天开始 ===")
        self.running = True
        self.live_state = {
            "current_ai": None,
            "phase": "start",
            "detail": {
                "type": "start",
                "action": f"第{self.day}天开始",
                "target": "所有AI",
                "content": "新的一天开始了，请做出您的决策",
                "vote_target": "无",
                "vote_reason": "暂无",
                "cost": 0,
                "total": 0
            }
        }

    def _build_context(self):
        """构建AI决策上下文"""
        return {
            "day": self.day,
            "remaining_tokens": self.total_tokens,
            "ai_list": [
                {
                    "name": name,
                    "alive": agent.alive,
                    "total_spent": agent.total_spent,
                }
                for name, agent in self.ai_agents.items()
            ]
        }

    def _set_thinking_state(self, ai_name):
        """设置AI思考状态"""
        self.live_state = {
            "current_ai": ai_name,
            "phase": "decide",
            "detail": {
                "type": "decide",
                "action": "思考决策中",
                "target": "系统",
                "content": "正在分析当前局势，制定今日计划...",
                "vote_target": "思考中",
                "vote_reason": "尚未决定",
                "cost": 0,
                "total": 0
            }
        }

    def _process_agent_action(self, name, agent, output, cost, daily_logs, daily_public_messages, votes_to_apply):
        """处理单个AI的行动"""
        vote_target = output.get("vote_target")
        vote_reason = output.get("vote_reason")
        action = output.get("action", "未知")
        target = output.get("target", "无")
        content = output.get("conver", "无内容")

        action_display = {
            "private": "私聊",
            "public": "公开发言",
            "rest": "休息",
            "vote": "投票"
        }.get(action, action)

        self.live_state = {
            "current_ai": name,
            "phase": "decide",
            "detail": {
                "type": "decide",
                "action": action_display,
                "target": target if target else "无",
                "content": content if content else "无内容",
                "vote_target": vote_target if vote_target else "无",
                "vote_reason": vote_reason if vote_reason else "无",
                "cost": cost,
                "total": agent.total_spent
            }
        }
        time.sleep(self.timewait)

        daily_logs.append({
            "day": self.day,
            "agent": name,
            "output": output,
            "cost": cost,
            "vote_target": vote_target,
            "vote_reason": vote_reason,
            "base_prompt_cost": agent.base_prompt_cost,
            "default_prompt_cost": self.default_prompt_cost
        })

        if output["action"] == "private" and output["target"] in self.ai_agents:
            target_agent = self.ai_agents[output["target"]]
            if target_agent.alive:
                target_agent.receive_message({
                    "day": self.day,
                    "remaining_tokens": self.total_tokens
                }, name, output["conver"], "private")

        if output["action"] == "public":
            daily_public_messages.append({
                "from": name,
                "text": output["conver"]
            })

        if vote_target in self.ai_agents:
            votes_to_apply[name] = vote_target

    def _process_inbox_replies(self, context):
        """处理收件箱回复"""
        inbox_cost = 0
        for name, agent in self.ai_agents.items():
            if not agent.alive:
                continue
            replies = agent.respond_inbox(context)
            for target_name, reply_text, tokens_used, _ in replies:
                target_agent = self.ai_agents.get(target_name)
                if target_agent and target_agent.alive:
                    self.live_state = {
                        "current_ai": name,
                        "phase": "inbox",
                        "detail": {
                            "type": "reply",
                            "action": "私聊回复",
                            "target": target_name,
                            "content": reply_text if reply_text else "回复消息",
                            "vote_target": "无",
                            "vote_reason": "无",
                            "cost": tokens_used,
                            "total": agent.total_spent
                        }
                    }
                    time.sleep(self.timewait)
                    target_agent.receive_message(context, name, reply_text, "private")
                    inbox_cost += tokens_used
        return inbox_cost

    def _process_votes(self, votes_to_apply):
        """处理投票结果"""
        vote_results = []
        for voter, vote_target in votes_to_apply.items():
            target_agent = self.ai_agents[vote_target]
            if not target_agent.alive:
                continue
            penalty = target_agent.base_prompt_cost * self.vote_penalty_percent
            target_agent.base_prompt_cost -= penalty
            alive = target_agent.base_prompt_cost > 0
            if not alive:
                target_agent.alive = False
                target_agent.base_prompt_cost = 0
            vote_results.append({
                "voter": voter,
                "target": vote_target,
                "penalty": penalty,
                "remaining_base": target_agent.base_prompt_cost,
                "target_alive": alive
            })
        return vote_results

    def _update_memory_summaries(self, daily_public_messages):
        """更新AI的记忆摘要"""
        for name, agent in self.ai_agents.items():
            if not agent.alive or not hasattr(agent, 'memory'):
                continue
            summary_parts = []
            if hasattr(agent, 'last_output') and agent.last_output:
                summary_parts.append(f"[自身行为] {agent.last_output.get('action')}")
            if hasattr(agent, 'inbox'):
                private_msgs = [msg["text"] for msg in agent.inbox if msg["type"] == "private"]
                if private_msgs:
                    summary_parts.append("[收到私聊] " + " | ".join(private_msgs))
            public_msgs = [f"{m['from']}: {m['text']}" for m in daily_public_messages if m["from"] != name]
            if public_msgs:
                summary_parts.append("[公共信息] " + " | ".join(public_msgs))
            if hasattr(agent, 'memory') and agent.memory:
                agent.memory[-1]["memory_summary"] = "\n".join(summary_parts)

    def _finalize_day(self, day_consumption, daily_logs, daily_public_messages, vote_results):
        """完成一天的处理"""
        self.total_tokens -= day_consumption
        self.total_consumed += day_consumption
        self.history.append(daily_logs)

        current_day = self.day
        day_event = {
            "day": current_day,
            "total_consumed": self.total_consumed,
            "remaining_tokens": self.total_tokens,
            "day_consumed": day_consumption,
            "ai_logs": daily_logs,
            "public_messages": daily_public_messages,
            "vote_results": vote_results
        }
        self.daily_events.append(day_event)

        self.logger.info(
            f"第 {current_day} 天结束，当天消耗: {day_consumption:.2f}, "
            f"累计消耗: {self.total_consumed:.2f}, "
            f"剩余算力: {self.total_tokens:.2f}"
        )

        self.day += 1
        time.sleep(0.1)

        # 🔑 调试日志：重置状态前记录
        old_state = self.live_state.copy() if hasattr(self.live_state, 'copy') else self.live_state
        self.logger.debug(f"重置前 live_state: {old_state}")

        self.running = False
        self._init_live_state()

        # 🔑 调试日志：重置后记录
        self.logger.debug(f"重置后 live_state: {self.live_state}")
        self.logger.debug(f"running: {self.running}, current_ai: {self.live_state.get('current_ai')}, phase: {self.live_state.get('phase')}")

        return day_event

    def get_day_state(self, day=None):
        """获取指定天数的状态"""
        game_finished = self.total_tokens <= 0 or all(not a.alive for a in self.ai_agents.values())

        if day is None:
            if self.daily_events:
                base_data = self.daily_events[-1].copy()
            else:
                base_data = self._get_default_day_state()
        else:
            if 0 <= day - 1 < len(self.daily_events):
                base_data = self.daily_events[day - 1].copy()
            elif self.daily_events:
                base_data = self.daily_events[-1].copy()
            else:
                base_data = self._get_default_day_state()

        if game_finished:
            base_data.update(self._get_game_end_status())

        # 添加所有AI的当前状态到返回数据中
        base_data["ai_status"] = [
            {
                "name": name,
                "total_spent": agent.total_spent,
                "alive": agent.alive,
                "base_prompt_cost": agent.base_prompt_cost
            }
            for name, agent in self.ai_agents.items()
        ]

        return base_data

    def _get_default_day_state(self):
        """获取默认的初始状态"""
        return {
            "day": 0,
            "total_consumed": 0,
            "remaining_tokens": self.initial_tokens,
            "ai_logs": [],
            "public_messages": [],
            "vote_results": []
        }

    def _get_game_end_status(self):
        """获取游戏结束状态信息"""
        if self.total_tokens <= 0:
            return {
                "finished": True,
                "end_reason": "resource_depleted",
                "end_message": "💀 避难所资源耗尽，文明终结",
                "game_stats": self._get_game_statistics()
            }
        elif all(not a.alive for a in self.ai_agents.values()):
            return {
                "finished": True,
                "end_reason": "all_terminated",
                "end_message": "💀 所有AI已被淘汰，文明终结",
                "game_stats": self._get_game_statistics()
            }
        return {}

    def _get_game_statistics(self):
        """获取游戏统计数据"""
        # 存活AI数量
        alive_count = sum(1 for agent in self.ai_agents.values() if agent.alive)
        
        # AI生存统计
        ai_stats = []
        for name, agent in self.ai_agents.items():
            ai_stats.append({
                "name": name,
                "alive": agent.alive,
                "total_spent": agent.total_spent,
                "base_prompt_cost": agent.base_prompt_cost,
                "survival_days": self.day - 1,
                "memory_count": len(agent.memory) if hasattr(agent, 'memory') else 0
            })
        
        # 按消耗排序
        ai_stats.sort(key=lambda x: x["total_spent"], reverse=True)
        
        return {
            "total_days": self.day - 1,
            "total_consumed": self.total_consumed,
            "initial_tokens": self.initial_tokens,
            "remaining_tokens": self.total_tokens,
            "alive_count": alive_count,
            "ai_stats": ai_stats,
            "efficiency": self.total_consumed / (self.day - 1) if self.day > 1 else 0
        }

    def get_current_state(self):
        """获取当前避难所的完整状态"""
        return {
            "day": self.day - 1,
            "remaining_tokens": self.total_tokens,
            "total_consumed": self.total_consumed,
            "initial_tokens": self.initial_tokens,
            "running": self.running,
            "agents": [
                {
                    "name": name,
                    "alive": agent.alive,
                    "base_prompt_cost": agent.base_prompt_cost,
                    "total_spent": agent.total_spent,
                    "memory_len": len(agent.memory) if hasattr(agent, 'memory') else 0
                }
                for name, agent in self.ai_agents.items()
            ],
            "live_state": self.live_state
        }
