/* ============================================================
   星记 · 工作台（/workbench/）
   密码门 + GitHub Token 直连：文章 CRUD / 预览 / 设置 / 媒体 / 构建
   Token 仅存 sessionStorage，所有请求直连 api.github.com
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.WB_CONFIG || {};
  var REPO = CFG.repo || 'xing05188/xing05188.github.io';
  var BRANCH = CFG.branch || 'main';
  var POSTS_DIR = CFG.postsDir || '_posts';
  var API = 'https://api.github.com';

  var doc = document;
  doc.documentElement.setAttribute('data-js', '1');

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function debounce(fn, ms) {
    var t; return function () {
      var a = arguments, self = this;
      clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  }

  /* ---------- session 级存储 ---------- */
  var mem = {
    get: function (k, d) { try { var v = sessionStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  var disk = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg, type) {
    var el = $('#wb-toast');
    el.textContent = msg;
    el.className = 'wb-toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  /* ---------- 通用弹窗 ---------- */
  function modal(opts) {
    return new Promise(function (resolve) {
      var ov = $('#wb-modal');
      $('#modal-title').textContent = opts.title || '确认';
      $('#modal-body').innerHTML = opts.body || '';
      var foot = $('#modal-foot');
      foot.innerHTML = '';
      (opts.buttons || [{ label: '知道了', primary: true }]).forEach(function (b) {
        var btn = doc.createElement('button');
        btn.className = 'wb-btn sm' + (b.primary ? ' primary' : (b.danger ? ' danger' : ' ghost'));
        btn.textContent = b.label;
        btn.addEventListener('click', function () {
          ov.hidden = true;
          resolve(b.value !== undefined ? b.value : null);
        });
        foot.appendChild(btn);
      });
      ov.hidden = false;
      $('.wm-close', ov).onclick = function () { ov.hidden = true; resolve(null); };
      ov.onclick = function (e) { if (e.target === ov) { ov.hidden = true; resolve(null); } };
    });
  }

  /* ---------- SHA-256（优先 crypto.subtle，兜底纯 JS） ---------- */
  function sha256(msg) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      var bytes = new TextEncoder().encode(msg);
      return crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return (b < 16 ? '0' : '') + b.toString(16);
        }).join('');
      });
    }
    return Promise.resolve(sha256js(msg));
  }

  // 紧凑纯 JS SHA-256（无安全上下文时的兜底）
  function sha256js(ascii) {
    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var msg = unescape(encodeURIComponent(ascii));
    var l = msg.length;
    var bits = l * 8;
    msg += '\x80';
    while (msg.length % 64 !== 56) msg += '\x00';
    function w64(n) {
      var s = '';
      for (var i = 7; i >= 0; i--) s += String.fromCharCode((n >>> (i * 8)) & 0xff);
      return s;
    }
    msg += w64(Math.floor(bits / 4294967296)) + w64(bits >>> 0);
    var W = new Array(64);
    for (var i = 0; i < msg.length; i += 64) {
      for (var t = 0; t < 16; t++) {
        W[t] = (msg.charCodeAt(i + 4 * t) << 24) | (msg.charCodeAt(i + 4 * t + 1) << 16) |
               (msg.charCodeAt(i + 4 * t + 2) << 8) | msg.charCodeAt(i + 4 * t + 3);
      }
      for (var t2 = 16; t2 < 64; t2++) {
        var s0 = rotr(W[t2 - 15], 7) ^ rotr(W[t2 - 15], 18) ^ (W[t2 - 15] >>> 3);
        var s1 = rotr(W[t2 - 2], 17) ^ rotr(W[t2 - 2], 19) ^ (W[t2 - 2] >>> 10);
        W[t2] = (W[t2 - 16] + s0 + W[t2 - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (var t3 = 0; t3 < 64; t3++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t3] + W[t3]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2b = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2b) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    function hex(x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }
    return H.map(hex).join('');
  }

  /* ---------- base64（UTF-8 安全） ---------- */
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ============================================================
     状态
     ============================================================ */
  var state = {
    token: mem.get('wb-token', ''),
    user: null,
    posts: [],
    current: null,       // 正在编辑 {path, sha, isNew}
    dirty: false,
    site: null, siteSha: null,
    configRaw: '', configSha: null,
    wbRaw: '', wbSha: null,
    media: [],
    tab: 'dashboard',
    preview: false
  };

  /* ============================================================
     GitHub API
     ============================================================ */
  function gh(path, opts) {
    opts = opts || {};
    var headers = {
      'Authorization': 'token ' + state.token,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'xingji-workbench'
    };
    if (opts.json) headers['Content-Type'] = 'application/json';
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.json ? JSON.stringify(opts.json) : undefined
    }).then(function (res) {
      return res.text().then(function (t) {
        var d = null;
        try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
        if (!res.ok) {
          if (res.status === 401) { state.token = ''; mem.del('wb-token'); }
          var msg = (d && d.message) || ('HTTP ' + res.status);
          throw new Error(msg);
        }
        return d;
      });
    });
  }

  function getFile(path) {
    return gh('/repos/' + REPO + '/contents/' + path + '?ref=' + BRANCH)
      .then(function (d) {
        if (Array.isArray(d)) throw new Error(path + ' 是目录，不是文件');
        return { text: b64decode(d.content), sha: d.sha, size: d.size };
      });
  }

  function putFile(path, text, message, sha) {
    var body = {
      message: message || ('工作台更新 ' + path),
      content: b64encode(text),
      branch: BRANCH
    };
    if (sha) body.sha = sha;
    return gh('/repos/' + REPO + '/contents/' + path, { method: 'PUT', json: body });
  }

  function deleteFile(path, sha, message) {
    return gh('/repos/' + REPO + '/contents/' + path, {
      method: 'DELETE',
      json: { message: message || ('工作台删除 ' + path), sha: sha, branch: BRANCH }
    });
  }

  /* ============================================================
     Front matter 解析 / 序列化
     ============================================================ */
  function parsePost(raw) {
    var m = String(raw).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { fm: {}, body: String(raw) };
    var fm = {};
    m[1].split(/\r?\n/).forEach(function (line) {
      var kv = line.match(/^([\w-]+):\s*(.*)$/);
      if (!kv) return;
      var k = kv[1], v = kv[2].trim();
      if (/^\[.*\]$/.test(v)) {
        fm[k] = v.slice(1, -1).split(',').map(function (s) {
          return s.trim().replace(/^["']|["']$/g, '');
        }).filter(function (s) { return s !== ''; });
      } else if (v === 'true') fm[k] = true;
      else if (v === 'false') fm[k] = false;
      else fm[k] = v.replace(/^["']|["']$/g, '');
    });
    return { fm: fm, body: m[2] };
  }

  function yamlScalar(v) {
    if (v === true) return 'true';
    if (v === false) return 'false';
    var s = String(v == null ? '' : v);
    if (s === '') return '""';
    if (/[:#\{\}\[\],&*!|>'"%@`]/.test(s) || /^\s|\s$/.test(s) || /^(true|false|null|~)$/i.test(s)) {
      return '"' + s.replace(/"/g, '\\"') + '"';
    }
    return s;
  }

  function serializePost(p) {
    var L = [];
    L.push('---');
    L.push('layout: post');
    L.push('title: ' + yamlScalar(p.title));
    L.push('date: ' + (p.date || today()) + ' 20:00:00 +0800');
    L.push('categories: [' + (p.categories || []).map(yamlScalar).join(', ') + ']');
    L.push('tags: [' + (p.tags || []).map(yamlScalar).join(', ') + ']');
    if (p.description) L.push('description: ' + yamlScalar(p.description));
    if (p.series) L.push('series: ' + yamlScalar(p.series));
    if (p.updated) L.push('updated: ' + yamlScalar(p.updated));
    if (p.cover) L.push('cover: ' + yamlScalar(p.cover));
    if (p.pinned) L.push('pinned: true');
    L.push('---');
    L.push('');
    return L.join('\n') + String(p.body || '').replace(/^\n+/, '');
  }

  /* ---------- 拼音 slug ---------- */
  function slugify(title) {
    var s = '';
    var map = window.PINYIN_MAP || {};
    for (var i = 0; i < title.length; i++) {
      var ch = title[i];
      if (/[a-zA-Z0-9]/.test(ch)) { s += ch.toLowerCase(); continue; }
      if (map[ch]) { s += map[ch]; continue; }
      if (/[\u4e00-\u9fff]/.test(ch)) { s += 'z'; continue; }  // 生字占位
    }
    s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
    return s || 'post';
  }

  /* ============================================================
     迷你 YAML（覆盖 _data/site.yml 的结构子集）
     ============================================================ */
  function parseYaml(text) {
    var lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    var root = {};
    // 栈：{indent, container, lastKey}
    var stack = [{ indent: -1, container: root, isList: false }];

    function top() { return stack[stack.length - 1]; }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim() || /^\s*#/.test(line)) continue;
      var indent = line.match(/^ */)[0].length;
      var body = line.trim();

      while (stack.length > 1 && indent <= top().indent) stack.pop();
      var parent = top().container;

      if (/^- /.test(body)) {
        var itemText = body.slice(2).trim();
        if (!Array.isArray(parent)) throw new Error('YAML 结构异常（第 ' + (i + 1) + ' 行）');
        var kv = itemText.match(/^([\w-]+):\s*(.*)$/);
        if (kv) {
          var obj = {};
          obj[kv[1]] = parseScalar(kv[2]);
          parent.push(obj);
          stack.push({ indent: indent, container: obj, isList: false, listRef: parent, listObj: obj });
        } else {
          parent.push(parseScalar(itemText));
        }
        continue;
      }

      var m = body.match(/^([\w-]+):\s*(.*)$/);
      if (!m) throw new Error('YAML 结构异常（第 ' + (i + 1) + ' 行）');
      var key = m[1], val = m[2];
      if (val === '') {
        // 可能是 map 或 list，看后续行
        var nextIndent = -1, nextIsList = false;
        for (var j = i + 1; j < lines.length; j++) {
          if (!lines[j].trim() || /^\s*#/.test(lines[j])) continue;
          nextIndent = lines[j].match(/^ */)[0].length;
          nextIsList = /^\s*- /.test(lines[j]);
          break;
        }
        if (nextIndent > indent) {
          var box = nextIsList ? [] : {};
          parent[key] = box;
          stack.push({ indent: indent, container: box, isList: nextIsList });
        } else {
          parent[key] = null;
        }
      } else {
        parent[key] = parseScalar(val);
      }
    }
    return root;

    function parseScalar(v) {
      v = v.trim();
      if (v === '') return '';
      if ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'")) {
        return v.slice(1, -1).replace(/\\"/g, '"');
      }
      if (v === 'true') return true;
      if (v === 'false') return false;
      if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
      return v;
    }
  }

  function dumpYaml(obj, indent) {
    indent = indent || 0;
    var pad0 = '  '.repeat(indent);
    var out = [];
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (Array.isArray(v)) {
        if (v.length === 0) { out.push(pad0 + k + ': []'); return; }
        out.push(pad0 + k + ':');
        v.forEach(function (item) {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            var keys = Object.keys(item);
            keys.forEach(function (ik, idx) {
              var iv = item[ik];
              var prefix = idx === 0 ? pad0 + '  - ' : pad0 + '    ';
              if (iv !== null && typeof iv === 'object') {
                out.push(prefix + ik + ':');
                out.push(dumpYaml(iv, indent + 3).replace(new RegExp('^' + '  '.repeat(indent + 3)), pad0 + '      ').slice(pad0.length + 6));
              } else {
                out.push(prefix + ik + ': ' + yamlScalar(iv));
              }
            });
          } else {
            out.push(pad0 + '  - ' + yamlScalar(item));
          }
        });
      } else if (v !== null && typeof v === 'object') {
        out.push(pad0 + k + ':');
        out.push(dumpYaml(v, indent + 1));
      } else {
        out.push(pad0 + k + ': ' + yamlScalar(v));
      }
    });
    return out.join('\n');
  }

  /* ============================================================
     登录门
     ============================================================ */
  function initGate() {
    var gate = $('#wb-gate');
    var app = $('#wb-app');
    if (mem.get('wb-unlocked', '') === '1') {
      gate.hidden = true;
      app.hidden = false;
      onEnter();
      return;
    }
    $('#gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#gate-password');
      var pw = input.value;
      if (!pw) return;
      $('#gate-error').textContent = '';
      var btn = $('#gate-btn');
      btn.disabled = true; btn.textContent = '验证中…';
      sha256(pw).then(function (hash) {
        btn.disabled = false; btn.textContent = '进入';
        if (hash === CFG.passwordSha256) {
          mem.set('wb-unlocked', '1');
          gate.hidden = true;
          app.hidden = false;
          input.value = '';
          onEnter();
        } else {
          var card = $('#gate-card');
          card.classList.remove('shake');
          void card.offsetWidth;
          card.classList.add('shake');
          $('#gate-error').textContent = '密码不对，再想想（默认密码见 README）';
          input.select();
        }
      });
    });
  }

  function onEnter() {
    initTheme();
    initTabs();
    initLogout();
    initPosts();
    initSettings();
    initMedia();
    initBuild();
    initStats();
    initQuick();
    if (state.token) {
      connectToken(state.token, true);
    } else {
      renderDashboard();
    }
  }

  /* ============================================================
     主题 / Tab / 退出
     ============================================================ */
  function initTheme() {
    var saved = disk.get('wb-theme', 'dark');
    doc.documentElement.setAttribute('data-wb-theme', saved);
    $('#wb-theme-toggle').addEventListener('click', function () {
      var next = doc.documentElement.getAttribute('data-wb-theme') === 'dark' ? 'light' : 'dark';
      doc.documentElement.setAttribute('data-wb-theme', next);
      disk.set('wb-theme', next);
    });
  }

  function initTabs() {
    $('#wb-tabs').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.tb-tab') : null;
      if (!btn) return;
      switchTab(btn.getAttribute('data-tab'));
    });
    $$('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        switchTab(el.getAttribute('data-goto'));
      });
    });
  }

  function switchTab(name) {
    state.tab = name;
    $$('.tb-tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === name); });
    $$('.wb-tabpane').forEach(function (p) { p.classList.toggle('active', p.id === 'pane-' + name); });
    if (name === 'stats') renderStats();
    if (name === 'media') renderMedia();
    if (name === 'build') renderBuild();
    if (name === 'settings') loadSettings();
    if (name === 'dashboard') renderDashboard();
  }

  function initLogout() {
    $('#wb-logout').addEventListener('click', function () {
      modal({
        title: '退出工作台',
        body: '<p>将清除当前标签页里的 GitHub Token 并返回登录页。</p><p class="wm-warn">未保存的编辑器内容会丢失（草稿除外）。</p>',
        buttons: [
          { label: '取消', value: false },
          { label: '退出', value: true, danger: true }
        ]
      }).then(function (ok) {
        if (!ok) return;
        state.token = ''; mem.del('wb-token'); mem.del('wb-unlocked');
        location.reload();
      });
    });
  }

  /* ============================================================
     Token 连接
     ============================================================ */
  function connectToken(token, silent) {
    state.token = token;
    mem.set('wb-token', token);
    $('#token-connect-btn').disabled = true;
    $('#token-connect-btn').textContent = '连接中…';
    return gh('/user').then(function (user) {
      state.user = user;
      $('#tb-user').hidden = false;
      $('#tb-avatar').src = user.avatar_url;
      $('#tb-login').textContent = user.login;
      $('#connect-card').hidden = true;
      $('#token-input').value = '';
      toast('已连接 ' + user.login, 'ok');
      return Promise.all([loadPosts(), loadSiteData(), loadConfig(), loadWorkbenchFile(), loadMedia()]);
    }).catch(function (err) {
      state.token = ''; mem.del('wb-token');
      if (!silent) toast('连接失败：' + err.message, 'err');
      $('#connect-card').hidden = false;
      return null;
    }).then(function () {
      $('#token-connect-btn').disabled = false;
      $('#token-connect-btn').textContent = '连接';
    });
  }

  function initConnect() {
    $('#token-connect-btn').addEventListener('click', function () {
      var t = $('#token-input').value.trim();
      if (!t) { toast('先粘贴 Token', 'err'); return; }
      connectToken(t);
    });
    $('#token-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('#token-connect-btn').click();
    });
  }

  /* ============================================================
     数据加载
     ============================================================ */
  function loadPosts() {
    return gh('/repos/' + REPO + '/git/trees/' + BRANCH + '?recursive=1').then(function (tree) {
      var files = tree.tree.filter(function (t) {
        return t.type === 'blob' && t.path.indexOf(POSTS_DIR + '/') === 0 && /\.md$/.test(t.path);
      });
      var chain = Promise.resolve();
      var posts = [];
      files.forEach(function (f) {
        chain = chain.then(function () {
          return getFile(f.path).then(function (r) {
            var parsed = parsePost(r.text);
            var fm = parsed.fm;
            var chars = parsed.body.replace(/\s/g, '').length;
            posts.push({
              path: f.path,
              sha: f.sha,
              size: f.size,
              title: fm.title || f.path.replace(POSTS_DIR + '/', '').replace(/\.md$/, ''),
              date: fm.date ? String(fm.date).slice(0, 10) : '',
              categories: Array.isArray(fm.categories) ? fm.categories : (fm.categories ? [fm.categories] : []),
              tags: Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []),
              description: fm.description || '',
              series: fm.series || '',
              updated: fm.updated ? String(fm.updated).slice(0, 10) : '',
              cover: fm.cover || '',
              pinned: !!fm.pinned,
              body: parsed.body,
              raw: r.text,
              chars: chars
            });
          });
        });
      });
      return chain.then(function () {
        posts.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
        state.posts = posts;
        renderPostList($('#post-filter').value);
        var badge = $('#tb-posts-badge');
        badge.textContent = posts.length;
        badge.hidden = false;
        renderDashboard();
        renderStats();
      });
    });
  }

  function loadSiteData() {
    return getFile('_data/site.yml').then(function (r) {
      state.siteSha = r.sha;
      try {
        state.site = parseYaml(r.text);
        settingsReady();
      } catch (e) {
        state.site = null;
        settingsError(e.message);
      }
    }).catch(function () { state.site = null; });
  }

  function loadConfig() {
    return getFile('_config.yml').then(function (r) {
      state.configRaw = r.text;
      state.configSha = r.sha;
      settingsReady();
    }).catch(function () {});
  }

  function loadWorkbenchFile() {
    return getFile('_data/workbench.yml').then(function (r) {
      state.wbRaw = r.text;
      state.wbSha = r.sha;
    }).catch(function () {});
  }

  function loadMedia() {
    return gh('/repos/' + REPO + '/git/trees/' + BRANCH + '?recursive=1').then(function (tree) {
      state.media = tree.tree.filter(function (t) {
        return t.type === 'blob' && t.path.indexOf('assets/img/') === 0 && /\.(png|jpe?g|gif|webp|svg)$/i.test(t.path);
      }).map(function (t) { return { path: t.path, size: t.size }; });
    });
  }

  /* ============================================================
     仪表盘
     ============================================================ */
  function renderDashboard() {
    var posts = state.posts;
    if (!state.token) {
      // 未连接 Token：不编造数据，全部显示占位
      $('#dash-stats').innerHTML =
        cell('—', '篇文章', '连接后显示') +
        cell('—', '总字数', '连接后显示') +
        cell('—', '个标签', '连接后显示') +
        cell('—', '运行天数', '连接后显示') +
        cell('—', '篇置顶', '连接后显示') +
        cell('—', '张图片', '连接后显示');
      $('#dash-recent').innerHTML = '<li style="color:var(--wb-text-mute)">连接 GitHub Token 后展示最近文章</li>';
      return;
    }
    var words = posts.reduce(function (s, p) { return s + p.chars; }, 0);
    var tags = {};
    posts.forEach(function (p) { p.tags.forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); });
    var started = (state.site && state.site.started) || '2025-06-27';
    var days = Math.max(1, Math.round((Date.now() - new Date(started + 'T00:00:00').getTime()) / 86400000));

    $('#dash-stats').innerHTML =
      cell(posts.length, '篇文章', '最新 ' + (posts[0] ? posts[0].date : '—')) +
      cell(words.toLocaleString(), '总字数', '篇均 ' + (posts.length ? Math.round(words / posts.length).toLocaleString() : 0)) +
      cell(Object.keys(tags).length, '个标签', '') +
      cell(days, '运行天数', started + ' 建站') +
      cell(posts.filter(function (p) { return p.pinned; }).length, '篇置顶', '') +
      cell(state.media.length, '张图片', 'assets/img/');

    var recent = posts.slice(0, 5).map(function (p) {
      return '<li><time>' + (p.date || '—') + '</time>' +
        '<a href="/' + p.path.replace(/\.md$/, '/').replace('_posts/', 'posts/') + '" target="_blank" rel="noopener">' + esc(p.title) + '</a>' +
        (p.pinned ? '<span class="rl-pin">📌</span>' : '') + '</li>';
    }).join('');
    $('#dash-recent').innerHTML = recent || '<li style="color:var(--wb-text-mute)">还没有文章</li>';
  }
  function cell(n, label, sub) {
    return '<div class="stat-cell"><b>' + n + '</b><span>' + label + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
  }

  function initQuick() {
    $$('[data-quick]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.getAttribute('data-quick');
        if (q === 'new-post') { switchTab('posts'); newPost(); }
        else if (q === 'notice') { switchTab('settings'); selectSetting('notice'); }
        else if (q === 'upload') { switchTab('media'); $('#upload-input').click(); }
        else if (q === 'build') { switchTab('build'); }
        else if (q === 'random' && state.posts.length) {
          var p = state.posts[Math.floor(Math.random() * state.posts.length)];
          window.open('/' + p.path.replace(/\.md$/, '/').replace('_posts/', 'posts/'), '_blank');
        }
        else if (q === 'site') window.open('/', '_blank');
      });
    });
  }

  /* ============================================================
     文章管理
     ============================================================ */
  function initPosts() {
    initConnect();

    $('#new-post-btn').addEventListener('click', newPost);
    $('#post-filter').addEventListener('input', debounce(function () {
      renderPostList($('#post-filter').value);
    }, 120));

    $('#pe-save').addEventListener('click', savePost);
    $('#pe-delete').addEventListener('click', deletePost);
    $('#pe-preview-toggle').addEventListener('click', function () {
      state.preview = !state.preview;
      $('#pe-preview').hidden = !state.preview;
      $('#pe-body').classList.toggle('preview-only', state.preview);
      if (state.preview) renderPreview();
    });

    // front matter 字段 → dirty
    ['title', 'date', 'cat', 'tags', 'desc', 'series', 'updated', 'cover'].forEach(function (id) {
      $('#' + (id === 'cat' ? 'fm-cat' : 'fm-' + id)).addEventListener('input', markDirty);
    });
    $('#fm-pinned').addEventListener('change', markDirty);

    // 正文
    var input = $('#md-input');
    input.addEventListener('input', debounce(function () {
      markDirty();
      updateCount();
      saveDraft();
      if (state.preview) debounceRenderPreview();
    }, 250));
    var debounceRenderPreview = debounce(renderPreview, 300);

    // 工具栏
    $('#md-toolbar').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      mdAction(btn.getAttribute('data-md'));
    });

    // Ctrl+S
    doc.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (state.tab === 'posts' && state.current) savePost();
      }
    });

    updateCount();
  }

  function renderPostList(filter) {
    filter = (filter || '').trim().toLowerCase();
    var list = state.posts.filter(function (p) {
      if (!filter) return true;
      return (p.title + ' ' + p.tags.join(' ') + ' ' + p.categories.join(' ') + ' ' + p.path).toLowerCase().indexOf(filter) > -1;
    });
    var html = list.map(function (p) {
      return '<li><button class="ps-item' + (state.current && state.current.path === p.path ? ' active' : '') +
        '" type="button" data-path="' + esc(p.path) + '">' +
        '<span class="psi-title">' + esc(p.title) + '</span>' +
        '<span class="psi-meta"><time>' + (p.date || '—') + '</time>' +
        (p.pinned ? '<span class="psi-pin">📌</span>' : '') +
        (p.categories[0] ? '<span>' + esc(p.categories[0]) + '</span>' : '') +
        '<span>' + p.chars + ' 字</span></span></button></li>';
    }).join('');
    $('#post-list').innerHTML = html;
    var emptyEl = $('#post-list-empty');
    emptyEl.textContent = (!state.posts.length && !state.token)
      ? '连接 GitHub Token 后加载文章列表'
      : '没有匹配的文章';
    emptyEl.hidden = list.length > 0;
    $$('#post-list .ps-item').forEach(function (btn) {
      btn.addEventListener('click', function () { openPost(btn.getAttribute('data-path')); });
    });
  }

  function collectForm() {
    return {
      title: $('#fm-title').value.trim(),
      date: $('#fm-date').value || today(),
      categories: $('#fm-cat').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean),
      tags: $('#fm-tags').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean),
      description: $('#fm-desc').value.trim(),
      series: $('#fm-series').value.trim(),
      updated: $('#fm-updated').value,
      cover: $('#fm-cover').value.trim(),
      pinned: $('#fm-pinned').checked,
      body: $('#md-input').value
    };
  }

  function fillForm(p) {
    $('#fm-title').value = p.title || '';
    $('#fm-date').value = p.date || today();
    $('#fm-cat').value = (p.categories || []).join(', ');
    $('#fm-tags').value = (p.tags || []).join(', ');
    $('#fm-desc').value = p.description || '';
    $('#fm-series').value = p.series || '';
    $('#fm-updated').value = p.updated || '';
    $('#fm-cover').value = p.cover || '';
    $('#fm-pinned').checked = !!p.pinned;
    $('#md-input').value = p.body || '';
    updateCount();
  }

  function markDirty() {
    state.dirty = true;
    var st = $('#pe-status');
    st.textContent = '● 未保存的更改';
    st.classList.add('dirty');
  }
  function markClean() {
    state.dirty = false;
    var st = $('#pe-status');
    st.textContent = '已保存';
    st.classList.remove('dirty');
  }

  function updateCount() {
    var v = $('#md-input').value.replace(/\s/g, '').length;
    var min = Math.max(1, Math.round(v / 400));
    $('#md-count').textContent = v + ' 字 · 约 ' + min + ' 分钟';
  }

  function openPost(path) {
    var p = state.posts.filter(function (x) { return x.path === path; })[0];
    if (!p) return;
    if (state.dirty) {
      modal({
        title: '放弃未保存的更改？',
        body: '<p>当前文章有未保存的更改，切换后将丢失（草稿仍会保留在本地）。</p>',
        buttons: [{ label: '继续编辑', value: false }, { label: '放弃', value: true, danger: true }]
      }).then(function (ok) { if (ok) doOpen(p); });
    } else {
      doOpen(p);
    }
  }

  function doOpen(p) {
    state.current = { path: p.path, sha: p.sha, isNew: false };
    $('#pe-empty').hidden = true;
    $('#pe-wrap').hidden = false;
    $('#pe-path').value = p.path;
    fillForm(p);
    markClean();
    renderPostList($('#post-filter').value);
    checkDraft(p.path);
    if (state.preview) renderPreview();
  }

  function newPost() {
    // 未连接 Token 也能写草稿（本地自动保存），保存时再校验 Token
    if (state.dirty) {
      modal({
        title: '放弃未保存的更改？',
        body: '<p>当前有未保存的更改，新建文章后将丢失。</p>',
        buttons: [{ label: '继续编辑', value: false }, { label: '放弃', value: true, danger: true }]
      }).then(function (ok) { if (ok) doNew(); });
    } else { doNew(); }
  }

  function doNew() {
    var d = today();
    var def = (CFG.newPostDefaults) || {};
    state.current = { path: POSTS_DIR + '/' + d + '-untitled.md', sha: null, isNew: true };
    $('#pe-empty').hidden = true;
    $('#pe-wrap').hidden = false;
    $('#pe-path').value = state.current.path;
    fillForm({
      title: '', date: d,
      categories: def.categories ? [def.categories] : [],
      tags: def.tags ? String(def.tags).split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean) : [],
      description: def.description || '',
      body: ''
    });
    markClean();
    $('#pe-status').textContent = state.token
      ? '新文章（保存时创建文件）'
      : '新文章 · 草稿自动保存在本机，发布需连接 Token';
    renderPostList($('#post-filter').value);
    $('#fm-title').focus();
    if (state.preview) renderPreview();
  }

  function savePost() {
    if (!state.current) return;
    if (!state.token) { toast('先连接 GitHub Token', 'err'); return; }
    var p = collectForm();
    if (!p.title) { toast('标题不能为空', 'err'); $('#fm-title').focus(); return; }

    var path = state.current.path;
    if (state.current.isNew) {
      // 文件名跟随标题（日期 + 拼音 slug）
      var slug = slugify(p.title);
      path = POSTS_DIR + '/' + (p.date || today()) + '-' + slug + '.md';
      $('#pe-path').value = path;
    }
    var content = serializePost(p);
    var btn = $('#pe-save');
    btn.disabled = true; btn.textContent = '保存中…';

    putFile(path, content, (state.current.isNew ? '新增文章：' : '更新文章：') + p.title, state.current.sha)
      .then(function () {
        toast('已保存，Pages 约 1-2 分钟后更新', 'ok');
        disk.del('wb-draft:' + path);
        hideDraftBar();
        return loadPosts();
      })
      .then(function () {
        // 重新打开以刷新 sha
        var np = state.posts.filter(function (x) { return x.path === path; })[0];
        if (np) {
          state.current = { path: np.path, sha: np.sha, isNew: false };
          $('#pe-path').value = np.path;
          markClean();
          renderPostList($('#post-filter').value);
        }
      })
      .catch(function (err) {
        toast('保存失败：' + err.message, 'err');
      })
      .then(function () {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M17 21v-8H7v8M7 3v5h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>保存 <kbd>Ctrl+S</kbd>';
      });
  }

  function deletePost() {
    if (!state.current || state.current.isNew) { toast('新文章还未保存，无需删除', 'err'); return; }
    var path = state.current.path;
    var title = $('#fm-title').value || path;
    modal({
      title: '删除文章',
      body: '<p>将删除 <b>' + esc(path) + '</b>，此操作不可恢复。</p>' +
            '<p>请输入文章标题 <b>' + esc(title) + '</b> 以确认：</p>' +
            '<input type="text" id="modal-confirm-input" placeholder="' + esc(title) + '" autocomplete="off">',
      buttons: [{ label: '取消', value: false }, { label: '删除', value: true, danger: true }]
    }).then(function (ok) {
      if (!ok) return;
      var val = ($('#modal-confirm-input') || {}).value || '';
      if (val.trim() !== title) { toast('标题不匹配，已取消', 'err'); return; }
      var btn = $('#pe-delete');
      btn.disabled = true;
      deleteFile(path, state.current.sha, '删除文章：' + title)
        .then(function () {
          toast('已删除', 'ok');
          state.current = null; state.dirty = false;
          $('#pe-wrap').hidden = true;
          $('#pe-empty').hidden = false;
          return loadPosts();
        })
        .catch(function (err) { toast('删除失败：' + err.message, 'err'); })
        .then(function () { btn.disabled = false; });
    });
  }

  /* ---------- 预览 ---------- */
  function renderPreview() {
    var p = collectForm();
    var html = '<h1>' + esc(p.title || '未命名文章') + '</h1>' +
      '<p style="color:var(--wb-text-mute);font-size:.8rem">' + (p.date || '') +
      (p.categories.length ? ' · ' + esc(p.categories.join(' / ')) : '') +
      (p.tags.length ? ' · ' + p.tags.map(esc).map(function (t) { return '#' + t; }).join(' ') : '') + '</p>' +
      window.WBMD.render(p.body || '');
    $('#pv-body').innerHTML = html;
  }

  /* ---------- 草稿 ---------- */
  function draftKey(path) { return 'wb-draft:' + path; }
  var saveDraft = debounce(function () {
    if (!state.current) return;
    var p = collectForm();
    disk.set(draftKey(state.current.path), JSON.stringify({ fm: p, ts: Date.now() }));
    $('#md-draft').hidden = false;
  }, 800);

  function checkDraft(path) {
    hideDraftBar();
    var d = disk.get(draftKey(path), '');
    if (!d) return;
    try {
      var obj = JSON.parse(d);
      var mins = Math.round((Date.now() - obj.ts) / 60000);
      var bar = doc.createElement('div');
      bar.className = 'draft-bar';
      bar.id = 'draft-bar';
      bar.innerHTML = '<span>检测到 ' + (mins < 1 ? '刚刚' : mins + ' 分钟前') + '的本地草稿</span>' +
        '<span class="db-ops">' +
        '<button type="button" class="wb-btn ghost sm" id="draft-restore">恢复</button>' +
        '<button type="button" class="wb-btn ghost sm" id="draft-discard">丢弃</button></span>';
      var topbar = $('.pe-topbar');
      topbar.appendChild(bar);
      $('#draft-restore').addEventListener('click', function () {
        fillForm(obj.fm);
        markDirty();
        hideDraftBar();
        toast('草稿已恢复（记得保存）');
      });
      $('#draft-discard').addEventListener('click', function () {
        disk.del(draftKey(path));
        hideDraftBar();
      });
    } catch (e) {}
  }
  function hideDraftBar() {
    var bar = $('#draft-bar');
    if (bar) bar.remove();
  }

  /* ---------- 工具栏动作 ---------- */
  function mdAction(type) {
    var ta = $('#md-input');
    var s = ta.selectionStart, e = ta.selectionEnd;
    var v = ta.value;
    var sel = v.slice(s, e);
    var rep = sel, cursor = null;

    function wrap(before, after) {
      rep = before + (sel || '文字') + (after || before);
      if (!sel) cursor = s + before.length;
    }
    function linePrefix(prefix) {
      var ls = v.lastIndexOf('\n', s - 1) + 1;
      rep = v.slice(ls, e);
      rep = rep.split('\n').map(function (l) { return prefix + l; }).join('\n');
      return { start: ls, end: e + (rep.length - (e - ls)) };
    }

    if (type === 'bold') wrap('**');
    else if (type === 'italic') wrap('*');
    else if (type === 'strike') wrap('~~');
    else if (type === 'code') wrap('`');
    else if (type === 'h2') wrap('## ');
    else if (type === 'h3') wrap('### ');
    else if (type === 'quote') wrap('> ');
    else if (type === 'link') rep = '[' + (sel || '链接文字') + '](https://)';
    else if (type === 'codeblock') rep = '\n```\n' + (sel || '代码') + '\n```\n';
    else if (type === 'ul' || type === 'ol') {
      var r = linePrefix(type === 'ul' ? '- ' : '1. ');
      ta.value = v.slice(0, r.start) + rep + v.slice(r.end);
      ta.selectionStart = r.start; ta.selectionEnd = r.start + rep.length;
      ta.focus(); markDirty(); updateCount(); saveDraft();
      return;
    }
    else if (type === 'hr') rep = '\n---\n';
    else if (type === 'table') rep = '\n| 列一 | 列二 |\n| --- | --- |\n| 内容 | 内容 |\n';
    else if (type === 'tip') rep = '\n> 提示内容\n{:.tip}\n';
    else if (type === 'image') { openMediaPicker(); return; }

    ta.value = v.slice(0, s) + rep + v.slice(e);
    if (cursor !== null) { ta.selectionStart = ta.selectionEnd = cursor; }
    else { ta.selectionStart = s; ta.selectionEnd = s + rep.length; }
    ta.focus();
    markDirty(); updateCount(); saveDraft();
  }

  /* ============================================================
     统计
     ============================================================ */
  function initStats() {
    $('#health-check').addEventListener('click', runHealthCheck);
  }

  function renderStats() {
    var posts = state.posts;
    var words = posts.reduce(function (s, p) { return s + p.chars; }, 0);
    var tags = {}, cats = {};
    posts.forEach(function (p) {
      p.tags.forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
      p.categories.forEach(function (c) { cats[c] = (cats[c] || 0) + 1; });
    });
    var maxChars = Math.max.apply(null, posts.map(function (p) { return p.chars; }).concat([1]));

    $('#stats-cards').innerHTML =
      cell(posts.length, '篇文章', '') +
      cell(words.toLocaleString(), '总字数', '') +
      cell(Object.keys(tags).length, '个标签', '') +
      cell(Object.keys(cats).length, '个分类', '') +
      cell(Math.round(words / Math.max(1, posts.length)).toLocaleString(), '篇均字数', '') +
      cell(Math.max.apply(null, posts.map(function (p) { return p.chars; }).concat([0])).toLocaleString(), '最长单篇', '');

    var sorted = posts.slice().sort(function (a, b) { return b.chars - a.chars; });
    $('#stats-table tbody').innerHTML = sorted.map(function (p, i) {
      return '<tr><td>' + (i + 1) + '</td>' +
        '<td><a href="/' + p.path.replace(/\.md$/, '/').replace('_posts/', 'posts/') + '" target="_blank" rel="noopener">' + esc(p.title) + '</a></td>' +
        '<td><time>' + (p.date || '—') + '</time></td>' +
        '<td class="ta-r">' + p.chars + '</td>' +
        '<td class="ta-r">' + Math.max(1, Math.round(p.chars / 400)) + '′</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--wb-text-mute)">暂无文章</td></tr>';

    var tagMax = Math.max.apply(null, Object.keys(tags).map(function (k) { return tags[k]; }).concat([1]));
    var tagBars = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; }).slice(0, 10).map(function (k) {
      return '<div class="bar-row"><span class="br-label">' + esc(k) + '</span>' +
        '<div class="br-track"><div class="br-fill" style="width:' + Math.round(tags[k] * 100 / tagMax) + '%"></div></div>' +
        '<span class="br-num">' + tags[k] + '</span></div>';
    }).join('');
    var catMax = Math.max.apply(null, Object.keys(cats).map(function (k) { return cats[k]; }).concat([1]));
    var catBars = Object.keys(cats).map(function (k) {
      return '<div class="bar-row"><span class="br-label">' + esc(k) + '</span>' +
        '<div class="br-track"><div class="br-fill gold" style="width:' + Math.round(cats[k] * 100 / catMax) + '%"></div></div>' +
        '<span class="br-num">' + cats[k] + '</span></div>';
    }).join('');
    $('#stats-bars').innerHTML =
      '<div class="card-title" style="margin-top:4px">标签 Top 10</div>' + tagBars +
      '<div class="card-title" style="margin-top:18px">分类构成</div>' + catBars;

    runHealthCheck();
  }

  var HEALTH_PATHS = ['/', '/archive/', '/tags/', '/stats/', '/series/', '/guestbook/', '/about/', '/feed.xml', '/sw.js', '/manifest.webmanifest', '/robots.txt'];
  function runHealthCheck() {
    var grid = $('#health-grid');
    grid.innerHTML = HEALTH_PATHS.map(function (p) {
      return '<div class="health-item checking" data-p="' + p + '"><span class="h-dot"></span>' +
        '<span class="h-path">' + p + '</span><span class="h-code">…</span></div>';
    }).join('');
    HEALTH_PATHS.forEach(function (p) {
      fetch(p, { cache: 'no-store' }).then(function (res) {
        setHealth(p, res.status);
      }).catch(function () { setHealth(p, 0); });
    });
  }
  function setHealth(p, code) {
    var el = $('.health-item[data-p="' + p + '"]', $('#health-grid'));
    if (!el) return;
    var ok = code >= 200 && code < 400;
    el.classList.remove('checking');
    el.classList.add(ok ? 'ok' : 'bad');
    $('.h-code', el).textContent = code === 0 ? '失败' : code;
  }

  /* ============================================================
     媒体库
     ============================================================ */
  function initMedia() {
    var zone = $('#upload-zone');
    var input = $('#upload-input');
    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { handleFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('dragover'); });
    });
    zone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    });
  }

  function handleFiles(files) {
    if (!state.token) { toast('先连接 GitHub Token', 'err'); return; }
    Array.prototype.forEach.call(files, function (f) { uploadImage(f); });
  }

  function uploadImage(file) {
    if (!/^image\//.test(file.type)) { toast(file.name + ' 不是图片', 'err'); return; }
    var name = file.name.toLowerCase().replace(/[^a-z0-9.\-]+/g, '-');
    var path = 'assets/img/' + name;
    var finish = function (blob, ext) {
      if (ext) path = 'assets/img/' + name.replace(/\.\w+$/, '') + ext;
      var reader = new FileReader();
      reader.onload = function () {
        var b64 = String(reader.result).split(',')[1];
        gh('/repos/' + REPO + '/contents/' + path, {
          method: 'PUT',
          json: {
            message: '工作台上传图片 ' + name,
            content: b64,
            branch: BRANCH,
            sha: existingSha(path)
          }
        }).then(function () {
          toast(name + ' 已上传', 'ok');
          return loadMedia().then(renderMedia);
        }).catch(function (err) { toast('上传失败：' + err.message, 'err'); });
      };
      reader.readAsDataURL(blob);
    };

    if (file.type === 'image/svg+xml' || file.size <= 900 * 1024) {
      finish(file, null);
      return;
    }
    // 超限图片：canvas 压缩
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var max = 1600;
      var scale = Math.min(1, max / Math.max(img.width, img.height));
      var canvas = doc.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      var q = 0.85;
      (function attempt() {
        canvas.toBlob(function (blob) {
          if (!blob) { finish(file, null); return; }
          if (blob.size <= 900 * 1024 || q <= 0.5) { finish(blob, '.jpg'); }
          else { q -= 0.15; attempt(); }
        }, 'image/jpeg', q);
      })();
    };
    img.onerror = function () { URL.revokeObjectURL(url); finish(file, null); };
    img.src = url;
  }

  function existingSha(path) {
    var f = state.media.filter(function (m) { return m.path === path; })[0];
    return f ? f.sha : undefined;
  }

  function renderMedia() {
    var grid = $('#media-grid');
    if (!state.media.length) {
      grid.innerHTML = '<div class="media-empty">还没有图片，上传第一张吧</div>';
      return;
    }
    grid.innerHTML = state.media.map(function (m) {
      var name = m.path.split('/').pop();
      return '<div class="media-card" data-path="' + esc(m.path) + '">' +
        '<div class="media-thumb"><img src="/' + m.path + '" alt="' + esc(name) + '" loading="lazy"></div>' +
        '<div class="media-info"><div class="media-name" title="' + esc(m.path) + '">' + esc(name) + '</div>' +
        '<div class="media-ops">' +
        '<button type="button" data-op="copy">复制路径</button>' +
        '<button type="button" data-op="insert">插入文章</button>' +
        '<button type="button" data-op="del" class="del">删除</button>' +
        '</div></div></div>';
    }).join('');
    $$('#media-grid .media-card').forEach(function (card) {
      var path = card.getAttribute('data-path');
      $$('button', card).forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var op = btn.getAttribute('data-op');
          if (op === 'copy') {
            copyText('/' + path).then(function () { toast('已复制：/' + path, 'ok'); });
          } else if (op === 'insert') {
            insertIntoEditor(path);
          } else if (op === 'del') {
            deleteMedia(path);
          }
        });
      });
      card.addEventListener('click', function () { copyText('/' + path).then(function () { toast('已复制路径', 'ok'); }); });
    });
  }

  function deleteMedia(path) {
    modal({
      title: '删除图片',
      body: '<p>将删除 <b>' + esc(path) + '</b>，引用它的文章会显示裂图。</p>',
      buttons: [{ label: '取消', value: false }, { label: '删除', value: true, danger: true }]
    }).then(function (ok) {
      if (!ok) return;
      getFile(path).then(function (r) {
        return deleteFile(path, r.sha, '工作台删除图片 ' + path);
      }).then(function () {
        toast('已删除', 'ok');
        return loadMedia().then(renderMedia);
      }).catch(function (err) { toast('删除失败：' + err.message, 'err'); });
    });
  }

  function insertIntoEditor(path) {
    if (state.tab !== 'posts' || !state.current) { toast('先打开一篇文章', 'err'); return; }
    var ta = $('#md-input');
    var s = ta.selectionStart;
    var ins = '![' + path.split('/').pop() + '](/' + path + ')';
    ta.value = ta.value.slice(0, s) + ins + ta.value.slice(ta.selectionEnd);
    ta.selectionStart = ta.selectionEnd = s + ins.length;
    ta.focus();
    markDirty(); updateCount(); saveDraft();
    if (state.preview) renderPreview();
    toast('已插入 ' + path, 'ok');
  }

  /* ---------- 媒体选择弹层 ---------- */
  function openMediaPicker() {
    if (!state.media.length) { toast('媒体库是空的，先上传图片', 'err'); switchTab('media'); return; }
    var ov = $('#media-picker');
    $('#media-picker-grid').innerHTML = state.media.map(function (m) {
      var name = m.path.split('/').pop();
      return '<div class="media-card" data-path="' + esc(m.path) + '">' +
        '<div class="media-thumb"><img src="/' + m.path + '" alt="' + esc(name) + '" loading="lazy"></div>' +
        '<div class="media-info"><div class="media-name">' + esc(name) + '</div></div></div>';
    }).join('');
    $$('#media-picker-grid .media-card').forEach(function (card) {
      card.addEventListener('click', function () {
        insertIntoEditor(card.getAttribute('data-path'));
        ov.hidden = true;
      });
    });
    ov.hidden = false;
    $('.wm-close', ov).onclick = function () { ov.hidden = true; };
    ov.onclick = function (e) { if (e.target === ov) ov.hidden = true; };
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve) {
      var ta = doc.createElement('textarea');
      ta.value = text; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select();
      try { doc.execCommand('copy'); } catch (e) {}
      doc.body.removeChild(ta);
      resolve();
    });
  }

  /* ============================================================
     设置（site.yml 结构化编辑）
     ============================================================ */
  var SET_SECTIONS = ['notice', 'social', 'friends', 'books', 'timeline', 'quotes', 'nav', 'password'];

  function initSettings() {
    $$('.set-nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { selectSetting(btn.getAttribute('data-set')); });
    });
  }

  function selectSetting(name) {
    if (!state.token) { toast('先连接 GitHub Token 才能编辑站点数据', 'err'); return; }
    $$('.set-nav-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-set') === name); });
    renderSettingSection(name);
  }

  function loadSettings() {
    if (state.site && state.configRaw) { settingsReady(); return; }
    if (!state.token) {
      // 未连接 Token：给出明确的空状态，而不是永远转圈
      var loading = $('#set-loading');
      if (loading) loading.hidden = true;
      $('#set-body').innerHTML =
        '<div class="wb-card"><div class="card-title">连接 Token 后即可编辑</div>' +
        '<p class="cc-dim">公告栏、社交账号、友链、书单、时间线、每日一句、导航菜单的可视化编辑，都需要先连接 GitHub Token。读取与保存都直连 api.github.com，不经过任何第三方服务器。</p>' +
        '<p><button class="wb-btn primary" type="button" id="set-goto-connect">去连接 Token</button></p></div>';
      var go = $('#set-goto-connect');
      if (go) go.addEventListener('click', function () {
        switchTab('dashboard');
        setTimeout(function () { $('#token-input').focus(); }, 120);
      });
      return;
    }
    Promise.all([loadSiteData(), loadConfig(), loadWorkbenchFile()]).then(settingsReady);
  }

  function settingsReady() {
    $('#set-loading').hidden = true;
    var active = $('.set-nav-btn.active');
    if (active) renderSettingSection(active.getAttribute('data-set'));
  }
  function settingsError(msg) {
    $('#set-loading').hidden = true;
    $('#set-body').innerHTML = '<div class="wb-card"><p class="wm-warn">_data/site.yml 解析失败：' + esc(msg) +
      '</p><p class="cc-dim">请手工编辑该文件，或修复格式后重试。</p></div>';
  }

  function saveHint(msg, ok) {
    var el = $('#set-save-hint');
    if (!el) return;
    el.textContent = msg;
    el.className = 'save-hint ' + (ok ? 'ok' : 'err');
  }

  function renderSettingSection(name) {
    var body = $('#set-body');
    if (name === 'password') { renderPasswordSection(body); return; }
    if (!state.site) { body.innerHTML = '<div class="set-loading">正在加载 _data/site.yml …</div>'; return; }

    var s = state.site;
    var html = '<div class="set-section active"><div class="wb-card"><div class="card-title">' +
      esc(name) + '</div><div class="set-form">';

    if (name === 'notice') {
      var n = s.notice || {};
      html += '<div class="fm-grid">' +
        field('公告 ID（改动后老访客会重新看到）', 'set-notice-id', n.id || '') +
        field('公告文案', 'set-notice-text', n.text || '') +
        field('链接地址', 'set-notice-link', n.link || '') +
        field('链接文字', 'set-notice-link-text', n.link_text || '了解详情') +
        check('启用公告栏', 'set-notice-enabled', n.enabled !== false) +
        '</div>';
    } else if (name === 'social') {
      var so = s.social || {};
      html += '<div class="fm-grid">' +
        field('GitHub 用户名', 'set-social-github', so.github || '') +
        field('邮箱', 'set-social-email', so.email || '') +
        field('知乎（留空不显示）', 'set-social-zhihu', so.zhihu || '') +
        field('Bilibili', 'set-social-bilibili', so.bilibili || '') +
        field('Twitter / X', 'set-social-twitter', so.twitter || '') +
        field('Telegram', 'set-social-telegram', so.telegram || '') +
        '</div>';
    } else if (name === 'friends') {
      html += '<div class="list-editor" id="le-friends">';
      (s.friends || []).forEach(function (f, i) {
        html += leItem(i, [
          field('名称', 'name', f.name || ''),
          field('链接', 'url', f.url || ''),
          field('头像（可选）', 'avatar', f.avatar || ''),
          field('简介', 'desc', f.desc || '', true),
          field('状态 active / sleep / lost', 'status', f.status || 'active')
        ]);
      });
      html += '</div><button class="wb-btn ghost sm le-add" type="button" id="le-add-friends">+ 添加友链</button>';
    } else if (name === 'books') {
      html += '<div class="list-editor" id="le-books">';
      (s.books || []).forEach(function (b, i) {
        html += leItem(i, [
          field('书名', 'title', b.title || ''),
          field('作者', 'author', b.author || ''),
          field('状态 reading / done / wish', 'status', b.status || 'reading'),
          field('评分 1-5', 'rating', b.rating || ''),
          field('笔记（可选）', 'note', b.note || '', true),
          field('关联文章（可选）', 'link', b.link || '')
        ]);
      });
      html += '</div><button class="wb-btn ghost sm le-add" type="button" id="le-add-books">+ 添加书目</button>';
    } else if (name === 'timeline') {
      html += '<div class="list-editor" id="le-timeline">';
      (s.timeline || []).forEach(function (t, i) {
        html += leItem(i, [
          field('日期', 'date', t.date || ''),
          field('标题', 'title', t.title || ''),
          field('类型 post / event', 'kind', t.kind || 'event'),
          field('描述', 'text', t.text || '', true),
          field('关联文章（kind=post 时）', 'post', t.post || '')
        ]);
      });
      html += '</div><button class="wb-btn ghost sm le-add" type="button" id="le-add-timeline">+ 添加事件</button>';
    } else if (name === 'quotes') {
      html += '<div class="fm-grid">' +
        '<label class="fm-item span2"><span>每日一句（每行一条，按年内第几天轮换）</span>' +
        '<textarea id="set-quotes" rows="9" style="background:var(--wb-bg-soft);border:1px solid var(--wb-border);border-radius:7px;padding:9px 11px;color:var(--wb-text);font-size:.85rem;font-family:var(--wb-mono);resize:vertical">' +
        esc((s.quotes || []).join('\n')) + '</textarea></label></div>';
    } else if (name === 'nav') {
      var nav = parseNavBlock(state.configRaw);
      html += '<div class="list-editor" id="le-nav">';
      nav.forEach(function (item, i) {
        html += leItem(i, [
          field('菜单名', 'name', item.name || ''),
          field('地址', 'url', item.url || '')
        ]);
      });
      html += '</div><button class="wb-btn ghost sm le-add" type="button" id="le-add-nav">+ 添加菜单项</button>' +
        '<p class="cc-help" style="margin-top:12px">菜单位于 _config.yml，保存时会整块替换 nav 区段，其余内容不动。</p>';
    }

    html += '</div><div class="set-actions">' +
      '<button class="wb-btn primary" type="button" id="set-save">保存到 GitHub</button>' +
      '<span class="save-hint" id="set-save-hint"></span></div>';
    html += '</div></div>';

    body.innerHTML = html;
    wireSettingSection(name);
  }

  function field(label, id, value, isArea) {
    var v = value == null ? '' : value;
    if (isArea) {
      return '<label class="fm-item span2"><span>' + esc(label) + '</span>' +
        '<textarea id="le-' + id + '" rows="2" style="background:var(--wb-bg-soft);border:1px solid var(--wb-border);border-radius:7px;padding:7px 10px;color:var(--wb-text);font-size:.85rem;resize:vertical">' + esc(v) + '</textarea></label>';
    }
    return '<label class="fm-item"><span>' + esc(label) + '</span>' +
      '<input type="text" id="le-' + id + '" value="' + esc(v) + '"></label>';
  }
  function check(label, id, on) {
    return '<label class="fm-check"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span>' + esc(label) + '</span></label>';
  }
  function leItem(i, fieldsHtml) {
    return '<div class="le-item"><div class="le-item-head"><span class="le-idx">#' + (i + 1) + '</span>' +
      '<button type="button" class="le-del">删除</button></div><div class="fm-grid">' + fieldsHtml + '</div></div>';
  }

  function wireSettingSection(name) {
    var body = $('#set-body');

    // 列表删除 / 新增
    $$('.le-del', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.le-item');
        item.remove();
        reindex();
      });
    });
    var addMap = { friends: 'le-add-friends', books: 'le-add-books', timeline: 'le-add-timeline', nav: 'le-add-nav' };
    if (addMap[name]) {
      $('#' + addMap[name]).addEventListener('click', function () {
        var list = $('.list-editor', body);
        var proto = list.querySelector('.le-item');
        var clone = proto.cloneNode(true);
        $$('input, textarea', clone).forEach(function (inp) { inp.value = ''; });
        list.appendChild(clone);
        $$('.le-del', clone).forEach(function (btn) {
          btn.addEventListener('click', function () { clone.remove(); reindex(); });
        });
        reindex();
      });
    }
    function reindex() {
      $$('.le-item', body).forEach(function (item, i) {
        $('.le-idx', item).textContent = '#' + (i + 1);
      });
    }

    $('#set-save').addEventListener('click', function () { saveSettingSection(name); });
  }

  function readListEditor(keys) {
    var items = [];
    $$('#set-body .le-item').forEach(function (item) {
      var obj = {};
      keys.forEach(function (k) {
        var el = $('#le-' + k, item);
        if (el) obj[k] = el.value.trim();
      });
      items.push(obj);
    });
    return items;
  }

  function parseNavBlock(raw) {
    var items = [];
    String(raw).split(/\r?\n/).forEach(function (line) {
      var m = line.match(/^\s*-\s*\{\s*name:\s*([^,]+),\s*url:\s*([^,}]+)\s*\}\s*$/);
      if (m) items.push({ name: m[1].trim(), url: m[2].trim() });
    });
    return items;
  }

  function saveSettingSection(name) {
    if (!state.token) { toast('先连接 Token', 'err'); return; }
    var btn = $('#set-save');
    btn.disabled = true; btn.textContent = '保存中…';

    if (name === 'nav') {
      var nav = readListEditor(['name', 'url']).filter(function (x) { return x.name && x.url; });
      var lines = nav.map(function (x) { return '  - { name: ' + x.name + ', url: ' + x.url + ' }'; }).join('\n');
      var newRaw = state.configRaw.replace(/(nav:\s*\n)(?:[ \t]*-[ \t]*\{[^\n]*\}\n?)*/, '$1' + lines + '\n');
      if (newRaw === state.configRaw && nav.length) {
        // 没匹配到 nav 块（被改坏）—— 兜底提示
        saveHint('没找到 nav 块，取消保存', false);
        btn.disabled = false; btn.textContent = '保存到 GitHub';
        return;
      }
      putFile('_config.yml', newRaw, '工作台更新导航菜单', state.configSha)
        .then(function () {
          saveHint('已保存，约 1-2 分钟生效', true);
          toast('导航已更新', 'ok');
          return loadConfig();
        })
        .catch(function (err) { saveHint('保存失败：' + err.message, false); toast('保存失败', 'err'); })
        .then(function () { btn.disabled = false; btn.textContent = '保存到 GitHub'; });
      return;
    }

    // site.yml 各区段
    var s = state.site || {};
    if (name === 'notice') {
      s.notice = {
        enabled: $('#set-notice-enabled').checked,
        id: $('#set-notice-id').value.trim(),
        text: $('#set-notice-text').value.trim(),
        link: $('#set-notice-link').value.trim(),
        link_text: $('#set-notice-link-text').value.trim()
      };
    } else if (name === 'social') {
      s.social = {
        github: $('#set-social-github').value.trim(),
        email: $('#set-social-email').value.trim(),
        zhihu: $('#set-social-zhihu').value.trim(),
        bilibili: $('#set-social-bilibili').value.trim(),
        twitter: $('#set-social-twitter').value.trim(),
        telegram: $('#set-social-telegram').value.trim()
      };
    } else if (name === 'friends') {
      s.friends = readListEditor(['name', 'url', 'avatar', 'desc', 'status']).filter(function (x) { return x.name; });
    } else if (name === 'books') {
      s.books = readListEditor(['title', 'author', 'status', 'rating', 'note', 'link']).filter(function (x) { return x.title; });
    } else if (name === 'timeline') {
      s.timeline = readListEditor(['date', 'title', 'kind', 'text', 'post']).filter(function (x) { return x.title || x.date; });
    } else if (name === 'quotes') {
      s.quotes = $('#set-quotes').value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    }

    var header = '# ============================================================\n' +
      '#  星记 · 扩展站点数据（由工作台保存，注释为重新生成）\n' +
      '# ============================================================\n\n';
    var text = header + dumpYaml(s) + '\n';

    putFile('_data/site.yml', text, '工作台更新站点数据（' + name + '）', state.siteSha)
      .then(function () {
        saveHint('已保存，约 1-2 分钟生效', true);
        toast('站点数据已更新', 'ok');
        return loadSiteData();
      })
      .catch(function (err) { saveHint('保存失败：' + err.message, false); toast('保存失败', 'err'); })
      .then(function () { btn.disabled = false; btn.textContent = '保存到 GitHub'; });
  }

  /* ---------- 访问密码 ---------- */
  function renderPasswordSection(body) {
    body.innerHTML = '<div class="set-section active"><div class="wb-card">' +
      '<div class="card-title">访问密码</div>' +
      '<p class="cc-dim" style="margin-bottom:14px">密码以 SHA-256 哈希保存在 <code>_data/workbench.yml</code>（公开可验证、不可反推）。修改后立即生效，下次进入需要新密码。</p>' +
      '<div class="fm-grid">' +
      '<label class="fm-item span2"><span>当前密码</span><input type="password" id="pw-old" autocomplete="off"></label>' +
      '<label class="fm-item"><span>新密码（至少 6 位）</span><input type="password" id="pw-new" autocomplete="off"></label>' +
      '<label class="fm-item"><span>确认新密码</span><input type="password" id="pw-new2" autocomplete="off"></label>' +
      '</div>' +
      '<div class="set-actions"><button class="wb-btn primary" type="button" id="pw-save">修改密码</button>' +
      '<span class="save-hint" id="set-save-hint"></span></div>' +
      '</div></div>';

    $('#pw-save').addEventListener('click', function () {
      var oldPw = $('#pw-old').value, n1 = $('#pw-new').value, n2 = $('#pw-new2').value;
      if (n1.length < 6) { saveHint('新密码至少 6 位', false); return; }
      if (n1 !== n2) { saveHint('两次输入不一致', false); return; }
      sha256(oldPw).then(function (h) {
        if (h !== CFG.passwordSha256) { saveHint('当前密码不对', false); return; }
        return sha256(n1).then(function (h2) {
          var newRaw = state.wbRaw.replace(/password_sha256:.*/, 'password_sha256: ' + h2);
          return putFile('_data/workbench.yml', newRaw, '工作台修改访问密码', state.wbSha).then(function () {
            saveHint('已修改，下次进入用新密码', true);
            toast('密码已修改', 'ok');
            $('#pw-old').value = $('#pw-new').value = $('#pw-new2').value = '';
            return loadWorkbenchFile();
          });
        });
      }).catch(function (err) { saveHint('失败：' + err.message, false); });
    });
  }

  /* ============================================================
     构建
     ============================================================ */
  function initBuild() {
    $('#build-refresh').addEventListener('click', renderBuild);
    $('#build-trigger').addEventListener('click', function () {
      var btn = $('#build-trigger');
      btn.disabled = true; btn.textContent = '请求中…';
      gh('/repos/' + REPO + '/pages/builds', { method: 'POST', json: {} })
        .then(function () { toast('已请求重新构建', 'ok'); return renderBuild(); })
        .catch(function (err) { toast('请求失败：' + err.message + '（Token 需要 Pages 写权限）', 'err'); })
        .then(function () { btn.disabled = false; btn.textContent = '请求重新构建'; });
    });
  }

  function renderBuild() {
    var box = $('#build-info');
    if (!state.token) { box.innerHTML = '<p class="cc-dim">连接 Token 后显示。</p>'; return; }
    box.innerHTML = '<p class="cc-dim">加载中…</p>';
    gh('/repos/' + REPO + '/pages/builds/latest').then(function (b) {
      if (!b) { box.innerHTML = '<p class="cc-dim">暂无构建记录</p>'; return; }
      var stateText = { built: '成功', building: '构建中', error: '失败', queued: '排队中' }[b.status] || b.status;
      var dur = b.duration ? Math.round(b.duration / 1000) + ' 秒' : '—';
      var when = b.created_at ? new Date(b.created_at).toLocaleString('zh-CN', { hour12: false }) : '—';
      box.innerHTML =
        '<div class="build-info-row">' +
        '<div class="bi-item"><span>状态</span><b class="build-state ' + b.status + '"><span class="h-dot"></span>' + stateText + '</b></div>' +
        '<div class="bi-item"><span>提交</span><b><code>' + String(b.commit || '').slice(0, 8) + '</code></b></div>' +
        '<div class="bi-item"><span>耗时</span><b>' + dur + '</b></div>' +
        '<div class="bi-item"><span>开始于</span><b style="font-size:.9rem">' + when + '</b></div>' +
        '</div>' +
        (b.error && b.error.message ? '<p class="wm-warn">' + esc(b.error.message) + '</p>' : '');
      var dot = $('#tb-build-dot');
      dot.hidden = b.status !== 'building';
    }).catch(function (err) {
      box.innerHTML = '<p class="wm-warn">获取失败：' + esc(err.message) + '</p>';
    });

    gh('/repos/' + REPO + '/commits?per_page=8').then(function (list) {
      $('#commit-list').innerHTML = (list || []).map(function (c) {
        return '<li><code>' + c.sha.slice(0, 7) + '</code>' +
          '<span class="c-msg">' + esc(c.commit.message.split('\n')[0]) + '</span>' +
          '<time>' + new Date(c.commit.author.date).toLocaleDateString('zh-CN') + '</time></li>';
      }).join('') || '<li style="color:var(--wb-text-mute)">暂无提交</li>';
    }).catch(function () {});
  }

  /* ============================================================
     启动
     ============================================================ */
  initGate();

  // 暴露内部工具（控制台调试 / 自动化测试用）
  window.WB = {
    parseYaml: parseYaml, dumpYaml: dumpYaml,
    parsePost: parsePost, serializePost: serializePost,
    slugify: slugify, sha256: sha256,
    b64encode: b64encode, b64decode: b64decode,
    newPost: newPost, openPost: openPost, savePost: savePost,
    toast: toast, modal: modal
  };

  // 草稿栏样式（内联补充，避免改动主样式表）
  var style = doc.createElement('style');
  style.textContent =
    '.draft-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;margin-top:8px;padding:7px 12px;border:1px solid var(--wb-gold);border-radius:8px;background:rgba(211,169,79,.1);font-size:.78rem;color:var(--wb-gold)}' +
    '.db-ops{display:flex;gap:6px}' +
    '.pv-code-lang{display:block;font-size:.68rem;color:var(--wb-text-mute);margin-bottom:6px;font-family:var(--wb-font)}';
  doc.head.appendChild(style);
})();
