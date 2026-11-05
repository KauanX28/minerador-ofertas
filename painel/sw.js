// Service worker: guarda a casca do painel para abrir rápido e funcionar como app instalado.
// Dados (/api) nunca vêm do cache: sempre frescos.
const CACHE = 'minerador-v1';
const CASCA = ['/', '/index.html', '/estilo.css', '/icone.svg', '/vendor/preact.mjs', '/vendor/hooks.mjs', '/vendor/htm.mjs'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // Rede primeiro (sempre a versão nova); cache só se estiver offline.
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); if (r.ok) caches.open(CACHE).then((x) => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html'))));
});
