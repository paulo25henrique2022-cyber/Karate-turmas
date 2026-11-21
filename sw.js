// Guarda os arquivos do app para funcionar sem internet.
const VERSAO = 'karate-v1.5.1';
const ARQS = ['./', 'index.html', 'style.css', 'app.js', 'pdf.js', 'manifest.json',
  'img/inicio.jpg', 'img/juvenil.jpg', 'img/infantil.jpg', 'img/dojo.jpg', 'img/icone-192.png', 'img/icone-512.png', 'img/apple-icon.png', 'img/logo-athletic.png', 'img/logo-sensei.jpg', 'img/aviso-fundo.jpg', 'fontes/Anton-Regular.ttf', 'fontes/Montserrat.ttf'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // rede primeiro (pega atualizações), cache se estiver sem internet
  // se o site sair do ar (erro 404 etc.) ou estiver sem internet, usa a cópia guardada no celular
  const doCache = () => caches.match(e.request, { ignoreSearch: true });
  e.respondWith(fetch(e.request).then(async r => {
    if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, copia)); return r; }
    return (await doCache()) || r;
  }).catch(doCache));
});
