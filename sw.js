/* Service worker — deixa o site abrir sem internet (a última carga boa fica no IndexedDB, o visual fica aqui).
   Estratégia: rede primeiro; se falhar, cache. O Trello e o Google nunca passam por aqui. */
const V = "rpm-2026.09.25";
const SHELL = ["./", "index.html", "manifest.webmanifest", "assets/css/app.css",
  "assets/js/app.js", "assets/js/config.js", "assets/js/util.js", "assets/js/parse.js", "assets/js/trello.js", "assets/js/regras.js", "assets/js/agenda.js",
  "assets/js/apresentacao.js", "assets/js/charts.js", "assets/js/ui.js",
  "assets/js/views/hoje.js", "assets/js/views/caixa.js", "assets/js/views/laudos.js", "assets/js/views/imp.js", "assets/js/views/agendar.js",
  "assets/js/views/pje.js", "assets/js/views/cobranca.js", "assets/js/views/visao.js", "assets/js/views/ficha.js", "assets/js/views/config.js",
  "assets/brand/logo-horizontal.svg", "assets/brand/logo-horizontal-claro.svg", "assets/brand/tipografia.svg", "assets/brand/icone-app.svg", "assets/brand/icone-192.png",
  ...["anexo", "cadeado", "calendario", "comentario", "documento", "email", "escudo", "laco", "like", "lupa", "megafone", "notificacao", "pessoa", "prancheta", "pulso", "relogio", "salvar", "seringa", "seta", "trofeu"].map(n => `assets/brand/icones/${n}.svg`)];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok && !u.pathname.includes("/data/")) caches.open(V).then(c => c.put(e.request, r.clone())); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || (e.request.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
