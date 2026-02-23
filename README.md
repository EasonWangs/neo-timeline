# neo-timeline

本项目使用静态 HTML/CSS/JS 绘制时间线，开发服务器已切换为 Vite（仅开发模式）。

## 本地运行

```bash
npm install
npm run dev
```

启动后访问：

- http://localhost:5173/index.html

## 说明

- 入口页面：`index.html`
- 时间线页面：`timeline.html?name=<dataset>&title=<title>`
- 数据目录：`data/*.json5`
- 当前仅提供开发服务器，不包含 `build/preview` 流程。
