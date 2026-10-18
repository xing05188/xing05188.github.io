# 星记 · 个人博客

> 一半写给代码，一半写给自己。

一个基于 **Jekyll + GitHub Pages** 的个人博客，不使用任何第三方主题 ——
布局和样式全部手写，一个 CSS 文件、一个 JS 文件，零外部依赖。

在线地址：https://xing05188.github.io

---

## 特性

- **亮色 / 暗色**双主题，自动记忆选择，首次访问跟随系统偏好（刷新不闪白）
- **全文搜索**，纯前端实现（JSON 索引 + 本地匹配），按 `/` 即可聚焦搜索框
- **归档**按年份分组，**标签**按主题聚合
- 文章页自动生成**侧边目录**（滚动高亮当前章节）
- **阅读进度条**、代码块一键复制、外链自动新窗口打开
- RSS 订阅、sitemap、Open Graph 卡片
- 移动端完整适配，响应式布局
- 尊重 `prefers-reduced-motion`，支持键盘导航与屏幕阅读器

---

## 本地预览

需要 Ruby 环境：

```bash
# 首次安装
gem install jekyll bundler

# 启动本地服务（默认 http://localhost:4000）
jekyll serve

# 或者只构建不启动
jekyll build
```

构建产物在 `_site/` 目录。

---

## 写新文章

在 `_posts/` 目录新建文件，**文件名必须以日期开头**：

```
_posts/2026-10-18-my-new-post.md
```

开头写 front matter：

```yaml
---
layout: post
title: "文章标题"
date: 2026-10-18 11:40:00 +0800
categories: [技术]
tags: [标签1, 标签2]
description: "一句话摘要，用于 SEO 和列表展示"
---
```

然后正常写 Markdown。push 到 GitHub，约一分钟后生效。

> 文件名里的日期优先于 front matter 里的 `date`。
> 标题建议用英文单词做文件名 —— 它会成为 URL 的一部分。

---

## 目录结构

```
.
├── _config.yml          站点配置：标题、作者、导航、链接格式
├── _layouts/            布局模板
│   ├── default.html     最外层骨架
│   ├── home.html        首页
│   ├── post.html        文章页
│   └── page.html        普通页面（关于 / 归档 / 标签 / 搜索）
├── _includes/           可复用片段（head / header / footer / sidebar）
├── _posts/              文章，命名 年-月-日-标题.md
├── assets/
│   ├── css/main.css     全部样式（含亮暗两套变量）
│   ├── css/syntax.css   代码高亮配色
│   └── js/main.js       搜索、目录、主题、进度条等交互
├── index.html           首页
├── archive.html         归档页
├── tags.html            标签页
├── search.html          搜索页
├── about.md             关于页
├── 404.html
├── feed.xml             RSS（自动生成）
├── sitemap.xml          站点地图（自动生成）
├── search.json          搜索索引（自动生成）
└── lab/                 老站点保留的小页面
```

---

## 自定义

### 改站点信息

编辑 `_config.yml`：

```yaml
title: 星记
tagline: 记录、分享与成长
description: 一句话描述
url: "https://xing05188.github.io"

owner:
  name: 星
  bio: 一句话自我介绍
  location: 上海
  github: xing05188
  email: your@mail.com

nav:
  - { name: 首页, url: "/" }
  - { name: 归档, url: "/archive/" }
```

### 改配色

所有颜色都是 CSS 变量，在 `assets/css/main.css` 顶部：

```css
:root {
  --bg:      #fbfaf8;   /* 背景 */
  --text:    #24231f;   /* 正文 */
  --accent:  #2f6b5f;   /* 强调色（墨绿） */
}

[data-theme="dark"] {
  --bg:      #14171a;
  --text:    #e7e4de;
  --accent:  #7cc6b1;
}
```

改这三组变量就能整体换色。

### 开启评论

站点预留了 [giscus](https://giscus.app)（基于 GitHub Discussions，免费无广告）：

1. 仓库 Settings → Features 勾选 **Discussions**
2. 安装 [giscus App](https://github.com/apps/giscus)
3. 在 giscus.app 生成你的 `repo-id` 和 `category-id`
4. 取消 `_layouts/post.html` 底部那段注释，填入两个 id

---

## 发布

GitHub Pages 设置路径：

**Settings → Pages → Source → Deploy from a branch → `main` / `/ (root)`**

绑定自定义域名：在 **Custom domain** 填入域名，然后在域名服务商处添加一条
CNAME 记录指向 `xing05188.github.io`。

---

## 技术说明

- 生成器：Jekyll 4.x（GitHub Pages 原生支持，无需配置 CI）
- Markdown：kramdown（GFM），代码高亮 Rouge
- 零插件依赖 —— RSS、sitemap、搜索索引全部用 Liquid 模板手写，
  所以本地和 GitHub Pages 的构建结果完全一致
- 零前端框架 —— 原生 JS，约 300 行
