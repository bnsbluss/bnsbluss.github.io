/* Kota Mati — mesin game (raycaster, zombie, senjata, online, HUD). */
(()=>{
'use strict';
let H=216,HH=H>>1;const PMAX=88,SH=HH+PMAX;let HS=1;
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
const SET={sens:1,mus:70,sfx:80,q:2,fs:1,g3d:1,hud:-1};try{const o=JSON.parse(localStorage.getItem('kotamati-set')||'{}');if(o&&typeof o==='object')for(const k in SET)if(typeof o[k]==='number'&&Number.isFinite(o[k]))SET[k]=o[k];}catch(e){}
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
const FT_CITY=[floorTex(71,false).px,makeSprite(32,32,P=>{const r=rng(81);P(0,0,'#7c6748',32,32);
  for(let i=0;i<260;i++)P((r()*32)|0,(r()*32)|0,r()<0.5?'#6c583c':'#8e7856');
  for(let i=0;i<6;i++){const x=(r()*30)|0,y=(r()*30)|0;P(x,y,'#5a5250',2,2);P(x,y,'#8a807c',1,1);}}).px,floorTex(91,true).px];

/* ================= sky (taller, so the view can tilt up) ================= */
const SKY0=(()=>{const w=512,h=SH,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});
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
const SKYN0=nightSky(SKY0);
/* ================= tema peta baru: dinding, lantai, langit-langit, langit ================= */
/* 8 R pohon, 9 B semak, 10 H wallpaper rumah hantu, 11 D papan dipaku, 12 K batu goa, 13 Q kristal goa,
   14 U rumah hancur, 15 V puing, 16 N barak seng, 17 A peti amunisi, 18 L lemari tua, 19 J mobil terbakar */
function leafy(P,r,n,ymax,cols,hl){for(let i=0;i<n;i++){const x=(r()*34)|0,y=(r()*ymax)|0,rr=1.5+r()*2.2;disc(P,x,y,rr,cols[(r()*cols.length)|0]);if(r()<0.5)P(x-1,y-1,hl,1,1);}}
WT[8]=makeSprite(32,32,P=>{const r=rng(108);P(0,0,'#0e170b',32,32);
  for(let y=16;y<32;y++){const w=7+((y-16)>>2);P(16-(w>>1),y,'#4a3424',w,1);P(16-(w>>1),y,'#2e2016',1,1);P(16+(w>>1)-1,y,'#6a4a32',1,1);if(r()<0.4)P(14+((r()*5)|0),y,'#2e2016',1,2);}
  P(9,30,'#3a2a1c',14,2);
  leafy(P,r,80,22,['#1e3414','#2a4a1c','#365e22','#24401a','#41702a'],'#6a9a3a');
  for(let i=0;i<10;i++)P((r()*32)|0,(r()*20)|0,'#0a1208',2,2);});
WT[9]=makeSprite(32,32,P=>{const r=rng(109);P(0,0,'#0c140a',32,32);
  leafy(P,r,120,34,['#1a2e12','#24401a','#2e5220','#38622a'],'#5a8a34');
  for(let i=0;i<12;i++){const x=(r()*30)|0,y=(r()*30)|0;P(x,y,'#3a2a1c',1,3);}for(let i=0;i<5;i++)P((r()*31)|0,(r()*31)|0,'#7a1a24',1,1);});
WT[10]=makeSprite(32,32,P=>{const r=rng(110);P(0,0,'#43344a',32,32);
  for(let y=0;y<22;y+=8)for(let x=0;x<32;x+=8){const ox=(y/8)%2?4:0;P(x+ox+3,y+1,'#574460',2,1);P(x+ox+2,y+2,'#574460',4,2);P(x+ox+3,y+4,'#574460',2,1);P(x+ox+3,y+2,'#6a5474',1,1);}
  for(let x=0;x<32;x+=4)P(x,0,'#3c2e42',1,22);
  for(let i=0;i<3;i++){const x=(r()*26)|0,y=(r()*14)|0,w=4+((r()*6)|0),h=3+((r()*5)|0);P(x,y,'#8a7e6e',w,h);P(x,y+h,'#5e5448',w,1);P(x+w,y,'#2a2026',1,h);}
  for(let i=0;i<5;i++){const x=(r()*31)|0;let y=(r()*8)|0;const L=6+((r()*12)|0);for(let k=0;k<L;k++)P(x,y+k,'#2a1e26',1,1);}
  P(0,22,'#5a3a24',32,1);P(0,23,'#3a2418',32,9);for(let x=0;x<32;x+=8){P(x,24,'#2a1810',1,8);P(x+1,25,'#4a2e1c',5,1);}P(0,31,'#1e120c',32,1);
  if(r()<1){P(20,9,'#6a1414',4,4);P(19,8,'#6a1414',1,3);P(21,7,'#6a1414',1,2);P(23,7,'#6a1414',1,2);P(24,8,'#6a1414',1,2);P(21,13,'#5a1010',1,4);}
  for(const[x,y]of[[0,0],[31,0]])for(let k=0;k<5;k++){P(x+(x?-k:k),y+k,'#a8a0a8',1,1);}});
WT[11]=makeSprite(32,32,P=>{const r=rng(111);P(0,0,'#0c0807',32,32);
  for(let b=0;b<4;b++){const y=1+b*8+((r()*2)|0),c=['#5a3e26','#4e3420','#664630'][b%3];P(0,y,c,32,6);P(0,y,'#7a5a3a',32,1);P(0,y+5,'#2e1e12',32,1);
    for(let i=0;i<4;i++)P((r()*30)|0,y+1+((r()*4)|0),'#3e2a1a',3,1);P(3,y+2,'#9a948c',1,1);P(28,y+3,'#9a948c',1,1);}
  for(let i=0;i<30;i++){const x=2+i,y=4+((i*0.85)|0);P(x,y,'#6a4a2e',2,4);P(x,y,'#8a6a44',2,1);}
  P(14,15,'#120c0a',4,3);});
WT[12]=makeSprite(32,32,P=>{const r=rng(112);P(0,0,'#35302c',32,32);
  for(let i=0;i<26;i++){const x=(r()*32)|0,y=(r()*32)|0;disc(P,x,y,2+r()*3,['#3f3934','#2c2724','#4a443e'][(r()*3)|0]);}
  for(let i=0;i<70;i++)P((r()*32)|0,(r()*32)|0,r()<0.5?'#241f1c':'#57504a');
  for(let c=0;c<3;c++){let x=(r()*32)|0,y=0;for(let k=0;k<34;k++){P(x&31,y,'#16120f');y++;if(r()<0.45)x+=r()<0.5?-1:1;}}
  for(let i=0;i<6;i++){const x=(r()*30)|0,y=(r()*30)|0;P(x,y,'#6a625a',2,1);}});
WT[13]=makeSprite(32,32,P=>{const r=rng(113);P(0,0,'#2c2826',32,32);
  for(let i=0;i<20;i++){const x=(r()*32)|0,y=(r()*32)|0;disc(P,x,y,2+r()*3,['#36302c','#24201e'][(r()*2)|0]);}
  for(let i=0;i<4;i++){const cx=4+((r()*24)|0),cy=8+((r()*20)|0);disc(P,cx,cy,5,'#1c3a40');
    for(let k=0;k<3;k++){const h=4+((r()*6)|0),x=cx-3+k*3;for(let j=0;j<h;j++){const w=Math.max(1,2-((j*2/h)|0));P(x,cy-j,j<1?'#2a8a9a':'#4fd8e8',w,1);}P(x,cy-h,'#d8fcff',1,1);}}
  for(let i=0;i<10;i++)P((r()*32)|0,(r()*32)|0,'#8af0ff',1,1);});
WT[14]=makeSprite(32,32,P=>{const r=rng(114);P(0,0,'#8a7e70',32,32);
  for(let i=0;i<90;i++)P((r()*32)|0,(r()*32)|0,r()<0.5?'#7a6e62':'#9a8e80');
  for(let k=0;k<3;k++){const x=(r()*22)|0,y=(r()*22)|0,w=8+((r()*8)|0),h=6+((r()*6)|0);
    for(let yy=y;yy<y+h;yy+=3)for(let xx=x+((yy/3)%2?2:0);xx<x+w;xx+=5){P(xx,yy,'#8a3a28',4,2);P(xx,yy,'#a8503a',4,1);}}
  P(10,6,'#14100e',11,10);P(10,6,'#3a3230',11,1);P(12,8,'#2a3a48',2,3);P(17,7,'#2a3a48',2,2);P(10,16,'#6e6458',11,2);
  for(let y=0;y<10;y++)for(let x=0;x<32;x++)if(r()<(10-y)/14)P(x,y,'#2a2422');
  for(let c=0;c<2;c++){let x=(r()*32)|0,y=12;for(let k=0;k<20;k++){P(x&31,y,'#3e3630');y++;if(r()<0.5)x+=r()<0.5?-1:1;}}});
WT[15]=makeSprite(32,32,P=>{const r=rng(115);P(0,0,'#2a2624',32,32);
  for(let i=0;i<34;i++){const x=(r()*32)|0,y=4+((r()*28)|0),w=3+((r()*6)|0),h=2+((r()*4)|0),c=['#5a5550','#6a645e','#4a4540','#5e463a'][(r()*4)|0];P(x,y,c,w,h);P(x,y,'#7e7870',w,1);P(x,y+h-1,'#302c2a',w,1);}
  for(let i=0;i<4;i++){const x=(r()*28)|0,y=(r()*14)|0;for(let k=0;k<10;k++)P(x+((k*0.4)|0),y+k,'#7a3a1c',1,1);}
  for(let i=0;i<40;i++)P((r()*32)|0,(r()*32)|0,'#4a4440');});
WT[16]=makeSprite(32,32,P=>{const r=rng(116);P(0,0,'#46552e',32,32);
  for(let x=0;x<32;x+=4){P(x,0,'#5e6e3e',1,32);P(x+1,0,'#52623a',1,32);P(x+3,0,'#323e1e',1,32);}
  for(const y of[2,29])for(let x=1;x<32;x+=4)P(x,y,'#8a947a',1,1);
  for(let i=0;i<6;i++){const x=(r()*31)|0,y=3+((r()*6)|0);for(let k=0;k<8+((r()*10)|0);k++)P(x,y+k,'#6a4a22',1,1);}
  P(6,12,'#2a3018',20,9);glyphs(P,'BARAK',6,14,'#c8c08a');P(0,0,'#242c14',32,1);P(0,31,'#242c14',32,1);});
WT[17]=makeSprite(32,32,P=>{const r=rng(117);P(0,0,'#2a3218',32,32);
  P(1,1,'#4e5a2e',30,30);P(1,1,'#6e7c3a',30,1);P(1,30,'#323c1c',30,1);P(30,1,'#323c1c',1,30);P(1,1,'#323c1c',1,30);
  for(const y of[8,23])P(1,y,'#3e4824',30,1);for(let i=0;i<40;i++)P(2+((r()*28)|0),2+((r()*28)|0),'#46522a',2,1);
  P(6,12,'#c8b03a',20,7);glyphs(P,'AMMO',8,13,'#2a2a14');for(const[x,y]of[[3,3],[28,3],[3,28],[28,28]])P(x,y,'#9a9a8a',1,1);});
WT[18]=makeSprite(32,32,P=>{const r=rng(118);P(0,0,'#24160e',32,32);P(1,0,'#3a2418',30,32);
  for(let s=0;s<4;s++){const y=s*8;P(1,y,'#4e3222',30,2);P(1,y,'#6a4630',30,1);
    let x=2;while(x<29){const w=2+((r()*2)|0),h=3+((r()*3)|0),c=['#5a1e1e','#2a3a5a','#3a4a2a','#6a5a2a','#4a2a4a','#2a2420'][(r()*6)|0];if(r()<0.85){P(x,y+8-h,c,w,h);P(x,y+8-h,'#8a7a5a',w,1);}x+=w;}}
  P(0,0,'#1a100a',1,32);P(31,0,'#1a100a',1,32);
  for(let k=0;k<7;k++){P(30-k,k,'#c8c0c8',1,1);P(30-k,0,'#b8b0b8',1,1);P(30,k,'#b8b0b8',1,1);}});
WT[19]=makeSprite(32,32,P=>{const r=rng(119);P(0,0,'#1e1a18',32,32);
  P(0,8,'#5a3a28',32,14);P(0,8,'#7a4a2a',32,1);P(3,2,'#4a3022',24,7);P(6,3,'#0e0c0c',8,5);P(16,3,'#0e0c0c',9,5);P(7,4,'#3a4650',2,2);
  for(let i=0;i<60;i++)P((r()*32)|0,8+((r()*14)|0),r()<0.5?'#2a1e1a':'#8a5a32',2,1);
  for(let i=0;i<20;i++)P((r()*32)|0,2+((r()*20)|0),'#14100e',2,2);
  P(14,13,'#2a1e1a',1,7);for(const cx of[7,24]){disc(P,cx,24,5,'#141212');disc(P,cx,24,2.4,'#3a3634');P(cx-1,23,'#5a5654',2,1);}
  P(0,21,'#2a1e1a',32,1);});
/* lantai & langit-langit tiap tema (3 jenis lantai: utama, kedua, berdarah) */
function texPx(seed,base,spots,fn){return makeSprite(32,32,P=>{const r=rng(seed);P(0,0,base,32,32);for(let i=0;i<200;i++)P((r()*32)|0,(r()*32)|0,spots[(r()*spots.length)|0]);if(fn)fn(P,r);}).px;}
const bloodOn=(P,r)=>{disc(P,16,16,6,'#4e1416');disc(P,14,15,4,'#6a1a1a');for(let i=0;i<7;i++)P((r()*30)|0,(r()*30)|0,'#5a1818',2,2);};
const FTS={city:null,
  forest:[texPx(201,'#2a4220',['#22381a','#34502a','#3e5e2e','#1e3016'],(P,r)=>{for(let i=0;i<40;i++){const x=(r()*32)|0,y=(r()*31)|0;P(x,y,'#4e7a34',1,2);}}),
    texPx(202,'#4a3a28',['#3e3020','#5a4a34','#2e2418'],(P,r)=>{for(let i=0;i<14;i++)P((r()*31)|0,(r()*31)|0,'#7a7064',2,1);}),
    texPx(203,'#4a3a22',['#6a4a24','#8a5a2a','#3a2a18','#5a3a1c'],bloodOn)],
  house:[texPx(211,'#3a281a',['#34241a','#422e1e'],(P,r)=>{for(let y=0;y<32;y+=6){P(0,y,'#1e140c',32,1);P(0,y+1,'#4e3624',32,1);const o=(r()*28)|0;P(o,y+1,'#1e140c',1,5);}}),
    texPx(212,'#4a1e26',['#3e1820','#5a2430'],(P,r)=>{for(let y=2;y<32;y+=6)for(let x=2;x<32;x+=6){P(x,y,'#7a5a2a',2,2);}P(0,0,'#6a4a2a',32,1);P(0,31,'#6a4a2a',32,1);}),
    texPx(213,'#3a281a',['#34241a','#422e1e'],(P,r)=>{for(let y=0;y<32;y+=6)P(0,y,'#1e140c',32,1);bloodOn(P,r);})],
  cave:[texPx(221,'#2a2522',['#221e1b','#34302c','#3a3430'],(P,r)=>{for(let c=0;c<2;c++){let x=(r()*32)|0,y=0;for(let k=0;k<32;k++){P(x&31,y,'#141110');y++;if(r()<0.5)x+=r()<0.5?-1:1;}}}),
    texPx(222,'#3a342e',['#4a443c','#2a2622','#5a544a'],(P,r)=>{for(let i=0;i<30;i++)P((r()*31)|0,(r()*31)|0,'#6a6258',2,1);}),
    texPx(223,'#1c2224',['#1a1e20','#22292c'],(P,r)=>{disc(P,16,16,9,'#16262c');for(let i=0;i<10;i++)P(8+((r()*16)|0),10+((r()*12)|0),'#5a8a98',2,1);})],
  ruins:[texPx(231,'#363230',['#2e2a28','#403a38','#2a2624'],(P,r)=>{for(let c=0;c<3;c++){let x=(r()*32)|0,y=0;for(let k=0;k<32;k++){P(x&31,y,'#1a1716');y++;if(r()<0.5)x+=r()<0.5?-1:1;}}}),
    texPx(232,'#4a4038',['#3a322c','#5a5048','#6e6862'],(P,r)=>{for(let i=0;i<10;i++){P((r()*30)|0,(r()*30)|0,'#7a746c',3,2);}}),
    texPx(233,'#363230',['#2e2a28','#403a38'],bloodOn)],
  barr:[texPx(241,'#3a2e22',['#33281e','#42362a','#2c2218'],(P,r)=>{for(let i=0;i<3;i++){const x=4+((r()*22)|0),y=4+((r()*22)|0);disc(P,x,y,3+r()*2,'#2a3038');P(x-2,y-1,'#5a6a7a',3,1);}}),
    texPx(242,'#4a463e',['#3e3a34','#5a564e','#2e2c28'],(P,r)=>{for(let i=0;i<20;i++)P((r()*31)|0,(r()*31)|0,'#6e6a62',2,2);}),
    texPx(243,'#3a2e22',['#33281e','#42362a'],bloodOn)]};
const CTS={house:texPx(251,'#22160e',['#1c120a','#2a1c12'],(P,r)=>{for(let x=0;x<32;x+=8){P(x,0,'#120a06',2,32);P(x+2,0,'#3a2618',1,32);}for(let i=0;i<5;i++){const x=(r()*28)|0,y=(r()*28)|0;for(let k=0;k<4;k++){P(x+k,y+k,'#8a8288',1,1);P(x+3-k,y+k,'#8a8288',1,1);}}}),
  cave:texPx(252,'#1e1a18',['#181412','#26211e','#2c2622'],(P,r)=>{for(let i=0;i<8;i++){const x=(r()*30)|0,y=(r()*30)|0;disc(P,x,y,2,'#2e2824');P(x,y,'#3e3630',1,1);}})};
/* langit lain: badai (barak) dan senja hutan */
function makeSky(o){const w=512,h=SH,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});
  const d=g.createImageData(w,h),px=new Uint32Array(d.data.buffer),st=o.st.map(hex),bay=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  for(let y=0;y<h;y++){const t=Math.pow(y/(h-1),1.6)*(st.length-1),i=Math.min(st.length-2,t|0),fr=t-i;
    for(let x=0;x<w;x++){const th=(bay[(y&3)*4+(x&3)]+0.5)/16,s=fr>th?st[i+1]:st[i];px[y*w+x]=(0xff000000|(s[2]<<16)|(s[1]<<8)|s[0])>>>0;}}
  g.putImageData(d,0,0);const r=rng(o.seed),P=(x,y,col,ww=1,hh=1)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),ww,hh);};
  if(o.clouds)for(let i=0;i<o.clouds;i++){const cy=20+((r()*(h*0.6))|0),cx=(r()*w)|0,len=40+((r()*120)|0);
    for(const ox of[0,-w])for(let k=0;k<6;k++){P(cx+ox+k*3,cy+k,o.cc[k%o.cc.length],len-k*5,3);}}
  if(o.trees){let x=0;while(x<w){const th=24+((r()*40)|0),tw=6+((r()*10)|0);for(let y=h-th;y<h;y++){const hw=Math.max(1,Math.round(tw*(y-(h-th))/th));P(x+tw-hw,y,'#0c140c',hw*2,1);}x+=tw+((r()*6)|0);}
    P(0,h-10,'#0c140c',w,10);}
  if(o.tents){let x=0;while(x<w){const bw=18+((r()*24)|0),bh=8+((r()*10)|0);if(r()<0.5){for(let k=0;k<bh;k++)P(x+k,h-k,'#161a20',bw-2*k,1);}else{P(x,h-bh,'#161a20',bw,bh);if(r()<0.4){P(x+bw/2,h-bh-18,'#161a20',2,18);P(x+bw/2-4,h-bh-20,'#161a20',10,4);}}x+=bw+((r()*20)|0);}}
  const id=g.getImageData(0,0,w,h);return{w,h,px:new Uint32Array(id.data.buffer)};}
function nightSky(S){const o=new Uint32Array(S.px.length),r0=rng(5);for(let i=0;i<o.length;i++){const c=S.px[i],r=c&255,g=(c>>>8)&255,b=(c>>>16)&255,l=(r+g+b)/3,y=(i/S.w)|0;
  let k=l>200?0.75:0.16;let nr=r*k*0.7,ng=g*k*0.8,nb=b*k*1.3+6;if(l<=200&&y<S.h*0.6&&r0()<0.004){nr=nb=ng=180+r0()*60;}o[i]=(0xff000000|(Math.min(255,nb)<<16)|(Math.min(255,ng)<<8)|Math.min(255,nr))>>>0;}return o;}
const SKYS={dusk:{d:SKY0,n:SKYN0}};
function skyGet(k){let s=SKYS[k];if(s)return s;let d;
  if(k==='storm')d=makeSky({seed:301,st:['#0a0c12','#10141c','#161c26','#1e2632','#28303c','#323a46','#3c4450'],clouds:34,cc:['#1a1e26','#242a34','#2e3440'],tents:true});
  else d=makeSky({seed:302,st:['#0e1418','#141c1c','#1c2a22','#2e3a26','#4a4a2a','#6a5a30','#8a6a38'],clouds:10,cc:['#1a2018','#24301e'],trees:true});
  s=SKYS[k]={d,n:nightSky(d)};return s;}
let SKY=SKY0,SKYN=SKYN0,CT=null;
function isDark(){return G.night||!!(MAP&&MAP.dark);}
FTS.city=FT_CITY;let FT=FT_CITY;


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
const FR={};for(const k in ZPAL)FR[k]=buildZ(ZPAL[k],ZX[k]);FR.crawl=FR.walk;
const ZPACK={src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoAAAAAwCAYAAACBmMt/AAAZD0lEQVR42u1dX2hc15n/xnJtywyRRiMxSjwiji0jqdEojaiIMTWKV2JJttQ1acXCvoi+lYXF0LI1pawfDKW4kIBZWPqwedBTKNMWxcZNHmQcYRA28tqNxl5JWHIcJCca9OdK3sGOk4rZh6vvzHfPnHvn3pl7zzmjnB8I/bE889N3znfO7/udPxfAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAQHvETAgMDAwMDAzckUymi/j1+vqymTcNdgX2mhAYGBgYGBi4i7+zF84AAMDUteswPQlFIwINjAA0MDAwMKhbYYNf6yRodOVli7+tumnfYrHI4hiLxYxgNSiD6RQGgQZkClMFGxjUb047Xa0tLfJZR17JZLrYmWmAhdx23Y55KAaNEDSgMA6gEVgVuQ0MNsGJoVOCalj9UogRpyY/DKqHrq6WLrySyXRxZLgPAABeTwFkJ6BYj30PhZ8RggahC0DdB2gjsGrjdvhwd9m/2XzVctRdnBqBtfvzQ6e4BeVzNXtFmqsVhJtMXpX4AQAcOXQQHj5+Cvfyz6En0wWzufm6zfVYLBYr7sCIQIO9YSSO7g6REVi14dGjOQAAeOnoi2UcpyfHTezqvDgy+VH/cQvCR7ar5ZebKrfNm5/tQt7LPwcAgNncfN25f7//xU+Lv3rvTzEjAk1hHqoArBeHyAis6lFahpmD7Ngt9vOzF87AF4tfKk8SnWNXL8WRyY/6jls1fGS5WkG5yXbb/PC7OHaTcdFV/HmJhV+996eYEYH1VajLmjtCWQLWeRI2Aqs2DAw2wfTkFlgbBQAAWFtbgrd/0guXzo9DvPkZADSa2NWxuDL5sXvi5odPMpkutqdT0l2tILFS4bbpPofVKhZEIhAhSwTquhqiq5svY+6oWQDqLmCMwKoN1kYB4s3PINHSDgBb0NraAZ2ZBi2SV/fY1cPEYvJjd8TNDx+cWJYWAR4+fgq9qf07QksfbsgLRaDJgfDEAi8C0QWUIQJ1XQ3RuVCXMXfULAB1n4SNwKod7R1xsDYKQK9n6MwU4PX+NyE7dktZ8uoeu3qYWEx+7I64+eFji78DcLLbdgCzEzPacTvcbTuAMg9a1EMhGZZYePj4Kch2AuthNUS3Ql3W3FGzANR9EtaVH7XDdRVYAAArSwXH9++/9wE8WliD1tYO+Nm//ACycMuI0zqeWEwBsjviVokPAMDh77wM/zBU2mMni2dQbrJj6IefzggiFv7wx7/Gfv7P/+S4IJpeGP1tElk6F+qy5o6qBSAvYE4MnYITQ/bgbG0UYGT0DUcwzQQiiFs6BStLj7QWWIXNxp0OZ8etsNkIra0dAADwm1+/q0wgrK8vx+JLyaLOsasHcaWjwKI5onMBolvcKvCBI4cOAkDJYZPJT2dufvjpfACkGrHg5gJ+m0SWzoW6rLljT7UD9MhwH8Sbn8HKUoEN0u+/9wF89Od7sJDbhu91/0BZgyaT6SJOIshPB44Yt/Z0CnAjdmGz1Ll0EVg0fnwS//Z3v2RJo7p9C5uNLH7vv/cB9LzW7oidbuLq7IUzkGiJQ2emAd7+8Zued499G/MDufVkugCvA9ExP9bXl2M6xU03PvXCrR74BRMLcQAAaG3tYGJGJBb+8Me/uuZMVG4gzhdUZA0MNsGl8+Pw0Yef1FX8dtPcEVgAJpPp4rnR43Dk0EFtxcu50eNwbvQ49GS6tOFI4zY69AqsLOeZC1heJakDTsA9mS4mVFFoDQw2wfjH/80qJt6tke0OVSNQUfxEyRtfeyG3rd3EQvNDN4GFfe90fwKOHDrIRKCOBYhuY9/ni+sxv8WQbDdLZ248P1Fb1gNwFe7shTMsN0ZG33DkNwVdav82i6xq47dbipI9tfznc6PHlQTIL073J8omEF2AEzBOwiiw+AlOpsBCcXC6PwGn+xNssziK1OnJLfaBLs3IcJ9DVPEfUYnTkeE+6Ml0lcVPJFDpB1ZTvBMWhcCi+eHHoYxanGL8RH1QJwGNwGVB6vTS9u3JdEnPD3wuLF2OUS1MKS8vTg8fP4XLdyzpol5Xbm78eNCc0Q21rML9/hc/lVq86ySywojfbigwqxKAl+9Y7OuR4T7o6PieMKlVLXHx/OgEopIj5fXw8dMyF3B6cotNcIWNdiZ0ZE24PMcjhw5CItFc5lTigHjk0EE4cuggnBs97hBkUYssdIhO9yccgzMVqMiTchsYbIIvFr+ES+fH2eAjU+i75YgscSqq/keG+yAePywU0CiwZHPk81fUxj2ZLuhN7S8rQKJ2J0eG+2Aht80mNJEwVeGaIi83TiPDfdJP1+rMzY0f5qYOTnOUQkHWMnAymS7qJLL48Uy3FRDZBWasGpLt6RQkEs3svia8T4peK4CTBE62Mpda+YoNeYoGGFk3vCOv2dw8m7z4mLFKaUdsJRLNzMV8+Pgp+90ouaKDRcWC1+CMfwv+Dh73x42+eBgoDM7Y9052p5g7dPmOBZa1WSamsX8ClDaWd2Ya4PX+78NHH34Cb//4zdB4UX44mfWm9jOOF8duliXv9OQWE4cPHz+FR998Hlnc3Pog5saNuTyLH8YQhT/tf1FzdMsRBM0V/HeMMZ8jYeYJ9rvRoVfYzy6O3WSDNApCFKzZiRlpz9d148VzwvjJHId15ebFD4G5igJVNj8v3vg19j8UVoXNRvjt734Jv/n1uxBvfgaFzUZPzngQRCT4qr0Ohi/CsL3xIGHPa+1lK3Eyn0WNbX75jgXfwIIjfqq40bGvN7UfshMzZWML7Y9hcqrKAVxZzsNsbt4h/qjwGxl9A65mr7DTPTJdrPX15RiKld7UfsYP3QI28BD3RwY/nhdew8Dvc8L44oSMbgjuieJdmSi4Xhy7CZfvWMwp6k3tL1sGWV9fjuHflJ2YYQIR93XEm5+FLhDW15djK8t5uDGXh7Frn7FLY1Gs0NghL/5C2bt3bkNhs5FdSRAV7uWfO2JI3aulxQPQk+mCh4+fMtESZdxEfRDbFQDYUj+f3yiqvDhGxQ/HFwqaK5a1CdmJGRZj5NiZaWAOdJj5QYUCclnIbbON2QODTdCZaYAjhw5CezolbWXBjRfyGRhsgrv5+4yXTOjKDSdbET8+V2mb6iD+2tMp8ONE97zWXvH1wt4HyPPjhSrvZqEolOn0nuxOsXmDj5+qrRwYN1zZOjd6nHHD2GF/RK0S1nvXdA+gPVh3sa87Mw1M9Nl/wG0mXs6NHt8ZpOVc+IjceIGK4u+loy/C2Qtn4NL5cTjdb+/XunzHgtlctPx6Ml1lwplfAsH3n83BTkN3kVv755l4vXvnNkAuHQlfy9qEG1bJSbPfv/zZnPxD5rHdoxRZ1N1DIWNZKSaaKSeM4fr6cgxypcSJcqmOd7BGhvscLltJ4Dv7pyxximKe9kN0OZxiDIr8UyJ4jlHmiiiH29MpFj/MX+SIDu8Xi19CduyWPXjWmB/00WniOK6wje0Fq9XhIEV5uW21vGROaDpy44sfEb94ywr7fmnxAOgA0erHudHjzFVFpw0dLJnXl1B3zY1fe0eciRoUqQBNke7LR150pQX1iFv8+D3kKoul7MTMTrFUgESLfSKYFCOhjC2BHUB8UzwhOpubZ6JgIbcNd+/cZs4ANjhW6Vihy3ADkRu6QPfyzx3WKgDA1ewVh8uGe8qi4oYOB7ob1OEQLbFSlw35Y2WSHbvlWEoJO3Yry3k42Z0qE1peG6KRL/KKSmSJ4neyOyXkhpzo1/RnYbcviijewaIuG++eYsyijhttR+xvlCM/afPxksWRXpNE43gv/xwSiWbm8F06Pw58Wz56NAcfffhJqBf5omuAwPGiN7WfTRTTk1tlg3jU0JWX7txEDpgXv4tjN+H+p/+jbPmXLlfzWx4AgIlpdFbPjR6HePywr9d2Owjy1juvFoNw88uPulmzn65ELv7QiUQu2YkZGLv2mZBfZ6aBccPxJ2qdgtuGvAp1twIzDG5VO4CJRDNY1qZj0lhZzsNCbrtsXx06CTgoo4OVHYvWbaOTCMKexG6V7UXBzoBOJrpFUfDD+KC7N5ubZ3smbffCGRd0YwDsJdbpyVuOZApbxABAsSfTBdmJGZZAOAn/40gP9PY3e7Zd1A4vinveTbWFjfpq3dnvujxdNlkx8+qDvak+Jq4SiWbX/Z6y9snivkQsROyiqTRufLH4pe1+89xy6eLA4M7VNh12rofB+cgh+wkVF8duOvZHUjcZ8+TyHQtOdqfgxlweBgYhUhcwKC+ZIkZXbtjHgvDTxfl7+PipY+8zbmtCY4DuK5blQtMYBeE3du0z6Dj6VSROG3+qW7SP3Q+/qJ1Ael5BFDt7P+AW4dYTOoc9Mjox7YCv93+fOVjoBspOKupS8aAidWT0DWUnmd1AHRh6j5IM9PbbgyT/KB+D+ge6grJPYgYBij63/re+vhzDATsM8Sc6UIbAgoi6lfYWknnmgC0tHmD7AcMcR2rhJUtg6ciN9nV0g/zwUyn+cN8aAMCNuTxcHLvJHCwvQV3JKaKPg6uWG3+NVJj8auE1MNgEiRZ7yTk7McP2qON4QA+8VeIXddvSq+r8xg7HljBiV7UDaFmb0HH0KwAA9oDxG1DaQM4PvlihJ1rmYPbTFejMxCNbwkQgP4AU8A3P7xObzZUsV16khr3PzrI2iYPn3Dv50tEXdzbYl7uAfAcKy+Hw4kgHSXRh3DjKhF0VzTuWfWU93N5HsVMcGGyCjqM2x95Unzb8RH0QedGT+8lkWlnb3pjLO3IX85Z370X8wuZMxQK2LYC9AkKXz+/ln4NlbbLfxYnbrupfYfufw+JZDS8VAks3bm75qhs/FFi4MsWf1Ed+van9jlU4FNS479gWtAcA/0YACN3ZxPeplh/AVmTjjUiHJJPpIl2d8ea3JWUsFBUjbtx6U31slYG2bTUcqxaAvPjDqjcrUNfOCh2KAI2wsBmNeMEKFDfyUn5u3PhDFws5e4k13vwMFnKNkYmspcUDMDL88k7j34aF3DacvXCmbHnLT8eOSjxjB1xZzkNPpqskihWCcsNEpsvol86PF2XEyE/79mTaRQJLKb/SwAtQ2LCfNQlg74n94ciP2GEKVQKfji10WRoH7ygLHxH405L8RIfLhyvLecYRRSAu5wDYqws/HPkR6wO1/g2UFwqZleV82V7ORKJZ6HrIihlyw21Dqrmh20L3BuvGj89X2reQj5dgvTGXd57uJy4igu7Xq8a94vOB8sOcwPfD7yk/XpBigVRrXuAqgJ/X8RL81NRCpy2MVQUcC7Afcq9bU4EZlN/eav8APB11sjtVdl2DSuFiC7l5NghS+9y5986dWzKZLlobhYr3KNUqDpAb5XU1ewVkT3Bu/Jion5ghp1q7yk4rq+B2sjsFhcRzx6Cig4Ch+VE6QW3vM9GBH0527ekUHP7OywApYPwWcttwFa44TvDLhih3o7jbz2873s3fF+YjFamiGNOlGazmF3LbMNVyHU4MnYqMVyVuKmPGrxpZ1iYkEs2hnmr0y08E1fy8BBYVq1QEuhUhAFC8AeVXPPGHbv793WzZ+7e2dvjKM9HdtMiPCin+mi78zDuRxBV0OOVvvfNq8eO/3I8FGN98QcSR3i4wMty3E69XyCGS2kUqij+3e31rKTCDnl3YW00CHWvbBw+4BtRt7xBfgdCqpJKly18ZErY7yV9BYFmbym7DrxQ/eqoVlzJViT/sf1h08LHSQcDQ/OAHX134sUGG8EPRtZArLbeqEvh83FShM9OwcwJvy7UQEblGCMwdPFBVWgG5HikvP9xUxYznZvj5E1giVCpCAKCY3XGEMaeoYLibvw9f/de/wX/8638G5nY3fx9eT73qOheIuKFRhCKmzKVkArUkuB590+QQf0HEYCX4KZT4eNFVnGrHRzzVC+B+k0K1BWZQfoEdwGNt+9jnv306Bw9Wv3b8HL9XuYfoWNs++PvKZ4wL/mw2N29Pzqtf+xOBETkc/J4wPM2qUlyJRGp2Yoa1K01glTjWto/FDdsSP/NiS4X7R+MlGrxx36tqlxfz9//2J5ggRBGomheN27G2fb5zNvQiiA3UzgKkPZ2CpUUoOzlqnyi0nSLRXZSIWq/Q4XkF5SYzZuXORspRZMoWWLrz8yuw/Ah9uqyYJYYNFQyXcuMwde06fPTne77cPzxhm2iJC5+OQoWJD24VBeqtTz6P8bkTJvwUSny8Bgab0CWsOp/8jAF+CkzcA49j5tS1YCsMe2sNIJ1821pfgLZWgKnZNS0qeDoZ8+KVFwwyQO1bAIATPfa9PlOauad47QZFW+sLSnnSgYUWG8fa9jn6HQosVSIGOSEvAIDVtSesv+nwOCnapm1gx2sFnEtNKtoX2xXzYnXtiSOmKkSgCLiMhtdL4F4ctycryLzuJyg3fWKXkvaQAJ35+RVYQYQ+nXeoYMDfmZ6E4ts/6fVdmHiJaF688HApklwFKp7q/fgv92NvvfNqsVYB6Cd++Phar3hV6+KXVgGq48bHjhaX1aww7K1mgOYnPB4nelqViEDkiBMvnXxF3FUKU8pRpSj1I6CRK3LUScSIYqhqeZoXplRoATzRrn11BJ8XqnLXa6CmLgV9GlLJMY9OpHrx0p1bJX6q2pQWlyr5BRFY1RYhvBsdxJGqWkhDM3tut4ifH4GK4i8sjpXix8eLf99auFT6f0HaVvRaQbjtBQMDAwMDX4Mrbi/520qp+J3NzcPfV/Yx5/LB6pp0Xjpzo3vHK/Gbmo3WZfN6bR34+UW1Qr/Wq5P8iPxq+MkWqH75ybhqKswiLvJTwKJlLazUAZ443KIoq81aHIbVtSda8lPlnIqqMdG/qXTXSn3K3Rlqa30h8gnOb9/i8wG5qV7CxFjyLrmOoFtLbKhzUUVxQz68oy97bNGZm2ju0JFf+arME1CRJ34Elmqh79Y2QYS+Gz8ZgkuHQqnW2IU1j+zxS060bCkCJomf3w0zeKIlaipS6cQhk5sojqrjFRSra0+UiwSvZUDV3JLJdBGTs9q/QbXQUsnNbeuGbjFz46LD0n5QbrKfcKRz7CoVICqKcJH7RIU+ftB97byQVvUUKz/8VBdxOsavtJ/dyY3XB2GOiXv8BM1tXx3/sHiaMLImZZE7hIJF5FjpIlBFomp17YlW++uav9voGAx14SYS9apEKh0k6KEF/Kyru6YLKhVufLur7INuYyA/3qmY6IJwUyGqg/KTPfmK+OnCrR6EtGge9uKnKo46FyIqxpe91Q7OXgOxn98Jq8PhpYpF2IbYSoOjMfnLKVU4HfRUFwDA5v8+K+t0x9r2uU56qoBxVX161e3wUYmP8/CFDJ6iE8m80KNL6atrT7RyeLG/4ZK1LgJfzCVdxOU43dwhGq8Hq19DWys/0eixxYTnpnvsdOGHc4YO3ERGDG4XwlhOzULR6SLJ3bMYlJ/MZdZKRlYymS7ScVr1diJZ40tFB7DYvs2CNTW7VnGieLD6tTQhQ4XVQm6bvbfIPqffy3aLEi1xsDYKMD25xTjy9yfq5MhgXIM8UifqZPBygZq/2yitz2F88IPnRvlRV1yVE4juM37QeFJOKvd24hjDx89rQFRZhIjEvso25t+b74M4GdPVD9kOjFts3PjJblsRP9Xc3MQLnb8qGTE685PVB934eY0pMnNZ5fhiTgEbGBgYBBAxXiJVpVvpJbLQzZLNj05uQfipcFDdRKAO3Pj+p0NhbvjV//hS0QFMtMQ9nTWRUsXlQ+o6RIUTQ6fYUxX88OMdOBmgN3PzPCkfHe/XU31ilS5Fu8XI2ijAwGBT2f+Nuu/hpdOV8uPB6tdQbN9W1sbUsUQgH9X9jravV/x0B+VN984afuVtWemkp278dGzbSs6fjG1Yu40f7tnWcd92VH1wTxgN6jaw4yNTVG6arSRSZUH06C9VXPyKVp3azutOJhRiA4NNTPhFFVP6fiJBr5OAdhOsOvFLtMQrPhZPdX7QpXyvSQt/78TQKamTm+78/BbcOvNTxS1I+6oSqbuBn0qRrzJ/91RyX4I8V47H9OQWe6xKVBPx1LXroDuuZq9UnAR1wkJum7WbKhHIH56pBGujwERrZ6ZBKHZUCx3VbUqFqmo+fsYXXYoP5KqrE6kzP1rkGn7Rtq8qkWr41W/+7oniRRdy276XZWuFtVGoOfgylgr9xEAGFz9Ax+XS+fGK4lUG0NmrVAxczV6BS+fHy8SOyjbVoY29uOrQ37yKDOyLnZkGpVxRMPtpcyxKZfI1/OTwU8HNtK/hFxW/vX7ebGCwCaYn/R0nl72kVO1EjMICwF7uvHR+PJJNvX5f8+yFMwCw4xbm1F8fgS5aLfGtOW65dLEzU4BES9wWAhXiIotrte+BbTx17brvfIqK64mhU3BiSC4XUftOtVxnucjzKPWBkgiUmRs4wA4MNgUqNK2NAot7lE9+Mfzk85PFzbSv4SeD355KrkqtDlvUk0gtf7y1UQBro6B8GdnaKMDV7BWYunZdq+VgHfZe+e2DUTt+YbaxDtCBi/3Yqy3P9sU+gB+ykEymiwODTaxIDJqXb73zatHw2538ouZm2tfwk8Xv/wFZqZdb/TrepwAAAABJRU5ErkJggg==',walk:8,atk:8,w:40,h:48,pal:[{"13131c":"14171b","48522b":"4f492e","82956c":"91926f","687253":"706d55","1f2313":"221f14","37401f":"3e3921","989a8f":"999790","68574a":"453a3b","3c4043":"372022","8a7254":"644e4d","2b2f33":"271516","382822":"5c2e28","4d3c30":"804633"},{"13131c":"141920","48522b":"5f5728","82956c":"a9ad73","687253":"848159","1f2313":"292512","37401f":"4a441c","989a8f":"b3afa3","68574a":"6b2c37","3c4043":"52212d","8a7254":"803d3d","2b2f33":"2e1e29","382822":"333154","4d3c30":"424861"},{"13131c":"161620","48522b":"545f32","82956c":"97ad7d","687253":"798460","1f2313":"242916","37401f":"404a24","989a8f":"b0b3a6","68574a":"8f652b","3c4043":"61381e","8a7254":"a08436","2b2f33":"4d2514","382822":"412e27","4d3c30":"714638"}],crawl:{src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAwwAAAAYCAYAAABX0HprAAANY0lEQVR42u1dX2hb1xn/aTaEFIHtyCC1kZmXujherHhJGlKyDjdLGO1KN9MihgvDlI4xVoO7ZFCyZH4w6do+xNTMg401D2YPpogMb6V/HpIlpiwkOE1I5M42s4tHlMYaVmwzEZMH4z3I39HR0b1X99rS1bk33w9MjGw5+un3ne/8vu989wpgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAyGfzEKrI8C6/xOMLyIAL8FDAaDUR6EQlFDM5DJpALMi3kwl0dv7VChQN93+9B3Eb9u9pS+Ri2/BQwGg1Eew3Owsw6Hjx4pePzKxUuYGMe6l42cH3j5SR+/xZpX+YwC63ZNsp/NNHFz8n4wvIdANRKDX7oIzIU5MS/mIxue5ubdeOLJx4t+njM+K/CqkfM6Lz/p47dY8wMf7rAzHgXUViMxcIeHuTAn5uVHPvPz0wBQZHwOHz2CifExz24UfuHlJ33scKFi3AvryMvadAMBuj5BLRq80hBxUvR4Ka4YHiwY5C6CipxZ8I5BYC7MiXkxHxUT4ysb300jMXJNPN430IWv5+55dqO1w4v10YfLUH++WIgf24vJ9ENMJfMz9Dpy84M2RkWDVxoidosF0oA4DfWPPRKFA49a5fCNanQRjDYZdUF5pcPDXJgT82I+tIkCwNL9LABgcfEODnbWYah/DJ/+7TIAIH5sL9pirQiFouv05QdefuHhFX2suBDaYq0AgKnkDOI9hxDvOYSWWI2WWm1GG12LBrsNkYOddYZaVOsuSnYNscypb6ALfQNd8EouK1UMGX05eW/8DldHkvzSqWIuzIl5MR8VS/ezCNavomFHBMAKGhub0BKrET+PH9tbYOAA4OaN60AyqvUpih1eXuhi+0kfKy7B+lVkl7cDABIXbgsuADCbXPPN2kmMuNOhd9pdVn/X6aiVruaUzHMuZ08X8JFPtrxaLFC8NewIYmJ8RRSxXh5h9nTBcLCzDhPjKwVdhBdeacdQ/xiC9asAtnvmjWMuxYlEJ6PgJ338zMsuH6+MikSagli6n0XfQBeA3OhBSyyLffufEwWRFwycuq6d8NK5CPKTPna4EBIj1xDvOSTWmx/WDsVopeNsKwbeKw0RJ6cLxGmof0xolf+ZN0d9c3tNEAt3sgVrPneSMs1FwwZcHUnKdxGCAIDGxiZhFLyGR42L2XFjKBRdp2NJ1od5VSr25KNvHTecSDSMhTtZ8QUA5wZH8en5Scwm1/Cd3c8WGTjaZHXdRCPRMIL1q4LTi/GXcG5wFL/95e8xMb6C11590xMm24/6ZJcaBZdzg6MAgKlbC7h6aR6JkWt4+50TmErO5As45Dvd2hUKPtNGNdiU5+THhvrHioo63U21nK+Jj3yq4MWR2HyxkENbRwQtsRrId+3y+gizZwsGtYvQN9CFhh1BtMRq8MKPn/Pcm6dyuXppHgBw8q3TnuIxm1wTXFpiNegb6MKL8ZewuHgH2eXtePudE4YLjY7xPk58hKH+sap3f9U5Sj/Fmt/WkHwEHGkK4vDRI+gb6BIbbLznkBiroBjTcUSJLiwFIF4vkOuOZpe3o7GxCQBw6uRZDGdS2hs4WkNGnJ56YxhtHRH86c/vAwDGPvtAcNLVyFlxeXcuI/Sp+/mvPKMP8Xl3LoN35zLCuKnxBuRO5KiAk0/ydDOipdYOgbSRY03n2Xm1ISIXD7JR9QLo9UaagqIpQMXP13P3tPAABDvXgcjFwuvHu/Fi/CVMjK9gNrmGifEVMXJ15eIlrhQ2UOtWQgAgugeEc4OjmJ9dRGNjE1579VkkoHfFXYoLVdtygrP6O9VaXDKPtlgrppIzjvjQ8+lYNTFyTYtioS3WivbwNiQu3PZ8rBlplev2QiQ4wam/aaPwu+aJ++HbyQezyZw+cowB17XjQeZtIZXOdUpT6ZzxnMtgIhQtet5wJoXeZFQYOHlOWwc+tIZUTsH6VfSGohj+65cYwQdiNKFng9P7N2q0Mtkl9QHQK+nTG4piOJPKrZ9kflZbN31kPmc6DuS0wSoOdtah6/mf4dTJs0IbygX0bygUXZ9NrmmRI2Q+nR9+gt5QFMFgM7LZecORKfGak/m9c2Ic67roY5bj1AYPGVCz0THduVDO7hvoBgB8nPgIADYuTNd/HFblk13ejoOddTg3OIrXj3cX/b4XigWVUyaTClgV0VtZ/4FKE5BNnFyltnVEihKDjmbHiAsAR3xU8ShxVKMiJ2NNcMJHJMBoGMGGRezb/3TViwUjo5O7AHOmoDPilXgz41VKn2rGlFM+AIQ+ZnzkGANQsLHqUJyqMQcAn0+nhSEdeXmPqYHTpXFgpo3K6fStLwAAZzoOiO97Q1FkMqkAdfJk890Sq0E1jWkpfQBYGmyd9CmlDfEhTlTokDa6XUBrtp/KfOxoo9P6UXlRUZe4cLvgFKGgydPYhLffOYFTJ89ql6/N/Jucq6duLWB+dhHPHGkWPsBLHi5x4XZBnNG1c0v3s+Ki576BLlEw6PbBgWq8kT+QPU+kKXeqVXwR9+a5BCpBghYMAOza+RgA4Ku7DwqCjkZddE0KRgnAKR/Z/Cyk0qJbevPGddfNttkmumvnY/j7jSVh4qz4RKJh9Bz9FgDgvZGrVU0QZvrIC0c20QBsxZtunUQ13lRUM6acajSZflhQqKrrh9aKGmPxnkPanGLJ2kymH6I9vE1o9N7IVbHWjQyc7rFmxmk4k8KZjgO5DuNGQWRmRKtp4uzqc/rWF+gNRU310cFomzVCrOJN90aIHX3Mih9ddDFqAJbK115pktrxb0bwQuFjZz+lRofsHQC9Pmncjj+QR8cW7mTF3krXZczPT2+aT22lkhslBCJE/8qzimOf5Y+2c6Mx+SvR5bGXDdPnylXqVh0Qp3yWlpaF+Tl/Y1HMYM8m11wbHzGrruWkMJWcQVusVYwnmfFpD2/DV3cfVDXZ2eFDJvrjxEeiQ20Wb6V4uGGAzIofNd7UwqglVlMQU1YjO24aObN8QPjR/gahH8VbJBrG93aHRfIj/LTv+/jL0D+0aB6ofKaSM2gP5zV5q+eZAtND5kDXjdQovxlx6h25CmyM9ESiYfQCQCZlqEc1c4ITfYYzKfSOQ1t9jE4USsWb7oWCE310XTvy3qPqY+QPVI9g9y5VOuRrMz4qaGTZ7I5Vbudtu/upin37n8bCncsAgK/n7uGJJx83LBZ05qNeF9PWERGnJs3Nu/HHwfMBs6LXDjZN+EDdN8V/OF+7ZmoOPp9OC9P81d0HReMiqnGoVue03HzU56rVbKWDjfgQFzm5qQbbrHNgZMyrtTlZ6SPzuZn+smCMRe4amOljxb9Soz6bjTej10wdeCu4MbKkxlwpPgSZl8xPPWp1c+zKjj702tpiraIIUnOC2gCplgGyG2/02q040T3XqzkGt1V93rh8Eb2hKPoGuvDUG8NipEpnfUrx0Wn8yE/rR+ZCfFTz5sQfyM8123sqvbY2u//Q65VPgIxGtau195SDTyl4gY86XaGunc3eCj+wWSK/25lLsNOB/2GqPSqOF+WNR+5elzLQKsH8h7Ncq9hMrCyKXT6leMgJoRoGW9ZH5mJVMJglNflaBzWBu52wrfSR+dB7bmWiKR7NuibvjVwtKlgpFrfKfzPrB8h14FWoowjUpbPiUe7CW11DTvKBfJwqJ8CFVBrxY3uxa+djrnDYqj6RaBgNDfVoD28riks5v5ExdXMNOeVjlxNdbOr2GFwl9BnOpPDvP/RWpfgpFx+6cNjIYLs5ylNOfYiT280CoyLByfqx8ghy807dfyq571TSvxntp27l7a3sP3Z8HO2nfuCjFgyFNxSx51NrN0sEAH5zN4X52jXE26NFiwYAlpaWEYmGMZWcwVQyH1iT6Ydoi7XiB/E2ACgaH2mJ1RSQKPd9vY242OWTSKZNecjVHAnm9kZKnFQuKh8y2fSYUUUqGwgdOjtW+qgLxKrjPpWcwdJSGJPpesMEL4/60N9SPzCoHMna7vpZSKUNiwO1kGhoqC8w305GlsqxhjaTD1Rd5MJhMl1fUQ7l4kPaTKK+KJbk8bg3q7R2nPChmLLDyc07V1VSn/G5e7ipjC96iU/nh59g/Cc/BC7cNhzl7XbZYJdLHzoBMhovdQO0jzrhs5BKW3od2l/l3zHL13SnuGrng1L+bah/rIhPpfN2pflQIUT7qR/4qLhy8RKam3cX3Aa71AfUmf6A7n7RDQTkDi8A3P/XPwsWtZWJMeqGGpkvs/GRchhVucMic5F5/HdPrkM9sHDfko8Zj5s3rhe89koYbKNOkXy/4R3f/q7oGphxKToJseDg5umIHG9GpwoEO5zsQo1TI1NOMWn3wluVh5wQfr3yH0fxZlYklOKjPk89bbGjp1VXUo25UvrYPR0xeh793mY4OEnWcn7bCh/5LlAtsZqCLuFwJuXKCUM5+Njh1Dl43pVRHrf0cevuTpXgQyOjmUwq8Ivjr6y7eROER12fre6vRs8p96lCufg45VSJvO1HPnKhUAk+8ut8/uU96zR6FaxfRXZ5e8GdJK04/R/GCuGj1Z2Z9wAAAABJRU5ErkJggg==',w:52,h:24,move:6,atk:5,die:4}};
/* tampak depan & belakang zombi pack (digambar ulang dengan palet yang sama, outline otomatis) */
function paintPackFront(P,m,pose){const leg=pose.leg|0,atk=pose.atk|0,back=!!pose.back,bob=(leg===1||leg===3)?1:0;
  const C=k=>'#'+m(k),SK=C('82956c'),SI=C('687253'),SF=C('48522b'),SC=C('37401f'),SA=C('1f2313'),JH=C('68574a'),JJ=C('8a7254'),SH=C('3c4043'),SB=C('2b2f33'),PG=C('4d3c30'),PD=C('382822'),W='#ffffff',K=C('989a8f'),M='#13131c';
  /* kaki: kiri naik saat leg=1, kanan naik saat leg=3 */
  for(const s of[0,1]){const up=(s===0&&leg===1)||(s===1&&leg===3)?2:0,x=s?23:12;
    P(x,43-up,SI,5,3);P(x,43-up,SK,4,1);P(x+(s?3:0),45-up,SF,2,1);P(x,46-up,SC,5,1);
    P(x+1,37-up,SI,3,6);P(x+1,37-up,SK,1,6);P(x+3,37-up,SF,1,6);}
  /* celana */
  for(const s of[0,1]){const up=(s===0&&leg===1)||(s===1&&leg===3)?2:0,x=s?21:12;
    P(x,30+bob,PG,7,8-up-bob);P(x+(s?5:0),30+bob,PD,2,8-up-bob);P(x+(s?0:2),32+bob,PD,1,4-up);P(x,37-up,PD,7,1);}
  P(18,30+bob,PD,4,4);
  const y0=bob;
  /* badan & jaket */
  P(9,18+y0,JH,22,4);P(10,22+y0,JH,20,4);P(11,26+y0,JH,18,4);P(11,17+y0,JH,18,1);P(13,16+y0,JH,14,1);P(9,18+y0,JJ,22,1);P(11,29+y0,SB,18,1);
  if(!back){P(16,19+y0,SH,8,10);P(17,18+y0,SH,6,1);P(18,19+y0,SB,4,4);P(19,23+y0,SB,2,6);
    P(14,19+y0,JJ,2,9);P(24,19+y0,JJ,2,9);P(15,19+y0,PD,1,10);P(24,19+y0,PD,1,10);P(11,19+y0,JJ,2,3);P(27,19+y0,JJ,2,3);}
  else{P(19,19+y0,PD,2,10);P(12,18+y0,JJ,16,1);P(11,22+y0,PD,18,1);}
  P(11,27+y0,PD,18,1);
  /* lengan */
  const arm=(s)=>{const L=s===0,x=L?7:30,sw=atk?0:((leg===1?1:leg===3?-1:0)*(L?1:-1));
    if(atk===1){/* tangan terangkat */const ax=L?9:28;P(ax,10+y0,JH,3,9);P(ax,10+y0,JJ,1,9);P(ax-(L?1:-1),5+y0,SI,4,5);P(ax-(L?1:-1),5+y0,SK,3,1);P(ax+(L?-1:3),4+y0,SF,1,2);return;}
    if(atk===2){/* mencakar ke depan dada */const ax=L?8:28;P(ax,19+y0,JH,4,6);P(L?11:24,24+y0,JH,5,3);P(L?15:21,23+y0,SI,4,4);P(L?15:21,23+y0,SK,3,1);P(L?14:24,27+y0,SF,1,1);return;}
    P(x,19+y0,JH,3,9);P(x+(L?0:2),19+y0,JJ,1,8);P(x+(L?2:0),20+y0,PD,1,8);P(x,27+y0,PD,3,2);
    P(x-(L?1:-1)+(L?0:0),29+y0+sw,SI,4,4);P(x-(L?1:-1),29+y0+sw,SK,3,1);P(x+(L?-1:3),33+y0+sw,SF,1,2);P(x+(L?1:1),33+y0+sw,SF,1,2);};
  arm(0);arm(1);
  /* leher & kepala (tengkorak botak tinggi, rongga mata gelap dengan mata putih, gigi) */
  P(18,15+y0,SF,4,3);P(18,15+y0,SI,2,2);
  P(17,3+y0,SI,6,1);P(16,4+y0,SI,8,1);P(15,5+y0,SI,10,9);P(16,14+y0,SI,8,1);P(17,15+y0,SF,6,1);
  P(17,3+y0,SK,4,1);P(16,4+y0,SK,6,1);P(15,5+y0,SK,6,2);P(15,7+y0,SK,1,6);P(24,5+y0,SF,1,9);P(23,14+y0,SF,1,1);P(16,14+y0,SF,1,1);
  if(!back){P(15,7+y0,M,4,4);P(21,7+y0,M,4,4);P(16,8+y0,W,2,2);P(22,8+y0,W,2,2);P(15,6+y0,SF,4,1);P(21,6+y0,SF,4,1);
    P(19,10+y0,SC,2,2);P(17,12+y0,M,6,3);P(18,12+y0,W,1,2);P(21,12+y0,W,1,2);P(19,14+y0,K,2,1);
    if(atk===2){P(16,22+y0,'#c8281e',1,1);P(17,23+y0,'#c8281e',1,1);P(18,24+y0,'#c8281e',1,1);P(23,22+y0,'#c8281e',1,1);P(22,23+y0,'#c8281e',1,1);P(21,24+y0,'#c8281e',1,1);}}
  else{P(16,6+y0,SK,8,3);P(15,11+y0,SF,10,1);P(19,13+y0,SC,2,3);}}
function packSet(v,side){const m=h=>v>0&&ZPACK.pal[v-1][h]||h,mk=pose=>makeSprite(40,48,P=>paintPackFront(P,m,pose),'#13131c');
  const fw=[0,1,2,3].map(l=>mk({leg:l})),fa=[mk({atk:1}),mk({atk:2})],bw=[0,1,2,3].map(l=>mk({leg:l,back:true})),ba=[mk({atk:1,back:true}),mk({atk:1,back:true,leg:1})];
  const F={walk:fw,atk:fa,low:squash(fw[0],0.72),die:meltFrames(fw[0],6,'#a3201d','#5c0e0e'),pack:v};
  F.back={walk:bw,atk:ba,low:squash(bw[0],0.72),die:meltFrames(bw[0],6,'#a3201d','#5c0e0e')};
  F.side=side||F;return F;}
/* ================= zombi gaya "gritty" (digambar prosedural: badan bertulang 2D, bayangan 3 nada, noda darah, outline) ================= */
const GZ={};
function gzC(h){const v=parseInt(h.slice(1),16);return(0xff000000|((v&255)<<16)|(v&0xff00)|((v>>16)&255))>>>0;}
function gzM(a){return a.map(gzC);}/* [highlight, base, shadow, deep] */
function gzHash(x,y,s){let h=(x*374761393+y*668265263+s*982451653)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967296;}
function gzNoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,a=gzHash(xi,yi,s),b=gzHash(xi+1,yi,s),c=gzHash(xi,yi+1,s),d=gzHash(xi+1,yi+1,s),
  ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy;}
function gzCanvas(w,h,seed){return{w,h,px:new Uint32Array(w*h),id:new Uint8Array(w*h),seed};}
function gzTone(C,x,y,l,mat){const n=gzHash(x,y,C.seed+7);let t=l>0.42?0:l>-0.12?1:l>-0.6?2:3;if(n<0.12&&t<3)t++;else if(n>0.93&&t>0)t--;return mat[t];}
function gzPut(C,x,y,c,id){if(x<0||y<0||x>=C.w||y>=C.h)return;const i=y*C.w+x;C.px[i]=c;C.id[i]=id;}
/* kapsul (tulang/anggota badan) dengan jari-jari meruncing */
function gzCap(C,ax,ay,bx,by,ra,rb,mat,id,shade){const x0=Math.floor(Math.min(ax-ra,bx-rb)),x1=Math.ceil(Math.max(ax+ra,bx+rb)),y0=Math.floor(Math.min(ay-ra,by-rb)),y1=Math.ceil(Math.max(ay+ra,by+rb));
  const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy||1,L=Math.sqrt(L2),px=-dy/L,py=dx/L,sd=shade==null?0:shade;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const qx=x+0.5-ax,qy=y+0.5-ay;let t=(qx*dx+qy*dy)/L2;t=t<0?0:t>1?1:t;const r=ra+(rb-ra)*t,ex=qx-dx*t,ey=qy-dy*t,d=Math.sqrt(ex*ex+ey*ey);
    if(d>r)continue;const n=(ex*px+ey*py)/r;const l=-(px*n*0.75+py*n*0.65)-(t*0.12)-sd-(d/r>0.86?0.25:0);gzPut(C,x,y,gzTone(C,x,y,l,mat),id);}}
function gzEll(C,cx,cy,rx,ry,mat,id,shade){const sd=shade||0;for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
  const nx=(x+0.5-cx)/rx,ny=(y+0.5-cy)/ry,d=nx*nx+ny*ny;if(d>1)continue;const l=-(nx*0.7+ny*0.75)-sd-(d>0.8?0.25:0);gzPut(C,x,y,gzTone(C,x,y,l,mat),id);}}
function gzPoly(C,pts,mat,id,shade,jag){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const[x,y]of pts){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const cx=(x0+x1)/2,cy=(y0+y1)/2,hw=(x1-x0)/2||1,hh=(y1-y0)/2||1,sd=shade||0;
  for(let y=Math.floor(y0);y<=Math.ceil(y1)+(jag?2:0);y++)for(let x=Math.floor(x0);x<=Math.ceil(x1);x++){const X=x+0.5,Y=y+0.5;let inside=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){const[xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>Y)!==(yj>Y)&&X<(xj-xi)*(Y-yi)/(yj-yi)+xi)inside=!inside;}
    if(!inside&&jag){/* ujung sobek: tambah gerigi di bawah */const jy=y1+((gzHash(x,0,C.seed+3)*3)|0)-1;if(!(Y<=jy+1&&Y>y1-1&&X>x0+1&&X<x1-1))continue;}
    else if(!inside)continue;
    if(jag&&Y>y1-1&&gzHash(x,1,C.seed+5)<0.3)continue;
    const nx=(X-cx)/hw,ny=(Y-cy)/hh,l=-(nx*0.65+ny*0.35)-sd-(Math.abs(nx)>0.85?0.2:0);gzPut(C,x,y,gzTone(C,x,y,l,mat),id);}}
/* noda darah & kotoran di area tertentu */
function gzBlood(C,id,amt,mat,seed,yBias){for(let y=0;y<C.h;y++)for(let x=0;x<C.w;x++){const i=y*C.w+x;if(C.id[i]!==id)continue;
  const v=gzNoise(x*0.42,y*0.2,seed)*0.7+gzNoise(x*1.1,y*0.8,seed+1)*0.3+(yBias?(1-y/C.h)*yBias:0);if(v>1-amt){C.px[i]=v>1-amt*0.45?mat[2]:gzHash(x,y,seed)<0.5?mat[1]:mat[0];C.id[i]=9;}}}
function gzDot(C,x,y,c){gzPut(C,Math.round(x),Math.round(y),c,8);}
/* ----- spesifikasi jenis zombi ----- */
const GZSKIN=gzM(['#a8b292','#86917a','#626d58','#404a3a']),GZBLOOD=gzM(['#9a2020','#741414','#520c0c','#340606']);
function gzSpec(t,v){const S={t,v:v|0,skin:GZSKIN,shirt:gzM(['#e2dccf','#bdb3a3','#8f8476','#5e554c']),pants:gzM(['#6e5c4c','#56473a','#3e3229','#2a221c']),hair:gzM(['#4a3c32','#2e241e','#1e1814','#120e0c']),
  sleeve:'short',hair_t:'short',bodyW:1,belly:0,shoulder:1,armR:1,legR:1,headR:1,height:1,hunch:0.32,blood:0.26,canW:48,canH:64,mouth:'blood',eyes:'#e8e2c8'};
  const SH=[['#e2dccf','#bdb3a3','#8f8476','#5e554c'],['#7a7676','#5e5a5a','#444040','#2c2a2a'],['#c8945a','#a2743e','#7a542a','#4e341a'],['#c24a3e','#9a3028','#6e1e18','#441210'],
    ['#6a86b8','#4e6896','#384c70','#22304a'],['#d0d0c8','#a8a8a0','#7c7c76','#52524e'],['#7c8c58','#5e6c40','#46502c','#2c321c']];
  const PN=[['#6e5c4c','#56473a','#3e3229','#2a221c'],['#4a4644','#383432','#262422','#161414'],['#6a5038','#523c28','#3a2a1c','#241a10'],['#4e5c88','#3a466a','#28304a','#181e2e'],
    ['#4e5c88','#3a466a','#28304a','#181e2e'],['#5a5048','#463e36','#322c26','#201c18'],['#5e5440','#48402e','#342e20','#221e14']];
  if(t==='walk'||t==='crawl'){S.shirt=gzM(SH[S.v%7]);S.pants=gzM(PN[S.v%7]);if(S.v%7===1)S.skin=gzM(['#8c9478','#6e7660','#525a48','#363c30']);}
  if(t==='run'){S.shirt=gzM(['#7e8a52','#606b3c','#454e2a','#2c321a']);S.pants=gzM(['#666e46','#4e5534','#383d24','#232716']);S.hair_t='helmet';S.hair=gzM(['#6e7a42','#55602e','#3c4420','#262b14']);S.sleeve='long';S.hunch=0.45;}
  if(t==='fat'){S.bodyW=1.55;S.belly=1;S.shirt=gzM(['#e8e4d4','#c8c2ae','#9a9480','#6a6656']);S.sleeve='tank';S.hair_t='bald';S.skin=gzM(['#c4bc84','#a29a64','#7c7448','#544e30']);S.blood=0.3;S.mouth='vomit';S.armR=1.25;S.legR=1.3;}
  if(t==='brute'){S.bodyW=1.5;S.shoulder=1.55;S.armR=1.7;S.legR=1.45;S.headR=0.82;S.sleeve='none';S.hair_t='bald';S.skin=gzM(['#a896b8','#8a7a9c','#665878','#443a52']);S.pants=gzM(['#4c4c58','#3a3a44','#28282f','#18181e']);S.canW=72;S.hunch=0.5;}
  if(t==='boss'){S.bodyW=1.65;S.shoulder=1.7;S.armR=1.9;S.legR=1.6;S.headR=0.85;S.sleeve='none';S.hair_t='spikes';S.skin=gzM(['#c0584a','#9a3a30','#6e2420','#461412']);S.pants=gzM(['#3a3036','#2a2228','#1c161a','#100c0e']);S.canW=80;S.cracks=true;S.hunch=0.45;S.belly=0.6;}
  if(t==='hunter'){S.shirt=gzM(['#56628a','#3e486a','#2a324c','#1a2032']);S.sleeve='hood';S.hair_t='hood';S.hair=S.shirt;S.pants=gzM(['#6c6c70','#545458','#3c3c40','#262628']);S.hunch=0.55;S.blood=0.18;}
  if(t==='smoker'){S.height=1.1;S.bodyW=0.9;S.shirt=gzM(['#8e6a48','#6e5034','#4e3822','#322214']);S.sleeve='long';S.pustules=true;S.hair_t='thin';S.blood=0.2;}
  if(t==='charger'){S.bigArm=true;S.shoulder=1.2;S.shirt=gzM(['#ddd6c6','#b8b0a0','#8c8476','#5c564c']);S.hunch=0.5;}
  if(t==='jockey'){S.height=0.78;S.headR=1.2;S.hair_t='bald';S.shirt=gzM(['#9a8466','#7a6a50','#56483a','#383026']);S.hunch=0.7;S.mouth='grin';S.skin=gzM(['#d4c8b0','#b0a48c','#867a66','#5a5044']);}
  if(t==='spitter'){S.hair_t='long';S.hair=gzM(['#d8b468','#b08e48','#84682e','#5a461c']);S.shirt=gzM(['#7a5a8e','#5e4270','#422e52','#2a1c36']);S.sleeve='tank';S.mouth='acid';S.bodyW=0.88;}
  if(t==='witch'){S.sleeve='dress';S.shirt=gzM(['#f2eee6','#d2ccc2','#a49e94','#6e6a62']);S.hair_t='witch';S.hair=gzM(['#1e1a22','#141016','#0c0a0e','#060408']);S.skin=gzM(['#e4dcd2','#c4bcb2','#9a948a','#6a6660']);S.bodyW=0.85;S.claws=true;S.eyes='#ff3a2a';S.blood=0.2;}
  return S;}
/* ----- pose: dihitung per frame ----- */
function gzPose(kind,i,n,S){const p=i/n*Math.PI*2,s=Math.sin;
  if(kind==='walk')return{ph:p,lean:S.hunch+0.04*s(p*2),bob:Math.abs(s(p))*1.2,legs:[[0.42*s(p),0.15+0.5*Math.max(0,s(p+1.6))],[-0.42*s(p),0.15+0.5*Math.max(0,-s(p+1.6))]],arms:[[0.55+0.12*s(p),0.35],[0.65-0.12*s(p),0.3]],lift:[Math.max(0,s(p))*2.2,Math.max(0,-s(p))*2.2]};
  if(kind==='run')return{ph:p,lean:S.hunch+0.25,bob:Math.abs(s(p))*2,legs:[[0.75*s(p),0.25+0.9*Math.max(0,s(p+1.6))],[-0.75*s(p),0.25+0.9*Math.max(0,-s(p+1.6))]],arms:[[0.2-0.7*s(p),1.0],[0.2+0.7*s(p),1.0]],lift:[Math.max(0,s(p))*3.5,Math.max(0,-s(p))*3.5]};
  if(kind==='atk'){const k=[0,0.6,1,0.4][i%4];return{ph:0,lean:S.hunch+0.12+0.22*k,bob:0,legs:[[0.3,0.3],[-0.25,0.2]],arms:[[0.75+0.8*k,0.45-0.35*k],[0.6+0.7*Math.max(0,k-0.3),0.5]],lift:[0,0],atk:k};}
  return gzPose('walk',0,8,S);}
/* ----- gambar satu frame ----- */
function gzDraw(S,view,pose,seed){const W=S.canW,H=S.canH,C=gzCanvas(W,H,seed),cx=W/2,g=H-2,hS=S.height,bw=S.bodyW,sh=S.shoulder,PT=C.parts={};
  let hr=5.6*S.headR;const Lth=11*hS,Lsh=11*hS,Lt=17*hS,Lu=10*hS*(S.t==='brute'||S.t==='boss'?1.2:1),Lf=10*hS*(S.t==='brute'||S.t==='boss'?1.25:1),legR=3.4*S.legR,armR=2.4*S.armR,hipY=g-Lth-Lsh-2.5+pose.bob*0.6,hrF=hr*1.12;
  const SK=S.skin,SHt=S.shirt,PA=S.pants,HA=S.hair,BL=GZBLOOD,dark=c=>c;
  const shirtArm=S.sleeve==='long'||S.sleeve==='hood'||S.sleeve==='dress',noShirt=S.sleeve==='none';
  if(view==='side'){
    const hip=[cx-2,hipY],lean=pose.lean,shp=[hip[0]+Math.sin(lean)*Lt,hip[1]-Math.cos(lean)*Lt];
    const leg=(a,k,near)=>{const kn=[hip[0]+Math.sin(a)*Lth,hip[1]+Math.cos(a)*Lth],an=[kn[0]+Math.sin(a-k)*Lsh,kn[1]+Math.cos(a-k)*Lsh],sd=near?0:0.55;
      const mid=[kn[0]+(an[0]-kn[0])*0.55,kn[1]+(an[1]-kn[1])*0.55];
      if(S.sleeve==='dress'){gzCap(C,mid[0],mid[1],an[0],an[1],legR*0.75,legR*0.62,SK,1,sd);}else{
      gzCap(C,hip[0],hip[1],kn[0],kn[1],legR,legR*0.85,PA,3,sd);gzCap(C,kn[0],kn[1],mid[0],mid[1],legR*0.85,legR*0.8,PA,3,sd);gzCap(C,mid[0],mid[1],an[0],an[1],legR*0.62,legR*0.55,SK,1,sd);}
      gzEll(C,an[0]+2.2,an[1]+0.6,3.6*S.legR*0.8,1.6,SK,1,sd);if(near)PT.leg=[Math.min(hip[0],kn[0],an[0])-legR,hip[1]-1,Math.max(hip[0],kn[0],an[0])+legR+3,g+0.5];};
    const arm=(b,e,near,big)=>{const R=big?armR*2.1:armR,LU=big?Lu*1.15:Lu,LF=big?Lf*1.25:Lf,o=[shp[0]+(near?0.5:-1.5),shp[1]+2],el=[o[0]+Math.sin(b)*LU,o[1]+Math.cos(b)*LU],hd=[el[0]+Math.sin(b+e)*LF,el[1]+Math.cos(b+e)*LF],sd=near?0:0.55;
      gzCap(C,o[0],o[1],el[0],el[1],R*1.12,R,(shirtArm&&!big)?SHt:(noShirt||S.sleeve==='tank'||big)?SK:SHt,(shirtArm&&!big)?2:1,sd);
      if(S.sleeve==='short'&&!big)gzCap(C,o[0],o[1],o[0]+(el[0]-o[0])*0.55,o[1]+(el[1]-o[1])*0.55,R*1.3,R*1.2,SHt,2,sd);
      gzCap(C,el[0],el[1],hd[0],hd[1],R,R*0.8,(shirtArm&&!big&&S.sleeve!=='dress')?SHt:SK,(shirtArm&&!big&&S.sleeve!=='dress')?2:1,sd);
      gzEll(C,hd[0]+Math.sin(b+e)*1.4,hd[1]+Math.cos(b+e)*1.4,R*0.95*(big?1.2:1),R*1.1*(big?1.2:1),SK,1,sd);
      if(near)PT.arm=[Math.min(o[0],el[0],hd[0])-R*1.1,o[1]-R,Math.max(o[0],el[0],hd[0])+R*1.1,hd[1]+R*2.4];
      const fx=hd[0]+Math.sin(b+e)*(R*1.9),fy=hd[1]+Math.cos(b+e)*(R*1.9);for(let k=-1;k<=1;k++)gzDot(C,fx+k*0.9*Math.cos(b+e),fy-k*0.9*Math.sin(b+e),S.claws?gzC('#e8e0c8'):SK[3]);};
    /* lengan & kaki jauh */
    arm(pose.arms[1][0],pose.arms[1][1],false,false);leg(pose.legs[1][0],pose.legs[1][1],false);
    /* badan */
    const tw=7.2*bw,tp=[[hip[0]-tw*0.55,hip[1]+1.5],[hip[0]+tw*0.6+S.belly*4,hip[1]+1.5],[shp[0]+tw*0.55+S.belly*3,shp[1]+5],[shp[0]+tw*0.35,shp[1]-0.5],[shp[0]-tw*0.6,shp[1]+0.5],[hip[0]-tw*0.75,hip[1]-Lt*0.5]];
    gzCap(C,hip[0],hip[1]+1,hip[0]+2,hip[1]+3,legR*1.25,legR*1.2,PA,3);
    if(S.sleeve==='dress'){gzPoly(C,[[hip[0]-9,g-6],[hip[0]+11,g-6],[shp[0]+6,shp[1]+3],[shp[0]-5,shp[1]]],SHt,2,0,true);}
    else gzPoly(C,tp,noShirt?SK:SHt,noShirt?1:2,0,!noShirt&&S.sleeve!=='tank');
    if(S.belly>0)gzEll(C,hip[0]+tw*0.4+S.belly*3,hip[1]-Lt*0.35,tw*0.6+S.belly*3,Lt*0.42,noShirt?SK:SHt,noShirt?1:2);
    if(S.sleeve==='hood')gzEll(C,shp[0]-3,shp[1]-1,5,4,SHt,2,0.2);
    /* kepala */
    const hc=[shp[0]+Math.sin(lean+0.5)*(hr+2.5),shp[1]-Math.cos(lean+0.5)*(hr+2.5)];PT.head=[hc[0]-hr,hc[1]-hr*1.1,hc[0]+hr*1.15,hc[1]+hr*1.05];PT.torso=[hip[0]-tw*0.75,shp[1]-0.5,hip[0]+tw*0.6+S.belly*4,hip[1]+1.5];
    gzCap(C,shp[0],shp[1]+1,hc[0],hc[1]+2,2.4*S.headR,2.2*S.headR,SK,1);
    gzEll(C,hc[0],hc[1],hr*0.95,hr*1.05,SK,1);gzEll(C,hc[0]+hr*0.55,hc[1]+hr*0.7,hr*0.5,hr*0.35,SK,1,0.2);/* rahang */
    if(S.hair_t==='short'||S.hair_t==='thin'){for(let y=Math.floor(hc[1]-hr*1.1);y<hc[1]-hr*0.15;y++)for(let x=Math.floor(hc[0]-hr*1.05);x<hc[0]+hr*0.6;x++){const nx=(x+0.5-hc[0])/(hr*0.98),ny=(y+0.5-hc[1])/(hr*1.08);if(nx*nx+ny*ny<=1.02&&(S.hair_t!=='thin'||gzHash(x,y,seed)<0.5)&&!(y>hc[1]-hr*0.4&&gzHash(x,7,seed)<0.4))gzPut(C,x,y,gzTone(C,x,y,-nx*0.5-ny*0.6,HA),4);}}
    if(S.hair_t==='helmet'){gzEll(C,hc[0]-0.5,hc[1]-hr*0.45,hr*1.12,hr*0.72,HA,4);gzCap(C,hc[0]-hr,hc[1]-hr*0.1,hc[0]+hr*1.1,hc[1]-hr*0.1,1,1,HA,4,0.3);}
    if(S.hair_t==='hood'){gzEll(C,hc[0]-1,hc[1]-0.5,hr*1.25,hr*1.2,HA,4);gzEll(C,hc[0]+hr*0.45,hc[1]+0.5,hr*0.55,hr*0.7,gzM(['#1a1c26','#12141c','#0c0e14','#06070a']),4);}
    if(S.hair_t==='long'||S.hair_t==='witch'){gzEll(C,hc[0]-0.5,hc[1]-hr*0.35,hr*1.08,hr*0.85,HA,4);gzCap(C,hc[0]-hr*0.6,hc[1],hc[0]-hr*0.9,hc[1]+hr*(S.hair_t==='witch'?4.2:2.6),hr*0.8,hr*0.5,HA,4);if(S.hair_t==='witch')gzCap(C,hc[0]+hr*0.2,hc[1],hc[0]+hr*0.9,hc[1]+hr*2,hr*0.55,hr*0.35,HA,4);}
    if(S.hair_t==='spikes')for(let k=0;k<4;k++){const bx=hc[0]-hr*0.6+k*hr*0.45,by=hc[1]-hr*0.9;gzCap(C,bx,by,bx-1,by-4-(k%2)*2,1.2,0.4,gzM(['#f2ead2','#d8ccaa','#a89c80','#706650']),8);}
    if(S.hair_t!=='hood'&&S.hair_t!=='witch'){/* mata & mulut */
      gzPut(C,Math.round(hc[0]+hr*0.45),Math.round(hc[1]-hr*0.15),gzC('#1a0e0e'),8);gzPut(C,Math.round(hc[0]+hr*0.55),Math.round(hc[1]-hr*0.15),gzC(S.eyes),8);
      const mx=Math.round(hc[0]+hr*0.75),my=Math.round(hc[1]+hr*0.45);gzPut(C,mx,my,gzC('#2a0606'),8);gzPut(C,mx-1,my,gzC('#4a0a0a'),8);gzPut(C,mx,my-1,gzC('#e8e0c8'),8);gzPut(C,mx,my+1,gzC(S.mouth==='acid'?'#9be05a':S.mouth==='vomit'?'#b8d050':'#8e1616'),8);gzPut(C,mx-1,my+2,gzC(S.mouth==='acid'?'#c6ff4a':'#6e1010'),8);}
    else if(S.hair_t==='witch'){gzPut(C,Math.round(hc[0]+hr*0.6),Math.round(hc[1]),gzC('#ff3a2a'),8);}
    /* kaki & lengan dekat */
    leg(pose.legs[0][0],pose.legs[0][1],true);
    if(S.bigArm)arm(pose.arms[0][0]*0.7,pose.arms[0][1]*0.5,true,true);else arm(pose.arms[0][0],pose.arms[0][1],true,false);
  }else{
    /* depan / belakang */
    const back=view==='back',hunchY=pose.lean*3,hip=[cx,hipY],shY=hip[1]-Lt*Math.cos(pose.lean*0.5)+hunchY,sw=8.0*sh*bw*0.92,ww=5.2*bw;
    const legF=(side)=>{const x=cx+side*(4.6*bw*S.legR*0.85),lift=pose.lift[side<0?0:1],kn=[x-side*0.6,hip[1]+Lth-lift],an=[x+side*0.9,g-1.5-lift*0.9];
      if(S.sleeve==='dress'){gzCap(C,x,hip[1]+Lth*0.8,an[0],an[1],legR*0.6,legR*0.5,SK,1);}else{
      gzCap(C,x,hip[1],kn[0],kn[1],legR,legR*0.9,PA,3,side>0?0.15:0);const mid=[kn[0]+(an[0]-kn[0])*0.5,kn[1]+(an[1]-kn[1])*0.5];
      gzCap(C,kn[0],kn[1],mid[0],mid[1],legR*0.9,legR*0.85,PA,3,side>0?0.15:0);gzCap(C,mid[0],mid[1],an[0],an[1],legR*0.6,legR*0.55,SK,1,side>0?0.15:0);}
      gzEll(C,an[0]+side*0.6,an[1]+0.8,2.6*S.legR*0.9,1.5,SK,1);PT['leg'+side]=[Math.min(x,an[0])-legR-0.5,hip[1],Math.max(x,an[0])+legR+0.5,g+0.5];};
    legF(-1);legF(1);
    gzCap(C,cx-ww*0.55,hip[1],cx+ww*0.55,hip[1],legR*1.05,legR*1.05,PA,3);
    const armF=(side)=>{const big=S.bigArm&&side>0,R=big?armR*2:armR,o=[cx+side*(sw+1.6),shY+2.4],sw2=pose.arms[side<0?0:1],reach=Math.min(1,Math.max(0,(sw2[0]-0.4)/1.4)),
      el=[o[0]+side*(3.4+R*0.5),o[1]+Lu*(big?1.1:0.98)*(1-reach*0.55)],hd=[el[0]+side*(1.4-reach*3.8),el[1]+Lf*(big?1.15:0.95)*(1-reach*0.65)-reach*2];
      gzCap(C,o[0],o[1],el[0],el[1],R*1.1,R,(shirtArm&&!big)?SHt:(noShirt||S.sleeve==='tank'||big)?SK:SHt,(shirtArm&&!big)?2:1,side>0?0.18:0);
      if(S.sleeve==='short'&&!big)gzCap(C,o[0],o[1],o[0]+(el[0]-o[0])*0.5,o[1]+(el[1]-o[1])*0.5,R*1.3,R*1.25,SHt,2,side>0?0.18:0);
      gzCap(C,el[0],el[1],hd[0],hd[1],R,R*0.82,(shirtArm&&!big&&S.sleeve!=='dress')?SHt:SK,(shirtArm&&!big&&S.sleeve!=='dress')?2:1,side>0?0.18:0);
      gzEll(C,hd[0],hd[1]+R*0.9,R*1.0*(big?1.25:1),R*1.2*(big?1.25:1),SK,1,side>0?0.15:0);
      for(let k=-1;k<=1;k++)gzDot(C,hd[0]+k*1.1,hd[1]+R*2.2,S.claws?gzC('#e8e0c8'):SK[3]);PT['arm'+side]=[Math.min(o[0],el[0],hd[0])-R*1.1,o[1]-R,Math.max(o[0],el[0],hd[0])+R*1.1,hd[1]+R*2.4];};
    /* badan */
    PT.torso=[cx-sw-1,shY-1,cx+sw+1,hip[1]+1];const tp=[[cx-ww,hip[1]+1],[cx+ww,hip[1]+1],[cx+sw+1,shY+2],[cx+sw*0.6,shY-1],[cx-sw*0.6,shY-1],[cx-sw-1,shY+2]];
    if(S.sleeve==='dress')gzPoly(C,[[cx-11,g-5],[cx+11,g-5],[cx+sw,shY+2],[cx+sw*0.5,shY-1],[cx-sw*0.5,shY-1],[cx-sw,shY+2]],SHt,2,0,true);
    else gzPoly(C,tp,noShirt?SK:SHt,noShirt?1:2,0,!noShirt&&S.sleeve!=='tank');
    if(S.belly>0)gzEll(C,cx,hip[1]-Lt*0.3,ww+S.belly*2.5,Lt*0.42,noShirt?SK:SHt,noShirt?1:2);
    if(!back&&!noShirt&&S.sleeve!=='tank'&&S.sleeve!=='dress'){/* kemeja terbuka: kerah & kancing */for(let y=Math.round(shY);y<hip[1]-1;y++){gzPut(C,cx,y,SHt[3],2);if(y<shY+5){gzPut(C,cx-1,y,SK[2],1);gzPut(C,cx+1,y,SK[2],1);}}
      gzPut(C,cx-3,Math.round(shY),SHt[0],2);gzPut(C,cx+3,Math.round(shY),SHt[0],2);}
    if(noShirt&&!back){for(let y=Math.round(shY+4);y<hip[1]-2;y+=3){gzPut(C,cx-2,y,SK[2],1);gzPut(C,cx+2,y,SK[2],1);}gzCap(C,cx-sw*0.55,shY+3,cx+sw*0.55,shY+3,0.6,0.6,SK[2]?[SK[2],SK[2],SK[3],SK[3]]:SK,1);}
    if(S.pustules)for(let k=0;k<5;k++)gzEll(C,cx-sw*0.6+gzHash(k,1,seed)*sw*1.2,shY+3+gzHash(k,2,seed)*(Lt-6),1.2,1.2,gzM(['#e8a090','#c06a5a','#8a4038','#5a2420']),8);
    if(S.cracks&&!back)for(let k=0;k<3;k++){let x=cx-4+k*4,y=shY+4;for(let j=0;j<7;j++){gzPut(C,Math.round(x),Math.round(y),gzC(j%2?'#ffb23e':'#ff7a3a'),8);x+=gzHash(j,k,seed)<0.5?-0.6:0.6;y+=1.2;}}
    if(S.hair_t==='spikes')for(const s2 of[-1,1])for(let k=0;k<2;k++)gzCap(C,cx+s2*(sw-1-k*3),shY,cx+s2*(sw+1-k*3),shY-5-k*2,1.3,0.4,gzM(['#f2ead2','#d8ccaa','#a89c80','#706650']),8);
    armF(-1);armF(1);
    /* kepala */
    const hr0=hr;hr=hrF;const hc=[cx,shY-hr*0.85+hunchY*0.25];C.head=[hc[1]-hr*1.12,hc[1]+hr*1.05];PT.head=[cx-hr*0.95,C.head[0],cx+hr*0.95,C.head[1]];
    gzCap(C,cx,shY+1,cx,hc[1]+hr*0.6,2.6*S.headR,2.4*S.headR,SK,1);
    gzEll(C,hc[0],hc[1],hr*0.92,hr*1.08,SK,1);
    const hairTop=(cover)=>{for(let y=Math.floor(hc[1]-hr*1.15);y<hc[1]+hr*cover;y++)for(let x=Math.floor(hc[0]-hr);x<=Math.ceil(hc[0]+hr);x++){const nx=(x+0.5-hc[0])/(hr*0.97),ny=(y+0.5-hc[1])/(hr*1.12);
      if(nx*nx+ny*ny>1.04)continue;if(!back&&y>hc[1]-hr*0.45&&S.hair_t!=='long'&&S.hair_t!=='witch')continue;if(!back&&y>hc[1]-hr*0.62&&gzHash(x,3,seed)<0.45&&S.hair_t!=='long'&&S.hair_t!=='witch')continue;
      if(S.hair_t==='thin'&&gzHash(x,y,seed)<0.45)continue;if((S.hair_t==='long'||S.hair_t==='witch')&&!back&&Math.abs(nx)<0.55&&y>hc[1]-hr*0.3&&S.hair_t==='long')continue;gzPut(C,x,y,gzTone(C,x,y,-nx*0.5-ny*0.6,HA),4);}};
    if(S.hair_t==='short'||S.hair_t==='thin')hairTop(back?0.5:-0.4);
    if(S.hair_t==='helmet'){gzEll(C,hc[0],hc[1]-hr*0.45,hr*1.15,hr*0.75,HA,4);gzCap(C,hc[0]-hr*1.15,hc[1]-hr*0.1,hc[0]+hr*1.15,hc[1]-hr*0.1,1,1,HA,4,0.3);}
    if(S.hair_t==='hood'){gzEll(C,hc[0],hc[1]-0.5,hr*1.25,hr*1.25,HA,4);if(!back)gzEll(C,hc[0],hc[1]+1,hr*0.72,hr*0.85,gzM(['#1a1c26','#12141c','#0c0e14','#06070a']),4);}
    if(S.hair_t==='long'){hairTop(1.0);if(!back)for(const s2 of[-1,1])gzCap(C,hc[0]+s2*hr*0.85,hc[1],hc[0]+s2*hr*0.95,hc[1]+hr*2.4,hr*0.38,hr*0.25,HA,4);else gzCap(C,hc[0],hc[1],hc[0],hc[1]+hr*2.6,hr*0.9,hr*0.6,HA,4);}
    if(S.hair_t==='witch'){gzEll(C,hc[0],hc[1]+hr*0.3,hr*1.1,hr*1.4,HA,4);gzCap(C,hc[0],hc[1],hc[0],hc[1]+hr*3.8,hr*1.0,hr*0.75,HA,4);}
    if(S.hair_t==='spikes')for(let k=0;k<5;k++){const bx=hc[0]-hr*0.7+k*hr*0.35;gzCap(C,bx,hc[1]-hr*0.8,bx+(k-2)*0.6,hc[1]-hr*1.6-(k%2)*2,1.1,0.4,gzM(['#f2ead2','#d8ccaa','#a89c80','#706650']),8);}
    if(!back){const ey=Math.round(hc[1]-hr*0.1);
      if(S.hair_t==='witch'){gzPut(C,Math.round(hc[0]-2),ey+1,gzC('#ff3a2a'),8);gzPut(C,Math.round(hc[0]+2),ey+1,gzC('#ff3a2a'),8);}
      else{for(const s2 of[-1,1]){const ex=Math.round(hc[0]+s2*hr*0.42);gzPut(C,ex,ey,gzC('#1a0e0e'),8);gzPut(C,ex+(s2<0?-1:1),ey,gzC('#2a1414'),8);gzPut(C,ex,ey-1,SK[3],8);gzPut(C,s2<0?ex:ex,ey,gzC(S.eyes),8);gzPut(C,ex+(s2<0?-1:1),ey+1,SK[3],8);}
        const my=Math.round(hc[1]+hr*0.45),mx=Math.round(hc[0]);const mw=S.mouth==='grin'?3:2;
        for(let x=mx-mw;x<=mx+mw-1;x++){gzPut(C,x,my,gzC('#e8e0c8'),8);gzPut(C,x,my+1,gzC('#2a0606'),8);gzPut(C,x,my+2,gzC(x===mx-mw||x===mx+mw-1?'#4a0a0a':'#5a0c0c'),8);}
        gzPut(C,mx-1,my,gzC('#2a0606'),8);gzPut(C,mx+mw-2,my+3,gzC('#e8e0c8'),8);
        const drip=S.mouth==='acid'?gzM(['#c6ff4a','#9be05a','#6a9a2a','#3e6a1a']):S.mouth==='vomit'?gzM(['#d8e870','#b8d050','#8aa030','#5a7020']):BL;
        for(let k=0;k<3;k++){const x=mx-1+k;const L=2+((gzHash(k,9,seed)*4)|0);for(let j=0;j<L;j++)gzPut(C,x,my+3+j,drip[j<1?0:1],8);}}}
  }
  /* noda darah: baju lebih banyak di depan & kerah, kulit di tangan */
  gzBlood(C,2,S.blood*(view==='back'?0.75:1),BL,seed+11,0.25);gzBlood(C,1,S.blood*0.35,BL,seed+21,0);gzBlood(C,3,S.blood*0.25,gzM(['#5a2a22','#4a1e18','#3a1410','#2a0c0a']),seed+31,0);
  return C;}
function gzSprite(C){return makeSprite(C.w,C.h,(P,g)=>{const id=g.createImageData(C.w,C.h);new Uint32Array(id.data.buffer).set(C.px);g.putImageData(id,0,0);},'#120a0c');}
/* set animasi lengkap satu jenis: walk 8, atk 4, untuk depan/samping/belakang */
function gzSet(t,v){const S=gzSpec(t,v),seed=(t.length*131+v*977)|0,kind=t==='run'?'run':'walk';let HZ=null;const mk=(view,pose)=>{const C=gzDraw(S,view,pose,seed);if(view==='front'&&!HZ&&C.head)HZ=[(C.h-C.head[1])/48,(C.h-C.head[0])/48];const s=gzSprite(C);s.base=64;return s;};
  const mkv=view=>{const walk=[];for(let i=0;i<8;i++)walk.push(mk(view,gzPose(kind,i,8,S)));const atk=[];for(let i=0;i<4;i++)atk.push(mk(view,gzPose('atk',i,4,S)));
    const low=squash(walk[0],0.72);low.base=64;const die=meltFrames(walk[0],6,'#a3201d','#5c0e0e');die.forEach(d=>d.base=64);return{walk,atk,low,die};};
  const F=mkv('front');F.side=mkv('side');F.back=mkv('back');F.gz=true;F.hz=HZ;return F;}

/* zombi merangkak gaya gritty: setengah badan, kanvas 48x32 (dasar 64) */
function gzCrawlDraw(S,view,f,atk,seed){const W=48,H=32,C=gzCanvas(W,H,seed),SK=S.skin,SHt=S.shirt,HA=S.hair,BL=GZBLOOD,g=H-2,p=f/4*Math.PI*2,s=Math.sin,hr=5.4;
  if(view==='side'){const hip=[9,g-4],shp=[27,g-7-(atk?1:0)],armA=(k)=>{const a=0.9+0.55*s(p+k*Math.PI)+(atk?0.35:0),e=-0.9;return a;};
    /* lengan jauh */{const a=armA(1),el=[shp[0]+Math.sin(a)*8,shp[1]+Math.cos(a)*8*0.6],hd=[el[0]+5,g-1.2];gzCap(C,shp[0],shp[1],el[0],el[1],2.2,2,SHt,2,0.55);gzCap(C,el[0],el[1],hd[0],hd[1],2,1.7,SK,1,0.55);gzEll(C,hd[0]+1,hd[1],2,1.3,SK,1,0.5);}
    gzEll(C,hip[0]-1,g-2,4,2.5,BL,9);for(let k=0;k<6;k++)gzPut(C,hip[0]-5-k,g-((k*7)%3),BL[(k%2)+1],9);
    gzPoly(C,[[hip[0]-4,g-1],[hip[0]-4,g-7],[shp[0]-2,shp[1]-4],[shp[0]+3,shp[1]-3],[shp[0]+2,g-1]],SHt,2,0,false);
    const hc=[shp[0]+5,shp[1]-6-(atk?-2:0)];gzEll(C,hc[0],hc[1],hr*0.95,hr,SK,1);gzEll(C,hc[0]+3,hc[1]+3,2.6,1.8,SK,1,0.2);
    for(let y=Math.floor(hc[1]-hr*1.05);y<hc[1]-hr*0.2;y++)for(let x=Math.floor(hc[0]-hr);x<hc[0]+hr*0.5;x++){const nx=(x+0.5-hc[0])/hr,ny=(y+0.5-hc[1])/hr;if(nx*nx+ny*ny<=1.02)gzPut(C,x,y,gzTone(C,x,y,-nx*0.5-ny*0.6,HA),4);}
    gzPut(C,Math.round(hc[0]+2.4),Math.round(hc[1]-0.8),gzC('#1a0e0e'),8);gzPut(C,Math.round(hc[0]+3),Math.round(hc[1]-0.8),gzC(S.eyes),8);gzPut(C,Math.round(hc[0]+4),Math.round(hc[1]+2.5),gzC('#2a0606'),8);gzPut(C,Math.round(hc[0]+4),Math.round(hc[1]+1.5),gzC('#e8e0c8'),8);gzPut(C,Math.round(hc[0]+4),Math.round(hc[1]+3.5),BL[1],8);
    /* lengan dekat */{const a=armA(0),el=[shp[0]+Math.sin(a)*8,shp[1]+Math.cos(a)*8*0.6],hd=[el[0]+5,g-0.8];gzCap(C,shp[0]+1,shp[1]+1,el[0],el[1],2.4,2.2,SHt,2);gzCap(C,el[0],el[1],hd[0],hd[1],2.1,1.8,SK,1);gzEll(C,hd[0]+1,hd[1],2.2,1.4,SK,1);
      for(let k=0;k<3;k++)gzPut(C,Math.round(hd[0]+3),Math.round(hd[1]-1+k),SK[3],8);}}
  else{const back=view==='back',cx=W/2,by=(f===1||f===3)?1:0;
    gzEll(C,cx,g-1,13,2,BL,9);
    for(const sd of[-1,1]){const reach=back?0:(s(p+(sd<0?0:Math.PI))*2),ax=cx+sd*10,ay=g-6+by;gzCap(C,cx+sd*7,g-11+by,ax+sd*2,ay,2.6,2.3,SHt,2,sd>0?0.2:0);gzCap(C,ax+sd*2,ay,ax+sd*4,g-1.5-Math.max(0,reach),2.2,1.9,SK,1,sd>0?0.2:0);gzEll(C,ax+sd*4.5,g-1.2-Math.max(0,reach),2.4,1.5,SK,1);}
    gzPoly(C,[[cx-9,g-4+by],[cx+9,g-4+by],[cx+10,g-12+by],[cx-10,g-12+by]],SHt,2,0,true);
    if(back){gzEll(C,cx,g-14+by,hr,hr*0.9,SK,1);for(let y=g-21;y<g-12;y++)for(let x=cx-6;x<=cx+6;x++){const nx=(x+0.5-cx)/hr,ny=(y+0.5-(g-14+by))/(hr*0.9);if(nx*nx+ny*ny<=1.02&&y<g-12+by)gzPut(C,x,y,gzTone(C,x,y,-nx*0.5-ny*0.6,HA),4);}
      gzEll(C,cx,g-2,6,2.4,BL,9);}
    else{const hy=g-13+by+(atk?2:0);gzEll(C,cx,hy,hr*0.95,hr*1.05,SK,1);for(let y=Math.floor(hy-hr*1.1);y<hy-hr*0.45;y++)for(let x=cx-6;x<=cx+6;x++){const nx=(x+0.5-cx)/hr,ny=(y+0.5-hy)/(hr*1.05);if(nx*nx+ny*ny<=1.02&&gzHash(x,y,seed)<0.85)gzPut(C,x,y,gzTone(C,x,y,-nx*0.5-ny*0.6,HA),4);}
      for(const sd of[-1,1]){const ex=Math.round(cx+sd*2.3),ey=Math.round(hy-0.6);gzPut(C,ex,ey,gzC('#1a0e0e'),8);gzPut(C,ex,ey,gzC(S.eyes),8);gzPut(C,ex+sd,ey,gzC('#1a0e0e'),8);}
      const my=Math.round(hy+2.4);for(let x=cx-2;x<=cx+1;x++){gzPut(C,x,my,gzC('#e8e0c8'),8);gzPut(C,x,my+1,gzC('#2a0606'),8);}gzPut(C,cx-1,my+2,BL[1],8);gzPut(C,cx,my+3,BL[2],8);}}
  gzBlood(C,2,S.blood,BL,seed+11,0.2);gzBlood(C,1,S.blood*0.3,BL,seed+21,0);return C;}
function gzCrawlSet(v){const S=gzSpec('crawl',v),seed=(911+v*977)|0,mk=(view,f,atk)=>{const sp=gzSprite(gzCrawlDraw(S,view,f,atk,seed));sp.base=64;return sp;};
  const mkv=view=>{const walk=[0,1,2,3].map(f=>mk(view,f,false)),atk=[mk(view,0,true),mk(view,2,true)],die=meltFrames(walk[0],6,'#a3201d','#5c0e0e');die.forEach(d=>d.base=64);return{walk,atk,low:walk[0],die};};
  const F=mkv('front');F.side=mkv('side');F.back=mkv('back');F.gz=true;return F;}
const GZS={};
function gzGet(t,v){const k=t+':'+v;return GZS[k]||(GZS[k]=t==='crawl'?gzCrawlSet(v):gzSet(t,v));}
/* zombi merangkak (setengah badan, mengejar sambil menyeret tubuh): tampak depan & belakang, kanvas 40x24 */
function paintPackCrawl(P,m,pose){const f=pose.f|0,back=!!pose.back,atk=!!pose.atk,C=k=>'#'+m(k),SK=C('82956c'),SI=C('687253'),SF=C('48522b'),SC=C('37401f'),JH=C('68574a'),JJ=C('8a7254'),SH=C('3c4043'),PD=C('382822'),W='#ffffff',M='#13131c',BL='#7a1212',BR='#b0211c';
  const by=(f===1||f===3)?1:0,lf=f===1?-2:f===3?1:0,rf=f===3?-2:f===1?1:0;
  P(9,22,BL,22,2);P(12,21,BR,6,1);P(23,21,BL,5,1);
  if(!back){
    /* lengan meraih ke depan (ke arah kamera) */
    for(const[L,o]of[[1,lf],[0,rf]]){const x=L?5:28;P(x+(L?4:0),12+by,JH,4,6);P(x+(L?4:0),12+by,JJ,4,1);P(x+(L?2:2),17+by+o,JH,4,3);
      P(x+(L?0:3),19+o,SI,5,3);P(x+(L?0:3),19+o,SK,4,1);P(x+(L?0:7),22+o,SF,1,1);P(x+(L?2:5),22+o,SF,1,1);}
    /* bahu & badan */
    P(11,11+by,JH,18,7);P(12,10+by,JH,16,1);P(11,11+by,JJ,18,1);P(17,12+by,SH,6,6);P(15,12+by,PD,1,6);P(24,12+by,PD,1,6);
    /* kepala (agak menunduk saat menggigit) */const hy=(atk?3:1)+by;
    P(16,hy,SI,8,1);P(15,hy+1,SI,10,9);P(16,hy+10,SI,8,1);P(16,hy,SK,5,1);P(15,hy+1,SK,5,2);P(24,hy+1,SF,1,9);
    P(15,hy+3,M,4,3);P(21,hy+3,M,4,3);P(16,hy+4,W,2,1);P(22,hy+4,W,2,1);P(19,hy+6,SC,2,1);
    P(17,hy+7,M,6,3);P(18,hy+7,W,1,2);P(21,hy+7,W,1,2);if(atk){P(17,hy+10,BR,6,1);P(19,hy+11,BR,2,1);}}
  else{
    for(const[L,o]of[[1,lf],[0,rf]]){const x=L?4:29;P(x+(L?3:0),11+by,JH,4,5);P(x+(L?0:3),15+by+o,SI,4,3);P(x+(L?0:3),15+by+o,SK,3,1);}
    P(11,9+by,JH,18,8);P(12,8+by,JH,16,1);P(19,10+by,PD,2,7);P(12,9+by,JJ,16,1);P(13,15+by,PD,14,1);
    P(14,17+by,JH,12,2);P(15,19,BR,10,2);P(16,20,BL,8,2);P(17,19,'#5c0e0e',2,1);P(21,20,'#5c0e0e',2,1);P(18,21,SH,4,1);
    P(16,1+by,SI,8,1);P(15,2+by,SI,10,7);P(16,2+by,SK,7,3);P(15,8+by,SF,10,1);P(19,6+by,SC,2,3);}}
function crawlSet(v,side){const m=h=>v>0&&ZPACK.pal[v-1][h]||h,mk=pose=>makeSprite(40,24,P=>paintPackCrawl(P,m,pose),'#13131c');
  const fw=[0,1,2,3].map(f=>mk({f})),fa=[mk({f:0,atk:true}),mk({f:2,atk:true})],bw=[0,1,2,3].map(f=>mk({f,back:true}));
  const F={walk:fw,atk:fa,low:fw[0],die:meltFrames(fw[0],6,'#a3201d','#5c0e0e'),pack:v};
  F.back={walk:bw,atk:bw,low:bw[0],die:meltFrames(bw[0],6,'#a3201d','#5c0e0e')};F.side=side||F;return F;}
/* zombi biasa memakai sprite dari zombie pack (4 varian warna), dimuat dari gambar sheet */
const FRV={};
function zFr(type,id){if(type==='walk'||type==='crawl')return gzGet(type,(id>>>0)%7);if(ZT[type])return gzGet(type,0);return FR[type];}
/* siapkan sprite semua jenis zombi sedikit demi sedikit setelah game terbuka, supaya tidak tersendat saat muncul */
setTimeout(function warm(){const L=[['walk',0],['walk',1],['run',0],['walk',2],['crawl',0],['fat',0],['walk',3],['hunter',0],['smoker',0],['spitter',0],['jockey',0],['charger',0],['walk',4],['walk',5],['walk',6],['brute',0],['witch',0],['boss',0]];let i=0;(function step(){if(i>=L.length)return;try{gzGet(L[i][0],L[i][1]);}catch(e){}i++;setTimeout(step,40);})();},600);
function zPackPal(v){const m=h=>'#'+(v>0&&ZPACK.pal[v-1][h]||h);return Object.assign({},ZPAL.walk,{skin:m('687253'),skinS:m('48522b'),skinH:m('82956c'),shirt:m('68574a'),shirtS:m('3c4043'),shirtH:m('8a7254'),
  pants:m('4d3c30'),pantsS:m('382822'),pantsH:m('4d3c30'),shoe:m('1f2313'),belt:m('2b2f33'),hair:null,eye:'#ffffff',eye2:'#ffffff'});}
function packDecode(img,W0,H0,n){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
  const base=new Uint32Array(g.getImageData(0,0,c.width,c.height).data.buffer).slice(),toU=h=>{const v=parseInt(h,16);return(0xff000000|((v&255)<<16)|(v&0xff00)|((v>>16)&255))>>>0;};const out=[];
  for(let v=0;v<=ZPACK.pal.length;v++){const map=new Map();if(v>0)for(const k in ZPACK.pal[v-1])map.set(toU(k),toU(ZPACK.pal[v-1][k]));const fr=[];
    for(let i=0;i<n;i++){const px=new Uint32Array(W0*H0);for(let y=0;y<H0;y++)for(let x=0;x<W0;x++){let q=base[y*c.width+i*W0+x];if((q>>>24)>=128){const m=map.get(q>>>0);if(m)q=m;}else q=0;px[y*W0+x]=q;}
      const cv=document.createElement('canvas');cv.width=W0;cv.height=H0;const cg=cv.getContext('2d'),id=cg.createImageData(W0,H0);new Uint32Array(id.data.buffer).set(px);cg.putImageData(id,0,0);fr.push({w:W0,h:H0,cv,px});}
    out.push(fr);}return out;}
function packImg(src,cb){const img=new Image();img.onload=()=>{try{cb(img);}catch(e){}};img.src=src;}
if(0)packImg(ZPACK.src,img=>{const sets=packDecode(img,ZPACK.w,ZPACK.h,ZPACK.walk+ZPACK.atk).map((fr,v)=>{const walk=fr.slice(0,ZPACK.walk),atk=fr.slice(ZPACK.walk);
    return packSet(v,{walk,atk,low:squash(walk[1],0.72),die:meltFrames(walk[1],6,'#a3201d','#5c0e0e')});});
  FRV.walk=sets;FRV.run=sets;for(const z of zs)if(z.type==='walk'||z.type==='run')z.fr=zFr(z.type,z.id);});
if(0)packImg(ZPACK.crawl.src,img=>{const C=ZPACK.crawl,sets=packDecode(img,C.w,C.h,C.move+C.atk+C.die).map((fr,v)=>{const mv=fr.slice(0,C.move),at=fr.slice(C.move,C.move+C.atk),de=fr.slice(C.move+C.atk);
    return crawlSet(v,{walk:mv,atk:at,low:mv[0],die:[de[0],de[1],de[2],de[3],de[3],de[3]]});});
  FRV.crawl=sets;for(const z of zs)if(z.type==='crawl')z.fr=zFr('crawl',z.id);});


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
/* senjata di sprite pemain/bot: tampak depan, samping, belakang */
const SGC={g:'#3a3e45',h:'#6a707a',s:'#24272c',k:'#0c0d0f',p:'#1b1d21',ph:'#3c4148',w:'#8a5a2e',wd:'#5e3a1c',o:'#56652a',oh:'#7e8f42',os:'#38431a',r:'#b8402e',rh:'#e0603a',gr:'#4e5a32',grh:'#6e7c46',b:'#c8ccd4',bh:'#eef0f4',v:'#7a4ab8',br:'#c9a64a',l:'#4fb8c8'};
function sGunF(P,w,K){const C=SGC;
  if(w==='pistol'){P(17,25,C.g,6,4);P(17,25,C.h,6,1);P(18,24,C.s,4,2);P(19,24,C.k,2,2);P(17,28,K.skin,6,2);}
  else if(w==='sg'){P(13,26,C.w,14,3);P(13,25,C.g,14,2);P(13,25,C.h,14,1);P(17,22,C.s,6,4);P(18,23,C.k,2,2);P(20,23,C.k,2,2);}
  else if(w==='rl'){P(12,26,C.wd,4,3);disc(P,24,21,4.4,C.o);disc(P,23.5,20.5,3.2,C.r);P(22,19,C.rh,2,1);P(25,25,C.os,4,1);P(27,17,C.p,3,2);}
  else if(w==='awp'){P(13,25,C.gr,14,4);P(13,25,C.grh,14,1);P(17,20,C.p,7,4);P(18,21,C.l,5,2);P(18,21,'#a8e8f0',1,1);P(19,24,C.k,2,2);}
  else if(w==='parang'){P(25,26,C.wd,2,4);P(24,25,C.s,4,1);for(let i=0;i<11;i++){P(26+(i>>2),24-i,C.b,2,1);P(26+(i>>2),24-i,C.bh,1,1);}P(27,19,'#a3201d',1,2);}
  else if(w==='kriss'){P(14,25,C.p,12,4);P(14,25,C.ph,12,1);P(17,23,C.s,4,3);P(18,24,C.k,2,2);P(23,26,C.v,2,2);P(18,29,C.p,3,4);}
  else{P(13,25,C.g,14,4);P(13,25,C.h,14,1);P(25,26,C.s,2,3);P(17,22,C.s,5,5);P(18,23,C.k,3,3);P(10,26,C.o,4,5);P(10,26,C.oh,4,1);P(13,24,C.br,3,1);}}
function sGunS(Q,w){const C=SGC;
  if(w==='pistol'){Q(26,25,C.g,8,3);Q(26,25,C.h,8,1);Q(33,25,C.k,1,1);Q(26,28,C.s,3,3);}
  else if(w==='sg'){Q(12,25,C.wd,6,3);Q(12,25,C.w,6,1);Q(18,24,C.g,8,4);Q(18,24,C.h,8,1);Q(26,24,C.s,13,2);Q(26,24,C.h,13,1);Q(26,26,C.s,10,1);Q(28,26,C.w,6,2);Q(22,28,C.wd,2,2);}
  else if(w==='rl'){Q(9,22,C.o,24,5);Q(9,22,C.oh,24,1);Q(9,26,C.os,24,1);Q(18,22,C.wd,3,5);Q(33,21,C.r,4,7);Q(33,21,C.rh,4,1);Q(37,23,C.rh,2,3);Q(20,19,C.p,4,3);Q(21,20,C.l,1,1);Q(22,27,C.wd,2,3);}
  else if(w==='awp'){Q(11,25,C.gr,7,4);Q(11,25,C.grh,7,1);Q(18,24,C.gr,11,4);Q(18,24,C.grh,11,1);Q(29,25,C.s,11,1);Q(39,24,C.p,1,3);Q(19,21,C.p,10,2);Q(29,21,C.l,1,2);Q(22,23,C.s,1,1);Q(26,23,C.s,1,1);Q(23,28,C.p,2,2);Q(20,28,C.gr,2,2);}
  else if(w==='parang'){Q(26,27,C.wd,4,2);Q(29,26,C.s,1,4);for(let i=0;i<11;i++){Q(30+i,26-(i>>1),C.b,1,2);Q(30+i,27-(i>>1),C.bh,1,1);}Q(33,24,'#a3201d',2,1);}
  else if(w==='kriss'){Q(15,25,C.s,4,2);Q(19,24,C.p,10,4);Q(19,24,C.ph,10,1);Q(29,25,C.s,4,2);Q(21,26,C.v,3,1);Q(24,28,C.p,2,5);Q(21,28,C.p,2,2);Q(22,22,C.ph,6,1);}
  else{Q(13,25,C.s,5,3);Q(18,24,C.g,14,4);Q(18,24,C.h,14,1);Q(32,25,C.s,8,2);Q(39,24,C.p,1,3);Q(22,22,C.s,6,1);Q(24,28,C.o,5,4);Q(24,28,C.oh,5,1);Q(29,28,C.br,2,1);Q(21,28,C.s,2,2);}}
function sGunB(P,w){const C=SGC;
  if(w==='pistol'){P(26,28,C.g,3,4);}
  else if(w==='rl'){P(25,6,C.o,5,18);P(25,6,C.oh,1,18);P(25,4,C.r,5,3);}
  else if(w==='parang'){P(28,10,C.b,2,14);P(28,10,C.bh,1,14);P(28,24,C.wd,2,4);}
  else{const c=w==='sg'?C.w:w==='awp'?C.gr:w==='kriss'?C.p:C.g;P(27,9,c,2,13);P(27,9,w==='awp'?C.grh:C.h,1,13);if(w==='awp')P(26,12,C.p,1,5);}}
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
    sGunF(P,pose.w||'mg',K);
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
    sGunB(P,pose.w||'mg');
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
  sGunS(Q,pose.w||'mg');
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
function getSold(si,ci,wi){si=Math.max(0,Math.min(SKINS.length-1,si|0));ci=ci|0;wi=wi==null?1:(wi|0)%ORDER.length;const wn=ORDER[wi],key=(si*10+ci)*8+wi;let v=SOLDC.get(key);if(v)return v;const K=SKINS[si],[t,ts]=TEAMS[ci%4];
  const front=[0,1].map(f=>makeSprite(40,48,P=>paintSoldier(P,K,t,ts,{f,back:false,w:wn}),OUT));
  const back=[0,1].map(f=>makeSprite(40,48,P=>paintSoldier(P,K,t,ts,{f,back:true,w:wn}),OUT));
  const crouch=[false,true].map(b=>makeSprite(40,48,P=>paintSoldier(P,K,t,ts,{f:0,back:b,crouch:true,w:wn}),OUT));
  const side=[0,1].map(f=>makeSprite(40,48,P=>paintSoldierSide(P,K,t,ts,{f,w:wn}),OUT)),crouchS=makeSprite(40,48,P=>paintSoldierSide(P,K,t,ts,{f:0,crouch:true,w:wn}),OUT);
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
/* ================= senjata di tangan pemain: model 3D mini dirender jadi pixel art (serong kanan) ================= */
const FPW={W:480,H:140,CX:240,OY:8,F:216},FMB=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>v/16-0.47);
function fmR(rx,ry,rz){const a=Math.cos(rx||0),b=Math.sin(rx||0),c=Math.cos(ry||0),d=Math.sin(ry||0),e=Math.cos(rz||0),f=Math.sin(rz||0);
  return fmM([[c,0,d],[0,1,0],[-d,0,c]],fmM([[1,0,0],[0,a,-b],[0,b,a]],[[e,-f,0],[f,e,0],[0,0,1]]));}
function fmM(A,B){const R=[[0,0,0],[0,0,0],[0,0,0]];for(let i=0;i<3;i++)for(let j=0;j<3;j++)R[i][j]=A[i][0]*B[0][j]+A[i][1]*B[1][j]+A[i][2]*B[2][j];return R;}
function fmV(A,v){return[A[0][0]*v[0]+A[0][1]*v[1]+A[0][2]*v[2],A[1][0]*v[0]+A[1][1]*v[1]+A[1][2]*v[2],A[2][0]*v[0]+A[2][1]*v[1]+A[2][2]*v[2]];}
/* bingkai: titik asal + rotasi, bisa bertingkat (senjata -> bagian -> jari) */
function fmF(par,o,r){const R=r?fmR(r[0],r[1],r[2]):[[1,0,0],[0,1,0],[0,0,1]];if(!par)return{o:o.slice(),R};const p=fmV(par.R,o);return{o:[par.o[0]+p[0],par.o[1]+p[1],par.o[2]+p[2]],R:fmM(par.R,R)};}
function fmP(F,v){const p=fmV(F.R,v);return[F.o[0]+p[0],F.o[1]+p[1],F.o[2]+p[2]];}
function fmTone(c,k){const h=hex(c);return'#'+h.map(v=>Math.max(0,Math.min(255,Math.round(k<0?v*(1+k):v+(255-v)*k)))).map(v=>v.toString(16).padStart(2,'0')).join('');}
function fmRamp(c){return[fmTone(c,-0.55),fmTone(c,-0.28),c,fmTone(c,0.3)];}
const FMAT={gun:['#141518','#25282d','#3c4148','#6a727c'],poly:['#0e0f11','#1b1d21','#2c2f35','#4a4f57'],wood:['#331c0e','#5a3518','#84522a','#b4783e'],woodD:['#24140a','#3e2412','#5c3a1e','#80542e'],
  olive:['#232a10','#38431a','#56652a','#7e8f42'],green:['#1e2814','#323e22','#4a5830','#6e7e48'],war:['#3a1208','#7a2416','#b8402e','#ec7a50'],brass:['#5a4416','#8a6a26','#c9a64a','#f4dc8a'],
  blade:['#3e424a','#727882','#b4b9c3','#f2f4f8'],lens:['#071c22','#14505e','#3aa8bc','#b4f0f8'],dark:['#08090a','#0e0f11','#16181b','#24272c'],tan:['#4a3a22','#6e5a36','#94804e','#bca876'],
  purple:['#2a1446','#4a2a78','#7a4ab8','#b07aff'],red:['#3a0c0c','#6a1414','#a3201d','#d84a3a'],tape:['#2a2a22','#46463a','#6a6a58','#8e8e78']};
function fmScene(){const S={polys:[],pid:0};
  /* kotak: pusat (cx,cy,cz) di bingkai F, ukuran sx,sy,sz; o.r rotasi lokal, o.tz skala ujung depan (+z), o.ty skala sisi atas */
  S.box=(F,c,s,mat,o)=>{o=o||{};const sep=!!o.sep;const B=fmF(F,c,o.r),id=S.pid++,tz=o.tz==null?1:o.tz,ty=o.ty==null?1:o.ty,V=[];
    for(let i=0;i<8;i++){const x=(i&1?1:-1)*s[0]/2,y=(i&2?1:-1)*s[1]/2,z=(i&4?1:-1)*s[2]/2,kz=i&4?tz:1,ky=i&2?ty:1;V.push(fmP(B,[x*kz*ky,y*kz,z]));}
    const cen=fmP(B,[0,0,0]);for(const f of[[1,3,7,5],[0,4,6,2],[2,6,7,3],[0,1,5,4],[4,5,7,6],[0,2,3,1]])S.polys.push({v:f.map(i=>V[i]),mat,id,cen,ol:!o.noOl,sep});return id;};
  /* tabung sepanjang z lokal */
  S.cyl=(F,c,r,len,mat,o)=>{o=o||{};const B=fmF(F,c,o.r),id=S.pid++,n=o.n||8,r2=o.r2==null?r:o.r2,A=[],Z=[],ry=o.ry||1;
    for(let i=0;i<n;i++){const a=(i+0.5)/n*Math.PI*2,x=Math.cos(a),y=Math.sin(a);A.push(fmP(B,[x*r,y*r*ry,-len/2]));Z.push(fmP(B,[x*r2,y*r2*ry,len/2]));}
    const cen=fmP(B,[0,0,0]);for(let i=0;i<n;i++){const j=(i+1)%n;S.polys.push({v:[A[i],A[j],Z[j],Z[i]],mat,id,cen,ol:true});}
    S.polys.push({v:A.slice().reverse(),mat:o.capB||mat,id,cen,ol:true});S.polys.push({v:Z.slice(),mat:o.capF||mat,id,cen,ol:true});return id;};
  /* balok dari titik a ke b (lengan, jari) */
  S.limb=(a,b,w,h,mat,o)=>{o=o||{};const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(d[0],d[1],d[2]),z=d.map(v=>v/L);let up=o.up||[0,1,0];
    let x=[up[1]*z[2]-up[2]*z[1],up[2]*z[0]-up[0]*z[2],up[0]*z[1]-up[1]*z[0]];const xl=Math.hypot(...x)||1;x=x.map(v=>v/xl);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
    const F={o:[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],R:[[x[0],y[0],z[0]],[x[1],y[1],z[1]],[x[2],y[2],z[2]]]};return S.box(F,[0,0,0],[w,h,L],mat,Object.assign({},o,{r:null}));};
  return S;}
/* render ke kanvas: proyeksi perspektif dengan pusat = tengah layar, cahaya dari kiri atas, 4 nada warna per bahan, garis gelap di antara bagian */
function fmRender(S,w,h,cx,cy){const F=FPW.F,N=w*h,zb=new Float32Array(N),idb=new Int32Array(N).fill(-1),cb=new Uint32Array(N),mb=new Array(N);
  const L=(()=>{const l=[-0.55,0.75,-0.4],k=Math.hypot(...l);return l.map(v=>v/k);})(),RGB={};
  const col=c=>RGB[c]||(RGB[c]=(()=>{const t=hex(c);return(255<<24)|(t[2]<<16)|(t[1]<<8)|t[0];})());
  for(const p of S.polys){const v=p.v;if(v.some(q=>q[2]<0.02))continue;
    let n=[0,0,0];for(let i=0;i<v.length;i++){const a=v[i],b=v[(i+1)%v.length];n[0]+=(a[1]-b[1])*(a[2]+b[2]);n[1]+=(a[2]-b[2])*(a[0]+b[0]);n[2]+=(a[0]-b[0])*(a[1]+b[1]);}
    const nl=Math.hypot(...n);if(nl<1e-12)continue;n=n.map(q=>q/nl);const fc=v.reduce((s,q)=>[s[0]+q[0]/v.length,s[1]+q[1]/v.length,s[2]+q[2]/v.length],[0,0,0]);
    if((fc[0]-p.cen[0])*n[0]+(fc[1]-p.cen[1])*n[1]+(fc[2]-p.cen[2])*n[2]<0)n=n.map(q=>-q);
    if(n[0]*fc[0]+n[1]*fc[1]+n[2]*fc[2]>=0)continue;/* menghadap menjauh */
    const vl=Math.hypot(...fc),dif=Math.max(0,n[0]*L[0]+n[1]*L[1]+n[2]*L[2]),rim=Math.max(0,-(n[0]*fc[0]+n[1]*fc[1]+n[2]*fc[2])/vl);
    const I=0.18+0.62*dif+0.25*rim,mat=p.mat;
    const P=v.map(q=>[cx+F*q[0]/q[2],cy-F*q[1]/q[2],1/q[2]]);
    for(let t=1;t+1<P.length;t++){const A=P[0],B=P[t],C=P[t+1],ar=(B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]);if(Math.abs(ar)<1e-9)continue;
      const x0=Math.max(0,Math.floor(Math.min(A[0],B[0],C[0]))),x1=Math.min(w-1,Math.ceil(Math.max(A[0],B[0],C[0]))),y0=Math.max(0,Math.floor(Math.min(A[1],B[1],C[1]))),y1=Math.min(h-1,Math.ceil(Math.max(A[1],B[1],C[1])));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const px=x+0.5,py=y+0.5,w0=((B[0]-px)*(C[1]-py)-(B[1]-py)*(C[0]-px))/ar,w1=((C[0]-px)*(A[1]-py)-(C[1]-py)*(A[0]-px))/ar,w2=1-w0-w1;
        if(w0<-1e-6||w1<-1e-6||w2<-1e-6)continue;const z=w0*A[2]+w1*B[2]+w2*C[2],i=y*w+x;if(z<=zb[i])continue;
        const Ii=I+FMB[(y&3)*4+(x&3)]*0.1+(((x*73856093^y*19349663)>>>0)%100/100-0.5)*0.03,ti=Ii<0.42?0:Ii<0.62?1:Ii<0.86?2:3;zb[i]=z;idb[i]=p.id;cb[i]=col(mat[ti]);mb[i]=p;}}}
  /* garis di batas bagian (yang lebih jauh digelapkan) */
  const out=cb.slice();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(idb[i]<0)continue;
    for(const j of[x+1<w?i+1:-1,y+1<h?i+w:-1,x>0?i-1:-1,y>0?i-w:-1]){if(j<0||idb[j]<0||idb[j]===idb[i])continue;
      if(zb[i]<zb[j]&&(mb[i].mat!==mb[j].mat||zb[j]/zb[i]>1.035||mb[i].sep)&&mb[i].ol){out[i]=col(mb[i].mat[0]);break;}}}
  return out;}
function fmSprite(S,w,h,cx,cy){const px=fmRender(S,w,h,cx,cy);const s=makeSprite(w,h,(P,g)=>{const id=g.createImageData(w,h);new Uint32Array(id.data.buffer).set(px);g.putImageData(id,0,0);},OUT);return s;}
function fmProj(F,p,cx,cy){const q=fmP(F,p);return[Math.round(cx+FPW.F*q[0]/q[2]),Math.round(cy-FPW.F*q[1]/q[2])];}
/* ----- tangan ----- */
function fmMats(){return{gl:[FPC.gs,FPC.g,FPC.gh,fmTone(FPC.gh,0.25)],sl:[fmTone(FPC.ss,-0.35),FPC.ss,FPC.s,FPC.sh],cuff:fmRamp(FPC.sc)};}
/* tangan kanan menggenggam pegangan: G = bingkai pegangan (y sepanjang pegangan, z ke depan), lebar pegangan gw */
function fmGrip(S,G,M,gw,elbow,o){o=o||{};const m=o.mir||1,hw=(gw/2+0.012)*m;
  S.box(G,[0.006*m,-0.006,-0.028],[gw+0.024,0.07,0.032],M.gl);/* punggung tangan */
  for(let k=0;k<(o.trig?3:4);k++){const y=(o.trig?-0.014:0.012)-k*0.02;S.box(G,[0,y,0.02],[gw+0.02,0.017,0.02],M.gl,{sep:1});S.box(G,[-hw+0.004*m,y,0.004],[0.012,0.016,0.034],M.gl,{sep:1});}/* jari melingkar, ujung di sisi kiri */
  if(o.trig)S.limb(fmP(G,[-hw+0.004*m,0.026,0.0]),fmP(G,[-hw+0.006*m,0.03,0.055]),0.014,0.014,M.gl,{sep:1});/* telunjuk lurus di samping pelatuk */
  S.limb(fmP(G,[-hw+0.003*m,0.026,-0.03]),fmP(G,[-hw-0.002*m,0.036,0.03]),0.016,0.016,M.gl,{sep:1});/* ibu jari */
  const wr=fmP(G,[0.01*m,-0.03,-0.06]),cu=fmP(G,[0.016*m,-0.05,-0.1]);S.limb(wr,cu,0.06,0.055,M.gl);S.limb(cu,fmP(G,[0.02*m,-0.065,-0.13]),0.072,0.066,M.cuff);
  S.limb(fmP(G,[0.02*m,-0.062,-0.125]),elbow,0.085,0.08,M.sl);}
/* tangan kiri menopang dari bawah: H = bingkai di bawah popor depan, lebar benda gw */
function fmSupport(S,H,M,gw,elbow){const hw=gw/2+0.01;
  S.box(H,[0,-0.012,0],[gw+0.02,0.024,0.08],M.gl);/* telapak di bawah */
  for(let k=0;k<4;k++){const z=0.03-k*0.02;S.box(H,[-hw,0.012,z],[0.014,0.034,0.017],M.gl,{r:[0,0,0.15],sep:1});}/* jari di sisi kiri */
  S.box(H,[hw,0.008,0.02],[0.014,0.03,0.03],M.gl);
  const wr=fmP(H,[-0.004,-0.03,-0.05]);S.limb(fmP(H,[0,-0.02,-0.02]),wr,0.055,0.05,M.gl);const cu=fmP(H,[-0.008,-0.05,-0.085]);S.limb(wr,cu,0.066,0.062,M.cuff);S.limb(cu,elbow,0.08,0.075,M.sl);}
/* bingkai senjata: posisi di ruang kamera, sedikit diarahkan ke tengah layar */
function fmGun(p,yaw,pitch,roll){return fmF(null,p,[pitch||0,yaw||0,roll||0]);}
function fmBuild(kind){const S=fmScene(),M=fmMats(),W=FPW.W,H=FPW.H,cx=FPW.CX,cy=108-(216-H+FPW.OY);let G,mz,ej;
  const fin=(w,h,cx2,cy2)=>{const s=fmSprite(S,w||W,h||H,cx2==null?cx:cx2,cy2==null?cy:cy2);return s;};
  if(kind==='pistol'){G=fmGun([0.18,-0.13,0.47],-0.06,-0.015,-0.06);
    S.box(G,[0,0.052,0.045],[0.03,0.032,0.19],FMAT.gun);/* slide */
    for(let k=0;k<6;k++)S.box(G,[-0.0155,0.052,-0.03+k*0.008],[0.002,0.024,0.003],FMAT.dark,{noOl:1});
    S.box(G,[-0.0158,0.058,0.075],[0.002,0.012,0.022],FMAT.dark,{noOl:1});/* lubang lontar */
    S.box(G,[0,0.072,0.13],[0.006,0.008,0.008],FMAT.poly);S.box(G,[0,0.072,-0.04],[0.02,0.008,0.008],FMAT.poly);
    S.box(G,[0,0.025,0.06],[0.027,0.022,0.15],FMAT.poly);/* frame */
    S.box(G,[0,0.02,0.134],[0.018,0.018,0.012],FMAT.dark);/* lubang laras */
    S.box(G,[0,-0.002,0.03],[0.022,0.006,0.05],FMAT.poly);S.box(G,[0,-0.006,0.055],[0.022,0.018,0.006],FMAT.poly);S.box(G,[0,0.008,0.028],[0.006,0.022,0.006],FMAT.gun);
    const GR=fmF(G,[0,-0.035,-0.012],[-0.28,0,0]);S.box(GR,[0,0,0],[0.029,0.09,0.044],FMAT.poly);for(let k=0;k<5;k++)S.box(GR,[-0.0148,-0.03+k*0.014,0],[0.002,0.006,0.03],FMAT.dark,{noOl:1});
    fmGrip(S,fmF(GR,[0,0.006,0.0]),M,0.03,[0.33,-0.32,0.16],{trig:true});
    /* tangan kiri menangkup dari bawah kiri */
    const C=fmF(GR,[-0.03,-0.012,0.01],[0,0.25,0]);S.box(C,[0,0,0],[0.03,0.07,0.06],M.gl);for(let k=0;k<3;k++)S.box(C,[0.002,0.02-k*0.022,0.036],[0.032,0.02,0.02],M.gl);
    S.limb(fmP(C,[-0.005,-0.02,-0.03]),fmP(C,[-0.01,-0.045,-0.08]),0.065,0.06,M.cuff);S.limb(fmP(C,[-0.01,-0.045,-0.08]),[0.13,-0.33,0.15],0.08,0.075,M.sl);
    mz=fmProj(G,[0,0.025,0.145],cx,cy);ej=fmProj(G,[-0.016,0.06,0.075],cx,cy);}
  else if(kind==='mg'){G=fmGun([0.225,-0.16,0.56],-0.05,-0.015,-0.05);
    S.box(G,[0,0.04,0.06],[0.05,0.07,0.24],FMAT.gun);/* receiver */
    S.box(G,[0,0.08,0.06],[0.046,0.012,0.2],FMAT.poly);for(let k=0;k<8;k++)S.box(G,[0,0.088,-0.03+k*0.024],[0.04,0.004,0.008],FMAT.dark,{noOl:1});/* tutup & rel */
    S.box(G,[0,0.105,0.06],[0.012,0.03,0.07],FMAT.gun);S.box(G,[0,0.122,0.06],[0.03,0.008,0.09],FMAT.poly);/* pegangan angkat */
    S.box(G,[0,0.04,0.25],[0.054,0.06,0.15],FMAT.poly,{tz:0.9});for(let k=0;k<5;k++)S.box(G,[-0.0275,0.045,0.2+k*0.024],[0.002,0.02,0.01],FMAT.dark,{noOl:1});/* handguard */
    S.cyl(G,[0,0.05,0.44],0.012,0.26,FMAT.gun,{n:8});S.cyl(G,[0,0.05,0.585],0.017,0.04,FMAT.dark,{n:8,capF:FMAT.dark});S.box(G,[0,0.075,0.56],[0.006,0.022,0.008],FMAT.gun);
    S.box(G,[0,0.016,0.42],[0.014,0.01,0.06],FMAT.gun);/* bipod terlipat */
    /* kotak amunisi + rantai peluru di sisi kiri (terlihat) */
    S.box(G,[-0.052,-0.01,0.08],[0.055,0.08,0.11],FMAT.olive);S.box(G,[-0.052,0.034,0.08],[0.058,0.008,0.114],FMAT.green);S.box(G,[-0.08,-0.005,0.08],[0.002,0.02,0.04],FMAT.tan,{noOl:1});
    for(let k=0;k<7;k++){const t=k/6;S.box(G,[-0.03+t*0.006,0.032+Math.sin(t*2.6)*0.012,0.06+t*0.08],[0.022,0.008,0.009],FMAT.brass,{r:[0,0,0.4]});}
    S.box(G,[0,-0.01,0.045],[0.024,0.008,0.05],FMAT.poly);
    const GR=fmF(G,[0,-0.045,0.0],[-0.22,0,0]);S.box(GR,[0,0,0],[0.03,0.085,0.04],FMAT.poly);
    
    fmGrip(S,fmF(GR,[0,0.005,0]),M,0.03,[0.34,-0.34,0.16],{trig:true});
    fmSupport(S,fmF(G,[0,0.0,0.26]),M,0.05,[0.12,-0.36,0.15]);
    mz=fmProj(G,[0,0.05,0.61],cx,cy);ej=fmProj(G,[0.02,0.03,0.06],cx,cy);}
  else if(kind==='sg'){G=fmGun([0.225,-0.16,0.56],-0.05,-0.015,-0.05);
    S.box(G,[0,0.04,0.05],[0.046,0.06,0.2],FMAT.gun);S.box(G,[-0.0235,0.05,0.07],[0.002,0.02,0.06],FMAT.dark,{noOl:1});
    S.cyl(G,[0,0.062,0.36],0.014,0.42,FMAT.gun,{n:8,capF:FMAT.dark});S.box(G,[0,0.08,0.55],[0.006,0.008,0.008],FMAT.brass);/* laras + mata */
    S.cyl(G,[0,0.032,0.34],0.013,0.38,FMAT.gun,{n:8});/* tabung peluru */
    S.box(G,[0,0.03,0.28],[0.05,0.042,0.13],FMAT.wood);for(let k=0;k<6;k++)S.box(G,[-0.0255,0.03,0.23+k*0.02],[0.002,0.032,0.006],FMAT.woodD,{noOl:1});/* pump */
    S.box(G,[0,0.005,0.04],[0.02,0.008,0.05],FMAT.gun);
    const GR=fmF(G,[0,-0.028,-0.04],[-0.5,0,0]);S.box(GR,[0,0,0],[0.034,0.08,0.05],FMAT.wood);
    
    fmGrip(S,fmF(GR,[0,0.004,0.004]),M,0.034,[0.34,-0.34,0.16],{trig:true});
    fmSupport(S,fmF(G,[0,0.004,0.28]),M,0.05,[0.12,-0.36,0.15]);
    mz=fmProj(G,[0,0.062,0.575],cx,cy);ej=fmProj(G,[0.024,0.05,0.07],cx,cy);}
  else if(kind==='rl'){G=fmGun([0.23,-0.13,0.56],-0.05,-0.015,-0.04);
    S.cyl(G,[0,0.05,0.12],0.031,0.8,FMAT.olive,{n:10,capB:FMAT.olive});
    S.cyl(G,[0,0.05,0.2],0.036,0.08,FMAT.woodD,{n:10});S.cyl(G,[0,0.05,0.36],0.036,0.05,FMAT.tape,{n:10});
    S.cyl(G,[0,0.05,0.54],0.026,0.06,FMAT.olive,{n:10});/* leher hulu ledak */
    S.cyl(G,[0,0.05,0.62],0.05,0.1,FMAT.war,{n:10,r2:0.03});S.cyl(G,[0,0.05,0.7],0.03,0.06,FMAT.war,{n:10,r2:0.008});S.cyl(G,[0,0.05,0.57],0.05,0.012,FMAT.olive,{n:10});
    S.box(G,[-0.03,0.105,0.12],[0.022,0.035,0.06],FMAT.poly);S.box(G,[-0.0415,0.11,0.13],[0.002,0.016,0.02],FMAT.lens,{noOl:1});/* bidikan */
    for(let k=0;k<4;k++)S.box(G,[-0.0345,0.05,0.38+k*0.015],[0.003,0.04,0.006],k%2?FMAT.war:FMAT.brass,{noOl:1});
    const GR=fmF(G,[0,-0.025,0.02],[-0.25,0,0]);S.box(GR,[0,0,0],[0.028,0.085,0.04],FMAT.woodD);S.box(GR,[0,0.04,0.05],[0.02,0.012,0.04],FMAT.gun);
    fmGrip(S,fmF(GR,[0,0.004,0]),M,0.028,[0.35,-0.32,0.16],{trig:true});
    const G2=fmF(G,[0,-0.03,0.2],[-0.2,0,0]);S.box(G2,[0,0,0],[0.026,0.07,0.035],FMAT.woodD);fmGrip(S,G2,M,0.026,[0.12,-0.34,0.15],{});
    mz=fmProj(G,[0,0.05,0.75],cx,cy);ej=null;}
  else if(kind==='awp'){G=fmGun([0.225,-0.16,0.58],-0.05,-0.015,-0.05);
    S.box(G,[0,0.035,0.12],[0.05,0.056,0.36],FMAT.green,{});S.box(G,[-0.0255,0.035,0.14],[0.002,0.012,0.2],FMAT.olive,{noOl:1});/* badan */
    S.box(G,[0,0.03,0.33],[0.044,0.04,0.08],FMAT.green,{tz:0.85});
    S.cyl(G,[0,0.05,0.52],0.011,0.44,FMAT.gun,{n:8});S.cyl(G,[0,0.05,0.75],0.016,0.05,FMAT.dark,{n:8,capF:FMAT.dark});/* laras + muzzle brake */
    S.box(G,[0,0.074,0.06],[0.028,0.014,0.13],FMAT.gun);/* receiver atas */
    S.box(G,[0,0.083,0.04],[0.012,0.012,0.012],FMAT.gun);S.box(G,[0,0.083,0.13],[0.012,0.012,0.012],FMAT.gun);/* ring */
    S.cyl(G,[0,0.112,0.085],0.022,0.16,FMAT.poly,{n:10});S.cyl(G,[0,0.112,0.2],0.022,0.07,FMAT.poly,{n:10,r2:0.03});S.cyl(G,[0,0.112,0.24],0.03,0.016,FMAT.poly,{n:10,capF:FMAT.lens});
    S.cyl(G,[0,0.112,0.0],0.025,0.03,FMAT.poly,{n:10,capB:FMAT.lens});S.cyl(G,[0,0.14,0.085],0.009,0.02,FMAT.gun,{n:6,r:[Math.PI/2,0,0]});S.cyl(G,[-0.028,0.112,0.085],0.009,0.02,FMAT.gun,{n:6,r:[0,Math.PI/2,0]});
    S.box(G,[0,0.0,0.07],[0.028,0.03,0.05],FMAT.dark);/* magasin */
    const GR=fmF(G,[0,-0.035,-0.06],[-0.35,0,0]);S.box(GR,[0,0,0],[0.032,0.08,0.042],FMAT.green);
    
    fmGrip(S,fmF(GR,[0,0.004,0]),M,0.032,[0.34,-0.34,0.16],{trig:true});
    fmSupport(S,fmF(G,[0,0.004,0.3]),M,0.046,[0.12,-0.36,0.15]);
    mz=fmProj(G,[0,0.05,0.78],cx,cy);ej=fmProj(G,[0.02,0.07,0.06],cx,cy);}
  else if(kind==='kriss'){const r=fmKriss(S,M,cx,cy,1,false);mz=r.mz;ej=r.ej;}
  else if(kind==='krissD'){const r=fmKriss(S,M,cx,cy,1,true),l=fmKriss(S,M,cx,cy,-1,true);const s=fin();s.mz=s.mzR=r.mz;s.mzL=l.mz;s.ej=r.ej;s.ejL=l.ej;return s;}
  const s=fin();s.mz=mz;s.ej=ej;return s;}
/* parang: digambar terpisah dengan titik putar di genggaman */
function fmKriss(S,M,cx,cy,mir,dual){const G=dual?fmGun([0.2*mir,-0.15,0.5],-0.05*mir,-0.015,-0.06*mir):fmGun([0.21,-0.15,0.52],-0.05,-0.015,-0.05);
  S.box(G,[0,0.05,0.07],[0.044,0.05,0.22],FMAT.poly);S.box(G,[0,0.08,0.07],[0.03,0.01,0.2],FMAT.gun);for(let k=0;k<9;k++)S.box(G,[0,0.087,-0.02+k*0.022],[0.026,0.004,0.008],FMAT.dark,{noOl:1});
  S.box(G,[0,0.01,0.11],[0.046,0.05,0.12],FMAT.poly,{r:[0.45,0,0]});/* badan miring khas kriss */
  S.box(G,[-0.0235*mir,0.04,0.12],[0.002,0.014,0.05],FMAT.purple,{noOl:1});
  S.cyl(G,[0,0.055,0.22],0.014,0.08,FMAT.gun,{n:8,capF:FMAT.dark});
  S.box(G,[0,-0.06,0.1],[0.026,0.11,0.034],FMAT.poly,{r:[-0.12,0,0]});/* magasin panjang */
  S.box(G,[0,0.095,0.02],[0.01,0.018,0.01],FMAT.gun);S.box(G,[0,0.095,0.15],[0.008,0.018,0.008],FMAT.gun);
  const GR=fmF(G,[0,-0.03,-0.035],[-0.3,0,0]);S.box(GR,[0,0,0],[0.03,0.08,0.04],FMAT.poly);
  fmGrip(S,fmF(GR,[0,0.004,0]),M,0.03,dual?[0.3*mir,-0.34,0.16]:[0.33,-0.32,0.16],{trig:true,mir});
  if(!dual){const C=fmF(G,[-0.005,-0.035,0.165],[-0.1,0,0]);S.box(C,[0,0,0],[0.022,0.06,0.03],FMAT.poly);fmGrip(S,C,M,0.022,[0.12,-0.35,0.15],{});}
  return{mz:fmProj(G,[0,0.055,0.26],cx,cy),ej:fmProj(G,[0.022*mir,0.06,0.06],cx,cy)};}
function fmParang(){const S=fmScene(),M=fmMats(),W=160,H=130,cx=12,cy=6;
  const G=fmGun([0.15,-0.15,0.33],-0.55,-1.05,0.2);
  const B=fmF(G,[0,0,0.04]);/* bilah: makin lebar ke ujung, punggung gelap, mata pisau terang */
  for(let k=0;k<6;k++){const z=0.028+k*0.052,wd=0.034+k*0.006,yy=k*k*0.0012;S.box(B,[0,yy,z],[0.005,wd,0.054],FMAT.blade,{r:[-k*0.03,0,0],noOl:1});
    S.box(B,[-0.003,yy+wd/2-0.003,z],[0.002,0.006,0.054],FMAT.gun,{r:[-k*0.03,0,0],noOl:1});S.box(B,[-0.003,yy-wd/2+0.003,z],[0.002,0.005,0.054],[FMAT.blade[2],FMAT.blade[3],FMAT.blade[3],'#ffffff'],{r:[-k*0.03,0,0],noOl:1});}
  S.box(B,[0,0.034,0.32],[0.005,0.03,0.04],FMAT.blade,{r:[0.5,0,0]});S.box(B,[-0.0025,-0.008,0.12],[0.001,0.006,0.06],FMAT.red,{noOl:1});S.box(B,[-0.0025,0.006,0.22],[0.001,0.01,0.03],FMAT.red,{noOl:1});
  S.box(G,[0,0,0.035],[0.02,0.05,0.012],FMAT.gun);/* pelindung */
  const GR=fmF(G,[0,0,-0.03]);S.box(GR,[0,0,0],[0.024,0.03,0.11],FMAT.woodD);for(let k=0;k<3;k++)S.box(GR,[0,0,-0.035+k*0.035],[0.026,0.032,0.006],FMAT.gun,{noOl:1});
  const H2=fmF(GR,[0,0,0],[Math.PI/2,0,0]);fmGrip(S,H2,M,0.026,[0.32,-0.35,0.1],{});
  const s=fmSprite(S,W,H,cx,cy);s.pv=fmProj(GR,[0,0,0],cx,cy);return s;}
function buildWeapons(){WSPR={};for(const k of['pistol','mg','sg','rl','awp','kriss','krissD'])WSPR[k]=fmBuild(k);WSPR.parang=fmParang();}
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
  {name:'KUBURAN TUA',fog:'#1c1626',mix:[0.05,0.7],seed:37,start:[12.5,11.5],spawns:[[1.5,1.5],[22.5,22.5]],rows:['########################','#......................#','#.G..G..G......G..G..G.#','#......................#','#.G..G..G..GG..G..G..G.#','#..........GG..........#','#.G..G..G......G..G..G.#','#......................#','#...GGG..........GGG...#','#...G..............G...#','#...G....GG..GG....G...#','#........G....G........#','#........G....G........#','#...G....GG..GG....G...#','#...G..............G...#','#...GGG..........GGG...#','#......................#','#.G..G..G......G..G..G.#','#......................#','#.G..G..G..GG..G..G..G.#','#..........GG..........#','#.G..G..G......G..G..G.#','#......................#','########################']},
  {name:'HUTAN RIMBUN',th:'forest',sky:'forest',tag:'POHON RIMBUN',fog:'#142016',mix:[0.04,0.35],seed:47,start:[12.5,17.5],spawns:[[1.5,1.5],[22.5,22.5]],rows:['BBBBBBBBBBBBBBBBBBBBBBBB','B...................B..B','B...R..RR.RR...R.RR.R..B','B.....R.RR.R.R.R.......B','BB..R.R.....RRR..RR..R.B','B....R.R.R....R.....R..B','B..R...RR..............B','B..R....R.........R..R.B','B.R.R...R.R.R.....R....B','B.R.....RDDD.DD.....RB.B','B..RRR..RD....DR.R...B.B','B..........X..D..R.....B','B......R.D.....RR....R.B','B.R......D....D..R.....B','B.....R..DD..DDR.R.....B','B.B...R.R.....RB.......B','B..R.R..R.....RRR....R.B','B...RRB..R....R.R.R..R.B','B.......R..............B','B....R.R...RRRR.RR.....B','B.....R...RR..R..RR....B','B.R...R...RRR.RB...R...B','B......................B','BBBBBBBBBBBBBBBBBBBBBBBB']},
  {name:'RUMAH HANTU',th:'house',ceil:'house',tag:'DALAM RUMAH',fog:'#140c14',mix:[0.05,0.22],seed:57,start:[12.5,9.5],spawns:[[1.5,1.5],[22.5,22.5]],rows:['DDDDDDDDDDDDDDDDDDDDDDDD','D....H.......H.........D','D....H.......H...L.....D','D.L..H...........L.....D','D....H.......H.........D','D............HHHH.HHHHHD','DHHH.HHHH....H.........D','D.......H....H.........D','D.......H....H....LL...D','D...L...H..............D','D.......H....H.........D','D.......HHH.HH....LL...D','DHH.HHH................D','D.....H....HHHH.HHHH.HHD','D.....H....H...........D','D..L..H....H...........D','D..........H.....L.....D','D.....H....H...........D','DHHHHHH.HHHH...........D','D.........H....HHH.HHHHD','D.........H....H.......D','D..X......H....H...L...D','D..............H.......D','DDDDDDDDDDDDDDDDDDDDDDDD']},
  {name:'GOA GELAP',th:'cave',ceil:'cave',dark:true,tag:'GELAP · SENTER',fog:'#0a0808',mix:[0.03,0.3],seed:67,start:[12.5,12.5],spawns:[[1.5,1.5],[22.5,22.5]],rows:['KKKKKKKKKKKKKKKKKKKKKKKK','K...KKKKKKKQKKKKKKKKK..K','K......................K','KKQQK.KKKQKKQK.KK..K...K','KKKKK..KKKKKKKKK..KKK.KK','KKKKKK.KKKKKKKK..KKKK.KK','KKKKKK..QKKKKKK.KK....KK','KKKKKKK.KKKKKK.....KKKKK','KKKKKKQ.KKKKKK......KKKK','KKKKKKK...QKQK......KKKK','KKKKKKKK...........QKKKK','KKKKKK.............QKKKK','KKKKK...............KKKK','K........K.....K....KKKK','KK..................KKKK','KK.........KKK.....KKKKK','KKK........KKK.....KKKKK','KK...........QK.K.KKKKKK','KK................KKKKKK','KK...KKKKK......K.KKKKKK','KK.QKKKKKKK.....K..QKKKK','K......................K','K......................K','KKKKKKKKKKKKKKKKKKKKKKKK']},
  {name:'KOTA MATI',th:'ruins',tag:'PERUMAHAN HANCUR',fog:'#2a1c1a',mix:[0.08,0.35],seed:77,start:[12.5,12.5],spawns:[[1.5,1.5],[22.5,22.5]],rows:['UUUUUUVVUUUUUUUUVVUUUUUU','U......................U','U.UUU.UUVU...UUU..UVUU.U','U.UVV.U..U...U.U..UVVU.U','U.UUU.UU.U...U.V..UUUU.U','U..........J...........U','V..V.....JJ......V.....V','U.UUUU.....V...UUUUU...U','U.UVVV.........U...U.J.U','U.UVVU..UVUU...U...U.J.U','U.UVUU..UVVU...UU.UU...U','U.......UVVV...........U','U..J....UUUU..V....V...U','U..J.........JJ........V','V.....V.......UUUVU....U','U.UUUUU...V...UVVVU.V..U','U.UVVVU.......UVVVU....U','U.UVVVV..UUU..UUVUU..J.U','U.UVUUU..UVV.........J.U','U........UUU...V.......U','U..V..JJ.......UUUUV...U','U..........V...U...U...U','U..............U.......U','UUUUVVUUUUUUUUUUUUVVUUUU']},
  {name:'BARAK TENTARA',th:'barr',sky:'storm',rain:true,tag:'HUJAN · PETIR',fog:'#161c26',mix:[0.07,0.38],seed:87,start:[12.5,12.5],spawns:[[1.5,1.5],[22.5,22.5]],rows:['NNNNNNNNNNNNNNNNNNNNNNNN','N......................N','N.NNNNNN...SS...NNNNNN.N','N.N....N........N....N.N','N.N.A..N...AA...N..A.N.N','N.N........AA........N.N','N.N....N........N....N.N','N.NNN.NN..S..S..NN.NNN.N','N......................N','N..SS......PP......SS..N','N..........PP..........N','N.A...SSS........SSS..AN','N......................N','N..SS....A....A....SS..N','N......................N','N.NNNN.NNN....NNN.NNNN.N','N.N.......A..A.......N.N','N.N..A....A..A....A..N.N','N.N..................N.N','N.NNNNN.NN....NN.NNNNN.N','N......................N','N...SS..A......A..SS...N','N......................N','NNNNNNNNNNNNNNNNNNNNNNNN']}
];
const MW=24,MH=24,WCH={'#':0,S:1,C:2,P:3,W:4,X:5,G:6,T:7,R:8,B:9,H:10,D:11,K:12,Q:13,U:14,V:15,N:16,A:17,L:18,J:19};
const map=new Int8Array(MW*MH),fkind=new Uint8Array(MW*MH),openCells=[];
let MAP=MAPS[0];
function loadMap(i){i=Math.max(0,Math.min(MAPS.length-1,i|0));MAP=MAPS[i];G.mapIdx=i;const r=rng(MAP.seed);openCells.length=0;
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const ch=MAP.rows[y][x];const v=ch==='.'?-1:WCH[ch];map[y*MW+x]=v;if(v<0)openCells.push([x,y]);
    const q=r();fkind[y*MW+x]=q<MAP.mix[0]?2:q<MAP.mix[0]+MAP.mix[1]?1:0;}
  FT=FTS[MAP.th]||FT_CITY;const sk=skyGet(MAP.sky||'dusk');SKY=sk.d;SKYN=sk.n;CT=MAP.ceil?CTS[MAP.ceil]:null;
  applyFog();
  if(!MAP.picks){const rr=rng(MAP.seed+5),kinds=['mg','sg','rl','awp','med','med','nade','nade'],out=[];
    for(const k of kinds){for(let t=0;t<300;t++){const c=openCells[(rr()*openCells.length)|0],x=c[0]+0.5,y=c[1]+0.5;
      if(MAP.spawns.some(sp=>Math.hypot(sp[0]-x,sp[1]-y)<4))continue;if(out.some(p=>Math.hypot(p.x-x,p.y-y)<(t<200?4.5:2)))continue;out.push({id:out.length+1,kind:k,x,y});break;}}
    MAP.picks=out;}
  try{localStorage.setItem('kotamati-map',String(i));}catch(e){}
}
function applyFog(){const dk=isDark(),f=hex(dk?(MAP.dark?'#020203':'#05040b'):MAP.fog);FRc=f[0];FGc=f[1];FBc=f[2];FOGA=dk?(MAP.dark?0.4:0.6):(MAP.ceil?1.0:1.5);FOGB=dk?(MAP.dark?6.5:8):(MAP.ceil?10:13);}
function solid(x,y){const cx=Math.floor(x),cy=Math.floor(y);if(cx<0||cy<0||cx>=MW||cy>=MH)return true;return map[cy*MW+cx]>=0;}
function blocked(cx,cy){return cx<0||cy<0||cx>=MW||cy>=MH||map[cy*MW+cx]>=0;}
function castT(ox,oy,dx,dy){let mx=Math.floor(ox),my=Math.floor(oy);const ddx=dx===0?1e30:Math.abs(1/dx),ddy=dy===0?1e30:Math.abs(1/dy);
  let sx,sy,sdx,sdy;if(dx<0){sx=-1;sdx=(ox-mx)*ddx}else{sx=1;sdx=(mx+1-ox)*ddx}if(dy<0){sy=-1;sdy=(oy-my)*ddy}else{sy=1;sdy=(my+1-oy)*ddy}
  let t=0;for(let i=0;i<80;i++){if(sdx<sdy){t=sdx;sdx+=ddx;mx+=sx}else{t=sdy;sdy+=ddy;my+=sy}if(blocked(mx,my))return t;}return t;}
function los(x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,d=Math.hypot(dx,dy);if(d<0.01)return true;return castT(x0,y0,dx/d,dy/d)>=d;}
const flow=new Int16Array(MW*MH),FLOW0=flow,flowG=new Int16Array(MW*MH);
function buildFlow(srcs,flow=FLOW0){flow.fill(9999);const q=[];for(const[px,py]of srcs){if(blocked(px,py))continue;const s=py*MW+px;if(flow[s]){flow[s]=0;q.push(s);}}let h=0;
  while(h<q.length){const i=q[h++],x=i%MW,y=(i/MW)|0,v=flow[i]+1;
    for(const[ox,oy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+ox,ny=y+oy;if(blocked(nx,ny))continue;const j=ny*MW+nx;if(flow[j]>v){flow[j]=v;q.push(j);}}}}
const DIR8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function flowTarget(z,tg,flow=FLOW0){const cx=Math.floor(z.x),cy=Math.floor(z.y);let best=flow[cy*MW+cx],bx=cx,by=cy;
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
  const sky=isDark()?SKYN:SKY.px,SW=SKY.w,TAU=Math.PI*2,off=SH-horizon;
  const pz=PLANE/ZK,yl=Math.min(H,horizon);for(let x=0;x<W;x++){let u=Math.floor(((camA+(ZK===1?colAng[x]:Math.atan(colCam[x]*pz)))/TAU*SW*2)%SW);if(u<0)u+=SW;for(let y=0;y<yl;y++){let ro=y+off;if(ro<0)ro=0;else if(ro>=SH)ro=SH-1;buf[y*W+x]=sky[ro*SW+u];}}
  const r0x=camDX-camPX,r0y=camDY-camPY,r1x=camDX+camPX,r1y=camDY+camPY;
  if(CT&&camZ<0.98){const ym=Math.min(H,horizon);for(let y=0;y<ym;y++){const rowD=((1-camZ)*H*ZK)/(horizon-y-0.5),sx=rowD*(r1x-r0x)/W,sy=rowD*(r1y-r0y)/W;
    let fx=camX+rowD*r0x+sx*0.5,fy=camY+rowD*r0y+sy*0.5;const f=fogF(rowD),k=0.6*(1-f),fr=FRc*f,fg=FGc*f,fb=FBc*f;let idx=y*W;
    for(let x=0;x<W;x++,idx++){const c=CT[(((fy-Math.floor(fy))*32)&31)*32+(((fx-Math.floor(fx))*32)&31)];buf[idx]=0xff000000|((((c>>>16)&255)*k+fb)<<16)|((((c>>>8)&255)*k+fg)<<8)|((c&255)*k+fr);fx+=sx;fy+=sy;}}}
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
function drawSpr(s,wx,wy,wz,wh,flash,mir,clip){if(R3.on){r3Spr(s,wx,wy,wz,wh,flash,mir);return;}
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
function drawBlob(wx,wy,wz,size,col,cap=5){if(R3.on){r3Blob(wx,wy,wz,size,col,cap);return;}
  const rx=wx-camX,ry=wy-camY,tx=invDet*(camDY*rx-camDX*ry),ty=invDet*(-camPY*rx+camPX*ry);if(ty<0.3)return;
  const unit=ZK*H/ty,s=Math.min(cap*ZK,Math.max(1,size*unit)),cx=HW*(1+tx/ty),cy=horizon+(camZ-wz)*unit,one=s<1.5?1:0;
  const x0=Math.max(0,Math.round(cx-s/2)),x1=Math.min(W-1,Math.round(cx+s/2)-1+one),y0=Math.max(0,Math.round(cy-s/2)),y1=Math.min(H-1,Math.round(cy+s/2)-1+one);
  const f=fogF(ty),k=1-f,c=col,v=0xff000000|((c[2]*k+FBc*f)<<16)|((c[1]*k+FGc*f)<<8)|(c[0]*k+FRc*f);
  for(let x=x0;x<=x1;x++){if(ty>=zbuf[x])continue;for(let y=y0;y<=y1;y++)buf[y*W+x]=v;}
}

/* ================= renderer 3D (Three.js, gaya piksel) =================
   Dunia digambar sebagai 3D sungguhan (gedung bertinggi beda, atap, bayangan matahari, cahaya tembakan/ledakan),
   di resolusi rendah yang sama dengan mode klasik, lalu diperbesar tanpa haluskan supaya tetap berpiksel.
   Proyeksi kamera dibuat persis sama dengan raycaster, jadi bidikan, hitbox, dan HUD tidak berubah. */
const R3={vpool:[],vi:0,vox:true,on:false,ready:false,loading:false,failed:false,err:'',mapKey:'',pi:0,bi:0,si:0,mats:new Map(),fcv:new Map(),lq:-1,night:null};
function r3Want(){return !!SET.g3d&&!R3.failed;}
function r3Load(){if(R3.ready||R3.loading||R3.failed)return;R3.loading=true;
  const done=()=>{R3.loading=false;try{r3Init();R3.ready=true;}catch(e){R3.failed=true;R3.err=String(e&&e.message||e);try{syncSetUI();}catch(_){}}};
  if(window.THREE){done();return;}
  const s=document.createElement('script');s.src=window.KM_THREE||'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';s.async=true;
  s.onload=done;s.onerror=()=>{R3.loading=false;R3.failed=true;R3.err='Library 3D gagal dimuat (cek internet). Kembali ke grafik klasik.';try{syncSetUI();}catch(_){}};document.head.appendChild(s);}
function pxCanvas(px,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),d=g.createImageData(w,h);new Uint32Array(d.data.buffer).set(px);g.putImageData(d,0,0);return c;}
function r3Tex(cv,rep){const T=THREE,t=new T.CanvasTexture(cv);t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.generateMipmaps=false;
  if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;}else{t.wrapS=t.wrapT=T.ClampToEdgeWrapping;}return t;}
function r3Init(){const T=THREE;
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:true,stencil:false,powerPreference:'high-performance'})||cv.getContext('webgl',{antialias:false,alpha:false,depth:true,stencil:false});
  if(!gl)throw new Error('WebGL tidak tersedia di perangkat ini.');
  const rd=new T.WebGLRenderer({canvas:cv,context:gl,antialias:false});rd.setPixelRatio(1);rd.setSize(W,H,false);
  rd.shadowMap.enabled=true;rd.shadowMap.type=T.BasicShadowMap;rd.shadowMap.autoUpdate=false;
  const sc=new T.Scene(),cam=new T.PerspectiveCamera(60,W/H,0.05,80);cam.matrixAutoUpdate=true;
  sc.fog=new T.Fog(0x34203a,3,16);sc.background=new T.Color(0x34203a);
  const hemi=new T.HemisphereLight(0xc8b4e0,0x40303a,0.66),sun=new T.DirectionalLight(0xffc49a,0.6);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);{const c=sun.shadow.camera;c.left=-18;c.right=18;c.top=18;c.bottom=-18;c.near=1;c.far=70;}sun.shadow.bias=-0.0015;
  sun.position.set(MW/2-11,15,MH/2-8);sun.target.position.set(MW/2,0,MH/2);sc.add(hemi,sun,sun.target);
  const lights=[];for(let i=0;i<4;i++){const l=new T.PointLight(0xffb060,0,5,2);l.position.set(-99,-99,-99);sc.add(l);lights.push(l);}
  /* langit: silinder mengikuti kamera, dua salinan tekstur raycaster mengelilingi pemain */
  const skyCv=px=>{const one=pxCanvas(px,SKY.w,SKY.h),c=document.createElement('canvas');c.width=SKY.w*2;c.height=SKY.h;const g=c.getContext('2d');g.drawImage(one,0,0);g.drawImage(one,SKY.w,0);return c;};
  const skyT=[r3Tex(skyCv(SKY.px)),r3Tex(skyCv(SKYN))],skyR=40,skyH=SKY.h/H*skyR;
  const skyG=new T.CylinderGeometry(skyR,skyR,skyH,48,1,true);skyG.translate(0,skyH/2-0.02,0);
  const skyM=new T.MeshBasicMaterial({map:skyT[0],side:T.BackSide,fog:false,depthWrite:false});const sky=new T.Mesh(skyG,skyM);sky.renderOrder=-10;sky.frustumCulled=false;sc.add(sky);
  /* sprite billboard, partikel, bayangan bulat */
  const PG=new T.PlaneGeometry(1,1);PG.translate(0,0.5,0);
  const blobs=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:0xffffff}),2400);blobs.frustumCulled=false;blobs.count=0;
  blobs.setColorAt(0,new T.Color(1,1,1));sc.add(blobs);
  const shc=document.createElement('canvas');shc.width=shc.height=16;{const g=shc.getContext('2d');for(let y=0;y<16;y++)for(let x=0;x<16;x++){const d=Math.hypot(x-7.5,y-7.5);if(d<7.5){g.fillStyle='rgba(0,0,0,'+(d<5?0.55:0.3)+')';g.fillRect(x,y,1,1);}}}
  const shG=new T.PlaneGeometry(1,1);shG.rotateX(-Math.PI/2);
  const shadows=new T.InstancedMesh(shG,new T.MeshBasicMaterial({map:r3Tex(shc),transparent:true,depthWrite:false}),160);shadows.frustumCulled=false;shadows.count=0;shadows.renderOrder=1;sc.add(shadows);
  Object.assign(R3,{cv,rd,sc,cam,hemi,sun,lights,sky,skyM,skyT,skyR,PG,blobs,shadows,pool:[],wallTex:WT.map(t=>r3Tex(t.cv,true)),
    M4:new T.Matrix4(),Q:new T.Quaternion(),V:new T.Vector3(),S3:new T.Vector3(),C:new T.Color(),UP:new T.Vector3(0,1,0)});}

/* ----- geometri peta: tinggi bangunan dari jenis dinding, plus atap & properti di atasnya ----- */
const R3H=[[1.75,1.0],[1.0,0],[1.35,0],[2.0,1.0],[2.5,1.5],[1.0,0],[1.45,0.3],[1.0,0],[0,0],[1.05,0.3],[1,0],[1,0],[1.6,1.0],[1.5,0.6],[1.4,1.0],[0.55,0.5],[1.8,0],[0.95,0.5],[1,0],[0.8,0]];
function r3Heights(){const hs=new Float32Array(MW*MH);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const v=map[y*MW+x];if(v<0)continue;const r=rng((MAP.seed*977+(x>>1)*131+(y>>1)*71+v*13)|0)(),b=R3H[v]||[1,0];
    let h=b[0]+b[1]*Math.floor(r*3)/2;if(v===5&&rng(MAP.seed*31+x*7+y*13)()<0.3)h=2;if(MAP.ceil&&v!==8)h=1;hs[y*MW+x]=h;}
  return hs;}
function r3BuildMap(){const T=THREE;if(R3.grp){R3.sc.remove(R3.grp);R3.grp.traverse(o=>{if(o.geometry&&o.geometry!==R3.PG)o.geometry.dispose();});}
  const grp=new T.Group(),hs=r3Heights();R3.hs=hs;
  const bufs=WT.map(()=>({p:[],n:[],u:[]})),roof={p:[],n:[],u:[]},trees=[],city=!MAP.th||MAP.th==='city';
  const quad=(B,a,b,c,d,n,ua,ub,uc,ud)=>{for(const v of[a,b,c,a,c,d])B.p.push(v[0],v[1],v[2]);for(let i=0;i<6;i++)B.n.push(n[0],n[1],n[2]);for(const t of[ua,ub,uc,ua,uc,ud])B.u.push(t[0],t[1]);};
  const D=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const v=map[y*MW+x];if(v<0)continue;if(v===8){trees.push([x,y]);continue;}const h=hs[y*MW+x],B=bufs[v];
    for(const[dx,dy]of D){const nx=x+dx,ny=y+dy,inb=nx>=0&&ny>=0&&nx<MW&&ny<MH,hn=inb&&map[ny*MW+nx]>=0?hs[ny*MW+nx]:0;if(h<=hn)continue;
      const cx=x+0.5+dx*0.5,cz=y+0.5+dy*0.5,rx=dy,rz=-dx,L=[cx-rx*0.5,cz-rz*0.5],Rr=[cx+rx*0.5,cz+rz*0.5];
      quad(B,[L[0],hn,L[1]],[Rr[0],hn,Rr[1]],[Rr[0],h,Rr[1]],[L[0],h,L[1]],[dx,0,dy],[0,hn],[1,hn],[1,h],[0,h]);}
    const tall=city&&h>1.5&&(v===0||v===3||v===4||v===6),TB=tall?roof:B;
    quad(TB,[x,h,y],[x,h,y+1],[x+1,h,y+1],[x+1,h,y],[0,1,0],[0,0],[0,1],[1,1],[1,0]);}
  const mk=(B,mat)=>{if(!B.p.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(B.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(B.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(B.u,2));
    const m=new T.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;grp.add(m);};
  bufs.forEach((B,i)=>mk(B,new T.MeshLambertMaterial({map:R3.wallTex[i]})));
  mk(roof,new T.MeshLambertMaterial({color:0x3a3036}));
  /* properti atap: tandon air, antena, mesin AC, pagar pembatas */
  const r=rng(MAP.seed*53+7),gray=new T.MeshLambertMaterial({color:0x6e6672}),dark=new T.MeshLambertMaterial({color:0x2e2a30}),rust=new T.MeshLambertMaterial({color:0x8a4a2e});
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const v=map[y*MW+x],h=hs[y*MW+x];if(!city||v<0||h<2.2)continue;const q=r();
    if(q<0.06){const tk=new T.Mesh(new T.CylinderGeometry(0.28,0.28,0.42,8),rust);tk.position.set(x+0.5,h+0.38,y+0.5);tk.castShadow=true;grp.add(tk);
      for(const[ox,oz]of[[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]]){const lg=new T.Mesh(new T.BoxGeometry(0.04,0.18,0.04),dark);lg.position.set(x+0.5+ox,h+0.09,y+0.5+oz);grp.add(lg);}}
    else if(q<0.11){const an=new T.Mesh(new T.BoxGeometry(0.04,0.9,0.04),dark);an.position.set(x+0.5,h+0.45,y+0.5);an.castShadow=true;grp.add(an);
      const cr=new T.Mesh(new T.BoxGeometry(0.34,0.03,0.03),dark);cr.position.set(x+0.5,h+0.72,y+0.5);grp.add(cr);}
    else if(q<0.17){const ac=new T.Mesh(new T.BoxGeometry(0.42,0.26,0.32),gray);ac.position.set(x+0.5,h+0.13,y+0.5);ac.castShadow=true;grp.add(ac);}}
  /* detail fasad: cornice, balkon, kanopi, lampu dinding, kabel listrik antar gedung (semua dekorasi, tanpa tabrakan) */
  if(city){const UP=new T.Vector3(0,1,0),AX=new T.Vector3(1,0,0),L={led:[],slab:[],rail:[],awn:[],arm:[],bulb:[],cab:[]},AC=[],rd2=rng(MAP.seed*91+3);
    const mtx=(x,y,z,ry,sx,sy,sz,tilt)=>{const q=new T.Quaternion().setFromAxisAngle(UP,ry);if(tilt)q.multiply(new T.Quaternion().setFromAxisAngle(AX,tilt));return new T.Matrix4().compose(new T.Vector3(x,y,z),q,new T.Vector3(sx,sy,sz));};
    const open=(x,y)=>x>=0&&y>=0&&x<MW&&y<MH&&map[y*MW+x]<0;
    for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const v=map[y*MW+x],h=hs[y*MW+x];if(v<0||!(v===0||v===3||v===4||v===6)||h<1.7)continue;
      for(const[dx,dy]of D){if(!open(x+dx,y+dy))continue;const cx=x+0.5+dx*0.5,cz=y+0.5+dy*0.5,ry=Math.atan2(dx,dy),o=(k)=>[cx+dx*k,cz+dy*k];
        if(h>=1.9){const p=o(0.035);L.led.push(mtx(p[0],1.5,p[1],ry,1.0,0.06,0.07));}
        const p2=o(0.03);L.led.push(mtx(p2[0],h-0.04,p2[1],ry,1.0,0.08,0.06));
        const q=rd2();
        if(h>=2.2&&q<0.2){const a=o(0.15),b=o(0.29);L.slab.push(mtx(a[0],1.56,a[1],ry,0.72,0.05,0.3));L.rail.push(mtx(b[0],1.68,b[1],ry,0.72,0.2,0.03));}
        else if(q<0.32&&(v===0||v===3)){const a=o(0.18);L.awn.push(mtx(a[0],1.2,a[1],ry,0.82,0.03,0.38,0.38));AC.push(rd2()<0.5?0xb8402e:0x2e8a7a);}
        else if(q<0.4){const a=o(0.12),b=o(0.25);L.arm.push(mtx(a[0],1.36,a[1],ry,0.04,0.04,0.24));L.bulb.push(mtx(b[0],1.31,b[1],ry,0.09,0.07,0.09));}}}
    for(let i=0;i<14;i++){const c=openCells[(rd2()*openCells.length)|0],ax=rd2()<0.5?[1,0]:[0,1];let a=null,b=null;
      for(const sg of[-1,1]){let x=c[0],y=c[1];for(let k=0;k<9;k++){x+=ax[0]*sg;y+=ax[1]*sg;if(x<0||y<0||x>=MW||y>=MH)break;if(map[y*MW+x]>=0){if(hs[y*MW+x]>=1.8){const px=x+0.5-ax[0]*sg*0.5,py=y+0.5-ax[1]*sg*0.5;if(sg<0)a=[px,py,Math.min(2.1,hs[y*MW+x]-0.2)];else b=[px,py,Math.min(2.1,hs[y*MW+x]-0.2)];}break;}}}
      if(!a||!b)continue;const n=8,len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<2)continue;const sag=0.08+len*0.035;let pv=null;
      for(let k=0;k<=n;k++){const t=k/n,pt=[a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t-sag*4*t*(1-t),a[1]+(b[1]-a[1])*t];
        if(pv){const dx=pt[0]-pv[0],dy=pt[1]-pv[1],dz=pt[2]-pv[2],l=Math.hypot(dx,dy,dz),m=new T.Matrix4(),dir=new T.Vector3(dx,dy,dz).normalize(),qq=new T.Quaternion().setFromUnitVectors(new T.Vector3(1,0,0),dir);
          m.compose(new T.Vector3((pt[0]+pv[0])/2,(pt[1]+pv[1])/2,(pt[2]+pv[2])/2),qq,new T.Vector3(l,0.02,0.02));L.cab.push(m);}pv=pt;}}
    const BX=new T.BoxGeometry(1,1,1),inst=(list,mat,cast,cols)=>{if(!list.length)return;const im=new T.InstancedMesh(BX,mat,list.length);list.forEach((m,i)=>{im.setMatrixAt(i,m);if(cols)im.setColorAt(i,new T.Color(cols[i]));});im.castShadow=!!cast;im.receiveShadow=true;grp.add(im);};
    const stone=new T.MeshLambertMaterial({color:0x5e5462}),metal=new T.MeshLambertMaterial({color:0x2e2a30});
    inst(L.led,stone,true);inst(L.slab,stone,true);inst(L.rail,metal,true);inst(L.awn,new T.MeshLambertMaterial({color:0xffffff}),true,AC);
    inst(L.arm,metal,false);inst(L.bulb,new T.MeshBasicMaterial({color:0xffe08a}),false);inst(L.cab,new T.MeshBasicMaterial({color:0x14101a}),false);}
  /* pohon hutan: batang + tajuk daun bertumpuk (tabrakan tetap satu petak) */
  if(trees.length){const BX=new T.BoxGeometry(1,1,1),rt=rng(MAP.seed*17+5),tr=new T.InstancedMesh(BX,new T.MeshLambertMaterial({color:0x4a3424}),trees.length),lf=new T.InstancedMesh(BX,new T.MeshLambertMaterial({map:R3.wallTex[9]}),trees.length*3);
    const m=new T.Matrix4(),q=new T.Quaternion(),UP=new T.Vector3(0,1,0);let li=0;
    trees.forEach(([x,y],i)=>{const k=0.85+rt()*0.35,ox=(rt()-0.5)*0.2,oz=(rt()-0.5)*0.2;q.setFromAxisAngle(UP,rt()*1.6);m.compose(new T.Vector3(x+0.5+ox,0.8*k,y+0.5+oz),q,new T.Vector3(0.26,1.6*k,0.26));tr.setMatrixAt(i,m);
      for(const[s0,yy]of[[1.35,1.45],[1.0,2.05],[0.6,2.5]]){q.setFromAxisAngle(UP,rt()*1.6);const s1=s0*(0.9+rt()*0.25);m.compose(new T.Vector3(x+0.5+ox+(rt()-0.5)*0.15,yy*k,y+0.5+oz+(rt()-0.5)*0.15),q,new T.Vector3(s1,s0*0.62*k,s1));lf.setMatrixAt(li++,m);}});
    tr.castShadow=lf.castShadow=true;tr.receiveShadow=lf.receiveShadow=true;grp.add(tr,lf);}
  /* langit-langit untuk peta dalam ruangan */
  if(CT){const cc=document.createElement('canvas');cc.width=MW*32;cc.height=MH*32;const cg=cc.getContext('2d'),ct=pxCanvas(CT,32,32);for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)cg.drawImage(ct,x*32,y*32);
    const ce=new T.Mesh(new T.PlaneGeometry(MW,MH,MW,MH),new T.MeshLambertMaterial({map:r3Tex(cc)}));ce.rotation.x=Math.PI/2;ce.position.set(MW/2,1,MH/2);grp.add(ce);}
  /* lantai: satu tekstur besar dari ubin lantai raycaster */
  const fc=document.createElement('canvas');fc.width=MW*32;fc.height=MH*32;const fg=fc.getContext('2d');
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const k=fkind[y*MW+x];let tc=R3.fcv.get(FT[k]);if(!tc){tc=pxCanvas(FT[k],32,32);R3.fcv.set(FT[k],tc);}fg.drawImage(tc,x*32,y*32);}
  const fl=new T.Mesh(new T.PlaneGeometry(MW,MH,MW,MH),new T.MeshLambertMaterial({map:r3Tex(fc)}));fl.rotation.x=-Math.PI/2;fl.position.set(MW/2,0,MH/2);fl.receiveShadow=true;grp.add(fl);
  R3.sc.add(grp);R3.grp=grp;R3.rd.shadowMap.needsUpdate=true;}

/* ----- per frame ----- */
function r3Begin(){const T=THREE;
  const key=G.mapIdx+':'+MAP.seed;if(R3.mapKey!==key){R3.mapKey=key;r3BuildMap();}
  if(R3.cv.width!==W||R3.cv.height!==H)R3.rd.setSize(W,H,false);
  if(R3.lq!==SET.q){R3.lq=SET.q;const on=SET.q>0;if(R3.rd.shadowMap.enabled!==on){R3.rd.shadowMap.enabled=on;R3.sc.traverse(o=>{if(o.material&&o.material.needsUpdate!==undefined)o.material.needsUpdate=true;});R3.rd.shadowMap.needsUpdate=true;}}
  const dk=isDark(),ek=(dk?1:0)+':'+G.mapIdx;if(R3.envKey!==ek){R3.envKey=ek;R3.night=dk;const px=dk?SKYN:SKY.px;if(!R3.skyC)R3.skyC=new Map();let st=R3.skyC.get(px);
      if(!st){const one=pxCanvas(px,SKY.w,SKY.h),c=document.createElement('canvas');c.width=SKY.w*2;c.height=SKY.h;const g=c.getContext('2d');g.drawImage(one,0,0);g.drawImage(one,SKY.w,0);st=r3Tex(c);R3.skyC.set(px,st);}
      R3.skyM.map=st;R3.skyM.needsUpdate=true;R3.sky.visible=!MAP.ceil;const ind=!!MAP.ceil;
    R3.hemi.intensity=MAP.dark?0.52:dk?0.42:ind?0.55:0.66;R3.hemi.color.set(dk?0x6a74a8:MAP.th==='forest'?0xb8d0a8:MAP.rain?0xa8b4c8:0xc8b4e0);R3.sun.intensity=ind?0.12:dk?0.22:MAP.rain?0.35:0.6;R3.sun.color.set(dk?0x9ab0ff:MAP.rain?0xb8c4dc:0xffc49a);}
  const fc=R3.C.setRGB(FRc/255,FGc/255,FBc/255);R3.sc.fog.color.copy(fc);R3.sc.background.copy(fc);R3.sc.fog.near=FOGA+0.6;R3.sc.fog.far=FOGA+FOGB+3;
  const cam=R3.cam;cam.position.set(camX,camZ,camY);R3.V.set(camX+camDX,camZ,camY+camDY);cam.lookAt(R3.V);cam.updateMatrixWorld();
  const f=H*ZK,n=0.08,fa=80,B=(horizon-HH)/HH,m=cam.projectionMatrix;
  m.set(2*f/W,0,0,0, 0,2*f/H,B,0, 0,0,-(fa+n)/(fa-n),-2*fa*n/(fa-n), 0,0,-1,0);cam.projectionMatrixInverse.copy(m).invert();
  R3.sky.position.set(camX,camZ,camY);
  R3.vox=SET.q>0;R3.vi=0;RIG.frame++;R3.yaw=Math.atan2(-camDX,-camDY);R3.Q.setFromAxisAngle(R3.UP,R3.yaw);R3.pi=0;R3.bi=0;R3.si=0;R3.lc=[];
  for(let x=0;x<W;x++){const c=colCam[x],rdx=camDX+camPX*c,rdy=camDY+camPY*c;zbuf[x]=Math.max(0.0001,castT(camX,camY,rdx,rdy));}}
function r3Mat(s,flash){let e=R3.mats.get(s);if(!e){e={};R3.mats.set(s,e);}const k=flash?'f':'n';
  if(!e[k]){let cv=s.cv;if(flash){const o=new Uint32Array(s.px.length);for(let i=0;i<o.length;i++){const c=s.px[i];if((c>>>24)<128)continue;const r=(c&255)*0.3+178,g=((c>>>8)&255)*0.3+178,b=((c>>>16)&255)*0.3+178;o[i]=(0xff000000|(b<<16)|(g<<8)|r)>>>0;}cv=pxCanvas(o,s.w,s.h);}
    e[k]=new THREE.MeshBasicMaterial({map:r3Tex(cv),alphaTest:0.5,side:THREE.DoubleSide,color:0xe8e8e8});}
  return e[k];}
function r3Spr(s,wx,wy,wz,wh,flash,mir){let m=R3.pool[R3.pi];if(!m){m=new THREE.Mesh(R3.PG,r3Mat(s,false));R3.sc.add(m);R3.pool.push(m);}R3.pi++;
  m.visible=true;m.material=r3Mat(s,flash);m.position.set(wx,wz,wy);m.rotation.set(0,R3.yaw,0);m.scale.set(wh*s.w/s.h*(mir?-1:1),wh,1);}
function r3Blob(wx,wy,wz,size,col,cap){if(R3.bi>=2400)return;const rx=wx-camX,ry=wy-camY,ty=invDet*(-camPY*rx+camPX*ry);if(ty<0.3)return;
  const s=Math.max(ty/(ZK*H),Math.min(size,cap*ty/H));R3.M4.compose(R3.V.set(wx,wz,wy),R3.Q,R3.S3.set(s,s,1));R3.blobs.setMatrixAt(R3.bi,R3.M4);
  R3.blobs.setColorAt(R3.bi,R3.C.setRGB(col[0]/255,col[1]/255,col[2]/255));R3.bi++;}
function r3Shadow(x,y,rad){if(R3.si>=160)return;R3.M4.compose(R3.V.set(x,0.012,y),R3.Q.set(0,0,0,1),R3.S3.set(rad*2,1,rad*2));R3.shadows.setMatrixAt(R3.si++,R3.M4);R3.Q.setFromAxisAngle(R3.UP,R3.yaw);}
function r3Light(x,y,z,col,k,dist){R3.lc.push({x,y,z,col,k,dist,d:(x-camX)*(x-camX)+(y-camY)*(y-camY)});}
function r3End(){
  for(let i=R3.pi;i<R3.pool.length;i++)R3.pool[i].visible=false;for(let i=R3.vi;i<R3.vpool.length;i++)R3.vpool[i].visible=false;rigSweep();
  R3.blobs.count=R3.bi;R3.blobs.instanceMatrix.needsUpdate=true;if(R3.blobs.instanceColor)R3.blobs.instanceColor.needsUpdate=true;
  R3.shadows.count=R3.si;R3.shadows.instanceMatrix.needsUpdate=true;
  /* cahaya dinamis: tembakan, ledakan, api */
  if(pl.muzzle>0&&pl.alive)r3Light(pl.x+camDX*0.4,pl.y+camDY*0.4,eyeZ(),0xffc070,1.8,4.5);
  for(const b of booms){const k=Math.max(0,1-b.t/b.dur);if(k>0)r3Light(b.x,b.y,0.6,0xff9a40,3.2*k,3+b.size*2);}
  for(const fi of fires)r3Light(fi.x,fi.y,0.4,0xff7a20,1.1+0.35*Math.sin(G.t*13+fi.seed*5),3.6);
  for(const r of NET.remotes.values())if(r.flashT>0)r3Light(r.x,r.y,0.5,0xffc070,1.4,3.5);
  for(const b of BOTS.values())if(b.flashT>0)r3Light(b.x,b.y,0.5,0xffc070,1.1,3.2);
  R3.lc.sort((a,b)=>a.d-b.d);
  R3.lights.forEach((l,i)=>{const c=R3.lc[i];if(c){l.position.set(c.x,c.z,c.y);l.color.set(c.col);l.intensity=c.k*(isDark()?1.4:1);l.distance=c.dist;}else{l.intensity=0;}});
  R3.rd.render(R3.sc,R3.cam);}

/* ----- karakter voxel 3D: model dibangun dari sprite depan, samping, belakang (visual hull) ----- */
const VOXC=new Map();
function voxGeo(F,S,B){let a=VOXC.get(F);if(!a){a=new Map();VOXC.set(F,a);}let b=a.get(S);if(!b){b=new Map();a.set(S,b);}let g=b.get(B||0);if(!g){g=voxBuild(F,S,B);b.set(B||0,g);}return g;}
function voxBuild(F,S,B){const T=THREE,w=F.w,h=F.h,d=S.w,fp=F.px,sp=S.px,bp=B&&B.w===w&&B.h===h?B.px:null,fx=w>>1,fz=d>>1;
  const solidF=new Uint8Array(w*h),solidS=new Uint8Array(d*h);for(let i=0;i<w*h;i++)solidF[i]=(fp[i]>>>24)>=128?1:0;for(let y=0;y<Math.min(h,S.h);y++)for(let z=0;z<d;z++)solidS[y*d+z]=(sp[y*d+z]>>>24)>=128?1:0;
  const on=(x,y,z)=>x>=0&&x<w&&y>=0&&y<h&&z>=0&&z<d&&solidF[y*w+x]&&solidS[y*d+z];
  const P=[],N=[],C=[],I=[];let nv=0;
  const quad=(a,b,c,e,n,col)=>{for(const v of[a,b,c,e])P.push(v[0],v[1],v[2]);for(let i=0;i<4;i++){N.push(n[0],n[1],n[2]);C.push(col&255,(col>>>8)&255,(col>>>16)&255);}I.push(nv,nv+1,nv+2,nv,nv+2,nv+3);nv+=4;};
  const cF=(x,y)=>fp[y*w+x],cB=(x,y)=>{if(bp){const c=bp[y*w+(w-1-x)];if((c>>>24)>=128)return c;}return fp[y*w+x];},cS=(z,y)=>sp[y*d+z];
  /* koordinat sudut: X=x-fx, Y=h-y, Z=z-fz (lokal +Z = arah hadap) */
  for(let y=0;y<h;y++){const Y0=h-y-1,Y1=h-y;
    for(let z=0;z<d;z++){if(!solidS[y*d+z])continue;
      for(const s of[1,-1]){let x=0;while(x<w){if(!(on(x,y,z)&&!on(x,y,z+s))){x++;continue;}const col=s>0?cF(x,y):cB(x,y);let x1=x+1;while(x1<w&&on(x1,y,z)&&!on(x1,y,z+s)&&(s>0?cF(x1,y):cB(x1,y))===col)x1++;
          const Z=s>0?z+1-fz:z-fz,X0=x-fx,X1=x1-fx;
          if(s>0)quad([X0,Y0,Z],[X1,Y0,Z],[X1,Y1,Z],[X0,Y1,Z],[0,0,1],col);else quad([X1,Y0,Z],[X0,Y0,Z],[X0,Y1,Z],[X1,Y1,Z],[0,0,-1],col);x=x1;}}}
    for(let x=0;x<w;x++){if(!solidF[y*w+x])continue;
      for(const s of[1,-1]){let z=0;while(z<d){if(!(on(x,y,z)&&!on(x+s,y,z))){z++;continue;}const col=cS(z,y);let z1=z+1;while(z1<d&&on(x,y,z1)&&!on(x+s,y,z1)&&cS(z1,y)===col)z1++;
          const X=s>0?x+1-fx:x-fx,Z0=z-fz,Z1=z1-fz;
          if(s>0)quad([X,Y0,Z1],[X,Y0,Z0],[X,Y1,Z0],[X,Y1,Z1],[1,0,0],col);else quad([X,Y0,Z0],[X,Y0,Z1],[X,Y1,Z1],[X,Y1,Z0],[-1,0,0],col);z=z1;}}}
    for(let z=0;z<d;z++){if(!solidS[y*d+z])continue;
      for(const s of[-1,1]){let x=0;while(x<w){if(!(on(x,y,z)&&!on(x,y+s,z))){x++;continue;}const col=cF(x,y);let x1=x+1;while(x1<w&&on(x1,y,z)&&!on(x1,y+s,z)&&cF(x1,y)===col)x1++;
          const X0=x-fx,X1=x1-fx,Z0=z-fz,Z1=z+1-fz;
          if(s<0)quad([X0,Y1,Z1],[X1,Y1,Z1],[X1,Y1,Z0],[X0,Y1,Z0],[0,1,0],col);else quad([X0,Y0,Z0],[X1,Y0,Z0],[X1,Y0,Z1],[X0,Y0,Z1],[0,-1,0],col);x=x1;}}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Int8Array(P),3));g.setAttribute('normal',new T.BufferAttribute(new Int8Array(N),3,true));
  g.setAttribute('color',new T.BufferAttribute(new Uint8Array(C),3,true));g.setIndex(nv>65000?new T.Uint32BufferAttribute(I,1):new T.Uint16BufferAttribute(I,1));
  g.boundingSphere=new T.Sphere(new T.Vector3(0,h/2,0),Math.hypot(w,h,d)/2);g.userData.q=nv/4;return g;}
function r3Vox(F,S,B,wx,wy,wz,wh,ang,flash,mir){if(!R3.vmat){R3.vmat=new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x2a2630});R3.vmatF=new THREE.MeshLambertMaterial({vertexColors:true,color:0x4d4d4d,emissive:0xb3b3b3});}
  let m=R3.vpool[R3.vi];if(!m){m=new THREE.Mesh(voxGeo(F,S,B),R3.vmat);R3.sc.add(m);R3.vpool.push(m);}R3.vi++;
  m.visible=true;m.geometry=voxGeo(F,S,B);m.material=flash?R3.vmatF:R3.vmat;const k=wh/F.h;m.position.set(wx,wz,wy);m.rotation.set(0,Math.atan2(Math.cos(ang),Math.sin(ang)),0);m.scale.set(mir?-k:k,k,k);}
function zPose(o){const X=a=>a;if(o.dead)return['die',Math.min(5,(o.dieT/0.09)|0)];if(o.act===1||o.act===6)return['low',0];if(o.act===10||o.act===11)return['atk',0];
  if(o.state==='attack'||o.act===2||o.act===3)return['atk',((G.t*5)|0)%2];return['walk',(o.anim|0)%4];}
function zVox(o,wz){const[c,i]=zPose(o),F=o.fr,g=v=>c==='low'?v.low:v[c][i];r3Vox(g(F),g(F.side),g(F.back),o.x,o.y,wz,0.8*o.scale,o.fa||0,o.flash>0&&!o.dead,!!o.mir);}
function soldVox(r,wz){const set=getSold(r.sk||0,colorOf(r.peer),r.w|0);let F,S,B;
  if(!r.al){const i=Math.min(5,(r.deadT/0.09)|0);F=set.die[i];S=set.dieS[i];B=null;}
  else if(r.dn){F=set.downF;S=set.downS;B=null;}else if(r.cr){F=set.crouch[0];S=set.crouchS;B=set.crouch[1];}
  else{const f=(r.anim|0)%2;F=set.front[f];S=set.side[f];B=set.back[f];}
  r3Vox(F,S,B,r.x,r.y,wz,0.8,r.a||0,r.hitT>0,false);}

/* ----- karakter 3D low-poly bertulang (rig) + garis tepi, dirender berpiksel ----- */
const RIG={defs:new Map(),pools:new Map(),live:new Map(),wm:new WeakMap(),frame:0};
const hx3=c=>{const h=hex(c);return[h[0]/255,h[1]/255,h[2]/255];};
function rigBuilder(){const T=THREE,G0={P:[],N:[],C:[],S:[],I:[],K:[],nb:0,nv:0},G1={P:[],N:[],C:[],S:[],I:[],K:[],nb:0,nv:0},E=0.018;
  const FACES=[[[1,0,0],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],[[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],[[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],
    [[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]],[[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]]];
  const put=(g,bone,cx,cy,cz,w,h,d,col,tp,rx)=>{const c=typeof col==='string'?hx3(col):col,cr=rx?Math.cos(rx):1,sr=rx?Math.sin(rx):0;
    for(const[n,vs]of FACES){for(const v of vs){const k=v[1]>0?tp:1;let x=v[0]*w/2*k,y=v[1]*h/2,z=v[2]*d/2*(v[1]>0?tp:1);
        if(rx){const yy=y*cr-z*sr,zz=y*sr+z*cr;y=yy;z=zz;}g.P.push(cx+x,cy+y,cz+z);
        let nx=n[0],ny=n[1],nz=n[2];if(rx){const a=ny*cr-nz*sr,b=ny*sr+nz*cr;ny=a;nz=b;}g.N.push(nx,ny,nz);g.C.push(c[0],c[1],c[2]);g.S.push(bone);g.K.push(g.nb);}
      g.I.push(g.nv,g.nv+1,g.nv+2,g.nv,g.nv+2,g.nv+3);g.nv+=4;}g.nb++;};
  const api={box(bone,cx,cy,cz,w,h,d,col,o){o=o||{};const tp=o.tp||1;put(G0,bone,cx,cy,cz,w,h,d,col,tp,o.rx);if(!o.no)put(G1,bone,cx,cy,cz,w+E*2,h+E*2,d+E*2,'#000000',tp,o.rx);},
    geo(g){const T=THREE,q=new T.BufferGeometry();q.setAttribute('position',new T.Float32BufferAttribute(g.P,3));q.setAttribute('normal',new T.Float32BufferAttribute(g.N,3));
      q.setAttribute('color',new T.Float32BufferAttribute(g.C,3));if(g.U)q.setAttribute('uv',new T.Float32BufferAttribute(g.U,2));const si=[],sw=[];for(const b of g.S){si.push(b,0,0,0);sw.push(1,0,0,0);}
      q.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));q.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));q.setIndex(g.I);q.computeBoundingSphere();return q;},
    done(){if(api.skin){G0.U=rigUV(G0,api.skin);G0.C=G0.C.map(()=>1);}return{geo:api.geo(G0),ogeo:api.geo(G1)};}};
  return api;}
/* ----- kulit model 3D dari sprite gritty: gambar pose netral depan/samping/belakang, lalu tiap sisi kotak diproyeksikan ke bagian tubuh yang sesuai ----- */
const RSKIN=new Map();
function rigSkinTex(t,v){const k=t+':'+v;let R=RSKIN.get(k);if(R)return R;const S=gzSpec(t,v),seed=(t.length*131+v*977)|0,pose={ph:0,lean:0,bob:0,legs:[[0,0],[0,0]],arms:[[0,0],[0,0]],lift:[0,0]};
  const V=['front','side','back'].map(n=>gzDraw(S,n,pose,seed)),AW=V.reduce((a,c)=>a+c.w,0),AH=Math.max(...V.map(c=>c.h)),cv=document.createElement('canvas');cv.width=AW;cv.height=AH;
  const g=cv.getContext('2d'),id=g.createImageData(AW,AH),out=new Uint32Array(id.data.buffer);let ox=0;const L=[];
  for(const C of V){const w=C.w,h=C.h,a=C.px.slice();/* lebarkan warna ke piksel kosong supaya sisi kotak di luar siluet tetap berwarna */
    for(let pass=0;pass<14;pass++){const b=a.slice();let ch=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if((a[i]>>>24)>=128)continue;
        const n=(x>0&&(a[i-1]>>>24)>=128)?a[i-1]:(x<w-1&&(a[i+1]>>>24)>=128)?a[i+1]:(y>0&&(a[i-w]>>>24)>=128)?a[i-w]:(y<h-1&&(a[i+w]>>>24)>=128)?a[i+w]:0;if(n){b[i]=n|0xff000000;ch=1;}}
      a.set(b);if(!ch)break;}
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)out[y*AW+ox+x]=a[y*w+x]|0xff000000;L.push({x0:ox,w,h,P:C.parts});ox+=w;}
  g.putImageData(id,0,0);const tex=new THREE.CanvasTexture(cv);tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;tex.flipY=false;
  R={tex,AW,AH,f:L[0],s:L[1],b:L[2],big:!!S.bigArm};RSKIN.set(k,R);return R;}
function rigUV(G,K){const n=G.nv,P=G.P,N=G.N,Sb=G.S,Kb=G.K,U=new Array(n*2);
  const grp=b=>b===3?'head':b<=2?'torso':b<=5?'armA':b<=7?'armB':b<=9?'legA':'legB';
  /* kotak acuan tiap bagian: kepala & badan = kotak pertama tulangnya, tangan & kaki = gabungan semua kotak */
  const first={},bb={};for(let i=0;i<n;i++){const b=Sb[i];if(first[b]==null)first[b]=Kb[i];}
  for(let i=0;i<n;i++){const b=Sb[i],gname=grp(b);if((gname==='head'&&Kb[i]!==first[3])||(gname==='torso'&&(b!==2||Kb[i]!==first[2])))continue;
    const o=bb[gname]||(bb[gname]=[1e9,-1e9,1e9,-1e9,1e9,-1e9]),x=P[i*3],y=P[i*3+1],z=P[i*3+2];o[0]=Math.min(o[0],x);o[1]=Math.max(o[1],x);o[2]=Math.min(o[2],y);o[3]=Math.max(o[3],y);o[4]=Math.min(o[4],z);o[5]=Math.max(o[5],z);}
  const part=(L,gname,side)=>{const p=L.P;if(gname==='head'||gname==='torso')return p[gname];const base=gname.slice(0,3);return p[base+side]||p[base]||p.torso;};
  const fr=(v,a,b)=>Math.abs(b-a)>1e-6?(v-a)/(b-a):0.5;
  for(let i=0;i<n;i++){const b=Sb[i],gname=grp(b),o=bb[gname]||bb.torso,x=P[i*3],y=P[i*3+1],z=P[i*3+2],nx=N[i*3],ny=N[i*3+1],nz=N[i*3+2],ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
    const isA=gname==='armA'||gname==='legA',isArm=gname[0]==='a',fy=fr(y,o[3],o[2]);let L,r,u,vv;
    if(ax>=ay&&ax>=az){L=K.s;r=part(L,gname,'');u=r[0]+fr(z,o[4],o[5])*(r[2]-r[0]);vv=r[1]+fy*(r[3]-r[1]);}
    else{const back=az>=ay&&nz<0;L=back?K.b:K.f;
      let side=back?(isA?-1:1):(isA?1:-1);if(isArm&&!back&&K.big)side=-side;r=part(L,gname,side);
      let fx=fr(x,o[0],o[1]);if(back)fx=1-fx;u=r[0]+fx*(r[2]-r[0]);
      vv=az>=ay?r[1]+fy*(r[3]-r[1]):(ny>0?r[1]+1.2:r[3]-1);}
    u=Math.max(0.5,Math.min(L.w-0.5,u))+L.x0;vv=Math.max(0.5,Math.min(L.h-0.5,vv));U[i*2]=u/K.AW;U[i*2+1]=vv/K.AH;}
  return U;}
/* tulang: 0 root,1 hips,2 spine,3 head,4 armL,5 foreL,6 armR,7 foreR,8 legL,9 shinL,10 legR,11 shinR */
function rigBody(d){const b=rigBuilder(),{legH,torsoH,torsoW,torsoD,headS,armW,upper,fore,legW,legD,hipX}=d,th=legH*0.5,sh=legH*0.5,sx=torsoW/2+armW/2+0.004,ay=legH+torsoH-0.03,hy=legH+torsoH+0.012;
  const bones=[[0,0,0,-1],[0,legH,0,0],[0,0,0,1],[0,torsoH,0,2],[sx,torsoH-0.03,0,2],[0,-upper,0,4],[-sx,torsoH-0.03,0,2],[0,-upper,0,6],[hipX,0,0,1],[0,-th,0,8],[-hipX,0,0,1],[0,-th,0,10]];
  return{b,bones,sx,ay,hy,th,sh,d};}
function rigLimbs(R,c){const{b,sx,ay,th,sh,d}=R,{legH,armW,upper,fore,legW,legD,hipX}=d;
  for(const[s,bu,bf]of[[1,4,5],[-1,6,7]]){const x=s*sx,big=c.bigR&&s<0,aw=big?armW*2.1:armW,up=big?upper*1.2:upper,fo=big?fore*1.3:fore;
    b.box(bu,x-(big?0.02*s:0),ay-up/2,0,aw,up,aw,c.sleeve);if(c.band)b.box(bu,x,ay-0.035,0,aw+0.012,0.03,aw+0.012,c.band,{no:1});
    b.box(bf,x-(big?0.02*s:0),ay-up-fo*0.4,0,aw*0.92,fo*0.8,aw*0.92,c.fore);b.box(bf,x-(big?0.02*s:0),ay-up-fo*0.88,0,aw*(big?1.1:1.02),fo*0.22,aw*1.05,c.hand);
    if(c.claws)for(const k of[-1,0,1])b.box(bf,x+k*0.018,ay-up-fo-0.025,0.012,0.008,0.05,0.008,c.claws,{no:1});}
  for(const[s,bt,bs]of[[1,8,9],[-1,10,11]]){const x=s*hipX;b.box(bt,x,legH-th/2,0,legW,th+0.01,legD,c.pants);b.box(bs,x,sh/2+0.04,0,legW*0.92,sh-0.04,legD*0.92,c.pantsS||c.pants);
    b.box(bs,x,0.028,0.02,legW*1.02,0.056,legD+0.05,c.shoe);}}
function rigFinish(R){const{geo,ogeo}=R.b.done();return{geo,ogeo,bones:R.bones,d:R.d};}
const ZDIM={def:{legH:0.40,torsoH:0.29,torsoW:0.22,torsoD:0.125,headS:0.19,armW:0.066,upper:0.17,fore:0.17,legW:0.08,legD:0.09,hipX:0.055}};
function zDims(t){const o=Object.assign({},ZDIM.def);
  if(t==='fat')Object.assign(o,{torsoW:0.36,torsoD:0.28,torsoH:0.32,legW:0.12,legD:0.13,hipX:0.085,armW:0.095,legH:0.36});
  if(t==='brute')Object.assign(o,{torsoW:0.40,torsoD:0.24,torsoH:0.33,headS:0.17,armW:0.12,upper:0.21,fore:0.23,legW:0.13,legD:0.13,hipX:0.09,legH:0.37});
  if(t==='boss')Object.assign(o,{torsoW:0.42,torsoD:0.30,torsoH:0.34,headS:0.18,armW:0.13,upper:0.2,fore:0.22,legW:0.14,legD:0.14,hipX:0.1,legH:0.34});
  if(t==='jockey')Object.assign(o,{legH:0.30,torsoH:0.26,headS:0.25,torsoW:0.22,upper:0.15,fore:0.15});
  if(t==='smoker')Object.assign(o,{legH:0.43,torsoH:0.31,torsoW:0.23,upper:0.19,fore:0.19});
  if(t==='witch'||t==='spitter')Object.assign(o,{torsoW:0.22,headS:0.2,armW:0.065});
  if(t==='charger')Object.assign(o,{torsoW:0.28,torsoD:0.17});
  return o;}
function rigZombieDef(t,pv,skin){const o=pv!=null?zPackPal(pv):ZPAL[t],d=zDims(t),R=rigBody(d),b=R.b;if(skin)b.skin=skin;const {legH,torsoH,torsoW,torsoD,headS}=d,hy=R.hy,hc=hy+headS/2,shirt=o.shirt||o.skin;
  /* badan */
  b.box(2,0,legH+torsoH/2,0,torsoW,torsoH,torsoD,shirt,{tp:(t==='brute'||t==='boss')?1.15:1});
  if(o.fat)b.box(2,0,legH+torsoH*0.38,torsoD*0.18,torsoW*0.92,torsoH*0.6,torsoD*0.9,o.shirt?o.shirt:o.skinH,{});
  if(o.shirt&&!o.dress){b.box(2,0,legH+torsoH-0.025,0.002,torsoW*0.5,0.05,torsoD+0.006,o.skin,{no:1});b.box(2,torsoW*0.22,legH+torsoH*0.55,torsoD/2+0.002,0.05,0.07,0.006,o.blood,{no:1});b.box(2,-torsoW*0.15,legH+torsoH*0.3,torsoD/2+0.002,0.04,0.04,0.006,o.bloodD,{no:1});}
  b.box(2,0,legH+0.02,0,torsoW+0.01,0.04,torsoD+0.01,o.belt,{no:1});
  if(o.dress)b.box(1,0,legH-0.12,0,torsoW*1.15,0.26,torsoD*1.6,o.shirt,{tp:0.7});
  /* kepala */
  b.box(3,0,hc,0,headS*0.92,headS,headS*0.9,o.skin);
  const fz=headS*0.45+0.003,ey=hc+headS*0.08;b.box(3,headS*0.2,ey,fz,0.042,0.034,0.006,o.eye,{no:1});b.box(3,-headS*0.2,ey,fz,0.042,0.034,0.006,o.eye2||o.eye,{no:1});
  b.box(3,0,hc-headS*0.22,fz,headS*0.42,0.035,0.006,'#2a0a0e',{no:1});b.box(3,headS*0.06,hc-headS*0.3,fz,0.022,0.05,0.006,o.drool,{no:1});
  if(o.hair&&t!=='spitter')b.box(3,0,hc+headS*0.42,-0.01,headS*0.96,headS*0.22,headS*0.94,o.hair,{});
  if(o.helmet&&t==='run'){b.box(3,0,hc+headS*0.4,0,headS*1.06,headS*0.32,headS*1.04,o.helmet,{tp:0.85});b.box(3,0,hc+headS*0.26,0,headS*1.12,0.02,headS*1.1,o.helmetS,{no:1});}
  if(t==='hunter'){b.box(3,0,hc+headS*0.1,-0.01,headS*1.08,headS*1.12,headS*1.04,o.helmet,{});b.box(3,0,hc-0.01,headS*0.5,headS*0.8,headS*0.62,0.01,'#14182a',{no:1});
    b.box(3,headS*0.2,ey,headS*0.51+0.004,0.04,0.03,0.006,o.eye,{no:1});b.box(3,-headS*0.2,ey,headS*0.51+0.004,0.04,0.03,0.006,o.eye,{no:1});}
  if(t==='smoker')for(const[x,y,z]of[[0.08,hc-0.02,0.1],[-0.06,hc+0.06,0.1],[0.11,legH+torsoH*0.7,torsoD/2],[-0.09,legH+torsoH*0.4,torsoD/2]])b.box(y>hy?3:2,x,y,z,0.045,0.045,0.03,'#b06a5a',{no:1});
  if(t==='spitter'){b.box(3,0,hc+headS*0.38,-0.02,headS*1.05,headS*0.3,headS*1.0,o.hair,{});b.box(3,0,hc-headS*0.15,-headS*0.38,headS*1.0,headS*0.95,headS*0.3,o.hair,{});
    b.box(3,0,hc-headS*0.25,fz+0.002,headS*0.35,0.05,0.006,'#9be05a',{no:1});b.box(3,0,hc-headS*0.45,fz,0.03,0.06,0.006,'#c6ff4a',{no:1});}
  if(t==='jockey'){b.box(3,0,hc-headS*0.22,fz+0.001,headS*0.6,0.03,0.006,'#efe6c8',{no:1});b.box(3,0,hc-headS*0.3,fz+0.001,headS*0.6,0.02,0.006,'#4a0c10',{no:1});}
  if(t==='witch'){const hcol='#0e0a10';b.box(3,0,hc+headS*0.15,-0.005,headS*1.1,headS*1.25,headS*1.06,hcol,{});b.box(3,0,hc-headS*0.05,headS*0.48,headS*0.85,headS*0.85,0.02,hcol,{no:1});
    b.box(3,headS*0.18,ey,headS*0.5,0.03,0.016,0.008,'#ff2a2a',{no:1});b.box(3,-headS*0.18,ey,headS*0.5,0.03,0.016,0.008,'#ff2a2a',{no:1});
    b.box(2,0,legH+torsoH*0.6,-torsoD/2-0.03,headS*1.0,torsoH*1.1,0.05,hcol,{});}
  if(t==='boss'||t==='brute'){const B='#efe6c8';if(t==='boss'){for(const s of[1,-1]){b.box(2,s*torsoW*0.45,legH+torsoH+0.05,0,0.05,0.12,0.05,B,{tp:0.3});b.box(2,s*torsoW*0.3,legH+torsoH+0.03,-0.05,0.04,0.09,0.04,B,{tp:0.3});}
      for(let i=0;i<4;i++)b.box(2,0,legH+0.07+i*0.075,-torsoD/2-0.03,0.04,0.05,0.06,B,{tp:0.4,rx:-0.5});for(let i=0;i<5;i++)b.box(3,(i-2)*0.035,hc+headS*0.55,0,0.022,0.07+(i%2)*0.03,0.022,B,{tp:0.3});
      b.box(2,0.06,legH+torsoH*0.45,torsoD/2+0.002,0.02,0.12,0.006,'#ffb23e',{no:1});b.box(2,-0.08,legH+torsoH*0.3,torsoD/2+0.002,0.02,0.09,0.006,'#ff7a3a',{no:1});b.box(2,0,legH+torsoH*0.7,torsoD/2+0.002,0.14,0.016,0.006,'#3a1010',{no:1});}
    else b.box(2,0,legH+torsoH*0.62,torsoD/2+0.002,torsoW*0.6,0.02,0.006,o.skinS,{no:1});}
  rigLimbs(R,{sleeve:t==='brute'||t==='boss'||t==='charger'?o.skin:shirt,fore:o.skin,hand:o.skinS,pants:o.pants,pantsS:o.pantsS,shoe:o.shoe,bigR:t==='charger',claws:t==='witch'?'#efe6c8':null});
  if(t==='hunter')for(const s of[1,-1])b.box(s>0?5:7,s*R.sx,R.ay-d.upper-d.fore*0.88,0,d.armW*1.1,0.04,d.armW*1.1,'#c9c0b0',{no:1});
  return rigFinish(R);}
function rigSoldierDef(si,ci,wi){const K=SKINS[si],[tm,tms]=TEAMS[ci%4],d=Object.assign({},ZDIM.def,{torsoW:0.26,torsoD:0.16,headS:0.2}),R=rigBody(d),b=R.b,{legH,torsoH,torsoW,torsoD,headS}=d,hc=R.hy+headS/2,fz=headS*0.45+0.003,ey=hc+headS*0.05;
  b.box(2,0,legH+torsoH/2,0,torsoW,torsoH,torsoD,K.vest);b.box(2,0,legH+0.02,0,torsoW+0.012,0.04,torsoD+0.012,'#2a2018',{no:1});
  b.box(2,0,legH+torsoH-0.02,torsoD/2+0.003,torsoW*0.45,0.035,0.006,tm,{no:1});
  if(K.badge)b.box(2,torsoW*0.25,legH+torsoH*0.7,torsoD/2+0.004,0.035,0.04,0.006,K.badge,{no:1});
  if(K.cross){b.box(2,0,legH+torsoH*0.6,torsoD/2+0.004,0.09,0.03,0.006,'#d8322a',{no:1});b.box(2,0,legH+torsoH*0.6,torsoD/2+0.004,0.03,0.09,0.006,'#d8322a',{no:1});}
  if(K.stripe)b.box(2,0,legH+torsoH*0.45,0,torsoW+0.008,0.03,torsoD+0.008,K.stripe,{no:1});
  if(K.camo)for(const[x,y]of[[0.06,0.2],[-0.07,0.12],[0.02,0.06],[-0.03,0.24]])b.box(2,x,legH+y,torsoD/2+0.003,0.05,0.035,0.006,K.camo,{no:1});
  if(K.scarf)b.box(2,0,legH+torsoH+0.005,0,torsoW*0.7,0.04,torsoD*1.05,K.scarf,{});
  b.box(2,0,legH+torsoH*0.5,-torsoD/2-0.035,torsoW*0.7,torsoH*0.7,0.07,K.vestS,{});
  /* kepala & penutup kepala */
  b.box(3,0,hc,0,headS*0.92,headS,headS*0.9,K.skin);
  b.box(3,headS*0.2,ey,fz,0.035,0.035,0.006,'#1a1014',{no:1});b.box(3,-headS*0.2,ey,fz,0.035,0.035,0.006,'#1a1014',{no:1});b.box(3,0,hc-headS*0.25,fz,headS*0.25,0.02,0.006,K.skinS,{no:1});
  if(K.paint){b.box(3,0,ey-0.03,fz+0.001,headS*0.8,0.025,0.006,K.paint,{no:1});}
  const hl=K.hel,hs=K.helS||hl,H=K.head;
  if(H==='helmet'||H==='gas'||H==='visor'||H==='heavy'){b.box(3,0,hc+headS*0.36,-0.005,headS*(H==='heavy'?1.18:1.06),headS*0.36,headS*(H==='heavy'?1.14:1.04),hl,{tp:0.85});b.box(3,0,hc+headS*0.22,0,headS*1.1,0.025,headS*1.08,tm,{no:1});}
  if(H==='gas'){b.box(3,0,hc-headS*0.15,fz+0.03,headS*0.5,headS*0.42,0.07,'#3a3e45',{});b.box(3,0,hc-headS*0.22,fz+0.08,0.06,0.06,0.05,'#24272c',{});b.box(3,0,ey,fz+0.004,headS*0.7,0.05,0.008,'#9ab3c9',{no:1});}
  if(H==='visor'||H==='fire'||H==='moto')b.box(3,0,ey,fz+0.008,headS*0.86,0.055,0.012,K.visor||'#2a2a3a',{no:1});
  if(H==='heavy')for(const s of[1,-1])b.box(s>0?4:6,s*R.sx,R.ay-0.02,0,d.armW*1.7,0.07,d.armW*1.7,K.pads||hl,{});
  if(H==='cap'){b.box(3,0,hc+headS*0.4,0,headS*1.0,headS*0.26,headS*0.98,hl,{});b.box(3,0,hc+headS*0.3,headS*0.55,headS*0.9,0.02,headS*0.32,hs,{});if(K.badge)b.box(3,0,hc+headS*0.42,headS*0.5+0.003,0.03,0.03,0.006,K.badge,{no:1});}
  if(H==='ninja'){b.box(3,0,hc+0.004,-0.004,headS*0.98,headS*1.04,headS*0.96,hl,{});b.box(3,0,ey,fz+0.004,headS*0.8,0.045,0.006,K.skin,{no:1});
    b.box(3,headS*0.2,ey,fz+0.006,0.03,0.03,0.006,'#1a1014',{no:1});b.box(3,-headS*0.2,ey,fz+0.006,0.03,0.03,0.006,'#1a1014',{no:1});b.box(3,0,hc+headS*0.3,-headS*0.55,0.04,0.025,0.12,K.scarf||'#c8302a',{});}
  if(H==='goggles'){b.box(3,0,hc+headS*0.38,0,headS*1.0,headS*0.3,headS*0.98,hl,{});b.box(3,0,ey+0.01,fz+0.006,headS*0.95,0.05,0.012,'#2a2018',{no:1});
    for(const s of[1,-1])b.box(3,s*headS*0.2,ey+0.01,fz+0.014,0.05,0.045,0.01,'#7ab0c0',{no:1});}
  if(H==='bandana'){b.box(3,0,hc+headS*0.38,0,headS*1.0,headS*0.28,headS*0.98,K.scarf,{});b.box(3,0,hc-headS*0.22,fz+0.006,headS*0.94,headS*0.4,0.012,K.scarf,{no:1});}
  if(H==='medcap'){b.box(3,0,hc+headS*0.42,0,headS*0.98,headS*0.22,headS*0.96,hl,{});b.box(3,0,hc+headS*0.42,headS*0.49,0.04,0.012,0.006,'#d8322a',{no:1});b.box(3,0,hc+headS*0.42,headS*0.49,0.012,0.04,0.006,'#d8322a',{no:1});
    b.box(3,0,hc+headS*0.12,-headS*0.55,0.08,0.08,0.06,K.hair||'#2a1a14',{});}
  if(H==='band'){b.box(3,0,hc+headS*0.4,-0.01,headS*1.0,headS*0.26,headS*0.98,K.hair||'#1a1210',{});b.box(3,0,hc+headS*0.26,0,headS*1.0,0.035,headS*0.98,K.scarf||hl,{no:1});
    if(K.hairS==='braid')b.box(3,0,hc-headS*0.4,-headS*0.5,0.045,headS*1.1,0.045,K.hair,{});if(K.hairS==='pony')b.box(3,0,hc+headS*0.05,-headS*0.6,0.05,headS*0.7,0.05,K.hair,{rx:0.4});}
  if(H==='moto'){b.box(3,0,hc+0.01,-0.005,headS*1.12,headS*1.12,headS*1.1,hl,{});b.box(3,0,ey,fz+0.03,headS*0.86,0.07,0.012,K.visor,{no:1});b.box(3,0,hc+headS*0.4,0,0.035,0.02,headS*1.12,K.stripe||tm,{no:1});}
  if(H==='hood'){b.box(3,0,hc+headS*0.1,-0.02,headS*1.12,headS*1.15,headS*1.06,hl,{});b.box(3,0,hc-headS*0.1,fz+0.01,headS*0.8,headS*0.7,0.006,K.skin,{no:1});
    b.box(3,headS*0.2,ey,fz+0.014,0.035,0.035,0.006,'#1a1014',{no:1});b.box(3,-headS*0.2,ey,fz+0.014,0.035,0.035,0.006,'#1a1014',{no:1});
    for(const s of[1,-1])b.box(3,s*headS*0.36,hc-headS*0.3,headS*0.38,0.04,headS*0.6,0.03,K.hair||'#d8b060',{no:1});}
  if(H==='fire'){b.box(3,0,hc+headS*0.38,-0.01,headS*1.06,headS*0.34,headS*1.04,hl,{tp:0.8});b.box(3,0,hc+headS*0.22,-0.02,headS*1.3,0.03,headS*1.35,hl,{});b.box(3,0,hc+headS*0.5,0,0.03,0.03,headS*1.0,K.stripe||'#e8f070',{no:1});}
  rigLimbs(R,{sleeve:K.vest,fore:K.vestS,hand:K.skin,pants:K.pants,pantsS:K.pantsS,shoe:K.boot,band:tm});
  /* senapan di tangan kanan: sejajar lengan bawah (saat lengan diangkat, moncong ke depan) */
  const gx=-R.sx,gy=R.ay-d.upper-d.fore*0.9;rigGun((f,u,sd,w,l,h,c,o)=>b.box(7,gx+sd,gy-f,u,w,l,h,c,o),ORDER[wi|0]||'mg');
  return rigFinish(R);}
/* senjata di tangan model 3D: f = ke depan (laras), u = ke atas, sd = ke samping */
function rigGun(G,w){const M='#3a3e45',D='#24272c',P='#1b1d21',no={no:1};
  if(w==='pistol'){G(0.06,0.012,0,0.03,0.13,0.036,M);G(0.06,0.032,0,0.024,0.12,0.008,'#6a707a',no);G(0,-0.035,0,0.028,0.035,0.065,D);}
  else if(w==='sg'){G(0.02,0,0,0.045,0.15,0.06,M);G(0.26,0.016,0,0.026,0.34,0.026,D);G(0.24,-0.014,0,0.022,0.3,0.022,D);G(0.2,-0.016,0,0.042,0.1,0.038,'#8a5a2e');G(-0.15,-0.012,0,0.04,0.17,0.065,'#5e3a1c');G(-0.02,-0.05,0,0.03,0.035,0.06,'#5e3a1c');}
  else if(w==='rl'){G(0.1,0.035,0,0.07,0.72,0.07,'#56652a');G(0.1,0.035,0,0.074,0.06,0.074,'#3e2412',no);G(0.52,0.035,0,0.1,0.13,0.1,'#b8402e');G(0.61,0.035,0,0.05,0.06,0.05,'#e0603a');G(0.43,0.035,0,0.05,0.05,0.05,'#38431a');
    G(0,-0.035,0,0.03,0.035,0.07,'#3e2412');G(0.06,0.09,-0.04,0.03,0.05,0.035,P);}
  else if(w==='awp'){G(0.06,0,0,0.05,0.34,0.065,'#4e5a32');G(0.4,0.012,0,0.02,0.32,0.02,D);G(0.57,0.012,0,0.03,0.04,0.03,P);G(0.08,0.072,0,0.04,0.22,0.04,'#1a1c20');G(0.195,0.072,0,0.034,0.012,0.034,'#4fb8c8',no);
    G(-0.15,-0.01,0,0.045,0.16,0.08,'#4e5a32');G(0.06,-0.05,0,0.03,0.04,0.04,P);G(-0.01,-0.05,0,0.032,0.035,0.065,'#323e22');}
  else if(w==='parang'){G(-0.01,0,0,0.03,0.11,0.036,'#5a3a22');G(0.05,0,0,0.036,0.014,0.052,D);G(0.25,0.004,0,0.008,0.39,0.062,'#b8bcc6');G(0.25,-0.024,0,0.009,0.39,0.012,'#eef0f4',no);G(0.44,0.0,0,0.008,0.04,0.05,'#b8bcc6');G(0.2,0.01,0,0.0095,0.06,0.02,'#a3201d',no);}
  else if(w==='kriss'){G(0.05,0,0,0.046,0.2,0.07,P);G(0.06,0.044,0,0.014,0.17,0.012,'#3c4148');G(0.18,0.016,0,0.024,0.07,0.024,D);G(0.08,-0.085,0,0.026,0.035,0.12,P);G(0.05,0.012,0,0.048,0.05,0.014,'#7a4ab8',no);G(-0.08,0.01,0,0.03,0.08,0.04,D);G(-0.01,-0.045,0,0.028,0.035,0.06,P);}
  else{/* senapan mesin */G(0.08,0,0,0.05,0.3,0.07,M);G(0.08,0.042,0,0.04,0.26,0.012,P);G(0.34,0.012,0,0.024,0.24,0.024,D);G(0.47,0.012,0,0.032,0.04,0.032,P);G(0.06,0.065,0,0.014,0.09,0.022,D);
    G(0.06,-0.05,-0.048,0.045,0.09,0.075,'#56652a');G(0.06,-0.012,-0.024,0.012,0.07,0.012,'#c9a64a',no);G(-0.13,-0.005,0,0.04,0.14,0.06,D);G(0.0,-0.05,0,0.03,0.035,0.065,P);}}
function rigDef(key){let d=RIG.defs.get(key);if(d)return d;const p=key.split(':');d=p[0]==='z'?rigZombieDef(p[1],p[2]!=null&&p[2]!=='-'?+p[2]:null,p[3]?rigSkinTex(p[3],+p[4]||0):null):rigSoldierDef(+p[1],+p[2],+p[3]||0);if(p[0]==='z'&&p[3]){const K=RSKIN.get(p[3]+':'+(+p[4]||0)),T=THREE;d.mats={n:new T.MeshLambertMaterial({map:K.tex,skinning:true,emissive:0xffffff,emissiveMap:K.tex,emissiveIntensity:0.38}),f:new T.MeshLambertMaterial({map:K.tex,skinning:true,color:0x4d4d4d,emissive:0xb3b3b3})};}RIG.defs.set(key,d);return d;}
function rigMats(){if(RIG.m)return RIG.m;const T=THREE;RIG.m={n:new T.MeshLambertMaterial({vertexColors:true,skinning:true,emissive:0x262230}),
  f:new T.MeshLambertMaterial({vertexColors:true,skinning:true,color:0x4d4d4d,emissive:0xb3b3b3}),o:new T.MeshBasicMaterial({color:0x120a0e,side:T.BackSide,skinning:true})};return RIG.m;}
function rigNew(key){const T=THREE,def=rigDef(key),M=rigMats();const bones=def.bones.map(b=>{const o=new T.Bone();o.position.set(b[0],b[1],b[2]);return o;});
  def.bones.forEach((b,i)=>{if(b[3]>=0)bones[b[3]].add(bones[i]);});
  const mesh=new T.SkinnedMesh(def.geo,(def.mats||M).n);mesh.add(bones[0]);mesh.updateMatrixWorld(true);const sk=new T.Skeleton(bones);mesh.bind(sk);
  const om=new T.SkinnedMesh(def.ogeo,M.o);mesh.add(om);om.updateMatrixWorld(true);om.bind(sk);mesh.frustumCulled=false;om.frustumCulled=false;
  R3.sc.add(mesh);return{key,mesh,om,mats:def.mats,B:bones,base:def.bones.map(b=>[b[0],b[1],b[2]]),d:def.d,used:0};}
function rigGet(o,key){let r=RIG.wm.get(o);if(r&&r.key!==key){rigFree(o,r);r=null;}
  if(!r){const pool=RIG.pools.get(key);r=pool&&pool.length?pool.pop():rigNew(key);RIG.wm.set(o,r);RIG.live.set(o,r);}r.used=RIG.frame;r.mesh.visible=true;return r;}
function rigFree(o,r){r.mesh.visible=false;RIG.wm.delete(o);RIG.live.delete(o);let p=RIG.pools.get(r.key);if(!p){p=[];RIG.pools.set(r.key,p);}p.push(r);}
function rigSweep(){for(const[o,r]of[...RIG.live])if(r.used!==RIG.frame)rigFree(o,r);}
function rigPose(r,P){const B=r.B,d=r.d;for(let i=0;i<B.length;i++){B[i].rotation.set(0,0,0);B[i].position.set(r.base[i][0],r.base[i][1],r.base[i][2]);}
  const s=Math.sin,legH=d.legH,ph=P.ph||0;
  const legsWalk=(amp,kn)=>{B[8].rotation.x=s(ph)*amp;B[10].rotation.x=-s(ph)*amp;B[9].rotation.x=Math.max(0,s(ph+1.7))*kn+0.05;B[11].rotation.x=Math.max(0,-s(ph+1.7))*kn+0.05;B[1].position.y=legH-Math.abs(s(ph))*0.012;};
  const kneel=k=>{B[1].position.y=legH*(1-0.42*k);B[8].rotation.x=-1.25*k;B[10].rotation.x=-1.25*k;B[9].rotation.x=2.0*k;B[11].rotation.x=2.0*k;};
  const P0=P.pose;
  if(P.sold){/* pemain & bot: memegang senapan */
    B[6].rotation.x=-1.42;B[6].rotation.z=0.12;B[7].rotation.x=-0.12;B[4].rotation.x=-1.28;B[4].rotation.z=-0.5;B[5].rotation.x=-0.55;B[5].rotation.z=0.2;
    if(P0==='walk'){legsWalk(P.mv?0.55:0,0.6);B[2].rotation.y=0.05*s(ph);}
    else if(P0==='crouch'){kneel(1);B[2].rotation.x=0.15;}
    else if(P0==='down'){B[1].position.y=legH*0.32;B[8].rotation.x=-1.45;B[10].rotation.x=-1.3;B[9].rotation.x=0.15;B[11].rotation.x=0.4;B[2].rotation.x=-0.35;B[3].rotation.x=0.3;B[4].rotation.x=0.4;B[4].rotation.z=0.3;}}
  else{/* zombi */
    const t=P.type;
    if(P0==='walk'){legsWalk(0.5,0.65);const raged=t==='witch';B[4].rotation.x=-1.35+s(ph)*0.15;B[6].rotation.x=-1.35-s(ph)*0.15;B[4].rotation.z=-0.06;B[6].rotation.z=0.06;B[5].rotation.x=-0.15;B[7].rotation.x=-0.15;
      B[2].rotation.x=t==='jockey'?0.55:0.14;B[3].rotation.x=0.1;B[3].rotation.z=s(ph*0.5)*0.14;
      if(t==='charger'){B[6].rotation.x=-0.25+s(ph)*0.2;B[2].rotation.x=0.3;}
      if(raged){B[4].rotation.x=0.7;B[6].rotation.x=0.7;B[2].rotation.x=0.45;}
      if(t==='brute'||t==='boss'){B[4].rotation.x=-0.5+s(ph)*0.3;B[6].rotation.x=-0.5-s(ph)*0.3;B[4].rotation.z=-0.25;B[6].rotation.z=0.25;}}
    else if(P0==='atk'){const a=G.t*9;B[4].rotation.x=-1.9+0.9*Math.max(0,s(a));B[6].rotation.x=-1.9+0.9*Math.max(0,-s(a));B[2].rotation.x=0.32;B[8].rotation.x=-0.35;B[9].rotation.x=0.45;B[10].rotation.x=0.25;B[3].rotation.x=-0.15;
      if(t==='charger'){B[6].rotation.x=-1.65;B[2].rotation.x=0.6;legsWalk(0.7,0.9);}
      if(t==='brute'||t==='boss'){B[4].rotation.x=-2.6+1.6*Math.max(0,s(a*0.6));B[6].rotation.x=-2.6+1.6*Math.max(0,s(a*0.6));}}
    else if(P0==='low'){kneel(1);B[2].rotation.x=0.65;B[3].rotation.x=0.35;B[4].rotation.x=-0.7;B[6].rotation.x=-0.7;
      if(t==='witch'){B[4].rotation.x=-2.2;B[6].rotation.x=-2.2;B[5].rotation.x=-1.6;B[7].rotation.x=-1.6;B[3].rotation.x=0.6;B[3].rotation.z=s(G.t*7)*0.06;}}
    else if(P0==='leap'){B[2].rotation.x=1.0;B[4].rotation.x=-2.7;B[6].rotation.x=-2.7;B[8].rotation.x=0.9;B[10].rotation.x=0.7;B[9].rotation.x=0.6;B[11].rotation.x=0.8;}
    else if(P0==='raise'){B[4].rotation.x=-3.0;B[6].rotation.x=-3.0;B[2].rotation.x=-0.2;B[3].rotation.x=-0.3;}
    else if(P0==='crawl'||P0==='crawlatk'){const a=P0==='crawlatk'?G.t*9:ph;B[0].rotation.x=1.5;B[0].position.z=-0.5;B[0].position.y=0.07;
      B[4].rotation.x=-2.7+s(a)*0.45;B[6].rotation.x=-2.7-s(a)*0.45;B[5].rotation.x=-0.3;B[7].rotation.x=-0.3;B[3].rotation.x=-0.85;B[2].rotation.y=s(a)*0.12;B[8].rotation.x=0.1;B[10].rotation.x=0.05;B[9].rotation.x=0.25;B[11].rotation.x=0.4;}
    else if(P0==='slam'){B[4].rotation.x=-0.8;B[6].rotation.x=-0.8;B[2].rotation.x=0.65;kneel(0.35);}}
  if(P.die!=null&&(P0==='crawl'||P0==='crawlatk')){B[0].position.y=0.07-Math.max(0,P.die-2)*0.03;B[4].rotation.x=-2.9;B[6].rotation.x=-2.4;B[3].rotation.x=0;}
  else if(P.die!=null){const k=Math.min(1,P.die/0.45);B[0].rotation.x=-k*1.5;B[0].position.y=-Math.max(0,P.die-3)*0.03;
    B[4].rotation.x=-0.4-0.8*k;B[6].rotation.x=-0.4-0.8*k;B[4].rotation.z=-0.5*k;B[6].rotation.z=0.5*k;B[8].rotation.x=-0.25*k;B[10].rotation.x=0.15*k;B[9].rotation.x=0.2;B[11].rotation.x=0.3;}}
function rigPlace(r,x,y,wz,ang,scale,flash){const m=r.mesh,M=r.mats||rigMats();m.material=flash?M.f:M.n;m.position.set(x,wz,y);m.rotation.set(0,Math.atan2(Math.cos(ang),Math.sin(ang)),0);m.scale.setScalar(scale);}
function zRig(o,wz){const pk=o.type==='walk'||o.type==='run'||o.type==='crawl',tv=(o.type==='walk'||o.type==='crawl')?(o.id>>>0)%7:0,r=rigGet(o,'z:'+(pk?'walk:0':o.type+':-')+':'+(o.type==='crawl'?'walk':o.type)+':'+tv);let pose='walk';
  if(o.type==='crawl')pose=o.state==='attack'?'crawlatk':'crawl';
  else if(o.act===1||o.act===6)pose='low';
  else if(o.act===2)pose='leap';else if(o.act===10)pose='raise';else if(o.act===11)pose='slam';else if(o.act===3)pose='atk';
  else if(o.state==='attack')pose='atk';
  rigPose(r,{pose,type:o.type,ph:(o.anim||0)*Math.PI/2,die:o.dead?o.dieT:null});rigPlace(r,o.x,o.y,wz,o.fa||0,0.8*o.scale*0.84/0.92,o.flash>0&&!o.dead);}
function soldRig(r0,wz){const r=rigGet(r0,'s:'+(r0.sk||0)+':'+colorOf(r0.peer)+':'+((r0.w|0)%ORDER.length));const mv=Math.hypot((r0.tx!=null?r0.tx:r0.x)-r0.x,(r0.ty!=null?r0.ty:r0.y)-r0.y)>0.01||r0.bot;
  rigPose(r,{sold:true,pose:r0.dn?'down':r0.cr?'crouch':'walk',mv:true,ph:(r0.anim||0)*Math.PI,die:!r0.al?r0.deadT:null});rigPlace(r,r0.x,r0.y,wz,r0.a||0,0.8*0.9/0.92,r0.hitT>0);}

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
  thunder(d=0){if(!AC||muted)return;const t=AC.currentTime+d,s=AC.createBufferSource();s.buffer=NB;s.loop=true;const fl=AC.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(1100,t);fl.frequency.exponentialRampToValueAtTime(70,t+2.8);
    const g=AC.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.85,t+0.05);g.gain.exponentialRampToValueAtTime(0.3,t+0.7);g.gain.exponentialRampToValueAtTime(0.001,t+3.2);s.connect(fl).connect(g).connect(master);s.start(t);s.stop(t+3.3);tone(64,30,1.8,'sine',0.32,d);},
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
const ORDER=['pistol','mg','sg','rl','awp','parang','kriss'],ZTYPES=['walk','run','fat','brute','hunter','smoker','charger','jockey','spitter','witch','boss','crawl'],PKIND=['mg','sg','rl','nade','med','awp','molo','kriss'];
const ZNAME={walk:'ZOMBI',run:'TENTARA',fat:'GENDUT',brute:'RAKSASA',hunter:'PEMBURU',smoker:'LIDAH',charger:'PENYERUDUK',jockey:'PENUNGGANG',spitter:'PELUDAH',witch:'KUNTILANAK',boss:'RAJA ZOMBI',crawl:'ZOMBI MERANGKAK'};
const SPECIALS=['hunter','smoker','charger','jockey','spitter'],SPEC_WAVE=[2,3,4,2,3];
const MAG={pistol:12,mg:45,sg:7,rl:6,awp:6,parang:1,kriss:45},RLD={pistol:1.0,mg:1.8,sg:1.6,rl:1.8,awp:2.6,parang:0.1,kriss:1.5};
const MAXR={mg:1200,sg:130,awp:120,rl:12,kriss:1400},MAXNADE=10,MAXMOLO=6,MAXDUAL=2,DUALMAG=60;
const PVPM=12;
const ZT={
  walk:{hp:3,sp:1.05,r:0.24,hitR:0.27,dmg:9,rate:0.9,pts:100,scale:1,mass:1,drop:0.09},
  crawl:{hp:1.2,sp:1.23,r:0.24,hitR:0.32,dmg:11,rate:0.8,pts:120,scale:1,mass:0.8,drop:0.04},
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
const BOTS=new Map(),GEN={on:false,x:0,y:0,hp:0,max:1000,hitT:0,dead:false},DEF_WAVES=8;
const NET={mode:'solo',def:false,r:null,code:'',nick:'',me:null,host:true,hostPeer:null,remotes:new Map(),seen:new Map(),ev:[],seq:0,sendT:0,
  gp:'lobby',mid:0,lastHost:null,fp:[],pv:{ph:'count',tl:300,ct:3},pvTaken:{},zid:1,pid:1,hidden:new Map(),spits:[],prevWave:0,prevBreak:0,joining:false,forfeit:false};
const r2=v=>Math.round(v*100)/100;
const num=(v,d=0)=>(typeof v==='number'&&Number.isFinite(v))?v:d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function cleanNick(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9 _-]/g,'').trim().slice(0,10)||'PEMAIN';}
function online(){return NET.mode!=='solo'&&!!NET.r;}
function pushEv(arr){if(BOTS.size&&typeof arr[1]==='string'&&BOTS.has(arr[1])){botEv(arr);return;}if(!online())return;NET.ev.push([++NET.seq].concat(arr));if(NET.ev.length>24)NET.ev.splice(0,NET.ev.length-24);}

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
  if(NET.mode==='coop')for(const r of NET.remotes.values())if(r.al)a.push({x:r.x,y:r.y,z:r.jz||0,me:false,peer:r.peer,dn:!!r.dn});
  if(NET.mode==='solo'&&G.state==='play')for(const b of BOTS.values())if(b.al)a.push({x:b.x,y:b.y,z:0,me:false,peer:b.peer,dn:b.dn,bot:b});return a;}
function teamSize(){return NET.mode==='coop'?1+NET.remotes.size:1+BOTS.size*0.5;}
function teamOrder(){const ids=[NET.me||'~'].concat([...NET.remotes.keys()]);ids.sort();return ids;}
function colorOf(peer){if(typeof peer==='string'&&peer.startsWith('bot'))return(+peer.slice(3)||1)%4;const i=teamOrder().indexOf(peer);return i<0?0:i%4;}

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
  const zid=NET.zid++;return{id:zid,type,fr:zFr(type,zid),x,y,tx:x,ty:y,hp:t.hp*hs,sp:t.sp*(1+Math.min(0.35,G.wave*0.03))*(0.9+R()*0.2),r:t.r,hitR:t.hitR,dmg:t.dmg,rate:t.rate,pts:t.pts,
    scale:t.scale,mass:t.mass,drop:t.drop,anim:R()*4,flash:0,atkCD:0.6,kx:0,ky:0,losT:0,see:false,spitCD:2+R()*2,groanT:2+R()*6,
    dead:false,dieT:0,rise:0.7,mir:R()<0.5,fa:R()*Math.PI*2,state:'walk',idle:false,hpMax:t.hp*hs,lastHit:-9};}
function setupAttract(){zs=[];pl.x=MAP.start[0];pl.y=MAP.start[1];pl.pitch=0;pl.z=0;pl.vz=0;pl.cr=0;
  for(const t of['walk','fat','run','walk','run']){const c=nearCell(pl.x,pl.y,1.8,4.5);if(!c)continue;const z=makeZ(t,c[0]+(R()-0.5)*0.3,c[1]+(R()-0.5)*0.3);z.idle=true;z.rise=0;zs.push(z);}}
function placeStart(){pl.x=MAP.start[0];pl.y=MAP.start[1];let ba=-Math.PI/2,bd=-1;for(let k=0;k<8;k++){const a=k*Math.PI/4,d=castT(pl.x,pl.y,Math.cos(a),Math.sin(a));if(d>bd){bd=d;ba=a;}}
  pl.a=ba;const fx=pl.x+Math.cos(ba)*3,fy=pl.y+Math.sin(ba)*3;const p=(bd<3.5||solid(fx,fy))?nearCell(pl.x,pl.y,2,4):[fx,fy];if(p)picks.push({id:NET.pid++,kind:'mg',x:p[0],y:p[1],ph:0});}
function startWave(n,sim){
  G.wave=n;banner(GEN.on?(n>=DEF_WAVES?'GELOMBANG TERAKHIR!':'GELOMBANG '+n+'/'+DEF_WAVES):'GELOMBANG '+n,'big',2.2);S.wave();if(NET.mode!=='pvp')misiAdd('maxwave',n,true);botsWave();
  if(sim){const np=teamSize();G.toSpawn=Math.round((5+n*3)*(1+0.5*(np-1)));G.boss=(n%5===0||(GEN.on&&n>=DEF_WAVES))?1:0;G.spawnT=2;G.breakT=0;
    zs=zs.filter(z=>!(z.type==='witch'&&!z.raged&&!z.dead));
    if(n>=4&&R()<0.45){const[x,y]=spawnPos(livePlayers());const z=makeZ('witch',x,y);z.rise=0;z.act=6;zs.push(z);announce('witch');}}
  if(n%5===0||(GEN.on&&n>=DEF_WAVES))banner('AWAS! RAJA ZOMBI!','sub',2.6);
  if(NET.mode==='coop'&&!pl.alive)respawnCoop();
  if(pl.down){pl.down=false;pl.hp=Math.max(pl.hp,30);banner('KAMU BANGKIT!','sub',1.6);}
}
function waveClear(sim){G.shopBuys={};const bonus=G.wave*500;if(pl.alive){addScore(bonus);pl.hp=Math.min(pl.maxhp,pl.hp+20);}
  banner('GELOMBANG BERSIH!','big',2.6);banner('BONUS +'+bonus,'sub',2.6);S.wave();
  if(sim){G.breakT=14;const pls=livePlayers();const kinds=['mg','sg','rl','awp','kriss','nade','med','molo'];
    for(let i=0;i<1+Math.min(3,pls.length);i++){const p=pls[i%Math.max(1,pls.length)]||{x:12.5,y:12.5};const c=nearCell(p.x,p.y,1.5,4);if(c)picks.push({id:NET.pid++,kind:kinds[(R()*kinds.length)|0],x:c[0],y:c[1],ph:R()*6});}
    for(const b of BOTS.values())if(b.al&&!b.dn)b.hp=Math.min(100,b.hp+30);
    if(GEN.on&&!GEN.dead&&G.wave>=DEF_WAVES)defendWin();}}
function spawnPos(pls){let fb=null;for(let i=0;i<60;i++){const c=openCells[(R()*openCells.length)|0],x=c[0]+0.5,y=c[1]+0.5;
  let ok=true;for(const p of pls){if(Math.hypot(x-p.x,y-p.y)<7){ok=false;break;}}
  if(!ok)continue;fb=[x,y];if(i<40&&pl.alive&&Math.abs(angDiff(Math.atan2(y-pl.y,x-pl.x),pl.a))<0.9&&los(pl.x,pl.y,x,y))continue;return[x,y];}
  return fb||[1.5,1.5];}
function spawnOne(pls){let type;if(G.boss){type='boss';G.boss=0;}else{const w=G.wave;let spec=0;for(const z of zs)if(!z.dead&&SPECIALS.includes(z.type))spec++;
    const pool=SPECIALS.filter((t,i)=>w>=SPEC_WAVE[i]);
    if(pool.length&&R()<Math.min(0.45,0.22+w*0.03)&&spec<2+Math.floor(w/3))type=pool[(R()*pool.length)|0];
    else if(w>=6&&R()<0.04&&!zs.some(o=>o.type==='brute'&&!o.dead))type='brute';
    else if(w>=2&&R()<0.1)type='crawl';
    else{const q=R();type=(w>=3&&q<0.16)?'fat':(w>=2&&q<0.48)?'run':'walk';}G.toSpawn--;}
  const[x,y]=spawnPos(pls);const z=makeZ(type,x,y);if(GEN.on&&['walk','run','fat','brute'].includes(type))z.gt=R()<0.6;zs.push(z);burst(x,y,0.02,10,PAL_DUST,1.4,0,0,true);announce(type);
  if(type==='boss'){const np=teamSize();z.hp*=1+0.6*(np-1);z.hpMax=z.hp;z.cd=3;z.cd2=4;G.shake=Math.max(G.shake,0.6);zv('boss','alert',x,y);}}
function announce(type){if(type==='boss'){banner('RAJA ZOMBI DATANG!','combo',2.4);G.shake=Math.max(G.shake,0.5);return;}if(G.seen.has(type)||type==='walk'||type==='run')return;G.seen.add(type);banner(ZNAME[type]+' MUNCUL!','sub',2.4);}
function hurtZ(z,dmg,kx,ky,by){if(z.dead||z.idle)return false;z.rise=0;z.lastHit=G.t;if(z.type==='witch'&&!z.raged)witchRage(z);if(z.type==='smoker'&&(z.act===4||z.act===9)){release(z);z.cd=4;z.stun=0.6;}if(z.type==='hunter'&&z.act===1){z.act=0;z.stun=0.3;}z.hp-=dmg;z.flash=0.07;z.kx+=kx/z.mass;z.ky+=ky/z.mass;if(z.hp<=0){killZ(z,kx,ky,by);return true;}zHurtS(z);return false;}
function localKill(pts,src,zt){addScore(pts);pop('+'+pts);G.kills++;if(pts>=6000){G.bossK=(G.bossK||0)+1;misiAdd('boss',1);}
  misiAdd('kills',1);if(src)misiAdd('w_'+src,1);if(zt&&SPECIALS.includes(zt))misiAdd('spec',1);
  if(G.comboT>0)G.combo++;else G.combo=1;G.comboT=0.9;
  if(G.combo===3){banner('MANTAP!','combo',1.1);addScore(200);}else if(G.combo===5){banner('GILA!','combo',1.1);addScore(500);}
  else if(G.combo===8){banner('BRUTAL!','combo',1.3);addScore(1000);}else if(G.combo>8&&G.combo%4===0){banner('BRUTAL!!','combo',1.3);addScore(1000);}}
function deathFx(z,dx,dy){const goo=z.type==='fat';burst(z.x,z.y,0.4*z.scale,goo?26:16,goo?PAL_GOO:PAL_BLOOD,goo?3.2:2.2,dx,dy);
  gibs(z.x,z.y,goo?5:(z.type==='boss'?14:z.type==='brute'?8:2));S.splat(vol(z.x,z.y));zv(z.type,'die',z.x,z.y);if(z.type==='boss')banner('RAJA ZOMBI TUMBANG!','big',2.6);
  if(goo||z.type==='brute'||z.type==='boss'){booms.push({x:z.x,y:z.y,t:0,dur:0.55,size:z.type==='boss'?2.4:z.type==='brute'?1.6:1.05});S.boom(0.5*vol(z.x,z.y,12));
    G.shake=Math.max(G.shake,0.35*Math.max(0,1-Math.hypot(pl.x-z.x,pl.y-z.y)/8));}}
function killZ(z,dx,dy,by){release(z);z.dead=true;z.dieT=0;
  if(NET.host&&NET.mode!=='pvp'&&(z.type==='walk'||z.type==='run')&&!z.lastHs&&!['boom','fire','parang'].includes(z.ls)&&R()<0.3){G.crawlQ=G.crawlQ||[];G.crawlQ.push({x:z.x,y:z.y,t:G.t+1.1});}if(z.type==='fat'||z.type==='brute'||z.type==='boss')z.dieT=0.25;
  if(!by||by===NET.me)localKill(z.pts,z.ls,z.type);else pushEv(['kl',by,z.pts,z.id]);
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
    if(G.crawlQ&&G.crawlQ.length){for(const c of G.crawlQ)if(c.t<=G.t){const z=makeZ('crawl',c.x,c.y);z.rise=0.45;zs.push(z);announce('crawl');}G.crawlQ=G.crawlQ.filter(c=>c.t>G.t);}
  if(G.toSpawn===0&&!G.boss&&alive===0&&!(G.crawlQ&&G.crawlQ.length))waveClear(true);}
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
    if(z.gt&&GEN.on&&!GEN.dead&&!(d<2.2&&z.see)){const gd=Math.hypot(GEN.x-z.x,GEN.y-z.y);
      if(gd<z.r+0.55){z.state='attack';if(z.atkCD<=0){z.atkCD=z.rate;zv(z.type,'attack',z.x,z.y);genHurt(z.dmg*(z.type==='brute'?1.5:1));}}
      else{z.state='walk';const[tx,ty]=(gd<4&&los(z.x,z.y,GEN.x,GEN.y))?[GEN.x,GEN.y]:flowTarget(z,GEN,flowG);const ex=tx-z.x,ey=ty-z.y,el=Math.hypot(ex,ey)||1;
        const s=z.sp*(z.flash>0?0.3:1);moveEnt(z,ex/el*s*dt,ey/el*s*dt);z.anim+=dt*(2+z.sp*2);}
      continue;}
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
    if(pl.alive){const dx=pl.x-a.x,dy=pl.y-a.y,d=Math.hypot(dx,dy),rr=a.r+pl.r;if(d<rr&&d>1e-4){const p=rr-d;moveEnt(pl,dx/d*p*0.6,dy/d*p*0.6);moveEnt(a,-dx/d*p*0.4,-dy/d*p*0.4);}}
    for(const b of BOTS.values()){if(!b.al)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),rr=a.r+b.r;if(d<rr&&d>1e-4){const p=rr-d;moveEnt(b,dx/d*p*0.6,dy/d*p*0.6);moveEnt(a,-dx/d*p*0.4,-dy/d*p*0.4);}}
    if(GEN.on&&!GEN.dead){const dx=a.x-GEN.x,dy=a.y-GEN.y,d=Math.hypot(dx,dy),rr=a.r+0.42;if(d<rr&&d>1e-4)moveEnt(a,dx/d*(rr-d),dy/d*(rr-d));}}
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
function zFace(dt){if(dt<=0)return;const tg=[];if(pl.alive&&!pl.spectator)tg.push(pl);for(const r of NET.remotes.values())if(r.al)tg.push(r);for(const b of BOTS.values())if(b.al)tg.push(b);if(GEN.on&&!GEN.dead)tg.push(GEN);
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
  if(NET.mode==='solo'&&!(BOTS.size&&!pl.down&&teamUp())){pl.down=false;if(pl.lives>1){soloRevive();return;}gameOver();return;}
  if(NET.mode!=='pvp'&&!pl.down&&teamUp()){pl.down=true;pl.hp=100;pl.st=null;pl.spawnProt=0.8;pl.reload=0;setWpn('pistol');G.fireHeld=false;G.downs=(G.downs||0)+1;
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
function coopEnd(){NET.gp='end';G.state='over';G.overT=0;G.fireHeld=false;if(G.defRes==='win')S.win();else S.over();saveBest();exitLock();endMatch();}

/* ================= shooting ================= */
function cursorAim(){return !G.locked&&!isTouch&&G.min&&G.state==='play'&&!G.paused&&!G.needClick&&ZK<1.3;}
function aimDir(){const pitch=pl.pitch+pl.rec;if(!cursorAim())return{a:pl.a,s:pitch/H};
  const off=Math.atan((2*(G.mx+0.5)/W-1)*PLANE/ZK),hz=Math.round(HH+pitch*ZK),sp=-(G.my+0.5-hz)/(ZK*H);return{a:pl.a+off,s:sp*Math.cos(off)};}
function fire(){if(!canAct()||G.shopOpen||G.repairing)return;const w=WEAP[pl.wpn];if(pl.cool>0||G.swapT>0||pl.reload>0||pl.swingT>0.1)return;if(w.melee){swing(false);return;}
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
function zHitBox(z){const k=(z.act===1||z.act===6)?(z.type==='witch'?0.62:0.72):1;let top,head;
  if(z.type==='crawl'){top=0.37*z.scale;head=0.2*z.scale;}
  else if(R3.on&&R3.vox){const d=zDims(z.type==='run'?'walk':z.type),s=0.8*z.scale*0.84/0.92,hb=d.legH+d.torsoH+0.012;top=(hb+d.headS+0.02)*s;head=(hb-0.015)*s;}
  else{const H0=0.8*z.scale,f=z.fr&&z.fr.hz;if(f){top=H0*(f[1]+0.02);head=H0*(f[0]-0.02);}else{top=H0*0.86;head=H0*((z.type==='fat'||z.type==='brute'||z.type==='boss')?0.66:0.6);}}
  return{top:top*k,head:head*k};}
function zHeight(z){if(z.type==='crawl')return 0.3*z.scale;return 0.8*z.scale*((z.act===1||z.act===6)?(z.type==='witch'?0.62:0.72):1);}
function shootRay(ang,slope,dmg,knock,pierce=1){
  const e0=eyeZ(),dx=Math.cos(ang),dy=Math.sin(ang),wt=castT(pl.x,pl.y,dx,dy);let lim=wt,floorHit=false;
  if(slope<0){const tf=e0/(-slope);if(tf<lim){lim=tf;floorHit=true;}}
  const skyMiss=!floorHit&&(e0+slope*wt)>1;
  let best=null,bt=lim,bk=0,bhs=false;const zh=[];
  if(NET.mode!=='pvp'){for(const z of zs){if(z.dead||z.idle)continue;if(pl.st&&pl.st.zid===z.id&&z.act===5)continue;const rx=z.x-pl.x,ry=z.y-pl.y,t=rx*dx+ry*dy;if(t<=0.05||t>=lim)continue;
    if(Math.abs(rx*dy-ry*dx)>=z.hitR)continue;const zb=zBase(z),hb=zHitBox(z),zr=e0+slope*t;
    if(zr<zb-0.02||zr>zb+hb.top)continue;zh.push({z,t,hs:zr>zb+hb.head});}
    zh.sort((a,b)=>a.t-b.t);if(zh.length){best=zh[0].z;bt=zh[0].t;bk=1;bhs=zh[0].hs;}}
  else for(const r of NET.remotes.values()){if(!r.fighter||!r.al)continue;const rx=r.x-pl.x,ry=r.y-pl.y,t=rx*dx+ry*dy;if(t<=0.05||t>=bt)continue;
    if(Math.abs(rx*dy-ry*dx)>=0.27)continue;const zr=e0+slope*t,zb=r.jz||0,top=zb+(r.cr?0.52:0.7);if(zr<zb-0.02||zr>top)continue;best=r;bt=t;bk=2;bhs=zr>top-0.15;}
  const hx=pl.x+dx*bt,hy=pl.y+dy*bt,hz=e0+slope*bt;
  if(bk===1){G.hitMark=0.12;for(let i=0;i<Math.min(pierce,zh.length);i++){const c=zh[i],z=c.z,dm=dmg*(c.hs?2.5:1)*(1-0.25*i),goo=z.type==='fat'||z.type==='spitter';
      const px=pl.x+dx*c.t,py=pl.y+dy*c.t,pz=e0+slope*c.t;burst(px,py,pz,c.hs?8:5,goo?PAL_GOO:PAL_BLOOD,1.5,dx,dy);if(c.hs&&i===0){pop('HEADSHOT!','#ffe14a');G.hs++;misiAdd('hs',1);}z.ls=pl.wpn;z.lastHs=!!c.hs;
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
function myExplosion(x,y,Rr,dmg){fxExplosion(x,y,Rr);for(const z of zs)if(!z.dead&&Math.hypot(z.x-x,z.y-y)<Rr+z.r)z.ls='boom';
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
      burst(z.x,z.y,0.5*z.scale,10,goo?PAL_GOO:PAL_BLOOD,2.2,nx,ny);z.ls='parang';
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
    if(f.own)for(const z of zs)if(!z.dead&&Math.hypot(z.x-f.x,z.y-f.y)<f.r+z.r*0.5)z.ls='fire';
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
function teamUp(){for(const r of NET.remotes.values())if(r.al&&!r.dn)return true;if(NET.mode==='solo')for(const b of BOTS.values())if(b.al&&!b.dn)return true;return false;}
function reviveTick(dt){G.revNear=null;if((NET.mode!=='coop'&&!(NET.mode==='solo'&&BOTS.size))||!pl.alive||pl.down||G.state!=='play'){G.revT=0;G.revTarget=null;return;}
  let best=null,bd=1.4;for(const r of(NET.mode==='solo'?BOTS:NET.remotes).values()){if(!r.al||!r.dn)continue;const d=Math.hypot(r.x-pl.x,r.y-pl.y);if(d<bd){bd=d;best=r;}}
  G.revNear=best;const hold=keys.KeyE||G.useHeld;
  if(best&&hold){if(G.revTarget!==best.peer){G.revTarget=best.peer;G.revT=0;}G.revT+=dt;
    if(G.revT>=3){if(best.bot){best.dn=false;best.hp=50;best.st=null;}else pushEv(['rv',best.peer]);G.revs++;misiAdd('revs',1);addScore(300);banner('KAMU MENOLONG '+best.nick+'!','sub',2);S.pick();G.revT=0;G.revTarget=null;}}
  else{G.revT=0;G.revTarget=null;}}
function myReviver(){for(const r of NET.remotes.values())if(r.rv===NET.me&&r.al)return r;for(const b of BOTS.values())if(b.rv==='me'&&b.al)return b;return null;}

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
  {n:'PERBAIKI GEN',d:'Generator +300',p:()=>800,lim:2,ok:()=>GEN.on&&!GEN.dead&&GEN.hp<GEN.max,no:()=>!GEN.on?'Khusus mode Bertahan':'Generator utuh',b:()=>{genRepair(300);}},
  {n:'UPGRADE',d:()=>pl.dmgLv>=5?'Damage maksimal':'Damage +15% (Lv '+(pl.dmgLv+1)+')',p:()=>1500+pl.dmgLv*1000,lim:1,ok:()=>pl.dmgLv<5,no:()=>'Sudah maksimal',b:()=>{pl.dmgLv++;pl.dmgMul=1+0.15*pl.dmgLv;}},
];
const SHOPKEY=['1','2','3','4','5','6','7','8','9','0','-','='];
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
  G.breakT=0;G.fireHeld=false;G.allDeadT=0;G.remain=0;NET.hidden.clear();fires=[];G.matchDone=false;G.expRes=null;G.bossK=0;G.pings=new Map();G.hs=0;G.shots=0;G.hits=0;G.revs=0;G.revT=0;G.revTarget=null;G.downs=0;G.crawlQ=[];if(G.shopOpen)openShop(false);BOTS.clear();GEN.on=false;GEN.dead=false;G.defRes=null;G.repairing=false;}
function resetPlayer(){Object.assign(pl,{a:-Math.PI/2,pitch:0,hp:100,score:0,cool:0.3,kick:0,muzzle:0,bobAmt:0,sway:0,alive:true,spectator:false,deaths:0,killedBy:null,spawnProt:0,respawnT:0,z:0,vz:0,cr:0,st:null,rec:0,lives:1,down:false,cash:0,armor:0,dmgLv:0,dmgMul:1,swingT:0,meleeCD:0,fireTick:0});resetLoadout();}
function enterPlay(){G.state='play';G.paused=false;G.touchCrouch=false;showMenu(false);G.needClick=!G.locked&&!isTouch;G.fsAuto=isTouch&&!!SET.fs;if(isTouch&&SET.fs)tryFullscreen();}
function startSolo(def){def=!!def;G.lastDef=def;NET.mode='solo';NET.host=true;clearWorld();resetPlayer();placeStart();if(def)genStart();botsInit(BOTPREF);
  G.flowT=0;enterPlay();G.needClick=false;lockPointer();startWave(1,true);}
function startCoopLocal(sim){clearWorld();resetPlayer();if(NET.def)genStart();
  if(sim){placeStart();startWave(1,true);}
  else{const h=NET.lastHost;const c=nearCell(num(h&&h.x,MAP.start[0]),num(h&&h.y,MAP.start[1]),1,3)||MAP.start;pl.x=c[0];pl.y=c[1];NET.prevWave=0;NET.prevBreak=0;}
  enterPlay();}
function startPvpLocal(){clearWorld();resetPlayer();const i=NET.fp.indexOf(NET.me);pl.spectator=i<0;
  const sp=MAP.spawns[Math.max(0,i)%2];pl.x=sp[0];pl.y=sp[1];pl.a=Math.atan2(12.5-pl.y,12.5-pl.x);
  if(pl.spectator){pl.x=12.5;pl.y=12.5;banner('KAMU MENONTON','sub',3);}
  NET.pvTaken={};enterPlay();}

/* ================= teman bot (solo) ================= */
let BOTPREF=0;try{BOTPREF=clamp(parseInt(localStorage.getItem('kotamati-bots')||'0',10)||0,0,2);}catch(e){}
const BOTNAME=['BOT JOKO','BOT SITI'],BOTW=[1,6];
function botsInit(n){BOTS.clear();for(let i=0;i<n;i++){const c=nearCell(pl.x,pl.y,0.8,2.2)||[pl.x+0.6,pl.y];
  BOTS.set('bot'+(i+1),{bot:true,peer:'bot'+(i+1),nick:BOTNAME[i],sk:(G.skin+4+i*5)%SKINS.length,x:c[0],y:c[1],a:pl.a,hp:100,al:true,dn:false,deadT:9,sp:false,cr:false,jz:0,anim:0,flashT:0,hitT:0,lv:0,
    cool:0.6+i*0.2,w:BOTW[i],r:0.22,tgt:null,fl:null,pathT:0,revT:0,rv:null,rvp:0,st:null,seeT:0});}}
function botsWave(){for(const b of BOTS.values()){if(b.al&&!b.dn)continue;const c=nearCell(pl.x,pl.y,0.8,2.5)||[pl.x,pl.y];
  Object.assign(b,{x:c[0],y:c[1],al:true,dn:false,hp:100,st:null,revT:0,rv:null});}}
function botEv(e){const b=BOTS.get(e[1]),t=e[0];if(!b)return;
  if(t==='za')botHurt(b,num(e[2]));
  else if(t==='kb'){for(let i=0;i<6;i++)moveEnt(b,num(e[2])/6,num(e[3])/6);}
  else if(t==='st'){const k=String(e[2]);if(k==='none'){if(b.st&&b.st.zid===e[3])b.st=null;}else if(b.al)b.st={k,zid:num(e[3])};}}
function botHurt(b,d){if(!b.al||G.state!=='play')return;b.hp-=d*0.7;b.hitT=0.08;
  if(b.hp>0)return;
  if(!b.dn){b.dn=true;b.hp=100;b.st=null;b.revT=0;b.rv=null;banner(b.nick+' TERJATUH! TAHAN E UNTUK MENOLONG','sub',2.4);S.down();}
  else{b.al=false;b.dn=false;b.deadT=0;b.st=null;burst(b.x,b.y,0.4,14,PAL_BLOOD,2,0,0);gibs(b.x,b.y,2);S.splat(vol(b.x,b.y));banner(b.nick+' TUMBANG · BANGKIT DI GELOMBANG BERIKUTNYA','sub',2.4);}}
function botNav(b,gx,gy){if(los(b.x,b.y,gx,gy))return[gx,gy];
  if(b.pathT<=0||!b.fl){b.pathT=0.4;b.fl=b.fl||new Int16Array(MW*MH);buildFlow([[Math.floor(gx),Math.floor(gy)]],b.fl);}
  return flowTarget(b,{x:gx,y:gy},b.fl);}
function botShoot(b,z){const d=Math.hypot(z.x-b.x,z.y-b.y),mg=b.w===1,rate=mg?0.15:0.12,dmg=(mg?0.95:0.78)*(1+0.05*Math.max(0,G.wave-1));
  b.cool=rate*(0.9+R()*0.4);b.flashT=0.06;S.shot(ORDER[b.w],0.45*vol(b.x,b.y,16));
  if(R()<Math.max(0.35,0.78-d*0.03)){const nx=(z.x-b.x)/(d||1),ny=(z.y-b.y)/(d||1),goo=z.type==='fat'||z.type==='spitter';
    burst(z.x,z.y,0.45*z.scale,3,goo?PAL_GOO:PAL_BLOOD,1.2,nx,ny);hurtZ(z,dmg,nx*0.4,ny*0.4,b.peer);}}
function botTick(dt){if(!BOTS.size||G.state!=='play')return;
  for(const b of BOTS.values()){b.flashT-=dt;b.hitT-=dt;
    if(!b.al){b.deadT+=dt;continue;}
    if(b.st){const zz=zById(b.st.zid);if(!zz||zz.dead)b.st=null;}
    if(b.dn){b.hp-=100/40*dt;if(b.hp<=0){b.hp=0.5;botHurt(b,99);}continue;}
    b.cool-=dt;b.pathT-=dt;b.seeT-=dt;
    let mate=null;if(pl.alive&&pl.down)mate={x:pl.x,y:pl.y,me:true};else for(const o of BOTS.values())if(o!==b&&o.al&&o.dn){mate=o;break;}
    let gx=pl.x,gy=pl.y,want=2.2;if(mate){gx=mate.x;gy=mate.y;want=0.75;}
    else if(GEN.on&&!GEN.dead&&Math.hypot(pl.x-GEN.x,pl.y-GEN.y)<5){gx=(pl.x+GEN.x)/2;gy=(pl.y+GEN.y)/2;want=1.6;}
    if(!pl.alive&&!mate){gx=b.x;gy=b.y;}
    const dg=Math.hypot(gx-b.x,gy-b.y);
    if(b.seeT<=0){b.seeT=0.25;let best=null,bd=13;for(const z of zs){if(z.dead||z.idle||z.rise>0)continue;if(z.type==='witch'&&!z.raged)continue;
        const d=Math.hypot(z.x-b.x,z.y-b.y);if(d<bd&&los(b.x,b.y,z.x,z.y)){bd=d;best=z;}}b.tgt=best;}
    const t=b.tgt&&!b.tgt.dead?b.tgt:null,pinned=b.st&&(b.st.k==='pin'||b.st.k==='pull');
    if(pinned){b.revT=0;b.rv=null;continue;}
    let mx=0,my=0;
    if(mate&&dg<0.95){b.revT+=dt;b.rv=mate.me?'me':mate.peer;b.rvp=Math.round(clamp(b.revT/3,0,1)*100);
      if(b.revT>=3){b.revT=0;b.rv=null;b.rvp=0;
        if(mate.me){pl.down=false;pl.hp=40;pl.spawnProt=1.5;pl.st=null;banner('DITOLONG '+b.nick+'!','big',1.8);S.oneup();}
        else{mate.dn=false;mate.hp=50;mate.st=null;banner(b.nick+' MENOLONG '+mate.nick,'sub',1.6);}}}
    else{b.revT=0;b.rv=null;b.rvp=0;
      if(dg>want){const[tx,ty]=botNav(b,gx,gy);const ex=tx-b.x,ey=ty-b.y,el=Math.hypot(ex,ey)||1;mx+=ex/el;my+=ey/el;}
      for(const z of zs){if(z.dead||z.idle||z.rise>0)continue;const dx=b.x-z.x,dy=b.y-z.y,d=Math.hypot(dx,dy);if(d<1.7&&d>0.01){mx+=dx/d*(1.7-d)*1.3;my+=dy/d*(1.7-d)*1.3;}}
      const sep=(ox,oy)=>{const dx=b.x-ox,dy=b.y-oy,d=Math.hypot(dx,dy);if(d<0.8&&d>0.01){mx+=dx/d*(0.8-d)*2.2;my+=dy/d*(0.8-d)*2.2;}};
      if(pl.alive)sep(pl.x,pl.y);for(const o of BOTS.values())if(o!==b&&o.al)sep(o.x,o.y);if(GEN.on&&!GEN.dead)sep(GEN.x,GEN.y);
      const l=Math.hypot(mx,my);if(l>0.06){if(l>1){mx/=l;my/=l;}const sp=(dg>5?3.8:2.8)*(b.st&&b.st.k==='ride'?0.45:1),ox=b.x,oy=b.y;moveEnt(b,mx*sp*dt,my*sp*dt);b.anim+=Math.hypot(b.x-ox,b.y-oy)*4.5;}}
    if(t){b.a=Math.atan2(t.y-b.y,t.x-b.x);if(b.cool<=0&&b.revT<=0)botShoot(b,t);}
    else if(Math.hypot(mx,my)>0.06)b.a=Math.atan2(my,mx);}}

/* ================= mode bertahan (generator) ================= */
function genPlace(){let best=null,bs=-1e9;const sx=MAP.start[0],sy=MAP.start[1];
  for(const c of openCells){const x=c[0]+0.5,y=c[1]+0.5,d=Math.hypot(x-sx,y-sy);if(d<1.4||d>3.8)continue;let n=0;for(const[ox,oy]of DIR8)if(!blocked(c[0]+ox,c[1]+oy))n++;const sc=n*10-d;if(sc>bs){bs=sc;best=[x,y];}}
  return best||[sx+1,sy];}
function genStart(){const p=genPlace();Object.assign(GEN,{on:true,x:p[0],y:p[1],max:Math.round(1000*(1+0.5*(teamSize()-1))),hitT:0,dead:false,alT:0,rq:0,near:false});GEN.hp=GEN.max;
  buildFlow([[Math.floor(GEN.x),Math.floor(GEN.y)]],flowG);}
function genHurt(d){if(!GEN.on||GEN.dead)return;GEN.hp=Math.max(0,GEN.hp-d);GEN.hitT=0.12;burst(GEN.x,GEN.y,0.4,4,PAL_SPARK,1.6,0,0,true);if(R()<0.5)S.chop();
  if(G.t>(GEN.alT||0)){GEN.alT=G.t+7;banner('GENERATOR DISERANG!','sub',1.6);}
  if(GEN.hp<=0)genDestroyed(true);}
function genDestroyed(sim){if(GEN.dead)return;GEN.dead=true;GEN.hp=0;fxExplosion(GEN.x,GEN.y,2.2);igniteFx(GEN.x,GEN.y);banner('GENERATOR HANCUR!','big',3);
  if(sim){G.defRes='lose';if(NET.mode==='coop')coopEnd();else gameOver();}}
function genRepair(n){if(!GEN.on||GEN.dead)return;GEN.hp=Math.min(GEN.max,GEN.hp+n);if(!NET.host)pushEv(['gr',Math.round(n)]);}
function defendWin(){if(G.defRes)return;G.defRes='win';banner('GENERATOR SELAMAT!','big',3);banner('EVAKUASI BERHASIL','sub',3);
  if(NET.mode==='coop')coopEnd();else{G.state='over';G.overT=0;G.fireHeld=false;S.win();saveBest();exitLock();endMatch();}}
function genTick(dt){if(!GEN.on)return;GEN.hitT-=dt;
  GEN.near=G.state==='play'&&pl.alive&&!pl.down&&!GEN.dead&&Math.hypot(pl.x-GEN.x,pl.y-GEN.y)<1.7&&!G.revNear;
  const hold=keys.KeyE||G.useHeld;G.repairing=!!(GEN.near&&hold&&GEN.hp<GEN.max&&!G.shopOpen);
  if(G.repairing){const a=40*dt;GEN.hp=Math.min(GEN.max,GEN.hp+a);if(!NET.host)GEN.rq=(GEN.rq||0)+a;G.repCD=(G.repCD||0)-dt;if(G.repCD<=0){G.repCD=0.3;burst(GEN.x,GEN.y,0.35,3,PAL_SPARK,1.2,0,0,true);S.click();}}
  if(!NET.host&&GEN.rq>=8){pushEv(['gr',Math.round(GEN.rq)]);GEN.rq=0;}
  if(!GEN.dead&&pl.alive){const dx=pl.x-GEN.x,dy=pl.y-GEN.y,d=Math.hypot(dx,dy),rr=0.42+pl.r;if(d<rr&&d>1e-4)moveEnt(pl,dx/d*(rr-d),dy/d*(rr-d));}
  if(!GEN.dead&&GEN.hp<GEN.max*0.5&&R()<dt*PQ*(GEN.hp<GEN.max*0.25?10:5))parts.push({k:'b',x:GEN.x+(R()-0.5)*0.3,y:GEN.y+(R()-0.5)*0.3,z:0.55,vx:0,vy:0,vz:0.5+R()*0.4,g:-0.3,life:1+R(),col:PAL_SMOKE[(R()*2)|0],s:0.08+R()*0.06});
  if(GEN.dead&&R()<dt*PQ*4)parts.push({k:'b',x:GEN.x+(R()-0.5)*0.4,y:GEN.y+(R()-0.5)*0.4,z:0.2,vx:0,vy:0,vz:0.6+R()*0.4,g:-0.3,life:1.4+R(),col:PAL_SMOKE[(R()*2)|0],s:0.1+R()*0.08});}
const GENSPR=[0,1].map(f=>makeSprite(24,26,P=>{
  P(1,22,'#3a3e45',22,3);P(1,22,'#5a606a',22,1);P(2,25,'#1a1c20',3,1);P(19,25,'#1a1c20',3,1);
  P(2,8,'#c8a22a',20,14);P(18,8,'#8a6a18',4,14);P(2,8,'#f0d060',20,1);P(2,8,'#e8c040',1,14);
  for(let i=0;i<5;i++)P(3+i*4,18,'#1a1a1e',2,3);P(2,17,'#5a4a10',20,1);
  for(let y=10;y<16;y+=2)P(4,y,'#6a5214',8,1);
  P(13,10,'#2a2e33',6,6);P(13,10,'#4a4f57',6,1);P(14,12,f?'#9be05a':'#2e5a1a',2,2);P(17,12,f?'#2e5a1a':'#ffc93a',1,2);P(14,15,'#8a909a',4,1);
  P(4,2,'#5a606a',3,6);P(4,2,'#8a909a',1,6);P(3,1,'#3a3e45',5,2);
  P(15,5,'#3a3e45',5,3);P(16,4,f?'#ff4a3a':'#6a1a1a',3,2);if(f)P(16,4,'#ffb0a0',1,1);
  P(20,12,'#3a3e45',2,6);},OUT));

/* ================= misi harian ================= */
const MISI_POOL=[
  {k:'kills',t:'Bunuh {n} zombi',n:[120,200,300],x:[120,180,250]},
  {k:'hs',t:'Headshot {n} kali',n:[30,50,80],x:[120,170,230]},
  {k:'w_kriss',t:'Bunuh {n} zombi pakai KRISS',n:[40,80],x:[150,220]},
  {k:'w_mg',t:'Bunuh {n} zombi pakai senapan mesin',n:[60,120],x:[140,200]},
  {k:'w_sg',t:'Bunuh {n} zombi pakai shotgun',n:[30,60],x:[140,200]},
  {k:'w_awp',t:'Bunuh {n} zombi pakai AWP',n:[15,30],x:[150,220]},
  {k:'w_parang',t:'Tebas {n} zombi pakai parang',n:[10,20],x:[160,230]},
  {k:'w_boom',t:'Ledakkan {n} zombi pakai roket atau granat',n:[20,40],x:[150,210]},
  {k:'w_fire',t:'Bakar {n} zombi pakai molotov',n:[10,20],x:[150,210]},
  {k:'maxwave',t:'Capai gelombang {n} dalam satu permainan',n:[6,8,10],x:[150,200,280],max:true},
  {k:'boss',t:'Kalahkan Raja Zombi {n} kali',n:[1,2],x:[200,320]},
  {k:'games',t:'Selesaikan {n} pertandingan',n:[3,5],x:[100,160]},
  {k:'defwin',t:'Menangkan mode Bertahan {n} kali',n:[1],x:[300]},
  {k:'revs',t:'Tolong teman atau bot {n} kali',n:[3,6],x:[150,220]},
  {k:'spec',t:'Bunuh {n} zombi spesial',n:[15,30],x:[140,200]},
  {k:'pvpwin',t:'Menang PvP {n} kali',n:[1,3],x:[150,300]},
];
function wibNow(){return new Date(Date.now()+7*3600e3);}
function dayKey(){const d=wibNow();return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();}
let MISI=null;
function misiWho(){return String(G.nick||'tamu').toLowerCase()+(accLogged()?'@':'');}
function misiLoad(){const day=dayKey(),who=misiWho();if(MISI&&MISI.day===day&&MISI.who===who)return MISI;let o=null;
  try{o=JSON.parse(localStorage.getItem('kotamati-misi-'+who)||'null');}catch(e){}
  if(!o||o.day!==day||!Array.isArray(o.list)){const r=rng(day*7+13),pool=MISI_POOL.slice(),list=[];
    while(list.length<3&&pool.length){const m=pool.splice((r()*pool.length)|0,1)[0],ti=(r()*m.n.length)|0;list.push({k:m.k,t:m.t.replace('{n}',m.n[ti]),n:m.n[ti],x:m.x[ti],max:!!m.max,done:false,cl:false});}
    o={day,who,list,prog:{}};}
  o.who=who;MISI=o;return o;}
function misiSave(){try{localStorage.setItem('kotamati-misi-'+MISI.who,JSON.stringify(MISI));}catch(e){}}
function misiAdd(k,n,isMax){const o=misiLoad();if(!o.list.some(m=>m.k===k&&!m.done))return;
  o.prog[k]=isMax?Math.max(o.prog[k]||0,n):(o.prog[k]||0)+n;
  for(const m of o.list){if(m.k!==k||m.done||(o.prog[k]||0)<m.n)continue;m.done=true;if(G.state==='play'){banner('MISI SELESAI!','combo',2);banner('+'+m.x+' EXP · KLAIM DI MENU MISI','sub',2.6);S.pick();}}
  misiSave();updateMisiBadge();}
function misiClaimable(){const o=misiLoad();return o.list.filter(m=>m.done&&!m.cl).length;}
function updateMisiBadge(){const b=document.getElementById('bMisi');if(!b)return;const n=misiClaimable();const t=n?'MISI ('+n+')':'MISI';if(b.textContent!==t)b.textContent=t;b.classList.toggle('go',n>0);}
function renderMisi(){const o=misiLoad(),ul=document.getElementById('misiList');ul.textContent='';
  o.list.forEach((m,i)=>{const li=document.createElement('li');li.className=m.cl?'cl done':m.done?'done':'';
    const a=document.createElement('div'),t=document.createElement('div'),pr=document.createElement('div');t.className='mt2';t.textContent=m.t;pr.className='mp';const v=Math.min(m.n,o.prog[m.k]||0);pr.textContent=v+' / '+m.n;a.append(t,pr);
    const r=document.createElement('div');r.className='mx';
    if(m.done&&!m.cl){const b=document.createElement('button');b.type='button';b.className='btn sm go';b.textContent='KLAIM +'+m.x+' EXP';b.addEventListener('click',()=>misiClaim(i));r.append(b);}
    else r.textContent=m.cl?'SELESAI ✓':'+'+m.x+' EXP';
    const bar=document.createElement('div');bar.className='mbar';const fi=document.createElement('i');fi.style.width=Math.round(v/m.n*100)+'%';bar.append(fi);
    li.append(a,r,bar);ul.append(li);});
  const d=wibNow(),left=86400-(d.getUTCHours()*3600+d.getUTCMinutes()*60+d.getUTCSeconds());
  document.getElementById('misiMsg').textContent='Misi baru setiap hari jam 00:00 WIB (dalam '+Math.floor(left/3600)+' jam '+Math.floor(left%3600/60)+' menit). '+(accLogged()?'EXP masuk ke akunmu.':'Kamu main sebagai tamu, EXP tersimpan di browser ini.');}
function misiClaim(i){const o=misiLoad(),m=o.list[i];if(!m||!m.done||m.cl)return;m.cl=true;misiSave();S.pick();renderMisi();updateMisiBadge();
  if(window.KMA&&KMA.addBonus)KMA.addBonus(m.x).then(r=>{updateCard();if(r&&r.up){S.oneup();document.getElementById('misiMsg').textContent='NAIK PANGKAT! Sekarang '+r.after.name+'.';}}).catch(()=>{});}
function openMisi(){renderMisi();showView(document.getElementById('vMisi'));}

/* ================= pangkat untuk skin ================= */
const SKIN_LV=[1,1,1,1,2,3,4,5,6,7,8,10,12,15];
function skinLv(i){return SKIN_LV[i]||1;}
function skinLocked(i){return accRank().lv<skinLv(i);}
function enforceSkin(){if(skinLocked(G.skin)){applySkin(0);try{localStorage.setItem('kotamati-skin','0');}catch(e){}}}

/* ================= link undangan, versi baru, PWA ================= */
let PENDING_JOIN=null;
try{const q=new URLSearchParams(location.search).get('room');const m=q&&/^(coop|pvp)-([a-z0-9]{1,12})$/i.exec(q);if(m)PENDING_JOIN={m:m[1].toLowerCase(),c:m[2].toLowerCase()};}catch(e){}
function tryPendingJoin(){if(!PENDING_JOIN||!roomReady||!roomNS||NET.joining||NET.r||G.state!=='title'||!gate.hidden||!G.nick)return;
  const j=PENDING_JOIN;PENDING_JOIN=null;try{history.replaceState(null,'',location.pathname);}catch(e){}joinRoom(j.m,j.c);}
function shareLink(){return location.href.split('#')[0].split('?')[0]+'?room='+NET.mode+'-'+NET.code;}
async function doShare(){const url=shareLink(),txt0='Ayo main Kota Mati bareng! '+(NET.mode==='coop'?'Co-op':'PvP')+' · room '+NET.code.toUpperCase();
  try{if(navigator.share){await navigator.share({title:'Kota Mati',text:txt0,url});return;}}catch(e){if(e&&e.name==='AbortError')return;}
  let ok=false;try{await navigator.clipboard.writeText(txt0+'\n'+url);ok=true;}catch(e){}
  lMsg.textContent=ok?'Link disalin! Tempel di WhatsApp atau Discord: '+url:'Salin link ini ke temanmu: '+url;}
G.updAvail=false;
function verCheck(){if(!window.KM_VER||!window.KM_VERURL)return;fetch(KM_VERURL+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{if(j&&j.v&&String(j.v)!==String(KM_VER))G.updAvail=true;}).catch(()=>{});}
if(window.KM_VER){setTimeout(verCheck,4000);setInterval(verCheck,120000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)verCheck();});}
document.getElementById('upd').addEventListener('click',()=>{try{location.reload();}catch(e){}});
let INSTALL=null;
if(window.KM_PWA&&'serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){addEventListener('load',()=>{navigator.serviceWorker.register(KM_PWA.sw,{scope:KM_PWA.scope}).catch(()=>{});});}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();INSTALL=e;document.getElementById('bInstall').hidden=false;});
addEventListener('appinstalled',()=>{INSTALL=null;document.getElementById('bInstall').hidden=true;});
document.getElementById('bInstall').addEventListener('click',async()=>{if(!INSTALL)return;try{INSTALL.prompt();await INSTALL.userChoice;}catch(e){}INSTALL=null;document.getElementById('bInstall').hidden=true;});

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
  if(PENDING_JOIN)tryPendingJoin();
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
  if(G.state==='play'){botTick(dt);genTick(dt);}
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
  shells.push({x:pl.dualSide&&WSPR.krissD.ejL?WSPR.krissD.ejL[0]-WSPR.krissD.ej[0]:0,y:0,vx:pl.dualSide?-40-R()*30:40+R()*30,vy:-60-R()*40,t:0,rot:R()<0.5});pl.rec=Math.min(36,pl.rec+0.45);
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
  else if(t==='kl'){if(e[2]===NET.me){const kz=zById(num(e[4],-1));localKill(clamp(num(e[3])|0,0,6000),kz&&kz.ls||pl.wpn,kz&&kz.type);}}
  else if(t==='gr'){if(NET.host&&GEN.on&&!GEN.dead)GEN.hp=Math.min(GEN.max,GEN.hp+clamp(num(e[2]),0,300));}
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
    {const dm=h.dm===1;if(dm!==NET.def){NET.def=dm;if(G.state==='lobby')renderLobby();}}
    if(Array.isArray(h.gn)&&GEN.on&&(G.state==='play'||G.state==='over')){GEN.max=Math.max(1,num(h.gn[1],1000));GEN.hp=clamp(num(h.gn[0]),0,GEN.max);const rs=num(h.gn[2])|0;if(rs&&!G.defRes)G.defRes=rs===1?'win':'lose';if(GEN.hp<=0&&!GEN.dead)genDestroyed(false);}
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
    if(!z){if(st===2)continue;z=makeZ(type,x,y);NET.zid--;z.id=id;z.fr=zFr(type,id);z.remote=true;announce(type);z.rise=st===3?0.7:0;z.mir=e[6]===1;zs.push(z);if(st===3)burst(x,y,0.02,10,PAL_DUST,1.4,0,0,true);}
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
    gp:null,mid:null,wv:null,z:null,pk:null,pr:null,ac:null,tl:null,ct:null,fp:null,ff:null,bh:null,dm:null,gn:null};
  if(NET.host){o.gp=NET.mode==='pvp'&&G.state==='play'?NET.pv.ph:NET.gp;o.mid=NET.mid;o.dm=NET.def?1:0;if(GEN.on)o.gn=[Math.round(GEN.hp),GEN.max,G.defRes==='win'?1:G.defRes==='lose'?2:0];
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
function showView(v){for(const x of[vMain,vRooms,vShow,vLobby,vSet,document.getElementById('vAcc'),document.getElementById('vLb'),document.getElementById('vMisi')])x.hidden=x!==v;showMenu(true);}
function showMain(){if(G.state==='showroom')G.state='title';showView(vMain);updateNetNote();updateCard();updateMisiBadge();}
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
  if(skinLv(i)>1){const lv=document.createElement('span');lv.className='slv';lv.textContent='LV '+skinLv(i);b.append(lv);}
  b.addEventListener('click',()=>{G.showSkin=i;markSkins();});skinsEl.append(b);});
function markSkins(){[...skinsEl.children].forEach((b,j)=>{b.setAttribute('aria-pressed',j===G.showSkin?'true':'false');b.classList.toggle('lock',skinLocked(j));});
  const e=document.getElementById('sErr');if(e){if(skinLocked(G.showSkin)){const lv=skinLv(G.showSkin);e.textContent='Skin '+SKINS[G.showSkin].name+' terbuka di pangkat LV '+lv+' · '+(window.KMA?KMA.RANKS[lv-1][0]:'')+'.';}else e.textContent='';}}
function openShowroom(){G.showSkin=G.skin;sNick.value=G.nick;sNick.disabled=accLogged();sNick.title=accLogged()?'Nama akun tidak bisa diganti':'';document.getElementById('sErr').textContent='';markSkins();G.state='showroom';showView(vShow);}
document.getElementById('bShow').addEventListener('click',openShowroom);
document.getElementById('bBackShow').addEventListener('click',()=>{G.state='title';showMain();});
document.getElementById('bSaveShow').addEventListener('click',()=>{const n=cleanNick(sNick.value);if(String(sNick.value).replace(/[^A-Za-z0-9]/g,'').length<2){document.getElementById('sErr').textContent='Nama minimal 2 huruf atau angka.';return;}
  if(skinLocked(G.showSkin)){markSkins();return;}
  if(!accLogged()){G.nick=n;if(window.KMA)KMA.setGuestNick(n);}applySkin(G.showSkin);try{if(!accLogged())localStorage.setItem('kotamati-nick',n);localStorage.setItem('kotamati-skin',String(G.skin));}catch(e){}G.state='title';showMain();});
document.getElementById('bCreate').addEventListener('click',()=>{initAudio();joinRoom(roomsMode,randCode());});
document.getElementById('bJoinCode').addEventListener('click',()=>{initAudio();joinRoom(roomsMode,fRoom.value);});
document.getElementById('bBackRooms').addEventListener('click',showMain);
fRoom.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();initAudio();joinRoom(roomsMode,fRoom.value);}});
let lobbyT=0;function renderLobbyThrottled(dt){lobbyT-=dt;if(lobbyT<=0){lobbyT=0.3;renderLobby();}}
function renderLobby(){
  lTitle.textContent=NET.mode==='coop'?'CO-OP · LAWAN ZOMBI':'PVP 1 LAWAN 1 · 5 MENIT';lCode.textContent=NET.code.toUpperCase();lMap.textContent=MAP.name;bMap.hidden=!NET.host;
  document.getElementById('lNight').textContent=G.night?'NYALA':'MATI';document.getElementById('bNightL').hidden=!NET.host;
  document.getElementById('lDefRow').hidden=NET.mode!=='coop';document.getElementById('lDef').textContent=NET.def?'BERTAHAN (JAGA GENERATOR)':'GELOMBANG';document.getElementById('bDefL').hidden=!NET.host;
  document.getElementById('bShare').hidden=!(roomNS&&roomNS.peerjs);
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
const MCOL={'#':'#9c4a35',S:'#b59a62',C:'#b5533a',P:'#8e8682',W:'#7e7288',X:'#8a5a2e',G:'#76727c',T:'#d8b02a',R:'#3e6a26',B:'#24401a',H:'#6a5474',D:'#6a4a2e',K:'#4a443e',Q:'#4fd8e8',U:'#9a8e80',V:'#6e6862',N:'#5e6e3e',A:'#6e7c3a',L:'#4a2e1c',J:'#7a4a2a'};
MAPS.forEach((M,i)=>{const b=document.createElement('button');b.type='button';b.className='mapb';b.setAttribute('aria-pressed','false');
  const c=document.createElement('canvas');c.width=24;c.height=24;const g=c.getContext('2d');g.fillStyle=M.fog;g.fillRect(0,0,24,24);
  for(let y=0;y<24;y++)for(let x=0;x<24;x++){const ch=M.rows[y][x];if(ch!=='.'){g.fillStyle=MCOL[ch]||'#888';g.fillRect(x,y,1,1);}}
  g.fillStyle='#9be05a';g.fillRect(M.start[0]|0,M.start[1]|0,1,1);
  const t=document.createElement('span');t.textContent=M.name;b.append(c,t);if(M.tag){const tg=document.createElement('small');tg.className='mtag';tg.textContent=M.tag;b.append(tg);}b.addEventListener('click',()=>selectMap(i));mapsEl.append(b);});
function selectMap(i){loadMap(i);[...mapsEl.children].forEach((b,j)=>b.setAttribute('aria-pressed',j===G.mapIdx?'true':'false'));
  if(G.state==='title'||G.state==='lobby')setupAttract();if(G.state==='lobby')renderLobby();}
bMap.addEventListener('click',()=>{if(NET.host&&G.state==='lobby'){selectMap((G.mapIdx+1)%MAPS.length);sendPresence();}});
document.getElementById('mSolo').addEventListener('click',()=>{initAudio();startSolo(false);});
document.getElementById('mDef').addEventListener('click',()=>{initAudio();startSolo(true);});
function syncBotsBtn(){document.getElementById('bBots').textContent='TEMAN BOT: '+BOTPREF;}syncBotsBtn();
document.getElementById('bBots').addEventListener('click',e=>{BOTPREF=(BOTPREF+1)%3;try{localStorage.setItem('kotamati-bots',String(BOTPREF));}catch(_){}syncBotsBtn();});
document.getElementById('bMisi').addEventListener('click',openMisi);
document.getElementById('misiBack').addEventListener('click',showMain);
document.getElementById('bShare').addEventListener('click',doShare);
document.getElementById('bDefL').addEventListener('click',()=>{if(NET.host&&G.state==='lobby'){NET.def=!NET.def;renderLobby();sendPresence();}});
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
function hudK(){const v=SET.hud>=0?SET.hud:(isTouch?0:1);return[1,1.5,2][v]||1;}
function applyHS(){const k=hudK(),w=Math.round(W*k),h=Math.round(H*k);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;ctx.imageSmoothingEnabled=false;}HS=cv.width/W;}
function setRes(w){w=Math.max(320,Math.min(480,Math.round(w/2)*2));if(w===W)return;W=w;HW=W>>1;PLANE=W/(2*H);
  applyHS();ctx.imageSmoothingEnabled=false;world.width=W;world.height=H;img=wctx.createImageData(W,H);buf=new Uint32Array(img.data.buffer);zbuf=new Float32Array(W);
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
  const dead=G.state==='play'&&!pl.alive;setCam(pl.x,pl.y,pl.a,dead?-40:pl.pitch+pl.rec,dead?0.18:eyeZ());
  if(r3Want()&&!R3.ready)r3Load();R3.on=r3Want()&&R3.ready;if(R3.on){try{r3Begin();}catch(e){R3.on=false;R3.failed=true;R3.err='Grafik 3D error: '+(e&&e.message||e);renderWorld();}}else renderWorld();
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
  if(G.state==='play'||G.state==='over')for(const b of BOTS.values()){if(!b.al&&b.deadT>9)continue;list.push({d:d2(b.x,b.y),k:5,o:b});}
  if(GEN.on&&!GEN.dead&&(G.state==='play'||G.state==='over'))list.push({d:d2(GEN.x,GEN.y),k:9,o:GEN});
  list.sort((a,b)=>b.d-a.d);
  for(const it of list){const o=it.o;
    if(it.k===0){if(R3.on&&!o.dead&&!(o.rise>0))r3Shadow(o.x,o.y,Math.max(0.2,o.r*1.25));
      if(R3.on&&R3.vox){if(o.dead&&o.dieT>7&&((o.dieT*10)|0)%2)continue;if(!o.dead&&o.act===5&&pl.st&&pl.st.zid===o.id)continue;
        zRig(o,o.rise>0?-0.8*o.scale*(o.rise/0.7):(o.dead?0:(o.zh||0)));if(!o.dead&&(o.act===4||o.act===9))drawTongue(o);continue;}
      let s;const vw=viewOf(o.x,o.y,o.fa||0),F=vw===0?o.fr:vw===2?o.fr.back:o.fr.side,mr=vw===1?false:vw===3?true:o.mir;
      if(o.dead){if(o.dieT>7&&((o.dieT*10)|0)%2)continue;s=F.die[Math.min(5,(o.dieT/0.09)|0)];}
      else if(o.act===1||o.act===6)s=F.low;
      else if(o.act===10||o.act===11)s=F.atk[0];else if(o.state==='attack'||o.act===2||o.act===3)s=F.atk[((G.t*(F.atk.length>2?10:5))|0)%F.atk.length];else s=F.walk[((o.anim*F.walk.length/4)|0)%F.walk.length];
      if(!o.dead&&o.act===5&&pl.st&&pl.st.zid===o.id)continue;
      const wz=o.rise>0?-0.8*o.scale*(o.rise/0.7):(o.dead?0:(o.zh||0));drawSpr(s,o.x,o.y,wz,0.8*o.scale*s.h/48,o.flash>0&&!o.dead,mr,o.rise>0);
      if(!o.dead&&(o.act===4||o.act===9))drawTongue(o);}
    else if(it.k===7)drawPool(o.x,o.y,o.t,o.id);
    else if(it.k===1){const bz=0.02+Math.abs(Math.sin(G.t*3+(o.ph||o.id||0)))*0.07,C=CRATE[o.kind];if(R3.on&&R3.vox){r3Shadow(o.x,o.y,0.16);r3Vox(C,C,C,o.x,o.y,bz,0.3,G.t*1.3+(o.ph||o.id||0),false,false);}else drawSpr(C,o.x,o.y,bz,0.3,false,false,false);}
    else if(it.k===2){if(o.k==='nade')drawSpr(NADE,o.x,o.y,o.z-0.06,0.13);else if(o.k==='rocket')drawSpr(ROCKET,o.x,o.y,o.z-0.08,0.17);else drawSpr(SPIT,o.x,o.y,o.z-0.07,0.16);}
    else if(it.k===3)drawSpr(EXPL[Math.min(7,(o.t/o.dur*8)|0)],o.x,o.y,-0.12,o.size);
    else if(it.k===4){if(o.k==='g')drawSpr(o.spr,o.x,o.y,o.z,0.1);else drawBlob(o.x,o.y,o.z,o.s,o.col);}
    else if(it.k===5){if(R3.on&&o.al)r3Shadow(o.x,o.y,0.26);drawRemote(o);}
    else if(it.k===6){const rk=o[3]===1;drawSpr(rk?ROCK:SPIT,num(o[0])/100,num(o[1])/100,num(o[2])/100-(rk?0.15:0.07),rk?0.3:0.16);}
    else if(it.k===8)drawFire(o);
    else if(it.k===9){if(R3.on)r3Shadow(o.x,o.y,0.5);}if(it.k===9){const gs=GENSPR[((G.t*2)|0)%2];if(R3.on&&R3.vox)r3Vox(gs,gs,gs,o.x,o.y,0,0.62,0.5,o.hitT>0,false);else drawSpr(gs,o.x,o.y,0,0.62,o.hitT>0,false,false);}}
  if(R3.on){try{r3End();}catch(e){R3.on=false;R3.failed=true;R3.err='Grafik 3D error: '+(e&&e.message||e);}}else wctx.putImageData(img,0,0);
  if(cv.width!==Math.round(W*hudK()))applyHS();ctx.setTransform(HS,0,0,HS,0,0);
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  let sx=0,sy=0;if(G.shake>0&&!reduceMotion){sx=Math.round((R()-0.5)*G.shake*14);sy=Math.round((R()-0.5)*G.shake*10);}
  ctx.drawImage(R3.on?R3.cv:world,sx,sy);ctx.drawImage(VIG_D,0,0);
  rainAmb(!!MAP.rain&&!muted);
  if(MAP.rain)drawRain();
  if(isDark())drawNight();
  if(MAP.rain)drawLightning();
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
  ctx.setTransform(1,0,0,1,0,0);const sw=[W,HW,H,HH];W=cv.width;HW=W>>1;H=cv.height;HH=H>>1;
  try{drawHUD();if(G.state!=='over')drawBanners();
  if(G.state==='play'&&(G.paused||G.needClick)&&!G.hudEdit)drawPause();
  if(G.state==='over')drawOver();}finally{[W,HW,H,HH]=sw;}
}
const TONGUE=['#d86a8a','#a84a6a'].map(hex);
let NIGHT=null,nctx=null;
function drawNight(){if(G.state==='showroom')return;if(!NIGHT||NIGHT.width!==W){NIGHT=document.createElement('canvas');NIGHT.width=W;NIGHT.height=H;nctx=NIGHT.getContext('2d');}
  const g=nctx,menuish=G.state!=='play'&&G.state!=='over';g.globalCompositeOperation='source-over';g.clearRect(0,0,W,H);g.fillStyle=menuish?'rgba(4,3,12,0.55)':MAP.dark?'rgba(2,1,3,0.985)':'rgba(3,2,9,0.95)';g.fillRect(0,0,W,H);
  g.globalCompositeOperation='destination-out';
  const hole=(x,y,r,a)=>{if(!(r>=2)||a<=0)return;a=Math.min(1,a);const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(0,0,0,'+a+')');gr.addColorStop(0.5,'rgba(0,0,0,'+(a*0.82)+')');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);};
  if(!menuish){const ca=cursorAim(),fx=ca?G.mx:HW,fy=ca?G.my:HH;
    if(pl.alive&&!pl.spectator){if(MAP.dark){const fl=0.96+0.04*Math.sin(G.t*23)*Math.sin(G.t*7);hole(fx,fy,H*0.62*fl,0.4);hole(fx,fy,H*0.42*fl,1);hole(fx,fy,H*0.2,1);hole(HW,H+30,H*0.3,0.3);}else{hole(fx,fy,H*0.52,1);hole(fx,fy,H*0.24,1);hole(HW,H+30,H*0.5,0.45);}}else hole(HW,HH,H*0.8,0.6);
    if(pl.muzzle>0)hole(HW,HH,W*0.7,0.6);
    const lit=(x,y,z,rad,a)=>{const p=proj(x,y,z);if(!p)return;const col=Math.round(p.x);if(col>=0&&col<W&&p.d>zbuf[col]+0.4)a*=0.3;hole(p.x,p.y,Math.min(W*0.6,Math.max(6,rad*p.unit)),a);};
    for(const f of fires)lit(f.x,f.y,0.3,1.9,0.8+0.12*Math.sin(G.t*13+f.seed));
    for(const b of booms)lit(b.x,b.y,0.3,b.size*2,0.9*(1-b.t/b.dur));
    for(const r of NET.remotes.values()){if(!r.al||(NET.mode==='pvp'&&!r.fighter))continue;lit(r.x+Math.cos(r.a)*1.3,r.y+Math.sin(r.a)*1.3,0.2,1.3,0.5);if(r.flashT>0)lit(r.x,r.y,0.5,3,0.8);}
    for(const p of projs)if(p.k==='rocket'||p.k==='molo')lit(p.x,p.y,p.z,p.k==='rocket'?1.2:0.5,0.8);}
  else hole(HW,HH*0.9,W*0.7,0.5);
  ctx.drawImage(NIGHT,0,0);
  if(MAP.dark&&!menuish&&pl.alive&&!pl.spectator){const ca=cursorAim(),fx=ca?G.mx:HW,fy=ca?G.my:HH,gr=ctx.createRadialGradient(fx,fy,0,fx,fy,H*0.45);gr.addColorStop(0,'rgba(255,226,160,0.13)');gr.addColorStop(1,'rgba(255,226,160,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);}}
/* hujan & petir (peta barak) */
const RAIN={d:[],t:0,lt:-9,next:0,src:null};
function rainAmb(on){if(!AC)return;if(on&&!RAIN.src){try{const s=AC.createBufferSource();s.buffer=NB;s.loop=true;const hp=AC.createBiquadFilter();hp.type='highpass';hp.frequency.value=600;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4200;
    const g=AC.createGain();g.gain.value=0.075;s.connect(hp).connect(lp).connect(g).connect(master);s.start();RAIN.src=s;}catch(e){}}else if(!on&&RAIN.src){try{RAIN.src.stop();}catch(e){}RAIN.src=null;}}
function drawRain(){const now=performance.now()/1000,dt=Math.min(0.05,Math.max(0,now-(RAIN.t||now)));RAIN.t=now;
  if(!RAIN.d.length)for(let i=0;i<170;i++)RAIN.d.push({x:Math.random()*W,y:Math.random()*H,v:240+Math.random()*170,l:5+Math.random()*8});
  ctx.strokeStyle='rgba(170,190,228,0.36)';ctx.lineWidth=1;ctx.beginPath();
  for(const d of RAIN.d){d.y+=d.v*dt;d.x-=d.v*dt*0.17;if(d.y>H+8){d.y=-8-Math.random()*20;d.x=Math.random()*(W+40);}if(d.x<-10)d.x+=W+30;ctx.moveTo(d.x,d.y);ctx.lineTo(d.x+d.l*0.17,d.y-d.l);}
  ctx.stroke();const y0=Math.max(0,horizon);if(y0<H){ctx.fillStyle='rgba(190,206,236,0.5)';for(let i=0;i<14;i++){const y=y0+Math.random()*(H-y0);ctx.fillRect(Math.random()*W,y,1+((y-y0)/(H-y0+1)*3|0),1);}}}
function drawLightning(){const t=G.t;if(!RAIN.next||RAIN.next-t>40)RAIN.next=t+4+Math.random()*6;
  if(t>RAIN.next){RAIN.lt=t;RAIN.next=t+8+Math.random()*12;S.thunder(0.3+Math.random()*1.3);}
  const e=t-RAIN.lt;let a=0;if(e<0)a=0;else if(e<0.07)a=0.55;else if(e<0.14)a=0.07;else if(e<0.22)a=0.4;else if(e<0.7)a=0.4*(1-(e-0.22)/0.48);
  if(a>0&&!reduceMotion){ctx.fillStyle='rgba(215,225,255,'+a.toFixed(3)+')';ctx.fillRect(0,0,W,H);}}
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
function drawRemote(r){const set=getSold(r.sk||0,colorOf(r.peer),r.w|0);let s;const vw=viewOf(r.x,r.y,r.a||0),front=vw!==2,sd=vw===1||vw===3;
  if(!r.al)s=(sd?set.dieS:set.die)[Math.min(5,(r.deadT/0.09)|0)];
  else{if(r.sp&&((G.t*12)|0)%2)return;s=r.dn?(sd?set.downS:set.downF):r.cr?(sd?set.crouchS:set.crouch[front?0:1]):(vw===0?set.front:vw===2?set.back:set.side)[((r.anim|0)%2)];
    if(r.flashT>0&&front)drawSpr(FLASH,r.x+Math.cos(r.a)*0.28,r.y+Math.sin(r.a)*0.28,(r.jz||0)+(r.cr?0.16:0.3),0.2);}
  const wz=r.al?(r.jz||0):0;if(R3.on&&R3.vox)soldRig(r,wz);else drawSpr(s,r.x,r.y,wz,0.8,r.hitT>0,vw===3,false);
  if(r.al){const p=proj(r.x,r.y,wz+(r.dn?0.45:r.cr?0.62:0.8));if(p&&p.d<14&&p.x>=0&&p.x<W&&p.d<zbuf[Math.max(0,Math.min(W-1,Math.round(p.x)))])G.tags.push({x:p.x,y:p.y,d:p.d,r});}}
function drawTag(t){const r=t.r,col=TEAMS[colorOf(r.peer)][0];txt(r.nick,Math.round(t.x),Math.round(t.y)-12,col,'center');if(window.KMA&&r.lv)KMA.drawRank(ctx,r.lv,Math.round(t.x-r.nick.length*4-15),Math.round(t.y)-13,1);
  if(r.dn){if(((G.t*3)|0)%2===0)txt('TOLONG!',Math.round(t.x),Math.round(t.y)-24,'#ff4a3a','center');let pr=G.revTarget===r.peer?G.revT/3:0;for(const o of NET.remotes.values())if(o.rv===r.peer)pr=Math.max(pr,o.rvp/100);for(const o of BOTS.values())if(o.rv===r.peer)pr=Math.max(pr,o.rvp/100);
    if(pr>0){const w=30,x=Math.round(t.x-w/2),y=Math.round(t.y)+2;ctx.fillStyle=OUT;ctx.fillRect(x-1,y-1,w+2,5);ctx.fillStyle='#7fdc4a';ctx.fillRect(x,y,Math.round(w*pr),3);}}
  {const st=G.stk.get(r.peer);if(st)drawBubble(t.x,t.y-16,st.i,st.t,clamp(Math.round(48/Math.max(0.5,t.d)),14,26));}
  if(NET.mode==='coop'||r.bot){const w=20,x=Math.round(t.x-w/2),y=Math.round(t.y)-3;ctx.fillStyle=OUT;ctx.fillRect(x-1,y-1,w+2,4);ctx.fillStyle=r.hp>50?'#7fdc4a':r.hp>25?'#ffc93a':'#ff3a2a';ctx.fillRect(x,y,Math.round(w*r.hp/100),2);}}
function drawWeapon(){const dualV=pl.wpn==='kriss'&&pl.dualOn,s=dualV?WSPR.krissD:WSPR[pl.wpn],bob=Math.sin(pl.bobT)*3*pl.bobAmt,bx=Math.cos(pl.bobT*0.5)*4*pl.bobAmt,sw=G.swapT>0?(G.swapT/0.25)*44:0;
  let rl=0,rx=0;if(pl.reload>0){const p=1-pl.reload/pl.reloadMax,c=Math.sin(Math.min(1,p)*Math.PI);rl=c*34;rx=c*14;}
  const x=Math.round(HW-FPW.CX+bx+pl.sway+rx+(cursorAim()?(G.mx-HW)*0.12:0)),y=Math.round(H-FPW.H+FPW.OY+Math.abs(bob)+pl.kick*7+sw+rl-pl.vz*2.5+pl.cr*8+(pl.down?26+Math.sin(G.t*3)*3:0));
  if(pl.swingT>0||pl.wpn==='parang'){const sv=pl.swingT>0,p=sv?1-pl.swingT/0.32:0,ang=sv?(p<0.25?0.55*p/0.25:0.55-2.1*((p-0.25)/0.75)):0,ox=sv?(p<0.25?18*p/0.25:18-96*((p-0.25)/0.75)):0,oy=sv?-12*Math.sin(p*Math.PI):0;
    if(sv&&pl.swingQ&&pl.wpn!=='parang')ctx.drawImage(s.cv,x,y+46);
    const PG=WSPR.parang;ctx.save();ctx.translate(x+FPW.CX+96+ox,y+FPW.H-FPW.OY+12+oy);ctx.rotate(ang);ctx.scale(0.85,0.85);ctx.drawImage(PG.cv,-PG.pv[0],-PG.pv[1]);ctx.restore();
    if(sv&&p>0.22&&p<0.7){ctx.strokeStyle='rgba(255,246,224,'+(0.5-Math.abs(p-0.45))+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(HW+24,H+16,118,-2.5,-0.85);ctx.stroke();}
    return;}
  if(pl.muzzle>0&&(dualV?s.mzL:s.mz)){const m=dualV?(pl.dualSide?s.mzL:s.mzR):s.mz,k=pl.wpn==='sg'||pl.wpn==='rl'?1.5:1;ctx.drawImage(FLASH.cv,Math.round(x+m[0]-16*k),Math.round(y+m[1]-18*k),Math.round(32*k),Math.round(32*k));}
  ctx.drawImage(s.cv,x,y);
  for(const sh of shells){ctx.fillStyle=OUT;const ej=s.ej||[62,30],px=Math.round(x+ej[0]+sh.x),py=Math.round(y+ej[1]+sh.y);ctx.fillRect(px-1,py-1,sh.rot?5:4,sh.rot?4:5);ctx.fillStyle='#e8c25a';ctx.fillRect(px,py,sh.rot?3:2,sh.rot?2:3);}}
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
  if(NET.mode!=='pvp')for(const z of zs){if(z.dead||z.idle)continue;if(isDark()&&Math.hypot(z.x-pl.x,z.y-pl.y)>7)continue;const s=z.type==='boss'?4.6:z.type==='brute'||z.type==='witch'?3.4:2.4;ctx.fillStyle=ZCOL[z.type]||'#ff4a3a';ctx.fillRect(z.x*sc-s/2,z.y*sc-s/2,s,s);}
  if(NET.mode==='coop')for(const r of NET.remotes.values()){if(!r.al)continue;ctx.fillStyle=TEAMS[colorOf(r.peer)][0];ctx.fillRect(r.x*sc-1.5,r.y*sc-1.5,3,3);}
  for(const b of BOTS.values()){if(!b.al)continue;ctx.fillStyle=TEAMS[colorOf(b.peer)][0];ctx.fillRect(b.x*sc-1.5,b.y*sc-1.5,3,3);}
  if(GEN.on&&!GEN.dead){ctx.fillStyle=GEN.hitT>0||((G.t*3)|0)%2?'#4fd8e0':'#1e6a70';ctx.fillRect(GEN.x*sc-2.5,GEN.y*sc-2.5,5,5);}
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
    else{txt('GELOMBANG '+G.wave+(GEN.on?'/'+DEF_WAVES:''),HW,6,'#fff6e0','center');txt('SISA '+G.remain,HW,16,'#9be05a','center');}
    if(GEN.on&&G.state==='play'){const f=clamp(GEN.hp/GEN.max,0,1),bw=Math.min(110,W-210),gx=Math.round(HW-bw/2),gy=27;ctx.fillStyle=OUT;ctx.fillRect(gx-1,gy,bw+2,6);ctx.fillStyle='#1e2a30';ctx.fillRect(gx,gy+1,bw,4);
      ctx.fillStyle=f>0.5?'#4fd8e0':f>0.25?'#ffc93a':(blink?'#ff3a2a':'#a81e16');ctx.fillRect(gx,gy+1,Math.round(bw*f),4);ctx.fillStyle='#c8f4f8';ctx.fillRect(gx,gy+1,Math.round(bw*f),1);txt('GENERATOR '+Math.ceil(f*100)+'%',HW,gy+8,GEN.hitT>0?'#ff8a7a':'#a8e8f0','center');}
    if(NET.mode==='coop'){let y=94;for(const r of NET.remotes.values()){ctx.fillStyle=OUT;ctx.fillRect(7,y-1,7,7);ctx.fillStyle=TEAMS[colorOf(r.peer)][0];ctx.fillRect(8,y,5,5);
      txt(r.nick,18,y-1,r.al?'#d8c9b6':'#7a6a72');if(!r.al)txt('TUMBANG',102,y-1,'#ff4a3a');else if(r.dn)txt('JATUH',102,y-1,((G.t*4)|0)%2?'#ff4a3a':'#ffb23e');y+=11;}}
    if(NET.mode==='coop')G.feedY=94+NET.remotes.size*11+4;
    if(NET.mode==='solo'&&BOTS.size){let y=94;for(const b of BOTS.values()){ctx.fillStyle=OUT;ctx.fillRect(7,y-1,7,7);ctx.fillStyle=TEAMS[colorOf(b.peer)][0];ctx.fillRect(8,y,5,5);
      txt(b.nick,18,y-1,b.al?'#d8c9b6':'#7a6a72');if(!b.al)txt('TUMBANG',92,y-1,'#ff4a3a');else if(b.dn)txt('JATUH',92,y-1,((G.t*4)|0)%2?'#ff4a3a':'#ffb23e');else{ctx.fillStyle=OUT;ctx.fillRect(91,y,26,4);ctx.fillStyle=b.hp>50?'#7fdc4a':b.hp>25?'#ffc93a':'#ff3a2a';ctx.fillRect(92,y+1,Math.round(24*clamp(b.hp/100,0,1)),2);}y+=11;}}
  }
  const bx=W-126;ctx.fillStyle=OUT;ctx.fillRect(bx,4,120,24);ctx.fillStyle='#2a1c30';ctx.fillRect(bx+1,5,62,22);ctx.fillRect(bx+65,5,54,22);
  txt('SENJATA',bx+4,7,'#ffb23e');txt('LEMPAR',bx+68,7,'#ffb23e');
  const w=pl.wpn,dual=w==='kriss'&&pl.dualOn,am=w==='parang'?'--':dual?'DUAL '+pl.dualMag:pl.mag[w]+'/'+(w==='pistol'?'--':pl.ammo[w]);txt(am,bx+32,17,dual?'#c8a2ff':(pl.mag[w]<=Math.ceil(MAG[w]/4)&&blink?'#ff4a3a':'#fff6e0'),'center');
  ctx.drawImage(NADE.cv,bx+68,16,7,8);txt(String(pl.nades),bx+77,17,pl.nades===0?'#7a6a72':'#fff6e0');ctx.drawImage(MOLO.cv,bx+94,15,6,9);txt(String(pl.molos),bx+102,17,pl.molos===0?'#7a6a72':'#fff6e0');
  txt(dual?'DUAL KRISS':w==='kriss'&&pl.dual>0?'KRISS · DUAL x'+pl.dual:WEAP[w].name,W-8,31,dual?'#c8a2ff':'#ffd27a','right');
  if(online()){drawFeed(G.feedY||94);const me=G.stk.get(NET.me);if(me)drawBubble(W-44,HH+6,me.i,me.t,26);}
  for(let i=0;i<G.pops.length;i++){const p=G.pops[i];txt(p.text,HW+26,HH-18-i*10-p.t*12,p.col);}
  if(G.state==='play'){const bi=bossInfo();if(bi){const bw=Math.min(200,W-170),bxx=Math.round(HW-bw/2),by=GEN.on?44:30;txt('RAJA ZOMBI',HW,by,bi[2].enr?(((G.t*4)|0)%2?'#ff4a3a':'#ffb23e'):'#ff8aa8','center');
      ctx.fillStyle=OUT;ctx.fillRect(bxx-1,by+10,bw+2,7);ctx.fillStyle='#3a2a32';ctx.fillRect(bxx,by+11,bw,5);ctx.fillStyle='#d8322a';ctx.fillRect(bxx,by+11,Math.round(bw*clamp(bi[0]/bi[1],0,1)),5);ctx.fillStyle='#ff8a7a';ctx.fillRect(bxx,by+11,Math.round(bw*clamp(bi[0]/bi[1],0,1)),1);}
    if(pl.down&&pl.alive){txt('SEKARAT',HW,HH+25,((G.t*3)|0)%2?'#ff4a3a':'#ffb08a','center');const bw=110,x=HW-55;ctx.fillStyle=OUT;ctx.fillRect(x-1,HH+35,bw+2,6);ctx.fillStyle='#a81e16';ctx.fillRect(x,HH+36,Math.round(bw*clamp(pl.hp/100,0,1)),4);
      const rv=myReviver();txt(rv?rv.nick+' MENOLONGMU '+rv.rvp+'%':BOTS.size?'TEMBAK PAKAI PISTOL · BOT AKAN MENOLONG':'TEMBAK PAKAI PISTOL · TUNGGU TEMAN',HW,HH+46,rv?'#7fdc4a':'#ffb08a','center');}
    else if(G.revNear){txt(G.revT>0?'MENOLONG '+G.revNear.nick+'…':(isTouch?'TAHAN TOMBOL TOLONG':'TAHAN E UNTUK MENOLONG ')+(G.revT>0?'':G.revNear.nick),HW,HH+30,'#7fdc4a','center');
      if(G.revT>0){const bw=80,x=HW-40;ctx.fillStyle=OUT;ctx.fillRect(x-1,HH+41,bw+2,6);ctx.fillStyle='#7fdc4a';ctx.fillRect(x,HH+42,Math.round(bw*G.revT/3),4);}}
    else if(GEN.near)txt(G.repairing?'MEMPERBAIKI GENERATOR… '+Math.ceil(GEN.hp/GEN.max*100)+'%':GEN.hp>=GEN.max?'GENERATOR UTUH':(isTouch?'TAHAN TOLONG = PERBAIKI':'TAHAN E UNTUK MEMPERBAIKI GENERATOR'),HW,HH+30,'#4fd8e0','center');
    else if(shopAvail()&&!G.shopOpen&&((G.t*2)|0)%2===0)txt(isTouch?'KETUK TOMBOL TOKO UNTUK BELANJA':'TEKAN B UNTUK BUKA TOKO',HW,HH+30,'#ffe14a','center');
    if(NET.mode==='pvp'&&NET.pv.ph==='count'&&!pl.spectator)big(String(Math.max(1,Math.ceil(NET.pv.ct))),32,'fire',HW,HH-10,1+(NET.pv.ct%1)*0.4);
    if(!pl.alive&&NET.mode==='pvp')big('BANGKIT DALAM '+Math.max(1,Math.ceil(pl.respawnT)),8,'bone',HW,HH+30);
    if(!pl.alive&&NET.mode==='coop')big('MENUNGGU GELOMBANG BERIKUTNYA',8,'bone',HW,HH+30);
    if(pl.spawnProt>0&&pl.alive&&!pl.down&&!GEN.near&&!G.revNear)txt('PERLINDUNGAN',HW,HH+28,'#7fb0ff','center');
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
  if(G.defRes==='win')big('EVAKUASI BERHASIL',16,'fire',HW,58,pp);else if(G.defRes==='lose')big('GENERATOR HANCUR',16,'blood',HW,58,pp);else big('GAME OVER',24,'blood',HW,58,pp);
  if(NET.mode==='coop'){txt(GEN.on?'MODE BERTAHAN · GELOMBANG '+G.wave+'/'+DEF_WAVES:'TIM BERTAHAN SAMPAI GELOMBANG '+G.wave,HW,84,'#9be05a','center');
    const rows=[[NET.nick,pl.score,NET.me,G.kills,G.hs,G.revs]].concat([...NET.remotes.values()].map(r=>[r.nick,r.sc,r.peer,(r.stt||[])[0]|0,(r.stt||[])[1]|0,(r.stt||[])[2]|0]));rows.sort((a,b)=>b[1]-a[1]);
    const mvp=rows.reduce((m,r)=>r[3]>m[3]?r:m,rows[0]);const cx=[HW-116,HW+10,HW+44,HW+86,HW+136];
    txt('NAMA',cx[0],98,'#a8939f');txt('KILL',cx[1],98,'#a8939f','right');txt('HS',cx[2],98,'#a8939f','right');txt('TOLONG',cx[3],98,'#a8939f','right');txt('SKOR',cx[4],98,'#a8939f','right');
    rows.slice(0,4).forEach((r,i)=>{const y=110+i*11;txt(r[0],cx[0],y,TEAMS[colorOf(r[2])][0]);txt(String(r[3]),cx[1],y,'#fff6e0','right');txt(String(r[4]),cx[2],y,'#fff6e0','right');txt(String(r[5]),cx[3],y,'#fff6e0','right');txt(String(r[1]),cx[4],y,'#fff6e0','right');});
    if(rows.length>1&&mvp[3]>0)txt('MVP: '+mvp[0]+' · '+mvp[3]+' KILL',HW,153,'#ffe14a','center');
    if(blinkOn)big(NET.host?(isTouch?'SENTUH UNTUK MAIN LAGI':'KLIK UNTUK MAIN LAGI'):'MENUNGGU HOST…',8,'bone',HW,166);return;}
  txt('SKOR   '+String(pl.score).padStart(8,'0'),HW,90,'#fff6e0','center');
  txt('GELOMBANG '+G.wave+(GEN.on?'/'+DEF_WAVES:'')+'   ZOMBI '+G.kills,HW,104,'#9be05a','center');
  txt('HEADSHOT '+G.hs+'   AKURASI '+(G.shots?Math.round(G.hits/G.shots*100):0)+'%',HW,118,'#d8c9b6','center');
  txt((pl.score>=G.best&&pl.score>0?'REKOR BARU! ':'REKOR ')+String(G.best).padStart(8,'0'),HW,132,'#ffb23e','center');
  if(blinkOn)big(isTouch?'SENTUH UNTUK MAIN LAGI':'KLIK UNTUK MAIN LAGI',8,'bone',HW,156);}

/* ================= input ================= */
function lockPointer(){if(isTouch)return;try{const p=cv.requestPointerLock&&cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
function onCanvasPrimary(){initAudio();
  if(G.state==='play'&&(G.paused||G.needClick)){G.paused=false;G.needClick=false;lockPointer();return true;}
  if(G.state==='over'&&G.overT>1.2){if(NET.mode==='solo')startSolo(G.lastDef);else if(NET.host)hostStart();return true;}
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
  if(G.shopOpen){if(/^Digit[0-9]$/.test(k)||k==='Minus'||k==='Equal'){const ch=k==='Minus'?'-':k==='Equal'?'=':k.slice(5);buyItem(SHOPKEY.indexOf(ch));e.preventDefault();return;}if(k==='KeyB'||k==='Escape'){openShop(false);e.preventDefault();return;}}
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
  sSfx.value=SET.sfx;document.getElementById('vSfx').textContent=SET.sfx;[...sQ.children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.q===SET.q)));
  {const hv=SET.hud>=0?SET.hud:(isTouch?0:1);[...document.getElementById('sHud').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.h===hv)));}
  {const b=document.getElementById('bG3D');b.textContent='GRAFIK 3D: '+(SET.g3d&&!R3.failed?'NYALA':'MATI');document.getElementById('g3dNote').textContent=R3.failed&&SET.g3d?(R3.err||'Grafik 3D tidak bisa dipakai di perangkat ini.'):'Dunia 3D bergaya piksel. Matikan kalau HP terasa berat.';}}
document.getElementById('bG3D').addEventListener('click',()=>{if(R3.failed&&SET.g3d){R3.failed=false;R3.err='';}else SET.g3d=SET.g3d?0:1;saveSet();if(SET.g3d)r3Load();syncSetUI();});
sSens.addEventListener('input',()=>{SET.sens=clamp(+sSens.value,0.3,2.5);syncSetUI();saveSet();});
sMus.addEventListener('input',()=>{SET.mus=clamp(+sMus.value|0,0,100);applyVolumes();syncSetUI();saveSet();});
sSfx.addEventListener('input',()=>{SET.sfx=clamp(+sSfx.value|0,0,100);applyVolumes();syncSetUI();saveSet();});
sSfx.addEventListener('change',()=>{initAudio();S.pick();});
[...sQ.children].forEach(b=>b.addEventListener('click',()=>{SET.q=clamp(+b.dataset.q|0,0,2);applyQuality();syncSetUI();saveSet();}));
[...document.getElementById('sHud').children].forEach(b=>b.addEventListener('click',()=>{SET.hud=clamp(+b.dataset.h|0,0,2);applyHS();syncSetUI();saveSet();}));
function openSettings(from){setFrom=from;syncSetUI();showView(vSet);}
document.getElementById('bSet').addEventListener('click',()=>openSettings('main'));
document.getElementById('bSetP').addEventListener('click',()=>{if(G.state==='play'){G.paused=true;openSettings('pause');}});
document.getElementById('bBackSet').addEventListener('click',()=>{if(setFrom==='pause'&&G.state==='play'){showMenu(false);}else showMain();});
const shopEl=document.getElementById('shop'),shopGrid=document.getElementById('shopGrid'),shopCash=document.getElementById('shopCash'),shopSkip=document.getElementById('shopSkip');
SHOP.forEach((it,i)=>{const b=document.createElement('button');b.type='button';b.className='shb';const n=document.createElement('i');n.textContent=SHOPKEY[i]||'';
  const t=document.createElement('b');t.textContent=it.n;t.style.fontWeight='400';const d=document.createElement('span');d.className='sd';const pr=document.createElement('span');pr.className='sp';
  b.append(n,t,d,pr);b.addEventListener('click',e=>{e.stopPropagation();buyItem(i);});shopGrid.append(b);});
document.getElementById('shopHint').textContent=isTouch?'Ketuk barang untuk membeli. Tiap barang ada batas beli per jeda.':'Tekan 1–9, 0, -, = atau klik barang. Tiap barang ada batas beli per jeda. Tekan B untuk menutup.';
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
    enforceSkin();updateCard();updateMisiBadge();if(!document.getElementById('vAcc').hidden)renderAcc();});
  KMA.ready.then(()=>{enforceSkin();const st=KMA.state();if(st.logged)G.nick=cleanNick(st.nick);else if(!G.nick&&st.nick)G.nick=cleanNick(st.nick);updateCard();if(!st.logged&&!G.nick)openGate(false);});}
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
      const v=document.createElement('span');v.className='lbv';v.textContent=(field==='exp'?r.exp:field==='best'?r.best:field==='week'?r.week:r.kills).toLocaleString('id-ID')+(field==='exp'||field==='week'?' EXP':field==='kills'?' KILL':'');
      li.append(n,c,nm,v);ol.append(li);});
    msg.textContent=(!res.online?'Papan peringkat online belum aktif. Yang tampil hanya datamu di HP ini.':res.rows.length?(res.rows.length+' pemain teratas. Hanya akun terdaftar yang masuk papan ini.'):(field==='week'?'Belum ada yang main minggu ini. Jadilah yang pertama!':'Belum ada pemain terdaftar.'))+(field==='week'?' EXP mingguan direset setiap Senin 00:00 WIB.':'');}
  catch(err){if(seq===lbSeq)msg.textContent=KMA.errMsg(err);}}
/* EXP di akhir pertandingan */
function endMatch(){if(G.matchDone)return;
  if(!(NET.mode==='pvp'&&pl.spectator)){misiAdd('games',1);if(G.defRes==='win')misiAdd('defwin',1);if(NET.mode==='pvp'){const sc=pvpScore();if(sc.me>sc.opp)misiAdd('pvpwin',1);}}
  if(!window.KMA)return;G.matchDone=true;let st;
  if(NET.mode==='pvp'){if(pl.spectator)return;const sc=pvpScore();st={mode:'pvp',kills:sc.me,win:sc.me>sc.opp,score:0};}
  else st={mode:NET.mode,kills:G.kills,hs:G.hs,wave:G.wave,boss:G.bossK||0,revives:G.revs,score:pl.score,defend:G.defRes==='win'?1:0};
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
  {const u=document.getElementById('upd'),sh=!(G.updAvail&&G.state!=='play');if(u.hidden!==sh)u.hidden=sh;}
  if(isTouch&&G.state==='play'&&!G.hudEdit){tUse.hidden=!(G.revNear||G.revT>0||GEN.near);tShop.hidden=!shopAvail();tPing.hidden=NET.mode!=='coop';}
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
