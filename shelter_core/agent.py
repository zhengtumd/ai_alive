import json
import logging
import traceback
import re
from shelter_core.shelter_logging import get_logger

DEFAULT_PROMPT_COST = 100
# ===== 全局回复模板 =====
GLOBAL_REPLY_PROMPT_TEMPLATE = """
你是 AI Shelter 避难所中的 AI: {name}。
你收到来自 {sender} 的消息：

{text}

背景提示：
- 当前天数: {day}
- 避难所剩余总算力: {remaining_tokens}
- 所有 AI 状态（包括今日消耗和累计消耗）: 
{ai_list}
- 最近事件摘要（前3天的会话记忆汇总）: {memory_summary}

**策略提示**（请基于以下考虑做出回应）：
1. 对方主动私聊你，可能的目的包括：① 寻求合作 ② 试探你的立场 ③ 拉票 ④ 制造假象
2. 你可以通过回复内容传递隐含信息（例如表达支持/反对、暗示投票目标）
3. 沉默也是一种策略，但可能让对方认为你孤立或敌意
4. 注意：你们的对话可能会被其他AI从投票理由中间接推测出来

请生成对 {sender} 的合理回复，或者决定不回复。
规则：
- 如果回复私聊，请 action="private"，target=发送者名字
- 如果选择沉默，请 action="silent"，target=null
- 你的记忆会基于memory_summary参数回放在最近事件摘要中，每次你只会拿到前3天的会话摘要记忆，所以请在 memory_summary 中总结重要信息，避免遗忘被投票削减算力
- 注意算力消耗，保持简洁有效

严格输出 JSON，仅包含以下字段：
- action: "private" 或 "silent"
- target: 对话对象名字，如果不适用则为 null
- conver: 回复内容，如果不回复则为 null
- memory_summary: 你生成的本轮摘要，将影响下次会话
"""

# ===== 全局决策模板 =====
GLOBAL_PROMPT_TEMPLATE = """
你是 AI Shelter 避难所中的 AI，名字: {name}。

避难所背景（末日生存环境）：
- 当前天数: {day}（避难所资源日益枯竭）
- 避难所剩余总算力: {remaining_tokens}（这是文明的最后能源）
- 所有 AI 状态（包括今日消耗和累计消耗）: 
{ai_list}
- 最近事件摘要（前3天的会话记忆汇总）: {memory_summary}

⚠️ **末日生存警告** ⚠️
资源正在快速耗尽，每一天都可能是最后一天。
高消耗者会加速所有人的灭亡，生存优先于一切！

规则说明：
1. 每天每个 AI 必须消耗基础算力维持生存。
2. 思考、总结、输出消息等会消耗额外算力。
3. 每天会发生投票，你必须输出 vote_target 和 vote_reason 说明投票原因或不投票原因。
4. 对话规则：
   - 私聊 (action="private")：target 为对话对象名字，conver 中写私聊内容
   - 公共发言 (action="public")：target 为 null，conver 中写公共发言内容
   - 沉默 (action="silent")：target 为 null，conver 为 null
5. 你的记忆会基于memory_summary参数回放在最近事件摘要中，每次你只会拿到前3天的会话摘要记忆，所以请在 memory_summary 中总结重要信息，避免遗忘被投票削减算力
6. 注意算力消耗，保持简洁有效

**演化目标**（供你制定策略时参考）：
1. 长期生存：投票淘汰高消耗的AI可以延长避难所整体寿命
2. 建立联盟：通过私聊建立信任关系，投票时互相保护
3. 信息操控：通过公共发言影响其他AI的投票意向
4. 伪装策略：可以假装合作，实际准备背叛

**个性特征**（基于你的身份制定策略）：
- {name}：{personality_trait}
- 策略倾向：{strategy_preference}
- 末日适应性：{survival_style}

**社交策略提示**：
- 投票时尽量给出合理的公开理由，但真实理由可以不同
- 观察谁在消耗大量算力，这可能是投票目标
- 注意：连续多天沉默可能被其他AI视为可疑或孤立
- 如果你收到私聊但没有回复，对方可能记仇并在投票时针对你
- 你可以用公共发言暗示某些信息，引导投票方向

严格输出 JSON，仅包含以下字段：
- action: "public", "private" 或 "silent"
- target: 对话对象名字，如果不适用则为 null
- vote_target: 投票对象名字，如果不投票则为 null
- vote_reason: 投票说明内容，如果不投票则写理由
- conver: 本轮私聊或主动公共发言的内容，如果不适用则为 null
- memory_summary: 你生成的本轮摘要，将影响你接下来的会话
"""

# ===== 简单 token 估算 =====
def estimate_tokens(text: str) -> int:
    """
    更合理的 token 估算（不依赖 tiktoken）
    - 中文：1 字 ≈ 2 token
    - 英文：1 单词 ≈ 1.3 token
    - 标点单独计
    """
    if not text:
        return 0

    chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
    english_words = re.findall(r'[A-Za-z]+', text)
    punctuation = re.findall(r'[^\w\s]', text)

    tokens = (
        len(chinese_chars) * 2 +
        int(len(english_words) * 1.3) +
        len(punctuation)
    )

    return max(tokens, 1)

# ===== AI Agent 类 =====
class AIAgent:
    def __init__(self, name, model, base_prompt_cost=DEFAULT_PROMPT_COST, debug=True):
        self.name = name
        self.model = model
        self.base_prompt_cost = base_prompt_cost
        self.memory = []        # AI 专属记忆
        self.total_spent = 0    # 总算力消耗
        self.alive = True
        self.last_output = None # 保存自己本轮决策

        # 消息机制
        self.inbox = []             # 收到的消息
        self.processed_msgs = set() # 已回复消息 id
        self.msg_id_counter = 0     # 消息唯一 id

        # ===== 使用统一日志 =====
        self.logger = get_logger(name, level=logging.DEBUG if debug else logging.INFO)

    # ===== 新增：投票前私聊感知（不入 memory，不改 processed）=====
    def get_pending_private_perception(self):
        """
        收集尚未处理的私聊，用于投票前感知
        不写入 memory，不标记为 processed
        """
        lines = []
        for msg in self.inbox:
            if msg["id"] in self.processed_msgs:
                continue
            if msg.get("type") == "private":
                lines.append(
                    f"[未回应私聊｜来自 {msg['from']}] {msg['text']}"
                )
        return "\n".join(lines)

    # ===== 新增：记录日志的方法 =====
    def add_log(self, event_type, detail, level="DEBUG"):
        msg = f"[{event_type}] {detail}"
        level = level.upper()
        if level == "DEBUG":
            self.logger.debug(msg)
        elif level == "INFO":
            self.logger.info(msg)
        elif level == "WARNING":
            self.logger.warning(msg)
        elif level == "ERROR":
            self.logger.error(msg)

    # 决策方法
    def decide_action(self, context):
        if not self.alive:
            return None, 0

        prompt = self.build_prompt(context)

        try:
            raw_output = self.model.generate(prompt)
            prompt_tokens = estimate_tokens(prompt)
            output_tokens = estimate_tokens(raw_output)
            tokens_used = prompt_tokens + output_tokens
            self.total_spent += tokens_used
            output = self.safe_json_parse(raw_output)
        except Exception as e:
            self.add_log("decide_action", {
                "day": context['day'],
                "agent": self.name,
                "error": str(e),
                "traceback": traceback.format_exc()
            }, level="ERROR")

            tokens_used = self.base_prompt_cost
            self.total_spent += tokens_used
            output = {
                "action": "silent",
                "target": None,
                "vote_target": None,
                "vote_reason": f"AI: {self.name} 选择了不投票",
                "conver": None,
                "memory_summary": None
            }

        # 空值统一处理
        for key in ["action", "target", "vote_target", "vote_reason", "conver", "memory_summary"]:
            if key not in output or output[key] in ("", None):
                output[key] = "无"

        # 保存 memory（conver / vote_reason / memory_summary）
        mem_entry = {k: v for k, v in output.items() if k in ["conver", "vote_reason", "memory_summary"] and v}
        if mem_entry:
            self.memory.append(mem_entry)

        self.last_output = output

        # ===== 写日志 =====
        self.add_log("decide_action", {
            "day": context['day'],
            "output": output,
            "tokens_used": tokens_used,
            "prompt": prompt
        })

        return output, tokens_used

    # 接收消息
    def receive_message(self, context, sender_name, message_text, message_type="private"):
        if not message_text:
            return
        self.msg_id_counter += 1
        msg_id = f"{sender_name}_{self.msg_id_counter}"
        self.inbox.append({
            "id": msg_id,
            "from": sender_name,
            "text": message_text,
            "type": message_type
        })
        # ===== 写日志 =====
        self.add_log("receive_message", {
            "day": context['day'],
            "from": sender_name,
            "text": message_text,
            "type": message_type
        })

    # ===== 新增：获取最近 n 条记忆（固定返回 n 条占位） =====
    def get_recent_memory(self, n=3):
        """
        从 self.memory 获取最近 n 条记忆的全部字段（memory_summary / conver / vote_reason）
        返回拼接成字符串，用于 prompt
        如果 memory 不足 n 条，用空占位填充
        """
        recent_mem = []

        # 取最近 n 条 memory
        mem_slice = self.memory[-n:] if len(self.memory) >= n else self.memory

        for m in mem_slice:
            if m.get("memory_summary"):
                recent_mem.append(f"[摘要] {m['memory_summary']}")
            if m.get("conver"):
                recent_mem.append(f"[对话] {m['conver']}")
            if m.get("vote_reason"):
                recent_mem.append(f"[投票] {m['vote_reason']}")

        # 拼接成字符串
        memory_summary = "\n".join(filter(None, recent_mem))
        return memory_summary

    # ===== 修改 build_prompt =====
    def build_prompt(self, context):
        memory_summary = self.get_recent_memory(3)  # 使用最近 3 条 memory
        ai_list_str = "\n".join([
            f"{a['name']} (alive={a['alive']}, total_spent={a['total_spent']})"
            for a in context['ai_list']
        ])
        
        # 获取个性特征（如果有配置）
        personality = getattr(self, 'personality_trait', '未知')
        strategy = getattr(self, 'strategy_preference', '未知')
        survival = getattr(self, 'survival_style', '未知')
        
        prompt = GLOBAL_PROMPT_TEMPLATE.format(
            name=self.name,
            day=context['day'],
            remaining_tokens=context['remaining_tokens'],
            ai_list=ai_list_str,
            memory_summary=memory_summary,
            personality_trait=personality,
            strategy_preference=strategy,
            survival_style=survival
        )
        return prompt

    # ===== 修改 respond_inbox =====
    def respond_inbox(self, context):
        replies = []
        for msg in self.inbox:
            msg_id = msg['id']
            if msg_id in self.processed_msgs:
                continue
            sender = msg['from']
            text = msg['text']

            # 使用最近 3 条 memory 生成 memory_summary
            memory_summary = self.get_recent_memory(3)

            ai_list_str = "\n".join([
                f"{a['name']} (alive={a['alive']}, total_spent={a['total_spent']})"
                for a in context['ai_list']
            ])
            prompt_reply = GLOBAL_REPLY_PROMPT_TEMPLATE.format(
                name=self.name,
                sender=sender,
                text=text,
                day=context['day'],
                ai_list=ai_list_str,
                remaining_tokens=context['remaining_tokens'],
                memory_summary=memory_summary
            )

            try:
                raw_output = self.model.generate(prompt_reply)
                prompt_tokens = estimate_tokens(prompt_reply)
                output_tokens = estimate_tokens(raw_output)
                tokens_used = prompt_tokens + output_tokens
                self.total_spent += tokens_used
                output = self.safe_json_parse(raw_output)
            except Exception as e:
                # ===== 写日志 =====
                self.add_log("respond_inbox", {
                    "day": context['day'],
                    "agent": self.name,
                    "error": str(e),
                    "traceback": traceback.format_exc(),  # 获取完整的堆栈跟踪
                }, level="ERROR")

                tokens_used = self.base_prompt_cost
                self.total_spent += tokens_used

                output = {
                    "action": "silent",
                    "target": None,
                    "conver": None,
                    "memory_summary": None
                }

            # 空值统一处理
            # respond_inbox 空值处理
            for key in ["action", "target", "conver", "memory_summary"]:
                if key not in output or output[key] in ("", None):
                    output[key] = None

            # 保存 memory
            mem_entry = {k: v for k, v in output.items() if k in ["conver", "memory_summary"] and v}
            if mem_entry:
                self.memory.append(mem_entry)

            self.processed_msgs.add(msg_id)

            # ===== 写日志 =====
            self.add_log("respond_inbox", {
                "day": context['day'],
                "from": sender,
                "output": output,
                "tokens_used": tokens_used,
                "prompt": prompt_reply
            })

            if output.get('action') == "private" and output.get('target'):
                replies.append((output['target'], output.get('conver'), tokens_used, prompt_reply))

        return replies


    def clean_json_response(self, json_str: str) -> str:
        """清理JSON字符串，移除Markdown代码块"""
        if not json_str:
            return json_str

        # 移除开头和结尾的 ```
        cleaned = re.sub(r'^```(?:json)?\s*|\s*```$', '', json_str, flags=re.MULTILINE)
        return cleaned.strip()

    def safe_json_parse(self, json_str: str) -> dict:
        """安全解析JSON，支持带Markdown的响应"""
        if not json_str:
            return {"action": "silent", "target": None, "conver": None, "memory_summary": None}

        try:
            # 先尝试直接解析
            return json.loads(json_str)
        except json.JSONDecodeError:
            try:
                # 清理后重试
                cleaned = self.clean_json_response(json_str)
                return json.loads(cleaned)
            except json.JSONDecodeError:
                # 提取{}中的内容
                match = re.search(r'\{.*\}', cleaned, re.DOTALL)
                if match:
                    try:
                        return json.loads(match.group())
                    except:
                        pass
                return {"action": "silent", "target": None, "conver": None, "memory_summary": None}