/* Kota Mati — service worker (PWA). Versi: 20261027-011918 */
const C='kotamati-20261027-011918',CORE=["kotamati.html", "kotamati/css/style.css?v=20261027-011918", "kotamati/js/game.js?v=20261027-011918", "kotamati/js/akun.js?v=20261027-011918", "kotamati/js/config.js?v=20261027-011918", "kotamati/icon-192.png", "kotamati/manifest.webmanifest", "kotamati/js/three.min.js?v=r128"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).catch(()=>{}).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('kotamati-')&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin!==location.origin||!u.pathname.includes('/kotamati'))return;
  if(u.pathname.endsWith('version.json')||u.pathname.endsWith('.mp3'))return;
  if(r.mode==='navigate'||u.pathname.endsWith('.html')){
    e.respondWith(fetch(u.href,{cache:'no-cache',credentials:'same-origin'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));}return res;})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('kotamati.html'))));return;}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok&&res.status===200){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));}return res;})));});
