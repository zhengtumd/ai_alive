# 启动模式说明

## 快速启动

### 正常启动（推荐）
```cmd
python start_app.py
```
- 后端热重载：✅ 启用
- 前端自动构建：✅ 每次启动自动重新构建
- 前端热重载：❌ 不启用（使用构建后的静态文件）
- 访问地址：http://localhost:8000

### 前端开发模式
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

### 完整调试模式
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

