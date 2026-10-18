/* ============================================================
   星记 · 交互脚本（零依赖）
   模块：主题 / 导航 / 进度条 / 目录 / 搜索 / 代码块 / 动效
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  doc.documentElement.setAttribute('data-js', '1');

  var $  = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  /* ----------------------------------------------------------
     1. 主题切换（亮 / 暗，记忆到 localStorage）
     ---------------------------------------------------------- */
  (function initTheme() {
    var root = doc.documentElement;
    var btn = $('.theme-toggle');

    function apply(theme) {
      root.setAttribute('data-theme', theme);
      if (btn) btn.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
    }

    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}

    if (!saved) {
      var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      saved = mq && mq.matches ? 'dark' : 'light';
    }
    apply(saved);

    if (btn) {
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        apply(next);
        try { localStorage.setItem('theme', next); } catch (e) {}
      });
    }

    // 跟随系统（仅在用户未手动设置过时）
    if (window.matchMedia) {
      var mq2 = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        var manual = null;
        try { manual = localStorage.getItem('theme'); } catch (err) {}
        if (!manual) apply(e.matches ? 'dark' : 'light');
      };
      if (mq2.addEventListener) mq2.addEventListener('change', onChange);
      else if (mq2.addListener) mq2.addListener(onChange);
    }
  })();

  /* ----------------------------------------------------------
     2. 顶栏：滚动阴影 + 移动端菜单
     ---------------------------------------------------------- */
  (function initNav() {
    var header = $('.site-header');
    if (header) {
      var onScroll = function () {
        header.classList.toggle('is-stuck', window.scrollY > 8);
      };
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

    // 当前页面高亮
    var here = location.pathname.replace(/\/$/, '') || '/';
    $$('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href').replace(/\/$/, '') || '/';
      if (href === here || (href !== '/' && here.indexOf(href) === 0)) {
        a.classList.add('active');
      }
    });
  })();

  /* ----------------------------------------------------------
     3. 阅读进度条 + 返回顶部
     ---------------------------------------------------------- */
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  })();

  /* ----------------------------------------------------------
     4. 代码块：语言标签 + 一键复制
     ---------------------------------------------------------- */
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
          setTimeout(function () {
            btn.classList.remove('copied');
            btn.setAttribute('aria-label', '复制代码');
          }, 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done).catch(fallback);
        } else {
          fallback();
        }
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
      });
      block.appendChild(btn);
    });
  })();

  /* ----------------------------------------------------------
     5. 文章目录（TOC）生成与滚动高亮
     ---------------------------------------------------------- */
  (function initToc() {
    var toc = $('.toc');
    var content = $('.post-content');
    if (!toc || !content) return;

    var heads = $$('h2, h3', content);
    if (heads.length < 2) { toc.remove(); return; }

    heads.forEach(function (h, i) {
      if (!h.id) h.id = 'sec-' + i;
    });

    var ul = doc.createElement('ul');
    heads.forEach(function (h) {
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
    var targets = heads.map(function (h) { return h; });

    function spy() {
      var pos = window.scrollY + 110;
      var current = targets[0];
      targets.forEach(function (t) {
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

  /* ----------------------------------------------------------
     6. 站内搜索
     ---------------------------------------------------------- */
  (function initSearch() {
    var root = $('#search-root');
    if (!root) return;
    var input = $('#search-input', root);
    var out = $('#search-results', root);
    var hint = $('#search-hint', root);
    if (!input || !out) return;

    var indexUrl = root.getAttribute('data-index') || '/search.json';
    var posts = [];

    fetch(indexUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        posts = data || [];
        if (hint) hint.textContent = '已索引 ' + posts.length + ' 篇文章，输入关键词开始搜索。';
        input.disabled = false;
        if (location.hash) run(input.value = decodeURIComponent(location.hash.slice(1)));
      })
      .catch(function () {
        if (hint) hint.textContent = '索引加载失败，请确认 search.json 可访问。';
      });

    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { run(input.value); }, 140);
    });

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

    function run(q) {
      var kw = (q || '').trim();
      out.innerHTML = '';
      if (!kw) {
        if (hint) hint.textContent = posts.length ? '已索引 ' + posts.length + ' 篇文章，输入关键词开始搜索。' : '';
        return;
      }

      var lower = kw.toLowerCase();
      var hits = posts.filter(function (p) {
        var hay = [p.title, p.excerpt, (p.tags || []).join(' '), p.content].join(' ').toLowerCase();
        return hay.indexOf(lower) !== -1;
      });

      if (hint) hint.textContent = hits.length ? '找到 ' + hits.length + ' 条结果' : '没有匹配的文章';

      if (!hits.length) {
        out.innerHTML = '<div class="search-empty">换个关键词试试？比如「Jekyll」「Git」「读书」。</div>';
        return;
      }

      hits.forEach(function (p) {
        var snippet = '';
        var idx = (p.content || '').toLowerCase().indexOf(lower);
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
          '<h3>' + hl(p.title, kw) + '</h3>' +
          (snippet ? '<p class="pc-excerpt">' + hl(snippet, kw) + '</p>' : '');
        out.appendChild(el);
      });
    }
  })();

  /* ----------------------------------------------------------
     7. 入场动效（IntersectionObserver）
     ---------------------------------------------------------- */
  (function initReveal() {
    var items = $$('.post-card, .widget, .archive-row, .year-group');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    items.forEach(function (el) { el.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .05 });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* ----------------------------------------------------------
     8. 文章内容增强：外链新窗口打开、图片懒加载、标题锚点
     ---------------------------------------------------------- */
  (function initContent() {
    var content = $('.post-content');
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

  /* ----------------------------------------------------------
     9. 键盘快捷键：/ 聚焦搜索，Esc 关闭菜单
     ---------------------------------------------------------- */
  (function initKeys() {
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var menu = $('.nav-links');
        if (menu) menu.classList.remove('open');
      }
      if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(doc.activeElement.tagName)) {
        var box = $('#search-input');
        if (box) { e.preventDefault(); box.focus(); }
      }
    });
  })();

})();
