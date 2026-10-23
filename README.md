# 星记 · 个人博客

> 一半写给代码，一半写给自己。

一个基于 **Jekyll + GitHub Pages** 的个人博客，不使用任何第三方主题 ——
布局和样式全部手写，零前端框架，只依赖 GitHub Pages 允许列表内的插件（jemoji）。

在线地址：https://xing05188.github.io

---

## 特性

**阅读体验**
- 亮 / 暗 / 跟随系统**三态主题**，记忆选择，刷新不闪白
- 首屏 **Canvas 星空**（闪烁星点 + 流星，呼应"星记"），打字机轮播标语、每日一句
- 阅读进度条、文章页侧边目录（滚动高亮当前章节）、返回顶部
- **正文字号三档调节**（命令面板 / 快捷键），只影响正文不破坏排版
- 置顶文章、系列文章导航、相关文章推荐
- 入场动效编排，完整尊重 `prefers-reduced-motion`
- 主页交互：标题逐字渐入、星标伴生光标、卡片聚光灯 + 3D 微倾斜、标题悬停字符波浪、点赞粒子；彩蛋：输入 `wish` 召唤流星雨

**查找**
- 全文搜索：多关键词（AND）、**拼音首字母**（「jszn」→ 具身智能）、搜索历史与热词
- **命令面板**（<kbd>Ctrl/⌘</kbd>+<kbd>K</kbd>）：搜文章、跳页面、执行操作（切主题 / 随机文章 / 复制链接 / 调字号）
- 任意页按 <kbd>/</kbd> 聚焦搜索框，<kbd>?</kbd> 查看快捷键，<kbd>T</kbd> 切主题

**页面**
- 归档：年度文章产量图 + **标签筛选**（支持 `/archive/?tag=xxx` 直达）
- 标签：权重标签云 + 按主题分组
- **数据统计**：写作热力图、星期发文习惯、标签 Top、分类构成
- 书单 / 友链 / 时间线 / **系列合集 / 留言板** / 站点导航（数据驱动，改 `_data/site.yml` 即可）
- 实验室：老站点保留的 8 个好玩小页面

**文章页**
- 字数统计与阅读时长、更新日期、头图（`cover`）
- 图片灯箱（点击放大）、代码块语言标签 + 一键复制 + 长代码折叠
- **MathJax 数学公式**（`$...$` / `$$...$$`）
- 点赞（localStorage 防重复）、分享（复制 / 微博 / X / Telegram）
- 三种提示块（`{:.tip}` `{:.note}` `{:.warn}`）、emoji 短代码、脚注
- 版权卡片（CC BY-NC-SA 4.0）

**工程**
- **PWA**：可安装到桌面/主屏，离线可读，新版本就绪时提示刷新
- SEO：JSON-LD 结构化数据、canonical、Open Graph / Twitter 卡片（默认分享图自动生成）
- RSS **全文输出**、sitemap、robots.txt
- 评论：giscus（GitHub Discussions）配置就绪，见下文

---

## 本地预览

```bash
bundle install          # 首次：安装 jekyll 与 jemoji
bundle exec jekyll serve  # http://localhost:4000
```

构建产物在 `_site/` 目录。

---

## 写新文章

在 `_posts/` 目录新建文件，**文件名必须以日期开头**：

```
_posts/2026-10-18-my-new-post.md
```

front matter 模板：

```yaml
---
layout: post
title: "文章标题"
date: 2026-10-18 11:40:00 +0800
categories: [技术]
tags: [标签1, 标签2]
description: "一句话摘要，用于 SEO 和列表展示"
pinned: false          # 可选：置顶
series: ""             # 可选：系列名
updated: ""            # 可选：更新日期
cover: ""              # 可选：头图
---
```

然后正常写 Markdown。push 到 GitHub，约一分钟后生效。

> 文件名里的日期优先于 front matter 里的 `date`。
> 标题建议用英文单词做文件名 —— 它会成为 URL 的一部分。

---

## 工作台（/workbench/）

不想写代码也能管理博客：打开 https://xing05188.github.io/workbench/
（页脚「工作台」入口），输入访问密码即可进入。

- **默认密码**：`xingji2026`（SHA-256 哈希存在 `_data/workbench.yml`，可在工作台「设置 → 访问密码」里修改）
- **发布文章**：还需连接 GitHub Token —— 在 [github.com/settings/tokens](https://github.com/settings/tokens)
  创建 Fine-grained token，仅授权本仓库，权限勾选 `Contents: Read and write`。
  Token 只保存在当前标签页的 sessionStorage，关闭页面即失效
- 功能：文章增删改（表单化 front matter + Markdown 工具栏 + 实时预览 + Ctrl+S）、
  图片拖拽上传（自动压缩）、公告栏 / 友链 / 书单 / 时间线 / 每日一句 / 导航菜单可视化编辑、
  站点数据统计与健康检查、Pages 构建状态
- 草稿自动保存在浏览器 localStorage，断网也不丢；`/workbench/` 已加 `noindex` 且不进 Service Worker 缓存

---

## 目录结构

```
.
├── _config.yml           站点配置：标题、作者、导航、链接格式
├── _data/
│   ├── site.yml          公告 / 友链 / 书单 / 时间线 / 每日一句 等数据
│   └── workbench.yml     工作台配置（访问密码哈希 / 仓库信息 / 新文章默认值）
├── _layouts/             布局模板
│   ├── default.html      最外层骨架
│   ├── home.html         首页（星空 Hero + 今日一句）
│   ├── post.html         文章页（含 MathJax）
│   └── page.html         普通页面（归档 / 标签 / 关于 …）
├── _includes/            可复用片段（head / header / footer / sidebar / book-card）
├── _posts/               文章，命名 年-月-日-标题.md
├── assets/
│   ├── css/main.css      全部样式（含亮暗两套变量）
│   ├── css/syntax.css    代码高亮配色（GitHub 风格）
│   ├── js/main.js        主题 / 命令面板 / 搜索 / 星空 / 灯箱 / 阅读字号 等交互
│   ├── js/posts-data.js  全站文章速查索引（构建生成）
│   ├── js/pinyin-data.js 汉字拼音映射（构建生成，供拼音搜索）
│   └── img/              图标、 favicon、OG 分享图（PIL 生成）
├── index.html            首页
├── archive.html          归档页（标签筛选）
├── tags.html             标签页
├── stats.html            数据统计页（热力图 / 产量 / 习惯）
├── series.html           系列合集页
├── search.html           搜索页
├── guestbook.md          留言板（giscus）
├── friends.md            友链页
├── books.md              书单页
├── timeline.md           时间线页
├── nav.html              站点导航页
├── workbench.html        工作台（管理员界面，密码 + GitHub Token）
├── about.md              关于页
├── 404.html              404（随机推荐文章）
├── feed.xml              RSS（全文输出）
├── sitemap.xml           站点地图
├── robots.txt            爬虫协议（Disallow: /workbench/）
├── manifest.webmanifest  PWA 清单
├── sw.js                Service Worker（离线缓存 + 更新提示）
└── lab/                  老站点保留的小页面
```

`assets/js/` 下：`main.js`（前台交互）、`workbench.js`（工作台应用）、
`md.js`（工作台内置迷你 Markdown 渲染器）、`posts-data.js` / `pinyin-data.js`（构建生成）、
`assets/css/` 下：`main.css`（前台）、`workbench.css`（工作台）。

---

## 自定义

### 改站点信息

编辑 `_config.yml` 的 `title / tagline / description / owner / nav`。

### 改公告栏

编辑 `_data/site.yml` 的 `notice`：改文案、换链接，或 `enabled: false` 关掉。
访客关闭过就记住；换 `id` 相当于新公告，会重新展示。

### 加友链 / 书单 / 时间线

都在 `_data/site.yml` 里，照现有格式追加即可，页面自动更新。

### 改配色

所有颜色都是 CSS 变量，在 `assets/css/main.css` 顶部：

```css
:root {
  --bg:      #fbfaf8;   /* 纸色背景 */
  --text:    #24231f;   /* 正文 */
  --accent:  #2f6b5f;   /* 墨绿主色 */
  --gold:    #b98a1d;   /* 暖金点缀 */
}
[data-theme="dark"] { /* 暗色覆盖 */ }
```

### 开启评论（giscus）

1. 打开 https://github.com/apps/giscus ，Install，仅授权本仓库
2. 编辑 `_layouts/post.html` 与 `guestbook.md`，把底部注释里的 `<div class="comments">…</div>` 放出来
   （`repo-id` 与 `category-id` 已填好，Discussions 已开启）

### 重新生成图标 / 分享图 / 拼音映射

用 Python + Pillow + pypinyin 重跑生成脚本即可（脚本逻辑见仓库提交历史），
或直接改 `assets/img/` 里的成品文件。

---

## 发布

GitHub Pages 设置路径：

**Settings → Pages → Source → Deploy from a branch → `main` / `/ (root)`**

绑定自定义域名：在 **Custom domain** 填入域名，然后在域名服务商处添加一条
CNAME 记录指向 `xing05188.github.io`。

---

## 技术说明

- 生成器：Jekyll 4.4（GitHub Pages 原生支持，无需 CI）
- Markdown：kramdown（GFM），代码高亮 Rouge
- 插件：仅 jemoji（在 GitHub Pages 允许列表内）
- 零前端框架 —— 原生 JS，模块化 IIFE 组织
- 推送方式：Git Data API（`git/blobs` → `git/trees` → `git/commits` → `git/refs`）
