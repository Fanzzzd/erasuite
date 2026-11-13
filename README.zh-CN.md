# erasuite.dev

[English](README.md) · [erasuite.dev](https://erasuite.dev/)

这是 Era Suite 的官网仓库：一个首页，加上 EraMesh、EraDB 和 EraInfra 各一个产品页。所有 Era 仓库共用的代码风格指南也放在这里，见 [docs/style-guide.md](docs/style-guide.md)；各产品界面复制使用的设计变量见 [design/era-tokens.css](design/era-tokens.css)。

网站是纯 HTML 和 CSS，由 Cloudflare Worker 以静态资源方式提供。没有构建步骤，没有运行时依赖，不设 Cookie，也不从其他域名加载任何内容。

| 地址 | 文件 |
|---|---|
| [erasuite.dev](https://erasuite.dev/) | `public/index.html` |
| [mesh.erasuite.dev](https://mesh.erasuite.dev/) | `public/mesh/` |
| [db.erasuite.dev](https://db.erasuite.dev/) | `public/db/` |
| [infra.erasuite.dev](https://infra.erasuite.dev/) | `public/infra/` |

## 快速开始

需要 Node 22.13 或更高版本。`.nvmrc` 固定为 22.23.4，nvm、fnm 和 mise 都会自动读取。

```sh
git clone https://github.com/Fanzzzd/erasuite.git
cd erasuite
npm run check     # 代码检查、格式检查、文字检查、颜色对比度检查、路由测试
npm run dev       # 在 http://localhost:8787 预览 Worker
```

`npm run dev` 通过 `npx` 运行 Wrangler，第一次会先下载。不想启动 Worker 时，可以直接用 `python3 -m http.server -d public 8787` 提供静态文件，再打开 `/mesh/`、`/db/` 或 `/infra/`。子域名路由只在 Worker 下生效。

用 pnpm 也能运行同样的脚本（`pnpm check`、`pnpm dev`）。

## 工作方式

所有请求都由 [`src/worker.js`](src/worker.js) 处理：

- `db.erasuite.dev/x` 对应 `public/db/x`，`mesh` 和 `infra` 同理。`/assets/` 下的文件和 `/robots.txt` 由所有域名共用。
- `www.erasuite.dev` 重定向到 `erasuite.dev`。
- `erasuite.dev/db/...` 重定向到 `db.erasuite.dev/...`，其他产品同理。
- 不存在的路径返回 `public/404.html`。

[`test/worker.test.mjs`](test/worker.test.mjs) 用 Node 自带的断言覆盖这些规则，不依赖任何第三方包。

## 部署

推送到 `main` 时，GitHub Actions 先运行 `npm run check`，再用仓库密钥 `CLOUDFLARE_API_TOKEN` 执行 `wrangler deploy`（见 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)）。拉取请求只跑检查。部署只走这个工作流，仓库里没有本地部署脚本，所以不会误用其他 Cloudflare 账号部署。

## 修改页面

每个产品页的章节相同：适合谁、现在能做什么、和其他方案的比较、限制、如何获取。页面遵守三条规则：

- 每条事实都来自产品自己的 README、测试或发布记录。产品状态变化后，同一周内更新页面。
- 限制部分写明还做不到的事，赶在读者自己发现之前。
- 经常变化的版本号链接到产品的发布页，不手抄。

每个产品页的“What it looks like”部分展示三张界面截图，文件在 `public/<产品>/screens/`。每张截图有 1 倍和 2 倍两个 WebP 版本，由 Playwright 以浅色主题从开发版本截取，图中数据均为示例数据。界面改动后需要重新截图。

首页把每个产品画成岩层剖面里的一层，最新的在最上面。层的宽度表示发布阶段：开发中 40%，候选版本 70%，正式发布 100%。宽度由 `public/index.html` 和每个产品页侧栏里的 `--maturity` 值决定，所以这四个文件要一起改。

Archivo 字体自托管在 `public/assets/fonts/`，使用 SIL Open Font License（见 [`OFL.txt`](public/assets/fonts/OFL.txt)）。

## 开发

检查命令和提交规则见 [CONTRIBUTING.md](CONTRIBUTING.md)，给编程代理的说明见 [AGENTS.md](AGENTS.md)。

## 许可证

代码和文字使用 MIT 许可证（见 [LICENSE](LICENSE)）。Archivo 字体保留它自己的 SIL Open Font License 1.1。
