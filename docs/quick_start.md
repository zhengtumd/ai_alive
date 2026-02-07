# 快速开始指南

本文档将指导您快速安装和启动 AI Shelter 应用。

## 安装和启动分离

AI Shelter 采用安装和启动分离的设计：
- **安装**：只安装依赖和环境，不启动应用
- **启动**：只启动应用，不执行安装

### 第一步：安装依赖
```bash
python start_app.py install
```
**功能：**
- 安装虚拟环境
- 安装Python依赖
- 安装前端依赖
- 设置安装标记

### 第二步：启动应用
```bash
python start_app.py
```
**功能：**
- 检查环境是否已安装
- 如果未安装，提示用户先运行安装命令
- 如果已安装，直接启动应用

## 安装检测机制

启动脚本会检查以下项目来判断是否已安装：

1. **安装标记**: `.installed` 标记文件是否存在
2. **虚拟环境**: `.venv` 目录是否存在
3. **Python依赖**: 是否安装了 `fastapi`, `uvicorn`, `yaml` 等核心包
4. **前端依赖**: `shelter_ui/node_modules` 是否存在

### 安装标记
安装完成后会创建 `.installed` 标记文件，后续启动时检测到此文件会跳过安装步骤。

## 完整的安装流程

### 1. 虚拟环境创建
```bash
python -m venv .venv
```

### 2. Python依赖安装
```bash
pip install -r requirements.txt
```

**核心依赖：**
- `fastapi` - Web框架
- `uvicorn` - ASGI服务器
- `python-dotenv` - 环境变量管理
- `pyyaml` - 配置文件解析

### 3. 前端依赖安装
```bash
cd shelter_ui
npm install
```

**前端框架：**
- React 18
- TypeScript
- Tailwind CSS

## 验证安装

### 手动验证
```bash
# 验证虚拟环境
.venv/Scripts/python -c "import fastapi, uvicorn, yaml"

# 验证前端依赖
cd shelter_ui && npm list
```

### 启动验证
```bash
python start_app.py
```

如果显示"检测到环境已安装，跳过安装步骤"，说明安装成功。

## 故障排除

### 安装失败

**虚拟环境创建失败：**
```bash
# 清理后重试
rmdir /s /q .venv  # Windows
rm -rf .venv      # Linux/Mac
python -m venv .venv
```

**Python依赖安装失败：**
```bash
# 升级pip
pip install --upgrade pip

# 清理缓存
pip cache purge

# 重新安装
pip install -r requirements.txt
```

**前端依赖安装失败：**
```bash
cd shelter_ui

# 清理缓存
npm cache clean --force

# 删除node_modules后重装
rm -rf node_modules package-lock.json
npm install
```

### 环境检测异常

如果启动脚本检测异常，可以删除标记文件强制重新安装：
```bash
rm .installed
python start_app.py install
```

## 下一步

- [配置说明](configuration.md) - 了解如何配置端口和API密钥
- [部署指南](deployment.md) - 了解服务器部署和Docker部署
- [开发指南](development.md) - 了解开发模式和调试技巧