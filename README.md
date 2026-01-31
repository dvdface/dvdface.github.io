# 静态网站

基于纯 HTML/CSS/JS 的静态站点，适用于 GitHub Pages。

## 目录结构

```
├── index.html          # 首页
├── posts/              # 文章或子页面
├── assets/
│   ├── css/style.css   # 主样式
│   ├── js/main.js      # 主脚本
│   └── images/         # 图片资源
└── README.md
```

## 使用

- 在浏览器中直接打开 `index.html` 或通过 GitHub Pages 访问。
- 在 `posts/` 下添加 HTML 或 Markdown 页面作为文章。
- 在 `assets/images/` 中放置图片并可在页面中引用。

## 托管

推送到 GitHub 后，在仓库设置中启用 GitHub Pages（Source: main branch），即可通过 `https://<username>.github.io/<repo>/` 访问。
