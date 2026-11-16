/* Swarm layer — kode orisinal untuk portofolio ini.
   Konsepnya terinspirasi Swarm (Joel Califa) dan Swarm Rebuild; tidak ada kode mereka di sini.
   Membaca cursor milik engine lama lewat window.__swarm, lalu menambahkan overlay ala
   Swarm: label nama, badge W × H, guide merah, dan ukuran jarak antar elemen kembar. */
const S=window.__swarm;
if(S&&S.list){
const D=document,L=D.createElement('div'),st=D.createElement('style');
L.id='sw-l';
st.textContent='#sw-l{position:fixed;inset:0;z-index:57;pointer-events:none;overflow:hidden}.sw-n,.sw-g,.sw-t,.sw-b{position:absolute;left:0;top:0;opacity:0;white-space:nowrap;transition:opacity .25s;will-change:transform}.sw-n{font:600 10px var(--mono);padding:1px 7px;border-radius:99px;color:#04101f}.sw-g{background:#ff4d4d}.sw-t,.sw-b{font:10px var(--mono);padding:1px 6px;border-radius:4px}.sw-t{background:#ff4d4d;color:#fff}.sw-b{background:var(--ac);color:#04101f}';
D.head.append(st);D.body.append(L);
const mk=c=>{const e=D.createElement('div');e.className=c;L.append(e);return e};
const NM=['claude','ghidra','i3','python','php','postgres','kota','watchdog','hyperion','midtrans','i3pack','rsc','heavyrain'];
const tags=S.list.map((c,i)=>{
  const e=mk('sw-n');
  e.textContent=NM[i%NM.length]+(i>=NM.length?'_'+(Math.floor(i/NM.length)+1):'');
  e.style.background=`hsl(${i*47%360} 85% 72%)`;
  return e;
});
const A=new Map();
const busy=c=>{try{const p=c.task&&c.task.prog();return p>0&&p<1}catch{return false}};
const at=(d,k,c)=>d[k]||(d[k]=mk(c));
const put=(e,x,y,s)=>{e.style.transform=`translate(${x}px,${y}px)`+(s||'');e.style.opacity=1};

function frame(now){
  const vw=innerWidth,vh=innerHeight;
  S.list.forEach((c,i)=>{
    const e=tags[i],on=busy(c);
    e.style.opacity=on?Math.min(1,c.alpha+.2):0;
    if(on)e.style.transform=`translate(${c.x+14}px,${c.y+16}px)`;
    const F=on&&c.task.f,n=on?c.task.name:'';
    if(!F||!F.el||/tag|item|label/.test(n))return;
    const el=F.el,r=el.getBoundingClientRect();
    let d=A.get(el);
    if(!d)A.set(el,d={});
    d.seen=now;

    const b=at(d,'b','sw-b');
    b.textContent=Math.round(r.width)+' × '+Math.round(r.height);
    put(b,r.right,r.bottom+4,' translateX(-100%)');

    if(/heading|title/.test(n)){
      const v=at(d,'v','sw-g'),h=at(d,'h','sw-g'),t=at(d,'t','sw-t');
      v.style.width='1px';v.style.height=vh+'px';put(v,r.left,0);
      h.style.height='1px';h.style.width=vw+'px';put(h,0,r.top);
      v.style.opacity=h.style.opacity=.55;
      t.textContent='x '+Math.round(r.left);put(t,r.left+4,4);
    }

    const p=F.kind==='pop'&&el.previousElementSibling;
    if(p&&p.tagName===el.tagName){
      const q=p.getBoundingClientRect(),hz=r.left-q.right,vt=r.top-q.bottom;
      const m=at(d,'m','sw-g'),ml=at(d,'ml','sw-t');
      if(Math.abs(q.top-r.top)<r.height/2&&hz>=2&&hz<160){
        m.style.width=hz+'px';m.style.height='1px';put(m,q.right,r.top+r.height/2);
        ml.textContent=Math.round(hz);put(ml,q.right+hz/2-8,r.top+r.height/2-18);
      }else if(vt>=2&&vt<160){
        m.style.width='1px';m.style.height=vt+'px';put(m,r.left+r.width/2,q.bottom);
        ml.textContent=Math.round(vt);put(ml,r.left+r.width/2+6,q.bottom+vt/2-8);
      }else m.style.opacity=ml.style.opacity=0;
    }
  });

  for(const[el,d]of A){
    if(d.seen===now)continue;
    for(const k in d)if(d[k].style)d[k].style.opacity=0;
    if(now-d.seen>800){
      for(const k in d)if(d[k].remove)d[k].remove();
      A.delete(el);
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
}
