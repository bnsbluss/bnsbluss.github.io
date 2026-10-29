/* Kota Mati — service worker LAMA (alamat kotamati.html). Sekarang hanya membersihkan diri: game pindah ke index awal. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('kotamati-')).map(k=>caches.delete(k)))).then(()=>self.registration.unregister()));});
