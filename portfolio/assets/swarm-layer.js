/* Engine swarm orisinal untuk portofolio ini (tidak memakai kode Swarm / Swarm Rebuild).
   Konsepnya terinspirasi Swarm karya Joel Califa. Halaman lama dirender penuh oleh bundle,
   lalu cursor berlabel membangunnya lagi: kotak digambar (W × H), teks diketik, gambar menyapu. */
(()=>{
const D=document,H=D.documentElement,$=s=>[...D.querySelectorAll(s)],P=window.__plexus;
if(matchMedia('(prefers-reduced-motion:reduce)').matches||!P){H.classList.remove('swp');return}
const st=D.createElement('style');
st.textContent='.stage-wrap{height:auto}.stage{position:relative;height:auto;min-height:100svh}#cursors{display:none}#cs{position:fixed;inset:0;z-index:57;pointer-events:none;overflow:hidden}.c{position:absolute;left:0;top:0;will-change:transform}.c svg{display:block;transform-origin:2px 2px;filter:drop-shadow(0 1px 3px #0009)}.ov{position:absolute;display:none;border:1px dashed var(--ac);background:rgba(122,167,255,.08)}.ov i{position:absolute;right:0;bottom:-20px;font:10px var(--mono);font-style:normal;background:var(--ac);color:#04101f;padding:1px 6px;border-radius:4px;white-space:nowrap}.sw [data-b]{opacity:0;visibility:hidden}.sw [data-b].on{opacity:1;visibility:visible;animation:swi .45s}@keyframes swi{from{opacity:0}}.sw .tags li{opacity:0;transition:opacity .4s}.sw .tags.on li{opacity:1}.ty:after{content:"";display:inline-block;width:2px;height:.85em;background:var(--ac);margin-left:2px;vertical-align:-.05em;animation:bl 1s steps(1) infinite}';
D.head.append(st);

/* target: elemen UI lama yang dibangun ulang */
const TXT='#main h2,#main .lead,#main .role,#main .about p,#main .kind,#main .proj h3,#main .pt>p:not(.kind),#main .tree b,#main .tree span,#main .xp h3,#main .xp p,#main .meta dt,#main .meta dd,#main .flow li span,#main .steps li span,#main .note,#main .repos b,#main .repos p,#main .repos .lang,#main .links a,.brand,#bh,#bs,footer span';
const add=(s,k)=>$(s).forEach(e=>{if(!e.dataset.b)e.dataset.b=k});
add(TXT,'t');add('.pv.game .shot','g');add('.pv:not(.game)','i');
add('.card,.mini,#bcta,.btn,.lang,#burger,.pipe,.meta,.tags,.links li,.repos li,.flow li,.steps li,#menu a','b');
const T=$('[data-b]').map(el=>({el,k:el.dataset.b,s:0,n:0,len:0})),M=new Map(T.map(t=>[t.el,t]));
T.forEach(t=>{const p=t.el.parentElement.closest('[data-b]');t.p=p&&M.get(p)});
$('.tags li').forEach((l,i)=>l.style.transitionDelay=i*35+'ms');

/* gambar Kota Mati + bingkai SVG */
const game=T.find(t=>t.k==='g');
function prep(t){
  const pv=t.el.parentElement,sv=pv.querySelector('svg'),ps=[...sv.querySelectorAll('path')],w=pv.clientWidth,h=pv.clientHeight,i=14;
  t.el.style.backgroundImage='url(./kotamati.jpg)';t.el.classList.add('real');
  sv.setAttribute('viewBox',`0 0 ${w} ${h}`);
  [`M1 1H${w-1}`,`M${w-1} 1V${h-1}`,`M${w-1} ${h-1}H1`,`M1 ${h-1}V1`,`M1 ${i}V1H${i}M${w-i} 1H${w-1}V${i}M${w-1} ${h-i}V${h-1}H${w-i}M${i} ${h-1}H1V${h-i}`,`M12 ${h-14}H${w*.5}`].forEach((d,k)=>{
    const a=ps[k];a.setAttribute('d',d);a._L=a.getTotalLength();a.style.strokeDasharray=a._L;a.style.strokeDashoffset=a._L;
  });
  t.ps=ps;
}
if(game)prep(game);

/* cursor */
const cs=D.createElement('div');cs.id='cs';D.body.append(cs);
const PL=[['#ff6b6b','claude'],['#ffd166','ghidra'],['#06d6a0','i3'],['#7aa7ff','python'],['#c792ff','php'],['#ff9f5a','postgres'],['#4dd0e1','kota'],['#f78fb3','watchdog'],['#a3e635','hyperion'],['#fb7185','midtrans'],['#38bdf8','i3pack'],['#facc15','rsc'],['#e879f9','heavyrain'],['#5eead4','pb']];
const N=innerWidth<760?7:14,ease=p=>1-Math.pow(1-p,3);
let mx=0,my=0,hp=0,pvx=0,pvy=0,pt=0;
addEventListener('pointermove',e=>{const t=performance.now(),k=Math.max(8,t-pt)/1e3;if(hp){pvx=pvx*.5+(e.clientX-mx)/k*.5;pvy=pvy*.5+(e.clientY-my)/k*.5}pt=t;mx=e.clientX;my=e.clientY;hp=1});
const tn=el=>{const w=D.createTreeWalker(el,4),a=[];let n;while(n=w.nextNode())a.push([n,n.data]);return a};
const rest=t=>{t.n.forEach(([n,s])=>n.data=s);const s=t.el.style;s.minHeight=s.minWidth='';if(t.dsp)s.display='';t.el.classList.remove('ty');t.n=0};
const fin=t=>{if(t.n)rest(t);t.el.style.clipPath='';if(t.ps)t.ps.forEach(a=>a.style.strokeDashoffset=0);t.el.classList.add('on');t.s=3};
const C=PL.slice(0,N).map(([col],i)=>{
  const e=D.createElement('div');e.className='c';
  e.innerHTML=`<svg width="18" height="18" viewBox="0 0 20 20"><path d="M2 2l5.5 15 2.3-6.2L16 8.5z" fill="${col}" stroke="#04101f" stroke-width="1.2"/></svg>`;
  const o=D.createElement('div');o.className='ov';o.innerHTML='<i></i>';cs.append(e,o);
  return{e,o,v:e.firstChild,i,x:innerWidth/2,y:innerHeight/2,op:0,vx:0,vy:0,ft:0,cd:0,spin:0,src:null,sp:6+Math.random()*4,ph:'o',t:null,c0:0,d:0};
});
function claim(c){
  const vh=innerHeight;
  for(const t of T){
    if(t.s||(t.p&&t.p.s<3))continue;
    const sb=t.k==='b'&&!t.el.closest('#nav')&&t.el.previousElementSibling,ps=sb&&M.get(sb),cp=ps&&sb.tagName===t.el.tagName;
    if(cp&&ps.s<3)continue;
    const r=t.el.getBoundingClientRect();
    if(!r.width||r.bottom<0){fin(t);continue}
    if(r.top>vh*1.05)continue;
    if(t.k==='g')prep(t);
    t.s=1;c.t=t;c.ph='g';
    if(cp){const q=sb.getBoundingClientRect();if(q.bottom>0&&q.top<vh){c.src=ps;c.ph='cs'}}
    return;
  }
}

/* intro: cursor mengorbit sementara intro lama (boot + nama) berjalan */
const intro=D.getElementById('intro'),hint=D.getElementById('hint');
let go=0,hs=0;
const t0=performance.now();
const start=n=>{if(go)return;go=n||performance.now();intro.style.transition='opacity 1.2s';intro.style.opacity=0};
['wheel','touchmove','keydown','pointerdown'].forEach(k=>addEventListener(k,()=>start(),{passive:true}));
addEventListener('scroll',()=>{if(scrollY>10)start()},{passive:true});
addEventListener('resize',()=>P.resize());
H.classList.add('sw');H.classList.remove('swp');

let prev=t0;
function frame(){
  const n=performance.now(),dt=Math.min(.05,(n-prev)/1e3),el=n-t0;prev=n;
  P.render(n,dt);
  const done=T.every(t=>t.s===3),ve=Math.exp(-dt*6);
  pvx*=ve;pvy*=ve;
  if(!go){
    if(hint.classList.contains('show')){hs=hs||n;if(n-hs>1800)start(n)}
    if(el>12000)start(n);
  }
  for(const c of C){
    let tx=c.x,ty=c.y,rot=0,ex=0,fl=0;
    if(c.ph==='o'){
      const a=c.i*6.283/N+el/1e3*.9,r=Math.min(innerWidth,innerHeight)*(.24+.05*(c.i%3));
      tx=innerWidth/2+Math.cos(a)*r;ty=innerHeight/2+Math.sin(a)*r;rot=a*57.3+225;ex=1;
      if(go&&n-go>500)c.ph='i';
    }
    if(c.ph==='i'){
      if(go&&!done)claim(c);
      if(c.ph==='i'){
        if(done&&hp){
          const a=c.i*6.283/N+el/1800,r=34+(c.i%3)*20+Math.sin(el/700+c.i)*8;
          tx=mx+Math.cos(a)*r;ty=my+Math.sin(a)*r;fl=1;rot=a*57.3+225+c.spin;
          if(c.ft>0){
            c.ft-=dt;c.x+=c.vx*dt;c.y+=c.vy*dt;const dm=Math.exp(-dt*2.5);c.vx*=dm;c.vy*=dm;
            if(c.x<0||c.x>innerWidth)c.vx*=-1;
            if(c.y<0||c.y>innerHeight)c.vy*=-1;
            c.spin+=dt*900;rot=a*57.3+225+c.spin;tx=c.x;ty=c.y;ex=1;c.cd=.9;
          }else{
            c.spin-=c.spin*Math.min(1,dt*5);c.cd-=dt;
            if(c.cd<=0&&Math.hypot(c.x-mx,c.y-my)<20){
              let dx=c.x-mx,dy=c.y-my;const d=Math.hypot(dx,dy)||1,sp=Math.hypot(pvx,pvy);
              dx=dx/d+pvx/(sp+1)*.8;dy=dy/d+pvy/(sp+1)*.8;
              const m=Math.hypot(dx,dy)||1,v=Math.min(1100,380+sp*.5);
              c.vx=dx/m*v;c.vy=dy/m*v;c.ft=.9;
            }
          }
        }
        else{tx=(c.i+.5)/N*innerWidth;ty=innerHeight+50}
      }
    }
    if((c.ph==='cs'||c.ph==='cc'||c.ph==='cm')&&c.t.s===3){c.ph='i';c.t=null;c.src=null;c.o.style.display='none'}
    if(c.ph==='cs'){
      const s=c.src.el.getBoundingClientRect();tx=s.left+s.width/2;ty=s.top+s.height/2;
      if(Math.hypot(tx-c.x,ty-c.y)<10){c.ph='cc';c.c0=n;c.o.style.display='block';c.o.firstChild.textContent='copy'}
    }
    if(c.ph==='cc'){
      const s=c.src.el.getBoundingClientRect();tx=s.left+s.width/2;ty=s.top+s.height/2;ex=1;
      Object.assign(c.o.style,{left:s.left+'px',top:s.top+'px',width:s.width+'px',height:s.height+'px'});
      if(n-c.c0>220){c.ph='cm';c.c0=n;const r=c.t.el.getBoundingClientRect();c.d=Math.min(750,380+Math.hypot(r.left-s.left,r.top-s.top)/3)}
    }
    if(c.ph==='cm'){
      const s=c.src.el.getBoundingClientRect(),r=c.t.el.getBoundingClientRect(),p=Math.min(1,(n-c.c0)/c.d),q=ease(p);
      const L=s.left+(r.left-s.left)*q,Tp=s.top+(r.top-s.top)*q,W=s.width+(r.width-s.width)*q,Hh=s.height+(r.height-s.height)*q;
      Object.assign(c.o.style,{left:L+'px',top:Tp+'px',width:W+'px',height:Hh+'px'});
      c.o.firstChild.textContent=p>.85?'paste':Math.round(W)+' × '+Math.round(Hh);
      tx=L+Math.min(14,W/2);ty=Tp+Math.min(14,Hh/2);ex=1;
      if(p>=1){c.ph='r';c.c0=n;c.o.style.display='none';c.t.el.classList.add('on');c.d=450;c.src=null}
    }
    if(c.ph==='g'){
      const t=c.t;
      if(t.s===3){c.ph='i';c.t=null}
      else{
        const r=t.el.getBoundingClientRect();tx=r.left;ty=r.top;
        if(Math.hypot(tx-c.x,ty-c.y)<6){
          c.ph='d';c.c0=n;const A=r.width*r.height;c.d=A<7e3?180:Math.min(900,260+A/1500);c.o.style.display='block';
        }
      }
    }
    if(c.ph==='d'){
      const t=c.t,r=t.el.getBoundingClientRect(),p=Math.min(1,(n-c.c0)/c.d),q=ease(p),w=r.width*q,h=r.height*q;
      tx=r.left+w;ty=r.top+h;ex=1;
      Object.assign(c.o.style,{left:r.left+'px',top:r.top+'px',width:w+'px',height:h+'px'});
      c.o.firstChild.textContent=Math.round(w)+' × '+Math.round(h);
      if(p>=1){
        c.ph='r';c.c0=n;c.o.style.display='none';const E=t.el;
        if(t.k==='t'){
          t.n=tn(E);t.len=t.n.reduce((s,a)=>s+a[1].length,0);
          E.style.minHeight=r.height+'px';E.style.minWidth=r.width+'px';
          if(getComputedStyle(E).display==='inline'){E.style.display='inline-block';t.dsp=1}
          t.n.forEach(a=>a[0].data='');E.classList.add('on','ty');
          c.d=Math.max(500,Math.min(2600,t.len*16));
        }else{
          if(t.k==='i'||t.k==='g')E.style.clipPath='inset(0 0 100% 0)';
          E.classList.add('on');c.d=t.k==='g'?3000:t.k==='i'?800:450;
        }
      }
    }
    if(c.ph==='r'){
      const t=c.t,r=t.el.getBoundingClientRect(),p=Math.min(1,(n-c.c0)/c.d);
      if(t.k==='t'){
        let rem=Math.floor(p*t.len),ln=null;
        for(const[nd,s]of t.n){nd.data=s.slice(0,Math.max(0,Math.min(s.length,rem)));if(nd.data)ln=nd;rem-=s.length}
        tx=r.left;ty=r.top;
        if(ln){const g=D.createRange();g.setStart(ln,ln.data.length);g.collapse(true);const q=g.getClientRects()[0];if(q&&q.height){tx=q.left;ty=q.top+q.height*.6}}
        ex=1;
      }else if(t.k==='i'){
        t.el.style.clipPath=`inset(0 0 ${100-p*100}% 0)`;tx=r.left+r.width/2;ty=r.top+r.height*p;ex=1;
      }else if(t.k==='g'){
        const f=Math.min(1,p/.4),q=Math.max(0,(p-.4)/.6);
        t.ps.forEach(a=>a.style.strokeDashoffset=a._L*(1-f));
        t.el.style.clipPath=`inset(0 0 ${100-q*100}% 0)`;
        if(p<.4){
          const u=f*3.999,e=u|0,v=u-e,s=[[r.left,r.top,r.right,r.top],[r.right,r.top,r.right,r.bottom],[r.right,r.bottom,r.left,r.bottom],[r.left,r.bottom,r.left,r.top]][e];
          tx=s[0]+(s[2]-s[0])*v;ty=s[1]+(s[3]-s[1])*v;
        }else{tx=r.left+r.width/2;ty=r.top+r.height*q}
        ex=1;
      }else{tx=r.left+r.width*.5;ty=r.top+r.height*.5}
      if(p>=1){fin(t);c.t=null;c.ph='i'}
    }
    if(ex){c.x=tx;c.y=ty}else{const k=1-Math.exp(-dt*c.sp*(fl?.45:1));c.x+=(tx-c.x)*k;c.y+=(ty-c.y)*k}
    c.op+=((c.ph==='i'&&!fl?0:1)-c.op)*Math.min(1,dt*6);c.e.style.opacity=c.op;c.e.style.transform=`translate(${c.x}px,${c.y}px)`;c.v.style.transform=`rotate(${rot}deg)`;
  }
  requestAnimationFrame(frame);
}
addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  start();T.forEach(t=>{if(t.s<3)fin(t)});
  C.forEach(c=>{c.ph='i';c.t=null;c.src=null;c.o.style.display='none'});
});
requestAnimationFrame(frame);
})();
