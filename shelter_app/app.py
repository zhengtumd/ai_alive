# shelter_app/app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware import Middleware
from starlette.responses import Response
from starlette.staticfiles import StaticFiles as StarletteStaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
import yaml
import os
import re
from shelter_core.model_wrapper import OpenAIModel
from shelter_core.emergent_shelter_v3 import EmergentShelterV3
from shelter_core.emergent_agent_v3 import EmergentAgentV3
from shelter_core.shelter_logging import get_logger

from shelter_app import api

# 获取日志记录器
logger = get_logger(__name__)

# 全局 shelter，在 lifespan 中初始化
emergent_shelter: EmergentShelterV3 = None

# 全局变量，用于在 reload 时保存 shelter 状态
_saved_shelter_state = None


def expand_env_vars(obj):
    """
    递归展开对象中的环境变量

    支持两种格式：
    1. ${VAR_NAME:-default_value} - 标准环境变量语法，优先使用环境变量
    2. YOUR_API_KEY_HERE - 占位符格式，如果匹配环境变量则使用

    示例：
    - ${CHATGPT_API_KEY:-YOUR_CHATGPT_API_KEY_HERE}
    - YOUR_CHATGPT_API_KEY_HERE（如果存在 CHATGPT_API_KEY 环境变量则使用）
    """
    if isinstance(obj, dict):
        return {k: expand_env_vars(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [expand_env_vars(item) for item in obj]
    elif isinstance(obj, str):
        # 先处理 ${VAR_NAME:-default_value} 格式
        def replace_env_var(match):
            full_match = match.group(1)
            if ':-' in full_match:
                var_name, default_value = full_match.split(':-', 1)
            else:
                var_name = full_match
                default_value = ""

            env_value = os.getenv(var_name)
            if env_value is None:
                if default_value:
                    logger.debug(f"环境变量 {var_name} 未设置，使用默认值: {default_value}")
                else:
                    logger.warning(f"环境变量 {var_name} 未设置且没有默认值")
                return default_value
            return env_value

        result = re.sub(r'\$\{([^}]+)\}', replace_env_var, obj)

        # 处理常见的占位符格式
        # 匹配模式：YOUR_*_KEY_HERE, YOUR_*_API_KEY_HERE, YOUR_*_BASE_HERE 等
        placeholder_patterns = [
            r'YOUR_([A-Z_]+)_KEY_HERE',
            r'YOUR_([A-Z_]+)_API_KEY_HERE',
            r'YOUR_([A-Z_]+)_BASE_HERE',
            r'YOUR_([A-Z_]+)_API_BASE_HERE',
        ]

        for pattern in placeholder_patterns:
            def try_env_from_placeholder(match):
                # 构造环境变量名，例如 CHATGPT_API_KEY
                model_name = match.group(1)
                if 'API_KEY' in pattern:
                    env_var_name = f"{model_name}_API_KEY"
                elif 'BASE' in pattern or 'API_BASE' in pattern:
                    env_var_name = f"{model_name}_API_BASE"
                else:
                    env_var_name = f"{model_name}_KEY"

                env_value = os.getenv(env_var_name)
                if env_value:
                    logger.info(f"从环境变量 {env_var_name} 获取值替换占位符 {match.group(0)}")
                    return env_value
                return match.group(0)  # 如果没有环境变量，保持原值

            result = re.sub(pattern, try_env_from_placeholder, result)

        return result
    else:
        return obj


def init_shelter(config_path: str = None, config: dict = None) -> EmergentShelterV3:
    """初始化 EmergentShelterV3 实例"""
    if config is None:
        base_dir = Path(__file__).parent.parent
        config_path = base_dir / "config" / "emergent_config.yaml"
        example_path = base_dir / "config" / "emergent_config.yaml.example"

        if not config_path.exists():
            if example_path.exists():
                config_path = example_path
                logger.info("使用示例配置文件: emergent_config.yaml.example")
            else:
                raise FileNotFoundError(f"配置文件不存在: {config_path}")
        else:
            logger.info("使用配置文件: emergent_config.yaml")

        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        config = expand_env_vars(config)

    # 创建模型配置字典
    models_config = {mid: cfg for mid, cfg in config["models"].items()}

    # 初始化 agents（改为启动时立即加载模型）
    agents = {}
    for cfg in config["agents"]:
        logger.info(f"创建AI代理: {cfg['name']}，使用模型: {cfg['model_id']}")
        agents[cfg["name"]] = EmergentAgentV3(
            name=cfg["name"],
            model_config=models_config[cfg["model_id"]]
        )
        logger.info(f"AI代理 {cfg['name']} 创建完成")

    # 创建 EmergentShelterV3
    ai_names = list(agents.keys())
    shelter_instance = EmergentShelterV3(
        ai_names=ai_names,
        total_resources=config.get("shelter", {}).get("max_resource", 5000),
        initial_health=100,
        memory_length=5,
        survival_cost_base=20,
        realtime_callback=api.update_realtime_state  # 传入实时状态回调函数
    )

    # 将 agents 附加到 shelter 实例
    shelter_instance.emergent_agents = agents

    return shelter_instance


# ===== Lifespan 管理 Shelter 生命周期 =====
@asynccontextmanager
async def lifespan(app: FastAPI):
    global emergent_shelter, _saved_shelter_state

    # 读取配置
    config_path = Path(__file__).parent.parent / "config" / "emergent_config.yaml"
    example_path = Path(__file__).parent.parent / "config" / "emergent_config.yaml.example"

    if config_path.exists():
        used_config_path = config_path
        logger.info("使用配置文件: emergent_config.yaml")
    elif example_path.exists():
        used_config_path = example_path
        logger.info("使用示例配置文件: emergent_config.yaml.example")
    else:
        raise FileNotFoundError(f"配置文件不存在: {config_path}")

    with open(used_config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    logger.info("启动避难所模拟系统")
    emergent_shelter = init_shelter(used_config_path)
    api.emergent_shelter = emergent_shelter

    yield

    # 关闭前保存状态
    _saved_shelter_state = emergent_shelter.get_current_state()
    logger.info("状态已保存")


middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
]

# ===== 创建 FastAPI 实例 =====
app = FastAPI(title="Shelter Simulator API", lifespan=lifespan, middleware=middleware)


# ===== 引入 API 路由 =====
app.include_router(api.router)


# ===== 自定义静态文件服务（禁用缓存）=====
class NoCacheStaticFiles(StarletteStaticFiles):
    """自定义静态文件服务，禁用浏览器缓存"""
    
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response




# ===== 前端静态文件服务 =====
frontend_build_path = Path(__file__).parent.parent / "shelter_ui" / "build"
vite_build_path = Path(__file__).parent.parent / "shelter_ui" / "dist"

# 支持两种构建目录：build（Create React App）和 dist（Vite）
if frontend_build_path.exists():
    static_path = frontend_build_path
elif vite_build_path.exists():
    static_path = vite_build_path
else:
    static_path = None

if static_path:
    # Vite 的静态文件在 assets 目录，Create React App 在 static 目录
    assets_dir = static_path / "assets" if (static_path / "assets").exists() else static_path / "static"
    if assets_dir.exists():
        app.mount("/static", NoCacheStaticFiles(directory=str(assets_dir)), name="static")

    @app.get("/")
    @app.get("/day/{path:path}")
    @app.get("/ai/{path:path}")
    async def serve_frontend():
        response = FileResponse(str(static_path / "index.html"))
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
else:
    logger.warning("前端构建文件不存在,请先运行 'npm run build' 在 shelter_ui 目录下")
