# 开发指南

本文档详细说明 AI Shelter 的开发模式、调试技巧和代码结构。

## 启动模式说明

### 快速启动

#### 正常启动（推荐）
```cmd
python start_app.py
```
- 后端热重载：✅ 启用
- 前端自动构建：✅ 每次启动自动重新构建
- 前端热重载：❌ 不启用（使用构建后的静态文件）
- 访问地址：http://localhost:8000

#### 前端开发模式
```cmd
python start_app.py --dev
```
然后在另一个终端运行：
```cmd
cd shelter-ui
npm start
```
- 后端热重载：✅ 启用
- 前端热重载：✅ 启用（React开发服务器）
- 后端地址：http://localhost:8000
- 前端地址：http://localhost:3000

#### 完整调试模式
```cmd
python start_app.py --debug
```
然后在另一个终端运行：
```cmd
cd shelter-ui
npm start
```
- 后端热重载：✅ 启用
- 前端热重载：✅ 启用（React开发服务器）
- 详细日志：✅ 启用
- 后端地址：http://localhost:8000
- 前端地址：http://localhost:3000

## 参数说明

| 参数 | 说明 |
|------|------|
| 无参数 | 正常模式：自动构建前端，后端热重载 |
| `--dev` | 前端开发模式：跳过构建，需手动运行 `npm start` |
| `--debug` | 完整调试模式：详细日志 + 前端开发模式 |

## 工作原理对比

### 正常模式
```
用户 → http://localhost:8000
         ↓
    FastAPI服务器
         ↓
    静态文件服务（build目录）
         ↓
    React应用（已构建）
```

### 开发模式（--dev 或 --debug）
```
用户 → http://localhost:3000
         ↓
    React开发服务器
         ↓
    React应用（开发中）
         ↓
    API请求 → http://localhost:8000
```

## 修改代码后的行为

### 后端代码修改
- **所有模式**：自动热重载，修改Python代码后自动重启

### 前端代码修改
- **正常模式**：需要重新启动应用（会自动构建）
- **开发模式（--dev 或 --debug）**：自动热重载，修改后立即生效

## 推荐使用场景

### 日常使用
```cmd
python start_app.py
```
适合：日常使用、演示、测试

### 前端开发
```cmd
python start_app.py --dev
# 另一个终端
cd shelter-ui
npm start
```
适合：修改UI、样式、交互逻辑

### 问题调试
```cmd
python start_app.py --debug
# 另一个终端
cd shelter-ui
npm start
```
适合：追踪问题、查看详细日志

## 代码结构

### 后端结构
```
shelter_app/
├── app.py          # FastAPI主应用
├── run.py          # 启动脚本
├── models/         # 数据模型
├── services/       # 业务逻辑
└── utils/          # 工具函数

shelter_core/
├── ai_models.py    # AI模型接口
├── config.py       # 配置管理
└── logger.py       # 日志管理
```

### 前端结构
```
shelter-ui/
├── src/
│   ├── components/ # React组件
│   ├── pages/      # 页面组件
│   ├── hooks/      # 自定义Hooks
│   ├── utils/      # 工具函数
│   └── App.js      # 主应用组件
├── public/         # 静态资源
└── package.json    # 依赖配置
```

## 开发工具

### 端口检测工具
```bash
# 检测端口占用情况
python tools/check_ports.py
```

### API重启工具
```bash
# 重启后端服务
python tools/restart_api.py
```

### 环境变量检查
```bash
# 检查当前环境变量设置
echo $BACKEND_PORT
echo $FRONTEND_DEV_PORT
```

## 调试技巧

### 后端调试

#### 启用详细日志
```python
# 在开发模式下自动启用详细日志
# 或手动设置日志级别
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### API调试
```bash
# 测试API接口
curl http://localhost:8000/status
curl http://localhost:8000/api/chat
```

### 前端调试

#### React开发者工具
- 安装React Developer Tools浏览器插件
- 查看组件树和状态变化

#### 网络请求调试
- 使用浏览器开发者工具查看网络请求
- 检查API响应状态和内容

#### 控制台调试
```javascript
// 在组件中添加调试日志
console.log('组件状态:', state);
console.log('API响应:', response);
```

## 常见问题

### Q: 为什么前端修改没有生效？
**A:** 正常模式下需要重新启动应用（会自动重新构建前端）：
```cmd
python start_app.py
```
或者使用开发模式：
```cmd
python start_app.py --dev
# 然后运行 npm start
```

### Q: 如何同时调试前后端？
**A:** 使用完整调试模式：
```cmd
# 终端1：后端 + 前端模式提示
python start_app.py --debug

# 终端2：React开发服务器
cd shelter-ui
npm start
```

### Q: 前端开发模式和正常模式有什么区别？
**A:**
- **正常模式**：使用构建后的静态文件，每次启动自动重新构建
- **开发模式**：使用React开发服务器，支持热重载，适合开发调试

### Q: 如何查看后端日志？
**A:**
- 开发模式：日志直接输出到控制台
- 生产模式：查看 `logs/` 目录下的日志文件
- 调试模式：启用详细日志输出

### Q: 如何修改端口配置？
**A:** 通过环境变量设置：
```bash
# 设置后端端口
export BACKEND_PORT=8080

# 设置前端开发端口  
export FRONTEND_DEV_PORT=3001
```

---

**相关文档：**
- [快速开始](quick_start.md) - 安装和基本使用
- [配置说明](configuration.md) - 端口、环境变量等配置
- [部署指南](deployment.md) - 服务器部署和Docker部署