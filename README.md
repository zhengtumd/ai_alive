# AI Shelter - 智能AI对话平台

![AI Decision Example](docs/ai-decision-example.jpg)

![AI Voting System](docs/ai-voting-system-example.jpg)

AI Shelter 是一个现代化的智能AI对话平台，支持多种AI模型（ChatGPT、Gemini、DeepSeek等），提供友好的用户界面和灵活的部署选项。

## ✨ 特性

- 🤖 **多模型支持**: ChatGPT、Gemini、DeepSeek、Doubao、Qwen
- 🚀 **前后端分离**: React + FastAPI 现代化架构
- 🔧 **灵活部署**: 支持本地开发、服务器部署、Docker部署
- ⚙️ **统一配置**: 环境变量统一管理，无需繁琐配置文件
- 🔄 **热重载**: 开发时自动重载，提高开发效率

## 🚀 快速开始

### 使用 UV（推荐 - 比 pip 快 10 倍）
```bash
# 安装 UV（极速 Python 包管理器）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 安装依赖
uv sync

# 启动应用
uv run start-shelter
```

### 使用传统方式（兼容模式）
```bash
# 安装所有依赖和环境
python start_app.py install

# 启动应用（仅启动，不安装）
python start_app.py
```

启动成功后访问：http://localhost:8000

**说明：**
- **UV**：极速依赖管理，推荐使用
- **传统方式**：兼容性更好，适合所有环境

## ⚙️ 配置说明

### AI 模型配置

项目使用 `config/emergent_config.yaml` 配置 AI 模型的 API 密钥。

**首次使用步骤：**
```bash
# 1. 复制配置模板
cp config/emergent_config.yaml.example config/emergent_config.yaml

# 2. 编辑配置文件，填入你的 API 密钥
# 替换以下占位符：
# - YOUR_CHATGPT_API_KEY_HERE
# - YOUR_GEMINI_API_KEY_HERE
# - YOUR_DEEPSEEK_API_KEY_HERE
# - YOUR_DOUBAO_API_KEY_HERE
# - YOUR_QWEN_API_KEY_HERE

# 3. 启动应用
uv run start-shelter
```

**配置说明：**
- 所有 API 密钥配置在 `models` 部分下
- 支持环境变量配置（如 `${API_KEY:-default_value}`）
- 未配置的 AI 模型将自动跳过

## 📚 详细文档

- [快速开始](docs/quick_start.md) - 安装和基本使用
- [配置说明](docs/configuration.md) - 端口、环境变量等配置
- [部署指南](docs/deployment.md) - 服务器部署和Docker部署
- [开发指南](docs/development.md) - 开发模式和调试

## 🛠️ 启动模式

| 模式 | UV 命令 | 传统命令 | 适用场景 |
|------|---------|----------|----------|
| 正常模式 | `uv run start-shelter` | `python start_app.py` | 日常使用、演示 |
| 开发模式 | `uv run dev` | `python start_app.py --dev` | 前端开发 |
| 调试模式 | `uv run debug` | `python start_app.py --debug` | 问题调试 |

## 🌟 支持的AI模型

- **ChatGPT** (GPT-5.2) - 通过环境变量配置
- **Gemini** - Google AI模型
- **DeepSeek** - 深度求索模型
- **Doubao** - 字节跳动模型
- **Qwen** - 阿里云通义千问

## 📋 系统要求

- **Python**: 3.8+
- **Node.js**: 16.x+
- **npm**: 8.x+
- **推荐**: 安装 UV（极速 Python 包管理器）

## 🆘 获取帮助

- 查看详细文档：`docs/` 目录
- 端口检测：`python tools/check_ports.py`
- 重启服务：`python tools/restart_api.py`

## 📄 许可证

MIT License

---

**开始使用**: [快速开始指南](docs/quick_start.md)