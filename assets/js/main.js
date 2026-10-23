/* ============================================================
   星记 · 交互脚本（零依赖，ES5 兼容）
   模块：主题三态 / 公告 / 导航 / 进度条 / 目录 / 搜索 / 命令面板 /
        代码块 / 星空画布 / 打字机 / 随机文章 / 点赞 / 分享 / 灯箱 / 动效 /
        阅读字号 / 快捷键帮助 / 归档标签筛选 / Service Worker 更新提示 /
        主页特效：标题逐字渐入 / 数字滚动 / 磁性按钮 / 卡片聚光灯+3D 倾斜 /
        星尘拖尾 / 首屏视差 / 星标伴生光标 / 流星雨彩蛋 /
        标题字符波浪 / 点赞粒子 / 彩蛋提示 /
        华丽升级：星空鼠标透镜+冲击波 / Hero 电影感退场 / 环境辉光 / 星星雨
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
        out.innerHTML = '<div class="search-empty">换个关键词试试？支持拼音首字母，比如「jszn」「博客」「git」。</div>';
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
    var stars = [], dust = [], meteors = [], ripples = [], raf = null;
    var W = 0, H = 0, lastMeteor = 0;
    // 鼠标交互（仅桌面精细指针 + 允许动效时启用）
    var interactive = !reduceMotion &&
      !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    var ptr = { x: -9999, y: -9999, on: false };
    var LENS_R = 165, LENS_R2 = LENS_R * LENS_R;

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
      var n = Math.max(70, Math.min(300, Math.round(W * H / 4800)));
      stars = [];
      for (var i = 0; i < n; i++) {
        var big = Math.random() < .07;   // 带十字光芒的亮星
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: big ? 1.5 + Math.random() * .9 : .45 + Math.random() * 1.35,
          a: .35 + Math.random() * .65,
          ph: Math.random() * Math.PI * 2,
          sp: .4 + Math.random() * 1.2,
          c: Math.random() < .14 ? 1 : (Math.random() < .14 ? 2 : 0),
          big: big
        });
      }
      // 星尘层：大而极淡的微粒，缓慢下沉 + 左右微摆，制造纵深
      dust = [];
      for (var j = 0; j < 22; j++) {
        dust.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 1.2 + Math.random() * 1.8,
          v: .08 + Math.random() * .22,
          ph: Math.random() * Math.PI * 2,
          a: .10 + Math.random() * .16
        });
      }
      // 测试钩子：暴露星数与星尘数（无侵入，仅 data 属性）
      cv.setAttribute('data-stars', String(stars.length));
      cv.setAttribute('data-dust', String(dust.length));
    }

    function spawnMeteor(now) {
      if (now - lastMeteor < 1500 + Math.random() * 3200) return;
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

      // 星尘层：极淡大微粒缓慢飘移，衬出星空纵深
      for (var d = 0; d < dust.length; d++) {
        var du = dust[d];
        if (!reduceMotion) {
          du.y += du.v;
          du.x += Math.sin(now / 3000 + du.ph) * .08;
          if (du.y > H + 4) { du.y = -4; du.x = Math.random() * W; }
        }
        ctx.globalAlpha = du.a * col.a;
        ctx.fillStyle = col.c[0];
        ctx.beginPath();
        ctx.arc(du.x, du.y, du.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 星星：闪烁 + 鼠标「透镜」（靠近的星被吸引、点亮、放大）
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var tw = reduceMotion ? 1 : (.5 + .5 * Math.sin(now / 1000 * s.sp + s.ph));
        var ox = 0, oy = 0, boost = 1, extra = 0, f = 0;
        if (ptr.on) {
          var dx = ptr.x - s.x, dy = ptr.y - s.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < LENS_R2) {
            f = 1 - Math.sqrt(d2) / LENS_R;
            ox = dx * f * .30;
            oy = dy * f * .30;
            boost = 1 + f * 1.25;
            extra = f * .75;
          }
        }
        var alpha = Math.min(1, s.a * tw * col.a + extra);
        var px = s.x + ox, py = s.y + oy, rr = s.r * boost;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = col.c[s.c];
        ctx.beginPath();
        ctx.arc(px, py, rr, 0, Math.PI * 2);
        ctx.fill();
        // 亮星：外层光晕 +（部分）十字星芒
        if (s.c !== 0 || s.big) {
          ctx.globalAlpha = alpha * .28;
          ctx.beginPath();
          ctx.arc(px, py, rr * 2.6, 0, Math.PI * 2);
          ctx.fill();
          if (s.big) {
            ctx.globalAlpha = alpha * .5;
            ctx.strokeStyle = col.c[s.c];
            ctx.lineWidth = .8;
            ctx.beginPath();
            ctx.moveTo(px - rr * 3, py);
            ctx.lineTo(px + rr * 3, py);
            ctx.moveTo(px, py - rr * 3);
            ctx.lineTo(px, py + rr * 3);
            ctx.stroke();
          }
        }
        // 引力线：透镜内的星向鼠标拉出细丝，像被搅动的星河
        if (ptr.on && f > .05) {
          ctx.globalAlpha = f * .16;
          ctx.strokeStyle = col.c[1];
          ctx.lineWidth = .7;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(ptr.x, ptr.y);
          ctx.stroke();
        }
      }

      if (!reduceMotion) spawnMeteor(now);
      for (var j = meteors.length - 1; j >= 0; j--) {
        var m = meteors[j];
        m.x += m.vx; m.y += m.vy;
        if (m.x < -80 || m.x > W + 80 || m.y > H + 80) { meteors.splice(j, 1); continue; }
        var tail = 60 + Math.random() * 40;
        var g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail / 6, m.y - m.vy * tail / 6);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(.35, col.c[1]);
        g.addColorStop(1, 'transparent');
        ctx.globalAlpha = .85 * col.a;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * tail / 6, m.y - m.vy * tail / 6);
        ctx.stroke();
        // 头部亮点
        ctx.globalAlpha = .95 * col.a;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // 点击冲击波：金色圆环从点击点扩散
      for (var k = ripples.length - 1; k >= 0; k--) {
        var rp = ripples[k];
        rp.r += 6.5;
        rp.a -= .022;
        if (rp.a <= 0 || rp.r > Math.max(W, H)) { ripples.splice(k, 1); continue; }
        ctx.globalAlpha = Math.max(0, rp.a) * .8;
        ctx.strokeStyle = col.c[1];
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    }

    if (interactive) {
      var hero = $('.hero');
      if (hero) {
        hero.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch') return;
          var rect = cv.getBoundingClientRect();
          ptr.x = e.clientX - rect.left;
          ptr.y = e.clientY - rect.top;
          ptr.on = true;
        }, { passive: true });
        hero.addEventListener('pointerleave', function () { ptr.on = false; });
        hero.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'touch') return;
          var rect = cv.getBoundingClientRect();
          ripples.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, r: 0, a: 1 });
        }, { passive: true });
      }
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
        burstStars(btn);
        toast('感谢点赞 ♥');
      }
    });

    // 点赞粒子爆发：以按钮为中心扇形飞出星标/爱心
    function removeOnEnd(el) {
      el.addEventListener('animationend', function () { el.remove(); });
    }
    function burstStars(el) {
      if (reduceMotion) return;
      var rect = el.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      for (var i = 0; i < 12; i++) {
        var s = doc.createElement('span');
        s.className = 'like-star';
        s.textContent = i % 2 ? '✦' : '♥';
        var ang = (i / 12) * Math.PI * 2 + Math.random() * .5;
        var dist = 34 + Math.random() * 32;
        s.style.left = cx + 'px';
        s.style.top = cy + 'px';
        s.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
        s.style.setProperty('--dy', (Math.sin(ang) * dist - 16).toFixed(1) + 'px');
        s.style.setProperty('--rot', Math.round(-60 + Math.random() * 120) + 'deg');
        s.style.setProperty('--dur', (.6 + Math.random() * .35).toFixed(2) + 's');
        removeOnEnd(s);
        doc.body.appendChild(s);
      }
    }
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

  /* ==========================================================
     23. 首屏标题逐字渐入（保留 <br>/<em> 结构，逐字上浮 + 去模糊）
     ========================================================== */
  (function initHeroTitle() {
    var h1 = $('.hero h1');
    if (!h1) return;
    if (reduceMotion) { h1.classList.add('hero-in'); return; }

    var idx = 0;
    function splitTextNode(node, parent) {
      var text = node.nodeValue;
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        if (ch === ' ') { frag.appendChild(doc.createTextNode(' ')); continue; }
        var sp = doc.createElement('span');
        sp.className = 'ch';
        sp.style.setProperty('--i', idx++);
        sp.textContent = ch;
        frag.appendChild(sp);
      }
      parent.replaceChild(frag, node);
    }
    function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (n) {
        // em 行不拆字：背景渐变裁切文字（background-clip:text）对
        // inline-block 后代无效，拆了会让整行透明不可见
        if (n.nodeType === 3 && n.nodeValue.trim()) splitTextNode(n, node);
        else if (n.nodeType === 1 && n.tagName !== 'EM') walk(n);
      });
    }
    walk(h1);
    // 强制回流后挂类，确保动画从初始态开始
    void h1.offsetWidth;
    h1.classList.add('hero-in');
  })();

  /* ==========================================================
     24. 统计数字滚动（Hero 进入即播；侧边栏滚入视口再播）
     ========================================================== */
  (function initCountUp() {
    if (reduceMotion) return;
    var DURATION = 1000;
    function animate(el) {
      var target = parseInt(el.textContent.replace(/[^\d]/g, ''), 10);
      if (isNaN(target) || target <= 0) return;
      var t0 = null;
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / DURATION);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('en-US');
        if (p < 1) requestAnimationFrame(frame);
        else el.textContent = target.toLocaleString('en-US');
      }
      requestAnimationFrame(frame);
    }

    // Hero：进入即播
    var heroEls = $$('.hero-meta .stat b');
    if (heroEls.length) setTimeout(function () { heroEls.forEach(animate); }, 420);

    // 侧边栏「小站统计」：滚入视口时再滚动（只播一次）
    var sideEls = $$('.stat-cell b');
    if (sideEls.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          animate(en.target);
          io.unobserve(en.target);
        });
      }, { threshold: .4 });
      sideEls.forEach(function (el) { io.observe(el); });
    } else {
      sideEls.forEach(animate);
    }
  })();

  /* ==========================================================
     25. 磁性按钮（Hero CTA 轻微吸附光标，离开弹回）
     ========================================================== */
  (function initMagnetic() {
    if (reduceMotion) return;
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    var MAX = 5;
    $$('.hero-actions .btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        btn.classList.add('mag-active');
        btn.style.transform = 'translate(' + (dx * MAX).toFixed(1) + 'px,' + (dy * MAX).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () {
        btn.classList.remove('mag-active');
        btn.style.transform = '';
      });
    });
  })();

  /* ==========================================================
     26. 文章卡片：聚光灯 + 3D 微倾斜（指针精细设备限定）
     ========================================================== */
  (function initCardFx() {
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    var MAX_TILT = 3;
    var cards = $$('.post-list .post-card, .pinned-strip .post-card');
    cards.forEach(function (card) {
      var raf = null, mx = 50, my = 50, tx = 0, ty = 0;
      function apply() {
        raf = null;
        card.style.setProperty('--mx', mx.toFixed(1) + '%');
        card.style.setProperty('--my', my.toFixed(1) + '%');
        if (!reduceMotion) {
          card.style.transform = 'translateY(-3px) rotateX(' + tx.toFixed(2) + 'deg) rotateY(' + ty.toFixed(2) + 'deg)';
        }
      }
      function schedule() { if (!raf) raf = requestAnimationFrame(apply); }
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        mx = px * 100; my = py * 100;
        ty = (px - .5) * 2 * MAX_TILT;
        tx = -(py - .5) * 2 * MAX_TILT;
        card.classList.add('spot-on');
        if (!reduceMotion) card.classList.add('tilting');
        schedule();
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('spot-on', 'tilting');
        card.style.transform = '';
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '50%');
      });
    });
  })();

  /* ==========================================================
     27. 星尘拖尾（Hero 区跟随光标的小星星，呼应「星记」）
     ========================================================== */
  (function initStarDust() {
    var hero = $('.hero');
    if (!hero || reduceMotion) return;
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    var CAP = 34, MIN_GAP = 30, last = 0;
    var alive = 0;
    var COLORS = ['var(--gold)', 'var(--accent)', 'var(--gold)'];

    function spawn(x, y, opts) {
      if (alive >= CAP) return;
      alive++;
      var d = doc.createElement('span');
      d.className = 'star-dust';
      d.setAttribute('aria-hidden', 'true');
      var size = (opts && opts.size) || (3.5 + Math.random() * 5);
      var dur = (opts && opts.dur) || (900 + Math.random() * 600);
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.style.fontSize = size.toFixed(1) + 'px';
      d.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      d.style.setProperty('--dur', dur + 'ms');
      d.style.setProperty('--dx', ((opts && opts.dx) || (Math.random() * 60 - 30)).toFixed(0) + 'px');
      d.style.setProperty('--dy', ((opts && opts.dy) || (-18 - Math.random() * 46)).toFixed(0) + 'px');
      d.style.setProperty('--rot', (Math.random() * 160 - 80).toFixed(0) + 'deg');
      d.textContent = Math.random() < .75 ? '✦' : '·';
      d.addEventListener('animationend', function () { d.remove(); alive--; });
      hero.appendChild(d);
    }
    function local(e) {
      var r = hero.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    hero.addEventListener('pointermove', function (e) {
      var now = e.timeStamp || Date.now();
      if (now - last < MIN_GAP) return;
      last = now;
      var p = local(e);
      spawn(p.x, p.y);
    });
    // 点击来一发小爆发（避开按钮与链接）
    hero.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('a, button')) return;
      var p = local(e);
      for (var i = 0; i < 8; i++) {
        var ang = (Math.PI * 2 * i) / 8 + Math.random() * .5;
        var dist = 26 + Math.random() * 30;
        spawn(p.x, p.y, {
          dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist - 14,
          size: 4 + Math.random() * 4, dur: 800 + Math.random() * 500
        });
      }
    });
  })();

  /* ==========================================================
     28. 首屏视差（内容缓下沉、星空缓上移，制造纵深）
     ========================================================== */
  (function initHeroParallax() {
    var hero = $('.hero');
    var inner = $('.hero-inner');
    if (!hero || !inner || reduceMotion) return;
    var field = $('.starfield', hero);
    var h = 0;
    function measure() { h = hero.offsetHeight; }
    measure();
    var rzTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(rzTimer);
      rzTimer = setTimeout(measure, 150);
    });
    var ticking = false;
    function reset() {
      inner.style.transform = '';
      inner.style.opacity = '';
      inner.style.filter = '';
      if (field) field.style.transform = '';
    }
    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      if (y < 2 || y > h) { reset(); return; }
      // 电影感退场：上移 + 缩小 + 3D 后仰 + 渐隐 + 微模糊
      var p = Math.min(1, y / h);
      inner.classList.add('para');
      inner.style.transform =
        'translateY(' + (y * .14).toFixed(1) + 'px) ' +
        'scale(' + (1 - p * .07).toFixed(3) + ') ' +
        'rotateX(' + (p * 7).toFixed(2) + 'deg)';
      inner.style.opacity = (1 - p * .9).toFixed(3);
      inner.style.filter = 'blur(' + (p * 2.6).toFixed(2) + 'px)';
      if (field) field.style.transform = 'translateY(' + (y * .06).toFixed(1) + 'px)';
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  /* ==========================================================
     29. 星标伴生光标 + 环境辉光（仅桌面精细指针；延迟跟随 + 拖尾微粒 + 点击弹跳）
     ========================================================== */
  (function initStarCursor() {
    if (reduceMotion) return;
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;

    var star = doc.createElement('div');
    star.className = 'star-cursor';
    star.setAttribute('aria-hidden', 'true');
    var glyph = doc.createElement('span');
    glyph.className = 'sc-star';
    glyph.textContent = '✦';
    star.appendChild(glyph);
    doc.body.appendChild(star);

    // 环境辉光：大而淡的柔光，营造「屏幕上有一盏灯」的氛围
    var glow = doc.createElement('div');
    glow.className = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(glow);

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var x = tx, y = ty, gx = tx, gy = ty;
    var lastTrail = 0;
    var trailCount = 0;

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      tx = e.clientX; ty = e.clientY;
      star.classList.remove('dim');
      glow.classList.add('on');
      var now = e.timeStamp || Date.now();
      if (now - lastTrail > 90) {
        lastTrail = now;
        spawnTrail(tx, ty);
      }
    }, { passive: true });

    doc.addEventListener('mouseleave', function () {
      star.classList.add('dim');
      glow.classList.remove('on');
    });
    doc.addEventListener('mouseenter', function () {
      star.classList.remove('dim');
      glow.classList.add('on');
    });

    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      glyph.classList.remove('tap');
      void glyph.offsetWidth;
      glyph.classList.add('tap');
    }, { passive: true });

    function spawnTrail(px, py) {
      if (trailCount > 24) return;
      var dot = doc.createElement('div');
      dot.className = 'cursor-trail';
      dot.style.left = px + 'px';
      dot.style.top = py + 'px';
      doc.body.appendChild(dot);
      trailCount++;
      dot.addEventListener('animationend', function () {
        dot.remove();
        trailCount = Math.max(0, trailCount - 1);
      });
    }

    (function loop() {
      x += (tx - x) * .16;
      y += (ty - y) * .16;
      var rot = Math.max(-40, Math.min(40, (tx - x) * .55));
      star.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      glyph.style.setProperty('--rot', rot.toFixed(1) + 'deg');
      // 辉光更迟缓，形成层次
      gx += (tx - gx) * .08;
      gy += (ty - gy) * .08;
      glow.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  })();

  /* ==========================================================
     29.5 彩虹拖影：鼠标划过时拉出一条流动的渐变色光带
     （SVG 对象池 + 480ms 寿命，头部粗亮、尾部细隐，色相随时间流转）
     ========================================================== */
  (function initTrailRibbon() {
    if (reduceMotion) return;
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    if (!document.createElementNS) return;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'trail-ribbon');
    svg.setAttribute('aria-hidden', 'true');
    var N = 26, LIFE = 480;
    var lines = [];
    for (var i = 0; i < N; i++) {
      var ln = doc.createElementNS(NS, 'line');
      ln.setAttribute('stroke-linecap', 'round');
      ln.style.opacity = '0';
      svg.appendChild(ln);
      lines.push(ln);
    }
    doc.body.appendChild(svg);

    var pts = [];
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (pts.length > N) pts.shift();
    }, { passive: true });

    (function loop() {
      var now = performance.now();
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      var alive = pts.length;
      var hue = (now / 18) % 360;
      for (var j = 0; j < N; j++) {
        var el = lines[j];
        if (j >= alive - 1) {
          if (el.style.opacity !== '0') el.style.opacity = '0';
          continue;
        }
        var p1 = pts[j], p2 = pts[j + 1];
        var k = j / Math.max(1, alive - 1);   // 0 头部 → 1 尾端
        el.setAttribute('x1', p1.x.toFixed(1));
        el.setAttribute('y1', p1.y.toFixed(1));
        el.setAttribute('x2', p2.x.toFixed(1));
        el.setAttribute('y2', p2.y.toFixed(1));
        el.setAttribute('stroke', 'hsl(' + ((hue + j * 5) % 360) + ', 88%, 66%)');
        el.setAttribute('stroke-width', (4.2 * (1 - k)).toFixed(2));
        el.style.opacity = (0.85 * (1 - k)).toFixed(3);
      }
      requestAnimationFrame(loop);
    })();
  })();

  /* ==========================================================
     30. 流星雨彩蛋：输入 wish 或 Konami 秘技触发；首页自动播放
     （避开 t / / ? 等已占用快捷键，防止误触主题切换等）
     ========================================================== */
  (function initMeteorShower() {
    if (reduceMotion) return;
    var CODE = 'wish';
    var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var buffer = '';
    var konamiIdx = 0;
    var running = false;

    // 首页自动播放：每次进入主页都来一场流星雨（1.6s 后，等入场动画让位）
    if ($('.hero')) {
      setTimeout(function () { fire(false); }, 1600);
    }

    window.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buffer = (buffer + k).slice(-CODE.length);
      if (buffer === CODE) { fire(false, true); return; }
      if (k === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) { konamiIdx = 0; fire(true, true); }
      } else {
        konamiIdx = (k === KONAMI[0]) ? 1 : 0;
      }
    });

    function fire(isKonami, force) {
      if (running && !force) return;   // 手动 wish / Konami 无视门闩，随时再召一场
      running = true;
      toast(isKonami ? '✦ 上古秘技已激活' : '✦ 流星雨来了');
      var count = isKonami ? 24 : 18;
      for (var i = 0; i < count; i++) {
        setTimeout(spawnMeteor, i * 110 + Math.random() * 90);
      }
      // 星星雨：流星划过之后，星星从顶端纷纷飘落
      var rain = isKonami ? 30 : 22;
      for (var k = 0; k < rain; k++) {
        setTimeout(spawnFallingStar, 500 + k * 95 + Math.random() * 240);
      }
      setTimeout(function () { running = false; }, Math.max(count * 110 + 1800, 500 + rain * 95 + 4400));
    }

    function spawnMeteor() {
      var m = doc.createElement('div');
      m.className = 'meteor';
      m.setAttribute('aria-hidden', 'true');
      m.style.setProperty('--x0', (-15 + Math.random() * 90).toFixed(1) + 'vw');
      m.style.setProperty('--y0', (-10 + Math.random() * 45).toFixed(1) + 'vh');
      m.style.setProperty('--dur', (.9 + Math.random() * .65).toFixed(2) + 's');
      doc.body.appendChild(m);
      m.addEventListener('animationend', function () { m.remove(); });
    }

    function spawnFallingStar() {
      var s = doc.createElement('span');
      s.className = 'fall-star';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = Math.random() < .35 ? '✦' : '★';
      s.style.left = (Math.random() * 100).toFixed(1) + 'vw';
      s.style.color = Math.random() < .5 ? 'var(--gold)' : 'var(--accent)';
      s.style.setProperty('--dur', (1.9 + Math.random() * 1.4).toFixed(2) + 's');
      s.style.setProperty('--drift', Math.round(-90 + Math.random() * 180) + 'px');
      s.style.setProperty('--rot', Math.round(-180 + Math.random() * 360) + 'deg');
      s.style.setProperty('--size', (11 + Math.random() * 11).toFixed(0) + 'px');
      doc.body.appendChild(s);
      s.addEventListener('animationend', function () { s.remove(); });
    }
  })();

  /* ==========================================================
     31. 卡片标题悬停字符波浪（逐字上跳，按索引错峰）
     ========================================================== */
  (function initTitleWave() {
    if (reduceMotion) return;
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    $$('.post-card h3').forEach(function (h3) {
      var idx = 0;
      Array.prototype.slice.call(h3.childNodes).forEach(function (n) {
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        var text = n.nodeValue;
        var frag = doc.createDocumentFragment();
        for (var i = 0; i < text.length; i++) {
          var ch = text.charAt(i);
          if (ch === ' ') { frag.appendChild(doc.createTextNode(' ')); continue; }
          var sp = doc.createElement('span');
          sp.className = 'wv';
          sp.style.setProperty('--i', idx++);
          sp.textContent = ch;
          frag.appendChild(sp);
        }
        h3.replaceChild(frag, n);
      });
    });
  })();

  /* ==========================================================
     32.5 双击烟花：在页面任意空白处双击，放一朵彩色小花
     （避开链接/按钮/表单，单击的冲击波涟漪照常触发）
     ========================================================== */
  (function initFireworks() {
    if (reduceMotion) return;
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    var COLORS = ['#d3a94f', '#7cc6b1', '#e0636f', '#9b8ae0', '#e7e4de', '#f0b429'];
    var live = 0, CAP = 180;
    doc.addEventListener('dblclick', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('a, button, input, textarea, select, .post-card, .post-content, .page-body, .toc')) return;
      e.preventDefault();
      var n = 42;
      for (var i = 0; i < n; i++) {
        if (live >= CAP) break;
        var ang = (Math.PI * 2 * i) / n + (Math.random() - .5) * .3;
        var dist = 46 + Math.random() * 78;
        var c = COLORS[Math.floor(Math.random() * COLORS.length)];
        var p = doc.createElement('span');
        p.className = 'firework';
        p.setAttribute('aria-hidden', 'true');
        p.style.left = e.clientX + 'px';
        p.style.top = e.clientY + 'px';
        p.style.background = c;
        p.style.boxShadow = '0 0 8px ' + c;
        p.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
        p.style.setProperty('--dy', (Math.sin(ang) * dist + 26).toFixed(0) + 'px');
        p.style.setProperty('--dur', (760 + Math.random() * 520).toFixed(0) + 'ms');
        doc.body.appendChild(p);
        live++;
        // 用 currentTarget 取当前粒子（for 循环内 var 闭包共享，不能直接引用 p）
        p.addEventListener('animationend', function (ev) {
          var el = ev.currentTarget || p;
          el.remove();
          live--;
        });
      }
    });
  })();

  /* ==========================================================
     32.6 Hero 微视差：内容随鼠标轻微浮动，子元素各按不同深度
     形成「悬浮在星空前」的层次（与滚动退场作用于不同元素，互不冲突）
     ========================================================== */
  (function initHeroMicro() {
    var inner = $('.hero-inner');
    var hero = $('.hero');
    if (!inner || !hero || reduceMotion) return;
    if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    var DEPTHS = [10, 18, 13, 8, 6];   // kicker / h1 / lead / meta / actions
    var els = [];
    Array.prototype.slice.call(inner.children).forEach(function (el, i) {
      el.classList.add('micro');
      els.push({ el: el, d: DEPTHS[Math.min(i, DEPTHS.length - 1)] });
    });
    if (!els.length) return;
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = inner.getBoundingClientRect();
      var nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      for (var i = 0; i < els.length; i++) {
        var o = els[i];
        o.el.classList.remove('micro-leaving');
        o.el.style.transform = 'translate3d(' + (nx * o.d).toFixed(1) + 'px,' + (ny * o.d * .7).toFixed(1) + 'px,0)';
      }
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      for (var i = 0; i < els.length; i++) {
        els[i].el.classList.add('micro-leaving');
        els[i].el.style.transform = '';
      }
    });
  })();

  /* ==========================================================
     32. 彩蛋提示（每设备只提示一次）
     ========================================================== */
  (function initEggHint() {
    if (!$('.hero')) return;
    if (store.get('egg-hinted', '') === '1') return;
    setTimeout(function () {
      store.set('egg-hinted', '1');
      toast('彩蛋：随时输入 wish，再召唤一场流星雨', '知道了');
    }, 9000);
  })();

})();
