/* ============================================================
   THE ROAD — community rooms, the live room, Bars!, reactions, review.
   Used by kj.js; everything here talks to Firestore through ctx.
   ------------------------------------------------------------
   Collections
     settings/live                 {on,title,sid,startedAt,platforms:{youtube,facebook,twitch},videoId}
     live/{sid}                    {title,startedAt,endedAt,by,videoId}
     live/{sid}/messages/{mid}     message
     rooms/{rid}                   {name,desc,order,kind,createdAt}
     rooms/{rid}/messages/{mid}    message
     bars/{id}                     {uid,name,photo,quote,note,week,source,videoId,t,at,emoji,reactions,reactedBy,hidden}
     reports/{id}                  {path,text,uid,name,reason,at,status}
   message = {uid,name,photo,text,at,image?:{data,status:'pending'|'ok'},reactions:{},reactedBy:{},hidden,bar?:{t,videoId}}
   ============================================================ */
export const BARS_EMOJIS=['🍫','📶','🍾','🍷','🍸','🍹','📊','🧼','🍻','🍺'];
export const BARS_WORDS=['Bars!','BARS','barz','baaars','🍫🍫🍫','bars.','B A R S','Bars, friend.','that\'s bars'];
export const VOCAB=[
  {k:'island',e:'🏝️',hint:'alone on this one'},
  {k:'wall',e:'🧱',hint:'a wall for me'},
  {k:'mute',e:'🔇',hint:'can\'t take more of this'},
  {k:'lock',e:'🔒',hint:'the gate\'s locked'},
  {k:'shush',e:'🤫',hint:'not out loud'},
  {k:'stop',e:'🛑',hint:'hard no'},
  {k:'point',e:'👉',hint:'you said otherwise — two clips, please'},
  {k:'fence',e:'🤺',hint:'on guard'},
  {k:'puzzle',e:'🧩',hint:'lost me here'},
  {k:'scissors',e:'✂️',hint:'that cut a tie'},
  {k:'boom',e:'💥',hint:'that blew it apart'}];
const ALL_EMOJI=new Set([...BARS_EMOJIS,...VOCAB.map(v=>v.e)]);
const DEFAULT_ROOMS=[
  {id:'campfire',name:'The Campfire',desc:'Say good evening. Anything and everything — the fire where the walkers gather at night.',order:1,kind:'general'},
  {id:'thisweek',name:'This week',desc:'The lesson on the road right now.',order:2,kind:'week'},
  {id:'open',name:'In the open',desc:'Disagree, push back, ask for more — where everyone can see it. Transparency lives here.',order:3,kind:'open'},
  {id:'bars',name:'Bars',desc:'The lines that hit. Collect them; the best ones become the reels.',order:4,kind:'bars'}];
/* a short word filter — the road stays clean; the teacher reviews the rest */
const FOUL=/\b(f+u+c*k+\w*|s+h+i+t+\w*|b+i+t+c+h+\w*|a+s+s+h+o+l+e+\w*|d+a+m+n+\w*|c+u+n+t+\w*|d+i+c+k+h?e?a?d?|p+u+s+s+y+|n+i+g+g+(a|e)+r?\w*|f+a+g+g?o?t?\w*|w+h+o+r+e+\w*|s+l+u+t+\w*|b+a+s+t+a+r+d+\w*|m+o+t+h+e+r+f+\w*|c+o+c+k+s+\w*|t+w+a+t+|r+e+t+a+r+d+\w*)\b/i;
export const cleanText=t=>!FOUL.test(String(t||''));
export const fmtTime=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':':'')+String(m).padStart(h?2:1,'0')+':'+String(x).padStart(2,'0');};

export function initSocial(ctx){
  const {el,esc,when,go,showSeat,LINKS,resizeImage}=ctx;const verse=ctx.verse||(()=>'');
  const fb=()=>ctx.fb(),db=()=>ctx.db(),user=()=>ctx.user(),profile=()=>ctx.profile(),isAdmin=()=>ctx.isAdmin(),CONFIG=()=>ctx.config();
  const me=()=>({uid:user().uid,name:(profile()&&profile().name)||user().displayName||'Friend',photo:(profile()&&profile().photo)||''});
  let LIVE={on:false},unsubLive=null,liveListeners=[],unsubRoom=null,unsubRooms=null,ROOMS=[],activeRoom='campfire',pendingImg=null,ytPlayer=null,ytReady=false;

  /* ---------- live status (everyone) ---------- */
  function watchLive(){if(!fb()||unsubLive)return;const {doc,onSnapshot}=fb().fsM;
    unsubLive=onSnapshot(doc(db(),'settings','live'),s=>{const prev=LIVE.on;LIVE=s.exists()?s.data():{on:false};try{const b=el('speakLine');if(b&&LIVE.on===prev)b.outerHTML=speakersLineHTML();const q=el('handsQueue');if(q)q.innerHTML=handsHTML();}catch(e){}liveListeners.forEach(f=>f(LIVE,prev));},()=>{});}
  function onLive(f){liveListeners.push(f);}
  const live=()=>LIVE;

  /* ---------- rooms ---------- */
  async function ensureRooms(){if(!fb())return;const {collection,getDocs,doc,setDoc}=fb().fsM;
    if(unsubRooms)return;const {onSnapshot,query,orderBy}=fb().fsM;
    unsubRooms=onSnapshot(query(collection(db(),'rooms'),orderBy('order')),qs=>{ROOMS=[];qs.forEach(d=>ROOMS.push({id:d.id,...d.data()}));if(!ROOMS.length&&isAdmin()){DEFAULT_ROOMS.forEach(r=>setDoc(doc(db(),'rooms',r.id),{...r,createdAt:Date.now()},{merge:true}));}drawRooms();},()=>{});}
  function roomsList(){return ROOMS.length?ROOMS:DEFAULT_ROOMS;}

  /* ---------- message rendering (rooms + live) ---------- */
  function reactionsHTML(m,path){const r=m.reactions||{};let bars=0,barsE=new Set();const chips=[];
    for(const e in r){if(!r[e])continue;if(BARS_EMOJIS.includes(e)){bars+=r[e];barsE.add(e);}else{const v=VOCAB.find(x=>x.e===e);chips.push(`<button class="rx" title="${v?esc(v.hint):''}" onclick="react('${path}','${e}')">${e} <b>${r[e]}</b></button>`);}}
    const mine=(m.reactedBy||{})[user()?user().uid:'']||'';
    return `<div class="rxrow">${bars?`<button class="rx bars ${BARS_EMOJIS.includes(mine)?'on':''}" title="Bars!" onclick="react('${path}','${BARS_EMOJIS[Math.floor(Math.random()*BARS_EMOJIS.length)]}')">${[...barsE].slice(0,3).join('')} Bars! <b>${bars}</b></button>`:''}${chips.join('')}<button class="rx add" onclick="openReact(this,'${path}')" title="React">＋</button></div>`;}
  function msgHTML(m,path,opts={}){const u=user();const mine=u&&m.uid===u.uid;const adm=isAdmin();
    if(m.hidden&&!adm)return '';
    const img=m.image?((m.image.status==='ok'||mine||adm)?`<div class="mimg ${m.image.status!=='ok'?'pend':''}"><img src="${m.image.data}" alt="" onclick="openLightbox(this.src,'')">${m.image.status!=='ok'?`<span>${mine?'waiting for the teacher\'s okay — only you can see it':'pending review'}</span>${adm?` <button class="btn sm" onclick="approveImage('${path}')">Approve</button>`:''}`:''}</div>`:`<div class="mimg pend"><span>📷 picture pending review</span></div>`):'';
    const bar=m.bar?`<div class="barstamp">🍫 Bars! at <b>${fmtTime(m.bar.t)}</b>${m.bar.videoId?` · <a href="https://youtu.be/${esc(m.bar.videoId)}?t=${Math.floor(m.bar.t)}" target="_blank" rel="noopener">open the clip ↗</a>`:''}</div>`:'';
    return `<div class="cm ${mine?'mine':''} ${m.hidden?'hiddenmsg':''}" id="m-${path.replace(/\//g,'_')}">${m.photo?`<img class="av" src="${m.photo}" alt="">`:`<div class="av">${esc((m.name||'?').charAt(0).toUpperCase())}</div>`}
      <div class="body"><div class="head"><b>${esc(m.name||'Friend')}</b>${m.uid&&ctx.adminUids&&ctx.adminUids().includes(m.uid)?'<span class="teacher">teacher</span>':''}<span class="when">${when(m.at)}</span>${m.hidden?'<span class="teacher" style="color:#F2A3A8">hidden</span>':''}</div>
      ${m.text?`<div class="txt">${esc(m.text).replace(/\n/g,'<br>')}</div>`:''}${bar}${img}${reactionsHTML(m,path)}
      <div class="tools">${opts.noReport?'':`<button onclick="reportMsg('${path}')" title="Flag for the teacher">⚑</button>`}${adm?`<button onclick="hideMsg('${path}',${m.hidden?'false':'true'})" title="${m.hidden?'Unhide':'Hide'}">${m.hidden?'👁':'🙈'}</button>`:''}${mine?`<button onclick="delMsg('${path}')" title="Delete my message">🗑</button>`:''}</div></div></div>`;}
  window.openReact=(btn,path)=>{document.querySelectorAll('.rxpick').forEach(p=>p.remove());const p=document.createElement('div');p.className='rxpick';
    p.innerHTML=`<div class="rxgrp"><span class="rxlab">Bars!</span>${BARS_EMOJIS.map(e=>`<button onclick="react('${path}','${e}')">${e}</button>`).join('')}</div><div class="rxgrp"><span class="rxlab">otherwise…</span>${VOCAB.map(v=>`<button title="${esc(v.hint)}" onclick="react('${path}','${v.e}')">${v.e}<small>${esc(v.hint)}</small></button>`).join('')}</div>`;
    btn.parentElement.appendChild(p);setTimeout(()=>document.addEventListener('click',function h(e){if(!p.contains(e.target)){p.remove();document.removeEventListener('click',h);}}),10);};
  window.react=async(path,emoji)=>{if(!user()){showSeat();return;}if(!ALL_EMOJI.has(emoji))return;const {doc,runTransaction}=fb().fsM;document.querySelectorAll('.rxpick').forEach(p=>p.remove());
    try{await runTransaction(db(),async tx=>{const ref=doc(db(),...path.split('/'));const s=await tx.get(ref);if(!s.exists())return;const d=s.data();const r={...(d.reactions||{})},by={...(d.reactedBy||{})};const uid=user().uid;const prev=by[uid];
      if(prev){r[prev]=Math.max(0,(r[prev]||1)-1);if(!r[prev])delete r[prev];}
      if(prev===emoji){delete by[uid];}else{by[uid]=emoji;r[emoji]=(r[emoji]||0)+1;}
      tx.update(ref,{reactions:r,reactedBy:by});});}catch(e){alert('Could not react — '+(e.message||e));}};
  window.reportMsg=async path=>{if(!user()){showSeat();return;}const reason=prompt('What should the teacher look at? (a few words)');if(reason===null)return;const {collection,addDoc,doc,getDoc}=fb().fsM;
    let text='';try{const s=await getDoc(doc(db(),...path.split('/')));text=(s.data()||{}).text||'';}catch(e){}
    await addDoc(collection(db(),'reports'),{path,text:text.slice(0,300),uid:user().uid,name:me().name,reason:reason.trim().slice(0,200),at:Date.now(),status:'open'});alert('Flagged. The teacher will look at it.');};
  window.hideMsg=async(path,hide)=>{const {doc,updateDoc}=fb().fsM;await updateDoc(doc(db(),...path.split('/')),{hidden:!!hide});};
  window.delMsg=async path=>{if(!confirm('Delete this message?'))return;const {doc,deleteDoc}=fb().fsM;await deleteDoc(doc(db(),...path.split('/')));};
  window.approveImage=async path=>{const {doc,updateDoc}=fb().fsM;await updateDoc(doc(db(),...path.split('/')),{'image.status':'ok'});};

  /* ---------- image screening (in the browser, then the teacher) ---------- */
  let nsfwModel=null;
  function loadScript(src){return new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`))return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
  async function screenImage(dataUrl){
    if(!nsfwModel){for(const s of ['/assets/vendor/tf.min.js','/assets/vendor/nsfw/group1-shard1of1.min.js','/assets/vendor/nsfw/model.min.js','/assets/vendor/nsfwjs.min.js'])await loadScript(s);try{window.tf.enableProdMode();}catch(e){}nsfwModel=await window.nsfwjs.load();}
    const img=new Image();await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src=dataUrl;});
    const p=await nsfwModel.classify(img);const s={};p.forEach(x=>s[x.className]=x.probability);
    const bad=(s.Porn||0)>0.22||(s.Hentai||0)>0.22||(s.Sexy||0)>0.45;return {ok:!bad,scores:s};}
  window.attachRoomImage=async ev=>{const f=ev.target.files&&ev.target.files[0];ev.target.value='';if(!f||!f.type.startsWith('image/'))return;const st=el('imgStatus');if(st)st.textContent='Checking the picture…';
    try{const data=await resizeImage(f,1200,360000);const r=await screenImage(data);if(!r.ok){pendingImg=null;if(st)st.textContent='That picture can\'t go on the road.';return;}pendingImg={data,status:'pending'};if(st)st.innerHTML='Picture attached — it goes to the teacher for a look before everyone sees it. <button class="btn sm ghost" onclick="dropRoomImage()">remove</button>';}
    catch(e){pendingImg=null;if(st)st.textContent='Could not check the picture right now — try again in a moment.';}};
  window.dropRoomImage=()=>{pendingImg=null;const st=el('imgStatus');if(st)st.textContent='';};

  /* ---------- composer (rooms + live) ---------- */
  function composerHTML(placeholder,extra=''){return `<div class="composer"><div id="imgStatus" style="font-size:11.5px;color:var(--mist-dim)"></div><div class="row"><button class="iconbtn" onclick="el('roomImg').click()" title="Add a picture (it is checked, then reviewed)">📷</button><input type="file" id="roomImg" accept="image/*" style="display:none" onchange="attachRoomImage(event)"><textarea id="roomText" rows="1" placeholder="${esc(placeholder)}" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendRoom();}"></textarea>${extra}<button class="btn" onclick="sendRoom()">Send</button></div><div style="font-size:11px;color:var(--mist-dim)">Enter sends · Shift+Enter for a new line · keep it kind — the teacher reads everything</div></div>`;}
  let sendTarget=null; // {col:['rooms',rid,'messages']} or live
  window.sendRoom=async(extraFields)=>{if(!user()){showSeat();return;}const ta=el('roomText');const t=(ta?ta.value:'').trim();if(!t&&!pendingImg)return;if(!cleanText(t)){alert('Keep it clean on the road, friend — try that again.');return;}
    if(!sendTarget)return;const {collection,addDoc}=fb().fsM;const m={...me(),text:t.slice(0,2000),at:Date.now(),reactions:{},reactedBy:{},hidden:false};if(pendingImg)m.image=pendingImg;if(extraFields&&typeof extraFields==='object')Object.assign(m,extraFields);
    try{await addDoc(collection(db(),...sendTarget),m);if(ta)ta.value='';pendingImg=null;const st=el('imgStatus');if(st)st.textContent='';}catch(e){alert('Could not send — '+(e.message||e));}};

  /* ---------- COMMUNITY page ---------- */
  function renderCommunity(A){
    if(!user()){A.innerHTML=`<div class="lockmsg"><div class="big">🪑</div><p>The Community is for those who have joined the journey.</p><br><button class="btn" onclick="showSeatModal()">Join the journey</button></div>`;return;}
    ensureRooms();
    A.innerHTML=`<div class="hero" style="padding-top:12px"><h1 style="font-size:24px">Community</h1><div class="always">One road, many walkers. Rooms by subject; react with the house vocabulary; flag anything that isn't kind. Pushback belongs <b>in the open</b>, where everyone can see it.</div>${verse('burn')}</div>
     <div class="cgrid" id="cgrid"><div class="clist"><div class="top"><b>ROOMS</b>${isAdmin()?'<button class="btn sm" onclick="newRoom()">+ Room</button>':''}</div><div id="roomList" style="flex:1;overflow-y:auto"></div>
       <div class="vocab"><div class="rxlab">the house vocabulary</div><div class="vgrid2">${[{e:'🍫',hint:'Bars!'},...VOCAB].map(v=>`<span title="${esc(v.hint)}">${v.e} <small>${esc(v.hint)}</small></span>`).join('')}</div></div></div>
      <div class="cthread" id="roomPane"><div class="lockmsg" style="padding:60px 20px">Loading…</div></div></div>`;
    drawRooms();openRoom(activeRoom);
  }
  function drawRooms(){const L=el('roomList');if(!L)return;const cw=CONFIG().currentWeek||1;
    L.innerHTML=roomsList().map(r=>`<div class="citem ${activeRoom===r.id?'on':''}" onclick="openRoom('${r.id}')"><div class="av" style="background:${r.kind==='bars'?'var(--gold-500)':r.kind==='open'?'var(--blue-500)':'var(--night-600)'};color:${r.kind==='open'?'#fff':'var(--night-900)'}">${r.kind==='bars'?'🍫':r.kind==='open'?'✋':r.kind==='week'?String(cw):'✦'}</div><div class="t"><b>${esc(r.name)}</b><span>${esc(r.desc||'')}</span></div></div>`).join('');}
  window.newRoom=async()=>{const name=prompt('Room name');if(!name)return;const desc=prompt('One line about it')||'';const {doc,setDoc}=fb().fsM;const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||('room'+Date.now());await setDoc(doc(db(),'rooms',id),{name:name.trim(),desc:desc.trim(),order:50+roomsList().length,kind:'general',createdAt:Date.now()});};
  window.openRoom=rid=>{activeRoom=rid;drawRooms();const P=el('roomPane');if(!P)return;const r=roomsList().find(x=>x.id===rid)||DEFAULT_ROOMS[0];
    if(unsubRoom){unsubRoom();unsubRoom=null;}
    if(r.kind==='bars'){renderBarsRoom(P);return;}
    sendTarget=['rooms',rid,'messages'];
    P.innerHTML=`<div class="top"><div><b>${esc(r.name)}</b><small>${esc(r.desc||'')}</small></div></div><div class="chat" id="roomChat"><div class="notice">Loading…</div></div>${composerHTML(r.kind==='open'?'Say it in the open — what do you see differently?':'Write to the walkers…')}`;
    const {collection,query,orderBy,limitToLast,onSnapshot}=fb().fsM;
    unsubRoom=onSnapshot(query(collection(db(),'rooms',rid,'messages'),orderBy('at'),limitToLast(300)),qs=>{let h='';qs.forEach(d=>{h+=msgHTML(d.data(),`rooms/${rid}/messages/${d.id}`);});const box=el('roomChat');if(box){const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;box.innerHTML=h||'<div class="notice">Nothing here yet — say good evening.</div>';if(atBottom)box.scrollTop=box.scrollHeight;}},e=>{const box=el('roomChat');if(box)box.innerHTML=`<div class="notice">Could not open the room (${esc(e.code||e.message)}).</div>`;});};

  /* ---------- BARS — the collected lines ---------- */
  function barHTML(b,id){const u=user();const mine=u&&b.uid===u.uid;const path=`bars/${id}`;if(b.hidden&&!isAdmin())return '';
    return `<div class="bar ${mine?'mine':''}"><div class="head">${b.photo?`<img class="av" src="${b.photo}" alt="">`:`<div class="av">${esc((b.name||'?').charAt(0).toUpperCase())}</div>`}<b>${esc(b.name||'Friend')}</b><span class="when">${when(b.at)}</span><span class="src">${b.source==='live'?'live':b.week?`week ${b.week}`:''}${b.t?' · '+fmtTime(b.t):''}</span></div>
      ${b.quote?`<div class="q">“${esc(b.quote)}”</div>`:''}${b.note?`<div class="note">${esc(b.note)}</div>`:''}${b.videoId?`<a class="clip" href="https://youtu.be/${esc(b.videoId)}?t=${Math.floor(b.t||0)}" target="_blank" rel="noopener">▶ the moment</a>`:''}
      ${reactionsHTML(b,path)}<div class="tools">${mine?`<button onclick="delBar('${id}')" title="Remove">🗑</button>`:''}${isAdmin()?`<button onclick="hideMsg('${path}',${b.hidden?'false':'true'})">${b.hidden?'👁':'🙈'}</button>`:''}</div></div>`;}
  function renderBarsRoom(P){P.innerHTML=`<div class="top"><div><b>Bars</b><small>the lines that hit — collect them, react to them, the best become the reels</small></div></div><div class="chat" id="barsFeed"><div class="notice">Loading…</div></div>
     <div class="composer"><div class="row"><textarea id="barQuote" rows="1" placeholder="The line that hit you (a few words, as you heard it)"></textarea></div><div class="row"><input type="text" id="barNote" placeholder="Why it hit (optional)"><input type="text" id="barWhen" placeholder="week or minute (optional)" style="max-width:190px"><button class="btn" onclick="addBarFromRoom()">${BARS_EMOJIS[Math.floor(Math.random()*BARS_EMOJIS.length)]} Bars!</button></div></div>`;
    const {collection,query,orderBy,limitToLast,onSnapshot}=fb().fsM;
    unsubRoom=onSnapshot(query(collection(db(),'bars'),orderBy('at'),limitToLast(200)),qs=>{let h='';qs.forEach(d=>{h+=barHTML(d.data(),d.id);});const box=el('barsFeed');if(box){box.innerHTML=h||'<div class="notice">No bars yet. When something hits — you know what to do.</div>';box.scrollTop=box.scrollHeight;}},e=>{const box=el('barsFeed');if(box)box.innerHTML=`<div class="notice">Could not load (${esc(e.code||e.message)}).</div>`;});}
  async function addBar(fields){if(!user()){showSeat();return null;}const {collection,addDoc}=fb().fsM;const b={...me(),quote:'',note:'',week:CONFIG().currentWeek||1,source:'week',videoId:'',t:0,at:Date.now(),emoji:BARS_EMOJIS[Math.floor(Math.random()*BARS_EMOJIS.length)],reactions:{},reactedBy:{},hidden:false,...fields};
    if(!cleanText(b.quote+' '+b.note)){alert('Keep it clean, friend.');return null;}const ref=await addDoc(collection(db(),'bars'),b);return ref.id;}
  window.addBarFromRoom=async()=>{const q=(el('barQuote').value||'').trim(),n=(el('barNote').value||'').trim(),w=(el('barWhen').value||'').trim();if(!q&&!n)return;const wk=parseInt(w);const t=/:/.test(w)?w.split(':').reduce((a,x)=>a*60+parseInt(x||0),0):0;
    const id=await addBar({quote:q.slice(0,300),note:n.slice(0,500),week:isNaN(wk)?(CONFIG().currentWeek||1):wk,t,source:t?'live':'week'});if(id){el('barQuote').value='';el('barNote').value='';el('barWhen').value='';}};
  window.barsFromSelection=async(week)=>{const sel=(window.getSelection&&String(window.getSelection()))||'';const q=prompt('Bars! — the line that hit (edit if you like):',sel.trim().slice(0,300));if(q===null)return;const n=prompt('Why it hit? (optional)')||'';const id=await addBar({quote:q.trim().slice(0,300),note:n.trim().slice(0,500),week,source:'week'});if(id)toast(`${BARS_EMOJIS[Math.floor(Math.random()*BARS_EMOJIS.length)]} Bars! — kept on your page and shared on the road.`);};
  window.delBar=async id=>{if(!confirm('Remove this bar?'))return;const {doc,deleteDoc}=fb().fsM;await deleteDoc(doc(db(),'bars',id));};
  function toast(t){let x=el('toast');if(!x){x=document.createElement('div');x.id='toast';document.body.appendChild(x);}x.textContent=t;x.classList.add('show');clearTimeout(x._t);x._t=setTimeout(()=>x.classList.remove('show'),2600);}
  async function myBarsHTML(){if(!fb()||!user())return '';const {collection,query,where,getDocs}=fb().fsM;const qs=await getDocs(query(collection(db(),'bars'),where('uid','==',user().uid)));const out=[];qs.forEach(d=>out.push({id:d.id,...d.data()}));out.sort((a,b)=>b.at-a.at);
    return out.length?out.map(b=>barHTML(b,b.id)).join(''):'<div class="notice">No bars yet. Highlight a line on a lesson and hit <b>Bars!</b> — or catch a moment on the live.</div>';}

  /* ---------- LIVE page ---------- */
  function ytEmbed(videoId){const src=videoId?`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&autoplay=1&rel=0`:`https://www.youtube.com/embed/live_stream?channel=UCeYEiL9ejOcfbtYrhP87odg&enablejsapi=1&autoplay=1`;return `<div class="ytwrap"><iframe id="ytLive" src="${src}" title="Good evening, friends — live" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;}
  function ytTime(){try{return ytPlayer&&ytPlayer.getCurrentTime?ytPlayer.getCurrentTime():0;}catch(e){return 0;}}
  function bindYT(){if(!window.YT||!window.YT.Player){loadScript('https://www.youtube.com/iframe_api').catch(()=>{});window.onYouTubeIframeAPIReady=()=>bindYT();return;}try{ytPlayer=new window.YT.Player('ytLive',{events:{onReady:()=>{ytReady=true;}}});}catch(e){}}
  function renderLive(A){const L=LIVE;const cw=CONFIG().currentWeek||1;
    const platforms=L.platforms||{youtube:true,facebook:true,twitch:true};
    const chooser=`<div class="platforms"><span class="rxlab">watch where you like</span><a class="pl yt" href="${LINKS.live}" target="_blank" rel="noopener">▶ YouTube</a>${platforms.facebook?`<a class="pl fb" href="${LINKS.facebook}" target="_blank" rel="noopener">f Facebook</a>`:''}${platforms.twitch?`<a class="pl tw" href="${LINKS.twitch}" target="_blank" rel="noopener">◉ Twitch</a>`:''}<span style="font-size:11.5px;color:var(--mist-dim)">the chat lives here, whichever you pick</span></div>`;
    A.innerHTML=`<div class="hero" style="padding-top:12px"><h1 style="font-size:24px">${L.on?'<span class="livepill on">● LIVE</span> ':''}${L.on?esc(L.title||'Jonathan is on'):'Live'}</h1><div class="always">${L.on?'The lights are on. Watch here, talk here, and when it hits — <b>Bars!</b>':'Not live right now. When the lights come on, this page — and a banner on every page — will tell you. Past lives and their chats are below.'}</div>${verse('epistle')}</div>
     ${L.on||L.videoId?ytEmbed(L.videoId):`<div class="ytwrap idle">${ytEmbed('')}</div>`}
     ${chooser}
     ${L.on?speakersLineHTML():''}
     ${isAdmin()?adminLiveHTML():''}
     ${L.on?`<div class="cthread" style="margin-top:14px"><div class="top"><div><b>Live chat</b><small>everyone on the road, right now</small></div><button class="btn" onclick="barsLive()">🍫 Bars! at <span id="barsClock">0:00</span></button></div><div class="chat" id="roomChat" style="max-height:48vh"><div class="notice">Loading…</div></div>${user()?composerHTML('Say it to the room…'):`<div class="notice"><button class="btn" onclick="showSeatModal()">Join the journey</button> to talk in the room.</div>`}</div>`:''}
     <div class="panel" style="margin-top:14px"><h2>Past lives</h2><p class="sub">what people said, kept — read it back any time</p><div id="pastLives">Loading…</div></div>`;
    if(L.on&&L.sid){sendTarget=['live',L.sid,'messages'];if(unsubRoom){unsubRoom();unsubRoom=null;}const {collection,query,orderBy,limitToLast,onSnapshot}=fb().fsM;
      unsubRoom=onSnapshot(query(collection(db(),'live',L.sid,'messages'),orderBy('at'),limitToLast(400)),qs=>{let h='';qs.forEach(d=>{h+=msgHTML(d.data(),`live/${L.sid}/messages/${d.id}`);});const box=el('roomChat');if(box){const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;box.innerHTML=h||'<div class="notice">The room is open. Say good evening.</div>';if(atBottom)box.scrollTop=box.scrollHeight;}});
      clearInterval(window._barsClock);window._barsClock=setInterval(()=>{const c=el('barsClock');if(c)c.textContent=fmtTime(ytTime());},1000);}
    watchSpeakers();if(L.on&&L.sid)watchHands();
    setTimeout(bindYT,300);loadPastLives();
  }
  window.barsLive=async()=>{if(!user()){showSeat();return;}const t=ytTime();const q=prompt(`Bars! at ${fmtTime(t)} — what was the line? (optional)`)||'';const id=await addBar({quote:q.trim().slice(0,300),source:'live',videoId:LIVE.videoId||'',t,week:CONFIG().currentWeek||1});
    if(id&&sendTarget){const ta=el('roomText');if(ta)ta.value=q?`${BARS_EMOJIS[Math.floor(Math.random()*BARS_EMOJIS.length)]} Bars! “${q.trim().slice(0,120)}”`:`${BARS_EMOJIS[Math.floor(Math.random()*BARS_EMOJIS.length)]} Bars!`;await window.sendRoom({bar:{t,videoId:LIVE.videoId||''}});toast('Kept. That one is yours now.');}};
  async function loadPastLives(){const box=el('pastLives');if(!box||!fb())return;try{const {collection,query,orderBy,limit,getDocs}=fb().fsM;const qs=await getDocs(query(collection(db(),'live'),orderBy('startedAt','desc'),limit(30)));let h='';
      qs.forEach(d=>{const v=d.data();h+=`<div class="noteCard" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><b>${esc(v.title||'Live')}</b><div style="font-size:12px;color:var(--mist-dim)">${new Date(v.startedAt).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}${v.endedAt?' → '+new Date(v.endedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):' · still on'}</div></div><button class="btn ghost sm" onclick="replayLive('${d.id}')">Read the chat</button></div>`;});
      box.innerHTML=h||'<div class="notice">No lives yet. The first one is coming.</div>';}catch(e){box.innerHTML=`<div class="notice">Could not load (${esc(e.code||e.message)}).</div>`;}}
  window.replayLive=async sid=>{const box=el('pastLives');const {collection,query,orderBy,getDocs,doc,getDoc}=fb().fsM;const s=await getDoc(doc(db(),'live',sid));const qs=await getDocs(query(collection(db(),'live',sid,'messages'),orderBy('at')));let h='';qs.forEach(d=>{h+=msgHTML(d.data(),`live/${sid}/messages/${d.id}`,{noReport:true});});
    box.innerHTML=`<div class="notice"><b>${esc((s.data()||{}).title||'Live')}</b> — ${qs.size} message${qs.size===1?'':'s'} <button class="btn ghost sm" onclick="renderLiveAgain()">back</button></div><div class="chat" style="max-height:60vh">${h||'<div class="notice">Nobody wrote during this one.</div>'}</div>`;};
  window.renderLiveAgain=()=>renderLive(el('app'));
  /* ---------- the speakers' line: the only way onto the air is through this page ----------
     Regular speakers (settings/speakers.emails) and anyone the teacher waves in (settings/live.admitted) get the
     join link (a VDO.Ninja room the teacher pulls into OBS). Everyone else can raise a hand: live/{sid}/hands/{uid}. */
  let SPEAKERS=[],unsubSpeakers=null,unsubHands=null,HANDS=[];
  function watchSpeakers(){if(!fb()||unsubSpeakers)return;const {doc,onSnapshot}=fb().fsM;unsubSpeakers=onSnapshot(doc(db(),'settings','speakers'),s=>{SPEAKERS=(s.exists()?(s.data().emails||[]):[]).map(e=>String(e).toLowerCase());const b=el('speakLine');if(b)b.outerHTML=speakersLineHTML();},()=>{});}
  const isSpeaker=()=>!!user()&&(SPEAKERS.includes(String(user().email||'').toLowerCase())||((LIVE.admitted||[]).includes(user().uid)));
  function speakersLineHTML(){const L=LIVE;if(!user())return `<div class="panel" id="speakLine" style="margin-top:14px"><b>The speakers' line</b><div class="sub">Regulars come on the air from here when the study is on. <button class="btn ghost sm" onclick="showSeatModal()">Join the journey</button> to raise a hand.</div></div>`;
    const mine=HANDS.find(h=>h.uid===user().uid);
    if(isSpeaker())return `<div class="panel" id="speakLine" style="margin-top:14px;border-color:rgba(217,164,65,.5)"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><b>🎙 You're on the speakers' line</b><div class="sub">When you join, your voice and camera go to the teacher's desk first — he brings you on air when it's your turn. Headphones on, please; keep this tab muted.</div></div>${L.speakLink?`<a class="btn" href="${esc(L.speakLink)}" target="_blank" rel="noopener">Join the line ↗</a>`:`<span class="notice">The line opens when the teacher posts the link.</span>`}</div></div>`;
    return `<div class="panel" id="speakLine" style="margin-top:14px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><b>Want to speak?</b><div class="sub">${mine?'Your hand is up. When the teacher waves you in, a Join button appears right here.':'Raise a hand and the teacher sees it at his desk. Regulars get waved in first; everyone gets a turn when there is one.'}</div></div>${mine?`<button class="btn ghost" onclick="lowerHand()">Lower my hand</button>`:`<button class="btn" onclick="raiseHand()">✋ Raise my hand</button>`}</div></div>`;}
  function watchHands(){if(!fb()||!LIVE.sid)return;if(unsubHands){unsubHands();unsubHands=null;}const {collection,query,orderBy,onSnapshot,doc}=fb().fsM;const refresh=()=>{const b=el('speakLine');if(b)b.outerHTML=speakersLineHTML();const q=el('handsQueue');if(q)q.innerHTML=handsHTML();};
    if(isAdmin())unsubHands=onSnapshot(query(collection(db(),'live',LIVE.sid,'hands'),orderBy('at')),qs=>{HANDS=[];qs.forEach(d=>HANDS.push({id:d.id,...d.data()}));refresh();},()=>{});
    else if(user())unsubHands=onSnapshot(doc(db(),'live',LIVE.sid,'hands',user().uid),d=>{HANDS=d.exists()?[{id:d.id,...d.data()}]:[];refresh();},()=>{});}
  window.raiseHand=async()=>{if(!user()){showSeat();return;}if(!LIVE.sid)return;const {doc,setDoc}=fb().fsM;await setDoc(doc(db(),'live',LIVE.sid,'hands',user().uid),{...me(),at:Date.now()});toast('Hand up. Keep watching — the teacher sees it.');};
  window.lowerHand=async()=>{if(!user()||!LIVE.sid)return;const {doc,deleteDoc}=fb().fsM;await deleteDoc(doc(db(),'live',LIVE.sid,'hands',user().uid));};
  function handsHTML(){if(!HANDS.length)return '<div class="notice">No hands up.</div>';return HANDS.map(h=>`<div class="noteCard" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div>${h.photo?`<img src="${esc(h.photo)}" style="width:26px;height:26px;border-radius:50%;vertical-align:middle;margin-right:6px">`:''}<b>${esc(h.name)}</b> <small style="color:var(--mist-dim)">${when(h.at)}${(LIVE.admitted||[]).includes(h.uid)?' · waved in':''}</small></div><div style="display:flex;gap:6px">${(LIVE.admitted||[]).includes(h.uid)?`<button class="btn ghost sm" onclick="dismissHand('${h.uid}')">Off the line</button>`:`<button class="btn sm" onclick="admitHand('${h.uid}')">Wave in</button><button class="btn ghost sm" onclick="dismissHand('${h.uid}')">Not now</button>`}</div></div>`).join('');}
  window.admitHand=async uid=>{const {doc,updateDoc,arrayUnion}=fb().fsM;await updateDoc(doc(db(),'settings','live'),{admitted:arrayUnion(uid)});};
  window.dismissHand=async uid=>{const {doc,updateDoc,arrayRemove,deleteDoc}=fb().fsM;try{await updateDoc(doc(db(),'settings','live'),{admitted:arrayRemove(uid)});}catch(e){}if(LIVE.sid){try{await deleteDoc(doc(db(),'live',LIVE.sid,'hands',uid));}catch(e){}}};
  window.saveSpeakLink=async()=>{const {doc,updateDoc}=fb().fsM;const v=(el('speakLink').value||'').trim();await updateDoc(doc(db(),'settings','live'),{speakLink:v});toast(v?'The line is open.':'The line is closed.');};
  window.saveSpeakers=async()=>{const {doc,setDoc}=fb().fsM;const emails=(el('speakerEmails').value||'').split(/[\s,;]+/).map(e=>e.trim().toLowerCase()).filter(e=>e.includes('@'));await setDoc(doc(db(),'settings','speakers'),{emails,updatedAt:Date.now()});toast(`${emails.length} regular speaker${emails.length===1?'':'s'} kept.`);};
  function adminLiveHTML(){const L=LIVE;return `<div class="panel" style="margin-top:14px;border-color:rgba(217,164,65,.5)"><h2>Teacher's switch</h2><p class="sub">flip it when OBS is rolling; flip it back when you sign off</p>
    ${L.on?`<div class="notice">You are <b>live</b> since ${new Date(L.startedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} — “${esc(L.title||'')}”.</div><button class="btn danger" onclick="endLive()">End the live</button>
     <div class="field" style="margin-top:14px"><label>Speakers' line — the join link (your VDO.Ninja room invite; leave blank to close the line)</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input type="text" id="speakLink" value="${esc(L.speakLink||'')}" placeholder="https://vdo.ninja/?room=…&password=…" style="flex:1;min-width:240px"><button class="btn sm" onclick="saveSpeakLink()">Save</button></div></div>
     <div style="margin-top:12px"><b>Hands up</b><div class="sub">wave someone in and the Join button appears on their page; the regulars already have it</div><div id="handsQueue">${handsHTML()}</div></div>`
    :`<div class="field"><label>Title for tonight</label><input type="text" id="liveTitle" placeholder="e.g. Week ${CONFIG().currentWeek||1} — Two Kingdoms, One King" maxlength="90"></div><div class="field"><label>YouTube video ID (optional — leave blank to use the channel's live stream)</label><input type="text" id="liveVid" placeholder="e.g. dQw4w9WgXcQ" maxlength="20"></div>
     <div style="display:flex;gap:14px;flex-wrap:wrap;margin:6px 0 12px;font-size:13.5px"><label><input type="checkbox" id="plYt" checked> YouTube</label><label><input type="checkbox" id="plFb" checked> Facebook</label><label><input type="checkbox" id="plTw" checked> Twitch</label></div><button class="btn" onclick="goLive()">● Go live</button>`}
    <div class="field" style="margin-top:16px"><label>Regular speakers — the emails that always get the Join button when you are live (one per line)</label><textarea id="speakerEmails" rows="3" placeholder="friend@gmail.com">${esc(SPEAKERS.join('\n'))}</textarea><div style="margin-top:6px"><button class="btn ghost sm" onclick="saveSpeakers()">Keep the list</button></div></div></div>`;}
  window.goLive=async()=>{const {doc,setDoc,collection,addDoc}=fb().fsM;const title=(el('liveTitle').value||'').trim()||`Week ${CONFIG().currentWeek||1}`;const videoId=(el('liveVid').value||'').trim();
    const ref=await addDoc(collection(db(),'live'),{title,videoId,startedAt:Date.now(),endedAt:null,by:user().email});
    await setDoc(doc(db(),'settings','live'),{on:true,title,sid:ref.id,videoId,startedAt:Date.now(),platforms:{youtube:el('plYt').checked,facebook:el('plFb').checked,twitch:el('plTw').checked},admitted:[],speakLink:LIVE.speakLink||''});};
  window.endLive=async()=>{if(!confirm('End the live?'))return;const {doc,setDoc,updateDoc}=fb().fsM;if(LIVE.sid){try{await updateDoc(doc(db(),'live',LIVE.sid),{endedAt:Date.now()});}catch(e){}}await setDoc(doc(db(),'settings','live'),{on:false,title:LIVE.title||'',sid:LIVE.sid||'',videoId:LIVE.videoId||'',endedAt:Date.now(),platforms:LIVE.platforms||{},admitted:[],speakLink:LIVE.speakLink||''});};

  /* ---------- REVIEW (admin) ---------- */
  async function renderReview(P){const {collection,query,where,getDocs,collectionGroup,orderBy,limit}=fb().fsM;P.innerHTML=`<div class="panel"><h2>Review</h2><p class="sub">flags from the road and pictures waiting for your okay</p><div id="revFlags">Loading…</div></div><div class="panel" style="margin-top:14px"><h2>Pictures waiting</h2><div id="revImgs">Loading…</div></div>`;
    try{const qs=await getDocs(query(collection(db(),'reports'),where('status','==','open')));let h='';qs.forEach(d=>{const r=d.data();h+=`<div class="noteCard"><b>${esc(r.name||'someone')}</b> flagged: <i>${esc(r.reason)}</i><div style="font-size:13px;margin:6px 0;color:var(--mist)">“${esc(r.text||'(no text)')}”</div><div style="font-size:11px;color:var(--mist-dim)">${esc(r.path)} · ${when(r.at)}</div><div style="display:flex;gap:6px;margin-top:8px"><button class="btn danger sm" onclick="hideMsg('${esc(r.path)}',true);closeReport('${d.id}')">Hide it</button><button class="btn ghost sm" onclick="closeReport('${d.id}')">Leave it</button></div></div>`;});el('revFlags').innerHTML=h||'<div class="notice">Nothing flagged. Good company.</div>';}catch(e){el('revFlags').innerHTML=`<div class="notice">${esc(e.message||e)}</div>`;}
    try{const qs=await getDocs(query(collectionGroup(db(),'messages'),where('image.status','==','pending'),limit(50)));let h='';qs.forEach(d=>{const m=d.data();const path=d.ref.path;h+=`<div class="noteCard"><div style="display:flex;gap:12px;align-items:flex-start"><img src="${m.image.data}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;cursor:zoom-in" onclick="openLightbox(this.src,'')"><div><b>${esc(m.name)}</b> · ${when(m.at)}<div style="font-size:13px;color:var(--mist)">${esc(m.text||'')}</div><div style="display:flex;gap:6px;margin-top:8px"><button class="btn sm" onclick="approveImage('${path}');this.closest('.noteCard').remove()">Approve</button><button class="btn danger sm" onclick="hideMsg('${path}',true);this.closest('.noteCard').remove()">Hide</button></div></div></div></div>`;});el('revImgs').innerHTML=h||'<div class="notice">No pictures waiting.</div>';}catch(e){el('revImgs').innerHTML=`<div class="notice">${esc(e.message||e)}<br><small>If this mentions an index, open the link Firestore prints in the browser console once — it builds the index for the picture queue.</small></div>`;}}
  window.closeReport=async id=>{const {doc,updateDoc}=fb().fsM;await updateDoc(doc(db(),'reports',id),{status:'closed',closedAt:Date.now()});const P=el('adminPanel');if(P)renderReview(P);};

  function stop(){if(unsubRoom){unsubRoom();unsubRoom=null;}if(unsubHands){unsubHands();unsubHands=null;}clearInterval(window._barsClock);}
  return {watchLive,onLive,live,renderCommunity,renderLive,renderReview,myBarsHTML,addBar,stop,VOCAB,BARS_EMOJIS};
}
