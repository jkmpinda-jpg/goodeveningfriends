/* ============================================================
   THE TRAIL — a night road that turns into morning.
   three.js scene: winding road with the gold rail (earthly) on the left and the
   royal-blue rail (spiritual) on the right, a lantern per week, the Golden Line
   stone to the left and the Royal Blue Line stone to the right, pines and
   broadleaf trees, hills, and a sky that goes from deep night through dawn to
   full day as the journey moves on. Stars and fireflies fade as the sun rises;
   clouds and birds arrive with the light. Everything is generated in code —
   no image downloads, no licences.
   ============================================================ */
import * as THREE from '/assets/vendor/three.module.min.js';

/* ---------- tiny value noise ---------- */
function makeNoise(seed){let s=seed>>>0||1;const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  const P=new Uint8Array(512);const p=[];for(let i=0;i<256;i++)p[i]=i;for(let i=255;i>0;i--){const j=Math.floor(rnd()*(i+1));[p[i],p[j]]=[p[j],p[i]];}for(let i=0;i<512;i++)P[i]=p[i&255];
  const fade=t=>t*t*t*(t*(t*6-15)+10),lerp=(a,b,t)=>a+(b-a)*t;const grad=(h,x,y)=>{const g=h&3;return (g&1?-x:x)+(g&2?-y:y);};
  const n2=(x,y)=>{const X=Math.floor(x)&255,Y=Math.floor(y)&255;x-=Math.floor(x);y-=Math.floor(y);const u=fade(x),v=fade(y);
    const A=P[X]+Y,B=P[X+1]+Y;return lerp(lerp(grad(P[A],x,y),grad(P[B],x-1,y),u),lerp(grad(P[A+1],x,y-1),grad(P[B+1],x-1,y-1),u),v);};
  const fbm=(x,y,o=4)=>{let a=0,amp=.5,f=1;for(let i=0;i<o;i++){a+=amp*n2(x*f,y*f);amp*=.5;f*=2.1;}return a;};
  return {n2,fbm,rnd};}

/* ---------- palettes: night · dawn · day ---------- */
const PAL={
  night:{top:'#03081A',mid:'#0B1A46',hor:'#1A2C5E',fog:'#0B1636',ground:'#33425E',tree:'#1E4038',leaf:'#264734',trunk:'#2E2216',hemiSky:'#3555A8',hemiGround:'#0E1630',sun:'#9FB6FF',dirI:0.85,hemiI:1.15,stars:1,moon:1,sunV:0,rail:0.85,road:'#7A746E',cloud:0,exposure:1.0},
  dawn: {top:'#233B7A',mid:'#7B5B8C',hor:'#F0A366',fog:'#8C6E86',ground:'#6E7A5A',tree:'#2C5A3C',leaf:'#3E6B3A',trunk:'#4A3520',hemiSky:'#B98AA2',hemiGround:'#3A2E26',sun:'#FFB877',dirI:1.1,hemiI:0.85,stars:0.25,moon:0.35,sunV:1,rail:0.45,road:'#8C7F72',cloud:0.5,exposure:1.02},
  day:  {top:'#3F86E6',mid:'#8CBBF7',hor:'#E4EFFF',fog:'#CFE0F8',ground:'#7BA65C',tree:'#2E6E3B',leaf:'#4F9A45',trunk:'#5A3E22',hemiSky:'#CFE3FF',hemiGround:'#5F8A4A',sun:'#FFF6E0',dirI:2.0,hemiI:1.0,stars:0,moon:0,sunV:1,rail:0.12,road:'#B3A594',cloud:1,exposure:1.12}
};
const C=h=>new THREE.Color(h);
function mixPal(p){const s=(a,b,t)=>a+(b-a)*t,k=t=>t*t*(3-2*t);const out={};let A,B,t;
  if(p<0.5){A=PAL.night;B=PAL.dawn;t=k(p/0.5);}else{A=PAL.dawn;B=PAL.day;t=k((p-0.5)/0.5);}
  for(const key in A){if(typeof A[key]==='number')out[key]=s(A[key],B[key],t);else out[key]=C(A[key]).lerp(C(B[key]),t);}return out;}

/* ---------- canvas helpers ---------- */
function labelSprite(text,opts={}){
  const {font='italic 600 44px "Cormorant Garamond", Georgia, serif',color='#F6F1E6',sub='',subColor='#A7B4D1',w=760,h=150,glow='rgba(0,0,0,.75)'}=opts;
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  x.textAlign='center';x.textBaseline='middle';x.shadowColor=glow;x.shadowBlur=16;
  x.font=font;x.fillStyle=color;x.fillText(text,w/2,sub?h/2-16:h/2);
  if(sub){x.shadowBlur=8;x.font='600 21px Inter, system-ui, sans-serif';x.fillStyle=subColor;try{x.letterSpacing='4px';}catch(e){}x.fillText(sub,w/2,h/2+34);}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const m=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});const sp=new THREE.Sprite(m);sp.scale.set(w/54,h/54,1);sp.userData.label=true;return sp;}
function glowSprite(color,size,inner=1){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color);g.addColorStop(0.18*inner,color);g.addColorStop(0.45,color.replace(/[\d.]+\)$/,'0.35)'));g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
  const tex=new THREE.CanvasTexture(c);const m=new THREE.SpriteMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});const s=new THREE.Sprite(m);s.scale.set(size,size,1);return s;}
function numberSprite(n,lit){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.beginPath();x.arc(64,64,54,0,Math.PI*2);x.fillStyle=lit?'#D9A441':'#16224A';x.fill();x.lineWidth=5;x.strokeStyle=lit?'#F0CE7E':'#2A3A6A';x.stroke();
  x.font='700 58px Inter, system-ui, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle=lit?'#050B1B':'#5A6A8F';x.fillText(String(n),64,66);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});const s=new THREE.Sprite(m);s.scale.set(3,3,1);return s;}
function cloudSprite(noise){const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
  for(let i=0;i<14;i++){const cx=40+noise.rnd()*176,cy=50+noise.rnd()*40,r=18+noise.rnd()*30;const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(0.6,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);}
  const tex=new THREE.CanvasTexture(c);const m=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:0,fog:false});const s=new THREE.Sprite(m);return s;}
function roadTextures(noise){
  const W=512,H=2048;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const img=x.createImageData(W,H);const d=img.data;
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){const u=i/W,v=j/H;
    const coarse=noise.fbm(u*6,v*48,3)*0.5+0.5, grain=noise.n2(u*180,v*720)*0.5+0.5, fine=noise.n2(u*420,v*1680)*0.5+0.5;
    const track=Math.exp(-Math.pow((u-0.32)/0.07,2))+Math.exp(-Math.pow((u-0.68)/0.07,2));   // wheel-worn bands
    const edge=Math.min(u,1-u);const soil=edge<0.09?(0.09-edge)/0.09:0;
    let base=0.30+0.16*coarse+0.10*grain+0.06*fine+0.07*track;
    let r=base*205,g=base*196,b=base*184;
    if(soil>0){const k=soil*soil;r=r*(1-k)+(95+40*coarse)*k;g=g*(1-k)+(78+30*coarse)*k;b=b*(1-k)+(52+18*coarse)*k;}
    if(fine>0.93){r+=28;g+=26;b+=22;}   // pebbles
    const k=(j*W+i)*4;d[k]=r;d[k+1]=g;d[k+2]=b;d[k+3]=255;}
  x.putImageData(img,0,0);
  const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const e=document.createElement('canvas');e.width=W;e.height=H;const y=e.getContext('2d');y.fillStyle='#000';y.fillRect(0,0,W,H);
  const gl=y.createLinearGradient(0,0,44,0);gl.addColorStop(0,'rgba(240,206,126,0)');gl.addColorStop(0.5,'rgba(240,206,126,1)');gl.addColorStop(1,'rgba(240,206,126,0)');y.fillStyle=gl;y.fillRect(0,0,44,H);
  const bl=y.createLinearGradient(W-44,0,W,0);bl.addColorStop(0,'rgba(134,170,245,0)');bl.addColorStop(0.5,'rgba(134,170,245,1)');bl.addColorStop(1,'rgba(134,170,245,0)');y.fillStyle=bl;y.fillRect(W-44,0,44,H);
  y.fillStyle='rgba(240,206,126,.5)';for(let j=0;j<H;j+=128)y.fillRect(W/2-3,j,6,52);
  const emissive=new THREE.CanvasTexture(e);emissive.wrapS=emissive.wrapT=THREE.RepeatWrapping;emissive.colorSpace=THREE.SRGBColorSpace;
  return {map,emissive};}
function groundTexture(noise){const S=512;const c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const img=x.createImageData(S,S);const d=img.data;
  for(let j=0;j<S;j++)for(let i=0;i<S;i++){const u=i/S,v=j/S;const a=noise.fbm(u*8,v*8,4)*0.5+0.5,b=noise.n2(u*160,v*160)*0.5+0.5,cc=noise.n2(u*50,v*50)*0.5+0.5;
    const t=0.55+0.3*a+0.15*b;const k=(j*S+i)*4;d[k]=t*(150+30*cc);d[k+1]=t*(190+25*a);d[k+2]=t*(120+20*cc);d[k+3]=255;}
  x.putImageData(img,0,0);const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(36,36);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;return tex;}
function envTexture(P){const w=128,h=64;const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#'+P.top.getHexString());g.addColorStop(0.42,'#'+P.mid.getHexString());g.addColorStop(0.5,'#'+P.hor.getHexString());g.addColorStop(0.56,'#'+P.ground.getHexString());g.addColorStop(1,'#'+P.hemiGround.getHexString());
  x.fillStyle=g;x.fillRect(0,0,w,h);if(P.sunV>0.01){const sx=w*0.62,sy=h*(0.5-0.28*P.sunV);const s=x.createRadialGradient(sx,sy,0,sx,sy,18);s.addColorStop(0,'rgba(255,240,200,'+P.sunV+')');s.addColorStop(1,'rgba(255,240,200,0)');x.fillStyle=s;x.fillRect(0,0,w,h);}
  const tex=new THREE.CanvasTexture(c);tex.mapping=THREE.EquirectangularReflectionMapping;tex.colorSpace=THREE.SRGBColorSpace;return tex;}

/* ---------- geometry builders ---------- */
function ribbon(curve,samples,width,yOff){
  const pos=[],uv=[],nrm=[],idx=[];const up=new THREE.Vector3(0,1,0);
  for(let i=0;i<=samples;i++){const t=i/samples;const p=curve.getPointAt(t);const tan=curve.getTangentAt(t);const side=new THREE.Vector3().crossVectors(up,tan).normalize();
    const l=p.clone().addScaledVector(side,width),r=p.clone().addScaledVector(side,-width);
    pos.push(l.x,l.y+yOff,l.z,r.x,r.y+yOff,r.z);uv.push(0,t,1,t);nrm.push(0,1,0,0,1,0);
    if(i<samples){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));g.setIndex(idx);return g;}
function stoneGeometry(noise,seed,size){const g=new THREE.IcosahedronGeometry(size,3);const p=g.attributes.position;const v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=noise.fbm(v.x*0.8+seed,v.z*0.8+v.y*0.5-seed,4);const k=1+n*0.5;v.multiplyScalar(k);v.y*=0.7;p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();return g;}
function mergeGeos(list){const pos=[],nrm=[];list.forEach(g=>{const ng=g.toNonIndexed();pos.push(...ng.attributes.position.array);nrm.push(...ng.attributes.normal.array);});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));return g;}

/* ---------- the scene ---------- */
export function createTrail(opts){
  const {canvas,weeks=[],phase=0,animate=true,onSelect=()=>{},onHover=()=>{},labels=true,quality='auto'}=opts;
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){return null;}
  const mobile=/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);const hi=quality==='high'||(quality==='auto'&&!mobile);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,hi?1.75:1.25));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=hi;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();const noise=makeNoise(7);
  const camera=new THREE.PerspectiveCamera(48,1,0.1,900);
  const state={phase,target:phase,animate,t:0,tTarget:0,time:0,hover:null,dead:false,needs:true,envPhase:-1};
  const pal={cur:mixPal(phase)};const pmrem=new THREE.PMREMGenerator(renderer);

  /* --- the road curve --- */
  const N=Math.max(weeks.length,3);const STEP=40;const pts=[];
  for(let i=-1;i<=N+3;i++){const z=-i*STEP;const x=Math.sin(i*0.9)*18+Math.sin(i*0.37)*8;const y=Math.sin(i*0.55)*1.8;pts.push(new THREE.Vector3(x,y,z));}
  const curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',0.4);
  const L=curve.getLength();const tOf=dist=>Math.min(1,Math.max(0,dist/L));
  const weekT=n=>tOf(STEP*1.1+(n-1)*STEP);
  const terrainH=(x,z)=>noise.fbm(x*0.012,z*0.012,4)*14+noise.fbm(x*0.05,z*0.05,2)*2.2;
  const groundY=(x,z)=>{const near=curve.getPointAt(tOf(-z));const dist=Math.abs(x-near.x);const corridor=Math.min(1,Math.max(0,(dist-9)/24));let h=terrainH(x,z)*corridor+near.y-0.4*(1-corridor)-0.25;if(dist>170)h+=(dist-170)*0.12;return h;};

  /* --- ground --- */
  const groundMat=new THREE.MeshStandardMaterial({map:groundTexture(noise),color:pal.cur.ground,roughness:1,metalness:0});
  {const g=new THREE.PlaneGeometry(560,L+380,130,160);g.rotateX(-Math.PI/2);g.translate(0,0,-(L+380)/2+130);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){p.setY(i,groundY(p.getX(i),p.getZ(i)));}
    g.computeVertexNormals();const m=new THREE.Mesh(g,groundMat);m.receiveShadow=true;scene.add(m);}

  /* --- road --- */
  const tex=roadTextures(noise);tex.map.repeat.set(1,L/16);tex.emissive.repeat.set(1,L/16);
  const roadMat=new THREE.MeshStandardMaterial({map:tex.map,emissiveMap:tex.emissive,emissive:new THREE.Color('#ffffff'),emissiveIntensity:1,roughness:0.92,metalness:0.02,color:pal.cur.road});
  const road=new THREE.Mesh(ribbon(curve,Math.round(L/1.2),4.8,0.06),roadMat);road.receiveShadow=true;scene.add(road);

  /* --- sky dome --- */
  const skyU={top:{value:pal.cur.top.clone()},mid:{value:pal.cur.mid.clone()},hor:{value:pal.cur.hor.clone()},sunDir:{value:new THREE.Vector3(0,0.2,-1)},sunColor:{value:pal.cur.sun.clone()},sunV:{value:0},glow:{value:0}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(420,32,18),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyU,
    vertexShader:`varying vec3 vW;void main(){vW=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 top,mid,hor,sunDir,sunColor;uniform float sunV,glow;varying vec3 vW;
      void main(){float h=clamp(vW.y,-0.2,1.);vec3 c=h<0.18?mix(hor,mid,smoothstep(-0.2,0.18,h)):mix(mid,top,smoothstep(0.18,1.,h));
      float d=max(dot(normalize(vW),normalize(sunDir)),0.);c+=sunColor*sunV*(pow(d,220.)*1.4+pow(d,16.)*0.4*glow+pow(d,3.)*0.14*glow);
      gl_FragColor=vec4(c,1.);}`}));scene.add(sky);

  /* --- stars --- */
  const starU={time:{value:0},fade:{value:1}};
  {const n=2600;const pos=new Float32Array(n*3),ph=new Float32Array(n),sz=new Float32Array(n),col=new Float32Array(n*3);
    for(let i=0;i<n;i++){const a=noise.rnd()*Math.PI*2,e=Math.asin(noise.rnd()*0.97+0.02);const r=400;pos[i*3]=Math.cos(e)*Math.cos(a)*r;pos[i*3+1]=Math.sin(e)*r;pos[i*3+2]=Math.cos(e)*Math.sin(a)*r;ph[i]=noise.rnd()*6.28;sz[i]=1.1+Math.pow(noise.rnd(),3)*4.4;
      const warm=noise.rnd()<0.14;col[i*3]=warm?1:0.85;col[i*3+1]=warm?0.86:0.9;col[i*3+2]=warm?0.6:1;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('ph',new THREE.Float32BufferAttribute(ph,1));g.setAttribute('sz',new THREE.Float32BufferAttribute(sz,1));g.setAttribute('col',new THREE.Float32BufferAttribute(col,3));
    const stars=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:starU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:`attribute float ph,sz;attribute vec3 col;uniform float time;varying float vA;varying vec3 vC;void main(){vC=col;vA=0.55+0.45*sin(time*(0.6+fract(ph)*1.4)+ph*7.);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=sz*(1.+0.5*vA);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform float fade;varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;float a=(1.-smoothstep(0.1,0.5,d))*vA*fade;gl_FragColor=vec4(vC,a);}`}));
    sky.add(stars);}

  /* --- moon, sun, clouds --- */
  const moon=glowSprite('rgba(246,241,230,1)',52,0.9);sky.add(moon);moon.position.set(130,108,-330);
  const moonDisc=new THREE.Mesh(new THREE.CircleGeometry(9,40),new THREE.MeshBasicMaterial({color:'#F6F1E6',transparent:true,fog:false}));sky.add(moonDisc);moonDisc.position.set(130,108,-326);moonDisc.lookAt(0,0,0);
  const sun=glowSprite('rgba(255,240,200,1)',170,0.6);sky.add(sun);
  const sunDisc=new THREE.Mesh(new THREE.CircleGeometry(14,48),new THREE.MeshBasicMaterial({color:'#FFF6E0',transparent:true,fog:false}));sky.add(sunDisc);
  const clouds=[];for(let i=0;i<9;i++){const s=cloudSprite(noise);const a=(i/9)*Math.PI*2+noise.rnd();const r=300+noise.rnd()*60;s.position.set(Math.cos(a)*r,90+noise.rnd()*110,Math.sin(a)*r);const w=90+noise.rnd()*120;s.scale.set(w,w*0.5,1);s.userData={a,r,sp:0.004+noise.rnd()*0.006};sky.add(s);clouds.push(s);}

  /* --- lights & fog --- */
  const hemi=new THREE.HemisphereLight(pal.cur.hemiSky,pal.cur.hemiGround,pal.cur.hemiI);scene.add(hemi);
  const dir=new THREE.DirectionalLight(pal.cur.sun,pal.cur.dirI);dir.position.set(-60,120,-100);scene.add(dir);scene.add(dir.target);
  if(hi){dir.castShadow=true;dir.shadow.mapSize.set(2048,2048);const sc=dir.shadow.camera;sc.left=-110;sc.right=110;sc.top=110;sc.bottom=-110;sc.near=10;sc.far=520;dir.shadow.bias=-0.0008;dir.shadow.normalBias=0.4;}
  scene.fog=new THREE.Fog(pal.cur.fog,50,330);
  const lantern=new THREE.PointLight('#F0CE7E',0,48,1.4);scene.add(lantern);

  /* --- trees --- */
  const pineMat=new THREE.MeshStandardMaterial({color:pal.cur.tree,roughness:0.95,flatShading:true});
  const leafMat=new THREE.MeshStandardMaterial({color:pal.cur.leaf,roughness:0.9,flatShading:true});
  const trunkMat=new THREE.MeshStandardMaterial({color:pal.cur.trunk,roughness:1});
  const pineGeo=(()=>{const a=new THREE.ConeGeometry(2.3,5.4,8);a.translate(0,4.0,0);const b=new THREE.ConeGeometry(1.75,4.6,8);b.translate(0,6.9,0);const c=new THREE.ConeGeometry(1.15,3.4,8);c.translate(0,9.4,0);
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),0.4);b.applyQuaternion(q);c.applyQuaternion(q.clone().multiply(q));return mergeGeos([a,b,c]);})();
  const trunkGeo=new THREE.CylinderGeometry(0.3,0.5,2.6,6);trunkGeo.translate(0,1.3,0);
  const leafGeo=(()=>{const parts=[];const centers=[[0,4.2,0,2.6],[1.6,3.6,0.4,2.0],[-1.5,3.7,-0.5,1.9],[0.3,5.6,0.9,1.8],[-0.4,3.1,1.5,1.7]];
    centers.forEach(([x,y,z,r])=>{const s=new THREE.IcosahedronGeometry(r,1);s.translate(x,y,z);parts.push(s);});return mergeGeos(parts);})();
  const bTrunkGeo=new THREE.CylinderGeometry(0.22,0.4,3.4,6);bTrunkGeo.translate(0,1.7,0);
  const treeColor=new THREE.Color();
  function scatter(geo,mat,tGeo,count,minD,maxD,sMin,sMax,tint){
    const mesh=new THREE.InstancedMesh(geo,mat,count),trunk=new THREE.InstancedMesh(tGeo,trunkMat,count);const o=new THREE.Object3D();let placed=0,tries=0;
    while(placed<count&&tries<count*20){tries++;const t=noise.rnd()*0.97;const p=curve.getPointAt(t);const tan=curve.getTangentAt(t);const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
      const dist=(minD+Math.pow(noise.rnd(),1.5)*(maxD-minD))*(noise.rnd()<0.5?-1:1);const pos=p.clone().addScaledVector(side,dist);pos.y=groundY(pos.x,pos.z);
      const s=sMin+noise.rnd()*(sMax-sMin);o.position.copy(pos);o.rotation.set(0,noise.rnd()*6.28,0);o.scale.set(s,s*(0.85+noise.rnd()*0.5),s);o.updateMatrix();
      mesh.setMatrixAt(placed,o.matrix);trunk.setMatrixAt(placed,o.matrix);treeColor.setHSL(tint[0]+(noise.rnd()-0.5)*0.05,tint[1]+(noise.rnd()-0.5)*0.15,tint[2]+(noise.rnd()-0.5)*0.16);mesh.setColorAt(placed,treeColor);placed++;}
    mesh.count=trunk.count=placed;mesh.castShadow=trunk.castShadow=hi;mesh.receiveShadow=true;scene.add(mesh);scene.add(trunk);return mesh;}
  const pines=scatter(pineGeo,pineMat,trunkGeo,hi?300:170,11,80,0.55,1.25,[0.36,0.5,0.5]);
  const leafy=scatter(leafGeo,leafMat,bTrunkGeo,hi?90:50,12,60,0.6,1.1,[0.3,0.5,0.5]);

  /* --- fireflies (night) --- */
  const flyU={time:{value:0},fade:{value:1}};
  {const n=110;const pos=new Float32Array(n*3),ph=new Float32Array(n);
    for(let i=0;i<n;i++){const t=noise.rnd()*0.9;const p=curve.getPointAt(t);pos[i*3]=p.x+(noise.rnd()-0.5)*44;pos[i*3+1]=p.y+0.6+noise.rnd()*3.5;pos[i*3+2]=p.z+(noise.rnd()-0.5)*24;ph[i]=noise.rnd()*6.28;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('ph',new THREE.Float32BufferAttribute(ph,1));
    scene.add(new THREE.Points(g,new THREE.ShaderMaterial({uniforms:flyU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:`attribute float ph;uniform float time;varying float vA;void main(){vec3 p=position+vec3(sin(time*0.7+ph)*1.4,sin(time*1.1+ph*2.)*0.6,cos(time*0.5+ph)*1.4);vA=max(0.,sin(time*1.7+ph*3.))*step(0.2,fract(ph*3.7+time*0.05));vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=max(1.5,90./-mv.z)*(0.6+vA);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform float fade;varying float vA;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;gl_FragColor=vec4(0.85,0.95,0.45,(1.-smoothstep(0.05,0.5,d))*vA*fade*0.9);}`})));}

  /* --- birds (day) --- */
  const birds=[];{const c=document.createElement('canvas');c.width=64;c.height=32;const x=c.getContext('2d');x.strokeStyle='#1c1c1c';x.lineWidth=3;x.lineCap='round';x.beginPath();x.moveTo(6,22);x.quadraticCurveTo(20,4,32,20);x.quadraticCurveTo(44,4,58,22);x.stroke();
    const tex=new THREE.CanvasTexture(c);for(let i=0;i<7;i++){const m=new THREE.SpriteMaterial({map:tex,transparent:true,opacity:0,depthWrite:false});const s=new THREE.Sprite(m);s.scale.set(6,3,1);s.userData={ph:noise.rnd()*6.28,sp:0.6+noise.rnd()*0.5,y:60+noise.rnd()*50,x0:(noise.rnd()-0.5)*160};scene.add(s);birds.push(s);}}

  /* --- milestones --- */
  const pick=[],labelSprites=[];
  const goldMat=new THREE.MeshStandardMaterial({color:'#E6B54A',roughness:0.32,metalness:0.7,emissive:'#6b4a0c',emissiveIntensity:0.3});
  const blueMat=new THREE.MeshStandardMaterial({color:'#3F72E6',roughness:0.3,metalness:0.55,emissive:'#0d2a7a',emissiveIntensity:0.4});
  const sealedMat=new THREE.MeshStandardMaterial({color:'#7B8CC0',roughness:0.25,metalness:0.15,transparent:true,opacity:0.2});
  const postMat=new THREE.MeshStandardMaterial({color:'#2a2622',roughness:0.9});
  const stones=[];const weekObjs={};
  weeks.forEach((w,i)=>{const t=weekT(w.n);const p=curve.getPointAt(t);const tan=curve.getTangentAt(t);const side=new THREE.Vector3(-tan.z,0,tan.x).normalize(); // +side = right
    const g=new THREE.Group();g.position.copy(p);scene.add(g);weekObjs[w.n]=g;
    /* two lanterns at the verges — gold on the left, royal blue on the right — and the week number floating above the road */
    [[-5.5,'rgba(240,206,126,1)'],[5.5,'rgba(134,170,245,1)']].forEach(([off,glow])=>{const post=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.17,4.6,6),postMat);post.position.copy(side.clone().multiplyScalar(off));post.position.y+=2.3;post.castShadow=hi;g.add(post);
      const lampGlow=glowSprite(w.made?glow:'rgba(120,140,190,1)',w.made?6:3,1);lampGlow.position.copy(post.position).add(new THREE.Vector3(0,2.6,0));g.add(lampGlow);});
    const num=numberSprite(w.n,w.made);num.position.set(0,4.4,0);num.scale.set(2.8,2.8,1);g.add(num);num.userData={kind:'week',n:w.n,open:w.open};pick.push(num);
    const numGlow=glowSprite(w.made?'rgba(240,206,126,1)':'rgba(120,140,190,1)',w.made?7:0.1,0.6);numGlow.position.set(0,4.4,0);numGlow.material.opacity=0.5;g.add(numGlow);
    if(labels){const title=labelSprite(w.title,{font:'600 30px Inter, system-ui, sans-serif',color:w.made?'#F6F1E6':'#8A98B8',w:640,h:80});title.position.set(0,6.6,0);title.scale.set(9.5,1.2,1);g.add(title);labelSprites.push(title);}
    /* stones: Golden Line on the left, Royal Blue Line on the right */
    [['A',-8.4,goldMat,'#F0CE7E','GOLDEN LINE'],['B',8.4,blueMat,'#D3E0FC','ROYAL BLUE LINE']].forEach(([kind,off,mat,col,sub])=>{
      const geo=stoneGeometry(noise,w.n*3+(kind==='A'?1:2),2.0);const open=w.made&&w.open;const m=new THREE.Mesh(geo,open?mat:sealedMat);m.castShadow=hi&&open;
      m.position.copy(side.clone().multiplyScalar(off));m.position.y+=1.15;m.rotation.y=w.n*1.3;g.add(m);m.userData={kind,n:w.n,open,base:m.position.y};pick.push(m);stones.push(m);
      if(open){const gl=glowSprite(kind==='A'?'rgba(240,206,126,1)':'rgba(134,170,245,1)',9,0.5);gl.position.copy(m.position);gl.position.y+=0.4;gl.material.opacity=0.55;g.add(gl);m.userData.glow=gl;}
      else{const lock=labelSprite('🔒',{font:'40px sans-serif',w:96,h:96});lock.position.copy(m.position);lock.position.y+=0.6;lock.scale.set(1.5,1.5,1);g.add(lock);}
      if(labels){const lab=labelSprite(kind==='A'?w.a:w.b,{color:open?col:'#6E7C9C',sub:`${sub} · WK ${w.n}`,subColor:open?'#A7B4D1':'#4d5a75'});lab.position.copy(m.position);lab.position.y+=4.1;lab.scale.set(11,2.2,1);g.add(lab);labelSprites.push(lab);}
    });
  });
  const city=glowSprite('rgba(250,235,198,1)',70,0.3);{const p=curve.getPointAt(0.985);city.position.set(p.x,p.y+16,p.z);city.material.opacity=0.35;scene.add(city);}

  /* --- camera along the road --- */
  const camPos=new THREE.Vector3(),look=new THREE.Vector3(),tmp=new THREE.Vector3();
  function placeCamera(){const t=state.t;const p=curve.getPointAt(t);const ahead=curve.getPointAt(Math.min(1,t+0.04));
    const sway=state.animate?Math.sin(state.time*0.35)*0.3:0;camPos.set(p.x+sway,p.y+4.6,p.z+0.001);look.set(ahead.x,ahead.y+1.6,ahead.z);
    camera.position.lerp(camPos,0.1);camera.lookAt(look);
    const ph=state.phase;const el=-0.1+ph*1.0;const sd=new THREE.Vector3(0.35,Math.sin(el),-Math.cos(el)).normalize();skyU.sunDir.value.copy(sd);
    sun.position.copy(sd).multiplyScalar(385);sunDisc.position.copy(sd).multiplyScalar(375);sunDisc.lookAt(0,0,0);
    dir.position.copy(camera.position).addScaledVector(ph>0.35?sd:tmp.set(-0.5,0.7,-0.7).normalize(),240);dir.target.position.copy(camera.position).add(tmp.set(0,-10,-60));dir.target.updateMatrixWorld();
    sky.position.copy(camera.position);
    const cur1=weeks.find(w=>w.current);if(cur1){const g=weekObjs[cur1.n];lantern.position.copy(g.position).add(new THREE.Vector3(0,4,0));}
    labelSprites.forEach(s=>{tmp.setFromMatrixPosition(s.matrixWorld);const d=tmp.distanceTo(camera.position);s.material.opacity=Math.max(0,Math.min(1,1-(d-58)/48));});}

  function applyPhase(){const P=pal.cur=mixPal(state.phase);
    skyU.top.value.copy(P.top);skyU.mid.value.copy(P.mid);skyU.hor.value.copy(P.hor);skyU.sunColor.value.copy(P.sun);skyU.sunV.value=P.sunV;skyU.glow.value=Math.max(0,1-Math.abs(state.phase-0.5)*2.2)+0.15;
    scene.fog.color.copy(P.fog);groundMat.color.copy(P.ground);pineMat.color.copy(P.tree);leafMat.color.copy(P.leaf);trunkMat.color.copy(P.trunk);roadMat.color.copy(P.road);
    hemi.color.copy(P.hemiSky);hemi.groundColor.copy(P.hemiGround);hemi.intensity=P.hemiI;dir.color.copy(P.sun);dir.intensity=P.dirI;
    starU.fade.value=P.stars;flyU.fade.value=P.stars;moon.material.opacity=P.moon;moonDisc.material.opacity=P.moon;
    sun.material.opacity=P.sunV*(0.35+0.65*Math.min(1,state.phase*1.4));sunDisc.material.opacity=Math.min(1,Math.max(0,(state.phase-0.35)*2.5));
    roadMat.emissiveIntensity=P.rail;lantern.intensity=P.rail*70;renderer.toneMappingExposure=P.exposure;
    stones.forEach(m=>{if(m.userData.glow)m.userData.glow.material.opacity=0.2+0.4*P.rail;});
    birds.forEach(b=>b.material.opacity=Math.max(0,(state.phase-0.6)*2.5));clouds.forEach(c=>c.material.opacity=P.cloud*0.85);
    if(Math.abs(state.phase-state.envPhase)>0.12||state.envPhase<0){state.envPhase=state.phase;const t=envTexture(P);const rt=pmrem.fromEquirectangular(t);if(scene.environment)scene.environment.dispose();scene.environment=rt.texture;t.dispose();}}

  /* --- interaction: scroll / drag walks the road, click opens --- */
  const ray=new THREE.Raycaster();const mouse=new THREE.Vector2();
  function hitTest(ev){const r=canvas.getBoundingClientRect();mouse.x=((ev.clientX-r.left)/r.width)*2-1;mouse.y=-((ev.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse,camera);
    const hits=ray.intersectObjects(pick,false);return hits.length?hits[0].object:null;}
  let dragging=false,dragY=0,dragT=0,moved=0;
  canvas.addEventListener('pointerdown',e=>{dragging=true;dragY=e.clientY;dragT=state.tTarget;moved=0;try{canvas.setPointerCapture(e.pointerId);}catch(x){}});
  canvas.addEventListener('pointermove',e=>{if(dragging){const dy=e.clientY-dragY;moved+=Math.abs(dy);state.tTarget=clampT(dragT-dy*0.0009);state.needs=true;return;}
    const o=hitTest(e);const h=o?o.userData:null;const hk=h?h.kind+h.n:'';const sk=state.hover?state.hover.kind+state.hover.n:'';if(hk!==sk){state.hover=h;canvas.style.cursor=h?(h.open?'pointer':'not-allowed'):'grab';onHover(h);state.needs=true;}});
  canvas.addEventListener('pointerup',e=>{dragging=false;try{canvas.releasePointerCapture(e.pointerId);}catch(x){}if(moved<6){const o=hitTest(e);if(o)onSelect(o.userData.kind,o.userData.n,o.userData.open);}});
  canvas.addEventListener('pointercancel',()=>{dragging=false;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();state.tTarget=clampT(state.tTarget+e.deltaY*0.00028);state.needs=true;},{passive:false});
  canvas.tabIndex=0;canvas.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowRight'){state.tTarget=clampT(state.tTarget+0.03);state.needs=true;e.preventDefault();}if(e.key==='ArrowUp'||e.key==='ArrowLeft'){state.tTarget=clampT(state.tTarget-0.03);state.needs=true;e.preventDefault();}});
  const tMax=weekT(weeks.length?weeks[weeks.length-1].n:1)+0.05;const clampT=t=>Math.max(0,Math.min(tMax,t));

  /* --- resize --- */
  function resize(){const r=canvas.getBoundingClientRect();const w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();state.needs=true;}
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();

  /* --- loop --- */
  let visible=true;const io=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)state.needs=true;},{threshold:0.02});io.observe(canvas);
  let last=performance.now();
  function frame(now){if(state.dead)return;requestAnimationFrame(frame);const dt=Math.min(0.05,(now-last)/1000);last=now;if(!visible||document.hidden)return;
    let dirty=state.needs;
    if(Math.abs(state.phase-state.target)>0.0005){state.phase+=(state.target-state.phase)*Math.min(1,dt*1.2);if(Math.abs(state.phase-state.target)<0.0005)state.phase=state.target;applyPhase();dirty=true;}
    if(Math.abs(state.t-state.tTarget)>0.00005||camera.position.distanceTo(camPos)>0.02){state.t+=(state.tTarget-state.t)*Math.min(1,dt*4);dirty=true;}
    if(state.animate){state.time+=dt;starU.time.value=state.time;flyU.time.value=state.time;dirty=true;
      stones.forEach((m,i)=>{if(m.userData.open)m.position.y=m.userData.base+Math.sin(state.time*0.8+i)*0.08;});
      clouds.forEach(c=>{const u=c.userData;u.a+=u.sp*dt;c.position.set(Math.cos(u.a)*u.r,c.position.y,Math.sin(u.a)*u.r);});
      birds.forEach(b=>{const u=b.userData;const x=u.x0+Math.sin(state.time*0.12*u.sp+u.ph)*140;b.position.set(camera.position.x+x,camera.position.y+u.y+Math.sin(state.time*0.9+u.ph)*4,camera.position.z-180+Math.cos(state.time*0.1*u.sp+u.ph)*60);b.scale.y=2.2+Math.sin(state.time*9*u.sp+u.ph)*1.2;});}
    if(dirty){placeCamera();renderer.render(scene,camera);state.needs=false;}}
  applyPhase();placeCamera();camera.position.copy(camPos);requestAnimationFrame(frame);

  return {
    setPhase(p,immediate){state.target=Math.max(0,Math.min(1,p));if(immediate){state.phase=state.target;applyPhase();}state.needs=true;},
    setAnimate(b){state.animate=!!b;state.needs=true;},
    focusWeek(n){state.tTarget=clampT(weekT(n)-0.03);state.needs=true;},
    walk(d){state.tTarget=clampT(state.tTarget+d);state.needs=true;},
    getPhase(){return state.phase;},
    dispose(){state.dead=true;ro.disconnect();io.disconnect();pmrem.dispose();renderer.dispose();}
  };
}
