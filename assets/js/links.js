/* ============================================================
   星星导航 /links/ —— 搜索 / 筛选 / 收藏置顶 / 最近访问 / 右键菜单 / 键盘导航
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
  var sections = $$('.navs-group:not(.navs-favsec)');   // 收藏区不算分类
  var countEl = $('#navs-count');
  var emptyEl = $('#navs-empty');
  var favN = $('#navs-fav-n');
  var descBtn = $('#navs-desc-btn');
  var recentBox = $('#navs-recent');
  var recentList = $('#navs-recent-list');
  var favSec = $('#navs-favsec');
  var favGrid = $('#navs-fav-grid');
  var favDesc = $('#navs-fav-desc');
  var menuEl = $('#navs-menu');
  var toastEl = $('#navs-toast');

  var KEY_FAV = 'starnav.fav';
  var KEY_RECENT = 'starnav.recent';
  var KEY_DESC = 'starnav.desc';

  var state = { q: '', group: 'all' };
  var favs = [];
  var recent = [];
  var menuCard = null;

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
      star.setAttribute('aria-label', (on ? '取消收藏 ' : '收藏 ') + (c.dataset.name || ''));
    });
    if (favN) favN.textContent = favs.length;
  }

  /* 收藏置顶区：用克隆卡片渲染，原卡片留在分类里不动（避免重复的筛选/键盘逻辑） */
  function renderFavSec() {
    if (!favSec || !favGrid) return;
    var origin = {};
    $$('.nav-card').forEach(function (c) {
      if (!c.classList.contains('is-fav-clone')) origin[c.dataset.url] = c;
    });

    favGrid.innerHTML = '';
    var list = favs.slice().reverse().map(function (u) { return origin[u]; }).filter(Boolean);

    list.forEach(function (src) {
      var c = src.cloneNode(true);
      c.classList.add('is-fav-clone');
      c.classList.remove('is-hit');
      c.removeAttribute('id');
      favGrid.appendChild(c);
    });

    if (favDesc) {
      favDesc.textContent = list.length
        ? '共 ' + list.length + ' 个 · 右键卡片可取消收藏或复制链接'
        : '';
    }
    paintStars();
  }

  function toggleFav(card) {
    var url = card.dataset.url;
    var i = favs.indexOf(url);
    if (i > -1) { favs.splice(i, 1); toast('已取消收藏 ' + (card.dataset.name || '')); }
    else { favs.push(url); toast('已收藏 ' + (card.dataset.name || '')); }
    write(KEY_FAV, favs);
    renderFavSec();
    apply(false);
  }

  /* ---------- 最近访问 ---------- */
  function pushRecent(card) {
    var url = card.dataset.url;
    recent = recent.filter(function (r) { return r.url !== url; });
    recent.unshift({
      name: card.dataset.name,
      url: url,
      mark: card.dataset.mark || '✦'
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
  function match(c, q) {
    return !q || c.dataset.title.indexOf(q) > -1 ||
           c.dataset.desc.indexOf(q) > -1 || c.dataset.host.indexOf(q) > -1;
  }

  function apply(updateHash) {
    var q = state.q.trim().toLowerCase();
    var g = state.group;
    var total = 0;

    // 1) 分类区
    sections.forEach(function (sec) {
      var shown = 0;
      $$('.nav-card', sec).forEach(function (c) {
        var okG = g === 'all' ? true : sec.dataset.group === g;
        var ok = okG && match(c, q);
        c.hidden = !ok;
        c.classList.toggle('is-hit', ok && !!q);
        if (ok) shown++;
      });
      sec.hidden = shown === 0;
      total += shown;
    });

    // 2) 收藏置顶区：只在「全部」视图 + 有收藏 + 有关键词命中时出现
    var favShown = 0;
    if (favSec && favGrid) {
      $$('.nav-card', favGrid).forEach(function (c) {
        var ok = match(c, q);
        c.hidden = !ok;
        c.classList.toggle('is-hit', ok && !!q);
        if (ok) favShown++;
      });
      favSec.hidden = !(g === 'all' && favs.length > 0 && favShown > 0);
    }

    // 计数
    if (countEl) {
      if (q) {
        countEl.hidden = false;
        countEl.innerHTML = '搜到 <b>' + total + '</b> 个匹配「' + esc(state.q.trim()) + '」的站点';
      } else if (g !== 'all') {
        countEl.hidden = false;
        countEl.innerHTML = '本分类共 <b>' + total + '</b> 个站点';
      } else {
        countEl.hidden = true;
      }
    }

    // 空状态
    if (emptyEl) {
      var empty = total === 0 && favShown === 0;
      emptyEl.hidden = !empty;
      if (empty) {
        var t = $('.ne-title', emptyEl);
        var tip = $('.ne-tip', emptyEl);
        var links = $('#navs-empty-links');
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

  /* ---------- 轻提示 ---------- */
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.remove('is-in');
    void toastEl.offsetWidth;
    toastEl.classList.add('is-in');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-in');
      toastTimer = setTimeout(function () { toastEl.hidden = true; }, 220);
    }, 1700);
  }

  /* ---------- 复制链接 ---------- */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  function copyLink(url) {
    var ok = function () { toast('已复制链接 ' + url); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(ok, function () { fallbackCopy(url); ok(); });
    } else {
      fallbackCopy(url);
      ok();
    }
  }

  /* ---------- 右键菜单 ---------- */
  function openMenu(card, x, y) {
    if (!menuEl || !card) return;
    menuCard = card;

    var on = favs.indexOf(card.dataset.url) > -1;
    var lblOpen = $('.nm-item[data-act="open"] .nm-label', menuEl);
    var lblFav = $('.nm-item[data-act="fav"] .nm-label', menuEl);
    var favItem = $('.nm-item[data-act="fav"]', menuEl);
    if (lblOpen) lblOpen.textContent = '打开 ' + (card.dataset.name || '站点');
    if (lblFav) lblFav.textContent = on ? '取消收藏' : '添加收藏';
    if (favItem) favItem.classList.toggle('is-fav', on);

    menuEl.hidden = false;
    menuEl.style.left = '0px';
    menuEl.style.top = '0px';

    var w = menuEl.offsetWidth;
    var h = menuEl.offsetHeight;
    var pad = 8;
    var left = x + 2;
    var top = y + 2;
    // 贴边翻转，再兜一层强夹紧，保证永远在视口内
    if (left + w > window.innerWidth - pad) left = x - w - 2;
    if (top + h > window.innerHeight - pad) top = y - h - 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - h - pad));
    menuEl.style.left = left + 'px';
    menuEl.style.top = top + 'px';

    var first = $('.nm-item', menuEl);
    if (first) { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }
  }

  function closeMenu(refocus) {
    if (!menuEl || menuEl.hidden) return;
    menuEl.hidden = true;
    if (refocus && menuCard && menuCard.focus) {
      try { menuCard.focus({ preventScroll: true }); } catch (e) { menuCard.focus(); }
    }
    menuCard = null;
  }

  if (menuEl) {
    menuEl.addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('.nm-item') : null;
      if (!item) return;
      e.preventDefault();
      var card = menuCard;
      if (!card) return;
      var act = item.dataset.act;

      if (act === 'open') {
        pushRecent(card);
        closeMenu();
        window.open(card.dataset.url, '_blank', 'noopener');
      } else if (act === 'fav') {
        closeMenu();
        toggleFav(card);
      } else if (act === 'copy') {
        closeMenu();
        copyLink(card.dataset.url);
      }
    });

    menuEl.addEventListener('keydown', function (e) {
      var items = $$('.nm-item', menuEl);
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(i + 1 + items.length) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      } else if (e.key === 'Tab') {
        closeMenu();
      }
    });
  }

  // 右键卡片：拦掉原生菜单，弹自己的
  document.addEventListener('contextmenu', function (e) {
    var card = e.target.closest ? e.target.closest('.nav-card') : null;
    if (!card) { closeMenu(); return; }        // 页面其他地方保留系统菜单
    e.preventDefault();
    var x = e.clientX;
    var y = e.clientY;
    if (!x && !y) {                             // 键盘唤出（Shift+F10 / 菜单键）
      var r = card.getBoundingClientRect();
      x = r.left + 24;
      y = r.top + 24;
    }
    openMenu(card, x, y);
  });

  // 点别处 / 滚动 / 失焦 都收起
  document.addEventListener('pointerdown', function (e) {
    if (!menuEl || menuEl.hidden) return;
    if (e.target.closest && e.target.closest('#navs-menu')) return;
    closeMenu();
  }, true);
  window.addEventListener('scroll', function () { closeMenu(); }, { passive: true });
  window.addEventListener('resize', function () { closeMenu(); });
  window.addEventListener('blur', function () { closeMenu(); });

  /* ---------- 触屏长按 = 右键 ---------- */
  var lpTimer = null, lpPoint = null, lpCard = null;
  var suppressFor = null, suppressUntil = 0;

  document.addEventListener('touchstart', function (e) {
    var card = e.target.closest ? e.target.closest('.nav-card') : null;
    if (!card || e.touches.length !== 1) { return; }
    if (e.target.closest('.nc-star')) return;   // 星标点击不算长按
    lpCard = card;
    lpPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    clearTimeout(lpTimer);
    lpTimer = setTimeout(function () {
      if (!lpCard || !lpPoint) return;
      // 只吞掉「这张卡」在松手时的那次点击，避免误跳转；不影响随后点菜单
      suppressFor = lpCard;
      suppressUntil = Date.now() + 900;
      openMenu(lpCard, lpPoint.x, lpPoint.y);
    }, 520);
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!lpPoint || !e.touches.length) return;
    var dx = e.touches[0].clientX - lpPoint.x;
    var dy = e.touches[0].clientY - lpPoint.y;
    if (dx * dx + dy * dy > 100) { clearTimeout(lpTimer); lpPoint = null; }
  }, { passive: true });

  document.addEventListener('touchend', function () {
    clearTimeout(lpTimer);
    lpPoint = null;
    lpCard = null;
  }, { passive: true });

  /* ---------- 卡片点击：记最近访问 + 收藏星 ---------- */
  document.addEventListener('click', function (e) {
    if (suppressFor && Date.now() < suppressUntil) {
      var hit = e.target.closest ? e.target.closest('.nav-card') : null;
      if (hit === suppressFor) {
        e.preventDefault();
        e.stopPropagation();
        suppressFor = null;
        return;
      }
    }

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

  /* ---------- 键盘：/ 聚焦、Esc 关菜单 / 清空、方向键移动、Enter 打开 ---------- */
  function visibleCards(scope) {
    return $$('.nav-card', scope).filter(function (c) { return !c.hidden; });
  }

  function cols(grid) {
    if (!grid) return 1;
    var tpl = getComputedStyle(grid).gridTemplateColumns;
    if (!tpl || tpl === 'none') return 1;
    return tpl.trim().split(/\s+/).length || 1;
  }

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

    // 菜单打开时：Esc 收起，其余按键交给菜单自己
    if (menuEl && !menuEl.hidden) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu(true);
      }
      return;
    }

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

    var isClone = active.classList.contains('is-fav-clone');
    var list = visibleCards(isClone ? favGrid : null);
    var idx = list.indexOf(active);
    if (idx < 0) return;

    var next = -1;
    var n = cols(active.closest('.navs-grid'));
    if (e.key === 'ArrowRight') next = idx + 1;
    else if (e.key === 'ArrowLeft') next = idx - 1;
    else if (e.key === 'ArrowDown') next = idx + n;
    else if (e.key === 'ArrowUp') next = idx - n;
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

    // 站点清单变过时（站的 url 改了 / 站被删了）清掉失效收藏，避免计数虚高
    var known = {};
    $$('.nav-card').forEach(function (c) { known[c.dataset.url] = 1; });
    var pruned = favs.filter(function (u) { return known[u]; });
    if (pruned.length !== favs.length) { favs = pruned; write(KEY_FAV, favs); }

    // 空状态搜索链接的 base 记下来（避免每次重新截取）
    $$('#navs-empty-links a').forEach(function (a) {
      a.dataset.base = a.href.replace(/[?#].*$/, '').replace(/(q=|wd=)$/, '$1');
      if (a.dataset.base.slice(-2) !== 'q=' && a.dataset.base.slice(-3) !== 'wd=') {
        a.dataset.base = a.dataset.base + (a.href.indexOf('wd=') > -1 ? 'wd=' : 'q=');
      }
    });

    renderFavSec();
    paintRecent();

    // 图标兜底：图片加载失败就退回文字标 / emoji
    $$('.nc-ico.has-img img').forEach(function (img) {
      var box = img.closest('.nc-ico');
      function fallback() { if (box) box.classList.remove('has-img'); }
      img.addEventListener('error', fallback);
      if (img.complete && img.naturalWidth === 0) fallback();
    });

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
