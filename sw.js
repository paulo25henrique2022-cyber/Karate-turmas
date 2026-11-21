// Guarda os arquivos do app para funcionar sem internet.
const VERSAO = 'karate-v1.1';
const ARQS = ['./', 'index.html', 'style.css', 'app.js', 'pdf.js', 'manifest.json',
  'img/inicio.jpg', 'img/juvenil.jpg', 'img/infantil.jpg', 'img/dojo.jpg', 'img/icone-192.png', 'img/icone-512.png', 'img/apple-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // rede primeiro (pega atualizações), cache se estiver sem internet
  e.respondWith(fetch(e.request).then(r => {
    const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, copia)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
