# neo-timeline

本项目使用 Vite 构建多页面时间线应用。页面脚本采用 ES Modules，JSON5 数据按时间线拆分并按需加载。

## 本地运行

```bash
npm install
npm run dev
```

启动后访问：

- http://localhost:5173/index.html

## 校验与构建

```bash
npm run validate:data
npm run build
npm run preview
```

生产文件输出到 `dist/`。GitHub Pages 工作流只会发布通过数据校验和 Vite 构建后的 `dist` 目录。

## 说明

- 入口页面：`index.html`
- 时间线页面：`timeline.html?name=<dataset>&title=<title>`
- 数据目录：`data/*.json5`
- 构建入口：`index.html`、`timeline.html`
