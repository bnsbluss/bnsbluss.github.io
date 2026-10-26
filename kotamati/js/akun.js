/* Kota Mati — akun pemain, EXP, pangkat, dan leaderboard.
   Akun online memakai Firebase (Auth + Firestore). Isi konfigurasi di js/config.js.
   Kalau konfigurasi kosong, game tetap jalan dalam mode tamu (data disimpan di browser). */
(()=>{'use strict';
const CFG=window.KM_FIREBASE||null;
const LS='kotamati-profil';
const RANKS=[['PRAJURIT DUA',0],['PRAJURIT SATU',500],['PRAJURIT KEPALA',1500],['KOPRAL',3000],['SERSAN DUA',5000],['SERSAN SATU',8000],['SERSAN KEPALA',12000],
  ['LETNAN DUA',17000],['LETNAN SATU',23000],['KAPTEN',30000],['MAYOR',38000],['LETNAN KOLONEL',47000],['KOLONEL',57000],['BRIGJEN',68000],['MAYJEN',80000],['LETJEN',95000],['JENDERAL',120000]];
const STATS=['exp','kills','hs','games','best','boss','revives','wins','waves'];
const n0=v=>(typeof v==='number'&&Number.isFinite(v))?Math.max(0,Math.floor(v)):0;
function rankOf(exp){exp=n0(exp);let i=0;while(i+1<RANKS.length&&exp>=RANKS[i+1][1])i++;const cur=RANKS[i][1],nx=i+1<RANKS.length?RANKS[i+1][1]:null;
  return{lv:i+1,name:RANKS[i][0],exp,cur,next:nx,prog:nx?(exp-cur)/(nx-cur):1};}
/* lencana pangkat 12x12 piksel: prajurit (hijau), bintara (merah), perwira (biru), jenderal (hitam-merah) */
function drawRank(g,lv,x,y,s){s=s||1;lv=Math.max(1,Math.min(RANKS.length,lv|0));
  const P=(px,py,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x+px*s),Math.round(y+py*s),Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s)));};
  const tier=lv<=3?0:lv<=7?1:lv<=13?2:3,bg=['#3e4a22','#6a1a1a','#1e2a4a','#2a0a10'][tier],rim=['#6e7f38','#b8402e','#4a6aa8','#c8302a'][tier];
  P(0,0,12,12,'#120a0e');P(1,1,10,10,bg);P(1,1,10,1,rim);P(1,10,10,1,'#0a0608');
  const chev=(yy,c)=>{P(1,yy+2,2,1,c);P(3,yy+1,2,1,c);P(5,yy,2,1,c);P(7,yy+1,2,1,c);P(9,yy+2,2,1,c);P(5,yy+1,2,1,c);};
  if(tier===0)for(let i=0;i<lv;i++)chev(7-i*3,'#ffd84a');
  else if(tier===1)for(let i=0;i<lv-3;i++)chev(8-i*2,i===lv-4?'#ffe98a':'#ffc93a');
  else if(tier===2){const k=lv-7;if(k<=3){for(let i=0;i<k;i++){P(2,8-i*3,8,2,'#ffd84a');P(2,8-i*3,8,1,'#fff3b0');}}
    else{const m=k-3,xs=m===1?[4.5]:m===2?[2.5,6.5]:[1,4.5,8];for(const cx of xs){P(cx+1,3,1,1,'#ffd84a');P(cx,4,3,1,'#ffd84a');P(cx+1,5,1,1,'#ffd84a');P(cx+1,4,1,1,'#fff3b0');}
      P(2,8,8,1,'#ffd84a');}}
  else{const m=lv-13,pos=m===1?[[4.5,4.5]]:m===2?[[2.5,4.5],[6.5,4.5]]:m===3?[[1,4.5],[4.5,4.5],[8,4.5]]:[[2.5,2.5],[6.5,2.5],[2.5,6.5],[6.5,6.5]];
    for(const[cx,cy]of pos){P(cx+1,cy,1,3,'#e8ecf4');P(cx,cy+1,3,1,'#e8ecf4');P(cx+1,cy+1,1,1,'#ffffff');}}}
function calcExp(st){st=st||{};let e=20;
  if(st.mode==='pvp')e+=n0(st.kills)*10+(st.win?100:0);
  else e+=n0(st.kills)*2+n0(st.hs)*1+Math.max(0,n0(st.wave)-1)*15+n0(st.boss)*150+n0(st.revives)*30;
  return Math.min(5000,Math.round(e));}
function blank(){return{nick:'',exp:0,kills:0,hs:0,games:0,best:0,boss:0,revives:0,wins:0,waves:0};}
function loadLocal(){const b=blank();try{const o=JSON.parse(localStorage.getItem(LS)||'{}');if(o&&typeof o==='object'){for(const k of STATS)b[k]=n0(o[k]);if(typeof o.nick==='string')b.nick=o.nick;}}catch(e){}
  try{if(!b.nick)b.nick=localStorage.getItem('kotamati-nick')||'';const best=n0(+localStorage.getItem('kotamati-best'));if(best>b.best)b.best=best;}catch(e){}return b;}
function saveLocal(p){try{localStorage.setItem(LS,JSON.stringify(p));}catch(e){}}
const validNick=n=>/^[A-Za-z0-9_]{3,10}$/.test(String(n||''));
const EMAIL=n=>String(n).toLowerCase()+'@kotamati.app';
function errMsg(e){const c=e&&e.code||'';
  if(c==='km/name-taken'||c==='auth/email-already-in-use')return'Nama itu sudah dipakai pemain lain.';
  if(c==='auth/invalid-credential'||c==='auth/wrong-password'||c==='auth/user-not-found'||c==='auth/invalid-login-credentials')return'Nama atau password salah.';
  if(c==='auth/weak-password')return'Password minimal 6 karakter.';
  if(c==='auth/too-many-requests')return'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  if(c==='auth/network-request-failed'||c==='unavailable')return'Tidak ada koneksi internet.';
  if(c==='auth/operation-not-allowed')return'Login nama dan password belum diaktifkan di Firebase (lihat PANDUAN).';
  if(c==='permission-denied')return'Database menolak akses. Cek aturan Firestore (lihat PANDUAN).';
  return'Gagal: '+(e&&e.message?String(e.message).slice(0,90):'coba lagi.');}
const configured=!!(CFG&&CFG.apiKey&&CFG.projectId&&!/^ISI|YOUR|xxx/i.test(String(CFG.apiKey)));
let auth=null,db=null,user=null,prof=null,local=loadLocal(),online=false,initErr='';
const subs=[];
function emit(){const s=api.state();for(const f of subs){try{f(s);}catch(e){}}}
function cur(){return user&&prof?prof:local;}
async function fetchProfile(u){const ref=db.collection('users').doc(u.uid);const snap=await ref.get();
  if(snap.exists){const d=snap.data()||{},p=blank();for(const k of STATS)p[k]=n0(d[k]);p.nick=String(d.nick||'').slice(0,10);return p;}
  const nick=String((u.email||'').split('@')[0]||'pemain').slice(0,10),p=Object.assign(blank(),{nick});
  await ref.set(Object.assign({},p,{nickLower:nick.toLowerCase(),createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()}));return p;}
let readyRes;const ready=new Promise(r=>{readyRes=r;});
function init(){
  if(!configured||!window.firebase){if(configured&&!window.firebase)initErr='Library Firebase gagal dimuat (cek internet).';readyRes();return;}
  try{if(!firebase.apps.length)firebase.initializeApp(CFG);auth=firebase.auth();db=firebase.firestore();online=true;}catch(e){initErr=errMsg(e);online=false;readyRes();return;}
  let first=true;
  auth.onAuthStateChanged(async u=>{try{if(u){user=u;prof=await fetchProfile(u);}else{user=null;prof=null;}}catch(e){initErr=errMsg(e);if(u){user=u;prof=prof||Object.assign(blank(),{nick:String((u.email||'').split('@')[0]).slice(0,10)});}}
    emit();if(first){first=false;readyRes();}});}
const api={
  RANKS,rankOf,drawRank,calcExp,validNick,ready,
  get online(){return online;},get configured(){return configured;},get initErr(){return initErr;},
  state(){const p=cur();return{online,configured,logged:!!(user&&prof),nick:p.nick,prof:Object.assign({},p),rank:rankOf(p.exp)};},
  onChange(f){subs.push(f);return()=>{const i=subs.indexOf(f);if(i>=0)subs.splice(i,1);};},
  setGuestNick(n){local.nick=String(n||'').slice(0,10);saveLocal(local);emit();},
  async register(nick,pass){if(!online)throw{code:'km/offline',message:'Akun online belum aktif.'};
    if(!validNick(nick))throw{code:'km/bad-nick',message:'Nama 3–10 huruf, angka, atau garis bawah.'};if(String(pass||'').length<6)throw{code:'auth/weak-password'};
    const low=nick.toLowerCase(),nameRef=db.collection('names').doc(low);
    try{const s=await nameRef.get();if(s.exists)throw{code:'km/name-taken'};}catch(e){if(e&&e.code==='km/name-taken')throw e;}
    const cred=await auth.createUserWithEmailAndPassword(EMAIL(nick),pass);const uid=cred.user.uid;
    const p=Object.assign(blank(),{nick});for(const k of STATS)p[k]=Math.min(k==='exp'?20000:1e9,n0(local[k]));
    const ts=firebase.firestore.FieldValue.serverTimestamp();
    try{const b=db.batch();b.set(nameRef,{uid});b.set(db.collection('users').doc(uid),Object.assign({},p,{nickLower:low,createdAt:ts,updatedAt:ts}));await b.commit();}
    catch(e){try{await cred.user.delete();}catch(_){}throw (e&&e.code==='permission-denied')?{code:'km/name-taken'}:e;}
    user=cred.user;prof=p;emit();return api.state();},
  async login(nick,pass){if(!online)throw{code:'km/offline',message:'Akun online belum aktif.'};if(!validNick(nick))throw{code:'auth/invalid-credential'};
    const cred=await auth.signInWithEmailAndPassword(EMAIL(nick),pass);user=cred.user;prof=await fetchProfile(cred.user);emit();return api.state();},
  async logout(){if(auth)try{await auth.signOut();}catch(e){}user=null;prof=null;emit();},
  async addMatch(st){const gained=calcExp(st),p=cur(),before=rankOf(p.exp);
    const inc={exp:gained,kills:n0(st.kills),hs:n0(st.hs),games:1,boss:n0(st.boss),revives:n0(st.revives),wins:st.win?1:0};
    for(const k in inc)p[k]=n0(p[k])+inc[k];const nb=n0(st.score)>p.best;if(nb)p.best=n0(st.score);if(n0(st.wave)>p.waves)p.waves=n0(st.wave);
    const after=rankOf(p.exp);let synced=!user;
    if(user&&prof){try{const F=firebase.firestore.FieldValue,u={updatedAt:F.serverTimestamp()};for(const k in inc)if(inc[k])u[k]=F.increment(inc[k]);
        if(nb)u.best=p.best;u.waves=p.waves;await db.collection('users').doc(user.uid).update(u);synced=true;}catch(e){initErr=errMsg(e);synced=false;}}
    else saveLocal(local);
    emit();return{gained,before,after,up:after.lv>before.lv,synced};},
  async leaderboard(field,n){field=['exp','best','kills'].includes(field)?field:'exp';n=Math.max(5,Math.min(100,n|0||50));
    if(!online){const p=cur();return{online:false,rows:p.nick?[{nick:p.nick,exp:p.exp,best:p.best,kills:p.kills,me:true}]:[]};}
    const q=await db.collection('users').orderBy(field,'desc').limit(n).get();const rows=[];
    q.forEach(d=>{const x=d.data()||{};rows.push({nick:String(x.nick||'?').slice(0,10),exp:n0(x.exp),best:n0(x.best),kills:n0(x.kills),me:!!(user&&d.id===user.uid)});});
    return{online:true,rows};},
  errMsg,
};
window.KMA=api;init();
})();
