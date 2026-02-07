from openai import OpenAI
import logging
from shelter_core.shelter_logging import get_logger  # 根据实际路径导入


class OpenAIModel:
    def __init__(self, cfg):
        # 初始化logger
        self.logger = get_logger("ModelRequest", console_level=logging.INFO, file_level=logging.DEBUG)

        # 存储配置并立即初始化客户端（改为启动时加载）
        self._config = cfg
        self.model_name = cfg["model_name"]
        self.temperature = cfg.get("temperature", 0.7)
        
        # 立即初始化客户端
        self.logger.info(f"启动时初始化OpenAI模型: {self.model_name}, temperature={self.temperature}")
        self._client = OpenAI(
            api_key=self._config["api_key"],
            base_url=self._config.get("api_base")
        )
        self.logger.info(f"模型 {self.model_name} 初始化完成")

    @property
    def client(self):
        """直接返回已初始化的客户端"""
        return self._client

    def generate(self, prompt: str, system_message: str = None) -> str:
        try:
            # 记录请求开始
            self.logger.debug(f"开始生成请求，提示词长度: {len(prompt)}")
            if system_message:
                self.logger.debug(f"System Message长度: {len(system_message)}")
            if len(prompt) < 500:  # 只记录短提示词
                self.logger.debug(f"提示词内容: {prompt}")
            else:
                self.logger.debug(f"提示词前200字符: {prompt[:200]}...")

            # 构建messages
            messages = []
            if system_message:
                messages.append({"role": "system", "content": system_message})
            messages.append({"role": "user", "content": prompt})

            # 调用API
            resp = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=self.temperature
            )

            # 获取响应
            content = resp.choices[0].message.content

            # 记录响应
            self.logger.debug(
                f"API响应成功，使用token数: {resp.usage.total_tokens if hasattr(resp, 'usage') else '未知'}")
            self.logger.debug(f"响应内容长度: {len(content)}")

            if content:
                if len(content) < 300:  # 只记录短响应
                    self.logger.debug(f"响应内容: {content}")
                else:
                    self.logger.debug(f"响应前200字符: {content[:200]}...")
            else:
                self.logger.warning("API返回了空内容！")

            return content

        except Exception as e:
            # 记录错误
            self.logger.error(f"OpenAI API调用失败: {str(e)}", exc_info=True)

            # 返回一个默认的JSON响应，避免上层JSON解析错误
            error_response = {
                "action": "error",
                "reason": f"API调用失败: {type(e).__name__}"
            }
            import json
            return json.dumps(error_response)