/* Service worker: abre o app sem internet. Páginas: usa o cache e atualiza em segundo plano.
   Dados (data/): tenta a rede primeiro (agenda sempre atualizada) e cai no cache se estiver offline. */
var V = "missas-v1";
var SHELL = ["index.html", "style.css", "app.js", "theme.js", "manifest.webmanifest",
  "fonts/cormorant-garamond-latin.woff2", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "data/config.json", "data/meses.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) {
    return c.addAll(SHELL).then(function () { return fetch("data/meses.json", { cache: "no-cache" }); })
      .then(function (r) { return r.json(); })
      .then(function (ms) { return Promise.all(ms.map(function (m) { return c.add("data/" + m + ".json").catch(function () {}); })); });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  var fresh = new Request(req, { cache: "no-cache" });
  if (url.pathname.indexOf("/data/") !== -1) {
    e.respondWith(fetch(fresh).then(function (r) {
      if (r.ok) { var c = r.clone(); caches.open(V).then(function (ch) { ch.put(req, c); }); }
      return r;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    var net = fetch(fresh).then(function (r) {
      if (r.ok) { var c = r.clone(); caches.open(V).then(function (ch) { ch.put(req, c); }); }
      return r;
    }).catch(function () { return hit || (req.mode === "navigate" ? caches.match("index.html") : undefined); });
    return hit || net;
  }));
});
