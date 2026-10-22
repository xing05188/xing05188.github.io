---
layout: page
title: 时间线
description: 博客与生活的大事儿小情
permalink: /timeline/
---

{% assign events = site.data.site.timeline | sort: "date" | reverse %}

<div class="timeline">
  {% for ev in events %}
  <div class="tl-item">
    <div class="tl-dot" aria-hidden="true"></div>
    <div class="tl-date">{{ ev.date | date: "%Y 年 %m 月 %d 日" }}</div>
    <div class="tl-body">
      {% if ev.kind == "post" and ev.post %}
        {% assign p = site.posts | where: "url", ev.post | first %}
        <div class="tl-title"><a href="{{ p.url | relative_url }}">{{ p.title }}</a></div>
      {% else %}
        <div class="tl-title">{{ ev.title }}</div>
      {% endif %}
      {% if ev.text %}<p class="tl-text">{{ ev.text }}</p>{% endif %}
    </div>
  </div>
  {% endfor %}
</div>

<h3 class="tl-section-title">文章足迹</h3>
<div class="tl-posts">
  {% for post in site.posts %}
  <a class="tl-post-row" href="{{ post.url | relative_url }}">
    <time>{{ post.date | date: "%Y-%m-%d" }}</time>
    <span class="tp-title">{{ post.title }}</span>
    <span class="tp-cat">{{ post.categories.first }}</span>
  </a>
  {% endfor %}
</div>

<style>
  .timeline {
    position: relative;
    margin: 30px 0 44px;
    padding-left: 26px;
  }
  .timeline::before {
    content: "";
    position: absolute;
    left: 7px; top: 6px; bottom: 6px;
    width: 2px;
    background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 18%, transparent));
    border-radius: 2px;
  }
  .tl-item { position: relative; padding: 0 0 30px 16px; }
  .tl-item:last-child { padding-bottom: 6px; }
  .tl-dot {
    position: absolute;
    left: -25px; top: 7px;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: var(--bg);
    border: 3px solid var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
    transition: transform .2s var(--ease);
  }
  .tl-item:hover .tl-dot { transform: scale(1.25); }
  .tl-date {
    font-size: .78rem;
    color: var(--text-mute);
    font-variant-numeric: tabular-nums;
    letter-spacing: .04em;
    margin-bottom: 4px;
  }
  .tl-title { font-weight: 700; font-size: 1.02rem; }
  .tl-title a { color: var(--text); }
  .tl-title a:hover { color: var(--accent); }
  .tl-text { font-size: .92rem; color: var(--text-soft); margin: 6px 0 0; line-height: 1.7; }

  .tl-section-title {
    font-size: 1.05rem;
    margin: 10px 0 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tl-section-title::before {
    content: "";
    width: 3px; height: 15px;
    border-radius: 2px;
    background: var(--gold);
  }
  .tl-posts { display: flex; flex-direction: column; }
  .tl-post-row {
    display: flex;
    align-items: baseline;
    gap: 14px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    color: var(--text);
    transition: background .18s var(--ease);
  }
  .tl-post-row:hover { background: var(--bg-soft); }
  .tl-post-row time { flex: none; font-size: .8rem; color: var(--text-mute); font-variant-numeric: tabular-nums; }
  .tl-post-row .tp-title { font-weight: 500; }
  .tl-post-row:hover .tp-title { color: var(--accent); }
  .tl-post-row .tp-cat {
    margin-left: auto;
    flex: none;
    font-size: .74rem;
    color: var(--text-mute);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 1px 9px;
  }
</style>
