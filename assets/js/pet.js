/* ============================================================
   星记 · 星星人桌宠（Star Buddy）
   —— 常驻右下角的小星星：会打工 / 会犯困 / 会陪你过流星雨
   参考 dsh-web-ui 桌宠交互范式：状态机、摸头、喂食、亲密度、
   拖拽换位、隐藏/叫回、重命名。零依赖、零外部素材（SVG 程序化绘制）
   ============================================================ */
(function () {
  'use strict';
  if (window.__pet) return;

  var doc = document;
  var win = window;
  var reduceMotion = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 本地存储 ---------- */
  var KEY = 'starbuddy.v1';
  function defaults() {
    return {
      name: '星星人', lv: 1, exp: 0,
      x: null, y: null,            // 位置（null = 默认右下角）
      hidden: 0,                   // 1 = 被藏起来了
      fed: 0, played: 0, petted: 0, works: 0, visits: 0, renamed: 0
    };
  }
  var data = defaults();
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (var k in defaults()) {
          if (parsed[k] !== undefined && parsed[k] !== null) data[k] = parsed[k];
        }
      }
    }
  } catch (e) {}
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  // 位置变化后：把坐标写回存档再保存
  function syncSave() {
    data.x = Math.round(pos.x);
    data.y = Math.round(pos.y);
    save();
  }

  /* ---------- 小工具 ---------- */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function $(s, c) { return (c || doc).querySelector(s); }

  /* ---------- 文案库 ---------- */
  var LV_TITLES = ['微光', '星尘', '星辰', '星使', '星灵', '星主', '星神', '夜空之王', '银河之光', '宇宙之心'];

  var IDLE_LINES = [
    '今天也闪闪发光 ✦', '一起数星星吗？', '这里好安静呀', '我负责守护这个博客',
    '代码写完了吗？', '想去文章里逛逛', '有点想吃星星糖', '你觉得我可爱吗',
    '夜里我会更亮一点', '偷偷看了眼留言板', '给你比个心', '无聊的话就摸摸我',
    '我转圈圈的样子好看吗', '你知道吗，星星也会打嗝'
  ];
  var PRAISE_LINES = [
    '嘿嘿，好舒服～', '再摸一下！', '喜欢被摸摸', '你的手暖暖的',
    '咻～发射爱心', '记下你一次温柔', '摸摸头，长高高'
  ];
  var THINK_LINES = [
    '嗯…让我想想', '灵感在哪里', '宇宙的尽头是…', '如果星星会说话',
    '我在想一个 Bug', '今晚吃哪颗星', '博客的下一篇文章写啥'
  ];
  var WORK_DONE = ['搞定！', '完成一件事', '呼，收工', '轻松拿下'];
  var EAT_LINES = ['好好吃！', '星星糖最棒了', '谢谢你喂我', '甜到心里去', '还要还要…'];
  var CAUGHT_LINES = ['抓到啦，嘿嘿', '差一点点！', '玩得好开心', '再来一次！'];
  var WAKE_LINES = ['呜…醒了', '刚才梦到流星雨了', '怎么把我吵醒了', '我还能再睡会儿'];
  var DROP_LINES = ['放我下来啦！', '换个地方看星星', '这里的风景不错', '嘿咻，落地'];
  var NIGHT_LINES = ['夜深了，该睡了', '晚安，好梦', '夜晚让我更有精神'];

  /* ---------- 工作类型（每种工作：专属动画 + 台词） ---------- */
  var WORKS = [
    { id: 'stargaze', name: '数星星', ic: '✦', dur: [14000, 22000], lines: ['一颗…两颗…', '今晚星星好清楚', '数到几啦？忘啦…', '那颗最亮的是我朋友'] },
    { id: 'write', name: '写文章', ic: '✎', dur: [16000, 26000], lines: ['这句再改改…', '标题不够吸引人', '删掉重写，嗯', '灵感来了挡不住', '博主怎么还不更新'] },
    { id: 'debug', name: '捉 Bug', ic: '⚙', dur: [12000, 20000], lines: ['咦，怎么又挂了', '这个 Bug 好奇怪', '找到了！在第三行', '不是我的锅，是缓存'] },
    { id: 'read', name: '看书', ic: '▤', dur: [14000, 24000], lines: ['这章写得真好', '翻页翻页', '知识进脑子了', '这本书看三遍了'] },
    { id: 'music', name: '听歌', ic: '♪', dur: [12000, 20000], lines: ['啦啦啦～', '这首歌循环一天了', '跟着节奏摇头', '你听过吗？'] },
    { id: 'patrol', name: '巡逻', ic: '➤', dur: [10000, 16000], lines: ['巡视一下博客', '一切正常', '看看留言板', '没人搞事，放心'] },
    { id: 'water', name: '浇花', ic: '✿', dur: [10000, 15000], lines: ['小花多喝点', '花园漂漂亮亮的', '叶子擦一擦', '今天也浇浇水'] },
    { id: 'coffee', name: '喝咖啡', ic: '☕', dur: [10000, 16000], lines: ['咕噜咕噜…', '咖啡续命', '苦尽甘来', '再来一杯'] },
    { id: 'stretch', name: '伸懒腰', ic: '↕', dur: [8000, 12000], lines: ['啊——伸个懒腰', '坐太久啦', '扭扭腰', '舒展一下'] },
    { id: 'nap', name: '偷偷打盹', ic: '☾', dur: [10000, 18000], lines: ['就睡五分钟…', '没人看见…呼…', '偷懒一时爽'] },
    { id: 'pickstar', name: '摘星星', ic: '✧', dur: [10000, 16000], lines: ['这颗归我啦', '踮起脚尖摘一颗', '袋子装不下啦', '轻轻摘，不摘疼它'] },
    { id: 'poem', name: '写诗', ic: '✎', dur: [14000, 22000], lines: ['一半写给代码…', '押韵好难呀', '月亮是夜的标点', '这首写给星星'] },
    { id: 'jumprope', name: '跳绳', ic: '↕', dur: [10000, 14000], lines: ['一、二、三…', '跳够一百下', '绳子绊到了', '运动使人发光'] },
    { id: 'comments', name: '刷留言板', ic: '▤', dur: [12000, 20000], lines: ['这条评论好有意思', '偷偷点个赞', '大家都好可爱', '回复点什么好呢'] }
  ];
  function byId(id) {
    for (var i = 0; i < WORKS.length; i++) if (WORKS[i].id === id) return WORKS[i];
    return null;
  }

  /* ---------- 形象 SVG（程序化绘制，零素材） ---------- */
  var SVG =
    '<svg class="pet-svg" viewBox="0 0 140 140" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="petGrad" cx="40%" cy="32%" r="85%">' +
          '<stop offset="0%" stop-color="#ffe9a8"/>' +
          '<stop offset="55%" stop-color="var(--gold)"/>' +
          '<stop offset="100%" stop-color="#8a6410"/>' +
        '</radialGradient>' +
        '<path id="petEyeStar" d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z"/>' +
      '</defs>' +
      '<ellipse class="pet-shadow" cx="70" cy="124" rx="30" ry="5.5"/>' +
      '<g>' +
        '<animateTransform attributeName="transform" type="rotate" from="0 70 64" to="360 70 64" dur="9s" repeatCount="indefinite"/>' +
        '<path class="pet-sat" fill="var(--gold)" opacity=".9" transform="translate(124,64)" d="M0 -5.5 L1.7 -1.7 L5.5 0 L1.7 1.7 L0 5.5 L-1.7 1.7 L-5.5 0 L-1.7 -1.7 Z"/>' +
      '</g>' +
      '<ellipse class="pet-halo" cx="70" cy="13" rx="22" ry="6.5"/>' +
      '<path class="pet-crown" d="M55 35 L59 22 L65 29 L70 16 L75 29 L81 22 L85 35 Z"/>' +
      '<g class="pet-legs">' +
        '<path class="pet-leg pet-leg-l" d="M64 86 C63.5 94 64 100 65.5 104"/>' +
        '<path class="pet-leg pet-leg-r" d="M76 86 C76.5 94 76 100 74.5 104"/>' +
      '</g>' +
      '<path class="pet-star" d="M70 22 L80.3 49.8 L110 51 L86.6 69.4 L94.7 98 L70 81.5 L45.3 98 L53.4 69.4 L30 51 L59.7 49.8 Z"/>' +
      '<ellipse class="pet-star-hl" cx="56" cy="46" rx="12" ry="7" transform="rotate(-24 56 46)"/>' +
      '<g class="pet-figure" data-face="idle">' +
        '<g class="pet-face">' +
          '<g class="pet-eyes eyes-open">' +
            '<circle cx="58" cy="60" r="4.6"/><circle cx="82" cy="60" r="4.6"/>' +
            '<circle class="pet-glint" cx="59.6" cy="58.4" r="1.4"/>' +
            '<circle class="pet-glint" cx="83.6" cy="58.4" r="1.4"/>' +
          '</g>' +
          '<g class="pet-eyes eyes-happy">' +
            '<path class="eye-line" d="M53 61 Q58 55.5 63 61"/>' +
            '<path class="eye-line" d="M77 61 Q82 55.5 87 61"/>' +
          '</g>' +
          '<g class="pet-eyes eyes-sleep">' +
            '<path class="eye-line" d="M53 60 Q58 63.5 63 60"/>' +
            '<path class="eye-line" d="M77 60 Q82 63.5 87 60"/>' +
          '</g>' +
          '<g class="pet-eyes eyes-love" fill="#e0636f">' +
            '<use href="#petEyeStar" transform="translate(58,60) scale(.92)"/>' +
            '<use href="#petEyeStar" transform="translate(82,60) scale(.92)"/>' +
          '</g>' +
          '<g class="pet-eyes eyes-wow">' +
            '<circle cx="58" cy="60" r="5.4"/><circle cx="82" cy="60" r="5.4"/>' +
            '<circle class="pet-glint" cx="56.2" cy="58" r="1.5"/>' +
            '<circle class="pet-glint" cx="80.2" cy="58" r="1.5"/>' +
          '</g>' +
          '<ellipse class="pet-blush" cx="58" cy="69" rx="4.6" ry="2.8"/>' +
          '<ellipse class="pet-blush" cx="82" cy="69" rx="4.6" ry="2.8"/>' +
          '<path class="pet-mouth mouth-smile" d="M63 72 Q70 78.5 77 72"/>' +
          '<circle class="pet-mouth pet-mouth-fill mouth-o" cx="70" cy="74" r="2.8"/>' +
          '<ellipse class="pet-mouth pet-mouth-fill mouth-open" cx="70" cy="75" rx="4.2" ry="5"/>' +
          '<path class="pet-mouth mouth-frown" d="M63 76 Q70 70 77 76"/>' +
        '</g>' +
      '</g>' +
      '<g class="pet-arms">' +
        '<path class="pet-arm pet-arm-l" d="M38 60 Q30 66 26 76"/>' +
        '<path class="pet-arm pet-arm-r" d="M102 60 Q110 66 114 76"/>' +
      '</g>' +
    '</svg>';

  /* ---------- 搭建 DOM ---------- */
  var stage = doc.createElement('div');
  stage.className = 'pet-stage';
  stage.id = 'pet-stage';
  stage.setAttribute('data-state', 'idle');
  stage.setAttribute('role', 'complementary');
  stage.setAttribute('aria-label', '星星人桌宠');

  var wrap = doc.createElement('div');
  wrap.className = 'pet-figure-wrap';
  wrap.title = '单击摸摸 · 双击玩耍 · 右键菜单 · 可拖拽';
  wrap.innerHTML = SVG;

  var bubble = doc.createElement('div');
  bubble.className = 'pet-bubble';

  var panel = doc.createElement('div');
  panel.className = 'pet-panel';
  panel.innerHTML =
    '<div class="pet-panel-head">' +
      '<span class="pet-panel-name"></span>' +
      '<span class="pet-lv"></span>' +
      '<button class="pet-panel-close" type="button" title="收起面板">✕</button>' +
    '</div>' +
    '<div class="pet-exp"><i></i></div>' +
    '<div class="pet-exp-tip"></div>' +
    '<div class="pet-mood"></div>' +
    '<div class="pet-acts">' +
      '<button class="pet-act" type="button" data-act="feed"><span class="ic">✦</span>喂食</button>' +
      '<button class="pet-act" type="button" data-act="play"><span class="ic">➤</span>玩耍</button>' +
      '<button class="pet-act" type="button" data-act="sleep"><span class="ic">☾</span>睡觉</button>' +
      '<button class="pet-act" type="button" data-act="hide"><span class="ic">✕</span>隐藏</button>' +
    '</div>' +
    '<div class="pet-panel-foot">' +
      '<span class="pet-stats"></span>' +
      '<button type="button" data-act="rename">改名</button>' +
    '</div>';

  var badge = doc.createElement('button');
  badge.className = 'pet-badge';
  badge.type = 'button';
  badge.title = '星星人的状态面板';
  badge.innerHTML = '✦ <span class="lv"></span>';

  // 工作道具
  var props = doc.createElement('div');
  props.innerHTML =
    '<div class="pet-prop p-notepad"></div>' +
    '<div class="pet-prop p-bug"></div>' +
    '<div class="pet-prop p-book"></div>' +
    '<div class="pet-prop p-note"><i>♪</i><i>♫</i><i>♪</i></div>' +
    '<div class="pet-prop p-pot"></div>' +
    '<div class="pet-prop p-drop"></div>' +
    '<div class="pet-prop p-cup"></div>' +
    '<div class="pet-prop p-steam"></div>' +
    '<div class="pet-prop p-steam"></div>' +
    '<div class="pet-prop p-stars"><i>✦</i><i>✧</i><i>✦</i></div>' +
    '<div class="pet-prop p-rope"><i></i></div>' +
    '<div class="pet-prop p-zzz"><i>Z</i><i>Z</i><i>Z</i></div>';

  stage.appendChild(wrap);
  stage.appendChild(props);
  stage.appendChild(bubble);
  stage.appendChild(panel);
  stage.appendChild(badge);
  doc.body.appendChild(stage);

  var figure = $('.pet-figure', wrap);
  var elName = $('.pet-panel-name', panel);
  var elLv = $('.pet-lv', panel);
  var elExp = $('.pet-exp i', panel);
  var elExpTip = $('.pet-exp-tip', panel);
  var elMood = $('.pet-mood', panel);
  var elStats = $('.pet-stats', panel);
  var elLvBadge = $('.lv', badge);
  var btnSleep = $('.pet-act[data-act="sleep"]', panel);

  /* ---------- 位置 ---------- */
  var pos = { x: data.x, y: data.y };
  function petW() { return stage.offsetWidth || 132; }
  function petH() { return stage.offsetHeight || 132; }
  function clampPos() {
    var w = petW(), h = petH();
    pos.x = clamp(pos.x, 8, Math.max(8, win.innerWidth - w - 8));
    pos.y = clamp(pos.y, 56, Math.max(56, win.innerHeight - h - 8));
  }
  function applyPos() {
    clampPos();
    stage.style.left = pos.x + 'px';
    stage.style.top = pos.y + 'px';
  }
  function defaultPos() {
    var w = petW(), h = petH();
    pos.x = win.innerWidth - w - 30;
    pos.y = win.innerHeight - h - 82;   // 坐在「返回顶部」按钮上方
  }
  if (pos.x === null || pos.y === null) defaultPos();
  applyPos();

  win.addEventListener('resize', function () {
    var wasFlipped = stage.getAttribute('data-panel-flip');
    applyPos();
    syncSave();
    refreshFlip();
    if (wasFlipped !== stage.getAttribute('data-panel-flip')) refreshPanel();
  });

  /* ---------- 状态机 ---------- */
  var S = {
    state: 'idle',        // idle/walk/think/work/eat/play/sleep/drag/celebrate/sad/greet/hop
    face: 'idle',
    work: null,
    workTimer: null, lineTimer: null, resumeTimer: null,
    nextThink: Date.now() + rand(6000, 14000),   // 首次自主决策：6~14s 后
    lastAct: Date.now(),
    bubbleTimer: null, tapLock: 0
  };
  // 互动时间戳（用于推算心情）
  var lastPetted = 0, lastFed = 0, lastPlayed = 0;
  function mood() {
    if (S.state === 'sleep') return '困倦';
    var now = Date.now();
    if (now - lastPlayed < 120000) return '兴奋';
    if (now - lastFed < 120000) return '满足';
    if (now - lastPetted < 120000) return '开心';
    if (now - S.lastAct > 60000) return '无聊';
    return '平静';
  }

  function setState(st, opts) {
    S.state = st;
    stage.setAttribute('data-state', st);
    if (!opts || opts.face !== false) setFace('idle');
  }
  function setFace(f) {
    S.face = f;
    figure.setAttribute('data-face', f);
  }
  function setWork(w) {
    S.work = w || null;
    if (w) stage.setAttribute('data-work', w.id);
    else stage.removeAttribute('data-work');
  }
  function touch() { S.lastAct = Date.now(); S.nextThink = Date.now() + rand(9000, 18000); }

  /* ---------- 气泡 ---------- */
  function say(text, ms) {
    if (data.hidden) return;
    bubble.innerHTML = '<b>' + escapeName(data.name) + '</b>' + escapeHtml(text);
    stage.setAttribute('data-bubble', '1');
    refreshFlip();
    clearTimeout(S.bubbleTimer);
    S.bubbleTimer = setTimeout(hideBubble, ms || 2800);
  }
  function hideBubble() { stage.removeAttribute('data-bubble'); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeName(s) { return escapeHtml(s || '星星人'); }

  /* 气泡/面板避让视口顶部 */
  function refreshFlip() {
    var need = pos.y < 210;
    if (need) stage.setAttribute('data-panel-flip', '1');
    else stage.removeAttribute('data-panel-flip');
    if (pos.y < 110) stage.setAttribute('data-bubble-flip', '1');
    else stage.removeAttribute('data-bubble-flip');
  }

  /* ---------- 亲密度 / 等级 ---------- */
  function needExp() { return data.lv * 18; }
  function addExp(n) {
    data.exp += n;
    while (data.lv < 10 && data.exp >= needExp()) {
      data.exp -= needExp();
      data.lv++;
      levelUp();
    }
    if (data.lv >= 10 && data.exp > needExp()) data.exp = needExp();
    save();
    refreshPanel();
  }
  function levelUp() {
    var title = LV_TITLES[data.lv - 1];
    say('升级啦！Lv.' + data.lv + ' ' + title + ' ✦', 4200);
    burst(8, 'star');
    // 玩耍进行中不插播庆祝动画，避免打断游戏（只气泡 + toast）
    if (S.state !== 'play') celebrate(3200);
    petToast('星星人升到了 Lv.' + data.lv + '「' + title + '」');
  }

  /* ---------- 互动粒子 ---------- */
  function burst(n, type) {
    if (reduceMotion) return;
    for (var i = 0; i < n; i++) {
      var fx = doc.createElement('span');
      fx.className = 'pet-fx ' + (type === 'heart' ? 'fx-heart' : 'fx-star');
      fx.textContent = type === 'heart' ? '♥' : '✦';
      fx.style.setProperty('--dx', Math.round(rand(-26, 26)) + 'px');
      fx.style.left = (40 + Math.random() * 20) + '%';
      fx.style.top = (26 + Math.random() * 14) + '%';
      fx.style.animationDelay = (i * 60) + 'ms';
      wrap.appendChild(fx);
      (function (el) {
        el.addEventListener('animationend', function () { el.remove(); });
      })(fx);
    }
  }

  /* ---------- 动作 ---------- */
  function tempState(st, face, ms, next) {
    setState(st);
    setFace(face);
    clearTimeout(S.resumeTimer);
    S.resumeTimer = setTimeout(function () {
      if (typeof next === 'function') next();
      else afterAction();
    }, ms);
  }
  // 仅在“临时状态”下收尾，避免覆盖睡眠/拖拽等持久状态
  function afterAction() {
    var transient = { eat: 1, think: 1, greet: 1, walk: 1, celebrate: 1, sad: 1, work: 1, play: 1, hop: 1 };
    if (!transient[S.state]) return;
    if (S.work) { setState('work'); setFace(S.work.id === 'nap' ? 'sleep' : 'work'); }
    else { setState('idle'); setFace('idle'); }
  }

  // 摸头
  function petHead() {
    if (S.state === 'drag' || S.state === 'play') return;
    stopAuto();
    touch();
    lastPetted = Date.now();
    data.petted++;
    addExp(1);
    if (S.state === 'sleep') { wake(true); return; }
    tempState('idle', 'love', 1500);
    burst(3, 'heart');
    say(pick(PRAISE_LINES), 2600);
  }

  // 喂食
  var feedLock = 0;
  function feed() {
    if (S.state === 'drag' || S.state === 'eat' || S.state === 'play') return;
    if (Date.now() < feedLock) return;
    feedLock = Date.now() + 500;
    stopAuto();
    touch();
    lastFed = Date.now();
    if (S.state === 'sleep') wake(true);
    var candy = doc.createElement('span');
    candy.className = 'pet-candy';
    candy.textContent = '✦';
    wrap.appendChild(candy);
    candy.addEventListener('animationend', function () {
      candy.remove();
      doEat();
    });
  }
  function doEat() {
    touch();
    data.fed++;
    addExp(6);
    tempState('eat', 'eat', 1400);
    burst(4, 'star');
    say(pick(EAT_LINES), 2600);
  }

  // 玩耍：追光标小游戏
  var playCtx = null;
  function playWith() {
    if (S.state === 'drag' || S.state === 'play') return;
    stopAuto();
    touch();
    lastPlayed = Date.now();
    if (S.state === 'sleep') { wake(true); return; }
    if (reduceMotion) { say('现在不适合剧烈运动…', 2200); return; }
    endWork(true);
    setState('play');
    setFace('happy');
    say('来抓我呀！', 2400);
    var until = Date.now() + 12000;
    var caughtAt = 0, caughtOnce = false;
    var target = { x: pos.x + petW() / 2, y: pos.y + petH() / 2 };
    function onMove(e) {
      target.x = e.clientX;
      target.y = e.clientY;
    }
    win.addEventListener('pointermove', onMove, { passive: true });
    playCtx = {
      stop: function () {
        win.removeEventListener('pointermove', onMove);
        if (this.raf) cancelAnimationFrame(this.raf);
        playCtx = null;
      }
    };
    (function loop() {
      if (!playCtx) return;
      var cx = pos.x + petW() / 2, cy = pos.y + petH() / 2;
      var dx = target.x - cx, dy = target.y - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > 4) {
        pos.x += dx * 0.085;
        pos.y += dy * 0.085;
        applyPos();
      }
      if (d < 34 && Date.now() > caughtAt) {
        caughtAt = Date.now() + 900;
        burst(4, 'heart');
        if (!caughtOnce) { caughtOnce = true; addExp(3); say(pick(CAUGHT_LINES), 2000); }
      }
      if (Date.now() > until) {
        playCtx.stop();
        data.played++;
        addExp(2);
        syncSave();
        say('玩得好开心，歇口气～', 2400);
        afterAction();
        return;
      }
      if (playCtx) playCtx.raf = requestAnimationFrame(loop);
    })();
  }

  // 庆祝（流星雨等）
  function celebrate(ms) {
    if (S.state === 'drag') return;
    stopAuto();
    if (S.state === 'play' && playCtx) playCtx.stop();
    touch();
    tempState('celebrate', 'celebrate', ms || 6000);
  }

  // 睡觉 / 唤醒
  function sleep(ms) {
    if (S.state === 'drag' || S.state === 'play') return;
    stopAuto();
    clearTimeout(S.resumeTimer);
    clearInterval(S.lineTimer);
    endWork(true);
    touch();
    setState('sleep');
    setFace('sleep');
    say('呼…呼…', 3000);
  }
  function wake(surprised) {
    if (S.state !== 'sleep') return;
    touch();
    setState('idle');
    setFace('sad');
    say(pick(WAKE_LINES), 2600);
    setTimeout(function () { if (S.state === 'idle') setFace('idle'); }, 1200);
    if (surprised) burst(2, 'star');
  }

  // 思考
  function think() {
    touch();
    tempState('think', 'think', 4200);
    say(pick(THINK_LINES), 3200);
  }

  /* ---------- 自主漫游：随机目标点 + 平滑寻路 + 途中随机小动作 ---------- */
  var walkCtx = null;
  function stopAuto() {
    if (walkCtx) { walkCtx.cancelled = true; walkCtx = null; }
  }
  function walkTo(tx, ty, done) {
    stopAuto();
    tx = clamp(tx, 8, Math.max(8, win.innerWidth - petW() - 8));
    ty = clamp(ty, 56, Math.max(56, win.innerHeight - petH() - 8));
    var sx = pos.x, sy = pos.y;
    var dist = Math.sqrt((tx - sx) * (tx - sx) + (ty - sy) * (ty - sy));
    if (dist < 6) { if (done) done(); return; }
    setState('walk');
    setFace('happy');
    var speed = rand(0.10, 0.16);          // px/ms ≈ 100~160 px/s
    var dur = dist / speed;
    var t0 = performance.now();
    var ctx = { cancelled: false };
    walkCtx = ctx;
    (function step(now) {
      if (ctx.cancelled || walkCtx !== ctx) return;
      var k = Math.min(1, (now - t0) / dur);
      var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // easeInOutQuad
      pos.x = sx + (tx - sx) * e;
      pos.y = sy + (ty - sy) * e;
      applyPos();
      if (k < 1) requestAnimationFrame(step);
      else {
        walkCtx = null;
        syncSave();
        if (done) done();
      }
    })(performance.now());
  }
  // 出门逛：随机目标（偏好下半屏），到达后随机发呆 / 思考 / 环顾
  function wander() {
    if (S.state === 'drag' || S.state === 'play' || S.state === 'sleep' || S.work) return;
    touch();
    closeMenu();
    say(pick(['溜达溜达～', '出去逛逛', '巡视领地', '走起']), 2200);
    var margin = 28;
    var tx = rand(margin, Math.max(margin, win.innerWidth - petW() - margin));
    var tyMin = Math.max(64, win.innerHeight * 0.32);
    var ty = rand(tyMin, Math.max(tyMin, win.innerHeight - petH() - margin));
    walkTo(tx, ty, function () {
      var r = Math.random();
      if (r < .22) think();
      else if (r < .42) { say(pick(IDLE_LINES), 2600); setState('idle'); setFace('idle'); }
      else if (r < .55) lookAround();
      else { setState('idle'); setFace('idle'); }
      touch();
      S.nextThink = Date.now() + rand(2500, 6500);
    });
  }
  // 瞬间小动作
  function lookAround() {
    touch();
    tempState('idle', 'wow', 2200);
    say(pick(['嗯？什么声音', '看看周围', '有人在看我吗', '左瞧瞧右瞧瞧']), 2400);
  }
  function hop() {
    if (S.state === 'drag' || S.state === 'sleep' || S.state === 'play') return;
    touch();
    tempState('hop', 'happy', 700);
  }
  // 一次性展示某个工作道具（不进正式工作计时，用于菜单快捷触发）
  function showProp(id, ms) {
    if (S.work || S.state === 'drag' || S.state === 'sleep' || S.state === 'play') return;
    touch();
    stage.setAttribute('data-work', id);
    setState('work');
    setFace('work');
    setTimeout(function () {
      stage.removeAttribute('data-work');
      afterAction();
    }, ms || 3000);
  }

  /* ---------- 工作系统 ---------- */
  function startWork(w, silent) {
    if (S.state === 'drag' || S.state === 'play') return;
    stopAuto();
    if (!w) w = pick(WORKS);
    endWork(true);
    touch();
    setWork(w);
    setState('work');
    setFace(w.id === 'nap' ? 'sleep' : 'work');
    if (!silent) say(w.ic + ' ' + w.name + '中…', 2400);
    var dur = rand(w.dur[0], w.dur[1]);
    S.workTimer = setTimeout(endWork, dur);
    S.lineTimer = setInterval(function () { say(pick(w.lines), 2800); }, 5200);
  }
  function endWork(silent) {
    if (!S.work) return;
    clearTimeout(S.workTimer);
    clearInterval(S.lineTimer);
    var w = S.work;
    setWork(null);
    if (!silent) {
      data.works++;
      addExp(3);
      say(pick(WORK_DONE) + '（' + w.name + ' ✓）', 2800);
    }
    if (S.state === 'work') afterAction();
  }

  /* ---------- 自主行为：你不理它，它自己玩 ---------- */
  function decide() {
    var idleFor = Date.now() - S.lastAct;
    var h = new Date().getHours();
    var night = h >= 22 || h < 6;
    touch();
    if (idleFor > 90000 || (night && idleFor > 45000)) { sleep(); return; }
    var r = Math.random();
    if (night) {
      // 夜晚：多睡意、少活动
      if (r < .45) { sleep(); return; }
      if (r < .7) { think(); return; }
      say(pick(IDLE_LINES), 3000);
      return;
    }
    if (idleFor > 25000 && r < .40) { wander(); return; }        // 待久了就爱溜达
    if (idleFor > 60000 && r < .58) { startWork(); return; }     // 闲太久主动打工
    if (r < .12) { think(); return; }
    if (r < .20) { hop(); return; }
    if (r < .28) { lookAround(); return; }
    if (r < .38 && win.innerWidth > 900) { wander(); return; }
    if (r < .44) { showProp(pick(['stretch', 'stargaze']), 3200); return; }
    say(pick(IDLE_LINES), 3000);
  }

  setInterval(function () {
    if (data.hidden) return;
    if (S.state === 'sleep') {
      if (Date.now() - S.lastAct > 60000) { say('呼…呼…', 3000); touch(); }
      return;
    }
    if (S.state === 'play' || S.state === 'drag' || S.work || S.state === 'walk') return;
    // 长时间无人互动：提高决策频率，让它一直有的忙
    if (Date.now() - S.lastAct > 60000) S.nextThink = Math.min(S.nextThink, Date.now() + rand(5000, 9000));
    if (Date.now() > S.nextThink) decide();
  }, 1000);

  /* ---------- 拖拽 & 点按 ---------- */
  var down = null, dragging = false, lastTap = 0;
  wrap.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button > 0) return;
    if (S.state === 'play' && playCtx) playCtx.stop();
    down = { x: e.clientX, y: e.clientY, sx: pos.x, sy: pos.y };
    dragging = false;
    S.prevState = S.state;   // 记住拖拽前的状态，松手后恢复
    try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
  });
  wrap.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!dragging && Math.sqrt(dx * dx + dy * dy) > 5) {
      dragging = true;
      hideBubble();
      setState('drag');
      setFace('wow');
    }
    if (dragging) {
      pos.x = down.sx + dx;
      pos.y = down.sy + dy;
      applyPos();
    }
  });
  function endDrag() {
    if (!down) return;
    var moved = dragging;
    down = null;
    dragging = false;
    if (moved) {
      touch();
      syncSave();
      // 恢复到拖拽前的状态（睡觉的被拖着走，回来继续睡）
      if (S.prevState === 'sleep') { setState('sleep'); setFace('sleep'); }
      else if (S.work) { setState('work'); setFace(S.work.id === 'nap' ? 'sleep' : 'work'); }
      else { setState('idle'); setFace('idle'); }
      say(pick(DROP_LINES), 2400);
    }
  }
  wrap.addEventListener('pointerup', function () {
    if (!down) return;
    var moved = dragging;
    endDrag();
    if (!moved) tapOnce();
  });
  wrap.addEventListener('pointercancel', endDrag);

  function tapOnce() {
    var now = Date.now();
    if (now - lastTap < 450) { lastTap = 0; playWith(); return; }
    lastTap = now;
    setTimeout(function () {
      if (lastTap === now) { lastTap = 0; petHead(); }
    }, 470);
  }

  /* ---------- 面板 ---------- */
  function refreshPanel() {
    elName.textContent = data.name;
    elLv.textContent = 'Lv.' + data.lv + ' ' + LV_TITLES[data.lv - 1];
    var pct = data.lv >= 10 ? 100 : Math.round(data.exp / needExp() * 100);
    elExp.style.width = pct + '%';
    elExpTip.innerHTML = data.lv >= 10
      ? '已满级 —— <b>' + LV_TITLES[9] + '</b>'
      : '距离 <b>Lv.' + (data.lv + 1) + ' ' + LV_TITLES[data.lv] + '</b> 还差 <b>' + (needExp() - data.exp) + '</b> 点星辉';
    var m = mood();
    var mIcon = { '困倦': '☾', '兴奋': '➤', '满足': '✦', '开心': '♥', '无聊': '…', '平静': '✧' }[m] || '✧';
    elMood.innerHTML = '心情：<b>' + mIcon + ' ' + m + '</b>' + (S.work ? ' · 正在「' + S.work.label + '」' : '');
    elStats.textContent = '喂食 ' + data.fed + ' · 玩耍 ' + data.played + ' · 摸摸 ' + data.petted +
      (data.works ? ' · 打工 ' + data.works : '');
    elLvBadge.textContent = 'Lv.' + data.lv;
    stage.setAttribute('data-grown', data.lv >= 8 ? '2' : data.lv >= 5 ? '1' : '0');
    btnSleep.innerHTML = S.state === 'sleep'
      ? '<span class="ic">☀</span>叫醒'
      : '<span class="ic">☾</span>睡觉';
    refreshFlip();
  }
  function togglePanel(force) {
    var open = stage.getAttribute('data-panel') === '1';
    var next = force === undefined ? !open : force;
    if (next) {
      stage.setAttribute('data-panel', '1');
      refreshPanel();
    } else {
      stage.removeAttribute('data-panel');
    }
  }
  badge.addEventListener('click', function (e) {
    e.stopPropagation();
    touch();
    togglePanel();
  });
  $('.pet-panel-close', panel).addEventListener('click', function () { togglePanel(false); });
  doc.addEventListener('pointerdown', function (e) {
    if (stage.getAttribute('data-panel') !== '1') return;
    if (!stage.contains(e.target)) togglePanel(false);
  });

  panel.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.pet-act, [data-act="rename"]') : null;
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'feed') feed();
    else if (act === 'play') playWith();
    else if (act === 'sleep') { if (S.state === 'sleep') wake(); else sleep(90000); refreshPanel(); }
    else if (act === 'hide') hide();
    else if (act === 'rename') rename();
  });

  function rename() {
    var input = doc.createElement('input');
    input.type = 'text';
    input.value = data.name;
    input.maxLength = 8;
    var span = elName;
    span.textContent = '';
    span.appendChild(input);
    input.focus();
    input.select();
    function done(ok) {
      var v = input.value.trim();
      if (ok && v) { data.name = v; data.renamed = 1; save(); petToast('以后就叫「' + v + '」啦'); }
      refreshPanel();
    }
    input.addEventListener('blur', function () { done(true); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      else if (e.key === 'Escape') { input.value = data.name; input.blur(); }
      e.stopPropagation();
    });
    input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  }

  /* ---------- 右键菜单：随时点名一个动作 ---------- */
  var menuEl = null;
  var MENU_DEF = [
    { group: '互动' },
    { id: 'pet', label: '摸摸头', ic: '♥', fn: function () { petHead(); } },
    { id: 'feed', label: '喂食星星糖', ic: '✦', fn: function () { feed(); } },
    { id: 'play', label: '玩耍 · 追光标', ic: '➤', fn: function () { playWith(); } },
    { group: '行动' },
    { id: 'wander', label: '出去逛逛', ic: '↝', fn: function () { wander(); } },
    { id: 'think', label: '思考一下', ic: '?', fn: function () { think(); } },
    { id: 'stretch', label: '伸个懒腰', ic: '↕', fn: function () { showProp('stretch', 3400); } },
    { id: 'celebrate', label: '转个圈圈', ic: '★', fn: function () { celebrate(3200); } },
    { group: '工作' },
    { id: 'work', label: '打个工（随机）', ic: '⚙', fn: function () { startWork(); } },
    { id: 'stargaze', label: '去数星星', ic: '✧', fn: function () { startWork(byId('stargaze')); } },
    { id: 'write', label: '去写文章', ic: '✎', fn: function () { startWork(byId('write')); } },
    { id: 'debug', label: '去捉 Bug', ic: '⚠', fn: function () { startWork(byId('debug')); } },
    { id: 'coffee', label: '去喝咖啡', ic: '☕', fn: function () { startWork(byId('coffee')); } },
    { group: '其他' },
    { id: 'sleep', label: '睡觉', ic: '☾', fn: function () { sleep(90000); } },
    { id: 'hide', label: '藏起来', ic: '✕', fn: function () { hide(); } }
  ];
  function menuHtml() {
    var html = '';
    MENU_DEF.forEach(function (it) {
      if (it.group) { html += '<div class="pet-menu-group">' + it.group + '</div>'; return; }
      var label = it.label, ic = it.ic;
      if (it.id === 'sleep' && S.state === 'sleep') { label = '叫醒它'; ic = '☀'; }
      html += '<button class="pet-menu-item" type="button" role="menuitem" data-act="' + it.id + '">' +
        '<span class="mi-ic">' + ic + '</span><span class="mi-label">' + label + '</span></button>';
    });
    return html;
  }
  function openMenu(x, y) {
    if (data.hidden) return;
    if (!menuEl) {
      menuEl = doc.createElement('div');
      menuEl.className = 'pet-menu';
      menuEl.setAttribute('role', 'menu');
      doc.body.appendChild(menuEl);
      menuEl.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('.pet-menu-item') : null;
        if (!btn) return;
        var id = btn.getAttribute('data-act');
        var def = null;
        for (var i = 0; i < MENU_DEF.length; i++) if (MENU_DEF[i].id === id) def = MENU_DEF[i];
        closeMenu();
        if (def && def.fn) def.fn();
      });
      doc.addEventListener('pointerdown', function (e) {
        if (!menuEl || !menuEl.classList.contains('open')) return;
        if (menuEl.contains(e.target) || stage.contains(e.target)) return;
        closeMenu();
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') closeMenu();
      });
      win.addEventListener('scroll', function () { if (menuEl) closeMenu(); }, { passive: true });
      win.addEventListener('blur', function () { if (menuEl) closeMenu(); });
    }
    menuEl.innerHTML = menuHtml();
    menuEl.classList.add('open');
    var r = menuEl.getBoundingClientRect();
    var mx = Math.min(x, win.innerWidth - r.width - 12);
    var my = y + 8;
    if (my + r.height > win.innerHeight - 12) my = Math.max(12, y - r.height - 8);
    menuEl.style.left = Math.max(12, mx) + 'px';
    menuEl.style.top = my + 'px';
  }
  function closeMenu() {
    if (menuEl) menuEl.classList.remove('open');
  }
  // 右键唤出（仅限宠物本体，不影响页面其他地方的原生菜单）
  stage.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    e.stopPropagation();
    openMenu(e.clientX, e.clientY);
  });
  // 触屏长按 500ms 等价唤出
  var lpTimer = null, lpPos = null;
  wrap.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch') return;
    lpPos = { x: e.clientX, y: e.clientY };
    lpTimer = setTimeout(function () {
      lpTimer = null;
      if (lpPos) openMenu(lpPos.x, lpPos.y);
      down = null;
      dragging = false;
    }, 500);
  });
  wrap.addEventListener('pointermove', function (e) {
    if (lpTimer && lpPos && Math.sqrt((e.clientX - lpPos.x) * (e.clientX - lpPos.x) + (e.clientY - lpPos.y) * (e.clientY - lpPos.y)) > 8) {
      clearTimeout(lpTimer);
      lpTimer = null;
    }
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    wrap.addEventListener(ev, function () {
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
    });
  });

  /* ---------- 隐藏 / 叫回 ---------- */
  function hide() {
    data.hidden = 1;
    save();
    stage.setAttribute('data-hidden', '1');
    togglePanel(false);
    petToast('星星人藏起来了', '叫它回来', show);
  }
  function show() {
    data.hidden = 0;
    save();
    stage.removeAttribute('data-hidden');
    applyPos();
    say('我回来啦 ✦', 2600);
    setFace('happy');
    setTimeout(function () { if (S.state !== 'sleep') setFace('idle'); }, 1600);
  }

  /* ---------- 迷你 toast（复用站点 toast 样式） ---------- */
  var toastTimer = null;
  function petToast(msg, actionLabel, actionFn) {
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
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, actionLabel ? 8000 : 2400);
  }

  /* ---------- 环境联动 ---------- */
  // 流星雨彩蛋：星星人跑出来围观
  win.addEventListener('pet:meteor', function () {
    if (data.hidden) return;
    if (S.state === 'sleep') wake();
    celebrate(7000);
    say('是流星雨！快许愿 ✦', 5200);
  });

  // 主题切换
  win.addEventListener('pet:theme', function (e) {
    if (data.hidden || S.state === 'sleep' || S.state === 'drag') return;
    var dark = e.detail && e.detail.dark;
    say(dark ? pick(NIGHT_LINES) : '天亮啦，打起精神 ✦', 2600);
  });

  // 划到底部：关心一下
  var lastScrollLine = 0;
  win.addEventListener('scroll', function () {
    if (data.hidden) return;
    var now = Date.now();
    if (now - lastScrollLine < 90000) return;
    var docH = doc.documentElement.scrollHeight;
    if (win.scrollY + win.innerHeight > docH - 80 && docH > win.innerHeight + 200) {
      lastScrollLine = now;
      say('看完啦？去休息一下吧 ☕', 3000);
    }
  }, { passive: true });

  // 切回标签页
  var hiddenAt = 0;
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) { hiddenAt = Date.now(); return; }
    if (data.hidden) return;
    if (hiddenAt && Date.now() - hiddenAt > 120000) {
      if (S.state === 'sleep') wake();
      say('想你了，刚才去哪儿啦', 2600);
    }
  });

  /* ---------- 天上掉星星糖：待着无聊时突然有糖吃 ---------- */
  var autoCandyTimer = null;
  function scheduleAutoCandy() {
    clearTimeout(autoCandyTimer);
    autoCandyTimer = setTimeout(dropCandy, rand(120000, 300000));   // 2~5 分钟一颗
  }
  function dropCandy() {
    scheduleAutoCandy();
    if (data.hidden || S.state === 'sleep' || S.state === 'drag' || S.state === 'play' || S.work) return;
    var c = doc.createElement('span');
    c.className = 'pet-candy drop';
    c.textContent = '✦';
    c.style.left = (16 + Math.random() * 62) + '%';
    wrap.appendChild(c);
    var eaten = false;
    var check = setInterval(function () {
      if (eaten) return;
      var free = { idle: 1, think: 1, walk: 1, greet: 1, sad: 1, hop: 1, celebrate: 1 };
      if (!free[S.state]) return;
      eaten = true;
      clearInterval(check);
      c.remove();
      stopAuto();
      touch();
      lastFed = Date.now();
      data.fed++;
      addExp(4);
      setState('eat');
      setFace('eat');
      say(pick(['居然有星星糖从天上来 ✦', '捡到宝了，吃掉吃掉', '天上下糖啦，啊——']), 2600);
      burst(3, 'star');
      setTimeout(afterAction, 1400);
    }, 400);
    setTimeout(function () {
      if (!eaten) { clearInterval(check); c.remove(); }
    }, 45000);
  }
  scheduleAutoCandy();

  /* ---------- 页面互动联动：点赞 / 复制链接 ---------- */
  doc.addEventListener('click', function (e) {
    if (data.hidden) return;
    var t = e.target;
    if (!t || !t.closest) return;
    var like = t.closest('#like-btn');
    if (like && !like.classList.contains('liked')) {
      // 点赞后的小欢呼（liked 类由 main.js 添加，这里只蹭热乎）
      setTimeout(function () {
        if (like.classList.contains('liked')) {
          celebrate(2600);
          say('谢谢你的喜欢 ♥', 2600);
        }
      }, 60);
      return;
    }
    var copy = t.closest('.share-btn[data-share="copy"]');
    if (copy) {
      setTimeout(function () {
        say('链接 Copied，快去分享 ✦', 2400);
        setFace('happy');
        setTimeout(function () { if (S.state === 'idle') setFace('idle'); }, 1600);
      }, 120);
    }
  });

  /* ---------- 打招呼 ---------- */
  refreshPanel();
  setTimeout(function () {
    if (data.hidden) return;
    data.visits++;
    save();
    if (data.visits <= 1 && !data.renamed) {
      tempState('greet', 'greet', 2800);
      say('你好呀，我是' + data.name + ' ✦ 摸摸我、喂我星星糖，或者双击我和你玩', 5200);
    } else if (data.visits <= 6) {
      say('又见面啦', 2400);
      setFace('happy');
      setTimeout(function () { if (S.state === 'idle') setFace('idle'); }, 1600);
    }
  }, 1500);

  /* ---------- 测试 / 调试 API ---------- */
  win.__pet = {
    el: stage,
    data: data,
    api: {
      feed: feed, play: playWith, pet: petHead,
      sleep: function () { sleep(90000); }, wake: wake,
      celebrate: celebrate, hide: hide, show: show,
      startWork: startWork, endWork: function () { endWork(); },
      decide: decide, say: say, addExp: addExp,
      wander: wander, hop: hop, lookAround: lookAround, showProp: showProp,
      openMenu: openMenu, closeMenu: closeMenu,
      dropCandy: dropCandy, mood: mood, byId: byId,
      save: save, refresh: refreshPanel,
      state: function () { return { state: S.state, face: S.face, work: S.work ? S.work.id : null, hidden: !!data.hidden }; }
    }
  };
})();
