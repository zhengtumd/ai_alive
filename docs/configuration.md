# 配置说明

本文档详细说明 AI Shelter 的配置选项，包括端口配置、环境变量、API密钥等。

## 端口配置

### 默认端口配置

- **后端服务端口**: 8000
- **前端开发服务端口**: 3000

### 修改端口配置

#### 方式一：通过环境变量（推荐）

```bash
# Windows
set BACKEND_PORT=8080
set FRONTEND_DEV_PORT=3001

# Linux/Mac
export BACKEND_PORT=8080
export FRONTEND_DEV_PORT=3001

# 然后启动应用
python start_app.py
```

#### 方式二：在启动时设置环境变量

```bash
# Windows
set BACKEND_PORT=8080 && python start_app.py

# Linux/Mac
BACKEND_PORT=8080 python start_app.py
```

### 端口配置说明

#### 后端端口 (BACKEND_PORT)
- 默认值：8000
- 作用：FastAPI 后端服务运行的端口
- 影响：所有模式下的后端服务访问地址

#### 前端开发端口 (FRONTEND_DEV_PORT)
- 默认值：3000
- 作用：开发模式下 React 开发服务器运行的端口
- 影响：仅在开发模式下使用

## API密钥配置

### 环境变量列表

#### ChatGPT (GPT-5.2)
- `CHATGPT_API_KEY` - API密钥
- `CHATGPT_API_BASE` - API地址（可选，默认：https://api.n1n.ai/v1）

#### Gemini
- `GEMINI_API_KEY` - API密钥
- `GEMINI_API_BASE` - API地址（可选，默认：https://api.n1n.ai/v1）

#### DeepSeek
- `DEEPSEEK_API_KEY` - API密钥
- `DEEPSEEK_API_BASE` - API地址（可选，默认：https://api.deepseek.com/）

#### Doubao (字节跳动)
- `DOUBAO_API_KEY` - API密钥
- `DOUBAO_API_BASE` - API地址（可选，默认：https://ark.cn-beijing.volces.com/api/v3）

#### Qwen (阿里云)
- `QWEN_API_KEY` - API密钥
- `QWEN_API_BASE` - API地址（可选，默认：https://dashscope.aliyuncs.com/compatible-mode/v1）

### 使用方法

#### 1. 设置环境变量（推荐）

**Linux/Mac:**
```bash
export CHATGPT_API_KEY="your_api_key_here"
export DEEPSEEK_API_KEY="your_api_key_here"
# 设置其他需要的环境变量
```

**Windows (PowerShell):**
```powershell
$env:CHATGPT_API_KEY="your_api_key_here"
$env:DEEPSEEK_API_KEY="your_api_key_here"
# 设置其他需要的环境变量
```

#### 2. 使用 .env 文件

创建 `.env` 文件（确保在 `.gitignore` 中）：
```env
CHATGPT_API_KEY=your_chatgpt_api_key
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
DOUBAO_API_KEY=your_doubao_api_key
QWEN_API_KEY=your_qwen_api_key
```

### 优先级说明

环境变量 > 配置文件中的硬编码值

- 如果设置了环境变量，将使用环境变量的值
- 如果未设置环境变量，将使用配置文件中的值
- 如果环境变量和配置文件都为空，API调用将失败

## 配置文件结构

### 后端配置
配置文件：`config/ai_config.yaml`

```yaml
models:
  chatgpt:
    api_base: ${CHATGPT_API_BASE:-https://api.n1n.ai/v1}
    api_key: ${CHATGPT_API_KEY}
```

**支持的模型：**
- ChatGPT (GPT-5.2)
- Gemini
- DeepSeek
- Doubao (字节跳动)
- Qwen (阿里云)

## 端口冲突处理

启动脚本会自动检测端口冲突，并提供以下处理方式：

1. **自动检测**：检查端口是否被占用
2. **备用端口**：如果端口被占用，建议使用下一个可用端口
3. **用户确认**：用户可以选择是否使用备用端口

## 不同模式下的端口访问

### 正常模式
- **访问地址**: `http://localhost:{BACKEND_PORT}`
- **说明**: 前端构建文件由后端服务提供

### 开发模式
- **前端地址**: `http://localhost:{FRONTEND_DEV_PORT}`
- **后端地址**: `http://localhost:{BACKEND_PORT}`
- **说明**: 前端由 React 开发服务器独立运行

### 调试模式
- **前端地址**: `http://localhost:{FRONTEND_DEV_PORT}`
- **后端地址**: `http://localhost:{BACKEND_PORT}`
- **说明**: 同开发模式，但后端有详细日志输出

## 工具脚本端口配置

所有工具脚本都使用统一的端口配置：

- `tools/check_ports.py` - 检测端口可用性
- `tools/restart_api.py` - 重启后端服务

这些工具会自动使用环境变量中设置的端口。

## 最佳实践

1. **生产环境**：使用默认端口或通过系统环境变量配置
2. **开发环境**：可以通过命令行临时设置环境变量
3. **多实例部署**：为每个实例设置不同的端口
4. **容器化部署**：通过容器环境变量配置端口

## 故障排除

### 端口被占用
```bash
# 使用端口检测工具
python tools/check_ports.py

# 手动释放端口（Windows）
netstat -ano | findstr :8000
taskkill /PID <进程ID> /F

# 手动释放端口（Linux/Mac）
lsof -i :8000
kill -9 <进程ID>
```

### 配置不生效
- 确保环境变量在启动前设置
- 检查环境变量名称是否正确
- 重启终端或命令行窗口

### API调用失败
- 检查API密钥是否正确设置
- 确认API地址是否可访问
- 查看后端日志获取详细错误信息

## 注意事项

- 确保敏感信息（API密钥）不提交到版本控制系统
- 环境变量名称使用模型名称而非第三方服务商名称
- 支持自定义API地址，便于使用不同的代理或自建服务

---

**相关文档：**
- [快速开始](quick_start.md) - 安装和基本使用
- [部署指南](deployment.md) - 服务器部署和Docker部署
- [开发指南](development.md) - 开发模式和调试技巧