---
layout: post
title: "用 Jekyll 从零搭一个博客"
date: 2026-10-18 11:40:00 +0800
categories: [技术]
tags: [Jekyll, GitHub Pages, 博客]
description: "不装主题，从空目录开始搭一个能用的博客：目录结构、布局、数据文件、RSS、搜索。"
pinned: true
series: 搭站笔记
updated: 2026-10-22
---

这篇记录本站的搭建过程。目标很明确：**不依赖任何主题，从空目录开始，
搭一个能写 Markdown、能搜索、能订阅、手机上也好看的博客。**

## 为什么是 Jekyll

选型的时候考虑过 Hugo、Hexo、Astro。最后选 Jekyll，理由很实际：

| 方案 | 需要 CI 吗 | 本地要装什么 |
| --- | --- | --- |
| **Jekyll** | 不需要，GitHub Pages 原生支持 | Ruby |
| Hugo / Astro | 需要 GitHub Actions 构建 | Go / Node |

GitHub Pages 内置 Jekyll —— 你 push 一个 Markdown 文件上去，它自动帮你生成 HTML。
不用配 Actions，不用管构建缓存，这对"只想安静写点东西"来说太重要了。

代价是：Jekyll 比较老，构建速度一般，Ruby 环境在 Windows 上略麻烦。
但对个人博客这个量级（几十上百篇文章），这些都不算问题。

## 目录结构

一个最小可用的 Jekyll 站点长这样：

```
.
├── _config.yml          # 全局配置
├── _layouts/            # 布局模板
│   ├── default.html     #   最外层：head + header + footer
│   ├── home.html        #   首页
│   ├── post.html        #   文章页
│   └── page.html        #   普通页面
├── _includes/           # 可复用的片段
│   ├── head.html
│   ├── header.html
│   ├── footer.html
│   └── sidebar.html
├── _posts/              # 文章（文件名必须是 年-月-日-标题.md）
├── assets/
│   ├── css/
│   └── js/
├── index.html           # 首页
├── archive.html         # 归档页
├── tags.html            # 标签页
└── feed.xml             # RSS
```

记住两条规则：

1. **下划线开头的目录**是 Jekyll 的特殊目录，不会被原样输出
2. **没有下划线的文件**会被原样复制到 `_site/`（`assets/` 就是这么用的）

## 配置

`_config.yml` 里几项比较关键：

```yaml
title: 星记
description: 星的个人博客
url: "https://xing05188.github.io"
baseurl: ""

# 文章链接格式：/posts/文章标题/
permalink: /posts/:title/

markdown: kramdown
kramdown:
  input: GFM          # 支持表格、任务列表等 GitHub 风格语法
  syntax_highlighter: rouge
```

`permalink` 决定了文章 URL。默认那套 `/2026/10/18/title.html` 太长，
改成 `/posts/:title/` 干净很多。

## 写文章

在 `_posts/` 下新建文件，**文件名必须以日期开头**：

```
_posts/2026-10-18-jekyll-blog-from-scratch.md
```

开头写 front matter：

```yaml
---
layout: post
title: "用 Jekyll 从零搭一个博客"
date: 2026-10-18 11:40:00 +0800
categories: [技术]
tags: [Jekyll, GitHub Pages]
---
```

文件名里的日期和 front matter 里的日期冲突时，**以文件名为准**。

## 循环出文章列表

Jekyll 用 Liquid 模板。列出所有文章：

{% raw %}
```liquid
{% for post in site.posts %}
  <a href="{{ post.url }}">
    <time>{{ post.date | date: "%Y 年 %m 月 %d 日" }}</time>
    <h3>{{ post.title }}</h3>
    <p>{{ post.excerpt | strip_html | truncate: 96 }}</p>
  </a>
{% endfor %}
```
{% endraw %}

几个常用的变量：

- `site.posts` —— 所有文章，按日期倒序
- `site.tags` —— 标签到文章列表的映射
- `post.excerpt` —— 摘要（默认取正文第一段）
- `post.categories` / `post.tags` —— 分类和标签

按年份分组归档：

{% raw %}
```liquid
{% assign by_year = site.posts | group_by_exp: "post", "post.date | date: '%Y'" %}
{% for year in by_year %}
  <h2>{{ year.name }}</h2>
  {% for post in year.items %}
    <a href="{{ post.url }}">{{ post.title }}</a>
  {% endfor %}
{% endfor %}
```
{% endraw %}

## 一个坑：中文标签的锚点

做标签页时我踩了个坑。原本想用 Liquid 的 `slugify` 生成锚点 id：

{% raw %}
```liquid
<a href="#{{ tag_name | slugify }}">{{ tag_name }}</a>
```
{% endraw %}

结果中文标签的 id 全是空的 —— 因为 `slugify` 默认会把所有非 ASCII 字符删掉，
"技术" 两个字符全被删了。

改成手工处理就行：

{% raw %}
```liquid
{% assign tag_id = tag_name | downcase | replace: " ", "-" %}
<a href="#{{ tag_id }}">{{ tag_name }}</a>
```
{% endraw %}

中文原样保留在 id 里，浏览器会自己做 URL 编码，跳转正常。

## 前端搜索

不想引入 Algolia 这类服务，所以做了个纯前端方案：
生成一个 JSON 索引，浏览器 fetch 下来本地匹配。

`search.json`：

{% raw %}
```liquid
---
layout: null
---
[
  {% for post in site.posts %}
  {
    "title": {{ post.title | jsonify }},
    "url":   {{ post.url | relative_url | jsonify }},
    "date":  {{ post.date | date: "%Y-%m-%d" | jsonify }},
    "content": {{ post.content | strip_html | collapse_whitespace | truncate: 3000 | jsonify }}
  }{% unless forloop.last %},{% endunless %}
  {% endfor %}
]
```
{% endraw %}

重点是 `jsonify` —— 它会正确处理引号、换行、中文转义。
**千万不要手写 `"{{ post.title }}"`，标题里有个引号 JSON 就废了。**

然后写几十行 JS 做匹配和高亮就行，本站的搜索一共不到 80 行。

## 暗色模式

三个要点：

**1. 避免刷新闪白** —— 在 `<head>` 里同步执行一段脚本，先定好主题再渲染页面：

```html
<script>
(function () {
  var t = localStorage.getItem('theme');
  if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
})();
</script>
```

**2. CSS 用变量 + 属性选择器**：

```css
:root { --bg: #fbfaf8; --text: #24231f; }
[data-theme="dark"] { --bg: #14171a; --text: #e7e4de; }
```

**3. 尊重系统偏好**：只在用户没手动切过时跟随系统。

## 发布

GitHub Pages 的发布流程就这么几步：

1. 仓库命名为 `用户名.github.io`
2. Settings → Pages → Source 选 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`
3. push，等一分钟

想绑定自己的域名的话，在 `Settings → Pages → Custom domain` 填域名，
然后在域名服务商那里加一条 CNAME 记录指向 `用户名.github.io`。

## 一点体会

整个站点写下来，CSS 大概 900 行，JS 不到 300 行，没有一行依赖外部库。

回头看，**自己写主题的成本比想象中低** —— 因为你只需要处理自己的那几种内容：
列表、文章、归档、标签。而通用主题之所以臃肿，是因为它得应付所有人。

如果你也想搭一个，我的建议是：别先在主题选择上耗一周。
拿默认主题跑起来，写一篇文章，然后再慢慢改 —— 反正改起来也就一个 CSS 文件的事。
