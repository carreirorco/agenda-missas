/* Service worker: abre o app sem internet. Rede primeiro para tudo (agenda e arquivos sempre atualizados);
   o cache só entra quando estiver offline ou a rede demorar. */
var V = "missas-v2";
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
  /* rede primeiro (sempre a versão mais nova, sem misturar arquivos de versões diferentes);
     se estiver offline ou a rede demorar mais de 4 s, usa o cache */
  var rede = new Promise(function (ok, no) {
    var t = setTimeout(function () { no(new Error("timeout")); }, 4000);
    fetch(fresh).then(function (r) { clearTimeout(t); ok(r); }, function (e) { clearTimeout(t); no(e); });
  });
  e.respondWith(rede.then(function (r) {
    if (r.ok) { var c = r.clone(); caches.open(V).then(function (ch) { ch.put(req, c); }); }
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || (req.mode === "navigate" ? caches.match("index.html") : undefined);
    });
  }));
});
