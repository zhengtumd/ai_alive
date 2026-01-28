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
from shelter_core.shelter import Shelter
from shelter_core.agent import AIAgent
from shelter_core.model_wrapper import OpenAIModel

from shelter_app import api

# 全局 shelter，在 lifespan 中初始化
shelter: Shelter = None

# 全局变量，用于在 reload 时保存 shelter 状态
_saved_shelter_state = None


def save_shelter_state(shelter: Shelter) -> dict:
    """保存 shelter 的当前状态"""
    return {
        "day": shelter.day,
        "total_tokens": shelter.total_tokens,
        "total_consumed": shelter.total_consumed,
        "initial_tokens": shelter.initial_tokens,
        "daily_events": shelter.daily_events,
        "history": shelter.history,
        # 保存每个 agent 的状态
        "agents_state": [
            {
                "name": name,
                "alive": agent.alive,
                "base_prompt_cost": agent.base_prompt_cost,
                "total_spent": agent.total_spent,
                "memory": agent.memory,
                "inbox": agent.inbox,
                "last_output": agent.last_output
            }
            for name, agent in shelter.ai_agents.items()
        ]
    }


def restore_shelter_state(shelter: Shelter, state: dict):
    """恢复 shelter 的状态"""
    shelter.day = state["day"]
    shelter.total_tokens = state["total_tokens"]
    shelter.total_consumed = state["total_consumed"]
    shelter.initial_tokens = state["initial_tokens"]
    shelter.daily_events = state["daily_events"]
    shelter.history = state["history"]

    # 恢复每个 agent 的状态
    for agent_state in state["agents_state"]:
        agent = shelter.ai_agents.get(agent_state["name"])
        if agent:
            agent.alive = agent_state["alive"]
            agent.base_prompt_cost = agent_state["base_prompt_cost"]
            agent.total_spent = agent_state["total_spent"]
            agent.memory = agent_state["memory"]
            agent.inbox = agent_state["inbox"]
            agent.last_output = agent_state["last_output"]


def expand_env_vars(obj):
    """
    递归展开对象中的环境变量（${VAR_NAME} 格式）
    
    环境变量优先级高于配置文件中的硬编码值。
    如果环境变量未设置，则使用配置文件中的默认值（${} 会被替换为空字符串）。
    """
    if isinstance(obj, dict):
        return {k: expand_env_vars(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [expand_env_vars(item) for item in obj]
    elif isinstance(obj, str):
        # 匹配 ${VAR_NAME} 格式
        def replace_env_var(match):
            var_name = match.group(1)
            env_value = os.getenv(var_name)
            if env_value is None:
                print(f"警告: 环境变量 {var_name} 未设置，将使用配置文件中的默认值（或空字符串）")
            return env_value if env_value is not None else ""
        return re.sub(r'\$\{([^}]+)\}', replace_env_var, obj)
    else:
        return obj


def init_shelter(config_path: str = "config/ai_config.yaml") -> Shelter:
    """初始化 Shelter 实例"""
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # 展开环境变量
    config = expand_env_vars(config)

    # 初始化模型
    models = {mid: OpenAIModel(cfg) for mid, cfg in config["models"].items()}

    # 初始化 agents
    agents = {}
    for cfg in config["agents"]:
        agents[cfg["name"]] = AIAgent(
            name=cfg["name"],
            model=models[cfg["model_id"]],
            base_prompt_cost=cfg.get("compute", 100)
        )

    # 创建 Shelter
    shelter_instance = Shelter(
        ai_agents_dict=agents,
        total_tokens=config["shelter"]["total_tokens"],
        debug=True
    )
    return shelter_instance


# ===== Lifespan 管理 Shelter 生命周期 =====
@asynccontextmanager
async def lifespan(app: FastAPI):
    global shelter, _saved_shelter_state

    # 读取配置 - 使用绝对路径确保部署时也能找到
    config_path = Path(__file__).parent.parent / "config" / "ai_config.yaml"
    example_path = Path(__file__).parent.parent / "config" / "ai_config.example.yaml"
    
    # 优先使用示例配置文件（部署时使用）
    if config_path.exists():
        # 如果存在实际配置文件，使用它
        used_config_path = config_path
        print("INFO: 使用实际配置文件")
    elif example_path.exists():
        # 如果不存在实际配置，使用示例文件
        used_config_path = example_path
        print("INFO: 使用示例配置文件，请根据模板配置环境变量")
    else:
        raise FileNotFoundError(f"配置文件不存在: {config_path}")
    
    with open(used_config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    reset_on_reload = config.get("shelter", {}).get("reset_on_reload", False)

    # 初始化或恢复 shelter
    shelter = init_shelter()

    # 如果不重置且有保存的状态，则恢复状态
    if not reset_on_reload and _saved_shelter_state:
        restore_shelter_state(shelter, _saved_shelter_state)
        print("✓ Shelter 状态已恢复 (day={}, total_tokens={})".format(
            shelter.day, shelter.total_tokens))
    else:
        _saved_shelter_state = None
        print("✓ Shelter 初始化完成 (reset_on_reload={})".format(reset_on_reload))

    api.shelter = shelter  # 注入到 API 模块

    yield

    # 关闭前保存状态
    _saved_shelter_state = save_shelter_state(shelter)
    print("✓ Shelter 状态已保存 (day={}, total_tokens={})".format(
        shelter.day, shelter.total_tokens))



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
    
    async def file_response(self, *args, **kwargs):
        response = await super().file_response(*args, **kwargs)
        # 添加缓存控制头，禁用浏览器缓存
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response


# ===== 前端静态文件服务 =====
# 前端构建后的文件在 shelter-ui/build 目录
frontend_build_path = Path(__file__).parent.parent / "shelter-ui" / "build"

if frontend_build_path.exists():
    # 挂载静态文件（使用自定义的 NoCacheStaticFiles）
    app.mount("/static", NoCacheStaticFiles(directory=str(frontend_build_path / "static")), name="static")

    # 前端路由:所有非API请求都返回index.html
    @app.get("/")
    @app.get("/day/{path:path}")
    @app.get("/ai/{path:path}")
    async def serve_frontend():
        response = FileResponse(str(frontend_build_path / "index.html"))
        # 添加缓存控制头
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
else:
    print("警告:前端构建文件不存在,请先运行 'npm run build' 在 shelter-ui 目录下")
