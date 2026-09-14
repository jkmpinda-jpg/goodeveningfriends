/* The Family Tree — engine. Loads data/people.json, lays the generations out in colour-blocked lanes,
   routes the connection lines, draws animated cards, and runs the camera, the side panel and the tracks. */
import {avatar} from './avatars.js';
const CARD={w:172,h:58},COLX=186,ROWH=118,ZPAD=24,LANEGAP=44,LEFT=150,TOP=90;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
let DATA,TRACKS,byId={},kids={},rows={},pos={},laneIdx={},zones={},edges=[],world={w:1000,h:1000};
let mode={trace:null,tribe:null};

/* ---------- load ---------- */
export async function boot(){
  DATA=await (await fetch('data/people.json',{cache:'no-store'})).json();
  TRACKS=await (await fetch('data/tracks.json',{cache:'no-store'})).json();
  DATA.people.forEach(p=>{byId[p.id]=p;kids[p.id]=[];});
  DATA.people.forEach(p=>p.parents.forEach(pa=>{if(kids[pa])kids[pa].push(p.id);}));
  DATA.lanes.forEach((g,i)=>laneIdx[g]=i);
  layout();draw();drawSidebar();bindCamera();vb=viewAt(pos.adam.x+CARD.w/2+300,pos.adam.y+260,0.7);setVB();
  const start=location.hash.replace('#','');if(start&&byId[start])setTimeout(()=>focusPerson(start),400);
  $('search').addEventListener('input',onSearch);
}

/* ---------- layout ----------
   Rows are generations. Every zone (group) is a lane: a block of cards per row, wrapped into sub-rows when a family is
   wide, packed left-to-right so that lanes sharing rows never overlap and each lane sits as close under its parents as
   the space allows. The result reads like the poster: colour blocks, top to bottom, with the two Lines running through. */
const MAXROW=8,SUBH=CARD.h+14;
let rowY={};
function layout(){
  DATA.people.forEach(p=>{(rows[p.gen]=rows[p.gen]||[]).push(p.id);});
  const gens=Object.keys(rows).map(Number).sort((a,b)=>a-b);
  /* blocks: lane × gen → ordered ids (spouses kept together, children ordered by their parents' order) */
  const blocks={};DATA.lanes.forEach(g=>blocks[g]={});
  const orderKey={};
  gens.forEach(g=>{const used=new Set();const clusters=[];
    rows[g].forEach(id=>{if(used.has(id))return;const p=byId[id];const cl=[id];used.add(id);p.spouses.forEach(s=>{if(byId[s]&&byId[s].gen===g&&!used.has(s)){cl.push(s);used.add(s);}});
      const anchors=cl.flatMap(c=>byId[c].parents.map(q=>orderKey[q])).filter(x=>x!==undefined);clusters.push({cl,lane:laneIdx[p.group]??99,anchor:anchors.length?Math.min(...anchors):1e9});});
    clusters.sort((a,b)=>a.lane-b.lane||a.anchor-b.anchor);
    let k=0;clusters.forEach(c=>c.cl.forEach(id=>{const grp=byId[id].group;(blocks[grp][g]=blocks[grp][g]||[]).push(id);orderKey[id]=k++;}));});
  /* row heights (wrapped blocks need sub-rows) and y per generation */
  let y=TOP;gens.forEach(g=>{let sub=1;DATA.lanes.forEach(l=>{const b=blocks[l][g];if(b)sub=Math.max(sub,Math.ceil(b.length/MAXROW));});rowY[g]={y,sub,h:ROWH+(sub-1)*SUBH};y+=rowY[g].h;});
  /* lane widths and row ranges */
  const lane={};DATA.lanes.forEach(l=>{const gs=Object.keys(blocks[l]).map(Number);if(!gs.length)return;const w=Math.max(...gs.map(g=>(Math.min(blocks[l][g].length,MAXROW)-1)*COLX+CARD.w+(blocks[l][g].length>MAXROW?COLX/2:0)));lane[l]={w,g0:Math.min(...gs),g1:Math.max(...gs)};});
  /* pack lanes: nearest free slot to where the parents stand */
  const placed=[];const laneX={};
  const order=Object.keys(lane).sort((a,b)=>lane[a].g0-lane[b].g0||laneIdx[a]-laneIdx[b]);
  order.forEach(l=>{const L=lane[l];const first=blocks[l][L.g0];const px=first.flatMap(id=>byId[id].parents.map(q=>pos[q]&&pos[q].x+CARD.w/2)).filter(x=>x!==undefined);
    const desired=px.length?px.reduce((a,b)=>a+b,0)/px.length-L.w/2:0;
    const conflicts=placed.filter(c=>!(c.g1<L.g0||c.g0>L.g1));
    const clash=x=>conflicts.some(c=>!(x+L.w+LANEGAP<=c.x||x>=c.x+c.w+LANEGAP));
    let best=null;const cands=[Math.max(0,desired)];conflicts.forEach(c=>{cands.push(c.x+c.w+LANEGAP);cands.push(c.x-LANEGAP-L.w);});
    cands.filter(x=>x>=0&&!clash(x)).forEach(x=>{if(best===null||Math.abs(x-desired)<Math.abs(best-desired))best=x;});
    if(best===null)best=Math.max(0,...conflicts.map(c=>c.x+c.w+LANEGAP));
    laneX[l]=best;placed.push({x:best,w:L.w,g0:L.g0,g1:L.g1});
    Object.keys(blocks[l]).map(Number).forEach(g=>{const b=blocks[l][g];const n=Math.min(b.length,MAXROW);const bw=(n-1)*COLX+CARD.w;const start=best+(L.w-bw)/2;
      b.forEach((id,i)=>{const r=Math.floor(i/MAXROW),c=i%MAXROW;pos[id]={x:start+c*COLX+(r%2?COLX/2:0),y:rowY[g].y+r*SUBH,gen:g};});});});
  const minX=Math.min(...Object.values(pos).map(p=>p.x));Object.values(pos).forEach(p=>p.x+=LEFT-minX);
  /* zones */
  Object.keys(DATA.groups).forEach(g=>{const ids=DATA.people.filter(p=>p.group===g).map(p=>p.id);if(!ids.length)return;
    const xs=ids.map(i=>pos[i].x),ys=ids.map(i=>pos[i].y);zones[g]={x:Math.min(...xs)-ZPAD,y:Math.min(...ys)-ZPAD-16,w:Math.max(...xs)-Math.min(...xs)+CARD.w+ZPAD*2,h:Math.max(...ys)-Math.min(...ys)+CARD.h+ZPAD*2+16};});
  /* edges */
  const slotByRow={};
  DATA.people.forEach(c=>{const par=c.parents.filter(p=>pos[p]);if(!par.length)return;
    let ax,ay,key;const p0=byId[par[0]];
    if(par.length===2&&pos[par[0]].y===pos[par[1]].y&&Math.abs(pos[par[0]].x-pos[par[1]].x)<=COLX+1){ax=(pos[par[0]].x+pos[par[1]].x)/2+CARD.w/2;ay=pos[par[0]].y+CARD.h/2;key=par.slice().sort().join('+');}
    else{ax=pos[par[0]].x+CARD.w/2;ay=pos[par[0]].y+CARD.h;key=par[0];}
    const g=p0.gen;slotByRow[g]=slotByRow[g]||{};if(slotByRow[g][key]===undefined)slotByRow[g][key]=Object.keys(slotByRow[g]).length;
    const slot=slotByRow[g][key]%5;const bus=rowY[g].y+rowY[g].h-ROWH+CARD.h+14+slot*9;
    const cx=pos[c.id].x+CARD.w/2,cy=pos[c.id].y;
    const cls=(c.tags.includes('g')&&c.tags.includes('b'))?'gb':c.tags.includes('g')?'g':c.tags.includes('b')?'b':c.tags.includes('u')?'u':'';
    const long=pos[c.id].gen-g>1;
    edges.push({id:c.id,from:par,cls,long,d:`M${ax} ${ay} V${bus} H${cx} V${cy}`});});
  DATA.people.forEach(p=>p.spouses.forEach(s=>{if(p.id<s&&pos[s]&&pos[s].y===pos[p.id].y){const a=pos[p.id].x<pos[s].x?p.id:s,b=a===p.id?s:p.id;edges.push({marriage:[a,b],d:`M${pos[a].x+CARD.w} ${pos[a].y+CARD.h/2} H${pos[b].x}`});}}));
  world={w:Math.max(...Object.values(pos).map(p=>p.x))+CARD.w+200,h:y+120};
}

/* ---------- drawing ---------- */
function card(p){const z=DATA.groups[p.group];const t=p.tags;const cls=['card',p.group,t.includes('g')?'g':'',t.includes('b')?'b':'',t.includes('u')?'u':'',t.includes('k')?'k':'',t.includes('w')?'w':''].filter(Boolean).join(' ');
  const sub=p.role||p.meaning;const{x,y}=pos[p.id];
  return `<g class="${cls}" data-id="${p.id}" transform="translate(${x},${y})"><rect class="bg" width="${CARD.w}" height="${CARD.h}" rx="12"/>
   <g transform="translate(7,7)"><svg width="44" height="44" viewBox="0 0 44 44">${avatar(p,z.color)}</svg></g>
   <text class="nm" x="60" y="${sub?24:34}">${esc(p.name)}</text>${sub?`<text class="sb" x="60" y="41">${esc(sub.length>26?sub.slice(0,25)+'…':sub)}</text>`:''}
   ${t.includes('g')||t.includes('b')?`<rect class="rail ${t.includes('g')&&t.includes('b')?'gb':t.includes('g')?'g':'b'}" x="60" y="49" width="${CARD.w-70}" height="3" rx="1.5"/>`:''}</g>`;}
function draw(){
  const svg=$('tree');const G=DATA.groups;
  let h=`<defs><linearGradient id="ringGB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0CE7E"/><stop offset="1" stop-color="#86AAF5"/></linearGradient><linearGradient id="railGB" x1="0" x2="1"><stop offset="0" stop-color="#F0CE7E"/><stop offset="1" stop-color="#86AAF5"/></linearGradient><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  /* eras — the illustrated timeline down the left edge */
  h+='<g class="eras">'+DATA.eras.map(([a,b,label],i)=>{const y=(rowY[a]||rowY[Object.keys(rowY)[0]]).y-30,hh=(rowY[b]?rowY[b].y+rowY[b].h:world.h)-y-30;return `<rect x="0" y="${y}" width="${LEFT-40}" height="${hh}" class="era e${i%2}"/><text transform="translate(${LEFT/2-22},${y+hh/2}) rotate(-90)" class="eralab">${esc(label)}</text><line x1="0" y1="${y}" x2="${world.w}" y2="${y}" class="eraline"/>`;}).join('')+'</g>';
  /* generation numbers */
  h+='<g class="gens">'+Object.keys(rows).map(g=>`<text x="${LEFT-28}" y="${rowY[g].y+CARD.h/2+4}" class="gennum">${g}</text>`).join('')+'</g>';
  /* zones */
  h+='<g class="zones">'+Object.entries(zones).map(([g,z])=>`<g class="zone" data-zone="${g}"><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="18" style="fill:${G[g].color};stroke:${G[g].color}"/><text x="${z.x+14}" y="${z.y+18}" class="zlab" style="fill:${G[g].color}">${esc(G[g].name.toUpperCase())}</text><text x="${z.x+14}" y="${z.y+32}" class="zsub">${esc(G[g].sub)}</text></g>`).join('')+'</g>';
  /* edges */
  h+='<g class="edges">'+edges.map(e=>e.marriage?`<path class="edge marriage" data-m="${e.marriage.join('+')}" d="${e.d}"/>`:`<path class="edge ${e.cls} ${e.long?'long':''}" data-child="${e.id}" data-parents="${e.from.join('+')}" d="${e.d}"/>`).join('')+'</g>';
  /* cards */
  h+='<g class="cards">'+DATA.people.map(card).join('')+'</g>';
  svg.innerHTML=h;
  svg.querySelectorAll('.card').forEach(n=>{n.addEventListener('click',e=>{e.stopPropagation();openPerson(n.dataset.id);});});
  svg.querySelectorAll('.zone').forEach(z=>z.addEventListener('click',()=>{const g=z.dataset.zone;flyToZone(g);}));
}

/* ---------- camera ---------- */
let vb={x:0,y:0,w:1600,h:900},anim=null;const svg=()=>$('tree');
function setVB(){svg().setAttribute('viewBox',`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);$('zoomLab').textContent=Math.round(100*svg().getBoundingClientRect().width/vb.w)+'%';}
function tweenTo(target,ms=650){if(anim)cancelAnimationFrame(anim);const from={...vb},t0=performance.now();const ease=t=>t<.5?2*t*t:-1+(4-2*t)*t;
  const step=now=>{const k=Math.min(1,(now-t0)/ms),e=ease(k);vb={x:from.x+(target.x-from.x)*e,y:from.y+(target.y-from.y)*e,w:from.w+(target.w-from.w)*e,h:from.h+(target.h-from.h)*e};setVB();if(k<1)anim=requestAnimationFrame(step);};anim=requestAnimationFrame(step);}
export function fitAll(){const r=svg().getBoundingClientRect();const k=Math.max(world.w/r.width,world.h/r.height);tweenTo({x:0,y:0,w:r.width*k,h:r.height*k});}
export function zoomBy(f){const cx=vb.x+vb.w/2,cy=vb.y+vb.h/2;const w=vb.w/f,h=vb.h/f;tweenTo({x:cx-w/2,y:cy-h/2,w,h},260);}
function viewAt(cx,cy,scale){const r=svg().getBoundingClientRect();const w=r.width/scale,h=r.height/scale;return {x:cx-w/2,y:cy-h/2,w,h};}
function bindCamera(){const s=svg();let drag=null;
  s.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,vx:vb.x,vy:vb.y,moved:0};s.classList.add('dragging');s.setPointerCapture(e.pointerId);if(anim)cancelAnimationFrame(anim);});
  s.addEventListener('pointermove',e=>{if(!drag)return;const r=s.getBoundingClientRect();const k=vb.w/r.width;drag.moved+=Math.abs(e.movementX)+Math.abs(e.movementY);vb.x=drag.vx-(e.clientX-drag.x)*k;vb.y=drag.vy-(e.clientY-drag.y)*k;setVB();});
  const end=()=>{drag=null;s.classList.remove('dragging');};s.addEventListener('pointerup',end);s.addEventListener('pointercancel',end);
  s.addEventListener('wheel',e=>{e.preventDefault();const r=s.getBoundingClientRect();if(e.ctrlKey||e.metaKey||Math.abs(e.deltaY)>0&&!e.shiftKey&&e.deltaMode===0&&Math.abs(e.deltaX)<1){const f=e.deltaY<0?1.15:0.87;const mx=vb.x+(e.clientX-r.left)/r.width*vb.w,my=vb.y+(e.clientY-r.top)/r.height*vb.h;vb.w/=f;vb.h/=f;vb.x=mx-(e.clientX-r.left)/r.width*vb.w;vb.y=my-(e.clientY-r.top)/r.height*vb.h;}else{const k=vb.w/r.width;vb.x+=e.deltaX*k;vb.y+=e.deltaY*k;}setVB();},{passive:false});
  /* pinch */
  const pts=new Map();let pinch0=0,vb0=null;
  s.addEventListener('pointerdown',e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2){const [a,b]=[...pts.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);vb0={...vb};}});
  s.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2&&vb0){const [a,b]=[...pts.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);const f=d/Math.max(1,pinch0);const cx=vb0.x+vb0.w/2,cy=vb0.y+vb0.h/2;vb={x:cx-vb0.w/f/2,y:cy-vb0.h/f/2,w:vb0.w/f,h:vb0.h/f};setVB();}});
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)vb0=null;};s.addEventListener('pointerup',up);s.addEventListener('pointercancel',up);
  window.addEventListener('resize',()=>setVB());
}
export function focusPerson(id,scale=0.95){const p=pos[id];if(!p)return;tweenTo(viewAt(p.x+CARD.w/2,p.y+CARD.h/2,scale));openPerson(id);}
export function flyToZone(g){const z=zones[g];if(!z)return;const r=svg().getBoundingClientRect();const k=Math.max(z.w/r.width,z.h/r.height)*1.15;tweenTo({x:z.x+z.w/2-r.width*k/2,y:z.y+z.h/2-r.height*k/2,w:r.width*k,h:r.height*k});}

/* ---------- side panel ---------- */
function openPerson(id){const p=byId[id];if(!p)return;const z=DATA.groups[p.group];
  document.querySelectorAll('.card.sel').forEach(c=>c.classList.remove('sel'));const c=document.querySelector(`.card[data-id="${id}"]`);if(c)c.classList.add('sel');
  history.replaceState(null,'','#'+id);
  const parents=p.parents.map(x=>byId[x]).filter(Boolean),spouses=p.spouses.map(x=>byId[x]).filter(Boolean),children=kids[id].map(x=>byId[x]);
  const link=q=>`<button class="lnk" data-go="${q.id}">${esc(q.name)}</button>`;
  const life=p.life||{};const lifeRows=[['Born',life.born],['Married',life.married],['Children',life.children],['Died',life.died]].filter(r=>r[1]);
  $('panelBody').innerHTML=`<div class="pv"><div class="pvava" style="--c:${z.color}"><svg width="72" height="72" viewBox="0 0 44 44">${avatar(p,z.color)}</svg></div>
   <div><div class="pvname">${esc(p.name)}</div>${p.meaning?`<div class="pvmean">“${esc(p.meaning)}”</div>`:''}<div class="pvrole">${esc(p.role||'')}</div></div></div>
   <div class="tags"><span style="color:${z.color};border-color:${z.color}">${esc(z.name)}</span><span>generation ${p.gen}</span>${p.tags.includes('g')?'<span class="g">Golden Line</span>':''}${p.tags.includes('b')?'<span class="b">Royal Blue Line</span>':''}${p.tags.includes('k')?'<span>king</span>':''}${p.tags.includes('u')?'<span class="u">walked away from God</span>':''}</div>
   ${p.notes?`<p class="pvnotes">${esc(p.notes)}</p>`:''}
   ${lifeRows.length?`<div class="life"><b>In the Book</b>${lifeRows.map(([k,v])=>`<div><i>${k}</i><span>${esc(v)}</span></div>`).join('')}</div>`:''}
   <div class="refs">${esc(p.refs)}</div>
   <div class="fam">${parents.length?`<div><i>Parents</i>${parents.map(link).join('')}</div>`:''}${spouses.length?`<div><i>Married</i>${spouses.map(link).join('')}</div>`:''}${children.length?`<div><i>Children</i>${children.map(link).join('')}</div>`:''}</div>
   <div class="acts"><button class="btn" data-trace="${id}">${mode.trace===id?'Clear the trace':'Trace the lineage'}</button><button class="btn ghost" data-zone="${p.group}">Show ${esc(z.name)}</button></div>`;
  $('panelBody').querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>focusPerson(b.dataset.go)));
  $('panelBody').querySelector('[data-trace]').addEventListener('click',()=>{if(mode.trace===id)clearTrace();else trace(id);openPerson(id);});
  $('panelBody').querySelector('[data-zone]').addEventListener('click',()=>flyToZone(p.group));
  showTab('person');document.body.classList.remove('sb-closed');
}
function trace(id){const anc=new Set(),des=new Set();const up=x=>{byId[x].parents.forEach(p=>{if(!anc.has(p)){anc.add(p);up(p);}});};const down=x=>{kids[x].forEach(k=>{if(!des.has(k)){des.add(k);down(k);}});};up(id);down(id);
  const lit=new Set([id,...anc,...des]);mode.trace=id;document.body.classList.add('tracing');
  document.querySelectorAll('.card').forEach(c=>c.classList.toggle('lit',lit.has(c.dataset.id)));
  document.querySelectorAll('.edge').forEach(e=>{const child=e.dataset.child;const parents=(e.dataset.parents||'').split('+');e.classList.toggle('lit',!!child&&lit.has(child)&&parents.some(p=>lit.has(p)));});
  $('traceNote').innerHTML=`Tracing <b>${esc(byId[id].name)}</b> — ${anc.size} ancestor${anc.size===1?'':'s'} back to the root, ${des.size} descendant${des.size===1?'':'s'} forward. <button class="lnk" id="clearTrace">clear</button>`;$('traceNote').hidden=false;$('clearTrace').addEventListener('click',clearTrace);}
function clearTrace(){mode.trace=null;document.body.classList.remove('tracing');document.querySelectorAll('.lit').forEach(e=>e.classList.remove('lit'));$('traceNote').hidden=true;}

/* ---------- sidebar: tracks, tribes, search ---------- */
const TRIBES=['reuben','simeon','levi','judah','dan','naphtali','gad','asher','issachar','zebulun','joseph','benjamin'];
function drawSidebar(){
  $('tracks').innerHTML=TRACKS.map((t,i)=>`<button class="track" data-i="${i}"><span class="tn">${t.n}</span><span><b>${esc(t.title)}</b><small>${esc(t.sub)}</small></span></button>`).join('');
  $('tracks').querySelectorAll('.track').forEach(b=>b.addEventListener('click',()=>{$('tracks').querySelectorAll('.track').forEach(x=>x.classList.toggle('on',x===b));const t=TRACKS[+b.dataset.i];const p=pos[t.focus];if(!p)return;
    tweenTo(viewAt(p.x+CARD.w/2+(t.dx||0),p.y+CARD.h/2+(t.dy||0),t.scale||0.6),900);}));
  $('tribes').innerHTML=TRIBES.map(t=>`<button data-tribe="${t}" style="--c:${DATA.groups[t].color}">${esc(byId[t].name)}</button>`).join('');
  $('tribes').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.tribe;const on=mode.tribe===t;mode.tribe=on?null:t;
    $('tribes').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.tribe===mode.tribe));document.body.classList.toggle('tribeview',!!mode.tribe);
    document.querySelectorAll('.zone').forEach(z=>z.classList.toggle('lit',z.dataset.zone===mode.tribe));document.querySelectorAll('.card').forEach(c=>c.classList.toggle('tlit',byId[c.dataset.id].group===mode.tribe));
    if(mode.tribe){flyToZone(t);openPerson(t);}}));
  $('sbToggle').addEventListener('click',()=>document.body.classList.toggle('sb-closed'));
  document.querySelectorAll('.sbtab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
  $('zoomIn').addEventListener('click',()=>zoomBy(1.3));$('zoomOut').addEventListener('click',()=>zoomBy(0.77));$('zoomFit').addEventListener('click',fitAll);
}
function showTab(k){document.querySelectorAll('.sbtab').forEach(b=>b.classList.toggle('on',b.dataset.tab===k));document.querySelectorAll('.sbpane').forEach(p=>p.hidden=p.dataset.pane!==k);}
function onSearch(e){const q=e.target.value.trim().toLowerCase();const box=$('searchOut');if(!q){box.innerHTML='';return;}
  const hits=DATA.people.filter(p=>p.name.toLowerCase().includes(q)||(p.meaning||'').toLowerCase().includes(q)).slice(0,12);
  box.innerHTML=hits.map(p=>`<button class="hit" data-go="${p.id}"><b>${esc(p.name)}</b><small>${esc(DATA.groups[p.group].name)} · gen ${p.gen}</small></button>`).join('')||'<div class="none">No one by that name on the tree yet.</div>';
  box.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{focusPerson(b.dataset.go);box.innerHTML='';e.target.value='';}));}
boot();
