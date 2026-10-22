---
layout: page
title: 友链
description: 朋友们的小站
permalink: /friends/
---

这里是一些朋友们的小站。排名不分先后，按添加顺序排列。

<div class="friends-grid">
  {% for f in site.data.site.friends %}
  <a class="friend-card status-{{ f.status | default: 'active' }}" href="{{ f.url }}" target="_blank" rel="noopener noreferrer">
    <div class="fc-avatar">{{ f.name | slice: 0 }}</div>
    <div class="fc-body">
      <div class="fc-name">
        {{ f.name }}
        <span class="fc-dot" title="{% if f.status == 'sleep' %}暂停互访{% elsif f.status == 'lost' %}已失联{% else %}活跃{% endif %}"></span>
      </div>
      <p class="fc-desc">{{ f.desc }}</p>
      <div class="fc-url">{{ f.url | remove: "https://" | remove: "http://" | split: "/" | first }}</div>
    </div>
  </a>
  {% endfor %}
</div>

<div class="apply-box">
  <h3>交换友链</h3>
  <p>互换友链的朋友，可以在 <a href="https://github.com/xing05188/xing05188.github.io/issues" target="_blank" rel="noopener">GitHub Issues</a> 里留言，或者发邮件到 <a href="mailto:{{ site.owner.email }}">{{ site.owner.email }}</a>，格式如下：</p>
  <pre><code>名字：星记
地址：https://xing05188.github.io
简介：一半写给代码，一半写给自己。
头像：可选，留空则用名字首字</code></pre>
  <p class="apply-note">原则上互换，不拦截任何小站；若长期失联会移到「休眠」而不是删除。</p>
</div>

<style>
  .friends-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
    margin: 26px 0 34px;
  }
  .friend-card {
    display: flex;
    gap: 14px;
    padding: 18px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elev);
    color: var(--text);
    transition: all .24s var(--ease);
  }
  .friend-card:hover {
    border-color: var(--accent);
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
  }
  .friend-card.status-sleep { opacity: .62; }
  .friend-card.status-lost { opacity: .45; filter: grayscale(.6); }
  .fc-avatar {
    flex: none;
    width: 46px; height: 46px;
    display: grid; place-items: center;
    border-radius: 12px;
    background: linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #7aa898));
    color: #fff;
    font-family: var(--font-serif);
    font-size: 1.3rem;
    font-weight: 700;
  }
  .fc-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 5px;
  }
  .friend-card:hover .fc-name { color: var(--accent); }
  .fc-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #58a86e;
    box-shadow: 0 0 0 3px color-mix(in srgb, #58a86e 22%, transparent);
  }
  .status-sleep .fc-dot { background: var(--gold); box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 22%, transparent); }
  .status-lost .fc-dot { background: var(--text-mute); box-shadow: none; }
  .fc-desc { font-size: .88rem; color: var(--text-soft); margin: 0 0 6px; line-height: 1.6; }
  .fc-url { font-size: .76rem; color: var(--text-mute); font-family: var(--font-mono); }

  .apply-box {
    padding: 22px 24px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: var(--bg-soft);
  }
  .apply-box h3 { font-size: 1.05rem; margin-bottom: 10px; }
  .apply-box p { font-size: .92rem; color: var(--text-soft); }
  .apply-box pre {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    font-size: .84rem;
    overflow-x: auto;
  }
  .apply-note { font-size: .84rem; color: var(--text-mute); margin-top: 10px; }
</style>
