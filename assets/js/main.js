/* ============================================================
   星记 · 交互脚本（零依赖，ES5 兼容）
   模块：主题三态 / 公告 / 导航 / 进度条 / 目录 / 搜索 / 命令面板 /
        代码块 / 星空画布 / 打字机 / 随机文章 / 点赞 / 分享 / 灯箱 / 动效 /
        阅读字号 / 快捷键帮助 / 归档标签筛选 / Service Worker 更新提示
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  doc.documentElement.setAttribute('data-js', '1');

  var $  = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 本地存储安全读写 ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    getJSON: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } },
    setJSON: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- Toast（支持带一个操作按钮） ---------- */
  var toastTimer = null;
  function toast(msg, actionLabel, actionFn) {
    var el = $('.toast');
    if (!el) {
      el = doc.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      doc.body.appendChild(el);
    }
    el.innerHTML = '';
    el.appendChild(doc.createTextNode(msg));
    if (actionLabel) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'toast-action';
      b.textContent = actionLabel;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (actionFn) actionFn();
        el.classList.remove('show');
      });
      el.appendChild(b);
      el.classList.add('clickable');
    } else {
      el.classList.remove('clickable');
    }
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, actionLabel ? 8000 : 2200);
  }

  /* ==========================================================
     1. 主题三态：亮 → 暗 → 跟随系统
     ========================================================== */
  (function initTheme() {
    var root = doc.documentElement;
    var btn = $('.theme-toggle');

    function systemDark() {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    function apply(mode) {
      var dark = mode === 'dark' || (mode === 'auto' && systemDark());
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      root.setAttribute('data-mode', mode);
      if (btn) {
        btn.setAttribute('aria-label', mode === 'auto' ? '主题：跟随系统' : (dark ? '切换到亮色模式' : '切换到暗色模式'));
        btn.title = '主题：' + (mode === 'auto' ? '跟随系统' : (dark ? '暗色' : '亮色')) + '（点击切换）';
      }
    }

    var mode = store.get('theme', 'auto');
    apply(mode);

    if (btn) {
      btn.addEventListener('click', function () {
        var order = { light: 'dark', dark: 'auto', auto: 'light' };
        var next = order[root.getAttribute('data-mode')] || 'light';
        apply(next);
        store.set('theme', next);
        toast(next === 'auto' ? '主题：跟随系统' : (next === 'dark' ? '已切换为暗色' : '已切换为亮色'));
      });
    }

    // 跟随系统（仅在 auto 模式下响应）
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () {
        if (root.getAttribute('data-mode') === 'auto') apply('auto');
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  })();

  /* ==========================================================
     2. 公告栏：按 id 记忆关闭状态
     ========================================================== */
  (function initNotice() {
    var bar = $('#notice-bar');
    if (!bar) return;
    var id = bar.getAttribute('data-notice-id');
    if (id && store.get('notice-dismissed', '') === id) {
      bar.classList.add('is-hidden');
      return;
    }
    var close = $('.notice-close', bar);
    if (close) {
      close.addEventListener('click', function () {
        bar.style.height = bar.offsetHeight + 'px';
        bar.classList.add('is-hidden');
        if (id) store.set('notice-dismissed', id);
      });
    }
  })();

  /* ==========================================================
     3. 顶栏：滚动阴影 + 移动端菜单 + 当前页高亮
     ========================================================== */
  (function initNav() {
    var header = $('.site-header');
    if (header) {
      var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 8); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    var toggle = $('.menu-btn');
    var menu = $('.nav-links');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menu.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var here = location.pathname.replace(/\/$/, '') || '/';
    $$('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href').replace(/\/$/, '') || '/';
      if (href === here || (href !== '/' && here.indexOf(href) === 0)) {
        a.classList.add('active');
      }
    });
  })();

  /* ==========================================================
     4. 阅读进度条 + 返回顶部
     ========================================================== */
  (function initScrollUI() {
    var bar = $('.progress-bar');
    var toTop = $('.to-top');

    function update() {
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      if (bar) bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
      if (toTop) toTop.classList.toggle('show', window.scrollY > 500);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
  })();

  /* ==========================================================
     5. 代码块：语言标签 + 一键复制 + 长代码折叠
     ========================================================== */
  (function initCode() {
    $$('.highlight').forEach(function (block) {
      var code = block.querySelector('code');
      if (!code) return;

      // 语言标签
      var m = (code.className || '').match(/language-([\w+#-]+)/i);
      if (m) {
        var label = doc.createElement('span');
        label.className = 'code-lang';
        label.textContent = m[1];
        block.appendChild(label);
      }

      // 复制按钮
      var btn = doc.createElement('button');
      btn.className = 'code-copy';
      btn.type = 'button';
      btn.setAttribute('aria-label', '复制代码');
      btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/>' +
                      '<path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>';
      btn.addEventListener('click', function () {
        var text = code.innerText;
        var done = function () {
          btn.classList.add('copied');
          btn.setAttribute('aria-label', '已复制');
          toast('代码已复制');
          setTimeout(function () {
            btn.classList.remove('copied');
            btn.setAttribute('aria-label', '复制代码');
          }, 1600);
        };
        function fallback() {
          var ta = doc.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          doc.body.appendChild(ta);
          ta.select();
          try { doc.execCommand('copy'); done(); } catch (e) {}
          doc.body.removeChild(ta);
        }
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done).catch(fallback);
        } else {
          fallback();
        }
      });
      block.appendChild(btn);

      // 长代码折叠（> 24 行）
      var pre = block.querySelector('pre');
      var lines = (code.innerText || '').split('\n').length;
      if (pre && lines > 24) {
        block.classList.add('is-folded');
        var fold = doc.createElement('div');
        fold.className = 'code-fold';
        var fbtn = doc.createElement('button');
        fbtn.type = 'button';
        fbtn.textContent = '展开全部 ' + lines + ' 行';
        fbtn.addEventListener('click', function () {
          var folded = block.classList.toggle('is-folded');
          fbtn.textContent = folded ? '展开全部 ' + lines + ' 行' : '收起代码';
        });
        fold.appendChild(fbtn);
        block.appendChild(fold);
      }
    });
  })();

  /* ==========================================================
     6. 文章目录（TOC）生成与滚动高亮
     ========================================================== */
  (function initToc() {
    var toc = $('.toc');
    var content = $('.post-content');
    if (!toc || !content) return;

    var heads = $$('h2, h3', content);
    if (heads.length < 2) { toc.remove(); return; }

    var title = doc.createElement('h4');
    title.textContent = '目录';
    toc.appendChild(title);

    var ul = doc.createElement('ul');
    heads.forEach(function (h, i) {
      if (!h.id) h.id = 'sec-' + i;
      var li = doc.createElement('li');
      li.className = h.tagName.toLowerCase() === 'h3' ? 'lv3' : 'lv2';
      var a = doc.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.replace(/#$/, '').trim();
      a.setAttribute('data-target', h.id);
      li.appendChild(a);
      ul.appendChild(li);
    });
    toc.appendChild(ul);
    toc.classList.add('ready');

    var links = $$('a', ul);

    function spy() {
      var pos = window.scrollY + 110;
      var current = heads[0];
      heads.forEach(function (t) {
        if (t.offsetTop <= pos) current = t;
      });
      links.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-target') === current.id);
      });
    }
    window.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', spy);
    spy();
  })();

  /* ==========================================================
     7. 拼音工具（配合 assets/js/pinyin-data.js）
     ========================================================== */
  var PY_MAP = window.PINYIN_MAP || {};
  function toPinyin(text) {
    var full = '', init = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var py = PY_MAP[ch];
      if (py) { full += py; init += py.charAt(0); }
      else if (/[a-z0-9]/i.test(ch)) { full += ch.toLowerCase(); init += ch.toLowerCase(); }
    }
    return { full: full, init: init };
  }

  /* ==========================================================
     8. 站内搜索页（多关键词 AND / 拼音 / 历史 / 热词）
     ========================================================== */
  (function initSearch() {
    var root = $('#search-root');
    if (!root) return;
    var input = $('#search-input', root);
    var out = $('#search-results', root);
    var hint = $('#search-hint', root);
    var chips = $('#search-chips', root);
    if (!input || !out) return;

    var indexUrl = root.getAttribute('data-index') || '/search.json';
    var posts = [];

    fetch(indexUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        posts = (data || []).map(function (p) {
          var basis = (p.title || '') + ' ' + (p.tags || []).join(' ') + ' ' + (p.category || '');
          var py = toPinyin(basis);
          p._pyFull = py.full;
          p._pyInit = py.init;
          return p;
        });
        if (hint) hint.textContent = '已索引 ' + posts.length + ' 篇文章，输入关键词开始搜索。';
        input.disabled = false;
        if (location.hash) run(input.value = decodeURIComponent(location.hash.slice(1)));
        renderChips();
      })
      .catch(function () {
        if (hint) hint.textContent = '索引加载失败，请确认 search.json 可访问。';
      });

    /* ---- 历史与热词 ---- */
    function getHistory() { return store.getJSON('search-history', []); }
    function pushHistory(kw) {
      var h = getHistory().filter(function (x) { return x !== kw; });
      h.unshift(kw);
      store.setJSON('search-history', h.slice(0, 8));
    }
    function bumpHot(kw) {
      var hot = store.getJSON('search-hot', {});
      hot[kw] = (hot[kw] || 0) + 1;
      store.setJSON('search-hot', hot);
    }
    function renderChips() {
      if (!chips) return;
      var history = getHistory();
      var hot = store.getJSON('search-hot', {});
      var hotKeys = Object.keys(hot).sort(function (a, b) { return hot[b] - hot[a]; }).slice(0, 5);
      var all = history.concat(hotKeys.filter(function (k) { return history.indexOf(k) === -1; })).slice(0, 8);
      chips.innerHTML = '';
      if (!all.length) return;
      var label = doc.createElement('span');
      label.className = 'chip-label';
      label.textContent = '最近搜过：';
      chips.appendChild(label);
      all.forEach(function (k) {
        var b = doc.createElement('button');
        b.type = 'button';
        b.textContent = k;
        b.addEventListener('click', function () { input.value = k; run(k); });
        chips.appendChild(b);
      });
    }

    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { run(input.value); }, 140);
    });
    input.addEventListener('change', function () { if (input.value.trim()) run(input.value); });

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function hl(text, kw) {
      var safe = esc(text);
      if (!kw) return safe;
      var re = new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return safe.replace(re, '<mark>$1</mark>');
    }

    function matchOne(p, kw) {
      var lower = kw.toLowerCase();
      var hay = [p.title, p.excerpt, (p.tags || []).join(' '), p.content].join(' ').toLowerCase();
      if (hay.indexOf(lower) !== -1) return true;
      // 纯英文关键词：尝试拼音全拼 / 首字母
      if (/^[a-z]+$/.test(lower)) {
        if (p._pyFull && p._pyFull.indexOf(lower) !== -1) return true;
        if (p._pyInit && p._pyInit.indexOf(lower) !== -1) return true;
      }
      return false;
    }

    function run(q) {
      var raw = (q || '').trim();
      out.innerHTML = '';
      if (!raw) {
        if (hint) hint.textContent = posts.length ? '已索引 ' + posts.length + ' 篇文章，输入关键词开始搜索。' : '';
        renderChips();
        return;
      }

      var kws = raw.split(/\s+/).filter(Boolean);
      var hits = posts.filter(function (p) {
        return kws.every(function (k) { return matchOne(p, k); });
      });

      // 命中越多关键词排越前，标题命中再加权
      hits.sort(function (a, b) {
        function score(p) {
          var s = 0;
          kws.forEach(function (k) {
            var t = (p.title || '').toLowerCase();
            if (t.indexOf(k.toLowerCase()) !== -1) s += 10;
            if ((p.tags || []).join(' ').toLowerCase().indexOf(k.toLowerCase()) !== -1) s += 5;
          });
          return s;
        }
        return score(b) - score(a);
      });

      if (hint) hint.textContent = hits.length ? '找到 ' + hits.length + ' 条结果' : '没有匹配的文章';
      if (raw && kws.length === 1 && raw.length >= 2) { pushHistory(raw); bumpHot(raw); renderChips(); }

      if (!hits.length) {
        out.innerHTML = '<div class="search-empty">换个关键词试试？支持拼音首字母，比如「jk」「博客」「git」。</div>';
        return;
      }

      hits.forEach(function (p) {
        var first = kws[0];
        var snippet = '';
        var idx = (p.content || '').toLowerCase().indexOf(first.toLowerCase());
        if (idx > -1) {
          var start = Math.max(0, idx - 40);
          snippet = (start > 0 ? '…' : '') + p.content.substr(start, 130).trim() + '…';
        }
        var el = doc.createElement('a');
        el.className = 'post-card';
        el.href = p.url;
        el.innerHTML =
          '<div class="pc-meta"><span class="pc-date">' + esc(p.date) + '</span>' +
          (p.category ? '<span class="pc-cat">' + esc(p.category) + '</span>' : '') + '</div>' +
          '<h3>' + hl(p.title, first) + '</h3>' +
          (snippet ? '<p class="pc-excerpt">' + hl(snippet, first) + '</p>' : '');
        out.appendChild(el);
      });
    }
  })();

  /* ==========================================================
     9. 命令面板（Ctrl/⌘ + K）：文章 + 页面 + 操作
     ========================================================== */
  (function initPalette() {
    var overlay = null, input = null, list = null;
    var built = false;
    var items = [];       // {type, title, hint, url, action, icon}
    var filtered = [];
    var sel = 0;

    var PAGES = [
      { title: '首页', url: '/', hint: '首页' },
      { title: '归档', url: '/archive/', hint: '全部文章' },
      { title: '标签', url: '/tags/', hint: '按主题浏览' },
      { title: '数据统计', url: '/stats/', hint: '热力图与产量' },
      { title: '系列合集', url: '/series/', hint: '按系列连读' },
      { title: '留言板', url: '/guestbook/', hint: '说点什么' },
      { title: '实验室', url: '/lab/', hint: '好玩的小页面' },
      { title: '关于', url: '/about/', hint: '关于我' },
      { title: '友链', url: '/friends/', hint: '朋友们' },
      { title: '书单', url: '/books/', hint: '在读与想读' },
      { title: '时间线', url: '/timeline/', hint: '生活碎片' },
      { title: '站点导航', url: '/nav/', hint: '全站目录' },
      { title: '搜索', url: '/search/', hint: '全文检索' }
    ];

    var ACTIONS = [
      { title: '切换主题（亮 / 暗 / 跟随系统）', hint: '操作', action: function () { $('.theme-toggle').click(); } },
      { title: '随便看看（随机一篇文章）', hint: '操作', action: randomPost },
      { title: '复制当前页面链接', hint: '操作', action: function () { copyText(location.href).then(function () { toast('链接已复制'); }); } },
      { title: '放大正文字号', hint: '阅读', action: function () { changeReadSize(1); } },
      { title: '缩小正文字号', hint: '阅读', action: function () { changeReadSize(-1); } },
      { title: '查看键盘快捷键', hint: '操作', action: function () { toggleHelp(); } },
      { title: '打开 RSS 订阅', url: '/feed.xml', hint: '操作' },
      { title: '打开 GitHub 主页', url: 'https://github.com/xing05188', hint: '外部', ext: true }
    ];

    function randomPost() {
      var posts = window.STAR_POSTS || [];
      if (!posts.length) { location.href = '/archive/'; return; }
      location.href = posts[Math.floor(Math.random() * posts.length)].url;
    }

    function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      return new Promise(function (resolve, reject) {
        var ta = doc.createElement('textarea');
        ta.value = text; ta.style.opacity = '0';
        doc.body.appendChild(ta); ta.select();
        try { doc.execCommand('copy'); resolve(); } catch (e) { reject(e); }
        doc.body.removeChild(ta);
      });
    }

    function build() {
      if (built) return;
      built = true;

      (window.STAR_POSTS || []).forEach(function (p) {
        items.push({ type: '文章', title: p.title, hint: p.date, url: p.url, py: toPinyin(p.title + ' ' + (p.tags || []).join(' ')) });
      });
      PAGES.forEach(function (p) {
        items.push({ type: '页面', title: p.title, hint: p.hint, url: p.url, ext: false, py: toPinyin(p.title) });
      });
      ACTIONS.forEach(function (a, i) {
        items.push({ type: '操作', title: a.title, hint: a.hint, url: a.url, action: a.action, ext: a.ext, py: toPinyin(a.title) });
      });
    }

    function ensureDom() {
      if (overlay) return;
      overlay = doc.createElement('div');
      overlay.className = 'palette-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', '命令面板');
      overlay.innerHTML =
        '<div class="palette">' +
          '<div class="palette-input-row">' +
            '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
            '<input type="text" id="palette-input" placeholder="搜索文章、跳转页面、执行操作…" autocomplete="off" spellcheck="false">' +
            '<kbd>Esc</kbd>' +
          '</div>' +
          '<div class="palette-results" id="palette-results"></div>' +
          '<div class="palette-footer">' +
            '<span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>' +
            '<span><kbd>Enter</kbd> 打开</span>' +
            '<span><kbd>Esc</kbd> 关闭</span>' +
          '</div>' +
        '</div>';
      doc.body.appendChild(overlay);
      input = $('#palette-input', overlay);
      list = $('#palette-results', overlay);

      input.addEventListener('input', function () { render(input.value); });
      input.addEventListener('keydown', onKey);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    }

    function open() {
      build();
      ensureDom();
      overlay.classList.add('open');
      input.value = '';
      render('');
      setTimeout(function () { input.focus(); }, 60);
    }
    function close() {
      if (overlay) overlay.classList.remove('open');
    }
    function isOpen() { return overlay && overlay.classList.contains('open'); }

    function onKey(e) {
      if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
        e.preventDefault(); move(1);
      } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
        e.preventDefault(); move(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault(); choose(sel);
      } else if (e.key === 'Escape') {
        close();
      }
    }

    function move(d) {
      if (!filtered.length) return;
      sel = (sel + d + filtered.length) % filtered.length;
      paintSelection();
    }

    function paintSelection() {
      $$('.palette-item', list).forEach(function (el, i) {
        el.classList.toggle('selected', i === sel);
        if (i === sel) el.scrollIntoView({ block: 'nearest' });
      });
    }

    function render(q) {
      q = (q || '').trim();
      var kws = q ? q.split(/\s+/).filter(Boolean) : [];
      var lower = q.toLowerCase();

      filtered = items.filter(function (it) {
        if (!kws.length) return true;
        return kws.every(function (k) {
          var kk = k.toLowerCase();
          if (it.title.toLowerCase().indexOf(kk) !== -1) return true;
          if (it.hint && it.hint.toLowerCase().indexOf(kk) !== -1) return true;
          if (it.py && /^[a-z]+$/.test(kk)) {
            return it.py.full.indexOf(kk) !== -1 || it.py.init.indexOf(kk) !== -1;
          }
          return false;
        });
      });

      // 排序：文章优先，标题命中加权
      filtered.sort(function (a, b) {
        function s(it) {
          var v = it.type === '文章' ? 2 : (it.type === '页面' ? 1 : 0);
          if (lower && it.title.toLowerCase().indexOf(lower) !== -1) v += 4;
          return v;
        }
        return s(b) - s(a);
      });

      filtered = filtered.slice(0, 12);
      sel = 0;
      list.innerHTML = '';

      if (!filtered.length) {
        list.innerHTML = '<div class="palette-empty">没有匹配项。试试文章标题、页面名或「主题」「随机」。</div>';
        return;
      }

      var lastType = '';
      filtered.forEach(function (it, i) {
        if (it.type !== lastType) {
          lastType = it.type;
          var g = doc.createElement('div');
          g.className = 'palette-group';
          g.textContent = it.type;
          list.appendChild(g);
        }
        var el = doc.createElement('div');
        el.className = 'palette-item' + (i === 0 ? ' selected' : '');
        var icon = it.type === '文章' ? '✎' : (it.type === '页面' ? '⌂' : '⌘');
        el.innerHTML =
          '<span class="pi-icon">' + icon + '</span>' +
          '<span class="pi-title">' + escHtml(it.title) + '</span>' +
          '<span class="pi-hint">' + escHtml(it.hint || '') + '</span>';
        el.addEventListener('click', function () { choose(i); });
        el.addEventListener('mousemove', function () {
          if (sel !== i) { sel = i; paintSelection(); }
        });
        list.appendChild(el);
      });
    }

    function escHtml(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function choose(i) {
      var it = filtered[i];
      if (!it) return;
      close();
      if (it.action) { it.action(); return; }
      if (it.url) {
        if (it.ext) window.open(it.url, '_blank', 'noopener');
        else location.href = it.url;
      }
    }

    // 全局快捷键
    doc.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen()) close(); else open();
      }
    });

    var pbtn = $('.palette-btn');
    if (pbtn) pbtn.addEventListener('click', open);
  })();

  /* ==========================================================
     10. 星空画布（Hero 背景，呼应“星记”）
     ========================================================== */
  (function initStarfield() {
    var cv = $('#starfield');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var stars = [], meteors = [], raf = null;
    var W = 0, H = 0, lastMeteor = 0;

    function colors() {
      var cs = getComputedStyle(doc.documentElement);
      var alpha = cs.getPropertyValue('--star-alpha').trim() || '1';
      return {
        c: [cs.getPropertyValue('--star-1').trim(), cs.getPropertyValue('--star-2').trim(), cs.getPropertyValue('--star-3').trim()],
        a: parseFloat(alpha) || 1
      };
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = cv.getBoundingClientRect();
      W = rect.width; H = rect.height;
      cv.width = Math.max(1, W * dpr);
      cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      var n = Math.max(50, Math.min(180, Math.round(W * H / 9000)));
      stars = [];
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: .3 + Math.random() * 1.3,
          a: .2 + Math.random() * .7,
          ph: Math.random() * Math.PI * 2,
          sp: .4 + Math.random() * 1.2,
          c: Math.random() < .12 ? 1 : (Math.random() < .12 ? 2 : 0)
        });
      }
    }

    function spawnMeteor(now) {
      if (reduceMotion) return;
      if (now - lastMeteor < 2600 + Math.random() * 5200) return;
      lastMeteor = now;
      var fromLeft = Math.random() < .7;
      meteors.push({
        x: fromLeft ? -40 : W * (.4 + Math.random() * .6),
        y: Math.random() * H * .45,
        vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 4),
        vy: 2 + Math.random() * 2.4,
        life: 1
      });
    }

    function draw(now) {
      var col = colors();
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var tw = reduceMotion ? 1 : (.62 + .38 * Math.sin(now / 1000 * s.sp + s.ph));
        ctx.globalAlpha = s.a * tw * col.a;
        ctx.fillStyle = col.c[s.c];
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      spawnMeteor(now);
      for (var j = meteors.length - 1; j >= 0; j--) {
        var m = meteors[j];
        m.x += m.vx; m.y += m.vy;
        if (m.x < -80 || m.x > W + 80 || m.y > H + 80) { meteors.splice(j, 1); continue; }
        var tail = 60 + Math.random() * 40;
        var g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail / 6, m.y - m.vy * tail / 6);
        g.addColorStop(0, col.c[1]);
        g.addColorStop(1, 'transparent');
        ctx.globalAlpha = .8 * col.a;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * tail / 6, m.y - m.vy * tail / 6);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    // 主题切换时重绘取色
    if (window.MutationObserver) {
      new MutationObserver(function () {
        if (reduceMotion) draw(0);
      }).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    resize();
    if (reduceMotion) draw(0); else raf = requestAnimationFrame(draw);
  })();

  /* ==========================================================
     11. 打字机标语
     ========================================================== */
  (function initTyper() {
    var el = $('#type-line');
    if (!el) return;
    var phrases = [];
    try { phrases = JSON.parse(el.getAttribute('data-phrases') || '[]'); } catch (e) {}
    if (!phrases.length) return;
    if (reduceMotion) { el.textContent = phrases[0]; return; }

    var caret = doc.createElement('span');
    caret.className = 'caret';
    var pi = 0, ci = 0, del = false, timer = null;

    function render() {
      el.textContent = phrases[pi].slice(0, ci);
      el.appendChild(caret);
    }
    function tick() {
      var p = phrases[pi];
      if (!del) {
        ci++;
        if (ci >= p.length) { del = true; render(); timer = setTimeout(tick, 2400); return; }
      } else {
        ci--;
        if (ci <= 0) { del = false; pi = (pi + 1) % phrases.length; }
      }
      render();
      timer = setTimeout(tick, del ? 34 : 85 + Math.random() * 70);
    }
    render();
    timer = setTimeout(tick, 900);
  })();

  /* ==========================================================
     12. 随便看看（随机文章）
     ========================================================== */
  (function initRandom() {
    function go() {
      var posts = window.STAR_POSTS || [];
      if (!posts.length) { location.href = '/archive/'; return; }
      location.href = posts[Math.floor(Math.random() * posts.length)].url;
    }
    $$('#random-btn, #random-btn-side').forEach(function (b) {
      b.addEventListener('click', go);
    });
  })();

  /* ==========================================================
     13. 点赞（localStorage，同机防重复）
     ========================================================== */
  (function initLike() {
    var btn = $('#like-btn');
    if (!btn) return;
    var key = btn.getAttribute('data-key') || location.pathname;
    var countEl = $('#like-count');

    // 基础数：按 URL 稳定散列，让数字“有人味”但不造假
    var hash = 0;
    for (var i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    var base = 3 + (hash % 23);

    function render(liked) {
      countEl.textContent = base + (liked ? 1 : 0);
      btn.classList.toggle('is-liked', !!liked);
    }
    var liked = store.get('liked:' + key, '') === '1';
    render(liked);

    btn.addEventListener('click', function () {
      liked = !liked;
      store.set('liked:' + key, liked ? '1' : '0');
      render(liked);
      if (liked) {
        btn.classList.remove('pop');
        void btn.offsetWidth;
        btn.classList.add('pop');
        toast('感谢点赞 ♥');
      }
    });
  })();

  /* ==========================================================
     14. 分享：复制链接
     ========================================================== */
  (function initShare() {
    $$('.share-btn[data-share="copy"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        function done() {
          btn.classList.add('copied');
          toast('链接已复制，去分享吧');
          setTimeout(function () { btn.classList.remove('copied'); }, 1600);
        }
        var url = location.href;
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(done).catch(fallback);
        } else fallback();
        function fallback() {
          var ta = doc.createElement('textarea');
          ta.value = url; ta.style.opacity = '0';
          doc.body.appendChild(ta); ta.select();
          try { doc.execCommand('copy'); done(); } catch (e) {}
          doc.body.removeChild(ta);
        }
      });
    });
  })();

  /* ==========================================================
     15. 图片灯箱
     ========================================================== */
  (function initLightbox() {
    var box = null;
    function ensure() {
      if (box) return;
      box = doc.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.innerHTML =
        '<button class="lb-close" aria-label="关闭"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '<img alt="">';
      doc.body.appendChild(box);
      box.addEventListener('click', function () { box.classList.remove('open'); });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') box.classList.remove('open');
      });
    }
    $$('.post-content img, .page-body img').forEach(function (img) {
      img.addEventListener('click', function () {
        ensure();
        var im = box.querySelector('img');
        im.src = img.currentSrc || img.src;
        im.alt = img.alt || '';
        box.classList.add('open');
      });
    });
  })();

  /* ==========================================================
     16. 入场动效（IntersectionObserver）
     ========================================================== */
  (function initReveal() {
    var items = $$('.post-card, .widget, .archive-row, .year-group, .lab-card, .friend-card, .book-card, .tl-item, .related-item, .archive-chart, .bar-rows, .quote-band, .series-node');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('in'); });
      // 归档柱状图：无动画时直接给终值
      $$('.archive-chart .bar').forEach(function (b) { b.style.height = b.getAttribute('data-h'); });
      $$('.br-fill').forEach(function (b) { b.style.width = b.getAttribute('data-w'); });
      return;
    }
    items.forEach(function (el) { el.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          $$('.bar', en.target).forEach(function (b) { b.style.height = b.getAttribute('data-h'); });
          $$('.br-fill', en.target).forEach(function (b) { b.style.width = b.getAttribute('data-w'); });
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .05 });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* ==========================================================
     17. 文章内容增强：外链新窗口、图片懒加载、标题锚点
     ========================================================== */
  (function initContent() {
    var content = $('.post-content') || $('.page-body');
    if (!content) return;

    $$('a', content).forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href) && href.indexOf(location.host) === -1) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });

    $$('img', content).forEach(function (img) {
      if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
    });

    $$('h2, h3', content).forEach(function (h) {
      if (h.querySelector('.anchor')) return;
      if (!h.id) return;
      var a = doc.createElement('a');
      a.className = 'anchor';
      a.href = '#' + h.id;
      a.textContent = '#';
      a.setAttribute('aria-label', '本节链接');
      h.appendChild(a);
    });
  })();

  /* ==========================================================
     18. 键盘快捷键：/ 聚焦搜索，? 帮助，t 主题，Esc 关闭浮层
     ========================================================== */
  (function initKeys() {
    doc.addEventListener('keydown', function (e) {
      var inField = /^(INPUT|TEXTAREA|SELECT)$/.test(doc.activeElement.tagName) ||
                    (doc.activeElement.isContentEditable);
      if (e.key === 'Escape') {
        var menu = $('.nav-links');
        if (menu) menu.classList.remove('open');
        closeHelp();
        var po = $('.palette-overlay');
        if (po) po.classList.remove('open');
      }
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/' ) {
        var box = $('#search-input');
        if (box) { e.preventDefault(); box.focus(); }
      } else if (e.key === '?') {
        e.preventDefault();
        toggleHelp();
      } else if (e.key === 't' || e.key === 'T') {
        var tb = $('.theme-toggle');
        if (tb) tb.click();
      }
    });
  })();

  /* ==========================================================
     19. 阅读字号：小 / 中 / 大（只影响正文，记忆选择）
     ========================================================== */
  var READ_SIZES = ['1.055rem', '1.18rem', '1.32rem'];
  var READ_LABELS = ['小', '中', '大'];
  var readIdx = parseInt(store.get('readSize', '0'), 10);
  if (isNaN(readIdx) || readIdx < 0 || readIdx >= READ_SIZES.length) readIdx = 0;

  function applyReadSize() {
    doc.documentElement.style.setProperty('--read-size', READ_SIZES[readIdx]);
  }
  applyReadSize();

  function changeReadSize(delta) {
    var next = Math.max(0, Math.min(READ_SIZES.length - 1, readIdx + delta));
    if (next === readIdx) {
      toast('已经是「' + READ_LABELS[next] + '」号了');
      return next;
    }
    readIdx = next;
    store.set('readSize', String(readIdx));
    applyReadSize();
    toast('正文字号：' + READ_LABELS[readIdx]);
    return readIdx;
  }

  /* ==========================================================
     20. 快捷键帮助面板（? 唤出）
     ========================================================== */
  var helpOverlay = null;

  function ensureHelp() {
    if (helpOverlay) return;
    helpOverlay = doc.createElement('div');
    helpOverlay.className = 'help-overlay';
    helpOverlay.setAttribute('role', 'dialog');
    helpOverlay.setAttribute('aria-label', '键盘快捷键');
    helpOverlay.innerHTML =
      '<div class="help-panel">' +
        '<div class="help-title">键盘快捷键</div>' +
        '<div class="help-body">' +
          '<div class="hk-row"><span>搜索 / 命令面板</span><span class="hk-keys"><kbd>/</kbd> 或 <kbd>Ctrl</kbd>+<kbd>K</kbd></span></div>' +
          '<div class="hk-row"><span>本帮助</span><span class="hk-keys"><kbd>?</kbd></span></div>' +
          '<div class="hk-row"><span>切换主题</span><span class="hk-keys"><kbd>T</kbd></span></div>' +
          '<div class="hk-row"><span>关闭浮层</span><span class="hk-keys"><kbd>Esc</kbd></span></div>' +
          '<div class="hk-row"><span>面板内选择 / 打开</span><span class="hk-keys"><kbd>↑</kbd><kbd>↓</kbd><kbd>Enter</kbd></span></div>' +
        '</div>' +
        '<div class="help-foot">按 Esc 或点击空白处关闭</div>' +
      '</div>';
    doc.body.appendChild(helpOverlay);
    helpOverlay.addEventListener('click', function (e) {
      if (e.target === helpOverlay) closeHelp();
    });
  }

  function toggleHelp() {
    ensureHelp();
    if (helpOverlay.classList.contains('open')) closeHelp();
    else openHelp();
  }
  function openHelp() { helpOverlay.classList.add('open'); }
  function closeHelp() { if (helpOverlay) helpOverlay.classList.remove('open'); }

  /* ==========================================================
     21. 归档页标签筛选（点击 chip 过滤，支持 ?tag= 直达）
     ========================================================== */
  (function initArchiveFilter() {
    var chips = $('#archive-chips');
    if (!chips) return;

    var rows = $$('.archive-row');
    var groups = $$('.year-group');
    var count = $('#archive-count');

    function apply(tag) {
      var shown = 0;
      rows.forEach(function (r) {
        var tags = r.getAttribute('data-tags') || '';
        var ok = !tag || (',' + tags + ',').indexOf(',' + tag + ',') > -1;
        r.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      groups.forEach(function (g) {
        var any = $$('.archive-row', g).some(function (r) { return r.style.display !== 'none'; });
        g.style.display = any ? '' : 'none';
      });
      if (count) count.textContent = tag
        ? '「' + tag + '」相关文章 ' + shown + ' 篇'
        : '正在显示 ' + shown + ' 篇';
      $$('.chip', chips).forEach(function (c) {
        c.classList.toggle('active', (c.getAttribute('data-tag') || '') === tag);
      });
      if (window.history && history.replaceState) {
        var url = new URL(location.href);
        if (tag) url.searchParams.set('tag', tag);
        else url.searchParams.delete('tag');
        history.replaceState(null, '', url.toString());
      }
    }

    chips.addEventListener('click', function (e) {
      var chip = e.target && e.target.closest ? e.target.closest('.chip') : null;
      if (!chip) return;
      e.preventDefault();
      apply(chip.getAttribute('data-tag') || '');
    });

    var initial = '';
    try { initial = new URLSearchParams(location.search).get('tag') || ''; } catch (err) {}
    if (initial) apply(initial);
  })();

  /* ==========================================================
     22. Service Worker 更新提示
     ========================================================== */
  (function initSwUpdate() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return;
      function announce() {
        toast('站点有新版本', '刷新', function () { location.reload(); });
      }
      if (reg.waiting && navigator.serviceWorker.controller) { announce(); return; }
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) announce();
        });
      });
    }).catch(function () {});
  })();

})();
