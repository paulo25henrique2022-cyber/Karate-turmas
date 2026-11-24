// Service worker: faz o app abrir e funcionar sem internet.
// Ao mudar arquivos do app, troque a versão abaixo (v2, v3...) para forçar a atualização.
const CACHE = 'karate-turmas-v2';
const ESSENCIAIS = ['./', './index.html', './manifest.json', './style.css', './pdf.js', './app.js', './img/apple-icon.png', './img/icone-192.png', './img/icone-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ESSENCIAIS.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('karate-turmas-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Abertura de páginas: tenta a rede; sem sinal, usa a cópia salva.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copia));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Demais arquivos (imagens, CSS, JS, fontes): usa o salvo e atualiza em segundo plano.
  e.respondWith(
    caches.match(req).then((salvo) => {
      const rede = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => salvo);
      return salvo || rede;
    })
  );
});
