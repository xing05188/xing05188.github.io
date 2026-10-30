/* ============================================================
   星星导航 /links/ —— 搜索 / 筛选 / 收藏 / 最近访问 / 键盘导航
   零依赖，纯原生。数据在 HTML 里，本文件只做交互。
   ============================================================ */
(function () {
  'use strict';

  var page = document.querySelector('.navs-page');
  if (!page) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var input = $('#navs-q');
  var clearBtn = $('#navs-clear');
  var chips = $$('.navs-chip');
  var sections = $$('.navs-group');
  var countEl = $('#navs-count');
  var emptyEl = $('#navs-empty');
  var favN = $('#navs-fav-n');
  var descBtn = $('#navs-desc-btn');
  var recentBox = $('#navs-recent');
  var recentList = $('#navs-recent-list');

  var KEY_FAV = 'starnav.fav';
  var KEY_RECENT = 'starnav.recent';
  var KEY_DESC = 'starnav.desc';

  var state = { q: '', group: 'all' };
  var favs = [];
  var recent = [];

  /* ---------- 存储 ---------- */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------- 收藏 ---------- */
  function paintStars() {
    $$('.nav-card').forEach(function (c) {
      var star = $('.nc-star', c);
      if (!star) return;
      var on = favs.indexOf(c.dataset.url) > -1;
      star.classList.toggle('is-on', on);
      star.textContent = on ? '★' : '☆';
    });
    if (favN) favN.textContent = favs.length;
  }

  function toggleFav(card) {
    var url = card.dataset.url;
    var i = favs.indexOf(url);
    if (i > -1) favs.splice(i, 1);
    else favs.push(url);
    write(KEY_FAV, favs);
    paintStars();
    apply(false);
  }

  /* ---------- 最近访问 ---------- */
  function pushRecent(card) {
    var url = card.dataset.url;
    recent = recent.filter(function (r) { return r.url !== url; });
    recent.unshift({
      name: card.dataset.name,
      url: url,
      mark: (($('.nc-ico', card) || {}).textContent || '').trim()
    });
    recent = recent.slice(0, 6);
    write(KEY_RECENT, recent);
    paintRecent();
  }

  function paintRecent() {
    if (!recentBox || !recentList) return;
    if (!recent.length) { recentBox.hidden = true; return; }
    recentBox.hidden = false;
    recentList.innerHTML = '';
    recent.forEach(function (r) {
      var a = document.createElement('a');
      a.className = 'nr-item';
      a.href = r.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      var i = document.createElement('span');
      i.className = 'nr-i';
      i.textContent = r.mark || '✦';
      a.appendChild(i);
      a.appendChild(document.createTextNode(r.name));
      recentList.appendChild(a);
    });
  }

  /* ---------- 过滤渲染 ---------- */
  function apply(updateHash) {
    var q = state.q.trim().toLowerCase();
    var g = state.group;
    var total = 0;

    sections.forEach(function (sec) {
      var shown = 0;
      $$('.nav-card', sec).forEach(function (c) {
        var okG = g === 'all' ? true : (g === 'fav' ? favs.indexOf(c.dataset.url) > -1 : sec.dataset.group === g);
        var okQ = !q || c.dataset.title.indexOf(q) > -1 ||
                  c.dataset.desc.indexOf(q) > -1 || c.dataset.host.indexOf(q) > -1;
        var ok = okG && okQ;
        c.hidden = !ok;
        c.classList.toggle('is-hit', ok && !!q);
        if (ok) shown++;
      });
      sec.hidden = shown === 0;
      total += shown;
    });

    // 计数
    if (countEl) {
      if (q || g !== 'all') {
        countEl.hidden = false;
        if (g === 'fav') countEl.innerHTML = '收藏夹里有 <b>' + total + '</b> 个站点';
        else if (q) countEl.innerHTML = '搜到 <b>' + total + '</b> 个匹配「' + esc(state.q.trim()) + '」的站点';
        else countEl.innerHTML = '本分类共 <b>' + total + '</b> 个站点';
      } else {
        countEl.hidden = true;
      }
    }

    // 空状态
    if (emptyEl) {
      var empty = total === 0;
      emptyEl.hidden = !empty;
      if (empty) {
        var t = $('.ne-title', emptyEl);
        var tip = $('.ne-tip', emptyEl);
        var links = $('#navs-empty-links');
        if (g === 'fav' && !q) {
          t.textContent = '还没有收藏的站点';
          tip.textContent = '把鼠标移到卡片上，点右上角的 ☆ 就能收进来。';
          if (links) links.hidden = true;
        } else {
          t.textContent = '没找到匹配的站点';
          tip.textContent = '换个关键词，或者去搜索引擎找找：';
          if (links) {
            links.hidden = false;
            $$('a', links).forEach(function (a) {
              var base = a.dataset.base || a.href.split('q=')[0].split('wd=')[0];
              if (a.dataset.base) base = a.dataset.base;
              a.href = base + encodeURIComponent(state.q.trim());
            });
          }
        }
      }
    }

    if (clearBtn) clearBtn.hidden = !state.q;

    // hash 同步
    if (updateHash !== false) {
      var h = g === 'all' ? '' : '#' + g;
      if (location.hash !== h) {
        try { history.replaceState(null, '', location.pathname + location.search + h); } catch (e) {}
      }
    }
  }

  /* ---------- 分类切换 ---------- */
  function setGroup(g) {
    state.group = g;
    chips.forEach(function (c) {
      var on = c.dataset.group === g;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      setGroup(c.dataset.group);
      apply();
    });
  });

  /* ---------- 搜索 ---------- */
  if (input) {
    input.addEventListener('input', function () {
      state.q = input.value;
      apply();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var vis = visibleCards();
        if (vis.length === 1) {
          e.preventDefault();
          pushRecent(vis[0]);
          vis[0].click();
        }
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (input) { input.value = ''; input.focus(); }
      state.q = '';
      apply();
    });
  }

  /* ---------- 简介显隐 ---------- */
  function setDesc(on) {
    page.classList.toggle('hide-desc', !on);
    if (descBtn) descBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    write(KEY_DESC, on ? 1 : 0);
  }
  if (descBtn) {
    descBtn.addEventListener('click', function () {
      setDesc(descBtn.getAttribute('aria-pressed') !== 'true');
    });
  }

  /* ---------- 卡片点击：记最近访问 + 收藏星 ---------- */
  document.addEventListener('click', function (e) {
    var star = e.target.closest ? e.target.closest('.nc-star') : null;
    if (star) {
      e.preventDefault();
      e.stopPropagation();
      var card = star.closest('.nav-card');
      if (card) toggleFav(card);
      return;
    }
    var cardLink = e.target.closest ? e.target.closest('.nav-card') : null;
    if (cardLink) pushRecent(cardLink);
  }, true);

  /* ---------- 键盘：/ 聚焦、Esc 清空、方向键移动、Enter 打开 ---------- */
  function visibleCards() {
    return $$('.nav-card').filter(function (c) { return !c.hidden; });
  }

  function cols() {
    var grid = $('.navs-grid');
    if (!grid) return 1;
    var tpl = getComputedStyle(grid).gridTemplateColumns;
    if (!tpl || tpl === 'none') return 1;
    return tpl.trim().split(/\s+/).length || 1;
  }

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

    // Esc：退出搜索
    if (e.key === 'Escape') {
      if (state.q) {
        if (input) input.value = '';
        state.q = '';
        apply();
        return;
      }
      if (typing && input) input.blur();
      return;
    }

    // / 聚焦搜索
    if (e.key === '/' && !typing) {
      e.preventDefault();
      if (input) input.focus();
      return;
    }

    // 方向键 / Enter 只在卡片获得焦点时处理
    var active = document.activeElement;
    if (!active || !active.classList || !active.classList.contains('nav-card')) return;

    var list = visibleCards();
    var idx = list.indexOf(active);
    if (idx < 0) return;

    var next = -1;
    if (e.key === 'ArrowRight') next = idx + 1;
    else if (e.key === 'ArrowLeft') next = idx - 1;
    else if (e.key === 'ArrowDown') next = idx + cols();
    else if (e.key === 'ArrowUp') next = idx - cols();
    else if (e.key === 'Enter' || e.key === ' ') {
      // 原生 a 已处理 Enter
      return;
    }

    if (next > -1 && next < list.length) {
      e.preventDefault();
      list[next].focus();
    }
  });

  /* ---------- 初始化 ---------- */
  function init() {
    favs = read(KEY_FAV, []);
    if (!Array.isArray(favs)) favs = [];
    recent = read(KEY_RECENT, []);
    if (!Array.isArray(recent)) recent = [];

    // 空状态搜索链接的 base 记下来（避免每次重新截取）
    $$('#navs-empty-links a').forEach(function (a) {
      a.dataset.base = a.href.replace(/[?#].*$/, '').replace(/(q=|wd=)$/, '$1');
      if (a.dataset.base.slice(-2) !== 'q=' && a.dataset.base.slice(-3) !== 'wd=') {
        a.dataset.base = a.dataset.base + (a.href.indexOf('wd=') > -1 ? 'wd=' : 'q=');
      }
    });

    paintStars();
    paintRecent();

    // 简介：默认开；读过存档就按存档
    var d = read(KEY_DESC, 1);
    setDesc(d !== 0 && d !== false);

    // hash 还原分类
    var h = (location.hash || '').replace('#', '');
    if (h && chips.some(function (c) { return c.dataset.group === h; })) setGroup(h);

    apply(false);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
