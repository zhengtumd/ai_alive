# AI Shelter - AI 避难所模拟器

一个模拟 AI 代理在避难所中生存和互动的应用程序。

![演示视频](docs/example_v1.gif)

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [启动模式](#启动模式)
- [访问应用](#访问应用)
- [项目结构](#项目结构)
- [功能特性](#功能特性)
- [故障排除](#故障排除)
- [开发说明](#开发说明)

## 环境要求

### 必需软件

- **Python**: 3.8 或更高版本
- **Node.js**: 16.x 或更高版本
- **npm**: 随 Node.js 自动安装

### 系统支持

- ✅ Windows 10/11
- ✅ macOS 10.14+
- ✅ Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)

## 快速开始

### 一键启动（推荐）

启动脚本会自动检测环境、安装依赖并启动应用：

```bash
# Windows
start_app.bat

# Linux/Mac
chmod +x start_app.sh
./start_app.sh
```

或者直接使用 Python 脚本：

```bash
python start_app.py
```

### 手动启动

如果需要手动控制每个步骤，可以按照以下步骤：

#### 1. 创建虚拟环境

```bash
# Windows
python -m venv .venv

# Linux/Mac
python3 -m venv .venv
```

#### 2. 激活虚拟环境

```bash
# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate
```

#### 3. 安装 Python 依赖

```bash
pip install -r requirements.txt
```

#### 4. 安装前端依赖

```bash
cd shelter-ui
npm install
cd ..
```

#### 5. 配置环境变量

```bash
# 复制前端环境配置示例
cp shelter-ui/.env.example shelter-ui/.env

# 复制后端配置示例
cp config/ai_config.example.yaml config/ai_config.yaml

# 编辑 config/ai_config.yaml，填入你的 API 密钥
# shelter-ui/.env 使用默认配置即可（通常无需修改）
```

#### 6. 启动应用

使用启动脚本：
```bash
python start_app.py
```

或分别启动：

```bash
# 启动后端（终端1）
python shelter_app/run.py

# 启动前端（终端2）
cd shelter-ui
npm start
```

## 启动模式

应用支持三种启动模式：

### 正常模式（默认）
```bash
python start_app.py
```
- 每次启动自动重新构建前端
- 后端支持热重载
- 前端静态文件通过后端 8000 端口服务
- 访问地址：http://localhost:8000
- 适用场景：日常使用，确保前端代码最新

### 开发模式
```bash
python start_app.py --dev
```
- 跳过前端构建
- 后端支持热重载
- 需要手动在另一个终端运行 `npm start` 启动前端
- 访问地址：http://localhost:3000
- 适用场景：前端开发，代码热重载

### 调试模式
```bash
python start_app.py --debug
```
- 跳过前端构建
- 后端详细日志输出
- 需要手动在另一个终端运行 `npm start` 启动前端
- 访问地址：http://localhost:3000
- 适用场景：问题排查，需要详细日志

> 💡 详细说明请查看 [启动模式文档](docs/START_MODES.md)

## 访问应用

### 端口说明

- **正常模式**：访问 http://localhost:8000
- **开发/调试模式**：访问 http://localhost:3000

### 端口配置

默认端口：
- 后端：8000
- 前端开发服务器：3000

如需修改端口，编辑 `shelter-ui/.env` 文件：

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_BACKEND_PORT=8000
REACT_APP_FRONTEND_PORT=3000
```

> ⚠️ 注意：正常模式下前端通过后端 8000 端口服务，此时 `REACT_APP_API_URL` 应为空字符串或相对路径。

## 项目结构

```
ai_alive/
├── README.md              # 项目说明文档
├── requirements.txt       # Python 依赖（固定版本）
├── start_app.py          # 主启动脚本（推荐）
├── start_app.bat         # Windows 快速启动
├── start_app.sh          # Linux/Mac 快速启动
├── scripts/              # 辅助脚本
│   └── create_venv.bat   # 虚拟环境创建脚本
├── tools/                # 工具脚本
│   └── check_ports.py    # 端口检测工具
├── docs/                 # 项目文档
├── shelter_app/          # FastAPI 后端应用
│   └── run.py           # 后端启动入口
├── shelter_core/         # 核心业务逻辑
├── shelter-ui/           # React 前端应用
│   ├── .env             # 前端环境配置
│   ├── package.json      # 前端依赖配置
│   └── src/             # 前端源代码
├── config/               # 配置文件
└── logs/                 # 日志文件目录
```

## 功能特性

- 🤖 多 AI 代理模拟互动
- 💬 实时聊天和投票系统
- 📊 消耗统计和监控
- 🔄 自动端口冲突检测
- 🌐 跨平台支持（Windows/macOS/Linux）
- 🎨 彩色终端输出
- 🚀 一键启动，自动环境配置
- 🔧 灵活的端口配置
- ♻️ 每次启动自动构建，确保代码最新
- 🚫 自动禁用浏览器缓存，避免版本混淆

## 故障排除

### 前端代码没有更新？

正常模式下，每次启动都会重新构建前端，确保代码最新。如果浏览器仍然显示旧版本：

1. **强制刷新浏览器**
   - Windows/Linux: `Ctrl + Shift + R` 或 `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **清空浏览器缓存**
   - 打开开发者工具（F12）
   - 右键点击刷新按钮，选择"清空缓存并硬性重新加载"

3. **使用无痕模式测试**
   - 验证是否为缓存问题

### Python 依赖安装失败

```bash
# 升级 pip
pip install --upgrade pip

# 清理缓存后重试
pip install --no-cache-dir -r requirements.txt
```

### 前端依赖安装失败

```bash
# 清理 npm 缓存
npm cache clean --force

# 删除 node_modules 后重装
cd shelter-ui
rm -rf node_modules package-lock.json  # Windows: rmdir /s /q node_modules
npm install
```

> 💡 Windows 用户注意：使用 `rmdir /s /q node_modules` 删除目录

### 构建失败

如果 `npm run build` 失败：

```bash
# 清理缓存
cd shelter-ui
rm -rf node_modules/.cache build  # Windows: rmdir /s /q node_modules\.cache build

# 重新构建
npm run build
```

> 💡 Windows 用户注意：使用 `rmdir /s /q` 删除目录

### 端口被占用

启动脚本会自动检测端口冲突，并提供选项使用备用端口。如果需要手动释放端口：

```bash
# Windows: 查找并终止占用端口的进程
netstat -ano | findstr :8000
taskkill /PID <进程ID> /F

# Linux/Mac: 查找并终止占用端口的进程
lsof -i :8000
kill -9 <进程ID>
```

### 虚拟环境问题

如果虚拟环境损坏，删除后重新创建：

```bash
# 删除虚拟环境
# Windows
rmdir /s /q .venv

# Linux/Mac
rm -rf .venv

# 重新创建
python -m venv .venv
```

## 开发说明

### 后端开发

后端基于 FastAPI 框架，使用 uvicorn 作为 ASGI 服务器。

```bash
# 开发模式启动（支持热重载）
uvicorn shelter_app.run:app --reload --host 0.0.0.0 --port 8000
```

### 前端开发

前端基于 React 框架。

```bash
cd shelter-ui
npm start
```

### 依赖管理

添加新依赖时，请使用固定版本：

```bash
# 安装新依赖
pip install package-name==1.0.0

# 更新 requirements.txt
pip freeze > requirements_new.txt
# 然后手动提取需要的包版本更新到 requirements.txt
```

### 浏览器缓存问题

应用已配置自动禁用浏览器缓存，但某些情况下可能仍需手动清除：

**为什么需要禁用缓存？**
- 前端代码更新后，浏览器可能缓存旧版本的 JS/CSS 文件
- 导致用户看到的还是旧版本，出现"代码没有更新"的问题

**如何解决：**
应用已通过 HTTP 响应头自动设置：
```
Cache-Control: no-store, no-cache, must-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```

如果仍遇到缓存问题，请按照 [前端代码没有更新？](#前端代码没有更新) 部分操作。

## 详细文档

- [启动模式说明](docs/START_MODES.md) - 查看不同启动模式的详细说明
- [docs/README.md](docs/README.md) - 获取完整的技术文档和配置说明

## 常见问题

**Q: 为什么正常模式下访问 8000 端口，开发模式下访问 3000 端口？**

A: 正常模式下，前端构建后的静态文件由后端 FastAPI 服务，所以访问 8000 端口即可。开发模式下，前端由 React 开发服务器独立运行在 3000 端口。

**Q: 每次启动都重新构建前端会不会很慢？**

A: 第一次构建可能需要 1-2 分钟，后续构建会快很多。这是为了确保你看到的总是最新代码。如果开发时不希望每次都构建，请使用 `--dev` 模式。

**Q: 浏览器缓存问题如何彻底解决？**

A: 应用已通过后端 HTTP 响应头自动禁用缓存，通常不需要手动干预。如果仍有问题，使用 `Ctrl + Shift + R` 强制刷新即可。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！