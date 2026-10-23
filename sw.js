/* ============================================================
   星记 · Service Worker
   策略：静态资源 stale-while-revalidate（先返回缓存保证速度，
   后台拉取新版并更新缓存，资源更新后下一次加载即生效）；
   页面 network-first，离线时回退到缓存；导航失败时展示缓存的 404 页。
   ============================================================ */
var VERSION = 'xingji-v6';
var SHELL = [
  '/',
  '/archive/',
  '/tags/',
  '/search/',
  '/stats/',
  '/series/',
  '/guestbook/',
  '/about/',
  '/lab/',
  '/books/',
  '/friends/',
  '/timeline/',
  '/nav/',
  '/404.html',
  '/manifest.webmanifest',
  '/search.json',
  '/assets/css/main.css',
  '/assets/css/pet.css',
  '/assets/css/syntax.css',
  '/assets/js/main.js',
  '/assets/js/pet.js',
  '/assets/js/posts-data.js',
  '/assets/js/pinyin-data.js',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* 单个资源失败不阻塞安装 */ })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 管理台（/workbench/ 及其专属资源）不缓存、不拦截
  if (url.pathname.indexOf('/workbench') === 0 ||
      /\/assets\/(css|js)\/(workbench|md)\.(css|js)$/.test(url.pathname)) return;

  // 静态资源：stale-while-revalidate
  if (/\.(css|js|png|svg|woff2?|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(VERSION).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      })
    );
    return;
  }

  // 页面：network-first，离线回退缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('/404.html');
        });
      })
    );
    return;
  }

  // 其他（如 feed.xml）：staleness-ok 的 cache-first
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
