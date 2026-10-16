/* Copia local para que la página funcione con mala cobertura.
   La página y mesas.json van primero a la red (por si se cambia una mesa a última hora)
   y, si no hay red en 3 s, salen de la copia. El resto sale de la copia directamente.
   Al cambiar cualquier fichero, subir VERSION. */
var VERSION = 'mesa-v13';
var FICHEROS = [
  './',
  'index.html',
  'estilo.css?v=13',
  'app.js?v=6',
  'mesas.json',
  'img/logo-30-pie-blanco.png',
  'img/rotary-vertical-blanco.svg',
  'img/rueda-rotary.svg',
  'img/rotary-palabra-blanco.svg',
  'fuentes/atkinson-400.woff2',
  'fuentes/atkinson-700.woff2',
  'fuentes/cormorant.woff2',
];
var OPCIONALES = [];

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(FICHEROS).then(function () {
      return Promise.all(OPCIONALES.map(function (f) { return c.add(f).catch(function () {}); }));
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function redPrimero(req) {
  return caches.open(VERSION).then(function (c) {
    var red = fetch(req).then(function (r) {
      if (r && r.ok) c.put(req, r.clone());
      return r;
    });
    var plazo = new Promise(function (res) { setTimeout(res, 3000); });
    return Promise.race([red, plazo.then(function () { return c.match(req, { ignoreSearch: true }); })])
      .then(function (r) { return r || red; })
      .catch(function () { return c.match(req, { ignoreSearch: true }).then(function (r) { return r || c.match('./'); }); });
  });
}

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  var url = new URL(req.url);
  if (req.mode === 'navigate' || /mesas\.json$/.test(url.pathname)) {
    ev.respondWith(redPrimero(req));
    return;
  }
  ev.respondWith(caches.match(req).then(function (r) {
    return r || fetch(req).then(function (resp) {
      if (resp && resp.ok) caches.open(VERSION).then(function (c) { c.put(req, resp.clone()); });
      return resp;
    });
  }));
});
