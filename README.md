# AI Shelter - 智能AI对话平台

![AI Shelter Demo](docs/example_v1.gif)

AI Shelter 是一个现代化的智能AI对话平台，支持多种AI模型（ChatGPT、Gemini、DeepSeek等），提供友好的用户界面和灵活的部署选项。

## ✨ 特性

- 🤖 **多模型支持**: ChatGPT、Gemini、DeepSeek、Doubao、Qwen
- 🚀 **前后端分离**: React + FastAPI 现代化架构
- 🔧 **灵活部署**: 支持本地开发、服务器部署、Docker部署
- ⚙️ **统一配置**: 环境变量统一管理，无需繁琐配置文件
- 🔄 **热重载**: 开发时自动重载，提高开发效率

## 🚀 快速开始

### 第一步：安装依赖
```bash
# 安装所有依赖和环境
python start_app.py install
```

### 第二步：启动应用
```bash
# 启动应用（仅启动，不安装）
python start_app.py
```

启动成功后访问：http://localhost:8000

**说明：**
- `install` 命令只安装依赖，不启动应用
- 启动命令只启动应用，不执行安装

## 📚 详细文档

- [快速开始](docs/quick_start.md) - 安装和基本使用
- [配置说明](docs/configuration.md) - 端口、环境变量等配置
- [部署指南](docs/deployment.md) - 服务器部署和Docker部署
- [开发指南](docs/development.md) - 开发模式和调试

## 🛠️ 启动模式

| 模式 | 命令 | 适用场景 |
|------|------|----------|
| 正常模式 | `python start_app.py` | 日常使用、演示 |
| 开发模式 | `python start_app.py --dev` | 前端开发 |
| 调试模式 | `python start_app.py --debug` | 问题调试 |

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

## 🆘 获取帮助

- 查看详细文档：`docs/` 目录
- 端口检测：`python tools/check_ports.py`
- 重启服务：`python tools/restart_api.py`

## 📄 许可证

MIT License

---

**开始使用**: [快速开始指南](docs/quick_start.md)