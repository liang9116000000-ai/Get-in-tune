# 搭个调调 · 页面服务（Get-in-tune Pages）

把《搭个调调用户服务协议》等静态页面发布为可直接访问的 URL，供元服务上架资料中的
「用户服务协议」链接使用。TypeScript + Node.js 内置模块实现，**零运行时依赖**。

## 快速开始

要求：Node.js ≥ 18（本机验证环境为 Node 24）。

```bash
npm install        # 安装开发依赖（仅 typescript / @types/node）
npm run build      # 编译到 dist/
npm start          # 启动服务，默认 http://0.0.0.0:3000/
```

验证：

```bash
curl -i http://127.0.0.1:3000/                     # 200，返回用户服务协议页面
curl -i http://127.0.0.1:3000/healthz              # 200，{"ok":true,...}
curl -i http://127.0.0.1:3000/user-agreement.html  # 200
curl -i http://127.0.0.1:3000/not-exist            # 404
```

## 目录结构

```
src/server.ts                  页面服务实现（静态文件 + 路由 + 安全校验）
pages/user-agreement.html      《搭个调调用户服务协议》页面
tsconfig.json / package.json   构建配置
Dockerfile                     容器化部署（可选）
```

## 路由与环境变量

| 路径 | 说明 |
| --- | --- |
| `/` | 默认文档：`pages/user-agreement.html` |
| `/<文件名>.html` | `pages/` 目录下的任意静态页面 |
| `/healthz` | 健康检查，返回 `{"ok":true,"defaultDocument":"user-agreement.html"}` |

只允许 GET/HEAD；路径做了越界校验，无法读取 `pages/` 以外的文件。

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |

## 部署

直接运行（云主机 / 容器外）：

```bash
npm ci && npm run build
PORT=8080 node dist/server.js
```

Docker：

```bash
docker build -t get-in-tune-pages .
docker run -d --name get-in-tune-pages -p 3000:3000 get-in-tune-pages
```

生产环境建议在服务前置 Nginx 并配置 HTTPS（上架资料中的链接应为 https 地址）。

## 新增页面

把新的 HTML 文件放进 `pages/` 目录，重新走一遍 `npm run build`（无需重新编译，仅重新部署
`pages/` 即可）即可通过 `/<文件名>.html` 访问。例如后续补充《隐私政策》页面时，
放入 `pages/privacy-policy.html`。

## ⚠️ 上架前必须处理

协议正文中仍有待替换的占位符，发布前请确认已全部替换为真实信息：

- `【请填写运营主体名称】`（第 1 节）
- `【请填写运营主体注册地，精确到城市区域】`（第 7 节）
- `【请填写联系邮箱】`（第 8 节）
