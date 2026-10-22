---
layout: page
title: 书单
description: 在读、想读与读完
permalink: /books/
---

{% assign reading = site.data.site.books | where: "status", "reading" %}
{% assign wish = site.data.site.books | where: "status", "wish" %}
{% assign done = site.data.site.books | where: "status", "done" %}

<div class="books-summary">
  <span>共 <b>{{ site.data.site.books.size }}</b> 本</span>
  <span class="dot">·</span>
  <span>读完 <b>{{ done.size }}</b></span>
  <span class="dot">·</span>
  <span>在读 <b>{{ reading.size }}</b></span>
  <span class="dot">·</span>
  <span>想读 <b>{{ wish.size }}</b></span>
</div>

{% if reading.size > 0 %}
<h3 class="books-heading">在读</h3>
<div class="books-list">
  {% for b in reading %}{% include book-card.html book=b %}{% endfor %}
</div>
{% endif %}

{% if wish.size > 0 %}
<h3 class="books-heading">想读</h3>
<div class="books-list">
  {% for b in wish %}{% include book-card.html book=b %}{% endfor %}
</div>
{% endif %}

{% if done.size > 0 %}
<h3 class="books-heading">读完</h3>
<div class="books-list">
  {% for b in done %}{% include book-card.html book=b %}{% endfor %}
</div>
{% endif %}

{% if site.data.site.books.size == 0 %}
<p style="color:var(--text-mute)">书单还是空的。在 <code>_data/site.yml</code> 的 <code>books:</code> 下按格式添加即可。</p>
{% endif %}

<style>
  .books-summary {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    font-size: .9rem;
    color: var(--text-mute);
    margin-bottom: 26px;
  }
  .books-summary b { color: var(--accent); }
  .books-summary .dot { opacity: .5; }
  .books-heading {
    font-size: 1.05rem;
    margin: 28px 0 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .books-heading::before {
    content: "";
    width: 3px; height: 15px;
    border-radius: 2px;
    background: var(--accent);
  }
  .books-list { display: flex; flex-direction: column; gap: 12px; }
  .book-card {
    display: flex;
    gap: 16px;
    padding: 16px 18px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elev);
    transition: all .22s var(--ease);
  }
  .book-card:hover { border-color: var(--accent); box-shadow: var(--shadow-sm); transform: translateX(3px); }
  .book-cover {
    flex: none;
    width: 44px; height: 60px;
    display: grid; place-items: center;
    border-radius: 4px 8px 8px 4px;
    background: linear-gradient(160deg, var(--accent), color-mix(in srgb, var(--accent) 58%, #16332c));
    color: #fff;
    font-family: var(--font-serif);
    font-size: 1.25rem;
    font-weight: 700;
    box-shadow: var(--shadow-sm);
    position: relative;
  }
  .book-cover::before {
    content: "";
    position: absolute;
    left: 5px; top: 0; bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, .28);
  }
  .book-body { flex: 1; min-width: 0; }
  .book-title { font-weight: 700; font-size: 1rem; }
  .book-title a { color: var(--text); }
  .book-title a:hover { color: var(--accent); }
  .book-author { font-size: .8rem; color: var(--text-mute); margin: 2px 0 6px; }
  .book-note { font-size: .88rem; color: var(--text-soft); margin: 0; line-height: 1.65; }
  .book-stars { color: var(--gold); font-size: .82rem; letter-spacing: 2px; margin-top: 6px; }
  .book-stars .off { color: var(--border); }
</style>
