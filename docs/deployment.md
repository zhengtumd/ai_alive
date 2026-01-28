# 部署指南

本文档详细说明 AI Shelter 在不同环境下的部署方法和最佳实践。

## 部署架构概述

AI Shelter 采用前后端分离架构：
- **后端**: FastAPI 服务，提供 API 接口
- **前端**: React 应用，构建后由后端服务静态文件
- **部署模式**: 前后端同域名部署，避免跨域问题

## 不同部署环境配置

### 1. 本地开发环境

**特点**: 前端和后端分别运行在不同端口

```bash
# 启动后端（端口8000）
python start_app.py --dev

# 启动前端开发服务器（端口3000，另一个终端）
cd shelter-ui
npm start
```

**API配置**: 前端使用 `http://localhost:8000` 访问后端

### 2. 本地生产环境（默认模式）

**特点**: 前端构建后由后端统一服务

```bash
# 启动应用（自动构建前端）
python start_app.py
```

**API配置**: 前端使用相对路径 `""` 访问后端（同域名）

### 3. 服务器部署环境

**特点**: 前后端部署在同一域名下

#### 端口配置
```bash
# 设置后端端口（如服务器80或443端口）
export BACKEND_PORT=80

# 启动应用
python start_app.py
```

#### 域名配置
- 前端通过相对路径访问后端 API
- 无需跨域配置，前后端同域名
- 支持 HTTPS 部署

## API配置优化说明

### 前端API配置逻辑
```javascript
// API配置：生产环境使用相对路径，开发环境使用完整URL
const API_URL = process.env.REACT_APP_API_URL || '';
```

**工作原理**:
- **生产环境**: `API_URL = ""` → 使用相对路径 `/api_endpoint`
- **开发环境**: 可设置 `REACT_APP_API_URL=http://your-server.com`

### 构建时环境变量
启动脚本在构建前端时自动设置：
```python
# 构建前端时设置生产环境变量
build_env["REACT_APP_API_URL"] = ""
```

## 部署步骤

### 方式一：使用 UV（推荐）

```bash
# 1. 安装 uv（如果未安装）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. 安装依赖
uv sync

# 3. 设置端口（如服务器80端口）
export BACKEND_PORT=80

# 4. 启动应用
uv run start-shelter
# 或者：python start_app.py
```

### 方式二：使用启动脚本（兼容模式）

```bash
# 1. 安装依赖
python start_app.py install

# 2. 设置端口（如服务器80端口）
export BACKEND_PORT=80

# 3. 启动应用
python start_app.py
```

### 方式二：手动部署

```bash
# 1. 构建前端
cd shelter-ui
npm run build

# 2. 启动后端（指定端口）
BACKEND_PORT=80 python shelter_app/run.py
```

## 服务器部署最佳实践

### Nginx反向代理配置
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API接口
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Docker部署
```dockerfile
FROM python:3.9

# 安装 uv（推荐）
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app
COPY . .

# 安装依赖（优先使用uv）
RUN if command -v uv >/dev/null 2>&1; then \
        uv sync --frozen; \
    else \
        pip install -r requirements.txt; \
    fi

# 构建前端
RUN cd shelter-ui && npm install && npm run build

# 设置端口
ENV BACKEND_PORT=80

# 启动应用
CMD ["python", "start_app.py"]
```

## 环境变量配置

### 后端环境变量
```bash
# 端口配置
export BACKEND_PORT=80

# API密钥配置（在config/ai_config.yaml中使用环境变量）
export CHATGPT_API_KEY=your_key
export CHATGPT_API_BASE=your_base_url
```

### 前端环境变量（开发环境）
```bash
# 开发环境设置后端地址
export REACT_APP_API_URL=http://your-server.com
```

## 故障排除

### 跨域问题
**症状**: 前端无法访问后端API

**解决方案**:
1. 确保使用相对路径（生产环境）
2. 检查后端CORS配置
3. 确认前后端同域名部署

### 静态文件404
**症状**: 页面能访问但资源加载失败

**解决方案**:
1. 确认前端构建成功
2. 检查后端静态文件服务配置
3. 验证构建路径正确

### 端口被占用
**症状**: 应用启动失败

**解决方案**:
1. 使用端口检测工具：`python tools/check_ports.py`
2. 设置备用端口：`export BACKEND_PORT=8080`
3. 终止占用进程

## 性能优化

### 前端优化
- 启用Gzip压缩
- 配置缓存策略
- 优化图片资源

### 后端优化
- 启用Gzip中间件
- 配置数据库连接池
- 使用CDN加速静态资源

## 安全配置

### HTTPS部署
```bash
# 使用Nginx配置SSL
# 或使用云服务商提供的SSL证书
```

### 防火墙配置
```bash
# 只开放必要端口
ufw allow 80
ufw allow 443
ufw enable
```

## 监控和维护

### 日志监控
- 后端日志：`logs/` 目录
- 前端错误：浏览器开发者工具

### 健康检查
```bash
# API健康检查
curl http://localhost:8000/status

# 端口检测
python tools/check_ports.py
```

## 版本更新

### 更新步骤（使用 UV）
1. 拉取最新代码
2. 重新安装依赖：`uv sync`
3. 重启应用：`uv run start-shelter`

### 更新步骤（使用 pip）
1. 拉取最新代码
2. 重新安装依赖：`python start_app.py install`
3. 重启应用：`python start_app.py`

### 回滚方案
1. 备份当前版本
2. 切换到旧版本标签
3. 重新部署

## 云服务商部署

### VPS部署
- 使用上述Nginx配置
- 配置SSL证书
- 设置防火墙规则

### 容器平台部署
- 使用Dockerfile构建镜像
- 配置容器环境变量
- 设置健康检查

### Serverless部署
- 需要调整后端为无状态架构
- 前端静态文件托管在CDN
- API网关配置

---

**总结**: AI Shelter 已优化为支持服务器部署，通过相对路径API调用避免跨域问题，简化了部署流程。

**相关文档：**
- [快速开始](quick_start.md) - 安装和基本使用
- [配置说明](configuration.md) - 端口、环境变量等配置
- [开发指南](development.md) - 开发模式和调试技巧