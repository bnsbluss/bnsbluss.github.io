/* Kota Mati — mesin game (raycaster, zombie, senjata, online, HUD). */
(()=>{
'use strict';
const H=216,HH=H>>1,PMAX=88,SH=HH+PMAX;
let W=384,HW=W>>1,PLANE=W/(2*H);
const cv=document.getElementById('screen');
const ctx=cv.getContext('2d');
ctx.imageSmoothingEnabled=false;
const world=document.createElement('canvas');world.width=W;world.height=H;
const wctx=world.getContext('2d');
let img=wctx.createImageData(W,H);
let buf=new Uint32Array(img.data.buffer);
let zbuf=new Float32Array(W);
const R=Math.random;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch=matchMedia('(pointer: coarse)').matches&&(navigator.maxTouchPoints||0)>0;
const OUT='#120a0e';
let PQ=1,LOWQ=false;
const SET={sens:1,mus:70,sfx:80,q:2,fs:1};try{const o=JSON.parse(localStorage.getItem('kotamati-set')||'{}');if(o&&typeof o==='object')for(const k in SET)if(typeof o[k]==='number'&&Number.isFinite(o[k]))SET[k]=o[k];}catch(e){}
SET.sens=Math.max(0.3,Math.min(2.5,SET.sens));SET.mus=Math.max(0,Math.min(100,SET.mus|0));SET.sfx=Math.max(0,Math.min(100,SET.sfx|0));SET.q=Math.max(0,Math.min(2,SET.q|0));SET.fs=SET.fs?1:0;
function saveSet(){try{localStorage.setItem('kotamati-set',JSON.stringify(SET));}catch(e){}}
function applyQuality(){PQ=[0.35,0.65,1][SET.q];LOWQ=SET.q===0;}applyQuality();
let horizon=HH,camZ=0.5,ZK=1;

/* ================= pixel helpers ================= */
function hex(h){const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function addOutline(g,w,h,col){
  const d=g.getImageData(0,0,w,h),a=d.data,[r,gg,b]=hex(col),s=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++)s[i]=a[i*4+3]>0?1:0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(s[i])continue;
    if((x>0&&s[i-1])||(x<w-1&&s[i+1])||(y>0&&s[i-w])||(y<h-1&&s[i+w])){a[i*4]=r;a[i*4+1]=gg;a[i*4+2]=b;a[i*4+3]=255;}}
  g.putImageData(d,0,0);
}
function makeSprite(w,h,paint,outline){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});
  const P=(x,y,col,ww=1,hh=1)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),ww,hh);};
  paint(P,g);
  if(outline)addOutline(g,w,h,outline);
  const d=g.getImageData(0,0,w,h);
  return{w,h,cv:c,px:new Uint32Array(d.data.buffer)};
}
function disc(P,cx,cy,r,col){cx=Math.round(cx);cy=Math.round(cy);const r2=r*r+r*0.6,Rr=Math.ceil(r);
  for(let y=-Rr;y<=Rr;y++){const q=r2-y*y;if(q<0)continue;const w=Math.floor(Math.sqrt(q));P(cx-w,cy+y,col,2*w+1,1);}}
function trap(P,cx,y0,y1,w0,w1,col,hi,sh){for(let y=y0;y<=y1;y++){const t=(y-y0)/Math.max(1,y1-y0),hw=Math.round(w0+(w1-w0)*t),e=Math.max(1,hw>>2);
  P(cx-hw,y,col,hw*2,1);if(hi)P(cx-hw,y,hi,e,1);if(sh)P(cx+hw-e,y,sh,e,1);}}
const FONT={'1':['010','110','010','010','111'],U:['101','101','101','101','111'],P:['110','101','110','100','100'],A:['010','101','111','101','101'],W:['101','101','111','111','101'],M:['101','111','111','101','101'],G:['011','100','101','101','011'],S:['011','100','010','001','110'],R:['110','101','110','101','101'],L:['100','100','100','100','111'],B:['110','101','110','101','110'],'0':['111','101','101','101','111'],'7':['111','001','010','010','010'],K:['101','110','100','110','101'],O:['111','101','101','101','111']};
function glyphs(P,s,x,y,col){for(const ch of s){const g=FONT[ch];if(g)g.forEach((row,j)=>{for(let i=0;i<3;i++)if(row[i]==='1')P(x+i,y+j,col);});x+=4;}}

/* ================= textures ================= */
const WT=[];
WT[0]=makeSprite(32,32,P=>{const r=rng(11);P(0,0,'#4a2522',32,32);const cols=['#9c4a35','#a85a3e','#8a3f2f','#94452f'];
  for(let row=0;row<8;row++){const y=row*4,off=(row%2)*8;
    for(let bx=-8;bx<32;bx+=16){const x=bx+off,c=cols[(r()*cols.length)|0];
      P(x+1,y,c,15,3);P(x+1,y,'#c27350',15,1);P(x+1,y+2,'#6e3326',15,1);if(r()<0.35)P(x+2+((r()*10)|0),y+1,'#5a2a22',2,1);}}
  for(let i=0;i<3;i++){const x=1+(r()*28)|0,y=(r()*26)|0;P(x,y,'#2a1512',2,2);P(x-1,y,'#7a4a3a',1,1);}
  P(24,0,'#3a1d1a',8,3);P(27,3,'#3a1d1a',5,2);
  for(let y=24;y<32;y++)for(let x=0;x<32;x++)if(((x+y)&1)===0&&r()<(y-23)/10)P(x,y,'#2a1512');});
WT[1]=makeSprite(32,32,P=>{const r=rng(21);P(0,0,'#3e321f',32,32);
  for(let row=0;row<4;row++){const y=row*8,off=(row%2)*8;
    for(let bx=-8;bx<32;bx+=16){const x=bx+off;
      P(x+1,y+1,'#b59a62',14,6);P(x+2,y,'#b59a62',12,1);P(x+2,y+7,'#7d6840',12,1);
      P(x+2,y+1,'#d6bf86',11,1);P(x+1,y+2,'#d6bf86',1,3);P(x+1,y+5,'#9a824f',14,2);P(x+14,y+2,'#7d6840',1,4);
      P(x+7,y+2,'#5c4a2c',1,4);if(r()<0.4)P(x+3+((r()*7)|0),y+3,'#8a7348',2,1);}}});
WT[2]=makeSprite(32,32,P=>{const r=rng(31);P(0,0,'#8e3b2a',32,32);
  for(let x=0;x<32;x+=4){P(x,0,'#b5533a',1,32);P(x+2,0,'#5e251a',1,32);}
  P(0,0,'#3a1a14',32,2);P(0,30,'#3a1a14',32,2);P(0,2,'#6a2a1e',32,1);
  for(let i=0;i<7;i++){const x=(r()*30)|0,y=2+((r()*10)|0),l=4+((r()*14)|0);P(x,y,'#6b4a2a',1,l);P(x+1,y,'#5a3a22',1,l>>1);}
  P(9,11,'#7e3424',14,9);glyphs(P,'07',11,13,'#d9cfc0');for(const[x,y]of[[1,3],[30,3],[1,28],[30,28]])P(x,y,'#c9c0b0');});
WT[3]=makeSprite(32,32,P=>{const r=rng(41);P(0,0,'#7c7470',32,32);
  for(let i=0;i<150;i++)P((r()*32)|0,(r()*32)|0,r()<0.5?'#6a625e':'#8e8682');
  P(9,5,'#d9c9a3',13,17);P(9,5,'#efe2c0',13,1);P(21,5,'#b8a985',1,17);
  P(11,8,'#b8504a',9,6);P(13,9,'#efe2c0',2,2);P(16,9,'#efe2c0',2,2);P(14,12,'#efe2c0',3,1);
  P(11,16,'#6a5a4a',9,1);P(11,18,'#6a5a4a',7,1);P(19,19,'#7c7470',3,3);P(20,18,'#7c7470',2,1);
  let x=4,y=0;for(let i=0;i<32;i++){P(x,y,'#3e3836');y++;if(r()<0.4)x+=r()<0.5?-1:1;}
  for(let i=0;i<13;i++)P(4+i*2,26+Math.round(Math.sin(i*1.3)*2),'#7fd04a',2,1);
  for(let yy=28;yy<32;yy++)for(let xx=0;xx<32;xx++)if(r()<0.3)P(xx,yy,'#4e4744');});
WT[4]=makeSprite(32,32,P=>{const r=rng(51);P(0,0,'#6e6278',32,32);
  for(let i=0;i<130;i++)P((r()*32)|0,(r()*32)|0,r()<0.5?'#5e5368':'#7e7288');
  P(0,0,'#544a5e',32,2);P(8,5,'#2a2230',16,17);P(9,6,'#1a1420',14,15);
  for(let y=12;y<21;y++)for(let x=9;x<23;x++)if(y>17||((x+y)&1)===0)P(x,y,y>17?'#ff8f3a':'#a8452a');
  P(15,6,'#2a2230',2,15);P(9,12,'#2a2230',14,1);
  P(10,7,'#9ab3c9',2,1);P(10,8,'#9ab3c9',1,2);P(19,7,'#9ab3c9',2,2);P(21,9,'#6a8399',1,2);
  P(7,22,'#9a8ea6',18,2);P(7,24,'#3e3448',18,1);for(let i=0;i<5;i++)P(10+i*3,25,'#4e4458',1,2+((r()*4)|0));});
WT[5]=makeSprite(32,32,P=>{const r=rng(61);P(0,0,'#8a5a2e',32,32);
  for(let i=0;i<60;i++)P((r()*32)|0,(r()*32)|0,'#7a4e26',2,1);
  for(let y=0;y<32;y+=8){P(0,y,'#5e3a1c',32,1);P(0,y+1,'#b07a40',32,1);}
  P(0,0,'#4a2c14',32,2);P(0,30,'#4a2c14',32,2);P(0,0,'#4a2c14',2,32);P(30,0,'#4a2c14',2,32);
  for(let i=2;i<29;i++){P(i,i,'#b07a40',2,1);P(29-i,i,'#b07a40',2,1);P(i,i+1,'#5e3a1c',2,1);P(29-i,i+1,'#5e3a1c',2,1);}
  for(const[x,y]of[[3,3],[28,3],[3,28],[28,28]])P(x,y,'#c9c0b0');});
WT[6]=makeSprite(32,32,P=>{const r=rng(71);P(0,0,'#2e2a30',32,32);
  for(let row=0;row<4;row++){const y=row*8,off=(row%2)*6;for(let bx=-6;bx<32;bx+=12){const x=bx+off,c=['#6a6670','#5e5a66','#76727c'][(r()*3)|0];
    P(x+1,y+1,c,11,7);P(x+1,y+1,'#8e8a96',11,1);P(x+1,y+7,'#46424e',11,1);if(r()<0.5)P(x+2+((r()*7)|0),y+2+((r()*4)|0),'#3a3640',2,1);}}
  for(let i=0;i<80;i++){const x=(r()*32)|0,y=(r()*32)|0;if(r()<y/40+0.2)P(x,y,r()<0.5?'#4a6a2a':'#5e8a34');}});
WT[7]=makeSprite(32,32,P=>{const r=rng(81);P(0,0,'#1e1a14',32,32);
  for(let row=0;row<2;row++)for(let i=-1;i<3;i++){const x=1+i*11+(row?5:0),y=row*16+1;
    P(x,y,'#d8b02a',10,14);P(x,y,'#f2d468',2,14);P(x+8,y,'#9a7a18',2,14);P(x,y+3,'#7a5e10',10,1);P(x,y+10,'#7a5e10',10,1);
    P(x+3,y+5,'#1a1408',4,4);P(x+4,y+6,'#d8b02a',2,2);P(x,y,'#b8941e',10,1);
    if(r()<0.5){P(x+2+((r()*5)|0),y+11,'#9be05a',1,3+((r()*3)|0));}}});
function floorTex(seed,blood){return makeSprite(32,32,P=>{const r=rng(seed);P(0,0,'#4a4044',32,32);
  for(let i=0;i<230;i++)P((r()*32)|0,(r()*32)|0,r()<0.5?'#3e3539':'#574c50');
  let x=(r()*32)|0,y=0;for(let i=0;i<44;i++){P(x&31,y&31,'#2a2326');if(r()<0.5)y++;else x+=r()<0.5?1:-1;}
  if(blood){disc(P,16,16,6,'#4e1416');disc(P,14,15,4,'#6a1a1a');for(let i=0;i<7;i++)P((r()*30)|0,(r()*30)|0,'#5a1818',2,2);}});}
const FT=[floorTex(71,false).px,makeSprite(32,32,P=>{const r=rng(81);P(0,0,'#7c6748',32,32);
  for(let i=0;i<260;i++)P((r()*32)|0,(r()*32)|0,r()<0.5?'#6c583c':'#8e7856');
  for(let i=0;i<6;i++){const x=(r()*30)|0,y=(r()*30)|0;P(x,y,'#5a5250',2,2);P(x,y,'#8a807c',1,1);}}).px,floorTex(91,true).px];

/* ================= sky (taller, so the view can tilt up) ================= */
const SKY=(()=>{const w=512,h=SH,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});
  const d=g.createImageData(w,h),o=new Uint32Array(d.data.buffer);
  const st=['#140f28','#1b1433','#2b1842','#45204f','#6e2852','#a33b50','#d2603f','#f0954a'].map(hex);
  const bay=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  for(let y=0;y<h;y++){const t=Math.pow(y/(h-1),1.6)*(st.length-1),i=Math.min(st.length-2,t|0),fr=t-i;
    for(let x=0;x<w;x++){const th=(bay[(y&3)*4+(x&3)]+0.5)/16,s=fr>th?st[i+1]:st[i];o[y*w+x]=(0xff000000|(s[2]<<16)|(s[1]<<8)|s[0])>>>0;}}
  g.putImageData(d,0,0);
  const r=rng(99),P=(x,y,col,ww=1,hh=1)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),ww,hh);};
  for(let i=0;i<160;i++)P((r()*w)|0,(r()*r()*130)|0,r()<0.2?'#fff6d8':'#a99ac8');
  const my=78;
  for(let y=-19;y<=19;y++)for(let x=-19;x<=19;x++){const q=x*x+y*y;if(q<361&&q>196&&((x+y)&1)===0)P(140+x,my+y,'#5a3363');}
  disc(P,140,my,13,'#e6d2a8');disc(P,137,my-3,10,'#f7ecd2');disc(P,145,my+4,3,'#cdb68e');disc(P,134,my-5,2,'#e0c9a0');disc(P,141,my-7,1,'#d8c19a');
  for(let i=0;i<18;i++){const cy=90+((r()*80)|0),cx=(r()*w)|0,len=30+((r()*80)|0);
    for(const ox of[0,-w]){P(cx+ox,cy,'#2a1838',len,2);P(cx+ox+4,cy-1,'#3a2048',len-10,1);P(cx+ox+6,cy+2,'#5a2a50',len-14,1);}}
  for(const sx of[60,300,430])for(let k=0;k<20;k++)disc(P,sx+Math.sin(k*0.7)*4+k*1.6,h-26-k*5,2+k*0.4,k%2?'#3a2440':'#33203a');
  let x=0;while(x<w){const bw=10+((r()*26)|0),bh=8+((r()*30)|0),top=h-bh;P(x,top,'#22132a',bw,bh);
    for(let k=0;k<bw;k+=2)if(r()<0.5)P(x+k,top-1-((r()*3)|0),'#22132a',2,3);
    for(let wy=top+3;wy<h-2;wy+=4)for(let wx=x+2;wx<x+bw-2;wx+=3)if(r()<0.16)P(wx,wy,r()<0.5?'#ff9a3a':'#ffcf6a');
    if(r()<0.25)P(x+(bw>>1),top-8,'#22132a',1,8);x+=bw+((r()*4)|0);}
  const id=g.getImageData(0,0,w,h);return{w,h,px:new Uint32Array(id.data.buffer)};})();
const SKYN=(()=>{const o=new Uint32Array(SKY.px.length),r0=rng(5);for(let i=0;i<o.length;i++){const c=SKY.px[i],r=c&255,g=(c>>>8)&255,b=(c>>>16)&255,l=(r+g+b)/3,y=(i/SKY.w)|0;
  let k=l>200?0.75:0.16;let nr=r*k*0.7,ng=g*k*0.8,nb=b*k*1.3+6;if(l<=200&&y<SKY.h*0.6&&r0()<0.004){nr=nb=ng=180+r0()*60;}o[i]=(0xff000000|(Math.min(255,nb)<<16)|(Math.min(255,ng)<<8)|Math.min(255,nr))>>>0;}return o;})();

/* ================= zombies ================= */
function leg(P,o,x,hy,fy,w,torn){
  const len=fy-1-hy;P(x,hy,o.pants,w,len);P(x+w-1,hy,o.pantsS,1,len);P(x,hy,o.pantsH,1,len);
  if(torn){P(x,fy-5,o.skin,w,3);P(x+w-1,fy-5,o.skinS,1,3);P(x+1,fy-6,o.skin,1,1);}
  P(x-1,fy-1,o.shoe,w+1,2);P(x-1,fy-1,o.shoeH,w,1);
}
function zhead(P,o,hx,hy,roar){
  P(hx+1,hy,o.skin,8,1);P(hx,hy+1,o.skin,10,9);P(hx+1,hy+10,o.skin,8,1);
  P(hx+8,hy+1,o.skinS,2,9);P(hx+2,hy+10,o.skinS,7,1);P(hx+1,hy+2,o.skinH,1,4);
  P(hx-1,hy+4,o.skinS,1,3);P(hx+10,hy+4,o.skinS,1,3);
  if(o.helmet){P(hx-1,hy-2,o.helmet,12,5);P(hx,hy-3,o.helmet,10,1);P(hx-2,hy+3,o.helmetS,14,1);P(hx+1,hy-2,o.helmetH,3,1);P(hx+8,hy-2,o.helmetS,3,4);}
  else if(o.hair){P(hx,hy,o.hair,10,1);for(let i=0;i<10;i++)if(i%3!==1)P(hx+i,hy-1+(i%2),o.hair,1,2);}
  else{P(hx+2,hy+1,o.skinS,6,1);for(let i=0;i<3;i++)P(hx+3+i*2,hy,o.skinS,1,3);}
  P(hx+1,hy+3,o.skinS,4,1);P(hx+6,hy+3,o.skinS,3,1);
  P(hx+2,hy+4,'#1a0a0c',3,3);P(hx+2,hy+4,o.eye,2,2);P(hx+2,hy+4,'#ffffff',1,1);
  P(hx+6,hy+4,'#1a0a0c',3,3);P(hx+7,hy+5,o.eye2,1,1);P(hx+5,hy+6,o.skinS,1,2);
  const mh=roar?3:2;P(hx+2,hy+8,'#4a0c10',6,mh);
  P(hx+2,hy+8,'#efe6c8',1,1);P(hx+4,hy+8,'#efe6c8',1,1);P(hx+6,hy+8,'#efe6c8',1,1);
  P(hx+3,hy+8+mh,o.drool,1,2);P(hx+3,hy+10+mh,o.drool,1,1);
}
function paintZombie(P,o,pose){
  const by=(pose.leg===0||pose.leg===2)?1:0,liftL=pose.leg===0?2:0,liftR=pose.leg===2?2:0,fat=o.fat;
  if(o.dress){const y0=33+by;for(let y=y0;y<46;y++){const hw=5+Math.round((y-y0)*0.4);P(20-hw,y,o.pants,hw*2,1);P(20+hw-2,y,o.pantsS,2,1);P(20-hw,y,o.pantsH,1,1);}
    for(let i=0;i<7;i++)P(14+i*2,45,o.pantsS,1,1);P(16,45,o.skin,3,2);P(21,45,o.skin,3,2);P(19,38,o.blood,2,3);}
  else if(!fat){leg(P,o,15,33+by,46-liftL,4,true);leg(P,o,21,33+by,46-liftR,4,false);}
  else{leg(P,o,12,37+by,46-liftL,6,false);leg(P,o,22,37+by,46-liftR,6,true);}
  const ty=fat?17+by:20+by;
  if(!fat){
    P(14,ty,o.shirt,12,14);P(23,ty,o.shirtS,3,14);P(14,ty,o.shirtH,1,14);P(18,ty-1,o.skinS,4,2);
    P(16,ty+5,o.skin,3,2);P(17,ty+7,o.skinS,1,1);P(21,ty+9,o.skin,2,3);
    P(19,ty+2,o.blood,2,3);P(20,ty+5,o.blood,1,2);P(15,ty+10,o.bloodD,2,2);P(14,ty+12,o.belt,12,2);
    if(o.helmet){P(19,ty+12,'#c9a64a',2,2);P(15,ty+3,o.shirtS,3,3);P(22,ty+3,o.shirtS,2,3);P(16,ty+1,'#2a2a20',1,11);}
  }else{
    disc(P,20,ty+14,11,o.skinS);disc(P,19,ty+13,10,o.skin);disc(P,15,ty+10,3,o.skinH);
    if(o.shirt){P(10,ty,o.shirt,20,9);P(26,ty,o.shirtS,4,9);P(10,ty,o.skin,3,4);P(27,ty,o.skin,3,4);P(12,ty+9,o.shirt,16,1);P(15,ty+3,o.bloodD,3,3);P(23,ty+5,o.blood,2,2);}
    else{P(9,ty,o.skin,22,6);P(27,ty,o.skinS,4,6);for(let i=0;i<5;i++)P(12+i*3,ty+8,'#2a1a2e',1,3);P(11,ty+9,'#2a1a2e',14,1);}
    P(20,ty+17,o.skinS,1,2);P(13,ty+15,o.skinS,4,1);P(24,ty+16,o.skinS,3,1);P(10,ty+20,o.belt,20,2);
  }
  const lx=fat?5:10,rx=fat?31:26,aw=fat?5:4;
  if(pose.attack===1){
    for(const x of[lx,rx]){P(x,ty-12,o.skin,aw,15);P(x+aw-1,ty-12,o.skinS,1,15);P(x,ty-1,o.shirt||o.skin,aw,4);
      P(x-1,ty-15,o.skinH,1,3);P(x+1,ty-15,o.skin,1,3);P(x+3,ty-15,o.skin,1,3);}
  }else if(pose.attack===2){
    P(lx-4,ty+1,o.skin,aw+5,4);P(lx-4,ty+4,o.skinS,aw+5,1);P(lx-6,ty,o.skinH,2,1);P(lx-6,ty+2,o.skin,2,1);P(lx-6,ty+4,o.skin,2,1);
    P(rx,ty+1,o.skin,aw+5,4);P(rx,ty+4,o.skinS,aw+5,1);P(rx+aw+5,ty,o.skin,2,1);P(rx+aw+5,ty+2,o.skin,2,1);P(rx+aw+5,ty+4,o.skin,2,1);
    if(o.shirt&&!fat){P(lx,ty+1,o.shirt,aw,4);P(rx,ty+1,o.shirt,aw,4);}
  }else if(!fat){
    const s=pose.arm;
    P(10,ty+1-s,o.shirt,4,4);P(10,ty+4-s,o.shirtS,4,1);P(6,ty-1-s,o.skin,5,3);P(6,ty+1-s,o.skinS,5,1);
    P(3,ty-2-s,o.skin,3,4);P(2,ty-2-s,o.skinH,1,1);P(2,ty-s,o.skin,1,1);P(3,ty-3-s,o.skin,1,1);P(5,ty-3-s,o.skin,1,1);
    P(26,ty+1,o.shirt,3,4);P(26,ty+5,o.skin,3,8);P(28,ty+5,o.skinS,1,8);
    P(26,ty+13,o.skin,4,3);P(27,ty+16,o.skinS,1,1);P(29,ty+16,o.skinS,1,1);P(26,ty+9,o.blood,1,2);
  }else{
    const s=pose.arm;
    for(const[x,sh]of[[lx,s],[rx,1-s]]){P(x,ty+1,o.skin,aw,16+sh);P(x+aw-1,ty+1,o.skinS,1,16+sh);P(x,ty+1,o.skinH,1,6);
      P(x-1,ty+16+sh,o.skin,aw+1,3);P(x,ty+19+sh,o.skinS,1,1);P(x+3,ty+19+sh,o.skinS,1,1);}
  }
  if(!fat)zhead(P,o,14,8+by,pose.attack>0);else zhead(P,o,15,6+by,pose.attack>0);
  if(o.vomit&&pose.attack){P(18,ty,o.vomit,2,4);P(19,ty+4,o.vomit,1,3);}
  if(o.extra)o.extra(P,o,pose,by,ty);
}
function meltFrames(base,n,blood,bloodD){
  const out=[],w=base.w,h=base.h,r=rng(77),noise=[];for(let x=0;x<w;x++)noise.push(0.55+r()*0.45);
  for(let f=1;f<=n;f++){const p=f/n;
    out.push(makeSprite(w,h,(P,g)=>{
      const d=g.createImageData(w,h),o=new Uint32Array(d.data.buffer),src=base.px,k=1-0.42*p;
      for(let x=0;x<w;x++){const drop=Math.floor(p*p*h*0.95*noise[x]);
        for(let y=h-1;y>=0;y--){const sy=y-drop;if(sy<0)break;const c=src[sy*w+x];if(!(c>>>24))continue;
          const rr=(c&255)*k,gg=((c>>>8)&255)*k*0.92,bb=((c>>>16)&255)*k;o[y*w+x]=(0xff000000|(bb<<16)|(gg<<8)|rr)>>>0;}}
      g.putImageData(d,0,0);
      const pw=Math.round(8+p*24),px=20-(pw>>1);P(px,h-2,bloodD,pw,2);P(px+2,h-3,blood,pw-4,1);P(px+3,h-2,blood,pw-8,1);
    },OUT));}
  return out;
}
const ZPAL={
  walk:{skin:'#8fb06a',skinS:'#5e7d45',skinH:'#bcd68e',shirt:'#cdb88f',shirtS:'#94805a',shirtH:'#e6d6b0',pants:'#40548a',pantsS:'#28355c',pantsH:'#5a70a8',
    shoe:'#2a1e18',shoeH:'#4a3a30',hair:'#2e2219',eye:'#ffe14a',eye2:'#8a1a1a',blood:'#a3201d',bloodD:'#5c0e0e',belt:'#3a2a1f',drool:'#a3201d'},
  run:{skin:'#9ab8a8',skinS:'#62807a',skinH:'#c6dccf',shirt:'#6b7a3a',shirtS:'#46521f',shirtH:'#8a9a50',pants:'#55602c',pantsS:'#373f18',pantsH:'#6e7a3c',
    shoe:'#1c1714',shoeH:'#3a302a',helmet:'#58682c',helmetS:'#38431a',helmetH:'#7e8f42',eye:'#ff5a3a',eye2:'#5a1010',blood:'#a3201d',bloodD:'#5c0e0e',belt:'#2a2a1a',drool:'#a3201d'},
  fat:{fat:true,skin:'#b7b06a',skinS:'#857e43',skinH:'#dcd592',shirt:'#e3dfd2',shirtS:'#a9a493',pants:'#7a4a3a',pantsS:'#53302a',pantsH:'#94604c',
    shoe:'#2a1e18',shoeH:'#4a3a30',hair:'#3a2a1f',eye:'#c6ff4a',eye2:'#4a6a1a',blood:'#7fbf3a',bloodD:'#3e6a1a',belt:'#3a2a1f',drool:'#9be05a',vomit:'#9be05a'},
  brute:{fat:true,skin:'#8f7aa3',skinS:'#5d4c70',skinH:'#b9a6c9',shirt:null,pants:'#3a3a46',pantsS:'#24242e',pantsH:'#50505e',
    shoe:'#18141a',shoeH:'#3a3440',eye:'#ff3a3a',eye2:'#ff3a3a',blood:'#a3201d',bloodD:'#5c0e0e',belt:'#5a3a22',drool:'#d8322a'},
  hunter:{skin:'#a8b08a',skinS:'#6e7658',skinH:'#cfd6b0',shirt:'#3a4256',shirtS:'#262c3a',shirtH:'#545e78',pants:'#5a5a5e',pantsS:'#3a3a3e',pantsH:'#76767a',
    shoe:'#1c1714',shoeH:'#3a302a',helmet:'#3a4256',helmetS:'#262c3a',helmetH:'#545e78',eye:'#ffe14a',eye2:'#ffe14a',blood:'#a3201d',bloodD:'#5c0e0e',belt:'#262c3a',drool:'#a3201d',
    extra(P,o,pose,by,ty){P(14,9+by,'#14182a',10,3);P(13,8+by,o.helmetS,1,10);P(24,8+by,o.helmetS,1,10);P(18,ty+2,'#c9c0b0',4,1);P(3,ty-2,'#c9c0b0',3,1);}},
  smoker:{skin:'#8a9a86',skinS:'#5a6858',skinH:'#b0c0ab',shirt:'#6a4a32',shirtS:'#4a321e',shirtH:'#86603e',pants:'#3e3a36',pantsS:'#28241f',pantsH:'#56504a',
    shoe:'#1c1714',shoeH:'#3a302a',hair:'#2a2420',eye:'#ffe14a',eye2:'#8a1a1a',blood:'#a3201d',bloodD:'#5c0e0e',belt:'#2a2018',drool:'#d86a8a',
    extra(P,o,pose,by,ty){P(21,12+by,'#b06a5a',3,3);P(22,12+by,'#e8a090',1,1);P(16,ty-2,'#b06a5a',4,3);P(17,ty-2,'#e8a090',1,1);P(15,ty+4,'#b06a5a',2,2);P(17,18+by,'#d86a8a',2,7);P(17,25+by,'#a84a6a',2,2);}},
  charger:{skin:'#9aa070',skinS:'#6a7048',skinH:'#c4c896',shirt:'#c9c2b0',shirtS:'#948e7c',shirtH:'#e6e0d0',pants:'#3e4a6a',pantsS:'#28324a',pantsH:'#56648a',
    shoe:'#1c1714',shoeH:'#3a302a',hair:'#1e1a16',eye:'#ff5a3a',eye2:'#ff5a3a',blood:'#a3201d',bloodD:'#5c0e0e',belt:'#2a2018',drool:'#a3201d',
    extra(P,o,pose,by,ty){const up=pose.attack===1?-10:0;P(24,ty-2+up,o.skin,12,8);P(26,ty+5+up,o.skin,11,13);P(25,ty+17+up,o.skin,13,7);
      P(35,ty-2+up,o.skinS,2,27);P(26,ty-1+up,o.skinH,7,1);P(27,ty+8+up,'#6a7048',1,8);P(31,ty+6+up,'#6a7048',1,9);P(25,ty+23+up,'#5c0e0e',13,1);P(28,ty+19+up,o.blood,3,3);}},
  jockey:{skin:'#c0b4a0',skinS:'#8a7e6a',skinH:'#e0d6c4',shirt:'#7a6a52',shirtS:'#54483a',shirtH:'#968468',pants:'#6a5a40',pantsS:'#4a3e2c',pantsH:'#86745a',
    shoe:'#2a1e18',shoeH:'#4a3a30',eye:'#ff5a3a',eye2:'#ff5a3a',blood:'#a3201d',bloodD:'#5c0e0e',belt:'#3a2a1f',drool:'#a3201d',
    extra(P,o,pose,by,ty){P(16,16+by,'#efe6c8',6,1);P(16,17+by,'#4a0c10',6,1);P(23,ty-3,o.skinS,4,5);P(24,ty-3,o.skinH,2,1);}},
  spitter:{skin:'#b8b880',skinS:'#868650',skinH:'#dcdcaa',shirt:'#5a3a6a',shirtS:'#3e2650',shirtH:'#7a5a8a',pants:'#3a3a46',pantsS:'#24242e',pantsH:'#50505e',
    shoe:'#1c1714',shoeH:'#3a302a',hair:'#c8a050',eye:'#c6ff4a',eye2:'#c6ff4a',blood:'#a3201d',bloodD:'#5c0e0e',belt:'#24242e',drool:'#9be05a',
    extra(P,o,pose,by,ty){P(12,8+by,o.hair,3,14);P(24,8+by,o.hair,3,14);P(13,7+by,o.hair,14,2);P(16,16+by,'#9be05a',6,3);P(17,19+by,'#c6ff4a',3,4);P(18,23+by,'#9be05a',1,3);}},
  boss:{fat:true,skin:'#8a3a34',skinS:'#5a201e',skinH:'#b85a4e',shirt:null,pants:'#2a2228',pantsS:'#18121a',pantsH:'#3e343c',
    shoe:'#120c10',shoeH:'#2a2026',eye:'#ffb23e',eye2:'#ffb23e',blood:'#a3201d',bloodD:'#5c0e0e',belt:'#4a3a2a',drool:'#ffb23e',
    extra(P,o,pose,by,ty){const B='#efe6c8',Bs='#b8ad90';for(const sx of[6,30]){P(sx,ty-3,B,4,3);P(sx+1,ty-6,B,2,3);P(sx+1,ty-8,B,1,2);P(sx+3,ty-2,Bs,1,2);}
      for(let i=0;i<5;i++)P(15+i*2,3+by-(i%2),B,1,3+(i%2));P(14,5+by,Bs,11,1);
      for(let i=0;i<3;i++){P(14,ty+3+i*3,B,5,1);P(21,ty+3+i*3,B,5,1);}P(19,ty+2,'#3a1010',2,9);
      P(17,ty+13,'#ffb23e',1,4);P(18,ty+16,'#ffb23e',3,1);P(24,ty+11,'#ff7a3a',1,5);P(23,ty+15,'#ff7a3a',1,2);P(10,ty+19,'#6a6470',20,1);for(let i=0;i<5;i++)P(11+i*4,ty+19,'#8a848e',2,1);}},
  witch:{skin:'#d8d0c8',skinS:'#a8a098',skinH:'#f0ece6',shirt:'#e8e4dc',shirtS:'#b8b4ac',shirtH:'#ffffff',pants:'#e8e4dc',pantsS:'#b8b4ac',pantsH:'#ffffff',dress:true,
    shoe:'#d8d0c8',shoeH:'#f0ece6',eye:'#ff2a2a',eye2:'#ff2a2a',blood:'#a3201d',bloodD:'#5c0e0e',belt:'#d8d4cc',drool:'#a3201d',
    extra(P,o,pose,by,ty){const hc='#0e0a10';P(13,5+by,hc,14,5);P(12,8+by,hc,4,24);P(24,8+by,hc,4,24);P(15,9+by,hc,10,9);
      for(let i=0;i<5;i++)P(15+i*2,18+by,hc,1,4+(i%3)*3);P(16,13+by,'#ff2a2a',2,1);P(22,13+by,'#ff2a2a',2,1);P(18,ty+6,o.blood,2,4);
      P(2,ty-3,'#efe6c8',1,2);P(4,ty-3,'#efe6c8',1,2);P(28,ty+16,'#efe6c8',1,2);P(30,ty+16,'#efe6c8',1,2);}},
};
function squash(base,k){const w=base.w,h=base.h;return makeSprite(w,h,(P,g)=>{g.imageSmoothingEnabled=false;g.drawImage(base.cv,0,0,w,h,0,Math.round(h*(1-k)),w,Math.round(h*k));},null);}
/* ---- side & back views (sprites face right; mirrored at draw time) ---- */
function dk(c,k){if(!c)return c;const h=parseInt(c.slice(1),16),f=k||0.7;const r=Math.round(((h>>16)&255)*f),g=Math.round(((h>>8)&255)*f),b=Math.round((h&255)*f);return'#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);}
const LEGC=[[4,-3,0,0],[1,0,2,0],[-3,4,0,0],[0,1,0,2]];
function sLeg(P,o,hx,hy,fy,off,w,far,torn){const len=Math.max(1,fy-1-hy),c=far?dk(o.pants):o.pants;
  for(let i=0;i<len;i++){const x=hx+Math.round(off*i/len);P(x,hy+i,c,w,1);if(!far){P(x,hy+i,o.pantsH,1,1);P(x+w-1,hy+i,o.pantsS,1,1);}}
  const fx=hx+off;if(torn&&!far){P(fx,fy-5,o.skin,w,3);P(fx+w-1,fy-5,o.skinS,1,3);}
  P(fx-1,fy-1,far?dk(o.shoe,0.8):o.shoe,w+3,2);if(!far)P(fx-1,fy-1,o.shoeH,w+2,1);}
function zheadS(P,o,hx,hy,roar){
  P(hx+2,hy,o.skin,6,1);P(hx+1,hy+1,o.skin,8,1);P(hx,hy+2,o.skin,9,6);P(hx+1,hy+8,o.skin,8,1);P(hx+3,hy+9,o.skin,5,roar?2:1);P(hx+9,hy+4,o.skin,1,2);
  P(hx,hy+2,o.skinH,1,4);P(hx+1,hy+8,o.skinS,2,1);P(hx+3,hy+9,o.skinS,1,1);P(hx+2,hy+4,o.skinS,2,3);P(hx+5,hy+3,o.skinS,4,1);
  P(hx+6,hy+4,'#1a0a0c',2,2);P(hx+7,hy+4,o.eye,1,1);P(hx+5,hy+6,o.skinS,1,1);
  const mh=roar?2:1;P(hx+6,hy+7,'#4a0c10',4,mh);P(hx+7,hy+7,'#efe6c8',1,1);P(hx+9,hy+7,'#efe6c8',1,1);P(hx+8,hy+7+mh,o.drool,1,2);
  if(o.helmet){P(hx,hy-2,o.helmet,9,4);P(hx+1,hy-3,o.helmet,7,1);P(hx-1,hy+1,o.helmetS,11,1);P(hx+1,hy-2,o.helmetH,3,1);P(hx+8,hy+1,o.helmetS,3,1);P(hx-1,hy+2,o.helmet,2,3);}
  else if(o.hair){P(hx+1,hy,o.hair,6,1);P(hx,hy+1,o.hair,6,1);P(hx,hy+2,o.hair,3,1);P(hx-1,hy+2,o.hair,2,4);P(hx+6,hy,o.hair,2,1);P(hx+3,hy-1,o.hair,1,1);P(hx+5,hy-1,o.hair,1,1);}
  else{P(hx+2,hy,o.skinS,4,1);P(hx+3,hy+1,o.skinS,1,2);P(hx+5,hy+1,o.skinS,1,1);}}
function zarmS(P,o,sx,sy,s,atk,far){const sk=far?o.skinS:o.skin,ss=far?dk(o.skinS,0.75):o.skinS,sh=far?(o.shirtS||o.skinS):(o.shirt||o.skin),shs=far?dk(o.shirtS||o.skinS,0.75):(o.shirtS||o.skinS);
  if(atk===1){for(let i=0;i<9;i++)P(sx+1+i,sy-i,sk,3,3);P(sx,sy-1,sh,4,4);P(sx+10,sy-11,sk,3,3);P(sx+10,sy-12,far?ss:o.skinH,1,2);P(sx+12,sy-12,sk,1,2);P(sx+13,sy-10,sk,1,1);return[sx+12,sy-12];}
  const ln=atk===2?11:8,dy=atk===2?1:-s;
  P(sx,sy-1,sh,5,4);P(sx,sy+2,shs,5,1);P(sx+5,sy+dy,sk,ln,3);P(sx+5,sy+2+dy,ss,ln,1);
  const hx=sx+5+ln;P(hx,sy-1+dy,sk,3,4);P(hx,sy+2+dy,ss,3,1);P(hx+3,sy-1+dy,sk,1,1);P(hx+3,sy+1+dy,sk,1,1);if(!far)P(hx,sy-1+dy,o.skinH,2,1);return[hx+3,sy+dy];}
function fatArmS(P,o,sx,sy,s,atk,far){const sk=far?o.skinS:o.skin,ss=far?dk(o.skinS,0.75):o.skinS,hi=far?o.skinS:o.skinH;
  if(atk===1){P(sx,sy-13,sk,5,16);P(sx+4,sy-13,ss,1,16);P(sx-1,sy-17,sk,7,5);P(sx-1,sy-17,hi,7,1);return[sx+3,sy-17];}
  if(atk===2){if(!far)P(sx,sy-1,ss,15,7);P(sx,sy,sk,14,5);P(sx,sy+4,ss,14,1);P(sx+14,sy-1,sk,4,7);P(sx+14,sy+5,ss,4,1);return[sx+17,sy+2];}
  const w=s?2:-2;for(let i=0;i<16;i++){const x=sx+Math.round(w*i/16);P(x,sy+i,sk,5,1);P(x+4,sy+i,ss,1,1);P(x+1,sy+i,hi,1,1);if(!far){P(x-1,sy+i,ss,1,1);P(x+5,sy+i,ss,1,1);}}
  if(!far){P(sx+w-2,sy+16,ss,9,5);}P(sx+w-1,sy+16,sk,7,4);P(sx+w-1,sy+19,ss,7,1);P(sx+w,sy+16,hi,3,1);return[sx+w+3,sy+18];}
function paintZombieSide(P,o,pose,X){
  const L=LEGC[pose.leg|0],by=(pose.leg===0||pose.leg===2)?1:0,fat=o.fat,atk=pose.attack|0,s=pose.arm|0,lean=atk===2?2:0;
  if(o.dress){const y0=31+by;for(let y=y0;y<46;y++){const t=y-y0,x0=17-Math.round(t*0.4)+lean,x1=23+Math.round(t*0.45)+lean;P(x0,y,o.pants,x1-x0,1);P(x0,y,o.pantsH,1,1);P(x1-2,y,o.pantsS,2,1);}
    for(let i=0;i<7;i++)P(12+i*2+lean,45,o.pantsS,1,1);P(19+L[0]+lean,45,o.skin,4,2);P(20+lean,37,o.blood,2,3);}
  else if(!fat){sLeg(P,o,16,33+by,46-L[3],L[1],4,true,false);sLeg(P,o,17,33+by,46-L[2],L[0],4,false,true);}
  else{sLeg(P,o,14,37+by,46-L[3],L[1],6,true,false);sLeg(P,o,16,37+by,46-L[2],L[0],6,false,true);}
  const ty=fat?17+by:20+by;let hand;
  if(!fat){
    zarmS(P,o,18+lean,ty,1-s,atk,true);
    for(let i=0;i<14;i++){const sh=(i<4?2:i<8?1:0)+lean;P(15+sh,ty+i,o.shirt,8,1);P(15+sh,ty+i,o.shirtH,1,1);P(21+sh,ty+i,o.shirtS,2,1);}
    P(21+lean,ty-2,o.skinS,3,3);P(19+lean,ty+4,o.blood,2,3);P(16,ty+9,o.bloodD,2,2);P(15+lean,ty+12,o.belt,8,2);
    if(o.helmet&&!X.side)P(18+lean,ty+1,'#2a2a20',1,11);
    if(!(X&&X.bigArm))hand=zarmS(P,o,19+lean,ty+2,s,atk,false);
    const hx=20+lean+(atk===2?1:0),hy=9+by;zheadS(P,o,hx,hy,atk>0);if(o.vomit&&atk)P(hx+7,hy+9,o.vomit,2,5);
    if(X&&X.side)X.side(P,o,pose,by,ty,hx,hy,hand,atk);
  }else{
    fatArmS(P,o,17,ty+3,1-s,atk,true);
    const rows=y=>{let a=99,b=-1;for(const[cx,cy,r]of[[22,ty+13,10.5],[16,ty+10,8.5],[19,ty+3,6.5]]){const q=r*r-(y-cy)*(y-cy);if(q<0)continue;const w=Math.sqrt(q);a=Math.min(a,Math.round(cx-w));b=Math.max(b,Math.round(cx+w));}return b<a?null:[a,b];};
    for(let y=ty-4;y<=ty+23;y++){const rr=rows(y);if(!rr)continue;const[a,b]=rr,top=o.shirt&&y<ty+9;P(a,y,top?o.shirt:o.skin,b-a+1,1);P(a,y,top?o.shirt:o.skinH,1,1);P(b-1,y,top?o.shirtS:o.skinS,2,1);}
    {const rr=rows(ty+20);if(rr)P(rr[0],ty+20,o.belt,rr[1]-rr[0]+1,2);}
    P(29,ty+14,o.skinS,1,2);P(24,ty+18,o.skinS,6,1);
    if(o.shirt){P(24,ty+3,o.bloodD,3,3);P(19,ty+5,o.blood,2,2);}else{P(20,ty+4,'#2a1a2e',7,1);P(22,ty+8,'#2a1a2e',8,1);P(26,ty+2,'#2a1a2e',1,4);disc(P,19,ty+3,5,o.skin);P(15,ty+1,o.skinH,4,1);}
    hand=fatArmS(P,o,19,ty+3,s,atk,false);
    const hx=21+(atk===2?2:0),hy=6+by;zheadS(P,o,hx,hy,atk>0);if(o.vomit&&atk){P(hx+8,hy+9,o.vomit,3,6);P(hx+9,hy+15,o.vomit,2,4);}
    if(X&&X.side)X.side(P,o,pose,by,ty,hx,hy,hand,atk);}
}
function zheadB(P,o,hx,hy){P(hx+1,hy,o.skin,8,1);P(hx,hy+1,o.skin,10,9);P(hx+1,hy+10,o.skinS,8,1);P(hx+8,hy+1,o.skinS,2,9);P(hx+1,hy+2,o.skinH,1,4);
  P(hx-1,hy+4,o.skinS,1,3);P(hx+10,hy+4,o.skinS,1,3);P(hx+3,hy+10,o.skinS,4,2);
  if(o.helmet){P(hx-1,hy-2,o.helmet,12,8);P(hx,hy-3,o.helmet,10,1);P(hx-2,hy+5,o.helmetS,14,1);P(hx+1,hy-2,o.helmetH,3,1);P(hx+8,hy-2,o.helmetS,3,7);}
  else if(o.hair){P(hx,hy,o.hair,10,6);P(hx+1,hy-1,o.hair,8,1);for(let i=0;i<10;i++)if(i%3!==1)P(hx+i,hy+6,o.hair,1,1+(i%2));P(hx+7,hy+1,dk(o.hair,1.4),2,1);}
  else{P(hx+3,hy+3,'#5c0e0e',3,2);P(hx+4,hy+3,'#efe6c8',1,1);P(hx+2,hy+1,o.skinS,5,1);P(hx+6,hy+6,o.skinS,2,1);}}
function paintZombieBack(P,o,pose,X){
  const by=(pose.leg===0||pose.leg===2)?1:0,liftL=pose.leg===0?2:0,liftR=pose.leg===2?2:0,fat=o.fat,atk=pose.attack|0,s=pose.arm|0;
  if(o.dress){const y0=33+by;for(let y=y0;y<46;y++){const hw=5+Math.round((y-y0)*0.4);P(20-hw,y,o.pants,hw*2,1);P(20+hw-2,y,o.pantsS,2,1);P(20-hw,y,o.pantsH,1,1);}
    for(let i=0;i<7;i++)P(14+i*2,45,o.pantsS,1,1);P(17,45,o.skin,3,2);P(21,45,o.skin,3,2);}
  else if(!fat){leg(P,o,15,33+by,46-liftL,4,false);leg(P,o,21,33+by,46-liftR,4,true);}
  else{leg(P,o,12,37+by,46-liftL,6,true);leg(P,o,22,37+by,46-liftR,6,false);}
  const ty=fat?17+by:20+by;
  if(!fat){P(14,ty,o.shirt,12,14);P(23,ty,o.shirtS,3,14);P(14,ty,o.shirtH,1,14);P(20,ty+1,o.shirtS,1,10);
    P(16,ty+3,o.skinS,3,4);P(17,ty+4,o.skin,1,2);P(22,ty+7,o.blood,2,3);P(15,ty+9,o.bloodD,2,2);P(14,ty+12,o.belt,12,2);}
  else{disc(P,20,ty+14,11,o.skinS);disc(P,19,ty+13,10,o.skin);disc(P,14,ty+9,3,o.skinH);P(20,ty+3,o.skinS,1,16);
    if(o.shirt){P(10,ty,o.shirt,20,10);P(26,ty,o.shirtS,4,10);P(10,ty,o.skin,3,4);P(27,ty,o.skin,3,4);P(16,ty+2,o.shirtS,8,5);P(14,ty+6,o.bloodD,2,2);}
    else{P(9,ty,o.skin,22,7);P(27,ty,o.skinS,4,7);P(13,ty+4,'#2a1a2e',5,1);P(23,ty+4,'#2a1a2e',5,1);P(14,ty+11,'#2a1a2e',3,1);P(24,ty+12,'#2a1a2e',3,1);}
    P(10,ty+20,o.belt,20,2);}
  const lx=fat?5:10,rx=fat?31:26,aw=fat?5:4;
  if(atk===1){for(const x of[lx,rx]){P(x,ty-12,o.skin,aw,15);P(x+aw-1,ty-12,o.skinS,1,15);P(x,ty-1,o.shirt||o.skin,aw,4);P(x-1,ty-15,o.skinS,1,3);P(x+1,ty-15,o.skin,1,3);P(x+3,ty-15,o.skin,1,3);}}
  else if(atk===2){P(lx-4,ty+1,o.skin,aw+5,4);P(lx-4,ty+4,o.skinS,aw+5,1);P(rx,ty+1,o.skin,aw+5,4);P(rx,ty+4,o.skinS,aw+5,1);if(o.shirt&&!fat){P(lx,ty+1,o.shirt,aw,4);P(rx,ty+1,o.shirt,aw,4);}}
  else if(!fat){P(10,ty+1,o.shirt,4,5);P(10,ty+5,o.shirtS,4,1);P(26,ty+1,o.shirt,4,5);P(26,ty+5,o.shirtS,4,1);
    P(8,ty-1-s,o.skin,3,3);P(8,ty+1-s,o.skinS,3,1);P(29,ty-2+s,o.skin,3,3);P(29,ty+s,o.skinS,3,1);}
  else{for(const[x,sh]of[[lx,s],[rx,1-s]]){P(x,ty+1,o.skin,aw,16+sh);P(x+aw-1,ty+1,o.skinS,1,16+sh);P(x,ty+1,o.skinH,1,6);P(x-1,ty+16+sh,o.skin,aw+1,3);}}
  const hx=fat?15:14,hy=fat?6+by:8+by;zheadB(P,o,hx,hy);
  if(X&&X.back)X.back(P,o,pose,by,ty,hx,hy,atk);}
const HC='#0e0a10';
const ZX={
  run:{},
  boss:{side(P,o,pose,by,ty,hx,hy){const B='#efe6c8';for(let i=0;i<4;i++){P(7-(i%2),ty+i*4,B,4,2);P(5-(i%2),ty+i*4+1,B,2,1);}
      for(let i=0;i<4;i++)P(hx+1+i*2,hy-2-(i%2),B,1,3);P(hx,hy,'#b8ad90',9,1);P(29,ty+12,'#ffb23e',1,5);P(27,ty+16,'#ff7a3a',2,1);},
    back(P,o,pose,by,ty,hx,hy){const B='#efe6c8';for(let i=0;i<5;i++){P(19,ty+i*4,B,2,3);P(18,ty+i*4+1,'#b8ad90',1,1);}for(const sx of[6,30]){P(sx,ty-3,B,4,3);P(sx+1,ty-6,B,2,3);}
      for(let i=0;i<5;i++)P(hx+1+i*2,hy-2-(i%2),B,1,3);}},
  hunter:{side(P,o,pose,by,ty,hx,hy,hand){P(hx-1,hy-1,o.helmet,10,4);P(hx-2,hy+1,o.helmet,5,10);P(hx+1,hy-1,o.helmetH,4,1);P(hx-2,hy+10,o.helmetS,5,1);
      P(hx+5,hy+2,o.helmet,4,1);P(hx+5,hy+3,'#14182a',4,3);P(hx+7,hy+4,o.eye,1,1);if(hand)P(hand[0]-4,hand[1]-1,'#c9c0b0',2,3);},
    back(P,o,pose,by,ty,hx,hy){P(hx-1,hy-1,o.helmet,12,12);P(hx+8,hy-1,o.helmetS,3,12);P(hx,hy-1,o.helmetH,3,1);P(hx+2,hy+11,o.helmet,6,3);P(hx+4,hy+11,o.helmetS,2,3);}},
  smoker:{side(P,o,pose,by,ty,hx,hy){P(hx+1,hy+6,'#b06a5a',3,3);P(hx+1,hy+6,'#e8a090',1,1);P(17,ty-1,'#b06a5a',4,3);P(18,ty-1,'#e8a090',1,1);P(16,ty+5,'#b06a5a',2,2);
      P(hx+8,hy+8,'#d86a8a',2,6);P(hx+8,hy+14,'#a84a6a',2,2);},
    back(P,o,pose,by,ty,hx,hy){P(hx+1,hy+5,'#b06a5a',3,3);P(hx+1,hy+5,'#e8a090',1,1);P(16,ty+3,'#b06a5a',4,3);P(17,ty+3,'#e8a090',1,1);P(22,ty+8,'#b06a5a',3,3);P(23,ty+8,'#e8a090',1,1);}},
  charger:{bigArm:true,side(P,o,pose,by,ty,hx,hy,hand,atk){const up=atk===1?-10:0,x=17+(atk===2?4:0),y=ty+up,k=o.skin,ks=o.skinS,kh=o.skinH;
      P(x,y+3,ks,12,17);P(x-1,y+19,ks,15,7);disc(P,x+5,y+2,5,ks);disc(P,x+5,y+2,4,k);
      P(x+1,y+4,k,10,8);P(x+1,y+11,k,11,9);P(x,y+19,k,13,6);P(x+1,y+25,ks,11,1);
      P(x+2,y,kh,5,1);P(x+1,y+4,kh,1,7);P(x+3,y+11,ks,6,1);P(x+2,y+12,kh,1,6);P(x+8,y+5,ks,1,5);P(x+6,y+14,ks,1,4);
      P(x+10,y+4,ks,1,7);P(x+11,y+11,ks,1,8);for(let i=0;i<3;i++)P(x+12,y+20+i*2,ks,1,1);P(x+1,y+20,kh,6,1);P(x+4,y+21,o.blood,3,2);},
    back(P,o,pose,by,ty,hx,hy,atk){const up=atk===1?-10:0;P(4,ty-2+up,o.skin,12,8);P(3,ty+5+up,o.skin,11,13);P(2,ty+17+up,o.skin,13,7);P(3,ty-2+up,o.skinS,2,27);
      P(6,ty-1+up,o.skinH,7,1);P(8,ty+8+up,o.skinS,1,8);P(12,ty+6+up,o.skinS,1,9);P(2,ty+23+up,'#5c0e0e',13,1);}},
  jockey:{side(P,o,pose,by,ty,hx,hy){P(hx+5,hy+7,'#efe6c8',5,1);P(hx+5,hy+8,'#4a0c10',5,1);P(14,ty-2,o.skinS,5,5);P(15,ty-2,o.skinH,2,1);},
    back(P,o,pose,by,ty){P(16,ty-3,o.skinS,8,5);P(17,ty-3,o.skinH,4,1);P(19,ty+2,o.shirtS,2,6);}},
  spitter:{side(P,o,pose,by,ty,hx,hy){P(hx-1,hy,o.hair,7,2);P(hx-2,hy+1,o.hair,3,14);P(hx-1,hy+13,o.hair,2,4);P(hx+2,hy-1,o.hair,4,1);
      P(hx+6,hy+8,'#9be05a',3,3);P(hx+7,hy+11,'#c6ff4a',2,4);P(hx+7,hy+15,'#9be05a',1,3);},
    back(P,o,pose,by,ty,hx,hy){P(hx-1,hy,o.hair,12,9);P(hx,hy+9,o.hair,10,8);for(let i=0;i<10;i++)if(i%2)P(hx+i,hy+17,o.hair,1,2+(i%3));P(hx+3,hy+2,dk(o.hair,1.25),2,6);}},
  witch:{side(P,o,pose,by,ty,hx,hy,hand){P(hx,hy-1,HC,9,4);P(hx-2,hy+1,HC,5,22);P(hx-1,hy+23,HC,3,3);
      for(let i=0;i<5;i++)P(hx+5+i,hy+2,HC,1,8+((i*3)%5));P(hx+7,hy+5,'#ff2a2a',1,1);
      if(hand){P(hand[0],hand[1]-2,'#efe6c8',2,1);P(hand[0],hand[1],'#efe6c8',2,1);P(hand[0],hand[1]+2,'#efe6c8',2,1);}},
    back(P,o,pose,by,ty,hx,hy){P(hx-1,hy-1,HC,12,8);P(hx-1,hy+7,HC,12,16);for(let i=0;i<12;i++)P(hx-1+i,hy+23,HC,1,1+((i*5)%4));P(hx+2,hy+1,'#2a2430',2,10);}},
};
function buildZ(o,X){X=X||{};
  const mk=pt=>{const walk=[0,1,2,3].map(l=>makeSprite(40,48,P=>pt(P,o,{leg:l,arm:(l>>1)&1,attack:0},X),OUT));
    const atk=[1,2].map(a=>makeSprite(40,48,P=>pt(P,o,{leg:1,arm:0,attack:a},X),OUT));
    return{walk,atk,low:squash(walk[1],o.dress?0.62:0.72),die:meltFrames(walk[1],6,o.blood,o.bloodD)};};
  const F=mk(paintZombie);F.side=mk(paintZombieSide);F.back=mk(paintZombieBack);return F;}
const FR={};for(const k in ZPAL)FR[k]=buildZ(ZPAL[k],ZX[k]);

/* ================= player soldiers (other players) ================= */
const TEAMS=[['#3d7bd8','#24508f'],['#d8453d','#8f2420'],['#e8b43a','#9a7420'],['#4fb84a','#2e7a2a']];
const SKINS=[
  {name:'TENTARA',skin:'#e0b088',skinS:'#b07a58',vest:'#6b7a3a',vestS:'#46521f',vestH:'#8a9a50',pants:'#4e5a2a',pantsS:'#323c16',pantsH:'#66743a',hel:'#56652a',helS:'#38431a',helH:'#7e8f42',head:'helmet',boot:'#2a2018',
    fp:{g:'#c8a26b',gh:'#e2c08a',gs:'#8f6f43',s:'#5b6b2c',ss:'#3c4a1c',sh:'#6e7f38',sc:'#46552a'}},
  {name:'POLISI',skin:'#d8a47c',skinS:'#a8744e',vest:'#2e3a5a',vestS:'#1e263c',vestH:'#46567e',pants:'#1e2638',pantsS:'#121824',pantsH:'#2e3a52',hel:'#1a2236',helS:'#0e1420',helH:'#2e3a5a',head:'cap',badge:'#e8c23a',boot:'#121216',
    fp:{g:'#2a2a2e',gh:'#4a4a52',gs:'#141418',s:'#2e3a5a',ss:'#1e263c',sh:'#46567e',sc:'#e8c23a'}},
  {name:'NINJA',skin:'#e0b088',skinS:'#b07a58',vest:'#1e1c22',vestS:'#0e0c12',vestH:'#34303c',pants:'#1e1c22',pantsS:'#0e0c12',pantsH:'#34303c',hel:'#1e1c22',helS:'#0e0c12',helH:'#34303c',head:'ninja',scarf:'#c8302a',boot:'#0e0c12',
    fp:{g:'#2e2a34',gh:'#46404e',gs:'#16141a',s:'#1e1c22',ss:'#0e0c12',sh:'#34303c',sc:'#c8302a'}},
  {name:'GURUN',skin:'#c89468',skinS:'#986440',vest:'#b8a070',vestS:'#8a7448',vestH:'#d6c08e',pants:'#a89060',pantsS:'#7a6440',pantsH:'#c6ae7e',hel:'#a89060',helS:'#7a6440',helH:'#c6ae7e',head:'goggles',camo:'#7a6440',boot:'#5a4028',
    fp:{g:'#8a6a44',gh:'#a8885e',gs:'#5e4628',s:'#b8a070',ss:'#8a7448',sh:'#d6c08e',sc:'#7a6440',pat:'#8a7448'}},
  {name:'HAZMAT',skin:'#e0b088',skinS:'#b07a58',vest:'#e8c23a',vestS:'#a8861a',vestH:'#ffe07a',pants:'#e8c23a',pantsS:'#a8861a',pantsH:'#ffe07a',hel:'#e8c23a',helS:'#a8861a',helH:'#ffe07a',head:'gas',boot:'#1a1a1e',
    fp:{g:'#2a2a2e',gh:'#44444a',gs:'#141418',s:'#e8c23a',ss:'#a8861a',sh:'#ffe07a',sc:'#1a1a1e'}},
  {name:'BANDIT',skin:'#c88a60',skinS:'#985a38',vest:'#5a3a26',vestS:'#3a2416',vestH:'#7a5236',pants:'#3e4e72',pantsS:'#28344e',pantsH:'#56688e',hel:'#1a1412',helS:'#0e0a08',helH:'#3a2e28',head:'bandana',scarf:'#c83a2a',boot:'#2a1a12',
    fp:{g:'#c8a26b',gh:'#e2c08a',gs:'#8f6f43',s:'#5a3a26',ss:'#3a2416',sh:'#7a5236',sc:'#c83a2a'}},
  {name:'GAGAK',skin:'#d8a47c',skinS:'#a8744e',vest:'#3a3e46',vestS:'#24272c',vestH:'#565c66',pants:'#2e3238',pantsS:'#1c1e22',pantsH:'#44484f',hel:'#2a2e34',helS:'#181a1e',helH:'#4a505a',head:'visor',visor:'#3ae0d0',boot:'#121216',
    fp:{g:'#2a2a2e',gh:'#4a4a52',gs:'#141418',s:'#3a3e46',ss:'#24272c',sh:'#565c66',sc:'#3ae0d0'}},
  {name:'MELATI',skin:'#e8b890',skinS:'#b8845c',vest:'#e8e4dc',vestS:'#a8a49c',vestH:'#ffffff',pants:'#3a7a6a',pantsS:'#245448',pantsH:'#4e9a88',hel:'#f0ece6',helS:'#b8b4ac',helH:'#ffffff',head:'medcap',hair:'#2a1a14',hairS:'bun',cross:true,boot:'#2a2a2e',
    fp:{g:'#8ac8d8',gh:'#b8e4f0',gs:'#5a98a8',s:'#e8e4dc',ss:'#a8a49c',sh:'#ffffff',sc:'#d8322a'}},
  {name:'BADAI',skin:'#c88a60',skinS:'#985a38',vest:'#a85a2a',vestS:'#6e3a1a',vestH:'#d07a3a',pants:'#3e3a36',pantsS:'#28241f',pantsH:'#56504a',hel:'#6e6a66',helS:'#46423e',helH:'#9a948e',head:'heavy',pads:'#8a8680',boot:'#1c1714',
    fp:{g:'#3e3a36',gh:'#5a5650',gs:'#28241f',s:'#a85a2a',ss:'#6e3a1a',sh:'#d07a3a',sc:'#8a8680'}},
  {name:'RIMBA',skin:'#b8845a',skinS:'#885a38',vest:'#4a6a2a',vestS:'#2e4618',vestH:'#6a8a3e',pants:'#5a5a2e',pantsS:'#3a3a1a',pantsH:'#76763e',hel:'#8a6a2a',helS:'#5a4418',helH:'#b08a3e',head:'band',hair:'#1a1210',hairS:'braid',paint:'#2e4618',camo:'#2e4618',boot:'#3a2a1a',
    fp:{g:'#6a5030',gh:'#8a6a40',gs:'#4a3420',s:'#4a6a2a',ss:'#2e4618',sh:'#6a8a3e',sc:'#2e4618',pat:'#2e4618'}},
  {name:'KILAT',skin:'#d8a47c',skinS:'#a8744e',vest:'#2a6ad8',vestS:'#1a448f',vestH:'#5a90f0',pants:'#2a2a30',pantsS:'#18181c',pantsH:'#3e3e46',hel:'#e8e8f0',helS:'#a8a8b8',helH:'#ffffff',head:'moto',visor:'#2a2a3a',stripe:'#e8e8f0',boot:'#2a2a30',
    fp:{g:'#2a2a30',gh:'#46464e',gs:'#18181c',s:'#2a6ad8',ss:'#1a448f',sh:'#5a90f0',sc:'#e8e8f0'}},
  {name:'SENJA',skin:'#e0b088',skinS:'#b07a58',vest:'#6a3a4a',vestS:'#46242e',vestH:'#8a5266',pants:'#3a2a32',pantsS:'#24181e',pantsH:'#52404a',hel:'#7a4258',helS:'#52283a',helH:'#9a5a74',head:'hood',hair:'#d8b060',hairS:'long',boot:'#24181e',
    fp:{g:'#3a2a32',gh:'#52404a',gs:'#24181e',s:'#6a3a4a',ss:'#46242e',sh:'#8a5266',sc:'#9a5a74'}},
  {name:'BAJA',skin:'#c89468',skinS:'#986440',vest:'#c8302a',vestS:'#8a1e1a',vestH:'#e85a4a',pants:'#2e2a28',pantsS:'#1c1a18',pantsH:'#46423e',hel:'#e8c23a',helS:'#a8861a',helH:'#ffe07a',head:'fire',visor:'#9ab3c9',stripe:'#e8f070',boot:'#1c1a18',
    fp:{g:'#3a3430',gh:'#5a524c',gs:'#24201c',s:'#c8302a',ss:'#8a1e1a',sh:'#e85a4a',sc:'#e8f070'}},
  {name:'NAGA',skin:'#d8a47c',skinS:'#a8744e',vest:'#2a2440',vestS:'#18142a',vestH:'#40385e',pants:'#2a2440',pantsS:'#18142a',pantsH:'#40385e',hel:'#c83a2a',helS:'#8a2018',helH:'#e85a4a',head:'band',hair:'#1a1014',hairS:'pony',scarf:'#c8902a',camo:'#c8902a',boot:'#18142a',
    fp:{g:'#c8a26b',gh:'#e2c08a',gs:'#8f6f43',s:'#2a2440',ss:'#18142a',sh:'#40385e',sc:'#c8902a'}},
];
let FPC=SKINS[0].fp;
function paintSoldier(P,K,team,teamS,pose){
  const gun='#3a3e45',gunH='#6a707a',gunS='#24272c',bootH='#4a3a30';
  const lg=(x,fy)=>{P(x,33,K.pants,4,fy-34);P(x+3,33,K.pantsS,1,fy-34);P(x,33,K.pantsH,1,fy-34);P(x-1,fy-1,K.boot,5,2);P(x-1,fy-1,bootH,4,1);};
  if(pose.crouch){for(const x of[13,22]){P(x,40,K.pants,6,4);P(x,40,K.pantsH,6,1);P(x+5,40,K.pantsS,1,4);P(x-1,44,K.boot,7,2);P(x-1,44,bootH,6,1);}
    const P0=P;P=(x,y,c,w=1,h=1)=>P0(x,y+9,c,w,h);}
  else{lg(15,46-(pose.f===0?2:0));lg(21,46-(pose.f===1?2:0));}
  P(14,20,K.vest,12,14);P(23,20,K.vestS,3,14);P(14,20,K.vestH,1,14);
  if(K.camo)for(let i=0;i<7;i++)P(15+((i*5)%8),21+i*2,K.camo,2,1);
  P(14,31,'#2a2a1a',12,2);P(16,31,'#5a4a2e',3,2);P(21,31,'#5a4a2e',3,2);
  const hx=15,hy=8,h=K.head;
  if(!pose.back){
    P(16,20,K.scarf||team,8,2);P(16,22,K.scarf?K.vestS:teamS,8,1);P(17,24,K.vestS,2,4);P(21,24,K.vestS,2,4);if(K.badge)P(21,24,K.badge,2,2);
    P(10,21,K.vest,4,6);P(10,21,team,4,2);P(26,21,K.vest,4,6);P(26,21,team,4,2);
    P(11,27,K.skin,4,3);P(25,26,K.skin,4,3);
    P(13,25,gun,14,4);P(13,25,gunH,14,1);P(25,26,gunS,2,3);P(17,22,gunS,5,5);P(18,23,'#0c0d0f',3,3);
    P(hx+1,hy+2,K.skin,8,9);P(hx,hy+3,K.skin,10,7);P(hx+8,hy+3,K.skinS,2,7);P(hx+1,hy+10,K.skinS,8,1);
    P(hx+2,hy+5,'#1a0a0c',2,2);P(hx+6,hy+5,'#1a0a0c',2,2);P(hx+2,hy+5,'#ffffff',1,1);P(hx+6,hy+5,'#ffffff',1,1);P(hx+3,hy+8,K.skinS,4,1);
    sHair(P,K,'f',hx,hy);if(HEADS[h])HEADS[h].f(P,K,team,hx,hy);else if(h==='helmet'||h==='goggles'){P(hx-1,hy-1,K.hel,12,5);P(hx,hy-2,K.hel,10,1);P(hx-2,hy+3,K.helS,14,1);P(hx+1,hy-1,K.helH,3,1);P(hx+8,hy-1,K.helS,3,4);P(hx-1,hy+2,team,12,1);
      if(h==='goggles'){P(hx,hy+4,'#2a2a2e',10,3);P(hx+1,hy+5,'#ffb23e',3,1);P(hx+6,hy+5,'#ffb23e',3,1);}}
    else if(h==='cap'){P(hx-1,hy,K.hel,12,4);P(hx,hy-1,K.hel,10,1);P(hx-2,hy+3,K.helS,14,1);P(hx+1,hy,K.helH,3,1);P(hx+4,hy,K.badge,2,2);P(hx-1,hy+2,team,12,1);}
    else if(h==='ninja'){P(hx-1,hy-1,K.hel,12,13);P(hx,hy+4,K.skin,10,3);P(hx+2,hy+5,'#1a0a0c',2,1);P(hx+6,hy+5,'#1a0a0c',2,1);P(hx-1,hy+1,team,12,1);P(hx+10,hy+1,K.scarf,3,1);P(hx+11,hy+2,K.scarf,2,3);}
    else if(h==='gas'){P(hx-1,hy-1,K.hel,12,13);P(hx+8,hy-1,K.helS,3,13);P(hx+1,hy+3,'#5a5e66',8,7);P(hx+2,hy+4,'#9ab3c9',2,2);P(hx+6,hy+4,'#9ab3c9',2,2);P(hx+3,hy+8,'#3a3e46',4,3);P(hx+4,hy+9,'#1a1c20',2,1);P(hx-1,hy+1,team,12,1);}
    else if(h==='bandana'){P(hx,hy,K.hel,10,4);P(hx+1,hy-1,K.hel,8,1);P(hx-1,hy+1,K.hel,1,5);P(hx+10,hy+1,K.hel,1,5);P(hx,hy+2,team,10,1);P(hx,hy+7,K.scarf,10,4);P(hx+2,hy+8,'#a02a1e',6,1);}
  }else{
    P(15,21,'#5a4a2e',10,10);P(15,21,'#7a6440',10,1);P(23,21,'#3e3220',2,10);P(16,24,'#3e3220',8,1);P(17,26,team,6,2);
    P(10,21,K.vest,4,9);P(10,21,team,4,2);P(26,21,K.vest,4,9);P(26,21,team,4,2);P(10,30,K.skin,3,2);P(27,30,K.skin,3,2);
    P(27,9,gun,2,13);P(27,9,gunH,1,13);
    P(hx,hy+8,K.skinS,10,3);
    sHair(P,K,'b',hx,hy);if(HEADS[h])HEADS[h].b(P,K,team,hx,hy);else if(h==='cap'||h==='bandana'){P(hx-1,hy,K.hel,12,9);P(hx,hy-1,K.hel,10,1);P(hx+8,hy,K.helS,3,9);P(hx-1,hy+2,team,12,1);if(h==='bandana')P(hx+3,hy+8,K.scarf,4,2);}
    else{P(hx-1,hy-1,K.hel,12,10);P(hx,hy-2,K.hel,10,1);P(hx+8,hy-1,K.helS,3,10);P(hx,hy-1,K.helH,2,8);P(hx-2,hy+8,K.helS,14,1);P(hx-1,hy+2,team,12,1);if(h==='ninja')P(hx+3,hy+3,K.scarf,4,4);}
  }
  sXtra(P,K,team,pose,pose.back?'b':'f',hx,hy);
}
function paintSoldierSide(P,K,team,teamS,pose){
  const gun='#3a3e45',gunH='#6a707a',gunS='#24272c',bootH='#4a3a30';let oy=0;
  const lg=(hx,off,far)=>{const c=far?dk(K.pants):K.pants;for(let i=0;i<12;i++){const x=hx+Math.round(off*i/12);P(x,33+i,c,4,1);if(!far){P(x,33+i,K.pantsH,1,1);P(x+3,33+i,K.pantsS,1,1);}}
    P(hx+off-1,45,far?dk(K.boot,0.8):K.boot,6,2);if(!far)P(hx+off-1,45,bootH,5,1);};
  if(pose.crouch){P(11,42,dk(K.pants),8,3);P(9,43,dk(K.boot,0.8),3,3);P(16,39,K.pants,9,4);P(16,39,K.pantsH,9,1);P(21,42,K.pants,4,3);P(24,42,K.pantsS,1,3);P(21,45,K.boot,6,2);P(21,45,bootH,5,1);oy=9;}
  else{const n=pose.f===0?4:-3,f=pose.f===0?-3:4;lg(16,f,true);lg(17,n,false);}
  const Q=(x,y,c,w=1,h=1)=>P(x,y+oy,c,w,h);
  Q(11,21,'#5a4a2e',5,10);Q(11,21,'#7a6440',5,1);Q(11,30,'#3e3220',5,1);Q(12,24,'#3e3220',3,1);Q(12,26,team,3,2);
  Q(15,20,K.vest,8,14);Q(15,20,K.vestH,1,14);Q(21,20,K.vestS,2,14);
  if(K.camo)for(let i=0;i<6;i++)Q(16+((i*3)%5),21+i*2,K.camo,2,1);
  Q(15,31,'#2a2a1a',8,2);Q(18,31,'#5a4a2e',3,2);Q(21,25,K.vestS,2,4);if(K.badge)Q(19,22,K.badge,2,2);
  Q(18,19,K.scarf||team,5,2);
  Q(14,25,gunS,4,3);Q(18,24,gun,14,4);Q(18,24,gunH,14,1);Q(32,25,gun,6,2);Q(37,25,gunH,1,1);Q(24,23,gunS,3,1);Q(26,28,gunS,3,3);Q(21,28,gunS,2,2);
  Q(16,21,K.vest,5,7);Q(16,21,team,5,2);Q(20,26,K.vestS,2,2);Q(20,27,K.skin,3,3);Q(29,27,K.skin,3,2);Q(29,28,K.skinS,3,1);
  const hx=16,hy=8,h=K.head;
  Q(hx+1,hy+2,K.skin,8,9);Q(hx,hy+3,K.skin,9,7);Q(hx+9,hy+5,K.skin,1,2);Q(hx+1,hy+10,K.skinS,7,1);Q(hx+1,hy+5,K.skinS,2,3);
  Q(hx+6,hy+5,'#1a0a0c',2,2);Q(hx+7,hy+5,'#ffffff',1,1);Q(hx+7,hy+8,K.skinS,2,1);Q(hx+5,hy+4,K.skinS,3,1);
  sHair(Q,K,'s',hx,hy);if(HEADS[h])HEADS[h].s(Q,K,team,hx,hy);else if(h==='helmet'||h==='goggles'){Q(hx-1,hy-1,K.hel,11,5);Q(hx,hy-2,K.hel,9,1);Q(hx-1,hy+3,K.helS,12,1);Q(hx+1,hy-1,K.helH,3,1);Q(hx-1,hy+2,team,11,1);Q(hx-1,hy+4,K.hel,3,3);
    if(h==='goggles'){Q(hx+5,hy+4,'#2a2a2e',5,3);Q(hx+7,hy+5,'#ffb23e',2,1);Q(hx+1,hy+4,'#2a2a2e',4,1);}}
  else if(h==='cap'){Q(hx,hy,K.hel,9,4);Q(hx+1,hy-1,K.hel,7,1);Q(hx+8,hy+3,K.helS,4,1);Q(hx+1,hy,K.helH,3,1);Q(hx+6,hy+1,K.badge,2,2);Q(hx,hy+2,team,6,1);Q(hx-1,hy+2,K.hel,2,3);}
  else if(h==='ninja'){Q(hx-1,hy-1,K.hel,11,13);Q(hx+5,hy+4,K.skin,5,3);Q(hx+7,hy+5,'#1a0a0c',2,1);Q(hx-1,hy+1,team,11,1);Q(hx-4,hy+1,K.scarf,3,1);Q(hx-6,hy+2,K.scarf,3,2);Q(hx-3,hy+2,K.scarf,2,1);}
  else if(h==='gas'){Q(hx-1,hy-1,K.hel,11,13);Q(hx-1,hy-1,K.helH,2,10);Q(hx+8,hy-1,K.helS,2,4);Q(hx+5,hy+3,'#5a5e66',5,7);Q(hx+6,hy+4,'#9ab3c9',3,2);Q(hx+9,hy+7,'#3a3e46',3,4);Q(hx+10,hy+8,'#1a1c20',2,2);Q(hx-1,hy+1,team,11,1);}
  else if(h==='bandana'){Q(hx,hy,K.hel,9,4);Q(hx+1,hy-1,K.hel,7,1);Q(hx-3,hy+2,K.hel,3,1);Q(hx-4,hy+3,K.hel,2,2);Q(hx,hy+2,team,9,1);Q(hx+4,hy+7,K.scarf,6,4);Q(hx+5,hy+8,'#a02a1e',4,1);}
  sXtra(Q,K,team,pose,'s',hx,hy);
}
/* ---- extra skin parts: hair, new headgear, trims ---- */
function sHair(P,K,v,hx,hy){const c=K.hair;if(!c)return;const st=K.hairS||'long',d=dk(c,0.7);
  if(v==='f'){P(hx,hy+1,c,10,2);P(hx-1,hy+1,c,2,st==='long'?12:6);P(hx+9,hy+1,c,2,st==='long'?12:6);P(hx+1,hy+2,dk(c,1.3),2,1);
    if(st==='bun')P(hx+3,hy-3,c,4,3);if(st==='braid'){for(let i=0;i<4;i++){P(hx+9,hy+8+i*2,i%2?d:c,2,2);}P(hx+9,hy+16,K.hel||c,2,1);}}
  else if(v==='b'){P(hx,hy+1,c,10,8);P(hx+1,hy,c,8,1);P(hx+2,hy+2,dk(c,1.25),2,5);P(hx+8,hy+1,d,2,8);
    if(st==='long'){P(hx-1,hy+3,c,12,13);P(hx+8,hy+3,d,3,13);for(let i=0;i<12;i++)if(i%2)P(hx-1+i,hy+16,c,1,1);}
    else if(st==='bun')P(hx+3,hy-3,c,4,4);
    else if(st==='braid'){for(let i=0;i<6;i++)P(hx+4,hy+9+i*2,i%2?d:c,2,2);P(hx+4,hy+21,K.hel||c,2,1);}
    else if(st==='pony'){P(hx+3,hy+8,c,4,3);P(hx+4,hy+11,c,3,6);P(hx+5,hy+17,d,2,2);}}
  else{P(hx,hy+1,c,6,2);P(hx-1,hy+2,c,4,7);P(hx-1,hy+2,dk(c,1.25),1,5);
    if(st==='long'){P(hx-2,hy+4,c,4,12);P(hx-2,hy+15,d,3,1);}
    else if(st==='bun')P(hx-3,hy,c,4,4);
    else if(st==='braid'){for(let i=0;i<5;i++)P(hx-2,hy+8+i*2,i%2?d:c,2,2);}
    else if(st==='pony'){P(hx-4,hy+3,c,4,3);P(hx-6,hy+5,c,3,6);P(hx-6,hy+10,d,2,2);}}}
const HEADS={
  visor:{f(P,K,t,hx,hy){P(hx-1,hy-1,K.hel,12,12);P(hx+8,hy-1,K.helS,3,12);P(hx,hy-1,K.helH,3,1);P(hx,hy+4,K.visor,10,3);P(hx,hy+4,'#ffffff',2,1);P(hx+8,hy+6,dk(K.visor,0.6),2,1);P(hx-1,hy+1,t,12,1);P(hx+2,hy+9,K.helS,6,2);},
    b(P,K,t,hx,hy){P(hx-1,hy-1,K.hel,12,11);P(hx+8,hy-1,K.helS,3,11);P(hx,hy-1,K.helH,2,8);P(hx-1,hy+1,t,12,1);P(hx+3,hy+5,K.helS,4,1);P(hx+4,hy+6,K.visor,2,1);},
    s(P,K,t,hx,hy){P(hx-1,hy-1,K.hel,11,12);P(hx-1,hy-1,K.helH,2,9);P(hx+8,hy-1,K.helS,2,5);P(hx+5,hy+4,K.visor,5,3);P(hx+9,hy+5,K.visor,1,2);P(hx+6,hy+4,'#ffffff',1,1);P(hx-1,hy+1,t,11,1);P(hx+2,hy+5,K.helS,2,2);P(hx+4,hy+9,K.helS,5,2);}},
  medcap:{f(P,K,t,hx,hy){P(hx,hy,K.hel,10,4);P(hx+1,hy-1,K.hel,8,1);P(hx-1,hy+3,K.helS,12,1);P(hx+1,hy,K.helH,3,1);P(hx+4,hy,'#d8322a',2,3);P(hx+3,hy+1,'#d8322a',4,1);P(hx-1,hy+2,t,1,1);P(hx+10,hy+2,t,1,1);},
    b(P,K,t,hx,hy){P(hx,hy,K.hel,10,4);P(hx+1,hy-1,K.hel,8,1);P(hx-1,hy+3,K.helS,12,1);P(hx+8,hy,K.helS,2,3);P(hx+3,hy+3,t,4,1);},
    s(P,K,t,hx,hy){P(hx,hy,K.hel,9,4);P(hx+1,hy-1,K.hel,7,1);P(hx+8,hy+3,K.helS,3,1);P(hx,hy+3,K.helS,8,1);P(hx+5,hy,'#d8322a',1,3);P(hx+4,hy+1,'#d8322a',3,1);}},
  heavy:{f(P,K,t,hx,hy){P(hx-2,hy-2,K.hel,14,13);P(hx+9,hy-2,K.helS,3,13);P(hx-1,hy-2,K.helH,3,1);P(hx,hy+4,'#120a0e',10,2);P(hx+2,hy+4,'#ffb23e',2,1);P(hx+6,hy+4,'#ffb23e',2,1);
      P(hx-2,hy+1,t,14,1);for(let i=0;i<3;i++)P(hx+3,hy+7+i,K.helS,4,1);P(hx-1,hy+8,K.helS,1,1);P(hx+10,hy+8,K.helS,1,1);},
    b(P,K,t,hx,hy){P(hx-2,hy-2,K.hel,14,13);P(hx+9,hy-2,K.helS,3,13);P(hx-1,hy-2,K.helH,2,10);P(hx-2,hy+1,t,14,1);P(hx+2,hy+6,K.helS,6,1);P(hx+2,hy+8,K.helS,6,1);},
    s(P,K,t,hx,hy){P(hx-2,hy-2,K.hel,13,13);P(hx-2,hy-2,K.helH,2,10);P(hx+9,hy-2,K.helS,2,13);P(hx+5,hy+4,'#120a0e',6,2);P(hx+8,hy+4,'#ffb23e',2,1);P(hx-2,hy+1,t,13,1);for(let i=0;i<3;i++)P(hx+7,hy+7+i,K.helS,4,1);}},
  moto:{f(P,K,t,hx,hy){P(hx-1,hy-1,K.hel,12,5);P(hx-2,hy+2,K.hel,2,9);P(hx+10,hy+2,K.hel,2,9);P(hx-1,hy+9,K.hel,12,2);P(hx+8,hy-1,K.helS,3,5);P(hx,hy-1,K.helH,3,1);P(hx,hy+3,K.visor,10,1);P(hx-1,hy+1,t,12,1);P(hx+10,hy+2,K.helS,2,9);},
    b(P,K,t,hx,hy){P(hx-1,hy-1,K.hel,12,12);P(hx+8,hy-1,K.helS,3,12);P(hx,hy-1,K.helH,2,9);P(hx-1,hy+1,t,12,1);P(hx+2,hy+6,t,6,1);},
    s(P,K,t,hx,hy){P(hx-1,hy-1,K.hel,11,5);P(hx-1,hy+4,K.hel,5,6);P(hx+4,hy+8,K.hel,6,2);P(hx+9,hy+8,K.helS,1,2);P(hx+5,hy+3,K.visor,5,1);P(hx-1,hy+1,t,11,1);P(hx-1,hy-1,K.helH,2,4);P(hx,hy+4,K.helS,1,6);}},
  hood:{f(P,K,t,hx,hy){P(hx-2,hy-1,K.hel,14,4);P(hx,hy-2,K.hel,10,1);P(hx-2,hy+3,K.hel,2,9);P(hx+10,hy+3,K.hel,2,9);P(hx+9,hy-1,K.helS,3,13);P(hx,hy+2,K.helS,10,1);P(hx-1,hy-1,K.helH,3,1);P(hx-3,hy+11,K.hel,16,2);P(hx+3,hy+11,t,4,1);},
    b(P,K,t,hx,hy){P(hx-2,hy-2,K.hel,14,14);P(hx+9,hy-2,K.helS,3,14);P(hx-1,hy-2,K.helH,2,10);P(hx+2,hy+12,K.hel,8,3);P(hx+4,hy+15,K.helS,4,1);},
    s(P,K,t,hx,hy){P(hx-1,hy-2,K.hel,9,4);P(hx-3,hy,K.hel,6,12);P(hx+7,hy-1,K.hel,3,4);P(hx+5,hy+2,K.helS,4,1);P(hx-3,hy+11,K.hel,9,2);P(hx-3,hy,K.helH,1,8);P(hx-1,hy+3,K.helS,1,8);}},
  fire:{f(P,K,t,hx,hy){P(hx,hy-2,K.hel,10,5);P(hx+1,hy-3,K.hel,8,1);P(hx-3,hy+2,K.hel,16,2);P(hx-3,hy+3,K.helS,16,1);P(hx+4,hy-3,K.helH,2,5);P(hx+8,hy-2,K.helS,2,4);P(hx+4,hy,'#fff6e0',2,2);P(hx,hy+4,K.visor,10,1);},
    b(P,K,t,hx,hy){P(hx,hy-2,K.hel,10,6);P(hx+1,hy-3,K.hel,8,1);P(hx-3,hy+2,K.hel,16,2);P(hx-3,hy+3,K.helS,16,1);P(hx-1,hy+4,K.hel,12,4);P(hx-1,hy+7,K.helS,12,1);P(hx+4,hy-3,K.helH,2,5);P(hx+8,hy-2,K.helS,2,6);P(hx+2,hy+5,K.stripe||t,6,1);},
    s(P,K,t,hx,hy){P(hx,hy-2,K.hel,9,5);P(hx+1,hy-3,K.hel,7,1);P(hx-4,hy+2,K.hel,16,2);P(hx-4,hy+3,K.helS,16,1);P(hx-4,hy+4,K.hel,4,4);P(hx-4,hy+7,K.helS,4,1);P(hx+1,hy-3,K.helH,4,1);P(hx+6,hy,'#fff6e0',2,2);P(hx+8,hy+4,K.visor,2,1);}},
  band:{f(P,K,t,hx,hy){P(hx,hy,K.hair,10,3);P(hx+1,hy-1,K.hair,8,1);P(hx+2,hy,dk(K.hair,1.3),3,1);P(hx-1,hy+3,K.hel,12,2);P(hx-1,hy+3,K.helH,12,1);P(hx+4,hy+3,t,2,2);},
    b(P,K,t,hx,hy){P(hx,hy,K.hair,10,3);P(hx+1,hy-1,K.hair,8,1);P(hx-1,hy+3,K.hel,12,2);P(hx-1,hy+3,K.helH,12,1);P(hx+3,hy+5,K.hel,2,4);P(hx+6,hy+5,K.hel,2,5);P(hx+6,hy+9,K.helS,2,1);},
    s(P,K,t,hx,hy){P(hx,hy,K.hair,9,3);P(hx+1,hy-1,K.hair,7,1);P(hx-1,hy+3,K.hel,11,2);P(hx-1,hy+3,K.helH,11,1);P(hx-4,hy+4,K.hel,3,1);P(hx-5,hy+5,K.hel,3,2);P(hx+6,hy+3,t,2,2);}},
};
function sXtra(P,K,t,pose,v,hx,hy){const cr=pose.crouch;
  if(K.pads){if(v==='s'){P(15,19,K.pads,7,5);P(15,19,dk(K.pads,1.25),7,1);P(15,23,dk(K.pads,0.7),7,1);}
    else{for(const x of[8,26]){P(x,19,K.pads,6,5);P(x,19,dk(K.pads,1.25),6,1);P(x,23,dk(K.pads,0.7),6,1);P(x+2,21,t,2,1);}}}
  if(K.stripe){if(v==='s')P(16,26,K.stripe,4,1);else{P(10,25,K.stripe,4,1);P(26,25,K.stripe,4,1);P(14,29,K.stripe,12,1);if(!cr){P(15,40,K.stripe,4,1);P(21,40,K.stripe,4,1);}}}
  if(K.cross){const x=v==='s'?17:v==='b'?26:10;P(x,23,'#fff6e0',4,3);P(x+1,23,'#d8322a',2,3);P(x,24,'#d8322a',4,1);}
  if(K.paint&&v!=='b'){if(v==='f'){P(hx+1,hy+7,K.paint,2,1);P(hx+7,hy+7,K.paint,2,1);P(hx+1,hy+8,K.paint,1,1);P(hx+8,hy+8,K.paint,1,1);}else{P(hx+5,hy+7,K.paint,3,1);P(hx+6,hy+8,K.paint,2,1);}}}
const SOLDC=new Map();
function getSold(si,ci){si=Math.max(0,Math.min(SKINS.length-1,si|0));ci=ci|0;const key=si*10+ci;let v=SOLDC.get(key);if(v)return v;const K=SKINS[si],[t,ts]=TEAMS[ci%4];
  const front=[0,1].map(f=>makeSprite(40,48,P=>paintSoldier(P,K,t,ts,{f,back:false}),OUT));
  const back=[0,1].map(f=>makeSprite(40,48,P=>paintSoldier(P,K,t,ts,{f,back:true}),OUT));
  const crouch=[false,true].map(b=>makeSprite(40,48,P=>paintSoldier(P,K,t,ts,{f:0,back:b,crouch:true}),OUT));
  const side=[0,1].map(f=>makeSprite(40,48,P=>paintSoldierSide(P,K,t,ts,{f}),OUT)),crouchS=makeSprite(40,48,P=>paintSoldierSide(P,K,t,ts,{f:0,crouch:true}),OUT);
  v={front,back,side,crouch,crouchS,downF:squash(crouch[0],0.6),downS:squash(crouchS,0.6),die:meltFrames(front[0],6,'#a3201d','#5c0e0e'),dieS:meltFrames(side[0],6,'#a3201d','#5c0e0e')};SOLDC.set(key,v);return v;}

/* ================= fx sprites ================= */
const EXPL=(()=>{const fr=[],r=rng(5),bl=[];for(let i=0;i<10;i++)bl.push({a:r()*6.28,d:r()*0.9,s:0.5+r()*0.6});
  for(let f=0;f<8;f++){const p=f/7;fr.push(makeSprite(48,48,P=>{const cx=24,cy=32-p*8,Rr=6+p*14;
    for(const b of bl){const bx=cx+Math.cos(b.a)*b.d*Rr,by=cy+Math.sin(b.a)*b.d*Rr*0.8-p*4;
      const br=Math.max(1,Rr*0.5*b.s*(f<5?1:1-(f-4)/5)),sm=f>=4;
      disc(P,bx,by,br,sm?(f>5?'#4d4651':'#6e6470'):'#e0401a');
      if(!sm){disc(P,bx-1,by-1,br*0.7,'#ff9a1f');disc(P,bx-1,by-2,br*0.4,'#fff3a0');}else disc(P,bx-1,by-1,br*0.55,'#8a808c');}
    if(f<2)disc(P,cx,cy,Rr*0.9,'#fffbe0');},'#2a0d08'));}
  return fr;})();
const FLASH=makeSprite(32,32,P=>{disc(P,16,18,7,'#ff9a1f');disc(P,16,18,5,'#ffe27a');disc(P,16,18,3,'#ffffff');
  for(const[dx,dy,l]of[[0,-1,15],[1,-1,9],[-1,-1,9],[1,0,10],[-1,0,10]])for(let i=0;i<l;i++)P(16+dx*i,18+dy*i,i<l*0.5?'#fff3a0':'#ff9a1f',2,2);},'#e0401a');
const NADE=makeSprite(8,9,P=>{P(1,2,'#56652a',6,7);P(1,2,'#7e8f42',2,6);P(5,2,'#38431a',2,7);P(1,4,'#38431a',6,1);P(1,6,'#38431a',6,1);P(3,0,'#9aa3ad',2,2);P(5,0,'#c9c0b0',2,1);},OUT);
const ROCKET=makeSprite(12,12,P=>{disc(P,6,6,5,'#6e6470');disc(P,6,6,4,'#ff9a1f');disc(P,6,6,2,'#fff3a0');},OUT);
const SPIT=makeSprite(9,9,P=>{disc(P,4,4,3.5,'#5a9a2a');disc(P,4,3,2.5,'#9be05a');P(3,2,'#eaffb0',1,1);},'#1f3a10');
const GIBS=[makeSprite(7,6,P=>{P(1,1,'#8fb06a',5,4);P(1,1,'#bcd68e',2,1);P(4,3,'#a3201d',2,2);},OUT),
  makeSprite(8,4,P=>{P(1,1,'#efe6c8',6,2);P(0,0,'#efe6c8',2,4);P(6,0,'#efe6c8',2,4);},OUT),
  makeSprite(6,6,P=>{disc(P,3,3,2.4,'#f2eee4');P(2,2,'#d8322a',2,2);P(2,2,'#1a0a0c',1,1);},OUT),
  makeSprite(7,6,P=>{P(1,1,'#cdb88f',5,4);P(3,2,'#a3201d',2,2);},OUT)];
function crate(label,plate,hi){return makeSprite(18,16,P=>{P(1,2,'#8a5a2e',16,13);P(1,2,'#b07a40',16,1);P(1,14,'#5e3a1c',16,1);P(1,8,'#5e3a1c',16,1);
  for(const[x,y]of[[1,2],[15,2],[1,13],[15,13]])P(x,y,'#9aa3ad',2,2);
  const pw=label.length*4+3,px=9-(pw>>1);P(px,5,plate,pw,7);P(px,5,hi,pw,1);glyphs(P,label,px+2,6,'#1a1014');},OUT);}
const SKN='#f0c090',SKS='#c08a58';
const STK=[
  {name:'TOS!',draw:P=>{P(7,10,SKN,10,10);P(15,10,SKS,2,10);P(7,3,SKN,2,8);P(10,2,SKN,2,9);P(13,2,SKN,2,9);P(16,4,SKN,2,7);P(16,4,SKS,1,7);P(3,11,SKN,4,3);P(2,9,SKN,2,3);
    P(8,13,SKS,7,1);P(1,2,'#ffe14a',2,1);P(2,4,'#ffe14a',2,1);P(20,1,'#ffe14a',2,1);P(20,4,'#ffe14a',3,1);P(21,7,'#ffe14a',2,1);}},
  {name:'ADU TINJU',draw:P=>{P(1,8,SKN,9,9);P(1,8,'#ffe0b8',9,1);for(let i=0;i<3;i++)P(8,10+i*2,SKS,2,1);P(1,16,SKS,9,1);
    P(14,8,'#c88a60',9,9);P(14,8,'#e0a878',9,1);for(let i=0;i<3;i++)P(14,10+i*2,'#985a38',2,1);P(14,16,'#985a38',9,1);
    P(11,3,'#ffe14a',2,4);P(11,18,'#ffe14a',2,4);P(10,11,'#fff6c0',4,2);P(9,5,'#ffb23e',1,2);P(14,5,'#ffb23e',1,2);}},
  {name:'AH PUSING',draw:P=>{disc(P,12,13,9,'#9be05a');disc(P,11,12,7.5,'#b8f07a');
    for(const ex of[8,16]){P(ex-2,10,'#1a1014',5,1);P(ex+2,10,'#1a1014',1,4);P(ex-2,13,'#1a1014',5,1);P(ex-2,11,'#1a1014',1,2);P(ex,11,'#1a1014',1,1);}
    for(let x=7;x<18;x++)P(x,17+((x>>1)%2),'#1a1014');P(3,1,'#ffe14a',2,2);P(11,0,'#ffe14a',2,2);P(19,2,'#ffe14a',2,2);P(4,1,'#fff6c0',1,1);}},
  {name:'MANTAP',draw:P=>{P(6,10,SKN,11,9);P(15,10,SKS,2,9);P(8,2,SKN,4,9);P(11,2,SKS,1,9);for(let i=0;i<3;i++)P(6,12+i*2,SKS,9,1);P(4,19,'#3d7bd8',15,3);P(4,19,'#7fb0ff',15,1);}},
  {name:'TOLONG!',draw:P=>{disc(P,12,12,10,'#d8322a');disc(P,11,11,8,'#ff5a4a');P(10,4,'#ffffff',4,10);P(10,16,'#ffffff',4,4);}},
  {name:'HAHA',draw:P=>{disc(P,12,12,10,'#ffc93a');disc(P,11,11,8,'#ffe07a');P(6,8,'#1a1014',2,1);P(5,9,'#1a1014',1,1);P(8,9,'#1a1014',1,1);P(15,8,'#1a1014',2,1);P(14,9,'#1a1014',1,1);P(17,9,'#1a1014',1,1);
    P(6,13,'#5a1414',12,6);P(7,13,'#ffffff',10,1);P(9,17,'#d8322a',6,2);P(2,10,'#7fb0ff',2,4);P(20,10,'#7fb0ff',2,4);}},
  {name:'AWAS!',draw:P=>{for(let y=2;y<22;y++){const hw=Math.round((y-2)*0.55);P(12-hw,y,'#ffc93a',hw*2,1);}for(let y=4;y<21;y++){const hw=Math.round((y-4)*0.45);P(12-hw,y,'#ffe07a',1,1);}
    P(11,8,'#1a1014',3,8);P(11,18,'#1a1014',3,2);}},
  {name:'GG',draw:P=>{P(6,2,'#e8b43a',12,10);P(7,12,'#c9962a',10,1);P(8,13,'#a07420',8,1);P(6,2,'#fff0a0',3,9);P(3,3,'#e8b43a',3,1);P(3,3,'#e8b43a',1,5);P(3,7,'#e8b43a',3,1);
    P(18,3,'#e8b43a',3,1);P(20,3,'#e8b43a',1,5);P(18,7,'#e8b43a',3,1);P(10,13,'#c9962a',4,4);P(6,17,'#7a5410',12,4);P(6,17,'#c9962a',12,1);glyphs(P,'GG',8,4,'#7a5410');}},
];
STK.forEach(t=>{t.spr=makeSprite(24,24,t.draw,OUT);});
const CRATE_LIFE=makeSprite(18,20,P=>{const hc='#4fd84a',hs='#2e8a2a',hh='#c6ff9a';disc(P,5.5,5,3.6,hc);disc(P,11.5,5,3.6,hc);
  for(let y=6;y<14;y++){const hw=Math.max(0,Math.round(7.5-(y-6)*1.05));P(9-hw,y,hc,hw*2,1);}P(4,3,hh,2,2);P(3,5,hh,1,2);P(11,9,hs,3,2);
  P(2,15,'#1a1014',14,5);glyphs(P,'1UP',3,15,'#9be05a');},OUT);
const CRATE={life:CRATE_LIFE,mg:crate('MG','#ffc93a','#fff0a0'),sg:crate('SG','#ff7a3a','#ffb08a'),rl:crate('RL','#e0603a','#ff9a7a'),nade:crate('B','#9be05a','#d8ffa8'),awp:crate('AW','#4fb8c8','#a8e8f0'),
  med:makeSprite(18,16,P=>{P(1,3,'#e8e4dc',16,12);P(1,3,'#ffffff',16,1);P(1,14,'#a8a49c',16,1);P(6,1,'#a8a49c',6,2);P(7,5,'#d8322a',4,8);P(5,7,'#d8322a',8,4);},OUT),
  molo:crate('MO','#ff7a3a','#ffc08a'),kriss:crate('KR','#b07aff','#e0c8ff')};
const MOLO=makeSprite(8,12,P=>{P(2,4,'#7aa04a',4,7);P(2,4,'#a8d070',1,6);P(5,4,'#4a6a2a',1,7);P(3,2,'#7aa04a',2,2);P(3,0,'#e8e4dc',2,2);P(4,0,'#ffb23e',1,1);P(2,7,'#c8a050',4,2);},OUT);
const ROCK=makeSprite(14,12,P=>{disc(P,7,6,5.5,'#6e6470');disc(P,6,5,4,'#8a808c');P(4,3,'#a89ea8',3,1);P(8,7,'#4d4651',3,1);P(6,8,'#4d4651',1,2);},OUT);

/* ================= weapon view sprites ================= */
function glove(P,x,y,w,h){P(x,y,FPC.g,w,h);P(x,y,FPC.gh,w,1);P(x,y,FPC.gh,1,h);P(x+w-1,y,FPC.gs,1,h);P(x,y+h-1,FPC.gs,w,1);
  for(let i=0;i*3+3<w;i++)P(x+2+i*3,y+2,FPC.gs,1,2);}
function sleeveR(P,y0,x0){for(let y=y0;y<72;y++){const x=x0+((y-y0)>>1);P(x,y,FPC.s,26,1);P(x+22,y,FPC.ss,4,1);P(x,y,FPC.sh,2,1);if(FPC.pat&&y%5===0)P(x+6+(y%3)*5,y,FPC.pat,3,1);}P(x0,y0,FPC.sc,24,2);}
function sleeveL(P,y0,x0){for(let y=y0;y<72;y++){const x=x0-((y-y0)>>1);P(x,y,FPC.s,22,1);P(x,y,FPC.sh,3,1);P(x+19,y,FPC.ss,3,1);if(FPC.pat&&y%5===2)P(x+5+(y%3)*4,y,FPC.pat,3,1);}}
let WSPR;
function buildWeapons(){WSPR={
  pistol:makeSprite(96,72,P=>{sleeveR(P,56,50);
    trap(P,48,14,46,4,9,'#4a4f57','#7d848f','#2b2e33');P(45,13,'#2b2e33',6,2);P(46,14,'#101114',4,2);P(47,11,'#2b2e33',2,3);
    for(let y=28;y<44;y+=3)P(42,y,'#2b2e33',12,1);P(39,44,'#2b2e33',4,3);P(53,44,'#2b2e33',4,3);
    glove(P,36,45,24,13);P(33,47,'#c8a26b',4,9);P(33,47,'#e2c08a',1,9);P(58,40,'#c8a26b',5,9);P(62,40,'#8f6f43',1,9);},OUT),
  mg:makeSprite(96,72,P=>{sleeveR(P,58,54);sleeveL(P,52,22);
    trap(P,48,4,30,5,8,'#3a3e45','#6a707a','#24272c');for(let y=8;y<28;y+=4){P(45,y,'#15171a',2,2);P(50,y,'#15171a',2,2);}P(45,3,'#101114',6,3);
    trap(P,48,30,60,12,16,'#4a4f57','#7d848f','#2b2e33');P(38,34,'#2b2e33',20,2);P(42,25,'#2b2e33',12,3);P(43,22,'#2b2e33',2,4);P(51,22,'#2b2e33',2,4);
    for(let i=0;i<7;i++){P(30-i,42+i*4,'#c9a64a',4,3);P(30-i,42+i*4,'#f0d27a',4,1);P(29-i,44+i*4,'#6a5520',1,1);}
    glove(P,22,48,16,12);glove(P,56,52,18,12);},OUT),
  sg:makeSprite(96,72,P=>{sleeveR(P,58,54);sleeveL(P,32,20);
    trap(P,48,4,44,3,6,'#2e3238','#5a606a','#1a1c20');P(46,3,'#0c0d0f',4,3);
    trap(P,48,18,34,7,9,'#8a5a2e','#b07a40','#5e3a1c');for(let y=20;y<34;y+=3)P(41,y,'#5e3a1c',14,1);
    trap(P,48,40,60,9,13,'#3a3e45','#6a707a','#24272c');trap(P,48,58,71,12,14,'#7a4e26','#a06a36','#4e3018');
    glove(P,28,22,15,12);glove(P,56,50,18,13);},OUT),
  rl:makeSprite(96,72,P=>{sleeveR(P,58,56);sleeveL(P,54,20);
    trap(P,48,3,66,10,18,'#56652a','#7e8f42','#38431a');P(38,3,'#2a3214',20,4);P(41,4,'#101408',14,3);P(44,0,'#b8402e',8,4);P(45,0,'#e0603a',3,2);
    for(let x=36;x<60;x+=4){P(x,30,'#ffc93a',2,5);P(x+2,30,'#1a1a14',2,5);}
    P(25,16,'#3a3e45',8,10);P(26,17,'#9be05a',3,3);P(31,20,'#24272c',4,3);
    glove(P,24,48,16,13);glove(P,58,52,18,13);},OUT),
};
WSPR.parang=makeSprite(96,72,P=>{sleeveR(P,60,56);
  for(let i=0;i<=46;i++){const t=i/46,cx=Math.round(64-t*36),cy=Math.round(50-t*46),w=Math.max(2,Math.round(8-t*4));
    P(cx-w,cy,'#b8bcc6',w*2,2);P(cx-w,cy,'#eef0f4',2,2);P(cx+w-2,cy,'#6a707a',2,2);if(i%9===4)P(cx-1,cy,'#d8dce4',2,1);}
  P(27,2,'#eef0f4',3,2);P(52,24,'#8a1a1a',4,3);P(47,30,'#a3201d',3,2);P(56,20,'#5c0e0e',2,2);
  P(58,49,'#2a2a2e',16,4);P(58,49,'#4a4a52',16,1);
  for(let y=53;y<70;y++){const x=62+((y-53)>>2);P(x,y,'#5a3a22',7,1);P(x,y,'#7a5236',2,1);P(x+5,y,'#3a2416',2,1);}
  glove(P,56,54,18,13);},OUT);
WSPR.awp=makeSprite(96,72,P=>{sleeveR(P,58,56);sleeveL(P,44,20);
  trap(P,48,0,46,2,4,'#2a2e33','#5a606a','#15171a');P(45,0,'#3a3e45',6,4);P(46,1,'#0c0d0f',4,2);
  trap(P,48,30,66,9,15,'#4e5a32','#6e7c46','#323c1e');
  trap(P,48,14,42,5,8,'#1a1c20','#3a3e45','#0c0d0f');P(41,42,'#1a1c20',14,4);P(43,43,'#4fb8c8',10,2);P(43,43,'#a8e8f0',3,1);
  P(44,22,'#3a3e45',8,2);P(44,34,'#3a3e45',8,2);P(60,44,'#1a1c20',8,3);P(66,42,'#3a3e45',3,4);
  glove(P,24,40,15,12);glove(P,56,54,18,13);},OUT);
WSPR.kriss=makeSprite(96,72,P=>{sleeveR(P,58,56);sleeveL(P,46,20);krissGun(P,48,2,1);glove(P,26,36,16,12);glove(P,56,52,18,13);},OUT);
WSPR.krissD=makeSprite(96,72,P=>{sleeveR(P,62,64);sleeveL(P,62,10);krissGun(P,22,12,0.8);krissGun(P,74,12,0.8);glove(P,10,52,16,12);glove(P,68,52,16,12);},OUT);
}
function krissGun(P,cx,top,sc){const r=v=>Math.round(v*sc),T=(y0,y1,w0,w1,c,h,d)=>trap(P,cx,top+r(y0),top+r(y1),r(w0),r(w1),c,h,d),Q=(x,y,c,w,h)=>P(cx+r(x),top+r(y),c,Math.max(1,r(w)),Math.max(1,r(h)));
  T(0,12,3,4,'#2a2e33','#5a606a','#15171a');Q(-3,0,'#101114',6,3);Q(-2,1,'#000000',4,2);
  T(12,22,6,7,'#24272c','#4a4f57','#15171a');for(let y=14;y<22;y+=3)Q(-5,y,'#3a3e45',10,1);
  T(22,46,9,12,'#3a3e45','#6a707a','#24272c');Q(-8,24,'#9a6cf0',16,1);Q(-2,17,'#2b2e33',4,6);Q(-1,15,'#2b2e33',2,2);
  Q(-10,30,'#2b2e33',20,9);Q(-10,30,'#4a4f57',20,1);Q(-10,30,'#4a4f57',1,9);Q(9,30,'#15171a',1,9);Q(-7,33,'#8a6fd0',14,1);
  T(46,71,13,15,'#2e3238','#5a606a','#1a1c20');Q(-4,49,'#15171a',8,3);}
buildWeapons();
const MUZ={pistol:[48,13],mg:[48,3],sg:[48,3],rl:[48,3],awp:[48,1],parang:[30,4],kriss:[48,2],krissL:[22,13],krissR:[74,13]};

/* ================= map ================= */
const MAPS=[
  {name:'PUSAT KOTA',fog:'#34203a',mix:[0.1,0.35],seed:7,start:[12.5,12.5],spawns:[[1.5,1.5],[22.5,22.5]],rows:['CCCCCCCCWWWWWWWWPPPPPPPP','C..........W...........P','C..XX......W...SS......P','C..X...................P','C.......CC.......SS....P','C.......CC.............P','W..........##..........W','W..S.......##......XX..W','W..S...................W','W......................W','#.....SS.......SS......#','#......................#','#.......X......X.......#','#......................#','#..CC..............CC..#','#..CC.....####.....CC..#','P.........#..#.........S','P...SS.................S','P.........#..#.........S','P..........##........X.S','P..XX..................S','P....................XXS','P......................S','PPPPPPPPWWWWWWWWSSSSSSSS']},
  {name:'PELABUHAN',fog:'#1e2638',mix:[0.06,0.12],seed:17,start:[12.5,11.5],spawns:[[1.5,1.5],[22.5,22.5]],rows:['CCCCCCCCCCCCCCCCCCCCCCCC','C......................C','C.CCC.CCCC....CCCC.CCC.C','C......................C','C.CCC.CCCC.XX.CCCC.CCC.C','C......................C','C..SS..............SS..C','C......CC......CC......C','C......CC......CC......C','C..X................X..C','CCC....SS..XX..SS....CCC','C......................C','C......................C','CCC....SS..XX..SS....CCC','C..X................X..C','C......CC......CC......C','C......CC......CC......C','C..SS..............SS..C','C......................C','C.CCC.CCCC.XX.CCCC.CCC.C','C......................C','C.CCC.CCCC....CCCC.CCC.C','C......................C','CCCCCCCCCCCCCCCCCCCCCCCC']},
  {name:'PABRIK KIMIA',fog:'#22301a',mix:[0.16,0.18],seed:27,start:[12.5,16.5],spawns:[[1.5,1.5],[22.5,22.5]],rows:['PPPPPPWWWWPPPPPPWWWWPPPP','P..........P...........P','P..TT......P.....XX....P','P..TT......P...........P','P..........P....TT.....P','P.....PPPPPP....TT.....P','P......................P','P......................P','PPPP...XX......XX...PPPP','P......................P','P..T................T..P','P......PPP....PPP......P','P......P........P......P','P......P...TT...P......P','P......P........P......P','P......PPP....PPP......P','P......................P','P..XX..............XX..P','PPPP......TTTT......PPPP','P......................P','P....P............P....P','P....P...XX..XX...P....P','P....P............P....P','PPPPPPWWWWPPPPPPWWWWPPPP']},
  {name:'KUBURAN TUA',fog:'#1c1626',mix:[0.05,0.7],seed:37,start:[12.5,11.5],spawns:[[1.5,1.5],[22.5,22.5]],rows:['########################','#......................#','#.G..G..G......G..G..G.#','#......................#','#.G..G..G..GG..G..G..G.#','#..........GG..........#','#.G..G..G......G..G..G.#','#......................#','#...GGG..........GGG...#','#...G..............G...#','#...G....GG..GG....G...#','#........G....G........#','#........G....G........#','#...G....GG..GG....G...#','#...G..............G...#','#...GGG..........GGG...#','#......................#','#.G..G..G......G..G..G.#','#......................#','#.G..G..G..GG..G..G..G.#','#..........GG..........#','#.G..G..G......G..G..G.#','#......................#','########################']}
];
const MW=24,MH=24,WCH={'#':0,S:1,C:2,P:3,W:4,X:5,G:6,T:7};
const map=new Int8Array(MW*MH),fkind=new Uint8Array(MW*MH),openCells=[];
let MAP=MAPS[0];
function loadMap(i){i=Math.max(0,Math.min(MAPS.length-1,i|0));MAP=MAPS[i];G.mapIdx=i;const r=rng(MAP.seed);openCells.length=0;
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const ch=MAP.rows[y][x];const v=ch==='.'?-1:WCH[ch];map[y*MW+x]=v;if(v<0)openCells.push([x,y]);
    const q=r();fkind[y*MW+x]=q<MAP.mix[0]?2:q<MAP.mix[0]+MAP.mix[1]?1:0;}
  applyFog();
  if(!MAP.picks){const rr=rng(MAP.seed+5),kinds=['mg','sg','rl','awp','med','med','nade','nade'],out=[];
    for(const k of kinds){for(let t=0;t<300;t++){const c=openCells[(rr()*openCells.length)|0],x=c[0]+0.5,y=c[1]+0.5;
      if(MAP.spawns.some(sp=>Math.hypot(sp[0]-x,sp[1]-y)<4))continue;if(out.some(p=>Math.hypot(p.x-x,p.y-y)<(t<200?4.5:2)))continue;out.push({id:out.length+1,kind:k,x,y});break;}}
    MAP.picks=out;}
  try{localStorage.setItem('kotamati-map',String(i));}catch(e){}
}
function applyFog(){const f=hex(G.night?'#05040b':MAP.fog);FRc=f[0];FGc=f[1];FBc=f[2];FOGA=G.night?0.6:1.5;FOGB=G.night?8:13;}
function solid(x,y){const cx=Math.floor(x),cy=Math.floor(y);if(cx<0||cy<0||cx>=MW||cy>=MH)return true;return map[cy*MW+cx]>=0;}
function blocked(cx,cy){return cx<0||cy<0||cx>=MW||cy>=MH||map[cy*MW+cx]>=0;}
function castT(ox,oy,dx,dy){let mx=Math.floor(ox),my=Math.floor(oy);const ddx=dx===0?1e30:Math.abs(1/dx),ddy=dy===0?1e30:Math.abs(1/dy);
  let sx,sy,sdx,sdy;if(dx<0){sx=-1;sdx=(ox-mx)*ddx}else{sx=1;sdx=(mx+1-ox)*ddx}if(dy<0){sy=-1;sdy=(oy-my)*ddy}else{sy=1;sdy=(my+1-oy)*ddy}
  let t=0;for(let i=0;i<80;i++){if(sdx<sdy){t=sdx;sdx+=ddx;mx+=sx}else{t=sdy;sdy+=ddy;my+=sy}if(blocked(mx,my))return t;}return t;}
function los(x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,d=Math.hypot(dx,dy);if(d<0.01)return true;return castT(x0,y0,dx/d,dy/d)>=d;}
const flow=new Int16Array(MW*MH);
function buildFlow(srcs){flow.fill(9999);const q=[];for(const[px,py]of srcs){if(blocked(px,py))continue;const s=py*MW+px;if(flow[s]){flow[s]=0;q.push(s);}}let h=0;
  while(h<q.length){const i=q[h++],x=i%MW,y=(i/MW)|0,v=flow[i]+1;
    for(const[ox,oy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+ox,ny=y+oy;if(blocked(nx,ny))continue;const j=ny*MW+nx;if(flow[j]>v){flow[j]=v;q.push(j);}}}}
const DIR8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function flowTarget(z,tg){const cx=Math.floor(z.x),cy=Math.floor(z.y);let best=flow[cy*MW+cx],bx=cx,by=cy;
  for(const[ox,oy]of DIR8){const nx=cx+ox,ny=cy+oy;if(blocked(nx,ny))continue;if(ox&&oy&&(blocked(cx+ox,cy)||blocked(cx,cy+oy)))continue;
    const v=flow[ny*MW+nx];if(v<best){best=v;bx=nx;by=ny;}}
  if(bx===cx&&by===cy)return[tg.x,tg.y];return[bx+0.5,by+0.5];}

/* ================= renderer ================= */
let FRc=52,FGc=32,FBc=58,FOGA=1.5,FOGB=13;
function fogF(d){let f=(d-FOGA)/FOGB;if(f<0)f=0;else if(f>1)f=1;return f*f*(3-2*f)*0.9;}
let colCam,colAng;
function buildCols(){colCam=new Float32Array(W);colAng=new Float32Array(W);for(let x=0;x<W;x++){colCam[x]=2*(x+0.5)/W-1;colAng[x]=Math.atan(colCam[x]*PLANE);}}
buildCols();
let camX=0,camY=0,camDX=1,camDY=0,camPX=0,camPY=PLANE,invDet=1,camA=0;
function setCam(x,y,a,pitch,z){camZ=z;camX=x;camY=y;camA=a;camDX=Math.cos(a);camDY=Math.sin(a);camPX=-camDY*PLANE/ZK;camPY=camDX*PLANE/ZK;invDet=1/(camPX*camDY-camDX*camPY);
  horizon=Math.max(-3*H,Math.min(4*H,Math.round(HH+pitch*ZK)));}
function renderWorld(){
  const sky=G.night?SKYN:SKY.px,SW=SKY.w,TAU=Math.PI*2,off=SH-horizon;
  const pz=PLANE/ZK,yl=Math.min(H,horizon);for(let x=0;x<W;x++){let u=Math.floor(((camA+(ZK===1?colAng[x]:Math.atan(colCam[x]*pz)))/TAU*SW*2)%SW);if(u<0)u+=SW;for(let y=0;y<yl;y++){let ro=y+off;if(ro<0)ro=0;else if(ro>=SH)ro=SH-1;buf[y*W+x]=sky[ro*SW+u];}}
  const r0x=camDX-camPX,r0y=camDY-camPY,r1x=camDX+camPX,r1y=camDY+camPY;
  for(let y=Math.max(0,horizon);y<H;y++){const rowD=(camZ*H*ZK)/(y-horizon+0.5),sx=rowD*(r1x-r0x)/W,sy=rowD*(r1y-r0y)/W;
    let fx=camX+rowD*r0x+sx*0.5,fy=camY+rowD*r0y+sy*0.5;const f=fogF(rowD),k=0.82*(1-f),fr=FRc*f,fg=FGc*f,fb=FBc*f;let idx=y*W;
    if(LOWQ){const sx2=sx*2,sy2=sy*2;for(let x=0;x<W;x+=2,idx+=2){const cx=Math.floor(fx),cy=Math.floor(fy);const kind=(cx>=0&&cy>=0&&cx<MW&&cy<MH)?fkind[cy*MW+cx]:0;
      const c=FT[kind][(((fy-cy)*32)&31)*32+(((fx-cx)*32)&31)],v=0xff000000|((((c>>>16)&255)*k+fb)<<16)|((((c>>>8)&255)*k+fg)<<8)|((c&255)*k+fr);buf[idx]=v;if(x+1<W)buf[idx+1]=v;fx+=sx2;fy+=sy2;}continue;}
    for(let x=0;x<W;x++,idx++){const cx=Math.floor(fx),cy=Math.floor(fy);const kind=(cx>=0&&cy>=0&&cx<MW&&cy<MH)?fkind[cy*MW+cx]:0;
      const c=FT[kind][(((fy-cy)*32)&31)*32+(((fx-cx)*32)&31)];
      buf[idx]=0xff000000|((((c>>>16)&255)*k+fb)<<16)|((((c>>>8)&255)*k+fg)<<8)|((c&255)*k+fr);fx+=sx;fy+=sy;}}
  for(let x=0;x<W;x++){const cam=colCam[x],rdx=camDX+camPX*cam,rdy=camDY+camPY*cam;let mx=Math.floor(camX),my=Math.floor(camY);
    const ddx=rdx===0?1e30:Math.abs(1/rdx),ddy=rdy===0?1e30:Math.abs(1/rdy);let stx,sty,sdx,sdy;
    if(rdx<0){stx=-1;sdx=(camX-mx)*ddx}else{stx=1;sdx=(mx+1-camX)*ddx}if(rdy<0){sty=-1;sdy=(camY-my)*ddy}else{sty=1;sdy=(my+1-camY)*ddy}
    let side=0,hit=0,n=0;while(n++<90){if(sdx<sdy){sdx+=ddx;mx+=stx;side=0}else{sdy+=ddy;my+=sty;side=1}
      if(mx<0||my<0||mx>=MW||my>=MH){hit=0;break}const v=map[my*MW+mx];if(v>=0){hit=v;break}}
    const d=Math.max(0.0001,side===0?sdx-ddx:sdy-ddy);zbuf[x]=d;const lh=ZK*H/d,start=horizon-(1-camZ)*lh;
    let wx=side===0?camY+d*rdy:camX+d*rdx;wx-=Math.floor(wx);let tx=(wx*32)|0;if(side===0&&rdx>0)tx=31-tx;if(side===1&&rdy<0)tx=31-tx;
    const tex=WT[hit].px,f=fogF(d),k=(side?0.72:1)*(1-f),fr=FRc*f,fg=FGc*f,fb=FBc*f;
    const y0=Math.max(0,Math.ceil(start)),y1=Math.min(H-1,Math.floor(start+lh)),step=32/lh;let tp=(y0-start)*step;
    for(let y=y0;y<=y1;y++){const ty=tp<31?tp|0:31;tp+=step;const c=tex[ty*32+tx];
      buf[y*W+x]=0xff000000|((((c>>>16)&255)*k+fb)<<16)|((((c>>>8)&255)*k+fg)<<8)|((c&255)*k+fr);}}
}
function proj(wx,wy,wz){const rx=wx-camX,ry=wy-camY,tx=invDet*(camDY*rx-camDX*ry),ty=invDet*(-camPY*rx+camPX*ry);
  if(ty<0.15)return null;const unit=ZK*H/ty;return{x:HW*(1+tx/ty),y:horizon+(camZ-wz)*unit,d:ty,unit};}
function viewOf(x,y,a){let d=Math.atan2(camY-y,camX-x)-a;d=Math.abs(Math.atan2(Math.sin(d),Math.cos(d)));if(d<0.94)return 0;if(d>2.2)return 2;return(Math.sin(a)*camDX-Math.cos(a)*camDY)>0?1:3;}
function drawSpr(s,wx,wy,wz,wh,flash,mir,clip){
  const rx=wx-camX,ry=wy-camY,tx=invDet*(camDY*rx-camDX*ry),ty=invDet*(-camPY*rx+camPX*ry);if(ty<0.15)return;
  const unit=ZK*H/ty,scx=HW*(1+tx/ty),hp=wh*unit,wp=hp*s.w/s.h,bottom=horizon+(camZ-wz)*unit,top=bottom-hp,left=scx-wp/2;
  const x0=Math.max(0,Math.floor(left)),x1=Math.min(W-1,Math.ceil(left+wp)-1),y0=Math.max(0,Math.floor(top));
  let y1=Math.min(H-1,Math.ceil(bottom)-1);if(clip)y1=Math.min(y1,Math.floor(horizon+camZ*unit)-1);if(x0>x1||y0>y1)return;
  const f=fogF(ty),k=1-f,fr=FRc*f,fg=FGc*f,fb=FBc*f,px=s.px,sw=s.w,sh=s.h,kx=sw/wp,ky=sh/hp;
  for(let x=x0;x<=x1;x++){if(ty>=zbuf[x])continue;let tX=((x+0.5-left)*kx)|0;if(tX<0)tX=0;else if(tX>=sw)tX=sw-1;if(mir)tX=sw-1-tX;
    for(let y=y0;y<=y1;y++){const tY=((y+0.5-top)*ky)|0;if(tY<0||tY>=sh)continue;const c=px[tY*sw+tX];if((c>>>24)<128)continue;
      let r=c&255,g=(c>>>8)&255,b=(c>>>16)&255;if(flash){r=r*0.3+178;g=g*0.3+178;b=b*0.3+178;}
      buf[y*W+x]=0xff000000|((b*k+fb)<<16)|((g*k+fg)<<8)|(r*k+fr);}}
}
function drawBlob(wx,wy,wz,size,col,cap=5){
  const rx=wx-camX,ry=wy-camY,tx=invDet*(camDY*rx-camDX*ry),ty=invDet*(-camPY*rx+camPX*ry);if(ty<0.3)return;
  const unit=ZK*H/ty,s=Math.min(cap*ZK,Math.max(1,size*unit)),cx=HW*(1+tx/ty),cy=horizon+(camZ-wz)*unit,one=s<1.5?1:0;
  const x0=Math.max(0,Math.round(cx-s/2)),x1=Math.min(W-1,Math.round(cx+s/2)-1+one),y0=Math.max(0,Math.round(cy-s/2)),y1=Math.min(H-1,Math.round(cy+s/2)-1+one);
  const f=fogF(ty),k=1-f,c=col,v=0xff000000|((c[2]*k+FBc*f)<<16)|((c[1]*k+FGc*f)<<8)|(c[0]*k+FRc*f);
  for(let x=x0;x<=x1;x++){if(ty>=zbuf[x])continue;for(let y=y0;y<=y1;y++)buf[y*W+x]=v;}
}

/* ================= audio ================= */
let AC=null,master=null,NB=null,muted=false;
function initAudio(){if(AC){if(AC.state==='suspended')AC.resume();try{trkInit();}catch(e){}return;}
  try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=muted?0:SFXK*SET.sfx/100;
    const cp=AC.createDynamicsCompressor();cp.threshold.value=-20;cp.knee.value=12;cp.ratio.value=5;cp.attack.value=0.003;cp.release.value=0.22;const post=AC.createGain();post.gain.value=1.6;
    master.connect(cp);cp.connect(post);post.connect(AC.destination);
    NB=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;try{REV=mkRev();}catch(e){REV=null;}}catch(e){AC=null;}try{trkInit();}catch(e){}}
const SFXK=1.0;
function nz(dur,f,type,vol,q=1){if(!AC||muted||vol<0.01)return;const t=AC.currentTime,s=AC.createBufferSource();s.buffer=NB;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;
  const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(fl).connect(g).connect(master);s.start(t,Math.random()*0.5);s.stop(t+dur+0.05);}
function tone(f0,f1,dur,type,vol,delay=0){if(!AC||muted||vol<0.01)return;const t=AC.currentTime+delay,o=AC.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(g).connect(master);o.start(t);o.stop(t+dur+0.05);}
const S={
  shot(w,v=1){if(w==='parang')return;if(w==='pistol'){nz(0.09,1800,'bandpass',0.7*v,0.8);tone(320,90,0.08,'square',0.18*v);}
    else if(w==='mg'){nz(0.06,1400,'bandpass',0.5*v,0.8);tone(220,70,0.05,'square',0.12*v);}
    else if(w==='kriss'){nz(0.045,2000,'bandpass',0.42*v,0.9);tone(300,110,0.04,'square',0.1*v);}
    else if(w==='sg'){nz(0.25,900,'lowpass',1*v);tone(140,40,0.2,'sawtooth',0.25*v);}
    else if(w==='awp'){nz(0.4,1100,'bandpass',1.2*v,0.6);tone(200,45,0.35,'sawtooth',0.3*v);tone(900,700,0.05,'square',0.06*v,0.6);}
    else{nz(0.4,600,'bandpass',0.5*v);tone(200,600,0.3,'sawtooth',0.1*v);}},
  boom(v=0.8){nz(0.9,500,'lowpass',v);tone(90,30,0.6,'sine',v*0.9);},
  splat(v=1){nz(0.12,700,'lowpass',0.35*v);},
  hurt(){tone(420,120,0.25,'square',0.22);},
  pick(){[660,880,1320].forEach((f,i)=>tone(f,f,0.07,'square',0.12,i*0.06));},
  wave(){[523,659,784,1046].forEach((f,i)=>tone(f,f,0.12,'square',0.12,i*0.1));},
  over(){[392,330,262,196].forEach((f,i)=>tone(f,f*0.98,0.22,'square',0.14,i*0.2));},
  pop(){tone(880,1320,0.07,'square',0.1);tone(1320,1760,0.06,'square',0.08,0.07);},
  oneup(){[784,988,1175,1568,1976].forEach((f,i)=>tone(f,f,0.1,'square',0.12,i*0.08));},
  win(){[523,659,784,1046,1318].forEach((f,i)=>tone(f,f,0.14,'square',0.13,i*0.11));},
  throw(){tone(500,900,0.12,'triangle',0.15);},
  click(){tone(1200,1100,0.03,'square',0.08);},
  rlOut(){tone(260,180,0.06,'square',0.12);nz(0.05,2500,'highpass',0.2);},
  rlIn(){tone(700,1100,0.05,'square',0.12);nz(0.06,3000,'highpass',0.3);},
  beep(f=880){tone(f,f,0.12,'square',0.12);},
  sob(v){for(let i=0;i<3;i++)tone(760-i*60,600-i*60,0.18,'triangle',0.14*v,i*0.24);},
  scream(v){nz(0.8,1800,'bandpass',0.6*v,2);tone(900,1500,0.7,'sawtooth',0.22*v);},
  screech(v){tone(1300,500,0.25,'square',0.16*v);nz(0.2,2500,'highpass',0.3*v);},
  cough(v){for(let i=0;i<3;i++)tone(190,120,0.08,'sawtooth',0.16*v,i*0.13);},
  roar(v){tone(110,55,0.6,'sawtooth',0.32*v);nz(0.6,300,'lowpass',0.5*v);},
  jump(){tone(260,520,0.09,'square',0.07);},
  swoosh(){nz(0.17,2600,'bandpass',0.4,0.7);tone(700,220,0.13,'triangle',0.05);},
  chop(){nz(0.08,900,'lowpass',0.55);tone(170,60,0.1,'square',0.15);nz(0.14,450,'lowpass',0.35);},
  glass(x,y){const o=zOut(x,y,18);if(!o)return;burstN(o,0.28,5200,'highpass',0.55,1);for(let i=0;i<4;i++)thud(o,2600+i*650,1900+i*450,0.07,0.05,i*0.03);},
  ignite(x,y){const o=zOut(x,y,18);if(!o)return;burstN(o,0.8,700,'lowpass',0.7,0.7,0.04);burstN(o,0.45,2400,'bandpass',0.32,0.8,0.06);},
  crackle(x,y){const o=zOut(x,y,10);if(!o)return;for(let i=0;i<3;i++)burstN(o,0.04,1800+Math.random()*2200,'bandpass',0.1+0.22*Math.random(),2,i*0.08+Math.random()*0.05);burstN(o,0.3,380,'lowpass',0.14,1);},
  ping(){tone(1320,1320,0.07,'sine',0.14);tone(1760,1760,0.11,'sine',0.12,0.08);},
  down(){tone(320,90,0.6,'sawtooth',0.16);tone(90,40,0.5,'sine',0.3);},
  land(){nz(0.07,380,'lowpass',0.25);},
  groan(v){if(!AC||muted||v<0.01)return;const t=AC.currentTime,o=AC.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(95+Math.random()*35,t);o.frequency.linearRampToValueAtTime(65,t+0.7);
    const l=AC.createOscillator();l.frequency.value=7;const lg=AC.createGain();lg.gain.value=9;l.connect(lg).connect(o.frequency);
    const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=420;const g=AC.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+0.1);g.gain.exponentialRampToValueAtTime(0.001,t+0.75);
    o.connect(f).connect(g).connect(master);o.start(t);l.start(t);o.stop(t+0.8);l.stop(t+0.8);},
};
/* ---- zombie voices: formant synthesis + 3D-ish placement + reverb ---- */
let REV=null,VC=0;const DC={};
function dcurve(k){if(DC[k])return DC[k];const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.tanh(x*k)/Math.tanh(k);}return DC[k]=c;}
function mkRev(){const sr=AC.sampleRate,len=(sr*2.2)|0,b=AC.createBuffer(2,len,sr);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;for(let i=0;i<len;i++){const t=i/len;lp=lp*0.6+(Math.random()*2-1)*0.4;d[i]=lp*Math.pow(1-t,2.6)*(i<sr*0.012?0:1);}}
  const cv=AC.createConvolver();cv.buffer=b;const g=AC.createGain();g.gain.value=0.55;cv.connect(g).connect(master);return cv;}
const VOW={oo:[[330,7,1],[800,9,0.5],[2400,12,0.12]],uh:[[560,6,1],[1000,8,0.55],[2450,12,0.15]],aa:[[760,6,1],[1180,7,0.7],[2550,11,0.2]],
  ee:[[320,8,1],[2100,10,0.55],[2900,12,0.25]],eh:[[520,7,1],[1750,9,0.55],[2500,12,0.2]],ff:[[450,6,1],[950,8,0.6],[2800,12,0.3]]};
function zOut(x,y,range,far){if(!AC||muted)return null;let dx=0,dy=0,d=0;if(x!=null){dx=x-pl.x;dy=y-pl.y;d=Math.hypot(dx,dy);}
  const near=Math.max(0,1-d/range);if(near<=0.02&&!far)return null;
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=far?650:600+7000*near*near;lp.Q.value=0.5;
  const g=AC.createGain();g.gain.value=far?far:1.7*Math.pow(near,1.4);lp.connect(g);
  let last=g;if(AC.createStereoPanner){const pn=AC.createStereoPanner();pn.pan.value=far?(Math.random()*1.6-0.8):(d>0.05?Math.max(-1,Math.min(1,(-dx*Math.sin(pl.a)+dy*Math.cos(pl.a))/d))*0.85:0);g.connect(pn);last=pn;}
  last.connect(master);if(REV){const s=AC.createGain();s.gain.value=far?1.4:0.18+0.6*(1-near);last.connect(s);s.connect(REV);}return lp;}
function voice(out,o){if(!out)return;if(VSH!==1)o=Object.assign({},o,{f0:o.f0*VSH,f1:o.f1==null?o.f0*0.8*VSH:o.f1*VSH,fm:o.fm?o.fm*VSH:o.fm,fs:(o.fs||1)*VFS,v:(o.v==null?0.3:o.v)*1.25});const t=AC.currentTime+(o.delay||0)+0.005,D=o.dur,end=t+D;
  const src=AC.createOscillator();src.type='sawtooth';const f0=o.f0,f1=o.f1==null?f0*0.8:o.f1,jit=o.jit==null?0.12:o.jit;
  src.frequency.setValueAtTime(f0,t);const st=6;for(let i=1;i<=st;i++){const k=i/st,f=o.fm?(k<=0.5?f0+(o.fm-f0)*k*2:o.fm+(f1-o.fm)*(k-0.5)*2):f0+(f1-f0)*k;src.frequency.linearRampToValueAtTime(Math.max(25,f*(1+(Math.random()-0.5)*jit)),t+D*k);}
  const nodes=[src];
  if(o.vib){const l=AC.createOscillator();l.frequency.value=o.vibr||6;const lg=AC.createGain();lg.gain.value=f0*o.vib;l.connect(lg).connect(src.frequency);nodes.push(l);}
  const sh=AC.createWaveShaper();sh.curve=dcurve(o.dist||2);src.connect(sh);
  const am=AC.createGain();const fd=o.fry==null?0.4:o.fry;am.gain.value=1-fd*0.5;sh.connect(am);
  if(fd>0){const l=AC.createOscillator();l.type='triangle';l.frequency.value=(o.frate||28)*(0.9+Math.random()*0.2);const lg=AC.createGain();lg.gain.value=fd*0.5;l.connect(lg).connect(am.gain);nodes.push(l);
    const l2=AC.createOscillator();l2.frequency.value=(o.frate||28)*0.37+Math.random()*3;const lg2=AC.createGain();lg2.gain.value=fd*0.25;l2.connect(lg2).connect(am.gain);nodes.push(l2);}
  if(o.noise){const n=AC.createBufferSource();n.buffer=NB;n.loop=true;const nf=AC.createBiquadFilter();nf.type='bandpass';nf.frequency.value=o.nf||1400;nf.Q.value=o.nq||0.7;const ng=AC.createGain();ng.gain.value=o.noise;n.connect(nf).connect(ng).connect(am);nodes.push(n);n._off=Math.random()*0.5;}
  const env=AC.createGain(),pk=(o.v==null?0.3:o.v),a=o.att||Math.min(0.12,D*0.25);env.gain.setValueAtTime(0.0001,t);env.gain.linearRampToValueAtTime(pk,t+a);
  env.gain.setValueAtTime(pk*(o.sus==null?0.8:o.sus),t+D*0.6);env.gain.exponentialRampToValueAtTime(0.001,end);env.connect(out);
  const A=VOW[o.va||'uh'],B=VOW[o.vb||o.va||'uh'],sc=o.fs||1;
  for(let i=0;i<3;i++){const bp=AC.createBiquadFilter();bp.type='bandpass';bp.Q.value=A[i][1];bp.frequency.setValueAtTime(A[i][0]*sc,t);bp.frequency.linearRampToValueAtTime(B[i][0]*sc,t+D*0.85);
    const g=AC.createGain();g.gain.value=A[i][2]*2.2;am.connect(bp).connect(g).connect(env);}
  const body=AC.createBiquadFilter();body.type='lowpass';body.frequency.value=320*sc;const bg=AC.createGain();bg.gain.value=o.body==null?0.35:o.body;am.connect(body).connect(bg).connect(env);
  for(const n of nodes){n.start(t,n._off||0);n.stop(end+0.05);}
  VC++;setTimeout(()=>{VC--;},(D+(o.delay||0))*1000+80);}
function burstN(out,dur,f,type,v,q,delay){if(!out)return;const t=AC.currentTime+(delay||0)+0.005,s=AC.createBufferSource();s.buffer=NB;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||1;
  const g=AC.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(fl).connect(g).connect(out);s.start(t,Math.random()*0.5);s.stop(t+dur+0.05);}
function thud(out,f0,f1,dur,v,delay){if(!out)return;const t=AC.currentTime+(delay||0)+0.005,o=AC.createOscillator();o.type='sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  const g=AC.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(g).connect(out);o.start(t);o.stop(t+dur+0.05);}
const rr=(a,b)=>a+Math.random()*(b-a);
let VSH=1,VFS=1;
function zv(type,kind,x,y){if(type==='boss'){VSH=0.7;VFS=0.82;try{zv0('brute',kind==='leap'?'alert':kind,x,y,26);}finally{VSH=1;VFS=1;}return;}zv0(type,kind,x,y);}
function zv0(type,kind,x,y,RX){if(!AC||muted)return;if(VC>9&&kind==='idle')return;
  const R0=RX||{brute:18,witch:kind==='leap'?28:13,charger:16}[type]||13,out=zOut(x,y,R0);if(!out)return;const T=type;
  if(kind==='die'){const big=T==='brute'||T==='fat'||T==='charger';
    voice(out,{f0:big?rr(70,90):rr(110,140),f1:big?32:45,dur:big?1.2:0.8,va:'aa',vb:'oo',fry:0.85,frate:big?10:14,noise:0.5,nf:900,dist:4,v:0.34,fs:big?0.8:(T==='witch'?1.5:1)});
    burstN(out,0.5,600,'lowpass',0.25,1,0.25);return;}
  if(kind==='hurt'){voice(out,{f0:(T==='brute'?75:T==='witch'?420:rr(130,170)),f1:(T==='brute'?55:T==='witch'?300:90),dur:0.22,va:T==='witch'?'ee':'uh',vb:'aa',fry:0.3,noise:0.35,dist:4,v:0.24,att:0.02,fs:T==='brute'?0.8:T==='witch'?1.4:1});return;}
  if(kind==='attack'){burstN(out,0.07,1100,'lowpass',0.5,1);thud(out,140,50,0.12,0.35);
    if(T==='fat'){voice(out,{f0:90,f1:48,dur:0.75,va:'oo',vb:'uh',fry:0.9,frate:9,noise:0.6,nf:700,dist:3,v:0.34,fs:0.85,delay:0.04});burstN(out,0.6,900,'bandpass',0.3,0.8,0.2);return;}
    voice(out,{f0:T==='brute'?95:T==='witch'?650:rr(170,210),f1:T==='brute'?60:T==='witch'?500:110,dur:T==='brute'?0.55:0.35,va:'aa',vb:'uh',fry:0.55,frate:34,noise:0.5,dist:T==='brute'?9:6,v:0.32,att:0.02,fs:T==='brute'?0.8:T==='witch'?1.5:1,delay:0.02});return;}
  if(kind==='alert'){
    if(T==='witch')return;
    if(T==='brute'){voice(out,{f0:95,fm:110,f1:50,dur:1.5,va:'aa',vb:'oo',fry:0.6,frate:20,noise:0.7,nf:700,dist:9,v:0.42,fs:0.75});thud(out,70,30,0.9,0.4);return;}
    if(T==='jockey'){for(let i=0;i<6;i++)voice(out,{f0:rr(420,520),f1:rr(340,400),dur:0.08,va:'eh',vb:'ee',fry:0.2,noise:0.4,nf:2200,dist:3,v:0.24,att:0.01,sus:0.6,fs:1.3,delay:i*0.1});return;}
    voice(out,{f0:T==='run'?rr(250,290):rr(150,180),fm:T==='run'?300:190,f1:T==='run'?170:100,dur:T==='run'?0.75:0.65,va:'aa',vb:'uh',fry:0.6,frate:36,noise:0.55,dist:6,v:0.34,fs:T==='hunter'||T==='spitter'?1.15:1});return;}
  if(kind==='leap'){
    if(T==='hunter'){voice(out,{f0:720,fm:820,f1:380,dur:0.5,va:'ee',vb:'eh',fry:0.25,noise:0.45,nf:3000,dist:6,v:0.36,att:0.02,fs:1.4});burstN(out,0.35,3500,'highpass',0.25,1);return;}
    if(T==='jockey'){for(let i=0;i<8;i++)voice(out,{f0:rr(500,640),f1:rr(400,460),dur:0.07,va:'ee',vb:'eh',fry:0.15,noise:0.4,nf:2600,dist:3,v:0.26,att:0.01,sus:0.5,fs:1.4,delay:i*0.085});return;}
    if(T==='smoker'){for(let i=0;i<3;i++){burstN(out,0.13,900,'bandpass',0.45,1.2,i*0.16);voice(out,{f0:rr(170,200),f1:110,dur:0.13,va:'uh',vb:'aa',fry:0.5,noise:0.6,nf:1000,dist:5,v:0.26,att:0.01,delay:i*0.16});}
      burstN(out,0.45,2600,'bandpass',0.16,2,0.55);return;}
    if(T==='charger'){voice(out,{f0:120,fm:135,f1:58,dur:1.3,va:'aa',vb:'uh',fry:0.6,frate:22,noise:0.75,nf:800,dist:9,v:0.44,fs:0.8});thud(out,90,35,0.6,0.35);return;}
    if(T==='spitter'){voice(out,{f0:210,f1:150,dur:0.35,va:'ee',vb:'oo',fry:0.9,frate:12,noise:0.55,nf:1800,dist:3,v:0.28,fs:1.2});burstN(out,0.22,1500,'bandpass',0.4,1,0.28);thud(out,260,90,0.1,0.22,0.28);return;}
    if(T==='witch'){voice(out,{f0:620,fm:1050,f1:820,dur:1.6,va:'aa',vb:'ee',vib:0.05,vibr:7,fry:0.15,noise:0.45,nf:3000,dist:4,v:0.3,att:0.08,fs:1.55,jit:0.04,body:0.1});return;}
    return;}
  /* idle */
  switch(T){
    case'walk':voice(out,{f0:rr(88,120),f1:rr(62,75),dur:rr(1,1.6),va:'oo',vb:Math.random()<0.5?'aa':'uh',fry:0.5,frate:rr(22,32),noise:0.28,dist:3,v:0.3});break;
    case'run':for(let i=0;i<2;i++)voice(out,{f0:rr(170,210),f1:140,dur:0.28,va:'aa',vb:'uh',fry:0.45,frate:38,noise:0.7,nf:1800,dist:5,v:0.26,delay:i*0.34});break;
    case'fat':voice(out,{f0:rr(68,80),f1:55,dur:1.3,va:'oo',vb:'uh',fry:0.95,frate:rr(7,10),noise:0.3,nf:600,dist:2,v:0.34,fs:0.8,body:0.6});break;
    case'brute':voice(out,{f0:rr(52,60),f1:44,dur:1.7,va:'uh',vb:'oo',fry:0.7,frate:20,noise:0.35,nf:600,dist:8,v:0.42,fs:0.72,body:0.6});break;
    case'hunter':burstN(out,0.9,3200,'bandpass',0.22,1.2);voice(out,{f0:rr(78,92),f1:70,dur:0.9,va:'ee',vb:'eh',fry:0.6,frate:30,noise:0.8,nf:3000,dist:4,v:0.2,fs:1.1});break;
    case'smoker':burstN(out,0.6,2400,'bandpass',0.12,2.5);voice(out,{f0:rr(150,175),f1:120,dur:0.16,va:'uh',vb:'aa',fry:0.5,noise:0.6,nf:1000,dist:5,v:0.24,att:0.01,delay:0.7});
      voice(out,{f0:rr(150,175),f1:115,dur:0.14,va:'uh',vb:'aa',fry:0.5,noise:0.6,nf:1000,dist:5,v:0.22,att:0.01,delay:0.9});break;
    case'charger':voice(out,{f0:rr(66,76),f1:58,dur:0.6,va:'uh',vb:'oo',fry:0.6,frate:18,noise:0.5,nf:500,dist:7,v:0.34,fs:0.8});burstN(out,0.25,500,'lowpass',0.3,1,0.55);break;
    case'jockey':for(let i=0;i<4;i++)voice(out,{f0:rr(360,430),f1:rr(300,340),dur:0.08,va:'eh',vb:'ee',fry:0.2,noise:0.45,nf:2200,dist:3,v:0.2,att:0.01,sus:0.5,fs:1.3,delay:i*0.12});break;
    case'spitter':voice(out,{f0:rr(190,220),f1:160,dur:0.9,va:'ee',vb:'uh',fry:0.9,frate:rr(10,14),noise:0.5,nf:2000,dist:3,v:0.24,fs:1.15});break;
    case'witch':{for(let i=0;i<2;i++){const d=i*0.75;burstN(out,0.28,2200,'bandpass',0.12,1.5,d);voice(out,{f0:rr(470,520),f1:rr(360,400),dur:0.38,va:'oo',vb:'uh',vib:0.04,vibr:6,fry:0.2,noise:0.4,nf:2600,dist:2,v:0.26,fs:1.5,jit:0.06,body:0.1,delay:d+0.3});}break;}
  }}
function zvFar(){if(!AC||muted||VC>6)return;const out=zOut(null,null,1,0.4);if(!out)return;
  voice(out,{f0:rr(80,110),f1:rr(55,70),dur:rr(1.6,2.4),va:'oo',vb:'aa',fry:0.55,frate:rr(20,30),noise:0.3,dist:3,v:0.3});
  if(Math.random()<0.5)voice(out,{f0:rr(95,130),f1:rr(60,80),dur:rr(1.3,2),va:'uh',vb:'oo',fry:0.5,frate:26,noise:0.3,dist:3,v:0.22,delay:rr(0.3,0.9)});}
/* ---- lobby music: procedural dark-arcade loop (D minor, 96 BPM) ---- */
const MUS={on:false,bus:null,dly:null,out:null,next:0,step:0,bars:0,mode:'lobby',sd:60/96/4,int:0};
const mtf=m=>440*Math.pow(2,(m-69)/12);
const CH=[[38,[62,65,69]],[34,[62,65,70]],[31,[62,67,70]],[33,[61,64,69]]];// root, triad (Dm, Bb, Gm, A)
const SEQ_A=[0,0,1,1,2,2,3,3],SEQ_B=[0,1,2,3,0,1,2,3];
const MEL=[[[0,74,4],[4,77,4],[8,76,2],[10,74,2],[12,69,4]],[[0,70,6],[6,74,2],[8,77,4],[12,76,4]],[[0,74,4],[4,70,4],[8,67,4],[12,70,4]],[[0,73,6],[6,76,2],[8,73,4],[12,69,4]],
  [[0,74,4],[4,77,4],[8,81,4],[12,79,2],[14,77,2]],[[0,77,6],[6,74,2],[8,70,4],[12,74,4]],[[0,79,4],[4,77,4],[8,74,4],[12,70,4]],[[0,73,8],[8,76,4],[12,73,4]]];
function mBus(){if(MUS.bus)return;const g=AC.createGain();g.gain.value=0.0001;const mo=AC.createGain();mo.gain.value=musVol();mo.connect(AC.destination);g.connect(mo);MUS.out=mo;if(REV){const hp=AC.createBiquadFilter();hp.type='highpass';hp.frequency.value=320;hp.Q.value=0.7;const s=AC.createGain();s.gain.value=0.35;g.connect(hp);hp.connect(s);s.connect(REV);}
  const d=AC.createDelay(1);d.delayTime.value=60/96*0.75;const fb=AC.createGain();fb.gain.value=0.38;const dl=AC.createBiquadFilter();dl.type='lowpass';dl.frequency.value=2200;
  d.connect(dl).connect(fb).connect(d);const dw=AC.createGain();dw.gain.value=0.5;dl.connect(dw).connect(g);MUS.bus=g;MUS.dly=d;}
function mNote(t,f,dur,type,v,o){o=o||{};const os=AC.createOscillator();os.type=type;os.frequency.setValueAtTime(f,t);if(o.det)os.detune.value=o.det;if(o.glide)os.frequency.exponentialRampToValueAtTime(o.glide,t+dur);
  const g=AC.createGain(),a=o.a||0.005,r=o.r||dur;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(a+0.01,r));
  let n=os;if(o.dist){const sh=AC.createWaveShaper();sh.curve=dcurve(o.dist);os.connect(sh);n=sh;}if(o.lp){const f2=AC.createBiquadFilter();f2.type='lowpass';f2.frequency.setValueAtTime(o.lp,t);if(o.lpEnd)f2.frequency.exponentialRampToValueAtTime(o.lpEnd,t+dur);f2.Q.value=o.q||1;n.connect(f2);n=f2;}
  n.connect(g);g.connect(MUS.bus);if(o.send)g.connect(MUS.dly);os.start(t);os.stop(t+Math.max(a+0.01,r)+0.05);}
function mNoise(t,dur,f,type,v,q){const s=AC.createBufferSource();s.buffer=NB;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||1;const g=AC.createGain();
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(fl).connect(g).connect(MUS.bus);s.start(t,Math.random()*0.5);s.stop(t+dur+0.05);}
function mStep(i,t){const sd=60/96/4,bar=(i>>4)%16,st=i&15,secB=bar>=8,ci=secB?SEQ_B[bar-8]:SEQ_A[bar],[root,tri]=CH[ci],total=MUS.bars,drums=total>=4;
  if(st===0){MUS.bars++;const len=sd*16*(secB?1:2);
    if(secB||bar%2===0)for(const m of tri)for(const dt of[-8,8])mNote(t,mtf(m-12),len,'sawtooth',0.03,{det:dt,a:0.6,r:len+0.6,lp:500,lpEnd:1400,q:2});
    mNote(t,mtf(26),sd*16,'sine',0.06,{a:0.3,r:sd*16});
    if(bar===0&&total>15&&Math.random()<0.7)setTimeout(()=>{if(MUS.on&&typeof zvFar==='function')zvFar();},400);}
  if([0,3,6,8,10,11,14].includes(st)){const m=(st===6||st===14)?root+12:root;mNote(t,mtf(m),sd*1.6,'sawtooth',0.1,{lp:300+(st===0?500:200),lpEnd:120,q:4,r:sd*1.8});}
  if(drums){if(st===0||st===10||(st===7&&bar%2===1)){mNote(t,150,0.28,'sine',0.4,{glide:40,r:0.3});mNoise(t,0.02,1800,'bandpass',0.12,1);}
    if(st===8){mNoise(t,0.18,1700,'bandpass',0.32,0.9);mNote(t,190,0.08,'triangle',0.12,{glide:120});}
    if(st%2===0)mNoise(t,st===14?0.16:0.035,8000,'highpass',st===14?0.07:0.05,1);
    if(st===15&&bar%4===3){mNoise(t,0.12,1500,'bandpass',0.18,1);mNoise(t+sd*0.5,0.12,1300,'bandpass',0.2,1);}}
  if(total>=8&&st%2===0&&!(secB&&st>=8&&bar%2===1)){const seq=[0,1,2,1,0,1,2,1],m=tri[seq[(st>>1)%8]%3]+((st>>1)%8===2?12:0);mNote(t,mtf(m+12),sd*0.9,'square',0.032,{lp:2600,r:sd*0.9,send:true});}
  if(secB){for(const[s0,m,l]of MEL[bar-8])if(s0===st){mNote(t,mtf(m),sd*l,'triangle',0.11,{a:0.005,r:sd*l*1.6,send:true});mNote(t,mtf(m+12),sd*l*0.5,'sine',0.02,{r:sd*l,send:true});}}}
/* ---- in-game music: battle (dynamic), calm (between waves), boss ---- */
const BCH=[[40,[52,59,64]],[40,[52,59,64]],[36,[48,55,60]],[38,[50,57,62]],[40,[52,59,64]],[40,[52,59,64]],[36,[48,55,60]],[35,[47,54,59]]];
const BPAT=[1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,1];
function mStepBattle(i,t){const sd=MUS.sd,st=i&15,bar=(i>>4)%8,[root,ch]=BCH[bar],I=MUS.int,intro=MUS.bars<1;
  if(st===0){MUS.bars++;if(bar===0&&!intro)mNoise(t,0.9,6000,'highpass',0.07,0.7);
    for(const m of ch)mNote(t,mtf(m),sd*16,'sawtooth',0.009+0.006*I,{det:(m%2?9:-9),a:0.3,r:sd*16,lp:900+900*I,q:1});}
  if(BPAT[st]){const up=st===6||st===14;mNote(t,mtf(root+(up?12:0)),sd*0.8,'sawtooth',0.09,{lp:up?1400:950,lpEnd:180,q:3,r:sd*0.85,dist:2.5});}
  if(intro)return;
  if(st===0||st===3||st===8||st===11||(I>0.6&&st===14)){mNote(t,160,0.22,'sine',0.42,{glide:42,r:0.24});mNoise(t,0.02,2000,'bandpass',0.12,1);}
  if(st===4||st===12){mNoise(t,0.16,1800,'bandpass',0.3,0.9);mNote(t,210,0.07,'triangle',0.12,{glide:130});}
  if(st%2===0)mNoise(t,0.03,8500,'highpass',0.045,1);else if(I>0.45)mNoise(t,0.02,9500,'highpass',0.022,1);
  if(I>0.62&&(st===0||st===6||st===12)){for(const iv of[12,19,24])mNote(t,mtf(root+iv),sd*1.6,'sawtooth',0.028,{lp:2600,lpEnd:900,r:sd*1.8,dist:6});}
  if(I>0.33){const seq=[0,1,2,1],m=ch[seq[st%4]]+12+(st%8===6?12:0);mNote(t,mtf(m),sd*0.85,'square',0.016+0.016*I,{lp:3200,r:sd*0.85,send:true});}
  if(st===15&&bar%4===3){mNoise(t,0.08,1500,'bandpass',0.2,1);mNoise(t+sd*0.5,0.08,1200,'bandpass',0.22,1);}}
function mStepCalm(i,t){const sd=MUS.sd,st=i&15,bar=(i>>4)%4,root=bar<2?40:36,ch=bar<2?[52,55,59]:[48,52,55];
  if(st===0){MUS.bars++;if(bar%2===0)for(const m of ch)for(const dt of[-7,7])mNote(t,mtf(m),sd*32,'sawtooth',0.016,{det:dt,a:0.9,r:sd*32+0.5,lp:600,lpEnd:1100,q:1.5});}
  if(st%4===0)mNote(t,mtf(root),sd*3,'triangle',0.09,{r:sd*3.5});
  if(st===0||st===3)mNote(t,70,0.3,'sine',st===0?0.22:0.14,{glide:38,r:0.32});
  const bell={0:ch[2]+12,6:ch[1]+12,10:ch[0]+24,13:ch[2]+12}[st];if(bell&&!(bar%2===1&&st===13))mNote(t,mtf(bell),sd*4,'triangle',0.05,{r:sd*6,send:true});}
const BOS=[[40,[52,55,59]],[41,[53,57,60]],[40,[52,55,59]],[38,[50,53,57]]];
function mChoir(t,m,dur,v){for(const dt of[-11,11]){const os=AC.createOscillator();os.type='sawtooth';os.frequency.value=mtf(m);os.detune.value=dt;const g=AC.createGain();
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+0.35);g.gain.setValueAtTime(v,t+dur*0.7);g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.3);
  for(const[f,q,k]of[[720,6,1],[1150,8,0.6],[2500,10,0.15]]){const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q;const bg=AC.createGain();bg.gain.value=k*2;os.connect(bp).connect(bg).connect(g);}
  g.connect(MUS.bus);if(MUS.dly)g.connect(MUS.dly);os.start(t);os.stop(t+dur+0.4);}}
const BBP=[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],OST=[0,2,1,2];
function mBass(t,m,dur,v,a){mNote(t,mtf(m),dur,'sawtooth',v,{a:a||0.006,lp:560,lpEnd:240,q:0.9,r:dur});mNote(t,mtf(m-12),dur,'sine',v*1.1,{a:a||0.006,r:dur});}
function mStepBoss(i,t){const sd=MUS.sd,st=i&15,bar=(i>>4)%4,[root,ch]=BOS[bar],bi=bossInfo(),I=bi?0.4+0.6*(1-clamp(bi[0]/bi[1],0,1)):0.5;
  if(st===0){MUS.bars++;for(const m of ch)mChoir(t,m+12,sd*16,0.02);
    if(bar%2===0){mNote(t,115,0.55,'sine',0.2,{glide:72,r:0.55});mNoise(t,0.3,420,'lowpass',0.14,1);}
    if(bar===0)mNoise(t,1.1,5500,'highpass',0.07,0.7);
    for(const iv of[24,31])mNote(t,mtf(root+iv),sd*4,'sawtooth',0.018,{det:iv===24?-6:6,a:0.01,lp:2600,lpEnd:800,r:sd*4.5});}
  if(BBP[st]){const m=(bar===3&&st===14)?root+1:(st===14&&bar%2===1)?root+12:root;mBass(t,m,sd*(st===14?1.5:2.1),0.075,st%8===0?0.03:0.006);}
  if(st===0||st===8||(I>0.65&&st===11)){mNote(t,140,0.13,'sine',0.36,{glide:55,r:0.14});mNoise(t,0.015,2600,'bandpass',0.15,1);}
  if(st===4||st===12){mNoise(t,0.17,1800,'bandpass',0.3,0.9);mNote(t,230,0.06,'triangle',0.1,{glide:150});}
  if(st%2===0)mNoise(t,0.03,8800,'highpass',0.04,1);else if(I>0.7)mNoise(t,0.02,9800,'highpass',0.02,1);
  mNote(t,mtf(ch[OST[st%4]]+24),sd*0.8,'sawtooth',0.011+0.011*I,{lp:2300,r:sd*0.8,send:st%4===0});
  if(bar===3&&st>=12)mNote(t,210-(st-12)*30,0.15,'sine',0.2,{glide:90,r:0.16});}
const TRK={el:null,ok:false,v:0,was:false,unlocked:false};
function trkInit(){if(!window.KM_TRACK)return;try{if(!TRK.el){const a=new Audio();a.src=window.KM_TRACK;a.loop=true;a.preload='auto';a.volume=0;TRK.el=a;TRK.ok=true;a.addEventListener('error',()=>{TRK.ok=false;});
    if(AC){try{const src=AC.createMediaElementSource(a),g=AC.createGain();g.gain.value=0;src.connect(g);g.connect(AC.destination);TRK.g=g;a.volume=1;}catch(e){TRK.g=null;}}}
  if(!TRK.unlocked){TRK.unlocked=true;const a=TRK.el,p=a.play();if(p&&p.then)p.then(()=>{if(G.state!=='play'){a.pause();try{a.currentTime=0;}catch(e){}}}).catch(()=>{TRK.unlocked=false;});}}catch(e){TRK.ok=false;}}
function trkTick(dt){if(!TRK.ok||!TRK.el)return;const a=TRK.el;let tg=0;
  if(G.state==='play'&&!muted)tg=0.42*SET.mus/100*(G.breakT>0&&NET.mode!=='pvp'?0.6:1)*(G.paused&&NET.mode==='solo'?0.4:1);
  TRK.v+=(tg-TRK.v)*Math.min(1,dt*(tg>TRK.v?1.5:2.5));if(Math.abs(tg-TRK.v)<0.003)TRK.v=tg;if(TRK.g)TRK.g.gain.value=clamp(TRK.v,0,1);else a.volume=clamp(TRK.v,0,1);
  if(tg>0&&a.paused){if(!TRK.was){try{a.currentTime=0;}catch(e){}}TRK.was=true;const p=a.play();if(p&&p.catch)p.catch(()=>{});}
  if(tg===0&&TRK.v<0.004&&!a.paused){a.pause();TRK.was=false;}}
function musDesired(){if(G.state==='title'||G.state==='lobby'||G.state==='showroom')return'lobby';
  if(G.state==='play'&&TRK.ok&&TRK.el)return null;
  if(G.state==='play'){if(NET.mode==='pvp')return'battle';if(bossInfo())return'boss';if(G.breakT>0)return'calm';return'battle';}return null;}
const MSD={lobby:60/96/4,battle:60/132/4,calm:60/132/4,boss:60/140/4},MGAIN={lobby:0.8,battle:0.6,calm:0.55,boss:0.7};
function musVol(){return muted?0:0.32*SET.mus/100;}
function applyVolumes(){if(master)master.gain.value=muted?0:SFXK*SET.sfx/100;if(MUS.out)MUS.out.gain.value=musVol();}
function musicTick(){if(!AC)return;const now=AC.currentTime,want=(muted||SET.mus<=0)?null:musDesired();
  let I=0;if(G.state==='play'){if(NET.mode==='pvp')I=0.65;else{let c=0;for(const z of zs){if(z.dead||z.idle)continue;const d=Math.hypot(z.x-pl.x,z.y-pl.y);if(d<10)c+=SPECIALS.includes(z.type)?2:(z.type==='brute'||z.raged)?3:1;}I=Math.min(1,c/9);if(pl.hp<35||pl.down)I=Math.min(1,I+0.25);}}
  MUS.int=(MUS.int||0)+(I-(MUS.int||0))*0.02;
  if(want&&!MUS.on){mBus();MUS.on=true;MUS.mode=want;MUS.sd=MSD[want];MUS.step=0;MUS.bars=0;MUS.next=now+0.1;MUS.bus.gain.cancelScheduledValues(now);MUS.bus.gain.setTargetAtTime(MGAIN[want],now,0.6);}
  else if(!want&&MUS.on){MUS.on=false;MUS.bus.gain.cancelScheduledValues(now);MUS.bus.gain.setTargetAtTime(0.0001,now,0.35);}
  if(!MUS.on)return;if(MUS.next<now-0.1)MUS.next=now+0.05;
  while(MUS.next<now+0.25){if(MUS.step%16===0&&want!==MUS.mode){const fr=MUS.mode;MUS.mode=want;MUS.sd=MSD[want];MUS.step=0;MUS.bars=(fr==='calm'||fr==='battle'||fr==='boss')&&want!=='lobby'?1:0;
      MUS.bus.gain.cancelScheduledValues(MUS.next);MUS.bus.gain.setTargetAtTime(MGAIN[want],MUS.next,0.5);}
    const m=MUS.mode;if(m==='lobby')mStep(MUS.step,MUS.next);else if(m==='battle')mStepBattle(MUS.step,MUS.next);else if(m==='calm')mStepCalm(MUS.step,MUS.next);else mStepBoss(MUS.step,MUS.next);
    MUS.next+=MUS.sd;MUS.step++;}}
function zHurtS(z){if(z.dead||G.t-(z.hS||-9)<0.7)return;z.hS=G.t;zv(z.type,'hurt',z.x,z.y);}
function vol(x,y,range=14){return Math.max(0,1-Math.hypot(x-pl.x,y-pl.y)/range);}
function setMuted(m){muted=m;applyVolumes();document.getElementById('btnSound').textContent=m?'SUARA: OFF':'SUARA: ON';}

/* ================= game data ================= */
const WEAP={
  pistol:{name:'PISTOL',rate:0.26,dmg:1.25,spread:0.012,pellets:1,kick:0.6,knock:0.6,climb:1.5},
  mg:{name:'SENAPAN MESIN',rate:0.075,dmg:1,spread:0.035,pellets:1,kick:0.35,knock:0.45,climb:0.7},
  sg:{name:'SHOTGUN',rate:0.7,dmg:1,spread:0.11,pellets:8,kick:1.3,knock:1.6,climb:5},
  rl:{name:'PELUNCUR ROKET',rate:0.85,dmg:12,spread:0,pellets:0,kick:1.4,knock:0,climb:4},
  awp:{name:'AWP',rate:1.35,dmg:15,spread:0.09,pellets:1,kick:2,knock:2.5,climb:7,pierce:3},
  parang:{name:'PARANG',rate:0.42,dmg:7,spread:0,pellets:0,kick:0,knock:2.6,climb:0,melee:true},
  kriss:{name:'KRISS',rate:0.065,dmg:0.85,spread:0.03,pellets:1,kick:0.25,knock:0.35,climb:0.55},
};
const ORDER=['pistol','mg','sg','rl','awp','parang','kriss'],ZTYPES=['walk','run','fat','brute','hunter','smoker','charger','jockey','spitter','witch','boss'],PKIND=['mg','sg','rl','nade','med','awp','molo','kriss'];
const ZNAME={walk:'ZOMBI',run:'TENTARA',fat:'GENDUT',brute:'RAKSASA',hunter:'PEMBURU',smoker:'LIDAH',charger:'PENYERUDUK',jockey:'PENUNGGANG',spitter:'PELUDAH',witch:'KUNTILANAK',boss:'RAJA ZOMBI'};
const SPECIALS=['hunter','smoker','charger','jockey','spitter'],SPEC_WAVE=[2,3,4,2,3];
const MAG={pistol:12,mg:45,sg:7,rl:6,awp:6,parang:1,kriss:45},RLD={pistol:1.0,mg:1.8,sg:1.6,rl:1.8,awp:2.6,parang:0.1,kriss:1.5};
const MAXR={mg:1200,sg:130,awp:120,rl:12,kriss:1400},MAXNADE=10,MAXMOLO=6,MAXDUAL=2,DUALMAG=60;
const PVPM=12;
const ZT={
  walk:{hp:3,sp:1.05,r:0.24,hitR:0.27,dmg:9,rate:0.9,pts:100,scale:1,mass:1,drop:0.09},
  run:{hp:2.4,sp:2.2,r:0.22,hitR:0.26,dmg:7,rate:0.7,pts:150,scale:1,mass:0.8,drop:0.08},
  fat:{hp:12,sp:0.75,r:0.34,hitR:0.4,dmg:14,rate:1.2,pts:300,scale:1.05,mass:3,drop:0.4},
  brute:{hp:45,sp:1.05,r:0.45,hitR:0.55,dmg:24,rate:1.3,pts:1500,scale:1.45,mass:8,drop:1},
  hunter:{hp:6,sp:1.9,r:0.22,hitR:0.26,dmg:6,rate:0.5,pts:250,scale:0.95,mass:0.9,drop:0.15},
  smoker:{hp:5,sp:0.9,r:0.24,hitR:0.27,dmg:4,rate:0.6,pts:250,scale:1.08,mass:1,drop:0.15},
  charger:{hp:16,sp:1.1,r:0.32,hitR:0.38,dmg:18,rate:1.0,pts:350,scale:1.12,mass:4,drop:0.3},
  jockey:{hp:4,sp:2.5,r:0.18,hitR:0.22,dmg:3,rate:0.5,pts:250,scale:0.72,mass:0.6,drop:0.12},
  spitter:{hp:5,sp:1.0,r:0.22,hitR:0.26,dmg:6,rate:0.9,pts:250,scale:1.02,mass:1,drop:0.15},
  witch:{hp:90,sp:4.2,r:0.24,hitR:0.27,dmg:14,rate:1.0,pts:1500,scale:1.0,mass:6,drop:0.7},
  boss:{hp:260,sp:1.15,r:0.55,hitR:0.66,dmg:28,rate:1.4,pts:6000,scale:1.9,mass:25,drop:1},
};
const PAL_BLOOD=['#b0211c','#7a1212','#d8322a'].map(hex),PAL_GOO=['#9be05a','#5a9a2a','#c6ff6a'].map(hex),
  PAL_SPARK=['#ffe27a','#fff6d0','#ff9a1f'].map(hex),PAL_DUST=['#9b8a78','#7a6a5a','#5e5248'].map(hex),
  PAL_FIRE=['#ffe27a','#ff9a1f','#e0401a'].map(hex),PAL_SMOKE=['#6e6470','#4d4651'].map(hex);

const G={state:'title',t:0,wave:0,toSpawn:0,boss:0,remain:0,spawnT:0,breakT:0,shake:0,hurt:0,goo:0,hitMark:0,combo:0,comboT:0,banners:[],pops:[],overT:0,
  best:0,fireHeld:false,locked:false,paused:false,needClick:false,turnId:null,turnX:0,turnY:0,swapT:0,flowT:0,groanCD:0,kills:0,nadeCD:0,allDeadT:0,tags:[],mapIdx:0,pings:new Map(),hs:0,shots:0,hits:0,revs:0,revT:0,revTarget:null,revNear:null,useHeld:false,shopOpen:false,night:false,touchCrouch:false,zl:0,seen:new Set(),mx:192,my:108,min:false,nick:'',skin:0,showSkin:0,stk:new Map(),feed:[],stkCD:0,stkOpen:false};
const pl={x:12.5,y:12.5,a:-Math.PI/2,pitch:0,r:0.22,hp:100,maxhp:100,wpn:'pistol',mag:{pistol:12,mg:0,sg:0,rl:0,awp:0,parang:1,kriss:0},ammo:{pistol:Infinity,mg:0,sg:0,rl:0,awp:0,parang:Infinity,kriss:0},dual:0,dualOn:false,dualMag:0,dualSide:0,
  nades:6,score:0,cool:0,kick:0,muzzle:0,bobT:0,bobAmt:0,sway:0,mass:1,reload:0,reloadMax:1,autoRl:0,autoSwap:0,
  alive:true,spectator:false,fireSeq:0,down:false,cash:0,armor:0,dmgLv:0,dmgMul:1,molos:2,swingT:0,swingQ:false,meleeCD:0,fireTick:0,deaths:0,killedBy:null,spawnProt:0,respawnT:0,z:0,vz:0,cr:0,rec:0};
let zs=[],parts=[],projs=[],booms=[],picks=[],shells=[];
try{G.best=parseInt(localStorage.getItem('kotamati-best')||'0',10)||0;}catch(e){}
const keys={};const stick={x:0,y:0,id:null};

/* ================= network state ================= */
const NET={mode:'solo',r:null,code:'',nick:'',me:null,host:true,hostPeer:null,remotes:new Map(),seen:new Map(),ev:[],seq:0,sendT:0,
  gp:'lobby',mid:0,lastHost:null,fp:[],pv:{ph:'count',tl:300,ct:3},pvTaken:{},zid:1,pid:1,hidden:new Map(),spits:[],prevWave:0,prevBreak:0,joining:false,forfeit:false};
const r2=v=>Math.round(v*100)/100;
const num=(v,d=0)=>(typeof v==='number'&&Number.isFinite(v))?v:d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function cleanNick(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9 _-]/g,'').trim().slice(0,10)||'PEMAIN';}
function online(){return NET.mode!=='solo'&&!!NET.r;}
function pushEv(arr){if(!online())return;NET.ev.push([++NET.seq].concat(arr));if(NET.ev.length>24)NET.ev.splice(0,NET.ev.length-24);}

/* ================= helpers ================= */
function banner(text,kind='big',dur=2){G.banners=G.banners.filter(b=>b.kind!==kind);G.banners.push({text,kind,t:0,dur});}
function pop(text,col='#fff6e0'){G.pops.push({text,col,t:0});if(G.pops.length>4)G.pops.shift();}
function hint(t){if(G.hintT>0&&G.hintTxt===t)return;G.hintTxt=t;G.hintT=1.2;banner(t,'sub',1.3);}
function addScore(n){pl.score+=n;pl.cash+=n;}
function angDiff(a,b){let d=a-b;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d;}
function nearCell(x,y,dmin,dmax){for(let i=0;i<80;i++){const c=openCells[(R()*openCells.length)|0],cx=c[0]+0.5,cy=c[1]+0.5,d=Math.hypot(cx-x,cy-y);if(d>=dmin&&d<=dmax)return[cx,cy];}return null;}
function burst(x,y,z,n,pal,sp,dx,dy,up){n=Math.max(1,Math.round(n*PQ));for(let i=0;i<n;i++){const a=Math.atan2(dy,dx)+(R()-0.5)*(dx||dy?2.2:6.28),s=sp*(0.3+R());
  parts.push({k:'b',x,y,z,vx:Math.cos(a)*s,vy:Math.sin(a)*s,vz:(up?1.5:0.6)+R()*2.4,g:9,life:0.5+R()*0.7,col:pal[i%pal.length],s:0.025+R()*0.035});}
  const cap=Math.round(600*(0.4+0.6*PQ));if(parts.length>cap)parts.splice(0,parts.length-cap);}
function gibs(x,y,n){for(let i=0;i<n;i++){const a=R()*6.28,s=1+R()*2.5;parts.push({k:'g',spr:GIBS[(R()*GIBS.length)|0],x,y,z:0.35,vx:Math.cos(a)*s,vy:Math.sin(a)*s,vz:2+R()*3,g:9,life:1.4+R(),bounce:true});}}
function moveEnt(e,dx,dy){const r=Math.min(0.3,e.r);if(!solidBox(e.x+dx,e.y,r))e.x+=dx;if(!solidBox(e.x,e.y+dy,r))e.y+=dy;}
function solidBox(x,y,r){return solid(x-r,y-r)||solid(x+r,y-r)||solid(x-r,y+r)||solid(x+r,y+r);}
function zById(id){for(const z of zs)if(z.id===id)return z;return null;}

/* ================= players list (host sim) ================= */
function livePlayers(){const a=[];if(G.state==='play'&&pl.alive&&!pl.spectator)a.push({x:pl.x,y:pl.y,z:pl.z,me:true,peer:NET.me,dn:pl.down});
  if(NET.mode==='coop')for(const r of NET.remotes.values())if(r.al)a.push({x:r.x,y:r.y,z:r.jz||0,me:false,peer:r.peer,dn:!!r.dn});return a;}
function teamSize(){return NET.mode==='coop'?1+NET.remotes.size:1;}
function teamOrder(){const ids=[NET.me||'~'].concat([...NET.remotes.keys()]);ids.sort();return ids;}
function colorOf(peer){const i=teamOrder().indexOf(peer);return i<0?0:i%4;}

/* ================= loadout / reload ================= */
function resetLoadout(){pl.wpn='pistol';pl.mag={pistol:12,mg:0,sg:0,rl:0,awp:0,parang:1,kriss:0};pl.ammo={pistol:Infinity,mg:0,sg:0,rl:0,awp:0,parang:Infinity,kriss:0};pl.dual=0;pl.dualOn=false;pl.dualMag=0;pl.hasK=false;pl.nades=NET.mode==='pvp'?3:6;pl.molos=NET.mode==='pvp'?1:2;
  pl.reload=0;pl.cool=0.3;pl.autoRl=0;pl.autoSwap=0;}
function give(w,n){const had=hasAmmo(w);if(w==='kriss')pl.hasK=true;pl.ammo[w]=Math.min(MAXR[w]||Infinity,pl.ammo[w]+n);if(pl.mag[w]===0){const t=Math.min(MAG[w],pl.ammo[w]);pl.mag[w]+=t;pl.ammo[w]-=t;}if(!had)setWpn(w);return had;}
function ammoFull(w){return(MAXR[w]!=null)&&hasAmmo(w)&&pl.ammo[w]>=MAXR[w];}
function setWpn(w){if(pl.down&&w!=='pistol')return;if(pl.wpn!==w){pl.wpn=w;G.swapT=0.25;G.zl=0;pl.reload=0;pl.cool=Math.max(pl.cool,0.15);}}
function hasAmmo(w){return pl.mag[w]+pl.ammo[w]>0||(w==='kriss'&&pl.hasK&&(pl.dualOn||pl.dual>0));}
function cycleWeapon(dir){let i=ORDER.indexOf(pl.wpn);for(let n=0;n<ORDER.length;n++){i=(i+dir+ORDER.length)%ORDER.length;if(hasAmmo(ORDER[i])){setWpn(ORDER[i]);return;}}}
function startReload(){const w=pl.wpn;if((w==='kriss'&&pl.dualOn)||pl.reload>0||G.swapT>0||pl.mag[w]>=MAG[w]||pl.ammo[w]<=0||!pl.alive||G.state!=='play')return;pl.reload=pl.reloadMax=RLD[w];G.zl=0;S.rlOut();}
function finishReload(){const w=pl.wpn,need=MAG[w]-pl.mag[w],take=Math.min(need,pl.ammo[w]);pl.mag[w]+=take;if(pl.ammo[w]!==Infinity)pl.ammo[w]-=take;S.rlIn();}
function eyeZ(){return pl.down?0.2:0.5+pl.z-0.2*pl.cr;}
function canAct(){return G.state==='play'&&pl.alive&&!pl.spectator&&!G.paused&&!(NET.mode==='pvp'&&NET.pv.ph!=='live');}

/* ================= zombies (host / solo) ================= */
function makeZ(type,x,y){const t=ZT[type],hs=1+Math.max(0,G.wave-1)*0.07;
  return{id:NET.zid++,type,fr:FR[type],x,y,tx:x,ty:y,hp:t.hp*hs,sp:t.sp*(1+Math.min(0.35,G.wave*0.03))*(0.9+R()*0.2),r:t.r,hitR:t.hitR,dmg:t.dmg,rate:t.rate,pts:t.pts,
    scale:t.scale,mass:t.mass,drop:t.drop,anim:R()*4,flash:0,atkCD:0.6,kx:0,ky:0,losT:0,see:false,spitCD:2+R()*2,groanT:2+R()*6,
    dead:false,dieT:0,rise:0.7,mir:R()<0.5,fa:R()*Math.PI*2,state:'walk',idle:false,hpMax:t.hp*hs,lastHit:-9};}
function setupAttract(){zs=[];pl.x=MAP.start[0];pl.y=MAP.start[1];pl.pitch=0;pl.z=0;pl.vz=0;pl.cr=0;
  for(const t of['walk','fat','run','walk','run']){const c=nearCell(pl.x,pl.y,1.8,4.5);if(!c)continue;const z=makeZ(t,c[0]+(R()-0.5)*0.3,c[1]+(R()-0.5)*0.3);z.idle=true;z.rise=0;zs.push(z);}}
function placeStart(){pl.x=MAP.start[0];pl.y=MAP.start[1];let ba=-Math.PI/2,bd=-1;for(let k=0;k<8;k++){const a=k*Math.PI/4,d=castT(pl.x,pl.y,Math.cos(a),Math.sin(a));if(d>bd){bd=d;ba=a;}}
  pl.a=ba;const fx=pl.x+Math.cos(ba)*3,fy=pl.y+Math.sin(ba)*3;const p=(bd<3.5||solid(fx,fy))?nearCell(pl.x,pl.y,2,4):[fx,fy];if(p)picks.push({id:NET.pid++,kind:'mg',x:p[0],y:p[1],ph:0});}
function startWave(n,sim){
  G.wave=n;banner('GELOMBANG '+n,'big',2.2);S.wave();
  if(sim){const np=teamSize();G.toSpawn=Math.round((5+n*3)*(1+0.5*(np-1)));G.boss=n%5===0?1:0;G.spawnT=2;G.breakT=0;
    zs=zs.filter(z=>!(z.type==='witch'&&!z.raged&&!z.dead));
    if(n>=4&&R()<0.45){const[x,y]=spawnPos(livePlayers());const z=makeZ('witch',x,y);z.rise=0;z.act=6;zs.push(z);announce('witch');}}
  if(n%5===0)banner('AWAS! RAJA ZOMBI!','sub',2.6);
  if(NET.mode==='coop'&&!pl.alive)respawnCoop();
  if(pl.down){pl.down=false;pl.hp=Math.max(pl.hp,30);banner('KAMU BANGKIT!','sub',1.6);}
}
function waveClear(sim){G.shopBuys={};const bonus=G.wave*500;if(pl.alive){addScore(bonus);pl.hp=Math.min(pl.maxhp,pl.hp+20);}
  banner('GELOMBANG BERSIH!','big',2.6);banner('BONUS +'+bonus,'sub',2.6);S.wave();
  if(sim){G.breakT=14;const pls=livePlayers();const kinds=['mg','sg','rl','awp','kriss','nade','med','molo'];
    for(let i=0;i<1+Math.min(3,pls.length);i++){const p=pls[i%Math.max(1,pls.length)]||{x:12.5,y:12.5};const c=nearCell(p.x,p.y,1.5,4);if(c)picks.push({id:NET.pid++,kind:kinds[(R()*kinds.length)|0],x:c[0],y:c[1],ph:R()*6});}}}
function spawnPos(pls){let fb=null;for(let i=0;i<60;i++){const c=openCells[(R()*openCells.length)|0],x=c[0]+0.5,y=c[1]+0.5;
  let ok=true;for(const p of pls){if(Math.hypot(x-p.x,y-p.y)<7){ok=false;break;}}
  if(!ok)continue;fb=[x,y];if(i<40&&pl.alive&&Math.abs(angDiff(Math.atan2(y-pl.y,x-pl.x),pl.a))<0.9&&los(pl.x,pl.y,x,y))continue;return[x,y];}
  return fb||[1.5,1.5];}
function spawnOne(pls){let type;if(G.boss){type='boss';G.boss=0;}else{const w=G.wave;let spec=0;for(const z of zs)if(!z.dead&&SPECIALS.includes(z.type))spec++;
    const pool=SPECIALS.filter((t,i)=>w>=SPEC_WAVE[i]);
    if(pool.length&&R()<Math.min(0.45,0.22+w*0.03)&&spec<2+Math.floor(w/3))type=pool[(R()*pool.length)|0];
    else if(w>=6&&R()<0.04&&!zs.some(o=>o.type==='brute'&&!o.dead))type='brute';
    else{const q=R();type=(w>=3&&q<0.16)?'fat':(w>=2&&q<0.48)?'run':'walk';}G.toSpawn--;}
  const[x,y]=spawnPos(pls);const z=makeZ(type,x,y);zs.push(z);burst(x,y,0.02,10,PAL_DUST,1.4,0,0,true);announce(type);
  if(type==='boss'){const np=teamSize();z.hp*=1+0.6*(np-1);z.hpMax=z.hp;z.cd=3;z.cd2=4;G.shake=Math.max(G.shake,0.6);zv('boss','alert',x,y);}}
function announce(type){if(type==='boss'){banner('RAJA ZOMBI DATANG!','combo',2.4);G.shake=Math.max(G.shake,0.5);return;}if(G.seen.has(type)||type==='walk'||type==='run')return;G.seen.add(type);banner(ZNAME[type]+' MUNCUL!','sub',2.4);}
function hurtZ(z,dmg,kx,ky,by){if(z.dead||z.idle)return false;z.rise=0;z.lastHit=G.t;if(z.type==='witch'&&!z.raged)witchRage(z);if(z.type==='smoker'&&(z.act===4||z.act===9)){release(z);z.cd=4;z.stun=0.6;}if(z.type==='hunter'&&z.act===1){z.act=0;z.stun=0.3;}z.hp-=dmg;z.flash=0.07;z.kx+=kx/z.mass;z.ky+=ky/z.mass;if(z.hp<=0){killZ(z,kx,ky,by);return true;}zHurtS(z);return false;}
function localKill(pts){addScore(pts);pop('+'+pts);G.kills++;if(pts>=6000)G.bossK=(G.bossK||0)+1;
  if(G.comboT>0)G.combo++;else G.combo=1;G.comboT=0.9;
  if(G.combo===3){banner('MANTAP!','combo',1.1);addScore(200);}else if(G.combo===5){banner('GILA!','combo',1.1);addScore(500);}
  else if(G.combo===8){banner('BRUTAL!','combo',1.3);addScore(1000);}else if(G.combo>8&&G.combo%4===0){banner('BRUTAL!!','combo',1.3);addScore(1000);}}
function deathFx(z,dx,dy){const goo=z.type==='fat';burst(z.x,z.y,0.4*z.scale,goo?26:16,goo?PAL_GOO:PAL_BLOOD,goo?3.2:2.2,dx,dy);
  gibs(z.x,z.y,goo?5:(z.type==='boss'?14:z.type==='brute'?8:2));S.splat(vol(z.x,z.y));zv(z.type,'die',z.x,z.y);if(z.type==='boss')banner('RAJA ZOMBI TUMBANG!','big',2.6);
  if(goo||z.type==='brute'||z.type==='boss'){booms.push({x:z.x,y:z.y,t:0,dur:0.55,size:z.type==='boss'?2.4:z.type==='brute'?1.6:1.05});S.boom(0.5*vol(z.x,z.y,12));
    G.shake=Math.max(G.shake,0.35*Math.max(0,1-Math.hypot(pl.x-z.x,pl.y-z.y)/8));}}
function killZ(z,dx,dy,by){release(z);z.dead=true;z.dieT=0;if(z.type==='fat'||z.type==='brute'||z.type==='boss')z.dieT=0.25;
  if(!by||by===NET.me)localKill(z.pts);else pushEv(['kl',by,z.pts]);
  deathFx(z,dx,dy);if(z.type==='spitter')pools.push({id:NET.pid++,x:z.x,y:z.y,t:3,r:0.9});
  if(z.type==='fat'){for(const p of livePlayers()){const d=Math.hypot(p.x-z.x,p.y-z.y);if(d<1.5){if(p.me){hurtPlayer(10);G.goo=Math.min(1,G.goo+0.7);}else{pushEv(['za',p.peer,10]);pushEv(['goo',p.peer]);}}}}
  if(z.type==='fat'||z.type==='brute')for(const o of zs){if(o===z||o.dead)continue;const dd=Math.hypot(o.x-z.x,o.y-z.y);if(dd<1.7)hurtZ(o,4,(o.x-z.x)/(dd||1)*3,(o.y-z.y)/(dd||1)*3,by);}
  let drop=z.drop;if(pl.hp<40)drop+=0.05;if(R()<drop)dropPick(z.x,z.y,z.type==='brute');
  if(z.type==='boss'){for(let i=0;i<3;i++)dropPick(z.x+(R()-0.5)*1.4,z.y+(R()-0.5)*1.4,true);if(NET.mode==='solo'&&R()<0.6)picks.push({id:NET.pid++,kind:'life',x:z.x,y:z.y+0.5,ph:0});}
  if(NET.mode==='solo'){const lc={brute:0.25,witch:0.2}[z.type]||(SPECIALS.includes(z.type)?0.03:0.012);if(R()<lc)picks.push({id:NET.pid++,kind:'life',x:z.x+0.25,y:z.y-0.25,ph:0});}}
function dropPick(x,y,big){const w=[['mg',3],['sg',3],['rl',big?3:1.4],['awp',big?2:1.2],['kriss',2.4],['nade',2],['molo',1.6],['med',pl.hp<50?4:2]];let s=0;for(const[,v]of w)s+=v;let r=R()*s,k='mg';
  for(const[n,v]of w){if((r-=v)<=0){k=n;break;}}picks.push({id:NET.pid++,kind:k,x,y,ph:R()*6});}

function hostZombieSim(dt){
  const pls=livePlayers();
  G.flowT-=dt;if(G.flowT<=0){G.flowT=0.3;buildFlow(pls.map(p=>[Math.floor(p.x),Math.floor(p.y)]));}
  let alive=0;for(const z of zs)if(!z.dead&&z.type!=='witch')alive++;
  const np=teamSize();
  if(G.breakT>0){G.breakT-=dt;if(G.breakT<=0)startWave(G.wave+1,true);}
  else{G.spawnT-=dt;const maxA=Math.min(32,10+G.wave*2+(np-1)*4);
    if(G.spawnT<=0&&(G.toSpawn>0||G.boss)&&alive<maxA&&pls.length){spawnOne(pls);G.spawnT=Math.max(0.3,(1.3-G.wave*0.06)/(1+(np-1)*0.3));}
    if(G.toSpawn===0&&!G.boss&&alive===0)waveClear(true);}
  G.remain=G.toSpawn+G.boss+alive;
  if(NET.mode==='coop'){if(!pls.some(p=>!p.dn)){G.allDeadT+=dt;if(G.allDeadT>1.5)coopEnd();}else G.allDeadT=0;}
  for(const z of zs){
    if(z.dead){z.dieT+=dt;if(z.dieT>9)z.gone=true;continue;}
    if(z.rise>0){z.rise-=dt;if(R()<dt*20)burst(z.x,z.y,0.02,1,PAL_DUST,1,0,0,true);continue;}
    z.flash-=dt;z.atkCD-=dt;
    if(Math.abs(z.kx)+Math.abs(z.ky)>0.01){moveEnt(z,z.kx*dt,z.ky*dt);const k=Math.pow(0.004,dt);z.kx*=k;z.ky*=k;}
    let tg=null,d=1e9;for(const p of pls){const dd=Math.hypot(p.x-z.x,p.y-z.y);if(dd<d){d=dd;tg=p;}}
    if(!tg){z.state='walk';continue;}
    z.losT-=dt;if(z.losT<=0){z.losT=0.22+R()*0.15;z.see=d<(z.type==='walk'||z.type==='run'||z.type==='fat'?8:11)&&los(z.x,z.y,tg.x,tg.y);if(z.see&&!z.alerted){z.alerted=true;if(R()<(z.type==='walk'?0.5:0.9)){zv(z.type,'alert',z.x,z.y);z.groanT=Math.max(z.groanT,2.5);}}}
    if(z.stun>0){z.stun-=dt;z.state='walk';continue;}
    if(specialAI(z,tg,d,dt,pls))continue;
    if(d<z.r+pl.r+0.2&&tg.z<0.3){z.state='attack';if(z.atkCD<=0){z.atkCD=z.rate;zv(z.type,'attack',z.x,z.y);if(tg.me)hurtPlayer(z.dmg);else pushEv(['za',tg.peer,z.dmg]);}}
    else{z.state='walk';const[tx,ty]=(z.see&&d<6)?[tg.x,tg.y]:flowTarget(z,tg);const ex=tx-z.x,ey=ty-z.y,el=Math.hypot(ex,ey)||1;
      const s=z.sp*(z.flash>0?0.3:1);moveEnt(z,ex/el*s*dt,ey/el*s*dt);z.anim+=dt*(2+z.sp*2);}
    if(z.type==='fat'&&z.see&&d<8&&d>1.6){z.spitCD-=dt;if(z.spitCD<=0){z.spitCD=2.4+R()*1.2;const dx=tg.x-z.x,dy=tg.y-z.y;
      projs.push({k:'spit',x:z.x,y:z.y,z:0.5,vx:dx/d*4.6,vy:dy/d*4.6,vz:0.4,t:3,own:true});zv('fat','attack',z.x,z.y);}}
  }
  for(let i=0;i<zs.length;i++){const a=zs[i];if(a.dead||a.rise>0||a.act===5)continue;
    for(let j=i+1;j<zs.length;j++){const b=zs[j];if(b.dead||b.rise>0||b.act===5)continue;const dx=b.x-a.x,dy=b.y-a.y,rr=a.r+b.r,d2=dx*dx+dy*dy;
      if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2),p=rr-d,nx=dx/d,ny=dy/d,wa=b.mass/(a.mass+b.mass);moveEnt(a,-nx*p*wa,-ny*p*wa);moveEnt(b,nx*p*(1-wa),ny*p*(1-wa));}}
    if(pl.alive){const dx=pl.x-a.x,dy=pl.y-a.y,d=Math.hypot(dx,dy),rr=a.r+pl.r;if(d<rr&&d>1e-4){const p=rr-d;moveEnt(pl,dx/d*p*0.6,dy/d*p*0.6);moveEnt(a,-dx/d*p*0.4,-dy/d*p*0.4);}}}
  for(const pool of pools){pool.t-=dt;pool.tick=(pool.tick||0)-dt;if(pool.tick<=0){pool.tick=0.5;for(const p of pls){if(p.z<0.2&&Math.hypot(p.x-pool.x,p.y-pool.y)<pool.r){if(p.me){hurtPlayer(5);G.goo=Math.min(1,G.goo+0.25);}else pushEv(['za',p.peer,5]);}}}}
  pools=pools.filter(q=>q.t>0);
  zs=zs.filter(z=>!z.gone);
}
let pools=[];
function plTarget(g){if(!g)return null;for(const q of livePlayers())if((g.me&&q.me)||(!g.me&&q.peer===g.peer))return q;return null;}
function setStatus(g,kind,z){if(g.me){if(kind==='none'){if(pl.st&&pl.st.zid===z.id)pl.st=null;}else pl.st={k:kind,zid:z.id,t:0,j:0,dt:0};}else pushEv(['st',g.peer,kind,z.id]);}
function release(z){if(z.grab){setStatus(z.grab,'none',z);z.grab=null;}z.act=0;z.zh=0;}
function zTick(z,p,dmg,dt){z.tick=(z.tick||0)-dt;if(z.tick<=0){z.tick=0.5;if(p.me)hurtPlayer(dmg);else pushEv(['za',p.peer,dmg]);}}
function knockMe(kx,ky){for(let i=0;i<6;i++)moveEnt(pl,kx/6,ky/6);G.shake=Math.max(G.shake,0.5);}
function witchRage(z){if(z.raged)return;z.act=7;z.raged=true;zv('witch','leap',z.x,z.y);banner('KUNTILANAK MENGAMUK!','combo',1.6);}
function specialAI(z,tg,d,dt,pls){
  const t=z.type;z.cd=(z.cd||0)-dt;if(t==='boss')return bossAI(z,tg,d,dt,pls);
  if(t==='witch'){if(z.raged){if(G.t-z.lastHit>3&&z.hp<z.hpMax)z.hp=Math.min(z.hpMax,z.hp+6*dt);return false;}z.act=6;z.state='walk';if(d<2.4){z.near=(z.near||0)+dt;if(z.near>1.1)witchRage(z);}else z.near=Math.max(0,(z.near||0)-dt*0.5);return true;}
  if(t==='hunter'||t==='jockey'){
    if(z.act===8||z.act===5){const p=plTarget(z.grab);if(!p){release(z);z.stun=1;return true;}
      if(z.act===8){const a=Math.atan2(z.y-p.y,z.x-p.x);z.x=p.x+Math.cos(a)*0.4;z.y=p.y+Math.sin(a)*0.4;z.zh=0;zTick(z,p,z.dmg,dt);}
      else{z.x=p.x;z.y=p.y;z.zh=0.42;zTick(z,p,z.dmg,dt);z.actT-=dt;if(z.actT<=0){release(z);z.stun=1.2;}}
      z.state='attack';return true;}
    if(z.act===1){z.actT-=dt;z.state='walk';if(z.actT<=0){const v=t==='hunter'?7.5:6;z.act=2;z.lvx=(tg.x-z.x)/d*v;z.lvy=(tg.y-z.y)/d*v;z.vz=t==='hunter'?3.2:2.6;z.zh=0.01;zv(t,'leap',z.x,z.y);}return true;}
    if(z.act===2){moveEnt(z,z.lvx*dt,z.lvy*dt);z.vz-=9*dt;z.zh=Math.max(0,z.zh+z.vz*dt);z.state='attack';
      for(const p of pls){if(Math.hypot(p.x-z.x,p.y-z.y)<0.55&&p.z<0.6){z.grab={me:!!p.me,peer:p.peer};z.zh=0;z.tick=0.3;
        if(t==='hunter'){z.act=8;setStatus(z.grab,'pin',z);}else{z.act=5;z.actT=5;setStatus(z.grab,'ride',z);}return true;}}
      if(z.zh<=0&&z.vz<0){z.act=0;z.zh=0;z.stun=0.4;}return true;}
    if(z.cd<=0&&z.see&&(t==='hunter'?(d>2&&d<8):(d>0.9&&d<3.6))){z.act=1;z.actT=t==='hunter'?0.6:0.3;z.cd=t==='hunter'?4:3.5;return true;}
    return false;}
  if(t==='smoker'){
    if(z.act===4||z.act===9){const p=plTarget(z.grab);if(!p){release(z);z.cd=4;return true;}const dd=Math.hypot(p.x-z.x,p.y-z.y)||0.01;
      if(!los(z.x,z.y,p.x,p.y)&&dd>1.2){release(z);z.cd=4;z.stun=0.8;return true;}z.state='attack';
      if(z.act===4){z.tl+=13*dt;const f=Math.min(z.tl,dd)/dd;z.ax=z.x+(p.x-z.x)*f;z.ay=z.y+(p.y-z.y)*f;if(z.tl>=dd){z.act=9;setStatus(z.grab,'pull',z);}else if(z.tl>10){z.act=0;z.grab=null;z.cd=3;}}
      else{z.ax=p.x;z.ay=p.y;zTick(z,p,dd<0.9?z.dmg+2:3,dt);}
      return true;}
    if(z.cd<=0&&z.see&&d>2.5&&d<9){z.act=4;z.tl=0;z.grab={me:!!tg.me,peer:tg.peer};z.cd=7;z.ax=z.x;z.ay=z.y;zv('smoker','leap',z.x,z.y);return true;}
    if(z.see&&d<6){z.state='walk';return true;}
    return false;}
  if(t==='charger'){
    if(z.act===3){z.actT-=dt;const step=7*dt,ox=z.x,oy=z.y;moveEnt(z,z.cvx*step,z.cvy*step);z.state='attack';z.anim+=dt*12;
      if(Math.hypot(z.x-ox,z.y-oy)<step*0.4){z.act=0;z.stun=1.4;z.cd=4;G.shake=Math.max(G.shake,0.3*vol(z.x,z.y,8));S.boom(0.25*vol(z.x,z.y));return true;}
      for(const p of pls){const key=p.me?'me':p.peer;if(z.hitSet.has(key))continue;if(Math.hypot(p.x-z.x,p.y-z.y)<0.65){z.hitSet.add(key);
        if(p.me){hurtPlayer(z.dmg);knockMe(z.cvx*2.4,z.cvy*2.4);}else{pushEv(['za',p.peer,z.dmg]);pushEv(['kb',p.peer,r2(z.cvx*2.4),r2(z.cvy*2.4)]);}}}
      if(z.actT<=0){z.act=0;z.cd=4;}return true;}
    if(z.cd<=0&&z.see&&d>3&&d<10){z.act=3;z.actT=1.6;z.cvx=(tg.x-z.x)/d;z.cvy=(tg.y-z.y)/d;z.hitSet=new Set();z.cd=5;zv('charger','leap',z.x,z.y);return true;}
    return false;}
  if(t==='spitter'){
    if(z.cd<=0&&z.see&&d>2&&d<9){z.cd=4.5;const T=1.1;projs.push({k:'acid',x:z.x,y:z.y,z:0.62,vx:(tg.x-z.x)/T,vy:(tg.y-z.y)/T,vz:(8*T*T/2-0.62)/T,t:3,own:true});zv('spitter','leap',z.x,z.y);z.atkShow=0.5;}
    if(z.atkShow>0){z.atkShow-=dt;z.state='attack';return true;}
    if(z.see&&d<5){z.state='walk';return true;}
    return false;}
  return false;}
function zFace(dt){if(dt<=0)return;const tg=[];if(pl.alive&&!pl.spectator)tg.push(pl);for(const r of NET.remotes.values())if(r.al)tg.push(r);
  for(const z of zs){const px=z.fpx,py=z.fpy;z.fpx=z.x;z.fpy=z.y;if(z.dead||z.idle||z.act===6)continue;
    let ta=null;const vx=px===undefined?0:(z.x-px)/dt,vy=py===undefined?0:(z.y-py)/dt;
    if(z.rise<=0&&!(z.flash>0)&&z.act!==8&&z.act!==9&&z.act!==4&&vx*vx+vy*vy>0.09)ta=Math.atan2(vy,vx);
    else{let b=1e9;for(const p of tg){const d=Math.hypot(p.x-z.x,p.y-z.y);if(d>0.05&&d<b){b=d;ta=Math.atan2(p.y-z.y,p.x-z.x);}}}
    if(ta===null)continue;if(z.rise>0){z.fa=ta;continue;}
    const df=Math.atan2(Math.sin(ta-z.fa),Math.cos(ta-z.fa)),m=(z.act===2||z.act===3?25:7)*dt;z.fa+=Math.max(-m,Math.min(m,df));}}
function clientZombieSim(dt){
  for(const z of zs){
    if(z.dead){z.dieT+=dt;if(z.dieT>9)z.gone=true;continue;}
    if(z.lost){z.gone=true;continue;}
    if(z.rise>0)z.rise-=dt;z.flash-=dt;
    const k=Math.min(1,dt*(z.act===3||z.act===2?18:10)),ex=(z.tx-z.x)*k,ey=(z.ty-z.y)*k;z.x+=ex;z.y+=ey;z.anim+=Math.hypot(ex,ey)*4.5;
    if(pl.alive&&!(pl.st&&pl.st.zid===z.id)){const dx=pl.x-z.x,dy=pl.y-z.y,d=Math.hypot(dx,dy),rr=z.r+pl.r;if(d<rr&&d>1e-4)moveEnt(pl,dx/d*(rr-d),dy/d*(rr-d));}
  }
  zs=zs.filter(z=>!z.gone);
}

/* ================= player damage, death, respawn ================= */
function hurtPlayer(d,src){
  if(G.state!=='play'||!pl.alive||pl.spectator||pl.spawnProt>0)return;
  if(pl.armor>0&&!pl.down){const a=Math.min(pl.armor,d*0.6);pl.armor-=a;d-=a;}
  pl.hp-=d;G.hurt=Math.min(1,G.hurt+0.55);G.shake=Math.max(G.shake,0.25);S.hurt();
  if(pl.hp>0)return;
  pl.hp=0;
  if(NET.mode==='solo'){if(pl.lives>1){soloRevive();return;}gameOver();return;}
  if(NET.mode==='coop'&&!pl.down&&teamUp()){pl.down=true;pl.hp=100;pl.st=null;pl.spawnProt=0.8;pl.reload=0;setWpn('pistol');G.fireHeld=false;G.downs=(G.downs||0)+1;
    banner('KAMU TERJATUH!','big',2.2);banner('BERTAHAN! TUNGGU TEMAN MENOLONG','sub',3);S.down();if(G.shopOpen)openShop(false);return;}
  pl.down=false;
  pl.alive=false;pl.st=null;pl.deaths++;pl.killedBy=src||null;G.fireHeld=false;pl.reload=0;
  burst(pl.x,pl.y,0.4,14,PAL_BLOOD,2,0,0);
  if(NET.mode==='pvp'){pl.respawnT=3;const r=src&&NET.remotes.get(src);banner(r?'DIHABISI '+r.nick:'KAMU TEWAS','big',2.5);}
  else{banner('KAMU TUMBANG!','big',2.5);banner('BANGKIT DI GELOMBANG BERIKUTNYA','sub',3);}
}
function respawnCoop(){let base=null;for(const r of NET.remotes.values())if(r.al){base=r;break;}
  const c=base?nearCell(base.x,base.y,1,3):null;const p=c||MAP.start;pl.x=p[0];pl.y=p[1];pl.hp=70;pl.alive=true;pl.spawnProt=1.5;banner('KAMU BANGKIT!','sub',1.6);}
function respawnPvp(){let opp=null;for(const r of NET.remotes.values())if(r.fighter){opp=r;break;}
  let best=[12.5,12.5],bd=-1;for(let i=0;i<30;i++){const c=openCells[(R()*openCells.length)|0],x=c[0]+0.5,y=c[1]+0.5,d=opp?Math.hypot(x-opp.x,y-opp.y):10;if(d>bd){bd=d;best=[x,y];}if(d>11)break;}
  pl.x=best[0];pl.y=best[1];pl.a=Math.atan2(12.5-pl.y,12.5-pl.x);pl.pitch=0;pl.hp=100;pl.alive=true;pl.spawnProt=1.5;resetLoadout();}
function soloRevive(){pl.lives--;pl.hp=pl.maxhp;pl.spawnProt=2.5;pl.st=null;G.hurt=0;
  for(const z of zs){if(z.dead)continue;if(z.grab&&z.grab.me)release(z);const dx=z.x-pl.x,dy=z.y-pl.y,d=Math.hypot(dx,dy);
    if(d<3.5){z.kx+=dx/(d||1)*6/z.mass;z.ky+=dy/(d||1)*6/z.mass;z.stun=Math.max(z.stun||0,1);}}
  burst(pl.x,pl.y,0.4,30,PAL_GOO,3,0,0,true);burst(pl.x,pl.y,0.6,16,PAL_SPARK,2.5,0,0,true);
  banner('NYAWA TERPAKAI!','big',2.2);banner('SISA NYAWA '+pl.lives,'sub',2.2);S.oneup();}
function gameOver(){G.state='over';G.overT=0;G.fireHeld=false;S.over();saveBest();exitLock();endMatch();}
function saveBest(){if(pl.score>G.best){G.best=pl.score;try{localStorage.setItem('kotamati-best',String(G.best));}catch(e){}}}
function exitLock(){try{if(document.pointerLockElement)document.exitPointerLock();}catch(e){}}
function coopEnd(){NET.gp='end';G.state='over';G.overT=0;G.fireHeld=false;S.over();saveBest();exitLock();endMatch();}

/* ================= shooting ================= */
function cursorAim(){return !G.locked&&!isTouch&&G.min&&G.state==='play'&&!G.paused&&!G.needClick&&ZK<1.3;}
function aimDir(){const pitch=pl.pitch+pl.rec;if(!cursorAim())return{a:pl.a,s:pitch/H};
  const off=Math.atan((2*(G.mx+0.5)/W-1)*PLANE/ZK),hz=Math.round(HH+pitch*ZK),sp=-(G.my+0.5-hz)/(ZK*H);return{a:pl.a+off,s:sp*Math.cos(off)};}
function fire(){if(!canAct()||G.shopOpen)return;const w=WEAP[pl.wpn];if(pl.cool>0||G.swapT>0||pl.reload>0||pl.swingT>0.1)return;if(w.melee){swing(false);return;}
  if(pl.wpn==='kriss'&&pl.dualOn){fireDual();return;}
  if(pl.mag[pl.wpn]<=0){if(pl.ammo[pl.wpn]>0)startReload();else if(pl.wpn==='kriss'&&pl.dual>0){hint('KLIK KANAN / Z UNTUK DUAL KRISS');}else if(pl.wpn!=='pistol'){banner('AMUNISI HABIS','sub',1);setWpn('pistol');}else S.click();pl.cool=0.25;return;}
  pl.cool=w.rate;pl.mag[pl.wpn]--;pl.kick=w.kick;pl.muzzle=0.06;pl.fireSeq++;
  const ad=aimDir(),slope=ad.s;
  if(pl.wpn==='rl'){S.shot('rl');const dx=Math.cos(ad.a),dy=Math.sin(ad.a);
    const p={k:'rocket',x:pl.x+dx*0.3,y:pl.y+dy*0.3,z:eyeZ()-0.08,vx:dx*11,vy:dy*11,vz:slope*11,t:0,own:true};projs.push(p);
    pushEv(['r',r2(p.x),r2(p.y),r2(p.z),r2(p.vx),r2(p.vy),r2(p.vz)]);}
  else{S.shot(pl.wpn);const spr=pl.wpn==='awp'?(G.zl>0?(pl.bobAmt>0.3?0.02:0):0.09):w.spread;let hitAny=false;for(let i=0;i<w.pellets;i++)if(shootRay(ad.a+(R()-0.5)*2*spr,slope+(R()-0.5)*1.2*spr,w.dmg*pl.dmgMul,w.knock,w.pierce||1))hitAny=true;G.shots++;if(hitAny)G.hits++;
    shells.push({x:0,y:0,vx:40+R()*30,vy:-60-R()*40,t:0,rot:R()<0.5});}
  pl.rec=Math.min(36,pl.rec+w.climb);
  if(pl.mag[pl.wpn]===0){if(pl.ammo[pl.wpn]>0)pl.autoRl=0.15;else if(pl.wpn!=='pistol'){banner('AMUNISI HABIS','sub',1);pl.autoSwap=0.3;}}
}
function zBase(z){return z.rise>0?-0.8*z.scale*(z.rise/0.7):(z.zh||0);}
function zHeight(z){return 0.8*z.scale*((z.act===1||z.act===6)?(z.type==='witch'?0.62:0.72):1);}
function shootRay(ang,slope,dmg,knock,pierce=1){
  const e0=eyeZ(),dx=Math.cos(ang),dy=Math.sin(ang),wt=castT(pl.x,pl.y,dx,dy);let lim=wt,floorHit=false;
  if(slope<0){const tf=e0/(-slope);if(tf<lim){lim=tf;floorHit=true;}}
  const skyMiss=!floorHit&&(e0+slope*wt)>1;
  let best=null,bt=lim,bk=0,bhs=false;const zh=[];
  if(NET.mode!=='pvp'){for(const z of zs){if(z.dead||z.idle)continue;if(pl.st&&pl.st.zid===z.id&&z.act===5)continue;const rx=z.x-pl.x,ry=z.y-pl.y,t=rx*dx+ry*dy;if(t<=0.05||t>=lim)continue;
    if(Math.abs(rx*dy-ry*dx)>=z.hitR)continue;const zb=zBase(z),h=zHeight(z),zr=e0+slope*t;
    if(zr<zb-0.02||zr>zb+h*0.86)continue;zh.push({z,t,hs:zr>zb+h*((z.type==='fat'||z.type==='brute'||z.type==='boss')?0.66:0.6)});}
    zh.sort((a,b)=>a.t-b.t);if(zh.length){best=zh[0].z;bt=zh[0].t;bk=1;bhs=zh[0].hs;}}
  else for(const r of NET.remotes.values()){if(!r.fighter||!r.al)continue;const rx=r.x-pl.x,ry=r.y-pl.y,t=rx*dx+ry*dy;if(t<=0.05||t>=bt)continue;
    if(Math.abs(rx*dy-ry*dx)>=0.27)continue;const zr=e0+slope*t,zb=r.jz||0,top=zb+(r.cr?0.52:0.7);if(zr<zb-0.02||zr>top)continue;best=r;bt=t;bk=2;bhs=zr>top-0.15;}
  const hx=pl.x+dx*bt,hy=pl.y+dy*bt,hz=e0+slope*bt;
  if(bk===1){G.hitMark=0.12;for(let i=0;i<Math.min(pierce,zh.length);i++){const c=zh[i],z=c.z,dm=dmg*(c.hs?2.5:1)*(1-0.25*i),goo=z.type==='fat'||z.type==='spitter';
      const px=pl.x+dx*c.t,py=pl.y+dy*c.t,pz=e0+slope*c.t;burst(px,py,pz,c.hs?8:5,goo?PAL_GOO:PAL_BLOOD,1.5,dx,dy);if(c.hs&&i===0){pop('HEADSHOT!','#ffe14a');G.hs++;}
      if(NET.host)hurtZ(z,dm,dx*knock,dy*knock,null);else{z.flash=0.07;zHurtS(z);}
      pushEv(['h',z.id,r2(dm),r2(dx*knock),r2(dy*knock),r2(px),r2(py),r2(pz),goo?1:0]);}}
  else if(bk===2){const r=best;burst(hx,hy,hz,bhs?8:5,PAL_BLOOD,1.5,dx,dy);G.hitMark=0.12;
    if(!r.sp){const dm=Math.round(dmg*PVPM*(bhs?2.2:1));pushEv(['ph',r.peer,dm,bhs?1:0]);r.hitT=0.08;if(bhs){pop('HEADSHOT!','#ffe14a');G.hs++;}}}
  else if(!skyMiss){const tz=floorHit?0.02:hz,ix=pl.x+dx*(lim-0.04),iy=pl.y+dy*(lim-0.04);burst(ix,iy,tz,3,PAL_SPARK,1.2,-dx,-dy);burst(ix,iy,tz,2,PAL_DUST,0.8,-dx,-dy);}
  return bk>0;
}
function throwNade(){if(!canAct()||pl.down)return;if(pl.nades<=0){hint('GRANAT HABIS');return;}if(G.nadeCD>0)return;pl.nades--;G.nadeCD=0.35;S.throw();const ad=aimDir(),dx=Math.cos(ad.a),dy=Math.sin(ad.a),sl=ad.s;
  const p={k:'nade',x:pl.x+dx*0.3,y:pl.y+dy*0.3,z:eyeZ()-0.08,vx:dx*6.5,vy:dy*6.5,vz:2.6+sl*6.5,t:1.35,own:true};projs.push(p);
  pushEv(['n',r2(p.x),r2(p.y),r2(p.z),r2(p.vx),r2(p.vy),r2(p.vz)]);}
function fxExplosion(x,y,Rr){booms.push({x,y,t:0,dur:0.6,size:Rr*0.85});const dp=Math.hypot(pl.x-x,pl.y-y);S.boom(0.55*Math.max(0,1-dp/16)+0.15);
  burst(x,y,0.15,18,PAL_FIRE,3,0,0,true);burst(x,y,0.1,10,PAL_DUST,2.5,0,0,true);
  for(let i=0;i<6;i++)parts.push({k:'b',x:x+(R()-0.5)*0.6,y:y+(R()-0.5)*0.6,z:0.3,vx:0,vy:0,vz:0.6+R(),g:-0.4,life:1+R(),col:PAL_SMOKE[i%2],s:0.12+R()*0.08});
  G.shake=Math.max(G.shake,0.55*Math.max(0,1-dp/9));}
function explodeDamage(x,y,Rr,dmg,by){for(const z of zs){if(z.dead||z.idle)continue;const d=Math.hypot(z.x-x,z.y-y);if(d<Rr+z.r){const nx=(z.x-x)/(d||1),ny=(z.y-y)/(d||1);hurtZ(z,dmg*(1-0.5*Math.min(1,d/Rr)),nx*5,ny*5,by);}}}
function myExplosion(x,y,Rr,dmg){fxExplosion(x,y,Rr);
  if(NET.mode==='pvp'){for(const r of NET.remotes.values()){if(!r.fighter||!r.al||r.sp)continue;const d=Math.hypot(r.x-x,r.y-y);if(d<Rr+0.25)pushEv(['ph',r.peer,Math.round(dmg*PVPM*(1-0.5*Math.min(1,d/Rr))),0]);}
    const dm=Math.hypot(pl.x-x,pl.y-y);if(dm<Rr)hurtPlayer(dmg*PVPM*0.5*(1-0.5*dm/Rr),null);}
  else if(NET.host)explodeDamage(x,y,Rr,dmg,null);
  pushEv(['x',r2(x),r2(y),Rr,(NET.mode==='coop'&&!NET.host)?dmg:0]);}

/* ================= melee, molotov, fire ================= */
function swing(quick){const w=WEAP.parang;pl.cool=Math.max(pl.cool,quick?0.3:w.rate);pl.swingT=0.32;pl.swingQ=quick;pl.meleeCD=0.5;S.swoosh();
  const ad=aimDir(),a=ad.a,dm=w.dmg*pl.dmgMul;let hit=0;
  if(NET.mode!=='pvp'){const c=[];for(const z of zs){if(z.dead||z.idle||z.rise>0)continue;const dx=z.x-pl.x,dy=z.y-pl.y,d=Math.hypot(dx,dy);if(d>1.25+z.r)continue;
      if(d>0.3&&Math.abs(angDiff(Math.atan2(dy,dx),a))>0.8)continue;if(!los(pl.x,pl.y,z.x,z.y))continue;c.push([d,z]);}
    c.sort((p,q)=>p[0]-q[0]);
    for(const[d,z]of c.slice(0,3)){const nx=(z.x-pl.x)/(d||1),ny=(z.y-pl.y)/(d||1),goo=z.type==='fat'||z.type==='spitter';hit++;
      burst(z.x,z.y,0.5*z.scale,10,goo?PAL_GOO:PAL_BLOOD,2.2,nx,ny);
      if(NET.host)hurtZ(z,dm,nx*w.knock,ny*w.knock,null);else{z.flash=0.07;zHurtS(z);}
      pushEv(['h',z.id,r2(dm),r2(nx*w.knock),r2(ny*w.knock),r2(z.x),r2(z.y),0.5,goo?1:0]);}}
  else for(const r of NET.remotes.values()){if(!r.fighter||!r.al||r.sp)continue;const dx=r.x-pl.x,dy=r.y-pl.y,d=Math.hypot(dx,dy);
    if(d>1.45||Math.abs(angDiff(Math.atan2(dy,dx),a))>0.8)continue;hit++;burst(r.x,r.y,0.5,10,PAL_BLOOD,2,dx,dy);pushEv(['ph',r.peer,55,0]);r.hitT=0.08;}
  G.shots++;if(hit){G.hits++;G.hitMark=0.12;S.chop();G.shake=Math.max(G.shake,0.14);}}
function quickMelee(){if(!canAct()||pl.down||pl.meleeCD>0||G.swapT>0)return;if(pl.reload>0)pl.reload=0;swing(pl.wpn!=='parang');}
function throwMolo(){if(!canAct()||pl.down)return;if(pl.molos<=0){hint('MOLOTOV HABIS · BELI DI TOKO');return;}if((G.moloCD||0)>0)return;pl.molos--;G.moloCD=0.45;S.throw();const ad=aimDir(),dx=Math.cos(ad.a),dy=Math.sin(ad.a),sl=ad.s;
  const p={k:'molo',x:pl.x+dx*0.3,y:pl.y+dy*0.3,z:eyeZ()-0.08,vx:dx*6.8,vy:dy*6.8,vz:2.4+sl*6.8,t:3,own:true};projs.push(p);
  pushEv(['mo',r2(p.x),r2(p.y),r2(p.z),r2(p.vx),r2(p.vy),r2(p.vz)]);}
let fires=[];
function igniteFx(x,y){burst(x,y,0.1,16,PAL_FIRE,2.6,0,0,true);S.glass(x,y);S.ignite(x,y);}
function igniteAt(x,y,by,own){x=clamp(x,0.2,MW-0.2);y=clamp(y,0.2,MH-0.2);fires.push({x,y,t:7,r:1.35,by,own,tick:0.2,ct:0,seed:R()*9});igniteFx(x,y);if(own)pushEv(['fi',r2(x),r2(y)]);}
function updateFires(dt){for(const f of fires){f.t-=dt;f.ct-=dt;if(f.ct<=0){f.ct=0.3+R()*0.2;S.crackle(f.x,f.y);}
    if(R()<dt*PQ*28){const a=R()*6.28,rr=Math.sqrt(R())*f.r*0.85;parts.push({k:'b',x:f.x+Math.cos(a)*rr,y:f.y+Math.sin(a)*rr,z:0.05,vx:0,vy:0,vz:0.8+R()*0.8,g:-0.6,life:0.35+R()*0.35,col:PAL_FIRE[(R()*3)|0],s:0.04+R()*0.04});}
    if(R()<dt*PQ*5)parts.push({k:'b',x:f.x+(R()-0.5)*f.r,y:f.y+(R()-0.5)*f.r,z:0.4,vx:0,vy:0,vz:0.5+R()*0.4,g:-0.3,life:1+R(),col:PAL_SMOKE[(R()*2)|0],s:0.1+R()*0.06});
    if(NET.host&&NET.mode!=='pvp'){f.tick-=dt;if(f.tick<=0){f.tick=0.4;for(const z of zs){if(z.dead||z.idle||z.rise>0)continue;if(Math.hypot(z.x-f.x,z.y-f.y)<f.r+z.r*0.5)hurtZ(z,z.type==='boss'?4:2.6,0,0,f.by===NET.me?null:f.by);}}}}
  fires=fires.filter(f=>f.t>0);
  if(G.state==='play'&&pl.alive&&!pl.spectator&&pl.z<0.3){let inF=null;for(const f of fires)if(Math.hypot(pl.x-f.x,pl.y-f.y)<f.r){inF=f;break;}
    if(inF){pl.fireTick-=dt;if(pl.fireTick<=0){pl.fireTick=0.5;const pv=NET.mode==='pvp';hurtPlayer(pv?(inF.own?5:11):3,pv&&!inF.own?inF.by:null);}}else pl.fireTick=0;}}
function drawFire(f){const life=Math.min(1,f.t/1.2,(7-f.t)/0.25+0.2),n=Math.round(7+5*PQ);
  for(let i=0;i<n;i++){const a=i*2.39+f.seed,rr=((i*0.37+f.seed)%1)*f.r*0.8,x=f.x+Math.cos(a)*rr,y=f.y+Math.sin(a)*rr,fl=0.6+0.4*Math.sin(G.t*11+i*1.7);
    const h=(0.12+0.18*fl)*life;drawBlob(x,y,h*0.35,0.2*life*fl+0.05,PAL_FIRE[2],12);drawBlob(x,y,h*0.6,0.13*life*fl+0.03,PAL_FIRE[1],10);drawBlob(x,y,h*0.85,0.07*life+0.02,PAL_FIRE[0],8);}}

/* ================= boss ================= */
function bossAI(z,tg,d,dt,pls){z.cd2=(z.cd2==null?4:z.cd2)-dt;
  if(!z.enr&&z.hp<z.hpMax*0.5){z.enr=true;z.sp*=1.35;z.rate*=0.75;banner('RAJA ZOMBI MENGAMUK!','combo',1.8);zv('boss','alert',z.x,z.y);pushEv(['be']);}
  if(z.act===10){z.actT-=dt;z.state='attack';if(z.actT<=0){z.act=0;bossSlam(z);z.cd=z.enr?4:6;}return true;}
  if(z.act===11){z.actT-=dt;z.state='attack';if(z.actT<=0){z.act=0;bossThrow(z,tg);z.cd2=z.enr?3.2:5;}return true;}
  if(z.cd<=0&&d<3.4&&tg.z<0.6){z.act=10;z.actT=0.85;zv('boss','alert',z.x,z.y);return true;}
  if(z.cd2<=0&&z.see&&d>4.5&&d<14){z.act=11;z.actT=0.6;return true;}
  return false;}
function fxSlam(x,y){const dp=Math.hypot(pl.x-x,pl.y-y);G.shake=Math.max(G.shake,0.8*Math.max(0.15,1-dp/10));S.boom(0.6*Math.max(0.2,1-dp/16));
  for(let i=0;i<20;i++){const a=i/20*6.28;burst(x+Math.cos(a)*1.2,y+Math.sin(a)*1.2,0.05,Math.ceil(3*PQ),PAL_DUST,3,Math.cos(a),Math.sin(a),true);}
  booms.push({x,y,t:0,dur:0.4,size:1.2});}
function bossSlam(z){fxSlam(z.x,z.y);pushEv(['sl',r2(z.x),r2(z.y)]);
  for(const p of livePlayers()){const dx=p.x-z.x,dy=p.y-z.y,d=Math.hypot(dx,dy);if(d>3.4||p.z>0.25)continue;const dm=Math.round(26*(1-0.5*d/3.4)),kx=dx/(d||1)*2.6,ky=dy/(d||1)*2.6;
    if(p.me){hurtPlayer(dm);knockMe(kx,ky);}else{pushEv(['za',p.peer,dm]);pushEv(['kb',p.peer,r2(kx),r2(ky)]);}}}
function bossThrow(z,tg){const T=1.05;projs.push({k:'rock',x:z.x,y:z.y,z:1.3,vx:(tg.x-z.x)/T,vy:(tg.y-z.y)/T,vz:(4*T*T-1.3)/T,t:3,own:true});S.throw();}
function rockFx(x,y){burst(x,y,0.1,Math.ceil(14*PQ),PAL_DUST,2.4,0,0,true);gibs(x,y,0);const dp=Math.hypot(pl.x-x,pl.y-y);G.shake=Math.max(G.shake,0.35*Math.max(0,1-dp/8));S.boom(0.3*Math.max(0.1,1-dp/14));}
function rockHit(x,y){rockFx(x,y);for(const p of livePlayers()){const d=Math.hypot(p.x-x,p.y-y);if(d>1.4)continue;if(p.me)hurtPlayer(22);else pushEv(['za',p.peer,22]);}}
function bossInfo(){const z=zs.find(o=>o.type==='boss'&&!o.dead);if(!z)return null;if(NET.host||NET.mode==='solo')return[z.hp,z.hpMax,z];
  const bh=NET.lastHost&&Array.isArray(NET.lastHost.bh)?NET.lastHost.bh:null;return bh?[num(bh[0]),Math.max(1,num(bh[1],1)),z]:[z.hp,z.hpMax,z];}

/* ================= co-op downed / revive ================= */
function teamUp(){for(const r of NET.remotes.values())if(r.al&&!r.dn)return true;return false;}
function reviveTick(dt){G.revNear=null;if(NET.mode!=='coop'||!pl.alive||pl.down||G.state!=='play'){G.revT=0;G.revTarget=null;return;}
  let best=null,bd=1.4;for(const r of NET.remotes.values()){if(!r.al||!r.dn)continue;const d=Math.hypot(r.x-pl.x,r.y-pl.y);if(d<bd){bd=d;best=r;}}
  G.revNear=best;const hold=keys.KeyE||G.useHeld;
  if(best&&hold){if(G.revTarget!==best.peer){G.revTarget=best.peer;G.revT=0;}G.revT+=dt;
    if(G.revT>=3){pushEv(['rv',best.peer]);G.revs++;addScore(300);banner('KAMU MENOLONG '+best.nick+'!','sub',2);S.pick();G.revT=0;G.revTarget=null;}}
  else{G.revT=0;G.revTarget=null;}}
function myReviver(){for(const r of NET.remotes.values())if(r.rv===NET.me&&r.al)return r;return null;}

/* ================= ping ================= */
const PINGL=['KE SINI','AWAS','SENJATA'];
function sendPing(){if(G.state!=='play')return;if(NET.mode!=='coop'){hint('TANDA LOKASI KHUSUS MODE CO-OP');return;}if(!pl.alive||(G.pingCD||0)>0)return;G.pingCD=0.8;
  const ad=aimDir(),dx=Math.cos(ad.a),dy=Math.sin(ad.a),e0=eyeZ(),wt=castT(pl.x,pl.y,dx,dy);let lim=wt;if(ad.s<0)lim=Math.min(lim,e0/(-ad.s));
  let kind=0,x=pl.x+dx*Math.max(0.5,lim-0.15),y=pl.y+dy*Math.max(0.5,lim-0.15),zid=0,sub=0,bt=lim;
  for(const z of zs){if(z.dead||z.idle)continue;const rx=z.x-pl.x,ry=z.y-pl.y,t=rx*dx+ry*dy;if(t<=0.1||t>=bt)continue;if(Math.abs(rx*dy-ry*dx)>z.hitR+0.25)continue;bt=t;kind=1;x=z.x;y=z.y;zid=z.id;sub=ZTYPES.indexOf(z.type);}
  if(kind===0)for(const p of picks){const rx=p.x-pl.x,ry=p.y-pl.y,t=rx*dx+ry*dy;if(t<=0.1||t>=lim+0.5)continue;if(Math.abs(rx*dy-ry*dx)>0.6)continue;kind=2;x=p.x;y=p.y;sub=PKIND.indexOf(p.kind);break;}
  addPing(NET.me,kind,x,y,zid,sub);pushEv(['pg',kind,r2(x),r2(y),zid,sub]);}
function addPing(peer,kind,x,y,zid,sub){const z=kind===1?zById(zid):null;
  const lab=kind===1?(ZNAME[ZTYPES[sub]]||'ZOMBI')+'!':kind===2?({mg:'SENAPAN MESIN',sg:'SHOTGUN',rl:'ROKET',awp:'AWP',nade:'GRANAT',med:'MEDKIT',molo:'MOLOTOV'}[PKIND[sub]]||'SENJATA'):'KE SINI';
  G.pings.set(peer,{kind,x,y,zid,lab,t:0,col:TEAMS[colorOf(peer)][0],nick:peer===NET.me?NET.nick:((NET.remotes.get(peer)||{}).nick||'TEMAN')});S.ping();}
function updatePings(dt){G.pingCD=Math.max(0,(G.pingCD||0)-dt);for(const[k,p]of G.pings){p.t+=dt;if(p.kind===1){const z=zById(p.zid);if(z&&!z.dead){p.x=z.x;p.y=z.y;}else if(p.t<5.5)p.t=5.5;}if(p.t>6.5)G.pings.delete(k);}}
function drawPings(){for(const p of G.pings.values()){const a=p.t>5.8?Math.max(0,(6.5-p.t)/0.7):1;if(a<=0)continue;ctx.globalAlpha=a;
    const z=p.kind===1?zById(p.zid):null,wz=z?0.8*z.scale+0.15:p.kind===2?0.45:0.7,pr=proj(p.x,p.y,wz),dist=Math.round(Math.hypot(p.x-pl.x,p.y-pl.y)*3);
    let x,y,edge=false;if(pr&&pr.x>8&&pr.x<W-8&&pr.y>14&&pr.y<H-10){x=pr.x;y=pr.y;}
    else{const ang=angDiff(Math.atan2(p.y-pl.y,p.x-pl.x),pl.a);x=clamp(HW+Math.sin(ang)*HW*1.1*(Math.abs(ang)>Math.PI/2?2:1),12,W-12);y=pr?clamp(pr.y,20,H-20):HH;edge=true;}
    x=Math.round(x);y=Math.round(y-Math.abs(Math.sin(G.t*5))*2);const c=p.kind===1?'#ff4a3a':p.col;
    ctx.fillStyle=OUT;ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x+6,y);ctx.lineTo(x,y+7);ctx.lineTo(x-6,y);ctx.closePath();ctx.fill();
    ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+4,y);ctx.lineTo(x,y+5);ctx.lineTo(x-4,y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff6e0';ctx.fillRect(x-1,y-2,2,3);
    if(!edge||p.t<2.5)txt(p.lab,x,y-17,c,'center');txt(dist+'M',x,y+9,'#fff6e0','center');ctx.globalAlpha=1;}}

/* ================= shop ================= */
const SHOP=[
  {n:'PELURU MG',d:'+150 peluru',p:()=>900,lim:2,ok:()=>hasAmmo('mg')&&!ammoFull('mg'),no:()=>!hasAmmo('mg')?'Belum punya MG':'Peluru penuh',b:()=>{give('mg',150);}},
  {n:'SHOTGUN',d:'+20 peluru',p:()=>900,lim:2,ok:()=>hasAmmo('sg')&&!ammoFull('sg'),no:()=>!hasAmmo('sg')?'Belum punya SG':'Peluru penuh',b:()=>{give('sg',20);}},
  {n:'AWP',d:'+10 peluru',p:()=>1400,lim:2,ok:()=>hasAmmo('awp')&&!ammoFull('awp'),no:()=>!hasAmmo('awp')?'Belum punya AWP':'Peluru penuh',b:()=>{give('awp',10);}},
  {n:'ROKET',d:'+6 roket',p:()=>1600,lim:1,ok:()=>hasAmmo('rl')&&!ammoFull('rl'),no:()=>!hasAmmo('rl')?'Belum punya RL':'Roket penuh',b:()=>{give('rl',6);}},
  {n:'KRISS',d:()=>hasAmmo('kriss')?'+150 peluru':'Senjata + 45 peluru',p:()=>hasAmmo('kriss')?900:1800,lim:2,ok:()=>!ammoFull('kriss'),no:()=>'Peluru penuh',b:()=>{give('kriss',150);}},
  {n:'DUAL KRISS',d:'+1 isi dual (60 peluru)',p:()=>1200,lim:1,ok:()=>pl.hasK&&pl.dual<MAXDUAL,no:()=>!pl.hasK?'Belum punya KRISS':'Isi dual penuh',b:()=>{pl.dual++;}},
  {n:'GRANAT',d:'+3 granat',p:()=>600,lim:1,ok:()=>pl.nades<MAXNADE,no:()=>'Granat penuh',b:()=>{pl.nades=Math.min(MAXNADE,pl.nades+3);}},
  {n:'MOLOTOV',d:'+2 bom api',p:()=>700,lim:1,ok:()=>pl.molos<MAXMOLO,no:()=>'Molotov penuh',b:()=>{pl.molos=Math.min(MAXMOLO,pl.molos+2);}},
  {n:'MEDKIT',d:'Darah penuh',p:()=>700,lim:1,ok:()=>pl.hp<pl.maxhp&&!pl.down,no:()=>'Darah penuh',b:()=>{pl.hp=pl.maxhp;}},
  {n:'ROMPI',d:'Pelindung +50',p:()=>1000,lim:1,ok:()=>pl.armor<100,no:()=>'Rompi penuh',b:()=>{pl.armor=Math.min(100,pl.armor+50);}},
  {n:'UPGRADE',d:()=>pl.dmgLv>=5?'Damage maksimal':'Damage +15% (Lv '+(pl.dmgLv+1)+')',p:()=>1500+pl.dmgLv*1000,lim:1,ok:()=>pl.dmgLv<5,no:()=>'Sudah maksimal',b:()=>{pl.dmgLv++;pl.dmgMul=1+0.15*pl.dmgLv;}},
];
const SHOPKEY=['1','2','3','4','5','6','7','8','9','0','-'];
function shopAvail(){return G.state==='play'&&NET.mode!=='pvp'&&G.breakT>0&&pl.alive;}
function shopLeft(i){return SHOP[i].lim-((G.shopBuys||{})[i]||0);}
function buyItem(i){const it=SHOP[i];if(!it||!shopAvail())return;const pr=it.p();if(pl.cash<pr||shopLeft(i)<=0||(it.ok&&!it.ok())){S.click();return;}
  pl.cash-=pr;it.b();G.shopBuys=G.shopBuys||{};G.shopBuys[i]=(G.shopBuys[i]||0)+1;S.pick();renderShop();}
function renderShop(){shopCash.textContent='UANG: '+pl.cash;[...shopGrid.children].forEach((b,i)=>{const it=SHOP[i],pr=it.p(),ok=!it.ok||it.ok(),left=shopLeft(i);
    b.querySelector('.sd').textContent=left<=0?'Batas beli jeda ini habis':!ok?it.no():((typeof it.d==='function'?it.d():it.d)+' · sisa '+left+'x');
    b.querySelector('.sp').textContent=(ok&&left>0)?pr:'—';b.disabled=!ok||left<=0||pl.cash<pr;});
  shopSkip.hidden=!NET.host;}
function openShop(v){const want=v===undefined?!G.shopOpen:!!v;if(want&&!shopAvail()){if(G.state==='play')hint(NET.mode==='pvp'?'TOKO TIDAK ADA DI PVP':'TOKO BUKA SAAT JEDA ANTAR GELOMBANG');return;}if(want===G.shopOpen)return;G.shopOpen=want;shopEl.hidden=!want;
  if(want){toggleStickers(false);G.fireHeld=false;renderShop();if(G.locked){try{document.exitPointerLock();}catch(e){}}}
  else if(G.state==='play'&&!isTouch)lockPointer();}

/* ================= pickups ================= */
function canTake(kind){const H=t=>{if(G.t>(G.fullHT||0)){G.fullHT=G.t+2.5;hint(t);}return false;};if(['mg','sg','rl','awp','kriss'].includes(kind)&&ammoFull(kind)&&!(kind==='kriss'&&pl.dual<MAXDUAL)){return H('AMUNISI '+WEAP[kind].name+' PENUH');}
  if(kind==='nade'&&pl.nades>=MAXNADE)return H('GRANAT PENUH');if(kind==='molo'&&pl.molos>=MAXMOLO)return H('MOLOTOV PENUH');return true;}
function takePick(kind){const pv=NET.mode==='pvp';switch(kind){
  case'mg':banner(give('mg',pv?80:150)?'PELURU MG +'+(pv?80:150):'SENAPAN MESIN!','sub',1.4);break;
  case'sg':banner(give('sg',pv?12:20)?'PELURU SHOTGUN +'+(pv?12:20):'SHOTGUN!','sub',1.4);break;
  case'rl':banner(give('rl',pv?3:6)?'ROKET +'+(pv?3:6):'PELUNCUR ROKET!','sub',1.4);break;
  case'awp':banner(give('awp',pv?5:10)?'PELURU AWP +'+(pv?5:10):'AWP!','sub',1.4);break;
  case'kriss':{const had=give('kriss',pv?90:150);pl.dual=Math.min(MAXDUAL,pl.dual+1);banner(had?'PELURU KRISS +'+(pv?90:150)+' · DUAL +1':'KRISS! KLIK KANAN = DUAL','sub',1.8);break;}
  case'nade':pl.nades=Math.min(MAXNADE,pl.nades+(pv?3:5));banner('GRANAT +'+(pv?3:5),'sub',1.2);break;
  case'molo':pl.molos=Math.min(MAXMOLO,pl.molos+(pv?1:2));banner('MOLOTOV +'+(pv?1:2),'sub',1.2);break;
  case'med':pl.hp=Math.min(pl.maxhp,pl.hp+35);banner('DARAH +35','sub',1.2);break;
  case'life':if(pl.lives<6){pl.lives++;banner('+1 NYAWA!','big',1.8);}else{addScore(2000);banner('NYAWA PENUH · +2000','sub',1.6);}S.oneup();return;}
  addScore(50);S.pick();}
function hostTakePick(id){if(NET.mode==='pvp'){NET.pvTaken[id]=G.t+15;}else picks=picks.filter(p=>p.id!==id);}
function pvpPickList(){if(NET.host)return MAP.picks.filter(p=>!(NET.pvTaken[p.id]>G.t));
  const ids=NET.lastHost&&Array.isArray(NET.lastHost.pk)?NET.lastHost.pk:[];return MAP.picks.filter(p=>ids.includes(p.id)&&!(NET.hidden.get(p.id)>G.t));}

/* ================= match starts ================= */
function clearWorld(){pools=[];NET.pools=[];G.seen=new Set();zs=[];parts=[];projs=[];booms=[];picks=[];shells=[];NET.spits=[];G.banners=[];G.pops=[];G.hurt=0;G.goo=0;G.shake=0;G.kills=0;G.combo=0;G.comboT=0;
  G.breakT=0;G.fireHeld=false;G.allDeadT=0;G.remain=0;NET.hidden.clear();fires=[];G.matchDone=false;G.expRes=null;G.bossK=0;G.pings=new Map();G.hs=0;G.shots=0;G.hits=0;G.revs=0;G.revT=0;G.revTarget=null;G.downs=0;if(G.shopOpen)openShop(false);}
function resetPlayer(){Object.assign(pl,{a:-Math.PI/2,pitch:0,hp:100,score:0,cool:0.3,kick:0,muzzle:0,bobAmt:0,sway:0,alive:true,spectator:false,deaths:0,killedBy:null,spawnProt:0,respawnT:0,z:0,vz:0,cr:0,st:null,rec:0,lives:1,down:false,cash:0,armor:0,dmgLv:0,dmgMul:1,swingT:0,meleeCD:0,fireTick:0});resetLoadout();}
function enterPlay(){G.state='play';G.paused=false;G.touchCrouch=false;showMenu(false);G.needClick=!G.locked&&!isTouch;G.fsAuto=isTouch&&!!SET.fs;if(isTouch&&SET.fs)tryFullscreen();}
function startSolo(){NET.mode='solo';NET.host=true;clearWorld();resetPlayer();placeStart();
  G.flowT=0;enterPlay();G.needClick=false;lockPointer();startWave(1,true);}
function startCoopLocal(sim){clearWorld();resetPlayer();
  if(sim){placeStart();startWave(1,true);}
  else{const h=NET.lastHost;const c=nearCell(num(h&&h.x,MAP.start[0]),num(h&&h.y,MAP.start[1]),1,3)||MAP.start;pl.x=c[0];pl.y=c[1];NET.prevWave=0;NET.prevBreak=0;}
  enterPlay();}
function startPvpLocal(){clearWorld();resetPlayer();const i=NET.fp.indexOf(NET.me);pl.spectator=i<0;
  const sp=MAP.spawns[Math.max(0,i)%2];pl.x=sp[0];pl.y=sp[1];pl.a=Math.atan2(12.5-pl.y,12.5-pl.x);
  if(pl.spectator){pl.x=12.5;pl.y=12.5;banner('KAMU MENONTON','sub',3);}
  NET.pvTaken={};enterPlay();}

/* ================= update ================= */
let roomsT=0;
function update(dt){try{musicTick();trkTick(dt);}catch(e){}
  G.t+=dt;
  {const zt=(G.state==='play'&&pl.alive&&pl.wpn==='awp'&&!G.paused)?[1,3,6][G.zl]:1;if(zt===1)G.zl=0;ZK+=(zt-ZK)*Math.min(1,dt*14);if(Math.abs(zt-ZK)<0.01)ZK=zt;}
  for(const b of G.banners)b.t+=dt;G.banners=G.banners.filter(b=>b.t<b.dur);
  for(const p of G.pops)p.t+=dt;G.pops=G.pops.filter(p=>p.t<1);
  for(const[k,v]of G.stk){v.t+=dt;if(v.t>3)G.stk.delete(k);}for(const f of G.feed)f.t+=dt;G.feed=G.feed.filter(f=>f.t<5);G.stkCD=Math.max(0,G.stkCD-dt);
  updateParts(dt);
  if(online())netTick(dt);
  if(!vRooms.hidden){roomsT-=dt;if(roomsT<=0){roomsT=0.6;renderRooms();}}
  if(G.state==='title'||G.state==='lobby'||G.state==='showroom'){pl.a+=dt*0.12;for(const z of zs)z.anim+=dt*2;return;}
  updateRemotes(dt);
  if(G.state==='over'){G.overT+=dt;G.hurt=Math.max(0,G.hurt-dt*0.5);for(const z of zs)if(z.dead)z.dieT+=dt;else z.anim+=dt*2;
    for(const b of booms)b.t+=dt;booms=booms.filter(b=>b.t<b.dur);return;}
  if(G.state!=='play')return;
  if(NET.mode==='solo'&&G.paused)return;
  G.hurt=Math.max(0,G.hurt-dt*1.4);G.goo=Math.max(0,G.goo-dt*0.6);G.shake=Math.max(0,G.shake-dt*1.6);G.hitMark-=dt;G.comboT-=dt;G.swapT=Math.max(0,G.swapT-dt);
  G.hintT=(G.hintT||0)-dt;G.nadeCD=Math.max(0,G.nadeCD-dt);G.moloCD=Math.max(0,(G.moloCD||0)-dt);G.groanCD-=dt;pl.spawnProt=Math.max(0,pl.spawnProt-dt);
  updateLocalPlayer(dt);
  if(NET.mode==='pvp')updatePvp(dt);else if(NET.host)hostZombieSim(dt);else clientZombieSim(dt);
  zFace(dt);
  if(G.state!=='play')return;
  groans(dt);
  updateProjs(dt);updateFires(dt);
  for(const b of booms)b.t+=dt;booms=booms.filter(b=>b.t<b.dur);
  const plist=NET.mode==='pvp'?pvpPickList():picks;
  if(pl.alive&&!pl.spectator)for(const p of plist){if(NET.hidden.get(p.id)>G.t)continue;if(Math.hypot(p.x-pl.x,p.y-pl.y)<0.65&&canTake(p.kind)){takePick(p.kind);
    if(NET.host)hostTakePick(p.id);else{pushEv(['p',p.id]);NET.hidden.set(p.id,G.t+2);picks=picks.filter(q=>q.id!==p.id);}}}
  for(const s of shells){s.t+=dt;s.vy+=420*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;}shells=shells.filter(s=>s.t<0.9);
}
function updateLocalPlayer(dt){
  pl.swingT=Math.max(0,pl.swingT-dt);pl.meleeCD-=dt;reviveTick(dt);updatePings(dt);
  if(pl.down&&pl.alive&&G.state==='play'){pl.hp-=100/35*dt;if(pl.hp<=0){pl.spawnProt=0;pl.hp=0.5;hurtPlayer(5);}}
  if(pl.st){pl.st.t+=dt;const zz=zById(pl.st.zid);if(!zz||zz.dead||pl.st.t>9||!pl.alive)pl.st=null;}
  const st=pl.st&&pl.st.k;
  const frozen=!pl.alive||pl.down||G.revT>0||(NET.mode==='pvp'&&NET.pv.ph==='count'&&!pl.spectator)||G.paused||st==='pin'||st==='pull';
  let turn=0,look=0;if(!G.paused){if(keys.ArrowLeft)turn-=1;if(keys.ArrowRight)turn+=1;if(keys.ArrowUp)look+=1;if(keys.ArrowDown)look-=1;}
  if(turn)turnBy(turn*2.6*dt,0);if(look)turnBy(0,look*120*dt);
  let fwd=0,str=0;if(!frozen){if(keys.KeyW)fwd+=1;if(keys.KeyS)fwd-=1;if(keys.KeyA)str-=1;if(keys.KeyD)str+=1;fwd+=-stick.y;str+=stick.x;}
  if(st==='ride'){pl.st.dt-=dt;if(pl.st.dt<=0){pl.st.dt=0.6;pl.st.rx=(R()-0.5)*2;pl.st.ry=(R()-0.5)*2;}fwd=fwd*0.4+pl.st.ry;str=str*0.4+pl.st.rx;G.shake=Math.max(G.shake,0.12);}
  if(st==='pin'){G.shake=Math.max(G.shake,0.15);pl.pitch+=(-28-pl.pitch)*Math.min(1,dt*2);}
  if(st==='pull'){const zz=zById(pl.st.zid);if(zz){const dx=zz.x-pl.x,dy=zz.y-pl.y,dd=Math.hypot(dx,dy);if(dd>0.8)moveEnt(pl,dx/dd*1.7*dt,dy/dd*1.7*dt);}G.shake=Math.max(G.shake,0.08);}
  const l=Math.hypot(fwd,str);if(l>1){fwd/=l;str/=l;}
  const crouchWant=!frozen&&(keys.ControlLeft||keys.ControlRight||keys.KeyC||G.touchCrouch)&&pl.z<=0;
  pl.cr+=((crouchWant?1:0)-pl.cr)*Math.min(1,dt*12);
  const run=(keys.ShiftLeft||keys.ShiftRight||Math.hypot(stick.x,stick.y)>0.92)&&pl.cr<0.3;
  const sp=(run?4.4:3.0)*(1-0.5*pl.cr);
  const ca=Math.cos(pl.a),sa=Math.sin(pl.a),ox=pl.x,oy=pl.y;moveEnt(pl,(ca*fwd-sa*str)*sp*dt,(sa*fwd+ca*str)*sp*dt);
  if(pl.z>0||pl.vz>0){pl.vz-=11*dt;pl.z+=pl.vz*dt;if(pl.z<=0){pl.z=0;if(pl.vz<-1.5)S.land();pl.vz=0;}}
  const moved=Math.hypot(pl.x-ox,pl.y-oy);pl.bobT+=moved*3.4;pl.bobAmt+=((moved>0.001&&pl.z<=0?1:0)-pl.bobAmt)*Math.min(1,dt*8);pl.sway*=Math.pow(0.002,dt);
  pl.cool-=dt;pl.kick=Math.max(0,pl.kick-dt*6);pl.muzzle-=dt;pl.rec*=Math.exp(-dt*7);if(pl.rec<0.05)pl.rec=0;
  if(cursorAim()){const ex=G.mx/W,ey=G.my/H;let t=0,v=0;if(ex<0.1)t=-(0.1-ex)/0.1;else if(ex>0.9)t=(ex-0.9)/0.1;if(ey<0.1)v=(0.1-ey)/0.1;else if(ey>0.9)v=-(ey-0.9)/0.1;
    if(t)turnBy(t*2.6*dt,0);if(v)turnBy(0,v*110*dt);}
  if(pl.reload>0){pl.reload-=dt;if(pl.reload<=0){pl.reload=0;finishReload();}}
  if(pl.autoRl>0){pl.autoRl-=dt;if(pl.autoRl<=0)startReload();}
  if(pl.autoSwap>0){pl.autoSwap-=dt;if(pl.autoSwap<=0&&!hasAmmo(pl.wpn))setWpn('pistol');}
  if(G.fireHeld||keys.KeyF)fire();
  if(!pl.alive&&NET.mode==='pvp'){pl.respawnT-=dt;if(pl.respawnT<=0&&NET.pv.ph==='live')respawnPvp();}
}
function jump(){if(G.state!=='play'||G.paused||!pl.alive||pl.down)return;
  if(pl.st&&pl.st.k==='ride'){pl.st.j++;S.jump();if(pl.st.j>=3)shakeOff();return;}
  if(pl.st||pl.z>0||pl.cr>0.4)return;if(NET.mode==='pvp'&&NET.pv.ph==='count'&&!pl.spectator)return;pl.vz=2.8;pl.z=0.001;S.jump();}
function updatePvp(dt){
  if(NET.host){
    if(NET.pv.ph==='count'){const before=Math.ceil(NET.pv.ct);NET.pv.ct-=dt;if(Math.ceil(NET.pv.ct)!==before&&NET.pv.ct>0)S.beep(660);
      if(NET.pv.ct<=0){NET.pv.ph='live';NET.gp='live';S.beep(1320);banner('BERTARUNG!','big',1.5);}}
    else if(NET.pv.ph==='live'){NET.pv.tl-=dt;if(NET.pv.tl<=0){NET.pv.tl=0;pvpEnd();}}
    const present=NET.fp.every(p=>p===NET.me||NET.remotes.has(p));if(!present&&G.state==='play'){NET.forfeit=true;pvpEnd();}
  }else{if(NET.pv.ph==='live')NET.pv.tl=Math.max(0,NET.pv.tl-dt);else NET.pv.ct=Math.max(0,NET.pv.ct-dt);}
}
function pvpEnd(){NET.gp='end';NET.pv.ph='end';G.state='over';G.overT=0;G.fireHeld=false;exitLock();const s=pvpScore();if(s.me>s.opp)S.win();else S.over();endMatch();}
function pvpScore(){let opp=null;for(const r of NET.remotes.values())if(r.fighter){opp=r;break;}return{me:opp?opp.d:0,opp:pl.deaths,oppR:opp};}
function groans(dt){G.ambT=(G.ambT==null?6:G.ambT)-dt;if(G.ambT<=0){G.ambT=7+R()*10;if(NET.mode!=='pvp')zvFar();}
  for(const z of zs){if(z.dead||z.idle||z.rise>0)continue;
    if(z.type==='witch'){if(z.act===6){z.sobT=(z.sobT==null?R()*2:z.sobT)-dt;if(z.sobT<=0){z.sobT=2.2+R()*0.8;zv('witch','idle',z.x,z.y);}}continue;}
    z.groanT-=dt;if(z.groanT<=0){const sp=SPECIALS.includes(z.type);z.groanT=(sp?2.5:3.5)+R()*(sp?3:6);const d=Math.hypot(pl.x-z.x,pl.y-z.y);
      if(d<13&&G.groanCD<=0){G.groanCD=0.3;zv(z.type,'idle',z.x,z.y);}}}}
function updateProjs(dt){
  for(const p of projs){
    if(p.k==='rocket'){p.t+=dt;const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt,nz=p.z+p.vz*dt;
      parts.push({k:'b',x:p.x,y:p.y,z:p.z,vx:(R()-0.5)*0.4,vy:(R()-0.5)*0.4,vz:0.3,g:-0.3,life:0.5,col:PAL_SMOKE[(R()*2)|0],s:0.05+R()*0.04});
      let hit=(solid(nx,ny)&&nz<1)||nz<=0||p.t>3||nx<0||ny<0||nx>MW||ny>MH;
      if(!hit&&p.own){if(NET.mode==='pvp'){for(const r of NET.remotes.values())if(r.fighter&&r.al&&Math.hypot(r.x-nx,r.y-ny)<0.35&&nz<0.75){hit=true;break;}}
        else for(const z of zs){if(!z.dead&&!z.idle&&Math.hypot(z.x-nx,z.y-ny)<z.hitR+0.1&&nz<0.8*z.scale){hit=true;break;}}}
      if(hit){p.done=true;if(p.own&&p.t<=3&&nz<1.5)myExplosion(p.x,p.y,2.1,12*pl.dmgMul);}else{p.x=nx;p.y=ny;p.z=nz;}}
    else if(p.k==='nade'){p.t-=dt;p.vz-=9.8*dt;p.z+=p.vz*dt;
      if(solid(p.x+p.vx*dt,p.y))p.vx*=-0.5;if(solid(p.x,p.y+p.vy*dt))p.vy*=-0.5;p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.z<0.05){p.z=0.05;p.vz=-p.vz*0.4;p.vx*=0.6;p.vy*=0.6;}
      let hit=p.t<=0;if(!hit&&p.own&&p.z<0.8){if(NET.mode==='pvp'){for(const r of NET.remotes.values())if(r.fighter&&r.al&&Math.hypot(r.x-p.x,r.y-p.y)<0.3){hit=true;break;}}
        else for(const z of zs){if(!z.dead&&z.rise<=0&&!z.idle&&Math.hypot(z.x-p.x,z.y-p.y)<z.hitR){hit=true;break;}}}
      if(hit){p.done=true;if(p.own)myExplosion(p.x,p.y,2.6,14*pl.dmgMul);}}
    else if(p.k==='molo'){p.t-=dt;p.vz-=9.8*dt;const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;p.z+=p.vz*dt;
      let hit=p.z<=0.04||p.t<=0;if(solid(nx,ny)){hit=true;}else{p.x=nx;p.y=ny;}
      if(!hit&&p.own&&p.z<0.9){if(NET.mode==='pvp'){for(const r of NET.remotes.values())if(r.fighter&&r.al&&Math.hypot(r.x-p.x,r.y-p.y)<0.32){hit=true;break;}}
        else for(const z of zs){if(!z.dead&&z.rise<=0&&!z.idle&&Math.hypot(z.x-p.x,z.y-p.y)<z.hitR&&p.z<0.8*z.scale){hit=true;break;}}}
      if(hit){p.done=true;if(p.own)igniteAt(p.x,p.y,NET.me,true);}}
    else if(p.k==='rock'){p.t-=dt;p.vz-=8*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      if(p.z<=0||solid(p.x,p.y)||p.t<=0){if(solid(p.x,p.y)){p.x-=p.vx*dt;p.y-=p.vy*dt;}rockHit(p.x,p.y);pushEv(['rk',r2(p.x),r2(p.y)]);p.done=true;}}
    else if(p.k==='acid'){p.t-=dt;p.vz-=8*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      if(p.z<=0||solid(p.x,p.y)||p.t<=0){if(solid(p.x,p.y)){p.x-=p.vx*dt;p.y-=p.vy*dt;}pools.push({id:NET.pid++,x:p.x,y:p.y,t:5.5,r:1.1});burst(p.x,p.y,0.05,10,PAL_GOO,1.6,0,0,true);S.splat(vol(p.x,p.y));p.done=true;}}
    else if(p.k==='spit'){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vz-=0.6*dt;p.z+=p.vz*dt;
      if(solid(p.x,p.y)||p.t<=0||p.z<0){burst(p.x-p.vx*dt,p.y-p.vy*dt,Math.max(0.05,p.z),8,PAL_GOO,1.4,-p.vx,-p.vy);p.done=true;continue;}
      for(const t of livePlayers()){if(Math.hypot(t.x-p.x,t.y-p.y)<0.38){if(t.me){hurtPlayer(12);G.goo=Math.min(1,G.goo+0.9);}else{pushEv(['za',t.peer,12]);pushEv(['goo',t.peer]);}
        burst(p.x,p.y,0.4,10,PAL_GOO,1.5,0,0);p.done=true;break;}}}
  }
  projs=projs.filter(p=>!p.done);
}
function updateParts(dt){for(const p of parts){p.life-=dt;p.vz-=p.g*dt;const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;
  if(solid(nx,ny)){p.vx*=-0.2;p.vy*=-0.2;}else{p.x=nx;p.y=ny;}p.z+=p.vz*dt;
  if(p.z<0){p.z=0;if(p.bounce&&p.vz<-1){p.vz*=-0.35;p.vx*=0.5;p.vy*=0.5;}else{p.vz=0;p.vx*=0.3;p.vy*=0.3;}}}
  parts=parts.filter(p=>p.life>0);}
function shakeOff(){const id=pl.st.zid,z=zById(id);if(NET.host){if(z){release(z);z.stun=1.2;}}else pushEv(['off',id]);pl.st=null;banner('LEPAS!','sub',1);}
function toggleScope(){if(pl.wpn==='kriss'){activateDual();return;}if(pl.wpn!=='awp'||!canAct()||pl.reload>0)return;G.zl=(G.zl+1)%3;S.click();}
function activateDual(){if(!canAct()||pl.down)return;if(pl.dualOn){hint('DUAL KRISS SUDAH AKTIF');return;}if(pl.dual<=0){hint('ISI DUAL KRISS HABIS · BELI DI TOKO');return;}
  pl.dual--;pl.dualOn=true;pl.dualMag=DUALMAG;pl.reload=0;G.swapT=0.25;S.rlIn();banner('DUAL KRISS!','sub',1.2);}
function fireDual(){const w=WEAP.kriss;pl.cool=0.042;pl.dualMag--;pl.kick=0.3;pl.muzzle=0.05;pl.fireSeq++;pl.dualSide^=1;
  const ad=aimDir();S.shot('kriss');let hit=false;if(shootRay(ad.a+(R()-0.5)*0.1,ad.s+(R()-0.5)*0.06,w.dmg*pl.dmgMul,w.knock,1))hit=true;G.shots++;if(hit)G.hits++;
  shells.push({x:pl.dualSide?-40:0,y:0,vx:pl.dualSide?-40-R()*30:40+R()*30,vy:-60-R()*40,t:0,rot:R()<0.5});pl.rec=Math.min(36,pl.rec+0.45);
  if(pl.dualMag<=0){pl.dualOn=false;pl.dualMag=0;G.swapT=0.3;banner('KEMBALI KE KRISS TUNGGAL','sub',1.3);if(pl.mag.kriss<=0&&pl.ammo.kriss>0)pl.autoRl=0.35;}}
function turnBy(da,dp){if(G.state!=='play'||G.paused)return;const k=1/ZK;da*=k;dp*=k;pl.a+=da;pl.pitch=clamp(pl.pitch+dp,-PMAX,PMAX);pl.sway=clamp(pl.sway-da*60,-10,10);}
function updateRemotes(dt){for(const r of NET.remotes.values()){
  const k=Math.min(1,dt*12);const ox=r.x,oy=r.y;
  if(Math.hypot(r.tx-r.x,r.ty-r.y)>2.5){r.x=r.tx;r.y=r.ty;}else{r.x+=(r.tx-r.x)*k;r.y+=(r.ty-r.y)*k;}
  r.a+=angDiff(r.ta,r.a)*k;r.anim+=Math.hypot(r.x-ox,r.y-oy)*4;r.flashT-=dt;r.hitT-=dt;if(!r.al)r.deadT+=dt;}}

/* ================= networking ================= */
let roomNS=null,roomReady=false;
function loadScript(src){return new Promise((res,rej)=>{if(window.Peer)return res();const s=document.createElement('script');s.src=src;s.onload=()=>res();s.onerror=()=>rej(new Error('load'));document.head.appendChild(s);});}
function makePeerRoomNS(){return{peerjs:true,join:async(name)=>{
  await loadScript('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js');
  const hubId='kotamati-'+name,myId='p'+Math.random().toString(36).slice(2,10),pres=new Map(),conns=new Map();
  let mine={},snap=[],up=null,isHub=false,peer=null,closed=false,retryT=null;
  const rebuild=()=>{const a=[{peer:myId,presence:mine,sameTab:true,isMe:true,kind:'viewer',by:null,guest:false,updatedAt:Date.now()}];
    for(const[id,p]of pres)a.push({peer:id,presence:p,sameTab:false,isMe:false,kind:'viewer',by:null,guest:false,updatedAt:Date.now()});snap=Object.freeze(a);};
  rebuild();
  const send=(c,m)=>{try{if(c&&c.open)c.send(m);}catch(e){}};
  const broadcast=(m,except)=>{for(const[id,c]of conns)if(id!==except)send(c,m);};
  const onMsg=(from,m)=>{if(!m||typeof m!=='object')return;
    if(m.t==='p'&&typeof m.id==='string'&&m.id!==myId){pres.set(m.id,m.p||{});rebuild();if(isHub)broadcast(m,from);}
    else if(m.t==='all'&&Array.isArray(m.l)){for(const it of m.l)if(Array.isArray(it)&&typeof it[0]==='string'&&it[0]!==myId)pres.set(it[0],it[1]||{});rebuild();}
    else if(m.t==='bye'&&typeof m.id==='string'){pres.delete(m.id);rebuild();if(isHub)broadcast(m,from);}};
  const becomeHub=()=>new Promise(res=>{let done=false;const p=new Peer(hubId,{debug:0});
    p.on('open',()=>{if(done)return;done=true;peer=p;isHub=true;
      p.on('connection',c=>{c.on('open',()=>{conns.set(c.peer,c);send(c,{t:'all',l:[[myId,mine],...pres]});});
        c.on('data',m=>{if(m&&m.t==='p'&&typeof m.id==='string')c._kid=m.id;onMsg(c.peer,m);});
        c.on('close',()=>{conns.delete(c.peer);if(c._kid){pres.delete(c._kid);rebuild();broadcast({t:'bye',id:c._kid});}});});
      p.on('disconnected',()=>{try{p.reconnect();}catch(e){}});res(true);});
    p.on('error',()=>{if(!done){done=true;try{p.destroy();}catch(e){}res(false);}});});
  const becomeClient=()=>new Promise(res=>{let done=false;const p=new Peer({debug:0});
    const fail=()=>{if(!done){done=true;try{p.destroy();}catch(e){}res(false);}};
    p.on('open',()=>{const c=p.connect(hubId,{reliable:true});
      c.on('open',()=>{if(done)return;done=true;peer=p;up=c;isHub=false;send(c,{t:'p',id:myId,p:mine});res(true);});
      c.on('data',m=>onMsg('hub',m));
      c.on('close',()=>{if(up===c){up=null;pres.clear();rebuild();if(!closed)retry();}});
      setTimeout(fail,7000);});
    p.on('error',fail);});
  const connect=async()=>{for(let i=0;i<5&&!closed;i++){if(await becomeHub())return true;if(await becomeClient())return true;await new Promise(r=>setTimeout(r,600+Math.random()*1200));}return false;};
  const retry=()=>{if(retryT||closed)return;try{peer&&peer.destroy();}catch(e){}peer=null;retryT=setTimeout(async()=>{retryT=null;if(!closed&&!await connect())retry();},400+Math.random()*1200);};
  if(!await connect())throw{code:'upstream_error'};
  return{name,
    presence:async(patch)=>{for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}rebuild();const m={t:'p',id:myId,p:mine};if(isHub)broadcast(m);else send(up,m);},
    peers:()=>snap,onPeers:()=>()=>{},emit:async()=>{},on:()=>()=>{},connected:()=>isHub||!!up,onConnection:()=>()=>{},
    leave:async()=>{closed=true;const m={t:'bye',id:myId};if(isHub)broadcast(m);else send(up,m);setTimeout(()=>{try{peer&&peer.destroy();}catch(e){}},200);}};
}};}
let LOBBY=null,lobbyP=null,adT=0,lastAd='null';
function getLobby(){if(LOBBY)return Promise.resolve(LOBBY);if(lobbyP)return lobbyP;if(!roomNS)return Promise.resolve(null);
  lobbyP=(async()=>{try{LOBBY=roomNS.peerjs?await roomNS.join('lobby-v1'):roomNS;}catch(e){LOBBY=null;}lobbyP=null;return LOBBY;})();return lobbyP;}
async function advertise(){const lb=await getLobby();if(!lb)return;
  const ad=(NET.r&&NET.host&&NET.me)?{v:1,c:NET.code,m:NET.mode,mp:G.mapIdx,n:NET.nick,p:1+NET.remotes.size,s:G.state==='lobby'?'w':'p'}:null;
  const k=JSON.stringify(ad);if(k===lastAd)return;lastAd=k;try{await lb.presence({ad});}catch(e){}}
async function initRoom(){await Promise.resolve();
  if(!window.claude){roomNS=makePeerRoomNS();roomReady=true;updateNetNote();return;}
  try{roomNS=(window.claude&&typeof window.claude.use==='function')?await window.claude.use('room'):null;}catch(e){roomNS=null;}
  roomReady=true;updateNetNote();}
async function joinRoom(mode,codeIn){
  if(!roomNS||NET.joining)return;
  const nick=G.nick||'PEMAIN',code=String(codeIn||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12);
  if(!code){setNote('Isi kode room dulu.',true);fRoom.focus();return;}
  NET.joining=true;setNote('Menghubungkan ke ruangan…');
  try{const r=await roomNS.join('km-'+mode+'-'+code);
    Object.assign(NET,{mode,r,code,nick,me:null,host:false,hostPeer:null,ev:[],seq:0,sendT:0,gp:'lobby',mid:0,lastHost:null,fp:[],pv:{ph:'count',tl:300,ct:3},pvTaken:{},prevWave:0,prevBreak:0,forfeit:false});
    NET.remotes.clear();NET.seen.clear();NET.hidden.clear();
    r.onPeers(()=>{},()=>{});
    clearWorld();G.state='lobby';setupAttract();showLobby();sendPresence();
  }catch(e){setNote(e&&e.code==='limit_reached'?'Ruangan penuh atau server sibuk. Coba lagi sebentar.':(roomNS&&roomNS.peerjs?'Gagal terhubung ke server online. Cek internet lalu coba lagi.':'Gagal masuk ruangan. Coba lagi.'),true);}
  NET.joining=false;
}
function leaveRoom(){exitFs();if(NET.r){try{NET.r.leave().catch(()=>{});}catch(e){}}NET.r=null;setTimeout(advertise,0);NET.mode='solo';NET.host=true;NET.remotes.clear();NET.seen.clear();
  clearWorld();exitLock();G.state='title';setNight(nightPref(),false);setupAttract();showMain();}
function netTick(dt){
  const ps=NET.r.peers();let meSeen=false;const players=[];
  for(const p of ps){if(p.sameTab){NET.me=p.peer;meSeen=true;continue;}if(p.kind!=='viewer')continue;const pr=p.presence;
    if(!pr||pr.v!==1||pr.m!==NET.mode)continue;players.push(p);}
  if(!meSeen||!NET.me)return;
  const live=new Set();
  for(const p of players){live.add(p.peer);const pr=p.presence;let r=NET.remotes.get(p.peer);
    if(!r){r={peer:p.peer,x:clamp(num(pr.x,12.5),0,MW),y:clamp(num(pr.y,12.5),0,MH),a:num(pr.a),anim:0,lastFs:num(pr.fs),flashT:0,hitT:0,deadT:2,lastD:num(pr.d),al:false,d:0};
      NET.remotes.set(p.peer,r);let mx=0;if(Array.isArray(pr.ev))for(const e of pr.ev)if(Array.isArray(e)&&typeof e[0]==='number')mx=Math.max(mx,e[0]);NET.seen.set(p.peer,mx);}
    r.nick=cleanNick(pr.n);r.tx=clamp(num(pr.x,r.x),0,MW);r.ty=clamp(num(pr.y,r.y),0,MH);r.ta=num(pr.a,r.a);r.w=clamp(num(pr.w)|0,0,ORDER.length-1);r.dn=pr.dn===1;r.lv=clamp(num(pr.lv,1)|0,1,17);r.rv=typeof pr.rv==='string'?pr.rv:null;r.rvp=clamp(num(pr.rvp),0,100);r.stt=Array.isArray(pr.stt)?pr.stt.slice(0,4).map(v=>num(v)|0):[0,0,0,0];
    r.hp=clamp(num(pr.hp,100),0,100);r.sk=clamp(num(pr.sk)|0,0,SKINS.length-1);r.jz=clamp(num(pr.jz),0,1);r.cr=pr.cr===1;const al=pr.al===1;
    if(r.al&&!al){r.deadT=0;if(G.state==='play'){burst(r.x,r.y,0.4,14,PAL_BLOOD,2,0,0);gibs(r.x,r.y,2);S.splat(vol(r.x,r.y));}}
    if(!r.al&&al){r.x=r.tx;r.y=r.ty;}r.al=al;r.sp=pr.sp===1;r.ld=pr.ld===1;r.sc=num(pr.sc);r.kb=typeof pr.kb==='string'?pr.kb:null;r.hs=pr.hs===1;
    const d=num(pr.d);if(d>r.lastD&&NET.mode==='pvp'&&G.state==='play'&&r.kb===NET.me){banner('KAMU MENGHABISI '+r.nick+'!','combo',1.8);S.win();}r.lastD=d;r.d=d;
    const fs=num(pr.fs);if(fs!==r.lastFs){r.lastFs=fs;if(r.al&&G.state==='play'){r.flashT=0.07;S.shot(ORDER[r.w],0.85*vol(r.x,r.y,16));}}
    processEvents(p.peer,pr.ev);}
  for(const peer of[...NET.remotes.keys()])if(!live.has(peer)){NET.remotes.delete(peer);NET.seen.delete(peer);}
  electHost(players);
  for(const r of NET.remotes.values())r.fighter=NET.mode==='pvp'&&NET.fp.includes(r.peer);
  if(!NET.host){const hp=players.find(p=>p.peer===NET.hostPeer);if(hp)applyHostState(hp.presence);}
  NET.sendT-=dt;if(NET.sendT<=0){NET.sendT=1/15;sendPresence();}
  adT-=dt;if(adT<=0){adT=1;advertise();}
  if(G.state==='lobby')renderLobbyThrottled(dt);
}
function processEvents(peer,ev){if(!Array.isArray(ev))return;let last=NET.seen.get(peer)||0,mx=last;
  for(const e of ev){if(!Array.isArray(e)||typeof e[0]!=='number'||e[0]<=last)continue;mx=Math.max(mx,e[0]);try{handleEvent(peer,e);}catch(err){}}
  NET.seen.set(peer,mx);}
function showSticker(peer,i){G.stk.set(peer,{i,t:0});const nm=peer===NET.me?NET.nick:((NET.remotes.get(peer)||{}).nick||'PEMAIN');
  G.feed.push({nm,i,t:0,col:TEAMS[colorOf(peer)][0]});if(G.feed.length>4)G.feed.shift();S.pop();}
function sendSticker(i){if(!online()||!(G.state==='play'||G.state==='over')||i<0||i>=STK.length)return;if(G.stkCD>0)return;G.stkCD=1.2;
  pushEv(['sk',i]);showSticker(NET.me,i);toggleStickers(false);}
function handleEvent(peer,e){const t=e[1];
  if(G.state!=='play'&&G.state!=='over')return;
  if(t==='h'){const hx=num(e[6],NaN),hy=num(e[7],NaN),hz=num(e[8],0.4);if(Number.isFinite(hx)&&Number.isFinite(hy))burst(hx,hy,hz,4,e[9]===1?PAL_GOO:PAL_BLOOD,1.4,num(e[4]),num(e[5]));
    const z=zById(e[2]);if(z){if(NET.host&&NET.mode==='coop')hurtZ(z,clamp(num(e[3]),0,95),clamp(num(e[4]),-3,3),clamp(num(e[5]),-3,3),peer);else z.flash=0.07;}}
  else if(t==='x'){const x=clamp(num(e[2],-99),0,MW),y=clamp(num(e[3],-99),0,MH),Rr=clamp(num(e[4],2),0.5,3);fxExplosion(x,y,Rr);
    if(NET.host&&NET.mode==='coop'&&num(e[5])>0)explodeDamage(x,y,Rr,clamp(num(e[5]),0,30),peer);
    projs=projs.filter(p=>!(p.remote&&Math.hypot(p.x-x,p.y-y)<1.2));}
  else if(t==='p'){if(NET.host)hostTakePick(e[2]);}
  else if(t==='ph'){if(e[2]===NET.me){if(NET.mode==='pvp'&&NET.fp.includes(peer))hurtPlayer(clamp(num(e[3]),0,250),peer);}
    else{const r=NET.remotes.get(e[2]);if(r)r.hitT=0.08;}}
  else if(t==='r'||t==='n'){const p={k:t==='r'?'rocket':'nade',x:clamp(num(e[2]),0,MW),y:clamp(num(e[3]),0,MH),z:num(e[4],0.4),vx:clamp(num(e[5]),-12,12),vy:clamp(num(e[6]),-12,12),vz:clamp(num(e[7]),-12,12),t:t==='r'?0:1.6,own:false,remote:true};projs.push(p);
    if(t==='r')S.shot('rl',0.8*vol(p.x,p.y,16));}
  else if(t==='kl'){if(e[2]===NET.me)localKill(clamp(num(e[3])|0,0,5000));}
  else if(t==='za'){if(e[2]===NET.me&&NET.mode==='coop'&&peer===NET.hostPeer){let bz=null,bd=1.6;for(const z of zs){if(z.dead)continue;const d=Math.hypot(z.x-pl.x,z.y-pl.y);if(d<bd){bd=d;bz=z;}}if(bz)zv(bz.type,'attack',bz.x,bz.y);hurtPlayer(clamp(num(e[3]),0,60));}}
  else if(t==='goo'){if(e[2]===NET.me&&peer===NET.hostPeer)G.goo=Math.min(1,G.goo+0.8);}
  else if(t==='st'){if(e[2]===NET.me&&peer===NET.hostPeer){const k=String(e[3]);if(k==='none'){if(pl.st&&pl.st.zid===e[4])pl.st=null;}else if(['pin','pull','ride'].includes(k)&&pl.alive)pl.st={k,zid:num(e[4]),t:0,j:0,dt:0};}}
  else if(t==='kb'){if(e[2]===NET.me&&peer===NET.hostPeer)knockMe(clamp(num(e[3]),-3,3),clamp(num(e[4]),-3,3));}
  else if(t==='sk'){const i=num(e[2],-1)|0;if(i>=0&&i<STK.length)showSticker(peer,i);}
  else if(t==='mo'){projs.push({k:'molo',x:clamp(num(e[2]),0,MW),y:clamp(num(e[3]),0,MH),z:num(e[4],0.4),vx:clamp(num(e[5]),-12,12),vy:clamp(num(e[6]),-12,12),vz:clamp(num(e[7]),-12,12),t:3,own:false,remote:true});}
  else if(t==='fi'){const x=clamp(num(e[2],-99),0,MW),y=clamp(num(e[3],-99),0,MH);projs=projs.filter(p=>!(p.remote&&p.k==='molo'&&Math.hypot(p.x-x,p.y-y)<2));fires.push({x,y,t:7,r:1.35,by:peer,own:false,tick:0.2,ct:0,seed:R()*9});igniteFx(x,y);}
  else if(t==='sl'){if(peer===NET.hostPeer)fxSlam(clamp(num(e[2]),0,MW),clamp(num(e[3]),0,MH));}
  else if(t==='rk'){if(peer===NET.hostPeer)rockFx(clamp(num(e[2]),0,MW),clamp(num(e[3]),0,MH));}
  else if(t==='be'){if(peer===NET.hostPeer){banner('RAJA ZOMBI MENGAMUK!','combo',1.8);const z=zs.find(o=>o.type==='boss'&&!o.dead);if(z)zv('boss','alert',z.x,z.y);}}
  else if(t==='rv'){if(e[2]===NET.me&&pl.down&&pl.alive){pl.down=false;pl.hp=40;pl.spawnProt=1.5;const r=NET.remotes.get(peer);banner('DITOLONG '+(r?r.nick:'TEMAN')+'!','big',1.8);S.oneup();}}
  else if(t==='pg'){if(NET.mode==='coop'){const k=clamp(num(e[2])|0,0,2);addPing(peer,k,clamp(num(e[3]),0,MW),clamp(num(e[4]),0,MH),num(e[5])|0,num(e[6])|0);}}
  else if(t==='off'){if(NET.host){const z=zById(e[2]);if(z&&z.grab&&z.grab.peer===peer){release(z);z.stun=1.2;}}}
}
function electHost(players){
  const all=[{peer:NET.me,hs:NET.host}].concat(players.map(p=>({peer:p.peer,hs:p.presence.hs===1})));
  const cl=all.filter(a=>a.hs),pool=(cl.length?cl:all).slice().sort((a,b)=>a.peer<b.peer?-1:a.peer>b.peer?1:0);
  const was=NET.host;NET.hostPeer=pool[0].peer;NET.host=NET.hostPeer===NET.me;
  if(NET.host&&!was)becomeHost();
}
function becomeHost(){const h=NET.lastHost;if(!h)return;
  NET.gp=typeof h.gp==='string'?h.gp:'lobby';NET.mid=num(h.mid);
  if(NET.mode==='coop'){for(const z of zs){z.remote=false;z.tx=z.x;z.ty=z.y;}NET.zid=zs.reduce((m,z)=>Math.max(m,z.id+1),NET.zid);
    const wv=Array.isArray(h.wv)?h.wv:[1,0,0];G.wave=num(wv[0],1);let alive=0;for(const z of zs)if(!z.dead)alive++;G.toSpawn=Math.max(0,num(wv[1])-alive);G.boss=0;G.breakT=num(wv[2])/10;G.spawnT=1;
    NET.pid=picks.reduce((m,p)=>Math.max(m,p.id+1),NET.pid);}
  else{NET.fp=Array.isArray(h.fp)?h.fp.filter(x=>typeof x==='string').slice(0,2):[];NET.pv.tl=num(h.tl,300);NET.pv.ct=num(h.ct,0);
    NET.pv.ph=NET.gp==='live'?'live':NET.gp==='end'?'end':'count';if(NET.gp==='live'||NET.gp==='count')NET.gp=NET.pv.ph;}}
function applyHostState(h){
  NET.lastHost=h;const gp=h.gp,mid=num(h.mid);
  if(h.nt===1||h.nt===0){const nv=h.nt===1;if(nv!==G.night){setNight(nv,false);if(G.state==='lobby')renderLobby();}}
  const mp=Math.max(0,Math.min(MAPS.length-1,num(h.mp)|0));if(mp!==G.mapIdx&&(G.state==='lobby'||G.state==='title'||gp==='lobby'||NET.mid!==mid))selectMap(mp);
  if(NET.mode==='coop'){
    if(gp==='play'){if((G.state!=='play'&&G.state!=='over')||NET.mid!==mid){NET.mid=mid;startCoopLocal(false);}
      if(G.state==='play'){const wv=Array.isArray(h.wv)?h.wv:[0,0,0],wave=num(wv[0]),br=num(wv[2])/10;
        if(wave!==NET.prevWave&&wave>0)startWave(wave,false);else if(br>0&&NET.prevBreak<=0&&NET.prevWave>0)waveClear(false);
        NET.prevWave=wave;NET.prevBreak=br;G.wave=wave;G.remain=num(wv[1]);G.breakT=br;
        mirrorZombies(h.z);mirrorPicks(h.pk);NET.spits=Array.isArray(h.pr)?h.pr.slice(0,12):[];NET.pools=Array.isArray(h.ac)?h.ac.slice(0,10):[];}}
    else if(gp==='end'){if(G.state==='play'){G.state='over';G.overT=0;G.fireHeld=false;S.over();saveBest();exitLock();endMatch();}}
    else if(gp==='lobby'&&G.state!=='lobby'){clearWorld();G.state='lobby';setupAttract();showLobby();}
  }else{
    NET.fp=Array.isArray(h.fp)?h.fp.filter(x=>typeof x==='string').slice(0,2):[];
    if(gp==='count'||gp==='live'){if(NET.mid!==mid||G.state!=='play'){NET.mid=mid;NET.pv.tl=300;startPvpLocal();}
      const was=NET.pv.ph;NET.pv.ph=gp;NET.pv.tl=num(h.tl,NET.pv.tl);NET.pv.ct=num(h.ct,NET.pv.ct);
      if(was==='count'&&gp==='live'){S.beep(1320);banner('BERTARUNG!','big',1.5);}}
    else if(gp==='end'){if(G.state==='play'){NET.pv.ph='end';NET.forfeit=h.ff===1;G.state='over';G.overT=0;G.fireHeld=false;exitLock();const s=pvpScore();if(s.me>s.opp)S.win();else S.over();endMatch();}}
    else if(gp==='lobby'&&G.state!=='lobby'){clearWorld();G.state='lobby';setupAttract();showLobby();}
  }
}
function mirrorZombies(list){if(!Array.isArray(list))return;const seen=new Set();
  for(const e of list.slice(0,40)){if(!Array.isArray(e))continue;const id=num(e[0],-1),type=ZTYPES[num(e[1])|0]||'walk',x=clamp(num(e[2])/100,0,MW),y=clamp(num(e[3])/100,0,MH),st=num(e[4])|0;seen.add(id);
    let z=zById(id);
    if(!z){if(st===2)continue;z=makeZ(type,x,y);NET.zid--;z.id=id;z.remote=true;announce(type);z.rise=st===3?0.7:0;z.mir=e[6]===1;zs.push(z);if(st===3)burst(x,y,0.02,10,PAL_DUST,1.4,0,0,true);}
    z.tx=x;z.ty=y;z.hp=num(e[5])/10;
    {const pa=z.act||0;z.act=num(e[7])|0;z.zh=num(e[8])/100;z.ax=num(e[9])/100;z.ay=num(e[10])/100;
      if(pa!==z.act){const v=vol(z.x,z.y);if(z.act===2&&(z.type==='hunter'||z.type==='jockey'))zv(z.type,'leap',z.x,z.y);if(z.act===3)zv('charger','leap',z.x,z.y);if(z.act===4)zv('smoker','leap',z.x,z.y);if(z.act===7&&pa===6){zv('witch','leap',z.x,z.y);banner('KUNTILANAK MENGAMUK!','combo',1.6);}}}
    if(st===2&&!z.dead){z.dead=true;z.dieT=(z.type==='fat'||z.type==='brute'||z.type==='boss')?0.25:0;deathFx(z,0,0);}
    if(!z.dead)z.state=st===1?'attack':'walk';if(st!==3&&z.rise>0.2)z.rise=0.2;}
  for(const z of zs)if(!z.dead&&!seen.has(z.id))z.lost=true;}
function mirrorPicks(list){if(!Array.isArray(list))return;const out=[];
  for(const e of list.slice(0,16)){if(!Array.isArray(e))continue;const id=num(e[0],-1);if(NET.hidden.get(id)>G.t)continue;
    const old=picks.find(p=>p.id===id);out.push({id,kind:PKIND[num(e[1])|0]||'mg',x:clamp(num(e[2])/100,0,MW),y:clamp(num(e[3])/100,0,MH),ph:old?old.ph:R()*6});}
  picks=out;}
function sendPresence(){if(!NET.r)return;
  const inGame=G.state==='play';
  const o={v:1,m:NET.mode,n:NET.nick,sk:G.skin,hs:NET.host?1:0,x:r2(pl.x),y:r2(pl.y),a:r2(pl.a),p:Math.round(pl.pitch),w:ORDER.indexOf(pl.wpn),hp:Math.ceil(pl.hp),
    jz:r2(pl.z),cr:pl.cr>0.5?1:0,mp:G.mapIdx,dn:pl.down?1:0,lv:accRank().lv,rv:G.revTarget||null,rvp:Math.round(G.revT/3*100),stt:[G.kills,G.hs,G.revs,G.shots?Math.round(G.hits/G.shots*100):0],nt:G.night?1:0,al:(inGame&&pl.alive&&!pl.spectator)?1:0,fs:pl.fireSeq,ld:pl.reload>0?1:0,sc:pl.score,d:pl.deaths,kb:pl.killedBy,sp:pl.spawnProt>0?1:0,ev:NET.ev,
    gp:null,mid:null,wv:null,z:null,pk:null,pr:null,ac:null,tl:null,ct:null,fp:null,ff:null,bh:null};
  if(NET.host){o.gp=NET.mode==='pvp'&&G.state==='play'?NET.pv.ph:NET.gp;o.mid=NET.mid;
    if(NET.mode==='coop'){o.wv=[G.wave,G.remain,Math.round(G.breakT*10)];
      o.z=zs.filter(z=>!z.idle&&(!z.dead||z.dieT<1.2)).slice(0,30).map(z=>{const a=[z.id,ZTYPES.indexOf(z.type),Math.round(z.x*100),Math.round(z.y*100),z.dead?2:z.rise>0?3:z.state==='attack'?1:0,Math.round(Math.max(0,z.hp)*10),z.mir?1:0];if(z.act&&!z.dead)a.push(z.act,Math.round((z.zh||0)*100),Math.round((z.ax||0)*100),Math.round((z.ay||0)*100));return a;});
      o.pk=picks.slice(0,12).map(p=>[p.id,PKIND.indexOf(p.kind),Math.round(p.x*100),Math.round(p.y*100)]);
      o.pr=projs.filter(p=>p.k==='spit'||p.k==='acid'||p.k==='rock').slice(0,10).map(p=>[Math.round(p.x*100),Math.round(p.y*100),Math.round(p.z*100),p.k==='rock'?1:0]);{const bz=zs.find(z=>z.type==='boss'&&!z.dead);o.bh=bz?[Math.round(bz.hp),Math.round(bz.hpMax)]:null;}o.ac=pools.slice(0,10).map(q=>[q.id,Math.round(q.x*100),Math.round(q.y*100),Math.round(q.t*10)]);}
    else{o.tl=Math.round(NET.pv.tl*10)/10;o.ct=Math.round(NET.pv.ct*10)/10;o.fp=NET.fp;o.ff=NET.forfeit?1:0;o.pk=pvpPickList().map(p=>p.id);}}
  let s=JSON.stringify(o);
  if(s.length>3900){o.pr=[];o.ev=NET.ev.slice(-10);s=JSON.stringify(o);if(s.length>3900&&o.z)o.z=o.z.slice(0,16);}
  NET.r.presence(o).catch(()=>{});
}
function hostStart(){if(!NET.host||!NET.r)return;initAudio();NET.mid++;
  if(NET.mode==='coop'){NET.gp='play';startCoopLocal(true);lockPointer();}
  else{const others=[...NET.remotes.keys()].sort();if(!others.length){NET.mid--;return;}NET.fp=[NET.me,others[0]];NET.pv={ph:'count',tl:300,ct:3};NET.forfeit=false;NET.gp='count';
    for(const r of NET.remotes.values())r.fighter=NET.fp.includes(r.peer);startPvpLocal();lockPointer();}
  sendPresence();}

/* ================= menu / lobby UI ================= */
const menuEl=document.getElementById('menu'),vMain=document.getElementById('vMain'),vLobby=document.getElementById('vLobby'),vSet=document.getElementById('vSet');
const fRoom=document.getElementById('fRoom'),netNote=document.getElementById('netNote'),vRooms=document.getElementById('vRooms'),vShow=document.getElementById('vShow');
const rTitle=document.getElementById('rTitle'),rList=document.getElementById('rList'),rMsg=document.getElementById('rMsg'),sNick=document.getElementById('sNick'),skinsEl=document.getElementById('skins');
const mCoop=document.getElementById('mCoop'),mPvp=document.getElementById('mPvp'),btnExit=document.getElementById('btnExit');
const lTitle=document.getElementById('lTitle'),lCode=document.getElementById('lCode'),lList=document.getElementById('lList'),lMsg=document.getElementById('lMsg'),bStart=document.getElementById('bStart');
function randCode(){const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<5;i++)s+=a[(R()*a.length)|0];return s.toUpperCase();}
function setNote(t,warn){for(const el of[netNote,rMsg]){el.textContent=t;el.classList.toggle('warn',!!warn);}}
function updateNetNote(){const ok=!!roomNS;mCoop.disabled=!ok;mPvp.disabled=!ok;
  if(!roomReady)setNote('Memeriksa koneksi online…');
  else if(ok&&roomNS.peerjs)setNote('Mode online lewat internet. Bagikan link halaman ini dan kode ruangan ke temanmu, lalu pilih mode yang sama.');
  else if(ok)setNote('Mode online siap. Pemain dengan mode dan kode ruangan yang sama akan bermain bersama.');
  else setNote('Mode online hanya jalan saat halaman ini dibuka di Claude oleh akun yang diundang. Lewat link publik, hanya mode solo yang tersedia.',true);}
function showMenu(v){menuEl.hidden=!v;btnExit.hidden=v;}
function showView(v){for(const x of[vMain,vRooms,vShow,vLobby,vSet,document.getElementById('vAcc'),document.getElementById('vLb')])x.hidden=x!==v;showMenu(true);}
function showMain(){if(G.state==='showroom')G.state='title';showView(vMain);updateNetNote();updateCard();}
function showLobby(){showView(vLobby);renderLobby();}
let roomsMode='coop',roomsSig='';
function showRooms(mode){roomsMode=mode;roomsSig='';showView(vRooms);rTitle.textContent=mode==='coop'?'CO-OP · DAFTAR ROOM':'PVP · DAFTAR ROOM';
  rMsg.classList.remove('warn');rMsg.textContent='Mencari room…';rList.textContent='';getLobby().then(()=>renderRooms(true));}
function renderRooms(force){if(vRooms.hidden)return;const ads=new Map();
  if(LOBBY){try{for(const p of LOBBY.peers()){if(p.sameTab)continue;const a=p.presence&&p.presence.ad;
    if(a&&a.v===1&&a.m===roomsMode&&typeof a.c==='string'&&/^[a-z0-9]{1,12}$/.test(a.c)){const o=ads.get(a.c);if(!o||num(a.p)>num(o.p))ads.set(a.c,a);}}}catch(e){}}
  const list=[...ads.values()].sort((a,b)=>(a.s==='w'?0:1)-(b.s==='w'?0:1)||num(b.p)-num(a.p)).slice(0,12);
  const sig=JSON.stringify(list);if(sig===roomsSig&&!force)return;roomsSig=sig;rList.textContent='';
  if(!list.length){const li=document.createElement('li');li.className='empty';li.textContent=LOBBY?'Belum ada room terbuka. Buat room baru, lalu ajak temanmu.':'Daftar room tidak tersedia. Kamu tetap bisa membuat room atau masuk dengan kode.';rList.append(li);}
  for(const a of list){const li=document.createElement('li'),ri=document.createElement('div'),n=document.createElement('span'),st=document.createElement('span'),b=document.createElement('button');
    const pc=clamp(num(a.p)|0,1,99),full=roomsMode==='coop'&&pc>=4;ri.className='ri';n.className='pn';st.className='rs';
    n.textContent='ROOM '+cleanNick(a.n);st.textContent=(MAPS[num(a.mp)|0]||MAPS[0]).name+' · '+pc+(roomsMode==='coop'?'/4 pemain':' pemain')+' · '+(a.s==='w'?'MENUNGGU':'SEDANG MAIN');
    b.className='btn sm';b.type='button';b.textContent=full?'PENUH':(roomsMode==='pvp'&&pc>=2?'NONTON':'GABUNG');b.disabled=full;b.addEventListener('click',()=>{initAudio();joinRoom(roomsMode,a.c);});
    ri.append(n,st);li.append(ri,b);rList.append(li);}
  rMsg.classList.remove('warn');rMsg.textContent=list.length?list.length+' room ditemukan.':'';}
function updateCard(){document.getElementById('pcName').textContent=(G.nick||'PEMAIN')+(accLogged()?'':' · TAMU');document.getElementById('pcSkin').textContent='SKIN: '+SKINS[G.skin].name;
  {const r=accRank();const c=document.getElementById('pcRank'),g=c.getContext('2d');g.clearRect(0,0,12,12);if(window.KMA)KMA.drawRank(g,r.lv,0,0,1);document.getElementById('pcRankN').textContent=r.name+' · LV '+r.lv;document.getElementById('pcExp').style.width=Math.round(r.prog*100)+'%';}
  const c=document.getElementById('pcCv'),g=c.getContext('2d');g.clearRect(0,0,40,48);g.drawImage(getSold(G.skin,0).front[0].cv,0,0);}
function applySkin(i){G.skin=Math.max(0,Math.min(SKINS.length-1,i|0));FPC=SKINS[G.skin].fp;buildWeapons();}
SKINS.forEach((K,i)=>{const b=document.createElement('button');b.type='button';b.className='skinb';b.setAttribute('aria-pressed','false');const c=document.createElement('canvas');c.width=40;c.height=48;
  c.getContext('2d').drawImage(getSold(i,0).front[0].cv,0,0);const t=document.createElement('span');t.textContent=K.name;b.append(c,t);
  b.addEventListener('click',()=>{G.showSkin=i;markSkins();});skinsEl.append(b);});
function markSkins(){[...skinsEl.children].forEach((b,j)=>b.setAttribute('aria-pressed',j===G.showSkin?'true':'false'));}
function openShowroom(){G.showSkin=G.skin;sNick.value=G.nick;sNick.disabled=accLogged();sNick.title=accLogged()?'Nama akun tidak bisa diganti':'';document.getElementById('sErr').textContent='';markSkins();G.state='showroom';showView(vShow);}
document.getElementById('bShow').addEventListener('click',openShowroom);
document.getElementById('bBackShow').addEventListener('click',()=>{G.state='title';showMain();});
document.getElementById('bSaveShow').addEventListener('click',()=>{const n=cleanNick(sNick.value);if(String(sNick.value).replace(/[^A-Za-z0-9]/g,'').length<2){document.getElementById('sErr').textContent='Nama minimal 2 huruf atau angka.';return;}
  if(!accLogged()){G.nick=n;if(window.KMA)KMA.setGuestNick(n);}applySkin(G.showSkin);try{if(!accLogged())localStorage.setItem('kotamati-nick',n);localStorage.setItem('kotamati-skin',String(G.skin));}catch(e){}G.state='title';showMain();});
document.getElementById('bCreate').addEventListener('click',()=>{initAudio();joinRoom(roomsMode,randCode());});
document.getElementById('bJoinCode').addEventListener('click',()=>{initAudio();joinRoom(roomsMode,fRoom.value);});
document.getElementById('bBackRooms').addEventListener('click',showMain);
fRoom.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();initAudio();joinRoom(roomsMode,fRoom.value);}});
let lobbyT=0;function renderLobbyThrottled(dt){lobbyT-=dt;if(lobbyT<=0){lobbyT=0.3;renderLobby();}}
function renderLobby(){
  lTitle.textContent=NET.mode==='coop'?'CO-OP · LAWAN ZOMBI':'PVP 1 LAWAN 1 · 5 MENIT';lCode.textContent=NET.code.toUpperCase();lMap.textContent=MAP.name;bMap.hidden=!NET.host;
  document.getElementById('lNight').textContent=G.night?'NYALA':'MATI';document.getElementById('bNightL').hidden=!NET.host;
  const ids=teamOrder().filter(p=>p!=='~');lList.textContent='';
  const fighters=NET.mode==='pvp'?ids.slice().sort((a,b)=>(a===NET.hostPeer?-1:b===NET.hostPeer?1:a<b?-1:1)).slice(0,2):[];
  for(const id of ids){const li=document.createElement('li'),c=document.createElement('span'),n=document.createElement('span');
    c.className='chip';c.style.background=TEAMS[colorOf(id)][0];n.className='pn';n.textContent=id===NET.me?NET.nick:(NET.remotes.get(id)||{}).nick||'PEMAIN';li.append(c,n);
    const tag=(t,cls)=>{const s=document.createElement('span');s.className='ptag'+(cls?' '+cls:'');s.textContent=t;li.append(s);};
    if(id===NET.hostPeer)tag('HOST');if(id===NET.me)tag('KAMU','me');if(NET.mode==='pvp'&&!fighters.includes(id))tag('PENONTON','sp');lList.append(li);}
  if(!NET.me){lMsg.textContent='Menghubungkan…';bStart.hidden=true;return;}
  const n=ids.length;bStart.hidden=!NET.host;bStart.disabled=NET.mode==='pvp'&&n<2;
  lMsg.textContent=NET.host?(NET.mode==='pvp'&&n<2?'Menunggu lawan bergabung…':'Semua siap? Tekan MULAI.'):'Menunggu host memulai…';
  if(NET.mode==='coop'&&n>4)lMsg.textContent+=' Lebih dari 4 pemain bisa membuat game berat.';
}
const mapsEl=document.getElementById('maps'),lMap=document.getElementById('lMap'),bMap=document.getElementById('bMap');
const MCOL={'#':'#9c4a35',S:'#b59a62',C:'#b5533a',P:'#8e8682',W:'#7e7288',X:'#8a5a2e',G:'#76727c',T:'#d8b02a'};
MAPS.forEach((M,i)=>{const b=document.createElement('button');b.type='button';b.className='mapb';b.setAttribute('aria-pressed','false');
  const c=document.createElement('canvas');c.width=24;c.height=24;const g=c.getContext('2d');g.fillStyle=M.fog;g.fillRect(0,0,24,24);
  for(let y=0;y<24;y++)for(let x=0;x<24;x++){const ch=M.rows[y][x];if(ch!=='.'){g.fillStyle=MCOL[ch]||'#888';g.fillRect(x,y,1,1);}}
  g.fillStyle='#9be05a';g.fillRect(M.start[0]|0,M.start[1]|0,1,1);
  const t=document.createElement('span');t.textContent=M.name;b.append(c,t);b.addEventListener('click',()=>selectMap(i));mapsEl.append(b);});
function selectMap(i){loadMap(i);[...mapsEl.children].forEach((b,j)=>b.setAttribute('aria-pressed',j===G.mapIdx?'true':'false'));
  if(G.state==='title'||G.state==='lobby')setupAttract();if(G.state==='lobby')renderLobby();}
bMap.addEventListener('click',()=>{if(NET.host&&G.state==='lobby'){selectMap((G.mapIdx+1)%MAPS.length);sendPresence();}});
document.getElementById('mSolo').addEventListener('click',()=>{initAudio();startSolo();});
mCoop.addEventListener('click',()=>{initAudio();showRooms('coop');});
mPvp.addEventListener('click',()=>{initAudio();showRooms('pvp');});
bStart.addEventListener('click',hostStart);
document.getElementById('bLeave').addEventListener('click',leaveRoom);
btnExit.addEventListener('click',()=>{exitFs();if(online())leaveRoom();else{clearWorld();exitLock();G.state='title';setupAttract();showMain();}});

/* ================= text ================= */
const PALS={fire:['#fff6a0','#ffb23e','#e0401a'],toxic:['#f0ffc0','#9be05a','#3f8a2a'],blood:['#ffd8c8','#ff4a3a','#8a1010'],bone:['#ffffff','#e6dccb','#8a7a8a']};
const tcache=new Map();
function txtImg(s,size,pal){const key=s+'|'+size+'|'+pal;let c=tcache.get(key);if(c)return c;
  const font=size+'px "Press Start 2P", monospace',m=document.createElement('canvas').getContext('2d');m.font=font;const tw=Math.ceil(m.measureText(s).width);
  const o=Math.max(1,Math.round(size/11));c=document.createElement('canvas');c.width=tw+o*2+2;c.height=size+o*2+4;const g=c.getContext('2d');
  g.font=font;g.textBaseline='top';g.fillStyle=OUT;for(let dx=-o;dx<=o;dx++)for(let dy=-o;dy<=o+2;dy++)g.fillText(s,o+dx,o+dy);
  const P=PALS[pal],gr=g.createLinearGradient(0,o,0,o+size);gr.addColorStop(0,P[0]);gr.addColorStop(0.5,P[1]);gr.addColorStop(1,P[2]);g.fillStyle=gr;g.fillText(s,o,o);
  if(tcache.size>80)tcache.clear();tcache.set(key,c);return c;}
function big(s,size,pal,x,y,sc=1){const c=txtImg(s,size,pal),w=Math.round(c.width*sc),h=Math.round(c.height*sc);ctx.drawImage(c,Math.round(x-w/2),Math.round(y-h/2),w,h);}
function txt(s,x,y,col,align='left'){ctx.font='8px "Press Start 2P", monospace';ctx.textAlign=align;ctx.textBaseline='top';ctx.fillStyle=OUT;
  ctx.fillText(s,x-1,y);ctx.fillText(s,x+1,y);ctx.fillText(s,x,y-1);ctx.fillText(s,x,y+1);ctx.fillText(s,x+1,y+1);ctx.fillStyle=col;ctx.fillText(s,x,y);}
if(document.fonts&&document.fonts.load){document.fonts.load('8px "Press Start 2P"').then(()=>tcache.clear()).catch(()=>{});document.fonts.ready.then(()=>tcache.clear());}
function vignette(col){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');const gr=g.createRadialGradient(HW,HH,H*0.35,HW,HH,W*0.62);
  gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,col);g.fillStyle=gr;g.fillRect(0,0,W,H);return c;}
let VIG_R,VIG_G,VIG_D;
function makeVigs(){VIG_R=vignette('rgba(200,20,20,0.9)');VIG_G=vignette('rgba(120,220,60,0.85)');VIG_D=vignette('rgba(10,4,12,0.55)');}
makeVigs();
function setRes(w){w=Math.max(320,Math.min(480,Math.round(w/2)*2));if(w===W)return;W=w;HW=W>>1;PLANE=W/(2*H);
  cv.width=W;cv.height=H;ctx.imageSmoothingEnabled=false;world.width=W;world.height=H;img=wctx.createImageData(W,H);buf=new Uint32Array(img.data.buffer);zbuf=new Float32Array(W);
  buildCols();makeVigs();cv.style.aspectRatio=W+' / '+H;}
function fitLayout(){
  const fs=document.fullscreenElement===cab,gm=document.body.classList.contains('game');
  if(!fs&&!gm){setRes(384);cv.style.width='';cv.style.height='';return;}
  const portrait=innerHeight>innerWidth&&gm,cw=cab.clientWidth,ch=cab.clientHeight;
  const avH=portrait?ch-Math.min(ch*0.46,340):ch,aspect=portrait?16/9:clamp(cw/Math.max(1,avH),4/3,2.25);
  setRes(H*aspect);const sc=Math.min(cw/W,avH/H);cv.style.width=Math.floor(W*sc)+'px';cv.style.height=Math.floor(H*sc)+'px';}
function tryFullscreen(){try{if(!document.fullscreenElement&&cab.requestFullscreen){const p=cab.requestFullscreen({navigationUI:'hide'});
  if(p&&p.then)p.then(()=>{try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}).catch(()=>{});}}catch(e){}}
function exitFs(){try{if(document.fullscreenElement&&isTouch)document.exitFullscreen().catch(()=>{});}catch(e){}}
addEventListener('resize',()=>{fitLayout();});document.addEventListener('fullscreenchange',()=>setTimeout(fitLayout,50));

/* ================= render ================= */
const list=[];
function render(){
  const dead=G.state==='play'&&!pl.alive;setCam(pl.x,pl.y,pl.a,dead?-40:pl.pitch+pl.rec,dead?0.18:eyeZ());renderWorld();
  list.length=0;G.tags.length=0;const d2=(x,y)=>(x-camX)*(x-camX)+(y-camY)*(y-camY);
  for(const z of zs)list.push({d:d2(z.x,z.y)+(z.dead?0.05:0),k:0,o:z});
  for(const p of(NET.mode==='pvp'&&G.state!=='title'&&G.state!=='lobby'?pvpPickList():picks))list.push({d:d2(p.x,p.y),k:1,o:p});
  for(const p of projs)list.push({d:d2(p.x,p.y),k:2,o:p});
  if(!NET.host)for(const s of NET.spits)if(Array.isArray(s))list.push({d:d2(num(s[0])/100,num(s[1])/100),k:6,o:s});
  for(const b of booms)list.push({d:d2(b.x,b.y)-0.2,k:3,o:b});
  for(const p of parts)list.push({d:d2(p.x,p.y),k:4,o:p});
  for(const f of fires)list.push({d:d2(f.x,f.y)+0.2,k:8,o:f});
  if(NET.host)for(const q of pools)list.push({d:d2(q.x,q.y)+0.3,k:7,o:q});
  else for(const q of NET.pools||[])if(Array.isArray(q)){const o={id:num(q[0]),x:num(q[1])/100,y:num(q[2])/100,t:num(q[3])/10};list.push({d:d2(o.x,o.y)+0.3,k:7,o});}
  if(G.state==='play'||G.state==='over')for(const r of NET.remotes.values()){if(NET.mode==='pvp'&&!r.fighter)continue;if(!r.al&&r.deadT>9)continue;list.push({d:d2(r.x,r.y),k:5,o:r});}
  list.sort((a,b)=>b.d-a.d);
  for(const it of list){const o=it.o;
    if(it.k===0){let s;const vw=viewOf(o.x,o.y,o.fa||0),F=vw===0?o.fr:vw===2?o.fr.back:o.fr.side,mr=vw===1?false:vw===3?true:o.mir;
      if(o.dead){if(o.dieT>7&&((o.dieT*10)|0)%2)continue;s=F.die[Math.min(5,(o.dieT/0.09)|0)];}
      else if(o.act===1||o.act===6)s=F.low;
      else if(o.act===10||o.act===11)s=F.atk[0];else if(o.state==='attack'||o.act===2||o.act===3)s=F.atk[((G.t*5)|0)%2];else s=F.walk[(o.anim|0)%4];
      if(!o.dead&&o.act===5&&pl.st&&pl.st.zid===o.id)continue;
      const wz=o.rise>0?-0.8*o.scale*(o.rise/0.7):(o.dead?0:(o.zh||0));drawSpr(s,o.x,o.y,wz,0.8*o.scale,o.flash>0&&!o.dead,mr,o.rise>0);
      if(!o.dead&&(o.act===4||o.act===9))drawTongue(o);}
    else if(it.k===7)drawPool(o.x,o.y,o.t,o.id);
    else if(it.k===1)drawSpr(CRATE[o.kind],o.x,o.y,0.02+Math.abs(Math.sin(G.t*3+(o.ph||o.id||0)))*0.07,0.3,false,false,false);
    else if(it.k===2){if(o.k==='nade')drawSpr(NADE,o.x,o.y,o.z-0.06,0.13);else if(o.k==='rocket')drawSpr(ROCKET,o.x,o.y,o.z-0.08,0.17);else drawSpr(SPIT,o.x,o.y,o.z-0.07,0.16);}
    else if(it.k===3)drawSpr(EXPL[Math.min(7,(o.t/o.dur*8)|0)],o.x,o.y,-0.12,o.size);
    else if(it.k===4){if(o.k==='g')drawSpr(o.spr,o.x,o.y,o.z,0.1);else drawBlob(o.x,o.y,o.z,o.s,o.col);}
    else if(it.k===5)drawRemote(o);
    else if(it.k===6){const rk=o[3]===1;drawSpr(rk?ROCK:SPIT,num(o[0])/100,num(o[1])/100,num(o[2])/100-(rk?0.15:0.07),rk?0.3:0.16);}
    else if(it.k===8)drawFire(o);}
  wctx.putImageData(img,0,0);
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  let sx=0,sy=0;if(G.shake>0&&!reduceMotion){sx=Math.round((R()-0.5)*G.shake*14);sy=Math.round((R()-0.5)*G.shake*10);}
  ctx.drawImage(world,sx,sy);ctx.drawImage(VIG_D,0,0);
  if(G.night)drawNight();
  if(G.state==='showroom'){drawShowroom();return;}
  if(G.hudEdit&&G.state!=='play'){ctx.fillStyle='rgba(10,6,12,0.55)';ctx.fillRect(0,0,W,H);return;}
  if(G.state==='title'||G.state==='lobby'){drawTitle();return;}
  for(const t of G.tags)drawTag(t);
  if(G.state==='play'&&G.pings.size)drawPings();
  if(pl.muzzle>0){ctx.fillStyle='rgba(255,210,120,0.07)';ctx.fillRect(0,0,W,H);}
  const scoped=ZK>1.3;
  if(pl.alive&&!pl.spectator&&!scoped)drawWeapon();
  if(G.hurt>0){ctx.globalAlpha=Math.min(1,G.hurt);ctx.drawImage(VIG_R,0,0);ctx.globalAlpha=1;}
  if(pl.alive&&pl.hp<=30&&G.state==='play'){ctx.globalAlpha=0.25+0.2*Math.sin(G.t*8);ctx.drawImage(VIG_R,0,0);ctx.globalAlpha=1;}
  if(G.goo>0){ctx.globalAlpha=Math.min(0.9,G.goo);ctx.drawImage(VIG_G,0,0);ctx.globalAlpha=1;}
  if(G.state==='play'&&!pl.alive){ctx.fillStyle='rgba(40,10,14,0.45)';ctx.fillRect(0,0,W,H);}
  if(pl.alive&&!pl.spectator){if(scoped)drawScope();else drawCross();}
  drawHUD();if(G.state!=='over')drawBanners();
  if(G.state==='play'&&(G.paused||G.needClick)&&!G.hudEdit)drawPause();
  if(G.state==='over')drawOver();
}
const TONGUE=['#d86a8a','#a84a6a'].map(hex);
let NIGHT=null,nctx=null;
function drawNight(){if(G.state==='showroom')return;if(!NIGHT||NIGHT.width!==W){NIGHT=document.createElement('canvas');NIGHT.width=W;NIGHT.height=H;nctx=NIGHT.getContext('2d');}
  const g=nctx,menuish=G.state!=='play'&&G.state!=='over';g.globalCompositeOperation='source-over';g.clearRect(0,0,W,H);g.fillStyle=menuish?'rgba(4,3,12,0.55)':'rgba(3,2,9,0.95)';g.fillRect(0,0,W,H);
  g.globalCompositeOperation='destination-out';
  const hole=(x,y,r,a)=>{if(!(r>=2)||a<=0)return;a=Math.min(1,a);const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(0,0,0,'+a+')');gr.addColorStop(0.5,'rgba(0,0,0,'+(a*0.82)+')');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);};
  if(!menuish){const ca=cursorAim(),fx=ca?G.mx:HW,fy=ca?G.my:HH;
    if(pl.alive&&!pl.spectator){hole(fx,fy,H*0.52,1);hole(fx,fy,H*0.24,1);hole(HW,H+30,H*0.5,0.45);}else hole(HW,HH,H*0.8,0.6);
    if(pl.muzzle>0)hole(HW,HH,W*0.7,0.6);
    const lit=(x,y,z,rad,a)=>{const p=proj(x,y,z);if(!p)return;const col=Math.round(p.x);if(col>=0&&col<W&&p.d>zbuf[col]+0.4)a*=0.3;hole(p.x,p.y,Math.min(W*0.6,Math.max(6,rad*p.unit)),a);};
    for(const f of fires)lit(f.x,f.y,0.3,1.9,0.8+0.12*Math.sin(G.t*13+f.seed));
    for(const b of booms)lit(b.x,b.y,0.3,b.size*2,0.9*(1-b.t/b.dur));
    for(const r of NET.remotes.values()){if(!r.al||(NET.mode==='pvp'&&!r.fighter))continue;lit(r.x+Math.cos(r.a)*1.3,r.y+Math.sin(r.a)*1.3,0.2,1.3,0.5);if(r.flashT>0)lit(r.x,r.y,0.5,3,0.8);}
    for(const p of projs)if(p.k==='rocket'||p.k==='molo')lit(p.x,p.y,p.z,p.k==='rocket'?1.2:0.5,0.8);}
  else hole(HW,HH*0.9,W*0.7,0.5);
  ctx.drawImage(NIGHT,0,0);}
function drawTongue(z){let ex=z.ax,ey=z.ay,ez=0.45;if(pl.st&&pl.st.zid===z.id){ex=pl.x;ey=pl.y;ez=eyeZ()-0.22;}
  const sz=(z.zh||0)+0.55*0.8*z.scale,n=16;for(let i=1;i<=n;i++){const f=i/n;drawBlob(z.x+(ex-z.x)*f,z.y+(ey-z.y)*f,sz+(ez-sz)*f-Math.sin(f*Math.PI)*0.08,0.035,TONGUE[i%2],3);}}
function drawPool(x,y,t,id){for(let i=0;i<9;i++){const a=i*0.7+id,rr=(i%3)*0.33+0.12;drawBlob(x+Math.cos(a)*rr,y+Math.sin(a)*rr*0.9,0.01,0.16+((i*7)%3)*0.03,PAL_GOO[i%2],14);}
  const b=(G.t*1.5+id*0.37)%1;drawBlob(x+Math.cos(id)*0.3,y+Math.sin(id)*0.3,0.02+b*0.15,0.05,PAL_GOO[2],6);}
function drawScope(){const r=Math.round(H*0.47);ctx.fillStyle='#050305';ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(HW,HH,r,0,Math.PI*2,true);ctx.fill();
  ctx.fillStyle='rgba(80,200,220,0.07)';ctx.beginPath();ctx.arc(HW,HH,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#050305';ctx.lineWidth=4;ctx.beginPath();ctx.arc(HW,HH,r,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#050305';ctx.fillRect(HW-r,HH,r-6,1);ctx.fillRect(HW+6,HH,r-6,1);ctx.fillRect(HW,HH-r,1,r-6);ctx.fillRect(HW,HH+6,1,r-6);
  ctx.fillRect(HW-r,HH-1,Math.round(r*0.55),3);ctx.fillRect(HW+Math.round(r*0.45),HH-1,Math.round(r*0.55),3);ctx.fillRect(HW-1,HH+Math.round(r*0.45),3,Math.round(r*0.55));
  for(let i=1;i<=4;i++){ctx.fillRect(HW+i*10,HH-2,1,5);ctx.fillRect(HW-i*10,HH-2,1,5);ctx.fillRect(HW-2,HH+i*10,5,1);}
  ctx.fillStyle='#ff3a2a';ctx.fillRect(HW,HH,1,1);
  const d=castT(pl.x,pl.y,Math.cos(pl.a),Math.sin(pl.a));txt(G.zl===2?'6X':'3X',HW+r-30,HH+r-30,'#9be05a');txt(Math.round(d*3)+'M',HW-r+18,HH+r-30,'#9be05a');
  if(G.hitMark>0){ctx.fillStyle='#ff4a3a';ctx.fillRect(HW-6,HH-6,3,1);ctx.fillRect(HW+4,HH-6,3,1);ctx.fillRect(HW-6,HH+6,3,1);ctx.fillRect(HW+4,HH+6,3,1);}}
function drawRemote(r){const set=getSold(r.sk||0,colorOf(r.peer));let s;const vw=viewOf(r.x,r.y,r.a||0),front=vw!==2,sd=vw===1||vw===3;
  if(!r.al)s=(sd?set.dieS:set.die)[Math.min(5,(r.deadT/0.09)|0)];
  else{if(r.sp&&((G.t*12)|0)%2)return;s=r.dn?(sd?set.downS:set.downF):r.cr?(sd?set.crouchS:set.crouch[front?0:1]):(vw===0?set.front:vw===2?set.back:set.side)[((r.anim|0)%2)];
    if(r.flashT>0&&front)drawSpr(FLASH,r.x+Math.cos(r.a)*0.28,r.y+Math.sin(r.a)*0.28,(r.jz||0)+(r.cr?0.16:0.3),0.2);}
  const wz=r.al?(r.jz||0):0;drawSpr(s,r.x,r.y,wz,0.8,r.hitT>0,vw===3,false);
  if(r.al){const p=proj(r.x,r.y,wz+(r.dn?0.45:r.cr?0.62:0.8));if(p&&p.d<14&&p.x>=0&&p.x<W&&p.d<zbuf[Math.max(0,Math.min(W-1,Math.round(p.x)))])G.tags.push({x:p.x,y:p.y,d:p.d,r});}}
function drawTag(t){const r=t.r,col=TEAMS[colorOf(r.peer)][0];txt(r.nick,Math.round(t.x),Math.round(t.y)-12,col,'center');if(window.KMA&&r.lv)KMA.drawRank(ctx,r.lv,Math.round(t.x-r.nick.length*4-15),Math.round(t.y)-13,1);
  if(r.dn){if(((G.t*3)|0)%2===0)txt('TOLONG!',Math.round(t.x),Math.round(t.y)-24,'#ff4a3a','center');let pr=G.revTarget===r.peer?G.revT/3:0;for(const o of NET.remotes.values())if(o.rv===r.peer)pr=Math.max(pr,o.rvp/100);
    if(pr>0){const w=30,x=Math.round(t.x-w/2),y=Math.round(t.y)+2;ctx.fillStyle=OUT;ctx.fillRect(x-1,y-1,w+2,5);ctx.fillStyle='#7fdc4a';ctx.fillRect(x,y,Math.round(w*pr),3);}}
  {const st=G.stk.get(r.peer);if(st)drawBubble(t.x,t.y-16,st.i,st.t,clamp(Math.round(48/Math.max(0.5,t.d)),14,26));}
  if(NET.mode==='coop'){const w=20,x=Math.round(t.x-w/2),y=Math.round(t.y)-3;ctx.fillStyle=OUT;ctx.fillRect(x-1,y-1,w+2,4);ctx.fillStyle=r.hp>50?'#7fdc4a':r.hp>25?'#ffc93a':'#ff3a2a';ctx.fillRect(x,y,Math.round(w*r.hp/100),2);}}
function drawWeapon(){const dualV=pl.wpn==='kriss'&&pl.dualOn,s=dualV?WSPR.krissD:WSPR[pl.wpn],bob=Math.sin(pl.bobT)*3*pl.bobAmt,bx=Math.cos(pl.bobT*0.5)*4*pl.bobAmt,sw=G.swapT>0?(G.swapT/0.25)*44:0;
  let rl=0,rx=0;if(pl.reload>0){const p=1-pl.reload/pl.reloadMax,c=Math.sin(Math.min(1,p)*Math.PI);rl=c*34;rx=c*14;}
  const x=Math.round(HW-48+24+bx+pl.sway+rx+(cursorAim()?(G.mx-HW)*0.12:0)),y=Math.round(H-72+10+Math.abs(bob)+pl.kick*7+sw+rl-pl.vz*2.5+pl.cr*8+(pl.down?26+Math.sin(G.t*3)*3:0));
  if(pl.swingT>0||pl.wpn==='parang'){const sv=pl.swingT>0,p=sv?1-pl.swingT/0.32:0,ang=sv?(p<0.25?0.55*p/0.25:0.55-2.1*((p-0.25)/0.75)):0,ox=sv?(p<0.25?18*p/0.25:18-96*((p-0.25)/0.75)):0,oy=sv?-12*Math.sin(p*Math.PI):0;
    if(sv&&pl.swingQ&&pl.wpn!=='parang')ctx.drawImage(s.cv,x,y+46);
    ctx.save();ctx.translate(x+76+ox,y+80+oy);ctx.rotate(ang);ctx.scale(1.3,1.3);ctx.drawImage(WSPR.parang.cv,-70,-72);ctx.restore();
    if(sv&&p>0.22&&p<0.7){ctx.strokeStyle='rgba(255,246,224,'+(0.5-Math.abs(p-0.45))+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(HW+24,H+16,118,-2.5,-0.85);ctx.stroke();}
    return;}
  if(pl.muzzle>0){const m=dualV?MUZ[pl.dualSide?'krissL':'krissR']:MUZ[pl.wpn],k=pl.wpn==='sg'||pl.wpn==='rl'?1.5:1;ctx.drawImage(FLASH.cv,Math.round(x+m[0]-16*k),Math.round(y+m[1]-18*k),Math.round(32*k),Math.round(32*k));}
  ctx.drawImage(s.cv,x,y);
  for(const sh of shells){ctx.fillStyle=OUT;const px=Math.round(x+62+sh.x),py=Math.round(y+30+sh.y);ctx.fillRect(px-1,py-1,sh.rot?5:4,sh.rot?4:5);ctx.fillStyle='#e8c25a';ctx.fillRect(px,py,sh.rot?3:2,sh.rot?2:3);}}
function drawEdges(){const ex=G.mx/W,ey=G.my/H;ctx.fillStyle='rgba(255,178,62,0.55)';
  const tri=(x,y,dx,dy)=>{ctx.beginPath();ctx.moveTo(x+dx*6,y+dy*6);ctx.lineTo(x-dy*5,y+dx*5);ctx.lineTo(x+dy*5,y-dx*5);ctx.closePath();ctx.fill();};
  if(ex<0.1)tri(8,HH,-1,0);if(ex>0.9)tri(W-8,HH,1,0);if(ey<0.1)tri(HW,10,0,-1);if(ey>0.9)tri(HW,H-10,0,1);}
function drawCross(){const ca=cursorAim();if(ca)drawEdges();const cx=ca?Math.round(G.mx):HW,cy=ca?Math.round(G.my):HH,col=G.hitMark>0?'#ff4a3a':'#fff6e0';
  ctx.fillStyle=OUT;for(const[x,y,w,h]of[[cx-7,cy-1,5,3],[cx+3,cy-1,5,3],[cx-1,cy-7,3,5],[cx-1,cy+3,3,5]])ctx.fillRect(x,y,w,h);
  ctx.fillStyle=col;for(const[x,y,w,h]of[[cx-6,cy,3,1],[cx+4,cy,3,1],[cx,cy-6,1,3],[cx,cy+4,1,3]])ctx.fillRect(x,y,w,h);
  const w=pl.wpn;
  if(pl.reload>0){const p=1-pl.reload/pl.reloadMax;ctx.fillStyle=OUT;ctx.fillRect(cx-17,cy+12,34,5);ctx.fillStyle='#3a2a32';ctx.fillRect(cx-16,cy+13,32,3);
    ctx.fillStyle='#ffb23e';ctx.fillRect(cx-16,cy+13,Math.round(32*p),3);}}
function hpBar(x,y){const segs=10,filled=Math.ceil(pl.hp/pl.maxhp*segs),blink=((G.t*6)|0)%2===0;
  ctx.fillStyle=OUT;ctx.fillRect(x-1,y-1,segs*6+1,9);
  for(let i=0;i<segs;i++){ctx.fillStyle=i<filled?(filled<=3?(blink?'#ff3a2a':'#a81e16'):filled<=6?'#ffc93a':'#7fdc4a'):'#3a2a32';ctx.fillRect(x+i*6,y,5,7);
    if(i<filled){ctx.fillStyle='rgba(255,255,255,0.45)';ctx.fillRect(x+i*6,y,5,1);}}
  txt('DARAH',x+segs*6+4,y,'#d8c9b6');}
function fmtTime(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
const ZCOL={boss:'#ff2a6a',walk:'#ff4a3a',run:'#ff4a3a',fat:'#9be05a',brute:'#c08aff',witch:'#ffffff',hunter:'#ffb23e',smoker:'#ffb23e',charger:'#ffb23e',jockey:'#ffb23e',spitter:'#ffb23e'};
function drawMinimap(x0,y0,S){const sc=3.4,R=S/2,cx=x0+R,cy=y0+R;
  ctx.save();ctx.beginPath();ctx.rect(x0,y0,S,S);ctx.clip();ctx.fillStyle='rgba(14,9,17,0.74)';ctx.fillRect(x0,y0,S,S);
  ctx.translate(cx,cy);ctx.rotate(-Math.PI/2-pl.a);ctx.translate(-pl.x*sc,-pl.y*sc);
  const rr=Math.ceil(R/sc*1.5),px=Math.floor(pl.x),py=Math.floor(pl.y);ctx.fillStyle='#7a6a80';
  for(let y=py-rr;y<=py+rr;y++)for(let x=px-rr;x<=px+rr;x++)if(x>=0&&y>=0&&x<MW&&y<MH&&map[y*MW+x]>=0)ctx.fillRect(x*sc,y*sc,sc+0.4,sc+0.4);
  ctx.fillStyle='#ffe14a';for(const p of(NET.mode==='pvp'?pvpPickList():picks))ctx.fillRect(p.x*sc-1,p.y*sc-1,2,2);
  for(const f of fires){ctx.fillStyle=((G.t*6)|0)%2?'#ff9a1f':'#e0401a';ctx.fillRect(f.x*sc-2,f.y*sc-2,4,4);}
  for(const pg of G.pings.values()){const k=2+Math.abs(Math.sin(G.t*6))*2;ctx.strokeStyle=pg.kind===1?'#ff4a3a':pg.col;ctx.lineWidth=1;ctx.strokeRect(pg.x*sc-k,pg.y*sc-k,k*2,k*2);}
  if(NET.mode!=='pvp')for(const z of zs){if(z.dead||z.idle)continue;if(G.night&&Math.hypot(z.x-pl.x,z.y-pl.y)>7)continue;const s=z.type==='boss'?4.6:z.type==='brute'||z.type==='witch'?3.4:2.4;ctx.fillStyle=ZCOL[z.type]||'#ff4a3a';ctx.fillRect(z.x*sc-s/2,z.y*sc-s/2,s,s);}
  if(NET.mode==='coop')for(const r of NET.remotes.values()){if(!r.al)continue;ctx.fillStyle=TEAMS[colorOf(r.peer)][0];ctx.fillRect(r.x*sc-1.5,r.y*sc-1.5,3,3);}
  ctx.restore();
  ctx.fillStyle='#9be05a';ctx.beginPath();ctx.moveTo(cx,cy-4);ctx.lineTo(cx+3,cy+3);ctx.lineTo(cx-3,cy+3);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#46304e';ctx.lineWidth=1;ctx.strokeRect(x0+0.5,y0+0.5,S-1,S-1);}
const HEART=['.##.##.','#######','#######','.#####.','..###..','...#...'];
function drawLives(x,y){for(let i=0;i<pl.lives;i++){const ox=x+i*9;ctx.fillStyle=OUT;ctx.fillRect(ox-1,y-1,9,8);
  HEART.forEach((row,j)=>{for(let k=0;k<7;k++)if(row[k]==='#'){ctx.fillStyle=j===1&&k<3?'#c6ff9a':'#4fd84a';ctx.fillRect(ox+k,y+j,1,1);}});}}
function drawBubble(x,y,i,t,s){const sp=t<0.15?0.6+t/0.15*0.4:1,fade=t>2.6?Math.max(0,(3-t)/0.4):1;if(fade<=0)return;ctx.globalAlpha=fade;
  const w=Math.round((s+8)*sp);x=Math.round(x-w/2);y=Math.round(y-w);
  ctx.fillStyle=OUT;ctx.fillRect(x-1,y-1,w+2,w+2);ctx.fillStyle='#fff6e0';ctx.fillRect(x,y,w,w);
  const mx=x+(w>>1);ctx.fillStyle=OUT;ctx.fillRect(mx-3,y+w,6,2);ctx.fillRect(mx-1,y+w+2,2,1);ctx.fillStyle='#fff6e0';ctx.fillRect(mx-2,y+w,4,1);ctx.fillRect(mx-1,y+w+1,2,1);
  ctx.drawImage(STK[i].spr.cv,Math.round(x+4*sp),Math.round(y+4*sp),Math.round(s*sp),Math.round(s*sp));ctx.globalAlpha=1;}
function drawFeed(y){for(const f of G.feed){const a=f.t>4?Math.max(0,(5-f.t)):1;ctx.globalAlpha=a;ctx.fillStyle='rgba(14,9,17,0.7)';ctx.fillRect(6,y-2,22+(f.nm.length+1+STK[f.i].name.length)*8,13);
  ctx.drawImage(STK[f.i].spr.cv,8,y-1,11,11);txt(f.nm,22,y,f.col);txt(STK[f.i].name,24+f.nm.length*8,y,'#fff6e0');ctx.globalAlpha=1;y+=14;}}
function drawHUD(){
  const blink=((G.t*6)|0)%2===0;
  if(G.state==='play')drawMinimap(6,30,58);
  G.feedY=94;
  if(NET.mode==='pvp'){const sc=pvpScore(),opp=sc.oppR;
    txt('KILL',8,6,'#ffb23e');txt(String(sc.me),48,6,'#fff6e0');hpBar(8,17);
    const tl=NET.pv.ph==='count'?300:NET.pv.tl;txt(fmtTime(tl),HW,6,tl<=30&&NET.pv.ph==='live'&&blink?'#ff4a3a':'#fff6e0','center');
    if(!pl.spectator){txt(NET.nick+' '+sc.me,HW-6,17,TEAMS[colorOf(NET.me)][0],'right');txt(':',HW,17,'#fff6e0','center');txt((opp?sc.opp+' '+opp.nick:'-'),HW+6,17,opp?TEAMS[colorOf(opp.peer)][0]:'#a8939f');}
    else{const f=[...NET.remotes.values()].filter(r=>r.fighter);if(f.length===2)txt(f[0].nick+' '+f[1].d+' : '+f[0].d+' '+f[1].nick,HW,17,'#fff6e0','center');txt('MENONTON',HW,30,'#9be05a','center');}
  }else{
    txt('1UP',8,6,'#ffb23e');txt(String(pl.score).padStart(8,'0'),38,6,'#fff6e0');hpBar(8,17);if(NET.mode==='solo')drawLives(108,6);
    if(pl.armor>0){ctx.fillStyle=OUT;ctx.fillRect(7,25,61,4);ctx.fillStyle='#4fa8ff';ctx.fillRect(8,26,Math.round(59*pl.armor/100),2);}
    txt('UANG '+pl.cash,W-8,42,'#ffe14a','right');
    if(G.breakT>0)txt('GELOMBANG BERIKUT '+Math.ceil(G.breakT),HW,6,'#9be05a','center');
    else{txt('GELOMBANG '+G.wave,HW,6,'#fff6e0','center');txt('SISA '+G.remain,HW,16,'#9be05a','center');}
    if(NET.mode==='coop'){let y=94;for(const r of NET.remotes.values()){ctx.fillStyle=OUT;ctx.fillRect(7,y-1,7,7);ctx.fillStyle=TEAMS[colorOf(r.peer)][0];ctx.fillRect(8,y,5,5);
      txt(r.nick,18,y-1,r.al?'#d8c9b6':'#7a6a72');if(!r.al)txt('TUMBANG',102,y-1,'#ff4a3a');else if(r.dn)txt('JATUH',102,y-1,((G.t*4)|0)%2?'#ff4a3a':'#ffb23e');y+=11;}}
    if(NET.mode==='coop')G.feedY=94+NET.remotes.size*11+4;
  }
  const bx=W-126;ctx.fillStyle=OUT;ctx.fillRect(bx,4,120,24);ctx.fillStyle='#2a1c30';ctx.fillRect(bx+1,5,62,22);ctx.fillRect(bx+65,5,54,22);
  txt('SENJATA',bx+4,7,'#ffb23e');txt('LEMPAR',bx+68,7,'#ffb23e');
  const w=pl.wpn,dual=w==='kriss'&&pl.dualOn,am=w==='parang'?'--':dual?'DUAL '+pl.dualMag:pl.mag[w]+'/'+(w==='pistol'?'--':pl.ammo[w]);txt(am,bx+32,17,dual?'#c8a2ff':(pl.mag[w]<=Math.ceil(MAG[w]/4)&&blink?'#ff4a3a':'#fff6e0'),'center');
  ctx.drawImage(NADE.cv,bx+68,16,7,8);txt(String(pl.nades),bx+77,17,pl.nades===0?'#7a6a72':'#fff6e0');ctx.drawImage(MOLO.cv,bx+94,15,6,9);txt(String(pl.molos),bx+102,17,pl.molos===0?'#7a6a72':'#fff6e0');
  txt(dual?'DUAL KRISS':w==='kriss'&&pl.dual>0?'KRISS · DUAL x'+pl.dual:WEAP[w].name,W-8,31,dual?'#c8a2ff':'#ffd27a','right');
  if(online()){drawFeed(G.feedY||94);const me=G.stk.get(NET.me);if(me)drawBubble(W-44,HH+6,me.i,me.t,26);}
  for(let i=0;i<G.pops.length;i++){const p=G.pops[i];txt(p.text,HW+26,HH-18-i*10-p.t*12,p.col);}
  if(G.state==='play'){const bi=bossInfo();if(bi){const bw=Math.min(200,W-170),bxx=Math.round(HW-bw/2),by=30;txt('RAJA ZOMBI',HW,by,bi[2].enr?(((G.t*4)|0)%2?'#ff4a3a':'#ffb23e'):'#ff8aa8','center');
      ctx.fillStyle=OUT;ctx.fillRect(bxx-1,by+10,bw+2,7);ctx.fillStyle='#3a2a32';ctx.fillRect(bxx,by+11,bw,5);ctx.fillStyle='#d8322a';ctx.fillRect(bxx,by+11,Math.round(bw*clamp(bi[0]/bi[1],0,1)),5);ctx.fillStyle='#ff8a7a';ctx.fillRect(bxx,by+11,Math.round(bw*clamp(bi[0]/bi[1],0,1)),1);}
    if(pl.down&&pl.alive){txt('SEKARAT',HW,HH+25,((G.t*3)|0)%2?'#ff4a3a':'#ffb08a','center');const bw=110,x=HW-55;ctx.fillStyle=OUT;ctx.fillRect(x-1,HH+35,bw+2,6);ctx.fillStyle='#a81e16';ctx.fillRect(x,HH+36,Math.round(bw*clamp(pl.hp/100,0,1)),4);
      const rv=myReviver();txt(rv?rv.nick+' MENOLONGMU '+rv.rvp+'%':'TEMBAK PAKAI PISTOL · TUNGGU TEMAN',HW,HH+46,rv?'#7fdc4a':'#ffb08a','center');}
    else if(G.revNear){txt(G.revT>0?'MENOLONG '+G.revNear.nick+'…':(isTouch?'TAHAN TOMBOL TOLONG':'TAHAN E UNTUK MENOLONG ')+(G.revT>0?'':G.revNear.nick),HW,HH+30,'#7fdc4a','center');
      if(G.revT>0){const bw=80,x=HW-40;ctx.fillStyle=OUT;ctx.fillRect(x-1,HH+41,bw+2,6);ctx.fillStyle='#7fdc4a';ctx.fillRect(x,HH+42,Math.round(bw*G.revT/3),4);}}
    else if(shopAvail()&&!G.shopOpen&&((G.t*2)|0)%2===0)txt(isTouch?'KETUK TOMBOL TOKO UNTUK BELANJA':'TEKAN B UNTUK BUKA TOKO',HW,HH+30,'#ffe14a','center');
    if(NET.mode==='pvp'&&NET.pv.ph==='count'&&!pl.spectator)big(String(Math.max(1,Math.ceil(NET.pv.ct))),32,'fire',HW,HH-10,1+(NET.pv.ct%1)*0.4);
    if(!pl.alive&&NET.mode==='pvp')big('BANGKIT DALAM '+Math.max(1,Math.ceil(pl.respawnT)),8,'bone',HW,HH+30);
    if(!pl.alive&&NET.mode==='coop')big('MENUNGGU GELOMBANG BERIKUTNYA',8,'bone',HW,HH+30);
    if(pl.spawnProt>0&&pl.alive&&!pl.down)txt('PERLINDUNGAN',HW,HH+28,'#7fb0ff','center');
    if(pl.st&&((G.t*4)|0)%2===0){const m={pin:'DITERKAM! TEMBAK PEMBURUNYA!',pull:'DITARIK LIDAH! TEMBAK DIA!',ride:'DITUNGGANGI! LOMPAT '+Math.max(1,3-pl.st.j)+'X'}[pl.st.k];if(m)big(m,8,'blood',HW,HH+44);}}
}
function drawBanners(){for(const b of G.banners){const t=b.t,pp=t<0.18?1.7-t/0.18*0.7:1,fade=b.dur-t<0.3?(b.dur-t)/0.3:1;if(fade<=0)continue;
  ctx.globalAlpha=fade;if(b.kind==='big')big(b.text,16,'fire',HW,70,pp);else if(b.kind==='sub')big(b.text,8,'bone',HW,94,pp);else big(b.text,16,'toxic',HW,50,pp);ctx.globalAlpha=1;}}
function drawShowroom(){ctx.fillStyle='rgba(10,6,12,0.72)';ctx.fillRect(0,0,W,H);
  const side=!menuEl.hidden&&getComputedStyle(menuEl).position==='absolute',cx=side?Math.round(W*0.27):HW,base=190;
  const gr=ctx.createRadialGradient(cx,base-40,6,cx,base-40,96);gr.addColorStop(0,'rgba(255,178,62,0.28)');gr.addColorStop(1,'rgba(255,178,62,0)');ctx.fillStyle=gr;ctx.fillRect(cx-110,base-140,220,170);
  for(let i=0;i<8;i++){const w=Math.round(46*Math.sqrt(1-Math.pow((i-3.5)/4,2)));ctx.fillStyle=i<3?'#46304e':'#2a1c30';ctx.fillRect(cx-w,base-3+i,w*2,1);}
  ctx.fillStyle='#ffb23e';ctx.fillRect(cx-40,base-1,80,1);
  const set=getSold(G.showSkin,0),ph=(G.t*0.55)%(Math.PI*2),vi=Math.floor((ph+Math.PI/4)/(Math.PI/2))%4,fr=((G.t*(vi%2?3:1.5))|0)%2;
  const spr=vi===0?set.front[fr]:vi===2?set.back[fr]:set.side[fr],sc=2.8,w=40*sc,h=48*sc;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(cx,base);if(vi===3)ctx.scale(-1,1);ctx.drawImage(spr.cv,-w/2,-h+3,w,h);ctx.restore();
  big(cleanNick(sNick.value||G.nick),16,'fire',cx,20);txt('SKIN: '+SKINS[G.showSkin].name,cx,34,'#9be05a','center');}
function drawTitle(){ctx.fillStyle='rgba(18,10,16,0.45)';ctx.fillRect(0,0,W,H);
  const side=!menuEl.hidden&&getComputedStyle(menuEl).position==='absolute';
  if(side){const x=W*0.26;big('KOTA',32,'fire',x,58+Math.sin(G.t*2)*2);big('MATI',32,'blood',x,96+Math.sin(G.t*2+0.5)*2);
    txt('SOLO · CO-OP · PVP',x,124,'#9be05a','center');txt('REKOR '+String(G.best).padStart(8,'0'),x,140,'#ffb23e','center');txt('MAP: '+MAP.name,x,156,'#d8c9d4','center');}
  else{big('KOTA MATI',32,'fire',HW,62+Math.sin(G.t*2)*2);txt('BERTAHAN DARI GELOMBANG ZOMBI',HW,96,'#9be05a','center');
    txt('PILIH MODE DI BAWAH LAYAR',HW,124,'#fff6e0','center');txt('MAP: '+MAP.name,HW,138,'#d8c9d4','center');txt('REKOR '+String(G.best).padStart(8,'0'),HW,150,'#ffb23e','center');}}
function drawPause(){ctx.fillStyle='rgba(18,10,16,0.55)';ctx.fillRect(0,0,W,H);
  big(G.paused?'JEDA':'SIAP?',24,'bone',HW,84);
  if(((G.t*2)|0)%2===0)txt(isTouch?'SENTUH UNTUK LANJUT':'KLIK LAYAR UNTUK MAIN',HW,112,'#fff6e0','center');
  if(online())txt('PERMAINAN ONLINE TETAP BERJALAN',HW,128,'#ffb08a','center');}
function drawOver(){ctx.fillStyle='rgba(18,10,16,'+Math.min(0.72,G.overT*0.8)+')';ctx.fillRect(0,0,W,H);
  if(G.expRes&&G.overT>0.4&&window.KMA){const r=G.expRes;if(r.pending)txt('MENGHITUNG EXP…',HW,30,'#a8939f','center');else{const t='+'+r.gained+' EXP · '+r.after.name+' LV '+r.after.lv,w=t.length*8+16,x0=Math.round(HW-w/2);
    KMA.drawRank(ctx,r.after.lv,x0,28,1);txt(t,x0+16,30,r.up?'#ffe14a':'#9be05a');if(r.up&&((G.t*3)|0)%2===0)txt('NAIK PANGKAT!',HW,16,'#ffe14a','center');const bw=Math.min(160,W-60),bx=Math.round(HW-bw/2);ctx.fillStyle=OUT;ctx.fillRect(bx-1,40,bw+2,4);ctx.fillStyle='#ffb23e';ctx.fillRect(bx,41,Math.round(bw*r.after.prog),2);}}
  const pp=G.overT<0.25?1.8-G.overT/0.25*0.8:1,blinkOn=G.overT>1.2&&((G.t*2)|0)%2===0;
  if(NET.mode==='pvp'){const s=pvpScore(),opp=s.oppR;
    if(pl.spectator){const f=[...NET.remotes.values()].filter(r=>r.fighter);big('PERTANDINGAN SELESAI',16,'bone',HW,64,pp);if(f.length===2)txt(f[0].nick+' '+f[1].d+' : '+f[0].d+' '+f[1].nick,HW,96,'#fff6e0','center');}
    else{const res=s.me>s.opp?'MENANG!':s.me<s.opp?'KALAH':'SERI';big(res,24,s.me>s.opp?'fire':s.me<s.opp?'blood':'bone',HW,58,pp);
      txt(NET.forfeit?'LAWAN KELUAR':'WAKTU HABIS',HW,82,'#ffb08a','center');
      txt(NET.nick+'  '+s.me+'  :  '+s.opp+'  '+(opp?opp.nick:'?'),HW,100,'#fff6e0','center');}
    if(blinkOn)big(NET.host?(isTouch?'SENTUH UNTUK TANDING ULANG':'KLIK UNTUK TANDING ULANG'):'MENUNGGU HOST…',8,'bone',HW,150);
    return;}
  big('GAME OVER',24,'blood',HW,58,pp);
  if(NET.mode==='coop'){txt('TIM BERTAHAN SAMPAI GELOMBANG '+G.wave,HW,84,'#9be05a','center');
    const rows=[[NET.nick,pl.score,NET.me,G.kills,G.hs,G.revs]].concat([...NET.remotes.values()].map(r=>[r.nick,r.sc,r.peer,(r.stt||[])[0]|0,(r.stt||[])[1]|0,(r.stt||[])[2]|0]));rows.sort((a,b)=>b[1]-a[1]);
    const mvp=rows.reduce((m,r)=>r[3]>m[3]?r:m,rows[0]);const cx=[HW-116,HW+10,HW+44,HW+86,HW+136];
    txt('NAMA',cx[0],98,'#a8939f');txt('KILL',cx[1],98,'#a8939f','right');txt('HS',cx[2],98,'#a8939f','right');txt('TOLONG',cx[3],98,'#a8939f','right');txt('SKOR',cx[4],98,'#a8939f','right');
    rows.slice(0,4).forEach((r,i)=>{const y=110+i*11;txt(r[0],cx[0],y,TEAMS[colorOf(r[2])][0]);txt(String(r[3]),cx[1],y,'#fff6e0','right');txt(String(r[4]),cx[2],y,'#fff6e0','right');txt(String(r[5]),cx[3],y,'#fff6e0','right');txt(String(r[1]),cx[4],y,'#fff6e0','right');});
    if(rows.length>1&&mvp[3]>0)txt('MVP: '+mvp[0]+' · '+mvp[3]+' KILL',HW,153,'#ffe14a','center');
    if(blinkOn)big(NET.host?(isTouch?'SENTUH UNTUK MAIN LAGI':'KLIK UNTUK MAIN LAGI'):'MENUNGGU HOST…',8,'bone',HW,166);return;}
  txt('SKOR   '+String(pl.score).padStart(8,'0'),HW,90,'#fff6e0','center');
  txt('GELOMBANG '+G.wave+'   ZOMBI '+G.kills,HW,104,'#9be05a','center');
  txt('HEADSHOT '+G.hs+'   AKURASI '+(G.shots?Math.round(G.hits/G.shots*100):0)+'%',HW,118,'#d8c9b6','center');
  txt((pl.score>=G.best&&pl.score>0?'REKOR BARU! ':'REKOR ')+String(G.best).padStart(8,'0'),HW,132,'#ffb23e','center');
  if(blinkOn)big(isTouch?'SENTUH UNTUK MAIN LAGI':'KLIK UNTUK MAIN LAGI',8,'bone',HW,156);}

/* ================= input ================= */
function lockPointer(){if(isTouch)return;try{const p=cv.requestPointerLock&&cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
function onCanvasPrimary(){initAudio();
  if(G.state==='play'&&(G.paused||G.needClick)){G.paused=false;G.needClick=false;lockPointer();return true;}
  if(G.state==='over'&&G.overT>1.2){if(NET.mode==='solo')startSolo();else if(NET.host)hostStart();return true;}
  return G.state!=='play';}
function releaseInputs(){G.fireHeld=false;G.firePid=null;G.useHeld=false;G.usePid=null;G.turnId=null;stick.id=null;stick.x=stick.y=0;try{knob.style.transform='';}catch(e){}for(const k in keys)keys[k]=false;}
function pause(){if(G.state!=='play')return;G.paused=true;releaseInputs();}
document.addEventListener('pointerlockchange',()=>{const l=document.pointerLockElement===cv;if(l){G.locked=true;G.needClick=false;}else{if(G.locked&&G.state==='play'&&!G.shopOpen)pause();G.locked=false;}});
addEventListener('keydown',e=>{const tg=e.target;if(tg&&tg.tagName==='INPUT')return;
  if(tg&&tg.tagName==='BUTTON'){const inUI=!menuEl.hidden||G.shopOpen||G.hudEdit||(!pauseBox.hidden&&pauseBox.contains(tg));
    if(G.state==='play'&&!inUI){tg.blur();if(e.code==='Space'||e.code==='Enter')e.preventDefault();}else if(e.code==='Space'||e.code==='Enter')return;}
  const k=e.code;
  if(k==='KeyT'&&online()&&(G.state==='play'||G.state==='over')){toggleStickers();e.preventDefault();return;}
  if(G.stkOpen&&/^Digit[1-8]$/.test(k)){sendSticker(+k.slice(5)-1);e.preventDefault();return;}
  if(G.shopOpen){if(/^Digit[0-9]$/.test(k)||k==='Minus'){const ch=k==='Minus'?'-':k.slice(5);buyItem(SHOPKEY.indexOf(ch));e.preventDefault();return;}if(k==='KeyB'||k==='Escape'){openShop(false);e.preventDefault();return;}}
  if(G.state==='play'&&!G.paused){if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ControlLeft','ControlRight'].includes(k)||e.ctrlKey)e.preventDefault();
    keys[k]=true;if(k==='Space'&&!e.repeat)jump();if(k==='KeyG')throwNade();if(k==='KeyR')startReload();if(k==='KeyZ')toggleScope();if(k==='KeyV')quickMelee();if(k==='KeyX')throwMolo();if(k==='KeyQ'&&!e.repeat)sendPing();if(k==='KeyB'&&!e.repeat)openShop(true);if(k==='Digit6')setWpn('parang');if(k==='Digit7'&&hasAmmo('kriss'))setWpn('kriss');if(k==='Digit5'&&hasAmmo('awp'))setWpn('awp');if(k==='Digit1')setWpn('pistol');
    if(k==='Digit2'&&hasAmmo('mg'))setWpn('mg');if(k==='Digit3'&&hasAmmo('sg'))setWpn('sg');if(k==='Digit4'&&hasAmmo('rl'))setWpn('rl');
    if(k==='KeyP')pause();}
  else if(G.state==='play'&&G.paused&&k==='KeyP'){G.paused=false;lockPointer();}
  if(k==='KeyM')setMuted(!muted);});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{releaseInputs();pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseInputs();pause();}});
cv.addEventListener('pointerdown',e=>{if(G.hudEdit){e.preventDefault();return;}try{cv.focus({preventScroll:true});}catch(_){}
  if(e.pointerType==='mouse'){const r=cv.getBoundingClientRect();G.mx=clamp((e.clientX-r.left)/r.width*W,0,W-1);G.my=clamp((e.clientY-r.top)/r.height*H,0,H-1);G.min=true;}
  e.preventDefault();if(onCanvasPrimary())return;
  if(e.pointerType==='mouse'){if(G.shopOpen){openShop(false);return;}if(e.button===0){G.fireHeld=true;if(!G.locked)lockPointer();}else if(e.button===2)toggleScope();else if(e.button===1){sendPing();}}
  else if(G.turnId==null){G.turnId=e.pointerId;G.turnX=e.clientX;G.turnY=e.clientY;try{cv.setPointerCapture(e.pointerId);}catch(_){}}});
cv.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'){if(e.pointerId===G.turnId){const dx=e.clientX-G.turnX,dy=e.clientY-G.turnY;G.turnX=e.clientX;G.turnY=e.clientY;turnBy(dx*0.0075*SET.sens,-dy*1.1*SET.sens);}return;}
  const r=cv.getBoundingClientRect();G.mx=clamp((e.clientX-r.left)/r.width*W,0,W-1);G.my=clamp((e.clientY-r.top)/r.height*H,0,H-1);G.min=true;
  if(!G.locked&&ZK>1.3)turnBy((e.movementX||0)*0.004,-(e.movementY||0)*0.8);});
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')G.min=false;});
const endTurn=e=>{if(e.pointerId===G.turnId)G.turnId=null;};cv.addEventListener('pointerup',endTurn);cv.addEventListener('pointercancel',endTurn);
addEventListener('mouseup',e=>{if(e.button===0)G.fireHeld=false;});
document.addEventListener('mousemove',e=>{if(G.locked&&!G.shopOpen)turnBy((e.movementX||0)*0.0024*SET.sens,-(e.movementY||0)*0.5*SET.sens);});
cv.addEventListener('contextmenu',e=>e.preventDefault());cv.addEventListener('auxclick',e=>e.preventDefault());cv.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault();});
cv.addEventListener('wheel',e=>{if(G.state==='play'){e.preventDefault();cycleWeapon(e.deltaY>0?1:-1);}},{passive:false});
const touchEl=document.getElementById('touch'),stickEl=document.getElementById('stick'),knob=document.getElementById('knob'),tAmmo=document.getElementById('tAmmo'),tScope=document.getElementById('tScope'),tCrouch=document.getElementById('tCrouch');
if(isTouch){
  const updStick=e=>{const r=stickEl.getBoundingClientRect();let dx=(e.clientX-(r.left+r.width/2))/(r.width/2),dy=(e.clientY-(r.top+r.height/2))/(r.height/2);
    const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}stick.x=Math.abs(dx)<0.15?0:dx;stick.y=Math.abs(dy)<0.15?0:dy;knob.style.transform=`translate(${dx*r.width*0.3}px,${dy*r.height*0.3}px)`;};
  stickEl.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();if(onCanvasPrimary())return;stick.id=e.pointerId;try{stickEl.setPointerCapture(e.pointerId);}catch(_){}updStick(e);});
  stickEl.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)updStick(e);});
  const endStick=e=>{if(e.pointerId===stick.id){stick.id=null;stick.x=stick.y=0;knob.style.transform='';}};
  stickEl.addEventListener('pointerup',endStick);stickEl.addEventListener('pointercancel',endStick);
  const fireB=document.getElementById('tFire');
  fireB.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();if(onCanvasPrimary())return;G.fireHeld=true;G.firePid=e.pointerId;try{fireB.setPointerCapture(e.pointerId);}catch(_){}});
  for(const ev of['pointerup','pointercancel'])fireB.addEventListener(ev,e=>{if(G.firePid==null||e.pointerId===G.firePid){G.fireHeld=false;G.firePid=null;}});
  const relAll=e=>{const id=e.pointerId;if(id===G.turnId)G.turnId=null;if(id===stick.id)endStick(e);if(id===G.firePid){G.fireHeld=false;G.firePid=null;}if(id===G.usePid){G.useHeld=false;G.usePid=null;}};
  for(const ev of['pointerup','pointercancel'])addEventListener(ev,relAll,true);
  const tap=(id,fn)=>document.getElementById(id).addEventListener('pointerdown',e=>{e.preventDefault();initAudio();fn();});
  tap('tNade',throwNade);tap('tScope',toggleScope);tap('tReload',startReload);tap('tJump',jump);tap('tPause',pause);
  tap('tSwap',()=>{if(G.state==='play')cycleWeapon(1);});tap('tMelee',quickMelee);tap('tMolo',throwMolo);tap('tPing',sendPing);tap('tShop',()=>openShop());
  {const tu=document.getElementById('tUse');tu.addEventListener('pointerdown',e=>{e.preventDefault();G.useHeld=true;G.usePid=e.pointerId;try{tu.setPointerCapture(e.pointerId);}catch(_){}});for(const ev of['pointerup','pointercancel'])tu.addEventListener(ev,()=>{G.useHeld=false;});}tap('tCrouch',()=>{G.touchCrouch=!G.touchCrouch;});
  touchEl.addEventListener('contextmenu',e=>e.preventDefault());}
const pauseBox=document.getElementById('pausebox'),bResume=document.getElementById('bResume');
bResume.addEventListener('click',()=>{G.paused=false;G.needClick=false;lockPointer();});
document.getElementById('bQuit').addEventListener('click',()=>btnExit.click());
/* ---- night / settings / shop UI ---- */
function nightPref(){try{return localStorage.getItem('kotamati-night')==='1';}catch(e){return false;}}
function setNight(v,save){G.night=!!v;applyFog();document.getElementById('bNight').textContent='MODE MALAM: '+(G.night?'NYALA':'MATI');
  document.getElementById('bNight').setAttribute('aria-pressed',String(G.night));if(save){try{localStorage.setItem('kotamati-night',G.night?'1':'0');}catch(e){}}}
document.getElementById('bNight').addEventListener('click',()=>setNight(!G.night,true));
document.getElementById('bNightL').addEventListener('click',()=>{if(NET.host&&G.state==='lobby'){setNight(!G.night,false);renderLobby();sendPresence();}});
const sSens=document.getElementById('sSens'),sMus=document.getElementById('sMus'),sSfx=document.getElementById('sSfx'),sQ=document.getElementById('sQ');let setFrom='main';
function syncSetUI(){try{const g=document.getElementById('sGs');if(g){g.value=HUD.gs;document.getElementById('vGs').textContent=Math.round(HUD.gs*100)+'%';}}catch(e){}sSens.value=SET.sens;document.getElementById('vSens').textContent=SET.sens.toFixed(1)+'x';sMus.value=SET.mus;document.getElementById('vMus').textContent=SET.mus;
  sSfx.value=SET.sfx;document.getElementById('vSfx').textContent=SET.sfx;[...sQ.children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.q===SET.q)));}
sSens.addEventListener('input',()=>{SET.sens=clamp(+sSens.value,0.3,2.5);syncSetUI();saveSet();});
sMus.addEventListener('input',()=>{SET.mus=clamp(+sMus.value|0,0,100);applyVolumes();syncSetUI();saveSet();});
sSfx.addEventListener('input',()=>{SET.sfx=clamp(+sSfx.value|0,0,100);applyVolumes();syncSetUI();saveSet();});
sSfx.addEventListener('change',()=>{initAudio();S.pick();});
[...sQ.children].forEach(b=>b.addEventListener('click',()=>{SET.q=clamp(+b.dataset.q|0,0,2);applyQuality();syncSetUI();saveSet();}));
function openSettings(from){setFrom=from;syncSetUI();showView(vSet);}
document.getElementById('bSet').addEventListener('click',()=>openSettings('main'));
document.getElementById('bSetP').addEventListener('click',()=>{if(G.state==='play'){G.paused=true;openSettings('pause');}});
document.getElementById('bBackSet').addEventListener('click',()=>{if(setFrom==='pause'&&G.state==='play'){showMenu(false);}else showMain();});
const shopEl=document.getElementById('shop'),shopGrid=document.getElementById('shopGrid'),shopCash=document.getElementById('shopCash'),shopSkip=document.getElementById('shopSkip');
SHOP.forEach((it,i)=>{const b=document.createElement('button');b.type='button';b.className='shb';const n=document.createElement('i');n.textContent=SHOPKEY[i]||'';
  const t=document.createElement('b');t.textContent=it.n;t.style.fontWeight='400';const d=document.createElement('span');d.className='sd';const pr=document.createElement('span');pr.className='sp';
  b.append(n,t,d,pr);b.addEventListener('click',e=>{e.stopPropagation();buyItem(i);});shopGrid.append(b);});
document.getElementById('shopHint').textContent=isTouch?'Ketuk barang untuk membeli. Tiap barang ada batas beli per jeda.':'Tekan 1–9, 0, - atau klik barang. Tiap barang ada batas beli per jeda. Tekan B untuk menutup.';
shopEl.addEventListener('pointerdown',e=>e.stopPropagation());
document.getElementById('shopClose').addEventListener('click',()=>openShop(false));
shopSkip.addEventListener('click',()=>{if(NET.host&&G.breakT>0){G.breakT=0.05;openShop(false);}});
const tUse=document.getElementById('tUse'),tShop=document.getElementById('tShop'),tPing=document.getElementById('tPing');
const stkEl=document.getElementById('stk'),sgrid=document.getElementById('sgrid'),tEmote=document.getElementById('tEmote');
document.getElementById('shint').textContent=isTouch?'Ketuk stiker untuk mengirim.':'Tekan 1–8 atau klik stiker. Tekan T untuk menutup.';
STK.forEach((t,i)=>{const b=document.createElement('button');b.type='button';b.className='sb';const n=document.createElement('i');n.textContent=String(i+1);
  const c=document.createElement('canvas');c.width=24;c.height=24;c.getContext('2d').drawImage(t.spr.cv,0,0);const l=document.createElement('span');l.textContent=t.name;
  b.append(n,c,l);b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();sendSticker(i);});sgrid.append(b);});
stkEl.addEventListener('pointerdown',e=>e.stopPropagation());
function toggleStickers(v){G.stkOpen=v===undefined?!G.stkOpen:!!v;stkEl.hidden=!G.stkOpen;}
tEmote.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();toggleStickers();});
/* ---- akun, EXP, pangkat, leaderboard (UI) ---- */
function accLogged(){return !!(window.KMA&&KMA.state().logged);}
function accRank(){return window.KMA?KMA.state().rank:{lv:1,name:'PRAJURIT DUA',prog:0,exp:0,next:300,cur:0};}
const gate=document.getElementById('gate'),gE=document.getElementById('gErr');let gMode='guest',gCanClose=false;
function gateTab(t){gMode=t;for(const b of document.querySelectorAll('#gTabs button'))b.setAttribute('aria-selected',String(b.dataset.t===t));
  document.getElementById('gfLogin').hidden=t!=='login';document.getElementById('gfReg').hidden=t!=='reg';document.getElementById('gateForm').hidden=t!=='guest';gE.textContent='';
  const k=window.KMA;document.getElementById('gNote').textContent=t==='guest'?'Mode tamu: data hanya tersimpan di browser HP ini dan tidak masuk papan peringkat.':
    t==='reg'?'Akunmu tersimpan online, jadi EXP dan pangkat tetap ada walau ganti HP. EXP dari mode tamu ikut dipindah.':'Masuk dengan nama dan password akunmu.';
  setTimeout(()=>{const f={login:'lNick',reg:'rNick',guest:'gNick'}[t];try{document.getElementById(f).focus();}catch(e){}},30);}
function openGate(canClose){gCanClose=!!canClose;const k=window.KMA,on=!!(k&&k.online);for(const b of document.querySelectorAll('#gTabs button'))if(b.dataset.t!=='guest')b.hidden=!on;
  document.getElementById('gTabs').hidden=!on;document.getElementById('gClose').hidden=!gCanClose;document.getElementById('gNick').value=G.nick||'';gate.hidden=false;gateTab(on?'login':'guest');
  if(!on){document.getElementById('gNote').textContent=k&&k.configured?(k.initErr||'Server akun belum bisa dihubungi. Kamu bisa main sebagai tamu dulu.'):'Akun online belum aktif di versi ini. Kamu bisa main sebagai tamu. Datamu tersimpan di browser HP ini.';}}
function closeGate(){gate.hidden=true;updateCard();initAudio();}
function initAccountUI(){
  for(const b of document.querySelectorAll('#gTabs button'))b.addEventListener('click',()=>gateTab(b.dataset.t));
  document.getElementById('gClose').addEventListener('click',()=>{gate.hidden=true;});
  document.getElementById('gateForm').addEventListener('submit',e=>{e.preventDefault();const v=document.getElementById('gNick').value;if(String(v).replace(/[^A-Za-z0-9]/g,'').length<2){gE.textContent='Nama minimal 2 huruf atau angka.';return;}
    if(accLogged()&&window.KMA)KMA.logout();G.nick=cleanNick(v);try{localStorage.setItem('kotamati-nick',G.nick);}catch(_){}if(window.KMA)KMA.setGuestNick(G.nick);closeGate();});
  const busy=(f,on)=>{for(const b of f.querySelectorAll('button'))b.disabled=on;};
  document.getElementById('gfLogin').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,n=document.getElementById('lNick').value.trim(),pw=document.getElementById('lPass').value;
    if(!KMA.validNick(n)){gE.textContent='Nama 3–10 huruf, angka, atau garis bawah.';return;}if(!pw){gE.textContent='Isi password.';return;}
    gE.textContent='Masuk…';busy(f,true);try{await KMA.login(n,pw);document.getElementById('lPass').value='';closeGate();banner('SELAMAT DATANG, '+G.nick+'!','sub',2);}catch(err){gE.textContent=KMA.errMsg(err);}busy(f,false);});
  document.getElementById('gfReg').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,n=document.getElementById('rNick').value.trim(),pw=document.getElementById('rPass').value,pw2=document.getElementById('rPass2').value;
    if(!KMA.validNick(n)){gE.textContent='Nama 3–10 huruf, angka, atau garis bawah (tanpa spasi).';return;}if(pw.length<6){gE.textContent='Password minimal 6 karakter.';return;}if(pw!==pw2){gE.textContent='Ulangi password belum sama.';return;}
    gE.textContent='Mendaftarkan akun…';busy(f,true);try{await KMA.register(n,pw);document.getElementById('rPass').value='';document.getElementById('rPass2').value='';closeGate();banner('AKUN '+G.nick+' TERDAFTAR!','sub',2.4);}catch(err){gE.textContent=err&&err.message&&err.code&&err.code.startsWith('km/')&&err.code!=='km/name-taken'?err.message:KMA.errMsg(err);}busy(f,false);});
  document.getElementById('bAcc').addEventListener('click',openAcc);
  document.getElementById('aBack').addEventListener('click',showMain);
  document.getElementById('aLogin').addEventListener('click',()=>openGate(true));
  document.getElementById('aLogout').addEventListener('click',async()=>{await KMA.logout();renderAcc();});
  document.getElementById('bLb').addEventListener('click',()=>openLb('exp'));
  document.getElementById('lbBack').addEventListener('click',showMain);
  document.getElementById('lbRefresh').addEventListener('click',()=>openLb(lbField));
  for(const b of document.querySelectorAll('#lbTabs button'))b.addEventListener('click',()=>openLb(b.dataset.f));
  const rl=document.getElementById('aRanks');(window.KMA?KMA.RANKS:[]).forEach((r,i)=>{const li=document.createElement('li'),c=document.createElement('canvas');c.width=12;c.height=12;KMA.drawRank(c.getContext('2d'),i+1,0,0,1);
    const t=document.createElement('span');t.textContent='LV '+(i+1)+' · '+r[0]+' · '+r[1].toLocaleString('id-ID')+' EXP';li.append(c,t);rl.append(li);});
  if(!window.KMA){if(!G.nick)openGate(false);return;}
  KMA.onChange(st=>{if(st.logged){G.nick=cleanNick(st.nick);try{localStorage.setItem('kotamati-nick',G.nick);}catch(_){}}else{const ln=st.nick||'';if(ln)G.nick=cleanNick(ln);}
    updateCard();if(!document.getElementById('vAcc').hidden)renderAcc();});
  KMA.ready.then(()=>{const st=KMA.state();if(st.logged)G.nick=cleanNick(st.nick);else if(!G.nick&&st.nick)G.nick=cleanNick(st.nick);updateCard();if(!st.logged&&!G.nick)openGate(false);});}
function openAcc(){renderAcc();showView(document.getElementById('vAcc'));}
function renderAcc(){const st=window.KMA?KMA.state():null;if(!st)return;const r=st.rank,p=st.prof;
  const c=document.getElementById('aRank'),g=c.getContext('2d');g.clearRect(0,0,12,12);KMA.drawRank(g,r.lv,0,0,1);
  document.getElementById('aNick').textContent=G.nick||'PEMAIN';document.getElementById('aRankN').textContent=r.name+' · LV '+r.lv;
  document.getElementById('aStatus').textContent=st.logged?'Akun online · data tersimpan di server':st.online?'Mode tamu · masuk atau daftar supaya masuk papan peringkat':'Mode tamu · data tersimpan di browser ini';
  document.getElementById('aExp').style.width=Math.round(r.prog*100)+'%';
  document.getElementById('aExpT').textContent=r.next?(r.exp.toLocaleString('id-ID')+' / '+r.next.toLocaleString('id-ID')+' EXP menuju '+KMA.RANKS[r.lv][0]):(r.exp.toLocaleString('id-ID')+' EXP · pangkat tertinggi');
  const ul=document.getElementById('aStats');ul.textContent='';
  for(const[k,v]of[['Kill',p.kills],['Headshot',p.hs],['Main',p.games],['Skor terbaik',p.best],['Bos dikalahkan',p.boss],['Teman ditolong',p.revives],['Menang PvP',p.wins],['Gelombang tertinggi',p.waves]]){
    const li=document.createElement('li'),a=document.createElement('span'),b=document.createElement('b');a.textContent=k;b.textContent=(v|0).toLocaleString('id-ID');li.append(a,b);ul.append(li);}
  for(const li of document.querySelectorAll('#aRanks li'))li.classList.toggle('me',[...li.parentNode.children].indexOf(li)===r.lv-1);
  document.getElementById('aLogin').hidden=st.logged||!st.online;document.getElementById('aLogout').hidden=!st.logged;document.getElementById('aErr').textContent=KMA.initErr||'';}
let lbField='exp',lbSeq=0;
async function openLb(field){lbField=field;showView(document.getElementById('vLb'));for(const b of document.querySelectorAll('#lbTabs button'))b.setAttribute('aria-pressed',String(b.dataset.f===field));
  const ol=document.getElementById('lbList'),msg=document.getElementById('lbMsg'),seq=++lbSeq;ol.textContent='';msg.textContent='Memuat…';
  try{const res=await KMA.leaderboard(field,50);if(seq!==lbSeq)return;
    res.rows.forEach((r,i)=>{const li=document.createElement('li');if(r.me)li.className='me';const n=document.createElement('span');n.className='lbn';n.textContent=String(i+1);
      const rk=KMA.rankOf(r.exp),c=document.createElement('canvas');c.width=12;c.height=12;KMA.drawRank(c.getContext('2d'),rk.lv,0,0,1);
      const nm=document.createElement('span');nm.className='lbname';nm.textContent=r.nick.toUpperCase();const sm=document.createElement('small');sm.textContent=rk.name+' · LV '+rk.lv;nm.append(sm);
      const v=document.createElement('span');v.className='lbv';v.textContent=(field==='exp'?r.exp:field==='best'?r.best:r.kills).toLocaleString('id-ID')+(field==='exp'?' EXP':field==='kills'?' KILL':'');
      li.append(n,c,nm,v);ol.append(li);});
    msg.textContent=!res.online?'Papan peringkat online belum aktif. Yang tampil hanya datamu di HP ini.':res.rows.length?(res.rows.length+' pemain teratas. Hanya akun terdaftar yang masuk papan ini.'):'Belum ada pemain terdaftar.';}
  catch(err){if(seq===lbSeq)msg.textContent=KMA.errMsg(err);}}
/* EXP di akhir pertandingan */
function endMatch(){if(G.matchDone||!window.KMA)return;G.matchDone=true;let st;
  if(NET.mode==='pvp'){if(pl.spectator)return;const sc=pvpScore();st={mode:'pvp',kills:sc.me,win:sc.me>sc.opp,score:0};}
  else st={mode:NET.mode,kills:G.kills,hs:G.hs,wave:G.wave,boss:G.bossK||0,revives:G.revs,score:pl.score};
  G.expRes={pending:true};G.banners.length=0;KMA.addMatch(st).then(r=>{G.expRes=r;if(r.up)S.oneup();updateCard();}).catch(()=>{G.expRes=null;});}
/* ---- mobile HUD editor ---- */
const HUDK='kotamati-hud',HUD_IDS=['tFull','stick','tFire','tJump','tCrouch','tReload','tNade','tScope','tSwap','tMelee','tMolo','tPause','tEmote','tUse','tShop','tPing'];
const HUD_NM={tFull:'LAYAR PENUH',stick:'JOYSTICK',tFire:'TEMBAK',tJump:'LOMPAT',tCrouch:'JONGKOK',tReload:'ISI',tNade:'GRANAT',tScope:'ZOOM',tSwap:'GANTI',tMelee:'PARANG',tMolo:'MOLOTOV',tPause:'JEDA',tEmote:'STIKER',tUse:'TOLONG',tShop:'TOKO',tPing:'TANDA'};
let HUD={land:{},port:{},op:1,gs:(Math.min(innerWidth,innerHeight)<=440?0.82:1)};
try{const o=JSON.parse(localStorage.getItem(HUDK)||'null');if(o&&typeof o==='object'){for(const k of['land','port'])if(o[k]&&typeof o[k]==='object')for(const id of HUD_IDS){const c=o[k][id];if(c&&typeof c==='object')HUD[k][id]={x:clamp(num(c.x),-1,1),y:clamp(num(c.y),-1,1),s:clamp(num(c.s,1),0.6,1.6)};}HUD.op=clamp(num(o.op,1),0.3,1);if(typeof o.gs==='number')HUD.gs=clamp(o.gs,0.5,1.2);}}catch(e){}
function hudOri(){return innerHeight>innerWidth?'port':'land';}
function hudScale(el){const p=el.parentElement;if(!p||!p.offsetWidth)return 1;return(p.getBoundingClientRect().width/p.offsetWidth)||1;}
function applyHud(){if(!isTouch||touchEl.hidden)return;const r=touchEl.getBoundingClientRect();if(!r.width||!r.height)return;const prof=HUD[hudOri()];touchEl.style.setProperty('--hop',String(HUD.op));touchEl.style.setProperty('--gs',String(HUD.gs));
  for(const id of HUD_IDS){const el=document.getElementById(id);if(!el)continue;const c=prof[id];
    if(!c){el.style.removeProperty('--dx');el.style.removeProperty('--dy');el.style.removeProperty('--s');continue;}
    const ps=hudScale(el);el.style.setProperty('--dx',(c.x*r.width/ps).toFixed(1)+'px');el.style.setProperty('--dy',(c.y*r.height/ps).toFixed(1)+'px');el.style.setProperty('--s',String(c.s));}}
function saveHud(){try{localStorage.setItem(HUDK,JSON.stringify(HUD));}catch(e){}}
const hudEd=document.getElementById('hudEd'),hudSize=document.getElementById('hudSize'),hudOp=document.getElementById('hudOp');let hudSel='tFire',hudDrag=null,hudBackup=null,hudFrom='main';
function hudCell(id){const prof=HUD[hudOri()];return prof[id]||(prof[id]={x:0,y:0,s:1});}
function selHud(id){hudSel=id;for(const k of HUD_IDS){const el=document.getElementById(k);if(el)el.classList.toggle('sel',k===id);}
  const c=HUD[hudOri()][id];hudSize.value=c?c.s:1;hudOp.value=HUD.op;document.getElementById('hudGs').value=HUD.gs;document.getElementById('hudSelName').textContent=HUD_NM[id]||id;
  document.getElementById('hudOri').textContent=hudOri()==='port'?'PORTRAIT':'LANDSCAPE';}
function openHudEdit(from){if(!isTouch)return;hudFrom=from;hudBackup=JSON.stringify(HUD);G.hudEdit=true;G.fireHeld=false;G.useHeld=false;stick.id=null;stick.x=stick.y=0;knob.style.transform='';
  if(G.stkOpen)toggleStickers(false);if(G.shopOpen)openShop(false);showMenu(false);btnExit.hidden=true;hudEd.hidden=false;touchEl.classList.add('editing');tryFullscreen();syncUI();
  setTimeout(()=>{applyHud();selHud(hudSel);},120);}
function closeHudEdit(save){if(save)saveHud();else if(hudBackup){try{const o=JSON.parse(hudBackup);HUD.land=o.land;HUD.port=o.port;HUD.op=o.op;HUD.gs=o.gs;}catch(e){}}
  G.hudEdit=false;hudDrag=null;hudEd.hidden=true;touchEl.classList.remove('editing');for(const k of HUD_IDS){const el=document.getElementById(k);if(el)el.classList.remove('sel');}
  syncUI();applyHud();if(hudFrom==='pause'&&G.state==='play')openSettings('pause');else{if(G.state!=='play')exitFs();openSettings('main');}}
touchEl.addEventListener('pointerdown',e=>{if(!G.hudEdit)return;e.preventDefault();e.stopPropagation();const el=e.target.closest('.tb,.stick');if(!el||!HUD_IDS.includes(el.id))return;
  selHud(el.id);const c=hudCell(el.id);hudDrag={id:el.id,pid:e.pointerId,sx:e.clientX,sy:e.clientY,x0:c.x,y0:c.y,el};try{touchEl.setPointerCapture(e.pointerId);}catch(_){}},true);
touchEl.addEventListener('pointermove',e=>{if(!G.hudEdit||!hudDrag||e.pointerId!==hudDrag.pid)return;e.preventDefault();e.stopPropagation();
  const r=touchEl.getBoundingClientRect(),c=hudCell(hudDrag.id);c.x=hudDrag.x0+(e.clientX-hudDrag.sx)/r.width;c.y=hudDrag.y0+(e.clientY-hudDrag.sy)/r.height;applyHud();
  const b=hudDrag.el.getBoundingClientRect(),cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2;let fx=0,fy=0;
  if(cx<r.left+12)fx=r.left+12-cx;else if(cx>r.right-12)fx=r.right-12-cx;if(cy<r.top+12)fy=r.top+12-cy;else if(cy>r.bottom-12)fy=r.bottom-12-cy;
  if(fx||fy){c.x+=fx/r.width;c.y+=fy/r.height;applyHud();}},true);
for(const ev of['pointerup','pointercancel'])touchEl.addEventListener(ev,e=>{if(G.hudEdit){e.stopPropagation();if(hudDrag&&e.pointerId===hudDrag.pid)hudDrag=null;}},true);
hudSize.addEventListener('input',()=>{const c=hudCell(hudSel);c.s=clamp(+hudSize.value,0.6,1.6);applyHud();});
hudOp.addEventListener('input',()=>{HUD.op=clamp(+hudOp.value,0.3,1);applyHud();});
document.getElementById('hudGs').addEventListener('input',e=>{HUD.gs=clamp(+e.target.value,0.5,1.2);applyHud();});
document.getElementById('hudMove').addEventListener('click',()=>hudEd.classList.toggle('bottom'));
document.getElementById('hudReset').addEventListener('click',()=>{HUD[hudOri()]={};HUD.op=1;applyHud();selHud(hudSel);});
document.getElementById('hudCancel').addEventListener('click',()=>closeHudEdit(false));
document.getElementById('hudSave').addEventListener('click',()=>closeHudEdit(true));
document.getElementById('hudRow').hidden=!isTouch;document.getElementById('gsRow').hidden=!isTouch;
const sGs=document.getElementById('sGs');sGs.addEventListener('input',()=>{HUD.gs=clamp(+sGs.value,0.5,1.2);document.getElementById('vGs').textContent=Math.round(HUD.gs*100)+'%';saveHud();applyHud();});
/* fullscreen controls */
const tFull=document.getElementById('tFull');const FS_ON=tFull.innerHTML,FS_OFF='<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" shape-rendering="crispEdges"><path d="M6 1v5H1M15 6h-5V1M10 15v-5h5M1 10h5v5"/></svg>';
function fsOn(){return !!document.fullscreenElement;}
function toggleFs(){try{if(fsOn())document.exitFullscreen().catch(()=>{});else{const p=document.getElementById('cab').requestFullscreen({navigationUI:'hide'});if(p&&p.then)p.then(()=>{try{if(isTouch&&screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}).catch(()=>{});}}catch(e){}}
function syncFsUI(){const on=fsOn();tFull.innerHTML=on?FS_OFF:FS_ON;tFull.setAttribute('aria-label',on?'Keluar layar penuh':'Layar penuh');const bp=document.getElementById('bFullP');if(bp)bp.textContent=on?'KELUAR LAYAR PENUH':'LAYAR PENUH';}
document.addEventListener('fullscreenchange',syncFsUI);
tFull.addEventListener('pointerdown',e=>{e.preventDefault();});tFull.addEventListener('click',e=>{if(G.hudEdit)return;e.preventDefault();G.fsAuto=false;toggleFs();});
addEventListener('touchend',()=>{if(G.fsAuto&&isTouch&&G.state==='play'&&!G.hudEdit){G.fsAuto=false;if(SET.fs&&!fsOn())toggleFs();}},{passive:true});
document.getElementById('bFullP').addEventListener('click',e=>{toggleFs();e.currentTarget.blur();});
if(!document.fullscreenEnabled||!document.getElementById('cab').requestFullscreen){tFull.remove();document.getElementById('bFullP').remove();}
const bAutoFs=document.getElementById('bAutoFs');bAutoFs.hidden=!isTouch;function syncAutoFs(){bAutoFs.textContent='LAYAR PENUH OTOMATIS: '+(SET.fs?'NYALA':'MATI');}syncAutoFs();
bAutoFs.addEventListener('click',()=>{SET.fs=SET.fs?0:1;saveSet();syncAutoFs();});
document.getElementById('bHud').addEventListener('click',()=>openHudEdit(setFrom));
addEventListener('resize',()=>setTimeout(()=>{applyHud();if(G.hudEdit)selHud(hudSel);},120));
let lastGame=null,lastAmmo='';
function syncUI(){{const ok=online()&&(G.state==='play'||G.state==='over');if(!ok&&G.stkOpen)toggleStickers(false);if(isTouch)tEmote.hidden=!ok&&!G.hudEdit;}
if(!isTouch){const c=(G.state==='play'&&!G.paused&&!G.needClick)?'none':'pointer';if(cv.style.cursor!==c)cv.style.cursor=c;}
const game=isTouch&&(G.state==='play'||G.state==='over'||G.hudEdit);
  if(game!==lastGame){lastGame=game;document.body.classList.toggle('game',game);fitLayout();}
  {const tv=!(isTouch&&((G.state==='play'&&menuEl.hidden)||G.hudEdit));if(tv!==touchEl.hidden){touchEl.hidden=tv;if(!tv)requestAnimationFrame(applyHud);}}if(isTouch){tScope.hidden=pl.wpn!=='awp'&&pl.wpn!=='kriss'&&!G.hudEdit;const lb=pl.wpn==='kriss'?'DUAL':'ZOOM';const sp=tScope.querySelector('span');if(sp&&sp.textContent!==lb)sp.textContent=lb;}
  if(G.hudEdit){tUse.hidden=false;tShop.hidden=false;tPing.hidden=false;}
  pauseBox.hidden=!((G.state==='play'&&G.paused)||(G.state==='over'&&G.overT>1.2))||!menuEl.hidden||!!G.hudEdit;bResume.hidden=G.state!=='play';document.getElementById('bSetP').hidden=G.state!=='play';pauseBox.style.top=G.state==='over'?'88%':'';
  if(G.shopOpen){if(!shopAvail())openShop(false);else if(pl.cash!==syncUI.cash){syncUI.cash=pl.cash;renderShop();}}
  if(isTouch&&G.state==='play'&&!G.hudEdit){tUse.hidden=!(G.revNear||G.revT>0);tShop.hidden=!shopAvail();tPing.hidden=NET.mode!=='coop';}
  if(isTouch){const a=G.state==='play'&&pl.wpn!=='parang'?String(pl.wpn==='kriss'&&pl.dualOn?pl.dualMag:pl.mag[pl.wpn]):'';if(a!==lastAmmo){lastAmmo=a;tAmmo.textContent=a;}tCrouch.classList.toggle('on',G.touchCrouch);}}
document.getElementById('btnSound').addEventListener('click',e=>{initAudio();setMuted(!muted);e.currentTarget.blur();});
for(const id of['btnFull','btnExit'])document.getElementById(id).addEventListener('click',e=>{try{e.currentTarget.blur();}catch(_){}});
const fullB=document.getElementById('btnFull'),cab=document.getElementById('cab');
if(!document.fullscreenEnabled||!cab.requestFullscreen)fullB.hidden=true;
fullB.addEventListener('click',()=>{try{if(document.fullscreenElement)document.exitFullscreen();else{const p=cab.requestFullscreen();if(p&&p.catch)p.catch(()=>{fullB.hidden=true;});}}catch(e){fullB.hidden=true;}});

/* ================= loop ================= */
let mi0=0;try{mi0=parseInt(localStorage.getItem('kotamati-map')||'0',10)||0;}catch(e){}
try{G.nick=cleanNick(localStorage.getItem('kotamati-nick')||'');if(!localStorage.getItem('kotamati-nick'))G.nick='';applySkin(parseInt(localStorage.getItem('kotamati-skin')||'0',10)||0);}catch(e){G.nick='';}
setNight(nightPref(),false);selectMap(mi0);showMain();initRoom();fitLayout();
initAccountUI();
for(const ev of['pointerdown','keydown','touchstart'])addEventListener(ev,()=>{try{initAudio();}catch(e){}},{passive:true,capture:true});
let last=performance.now();
function frame(now){const dt=Math.min(0.05,Math.max(0,(now-last)/1000));last=now;update(dt);syncUI();render();requestAnimationFrame(frame);}
render();requestAnimationFrame(frame);
})();
