/* Rapportini – copia della pagina sul telefono, così l'app si apre anche senza connessione.
   Regola: prima la rete (versione sempre aggiornata); se non prende entro 5 secondi, la copia salvata.
   Il backoffice (ufficio.html) e le chiamate al registro (Google) NON passano di qui. */
const CACHE = 'rapportini-v1';
const FILES = ['./', './index.html', './icona-180.png', './icona-192.png', './icona-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;              // font, registro Google: come sempre
  if (/ufficio/i.test(url.pathname)) return;                     // backoffice: mai copie vecchie
  const pagina = req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);
  if (!pagina && !/\.png$/i.test(url.pathname)) return;
  const chiave = pagina ? './index.html' : req;
  e.respondWith(new Promise(resolve => {
    let fatto = false;
    const dallaCopia = () => caches.match(chiave, { ignoreSearch: true });
    const t = setTimeout(() => dallaCopia().then(c => { if (c && !fatto) { fatto = true; resolve(c); } }), 5000);
    fetch(req).then(r => {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(chiave, cp)); }
      if (!fatto) { fatto = true; clearTimeout(t); resolve(r); }
    }).catch(() => {
      clearTimeout(t);
      dallaCopia().then(c => { if (!fatto) { fatto = true; resolve(c || Response.error()); } });
    });
  }));
});
