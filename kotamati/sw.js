/* Kota Mati — service worker (PWA), berlaku untuk folder /kotamati/. Versi: 20261029-032055 */
const C='kmweb-20261029-032055',CORE=["./", "css/style.css?v=20261029-032055", "js/game.js?v=20261029-032055", "js/akun.js?v=20261029-032055", "js/config.js?v=20261029-032055", "icon-192.png", "favicon-48.png", "apple-touch-icon.png", "img/title.webp", "img/raksasa.webp", "img/kuntilanak.webp", "img/char-ucok.webp", "img/char-polisi.webp", "img/char-hasmat.webp", "img/char-ida.webp", "img/char-stevi.webp", "img/char-rito.webp", "img/gendut.webp", "img/lidah.webp", "img/peludah.webp", "img/pemburu.webp", "img/penunggang.webp", "img/penyeruduk.webp", "img/senjata.png", "img/zdesa.webp", "img/ztentara.webp", "img/zrangkak.webp", "img/bos.webp", "img/fpv.webp", "img/ikon-senjata.webp", "manifest.webmanifest", "js/three.min.js?v=r128"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).catch(()=>{}).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>(k.startsWith('kmweb-')&&k!==C)||k.startsWith('kotamati-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin!==location.origin||!u.pathname.startsWith('/kotamati/'))return;
  if(u.pathname.endsWith('version.json')||u.pathname.endsWith('.ini')||u.pathname.endsWith('.mp3'))return;
  if(r.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('.html')){
    e.respondWith(fetch(u.href,{cache:'no-cache',credentials:'same-origin'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));}return res;})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('./'))));return;}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok&&res.status===200){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));}return res;})));});
