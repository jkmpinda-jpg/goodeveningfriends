/* ============================================================
   THE KINGDOM JOURNEY — companion v4
   Good evening, friends · goodeveningfriends.com/kingdom-journey
   ------------------------------------------------------------
   v4: the 3D night road (trail3d.js), night→day ambience (ambience.js),
   welcome pop-up for guests (trail only until they take a seat),
   the Golden Line / the Royal Blue Line, real browser history
   (back button stays on the site), an extensive My Journey page with
   sound & animation switches, and admins managed from the Teacher's Desk.
   ============================================================ */
import {createTrail} from './trail3d.js';
import {Ambience} from './ambience.js';

const LINKS={
  site:'https://goodeveningfriends.com',
  hub:'https://goodeveningfriends.com/kingdom-journey',
  youtube:'https://www.youtube.com/@Goodeveningfriends7',
  live:'https://www.youtube.com/@Goodeveningfriends7/live',
  tiktok:'https://www.tiktok.com/@goodeveningfriend3',
  instagram:'https://www.instagram.com/goodeveningfriends_7/',
  threads:'https://www.threads.com/@goodeveningfriends_7',
  facebook:'https://www.facebook.com/goodeveningfriends7',
  twitch:'https://www.twitch.tv/goodeveningfriends7'
};
/* the two root admins can never be locked out; every other admin is added from the Teacher's Desk */
const ROOT_ADMINS=['jkmpinda@gmail.com','goodeveningfriends7@gmail.com'];
let ADMINS=[...ROOT_ADMINS];
const PLATFORMS=[
  ['youtube','YouTube','The full lessons, live and on demand'],
  ['twitch','Twitch','Watch me prepare — unannounced'],
  ['facebook','Facebook','The Page, mirrored live'],
  ['instagram','Instagram','Short cuts of the road'],
  ['tiktok','TikTok','One verse, two lines'],
  ['threads','Threads','Words between the lessons']];
const LINE={A:{name:'The Golden Line',short:'Golden Line',sub:'the early Davidic timeline',cls:'g',col:'var(--gold-300)'},
            B:{name:'The Royal Blue Line',short:'Royal Blue Line',sub:'the Spiritual Bride timeline',cls:'b',col:'var(--blue-300)'}};
const AHEAD=5;   // sealed weeks shown past the current one — the road always goes on

let fb=null,user=null,db=null,PROFILE=null;
let CONFIG={currentWeek:1},WEEKS={},TRAILDATA=[],visited={parable:false,ta:false,tb:false};
let DEMO_PREVIEW=new URLSearchParams(location.search).get('preview')==='1';
const REF=new URLSearchParams(location.search).get('ref')||'';
const isAdmin=()=>!!(user&&ADMINS.includes((user.email||'').toLowerCase()));
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when=t=>{if(!t)return'';const d=new Date(t),n=Date.now();if(n-t<864e5)return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});return d.toLocaleDateString([],{month:'short',day:'numeric'});};
const cleanRef=r=>String(r||'').split(' · ')[0];
const reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- preferences (device + profile) ---------------- */
const PREFS={sound:true,motion:!reducedMotion,bigtext:false,volume:0.7};
try{Object.assign(PREFS,JSON.parse(localStorage.getItem('kj-prefs')||'{}'));}catch(e){}
function savePrefs(){try{localStorage.setItem('kj-prefs',JSON.stringify(PREFS));}catch(e){}document.documentElement.classList.toggle('bigtext',!!PREFS.bigtext);
  if(fb&&user){try{const {doc,setDoc}=fb.fsM;setDoc(doc(db,'users',user.uid),{prefs:{sound:PREFS.sound,motion:PREFS.motion,bigtext:PREFS.bigtext,volume:PREFS.volume}},{merge:true});}catch(e){}}}
document.documentElement.classList.toggle('bigtext',!!PREFS.bigtext);

/* ---------------- sound: ambience + the herald ---------------- */
const amb=new Ambience();let ambStarted=false;
async function startSound(){if(ambStarted||!PREFS.sound)return;ambStarted=await amb.start();if(ambStarted){amb.setVolume(PREFS.volume);amb.setPhase(journeyPhase());amb.setEnabled(view.page==='home');}}
function syncSound(){if(!ambStarted)return;amb.setPhase(journeyPhase());amb.setEnabled(PREFS.sound&&view.page==='home');}
document.addEventListener('pointerdown',()=>{startSound();},{capture:true});
document.addEventListener('keydown',()=>{startSound();},{capture:true});
function playHerald(){const a=el('herald');if(!a||!PREFS.sound)return;try{a.volume=0.85;a.currentTime=0;const p=a.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}}

/* the journey's hour: night at the start, dawn as the weeks go by, full day when the road is walked */
function journeyPhase(){if(CONFIG.journeyComplete)return 1;const d=CONFIG.dawn||{nightUntil:12,dayFrom:40};const cw=CONFIG.currentWeek||1;
  if(cw<=d.nightUntil)return 0;if(cw>=d.dayFrom)return 0.92;return 0.92*(cw-d.nightUntil)/(d.dayFrom-d.nightUntil);}
let phaseOverride=null;   // admin preview only, never saved
const phaseNow=()=>phaseOverride!==null?phaseOverride:journeyPhase();

/* ---------------- boot ---------------- */
async function boot(){
  try{
    const cfg=await import('/firebase-config.js');
    const appM=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const authM=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const fsM=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const app=appM.initializeApp(cfg.firebaseConfig);
    fb={authM,fsM};db=fsM.getFirestore(app);fb.auth=authM.getAuth(app);
    loadAdmins();
    authM.onAuthStateChanged(fb.auth,u=>{user=u;if(u){hideModal();ensureProfile(u);watchUnread();}else{PROFILE=null;stopWatches();}render();});
  }catch(e){el('demoBadge').style.display='block';if(DEMO_PREVIEW)user={displayName:'Preview Friend',email:'preview@demo',uid:'demo'};}
  try{
    CONFIG=await (await fetch('/content/config.json',{cache:'no-store'})).json();
    try{TRAILDATA=await (await fetch('/content/trail.json',{cache:'no-store'})).json();}catch(e){TRAILDATA=[];}
    for(let i=1;i<=CONFIG.currentWeek;i++){try{WEEKS[i]=await (await fetch(`/content/week${String(i).padStart(2,'0')}.json`)).json();}catch(e){}}
  }catch(e){}
  readRoute();
  if(!user&&!sessionStorage.getItem('welcomed'))showWelcome();
  render();
}
async function loadAdmins(){try{const {doc,getDoc}=fb.fsM;const s=await getDoc(doc(db,'settings','admins'));if(s.exists()){const extra=(s.data().emails||[]).map(e=>String(e).toLowerCase());ADMINS=[...new Set([...ROOT_ADMINS,...extra])];render();}}catch(e){}}

/* ---------------- modal: welcome / take a seat ---------------- */
function showModal(html){el('modalBody').innerHTML=html;el('modal').style.display='flex';}
function hideModal(){el('modal').style.display='none';}
window.closeModal=()=>{sessionStorage.setItem('welcomed','1');hideModal();};
function showWelcome(){showModal(`
  <h2>Welcome to the Kingdom Journey</h2>
  <p>A Bible study told like a story — one lesson a week, two lines through the whole Book, one King.</p>
  <ul class="what">
   <li>The <b>Golden Line</b> follows the earthly throne — Samuel, Saul, David, the kings — all the way to the Cross.</li>
   <li class="b">The <b>Royal Blue Line</b> follows the Spiritual Bride — the faith-seed from Abel to the City.</li>
   <li>Every week: a parable, both lines, a quiz, flashcards, your notes, and a private line to the teacher.</li>
  </ul>
  <p>Take a seat to get the updates and take part. Or just look around — the road is open to walk, the lessons wait for those who sit down.</p>
  <div class="row"><button class="btn" style="font-size:15px;padding:11px 20px" onclick="signIn(true)">Get updates &amp; take part</button><button class="btn ghost" style="font-size:14px;padding:11px 18px" onclick="lookAround()">Just look around</button></div>`);}
function showSeat(){showModal(`
  <h2>Take your seat at the table</h2>
  <p>The lessons open when you sit down. Sign in with Google to walk every week you've reached, keep your quiz scores, save your notes, vote in polls, and write to Jonathan directly — and, if you'd like, get <b>the Daily Scripture by text</b>.</p>
  <div class="row"><button class="btn" style="font-size:15px;padding:11px 20px" onclick="signIn()">Sign in with Google</button><button class="btn ghost" onclick="closeModal()">Not yet</button></div>`);}
window.lookAround=()=>{sessionStorage.setItem('welcomed','1');playHerald();hideModal();startSound();};
window.signIn=async(fromWelcome)=>{if(!fb){alert('Demo mode — deploy with Firebase to enable Google sign-in.');return;}
  if(fromWelcome)playHerald();sessionStorage.setItem('welcomed','1');
  try{await fb.authM.signInWithPopup(fb.auth,new fb.authM.GoogleAuthProvider());hideModal();}catch(e){}};
window.signOutU=async()=>{if(fb)await fb.authM.signOut(fb.auth);user=null;PROFILE=null;go('home');};
window.openLightbox=(src,cap)=>{el('lbImg').src=src;el('lbCap').textContent=cap||'';el('lightbox').style.display='flex';};
window.closeLightbox=()=>{el('lightbox').style.display='none';el('lbImg').src='';};

/* ---------------- profile ---------------- */
async function ensureProfile(u){
  if(!fb)return;
  try{
    const {doc,getDoc,setDoc}=fb.fsM;
    const ref=doc(db,'users',u.uid);const snap=await getDoc(ref);const d=snap.exists()?snap.data():{};
    PROFILE={email:u.email||d.email||'',name:d.name||u.displayName||'',photo:(d.photo!==undefined&&d.photo!==null)?d.photo:(u.photoURL||''),
      emailOptIn:(d.emailOptIn!==undefined)?d.emailOptIn:true,phone:d.phone||'',smsOptIn:!!d.smsOptIn,joinedAt:d.joinedAt||Date.now(),
      invitedBy:d.invitedBy||(REF&&REF!==u.uid.slice(0,8)?REF:''),startedAt:d.startedAt||Date.now(),restarts:d.restarts||0,
      notebook:d.notebook||'',studyDay:d.studyDay||'',tz:Intl.DateTimeFormat().resolvedOptions().timeZone||'',lastSeen:Date.now(),
      lastView:d.lastView||null,prefs:d.prefs||null};
    if(d.prefs){Object.assign(PREFS,d.prefs);document.documentElement.classList.toggle('bigtext',!!PREFS.bigtext);syncSound();}
    await setDoc(ref,PROFILE,{merge:true});
  }catch(e){PROFILE={email:u.email||'',name:u.displayName||'',photo:u.photoURL||'',emailOptIn:true,phone:'',smsOptIn:false};}
  render();
}
function avaHTML(cls){
  const nm=(PROFILE&&PROFILE.name)||(user&&(user.displayName||user.email))||'?';
  const ini=nm.trim().charAt(0).toUpperCase()||'?';const ph=PROFILE&&PROFILE.photo;
  return ph?`<img class="${cls}" src="${ph}" alt="">`:`<span class="${cls} init">${ini}</span>`;
}
function resizeImage(file,S,cap){return new Promise(res=>{const img=new Image();img.onload=()=>{
  const r=Math.min(1,S/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*r);c.height=Math.round(img.height*r);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);let q=0.84,d=c.toDataURL('image/jpeg',q);while(d.length>cap&&q>0.35){q-=0.1;d=c.toDataURL('image/jpeg',q);}
  URL.revokeObjectURL(img.src);res(d);};img.src=URL.createObjectURL(file);});}
function rememberView(){if(!fb||!user||view.page!=='week')return;try{const {doc,setDoc}=fb.fsM;setDoc(doc(db,'users',user.uid),{lastView:{week:view.week,tab:view.tab,at:Date.now()}},{merge:true});}catch(e){}}

/* ---------------- routing: real history, so the back button stays on the site ---------------- */
let view={page:'home',week:1,tab:'overview',story:null};
let UNREAD={user:0,admin:0};
const PAGES=['home','week','story','conversations','profile','credits','admin'];
function routeHash(){if(view.page==='week')return `#week/${view.week}/${view.tab}`;if(view.page==='story')return `#story/${view.story}`;if(view.page==='admin')return `#admin/${view.tab||'inbox'}`;return '#'+view.page;}
function readRoute(){const h=location.hash.replace('#','');const parts=h.split('/');const p=parts[0];
  if(!PAGES.includes(p)||!p){view.page='home';return;}view.page=p;
  if(p==='week'){view.week=parseInt(parts[1])||CONFIG.currentWeek||1;view.tab=parts[2]||'overview';}
  if(p==='story')view.story=parts[1]==='B'?'B':'A';
  if(p==='admin')view.tab=parts[1]||'inbox';}
function pushRoute(){const h=routeHash();if(location.hash!==h)history.pushState({v:{...view}},'',h);else history.replaceState({v:{...view}},'',h);}
window.addEventListener('popstate',e=>{if(e.state&&e.state.v)view={...e.state.v};else readRoute();window.scrollTo({top:0});render();});
history.replaceState({v:{...view}},'',location.hash||'#home');

const canSee=n=>!!user&&n<=(CONFIG.currentWeek||1);
window.go=p=>{view.page=p;view.story=null;if(p==='admin')view.tab='inbox';pushRoute();window.scrollTo({top:0});render();};
window.openWeek=n=>{if(!user){showSeat();return;}if(!canSee(n))return;view.page='week';view.week=n;view.tab='overview';visited={parable:false,ta:false,tb:false};pushRoute();window.scrollTo({top:0});render();};
window.openStory=(tr,n)=>{if(!user){showSeat();return;}if(!canSee(n))return;view.page='story';view.story=tr;pushRoute();render();setTimeout(()=>{const c=el('ch'+n);if(c)c.scrollIntoView({behavior:'smooth'});},80);};
window.setTab=k=>{if(k==='quiz'&&!(visited.parable&&visited.ta&&visited.tb)){alert('The quiz unlocks after you read the Parable, walk the Golden Line and walk the Royal Blue Line — study first, then test.');return;}
  view.tab=k;if(k==='parable')visited.parable=true;if(k==='ta')visited.ta=true;if(k==='tb')visited.tb=true;pushRoute();render();rememberView();};

function nav(){
  const items=[['home','The Trail'],['week','This Week'],['conversations','Messages'],['profile','My Journey']];
  if(isAdmin())items.push(['admin','Admin']);
  el('nav').innerHTML=items.map(([k,l])=>{const dot=(k==='conversations'&&UNREAD.user)||(k==='admin'&&UNREAD.admin);const on=view.page===k||(k==='week'&&view.page==='story');
    return `<button class="${on?'on':''}" onclick="go('${k}')">${l}${dot?'<span class="dot"></span>':''}</button>`;}).join('');
  el('authBox').innerHTML=user
   ?`<button class="avatarChip" onclick="go('profile')" title="My journey">${avaHTML('')}<span>${esc(((PROFILE&&PROFILE.name)||user.displayName||user.email||'').split(' ')[0])}</span></button>`
   :`<button class="btn" onclick="showSeatModal()">Take a seat</button>`;
  el('socialBar').innerHTML=`<a class="live" href="${LINKS.live}" target="_blank" rel="noopener"><i></i>Live</a>`+PLATFORMS.map(([k,l])=>`<a href="${LINKS[k]}" target="_blank" rel="noopener"><i></i>${l}</a>`).join('');
}
window.showSeatModal=()=>showSeat();

/* ---------------- the trail ---------------- */
let trail=null,trailWeeksKey='';
function trailWeeks(){const cw=CONFIG.currentWeek||1;const out=[];
  for(let n=1;n<=cw+AHEAD;n++){const w=WEEKS[n];const t=TRAILDATA.find(x=>x.n===n)||{};const title=(w&&w.title)||t.title;if(!title)break;
    out.push({n,title,a:(w&&w.trackA&&w.trackA.title)||t.a||'',b:(w&&w.trackB&&w.trackB.title)||t.b||'',made:n<=cw,open:!!user&&n<=cw,current:n===cw});}
  return out;}
function mountTrail(){const canvas=el('trail3d');if(!canvas)return;const weeks=trailWeeks();const key=weeks.map(w=>w.n+(w.open?'o':'s')).join(',')+'|'+phaseNow();
  if(trail){trail.dispose();trail=null;}
  const supported=(()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch(e){return false;}})();
  if(!supported){canvas.style.display='none';el('trailFallback').style.display='block';el('trailFallback').innerHTML=trailSVG(weeks);return;}
  trail=createTrail({canvas,weeks,phase:phaseNow(),animate:PREFS.motion,
    onSelect:(kind,n,open)=>{if(!user){showSeat();return;}if(!open)return;if(kind==='week')openWeek(n);else openStory(kind,n);},
    onHover:h=>{const t=el('hoverTip');if(!t)return;if(!h){t.classList.remove('show');return;}const w=weeks.find(x=>x.n===h.n)||{};
      t.textContent=h.kind==='week'?`Week ${h.n} — ${w.title}${h.open?' · open the week':(user?' · not yet':' · take a seat to open')}`:`${LINE[h.kind].name} · ${h.kind==='A'?w.a:w.b}${h.open?'':(user?' · sealed':' · take a seat')}`;t.classList.add('show');}});
  if(!trail){canvas.style.display='none';el('trailFallback').style.display='block';el('trailFallback').innerHTML=trailSVG(weeks);return;}
  trailWeeksKey=key;setTimeout(()=>{if(trail)trail.focusWeek(Math.max(1,(CONFIG.currentWeek||1)));},50);
}
window.walkTrail=d=>{if(trail)trail.walk(d);};
window.toggleMotion=()=>{PREFS.motion=!PREFS.motion;savePrefs();if(trail)trail.setAnimate(PREFS.motion);drawTrailCtl();};
window.toggleSound=async()=>{PREFS.sound=!PREFS.sound;savePrefs();if(PREFS.sound){await startSound();}syncSound();drawTrailCtl();};
function drawTrailCtl(){const c=el('trailCtl');if(!c)return;c.innerHTML=`<button class="iconbtn" onclick="walkTrail(-0.06)" title="Walk back">▲</button><button class="iconbtn" onclick="walkTrail(0.06)" title="Walk on">▼</button>
  <button class="iconbtn ${PREFS.motion?'on':''}" onclick="toggleMotion()" title="Animation ${PREFS.motion?'on':'off'}">${PREFS.motion?'✦ motion on':'✦ motion off'}</button>
  <button class="iconbtn ${PREFS.sound?'on':''}" onclick="toggleSound()" title="Sound ${PREFS.sound?'on':'off'}">${PREFS.sound?'♪ sound on':'♪ sound off'}</button>`;}
/* 2D fallback for browsers without WebGL */
function rockPath(cx,cy,s,seed){const pts=[];const K=7;let r=Math.abs(Math.sin(seed*12.9898))*10000;const rnd=()=>{r=(r*9301+49297)%233280;return r/233280;};
  for(let i=0;i<K;i++){const a=(i/K)*Math.PI*2;const rad=s*(0.75+rnd()*0.45);pts.push([cx+Math.cos(a)*rad*1.25,cy+Math.sin(a)*rad]);}
  let d=`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `;
  for(let i=1;i<=K;i++){const p=pts[i%K],q=pts[(i-1)%K];d+=`Q ${((p[0]+q[0])/2+(rnd()-0.5)*s*0.5).toFixed(1)} ${((p[1]+q[1])/2-(rnd())*s*0.35).toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)} `;}
  return d+"Z";}
function trailSVG(VIS){
  const W=980,STEP=205,H=170+VIS.length*STEP+300;const xc=y=>490+Math.sin(y/420)*95;
  let s=`<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter,sans-serif">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070F26"/><stop offset="1" stop-color="#0A1330"/></linearGradient>
   <linearGradient id="path" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9A441" stop-opacity=".5"/><stop offset="1" stop-color="#A2761F" stop-opacity=".28"/></linearGradient>
   <radialGradient id="rockA" cx=".35" cy=".3" r="1"><stop offset="0" stop-color="#F0CE7E"/><stop offset=".45" stop-color="#B8893A"/><stop offset="1" stop-color="#4d3f1c"/></radialGradient>
   <radialGradient id="rockB" cx=".35" cy=".3" r="1"><stop offset="0" stop-color="#D3E0FC"/><stop offset=".45" stop-color="#5B85D6"/><stop offset="1" stop-color="#1E3060"/></radialGradient>
   <radialGradient id="glassy" cx=".4" cy=".3" r="1"><stop offset="0" stop-color="#86AAF5" stop-opacity=".26"/><stop offset="1" stop-color="#1E3060" stop-opacity=".12"/></radialGradient>
   <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A1330" stop-opacity="0"/><stop offset=".35" stop-color="#0A1330" stop-opacity=".92"/><stop offset="1" stop-color="#0A1330" stop-opacity="1"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  let r=7;const rnd=()=>{r=(r*9301+49297)%233280;return r/233280;};
  for(let i=0;i<Math.min(420,H/8);i++){s+=`<circle cx="${(rnd()*W).toFixed(0)}" cy="${(rnd()*H).toFixed(0)}" r="${(rnd()*1.3+0.3).toFixed(1)}" fill="${rnd()>0.86?'#F0CE7E':'#D3E0FC'}" opacity="${(rnd()*.5+.15).toFixed(2)}"/>`;}
  const Lp=[],Rp=[],Cp=[];for(let y=60;y<=H-60;y+=40){const x=xc(y);const w=46+18*Math.sin(y/300);Cp.push([x,y]);Lp.push([x-w,y]);Rp.push([x+w,y]);}
  s+=`<polygon points="${Lp.map(p=>p[0].toFixed(1)+','+p[1]).join(' ')+' '+Rp.reverse().map(p=>p[0].toFixed(1)+','+p[1]).join(' ')}" fill="url(#path)" opacity="0.5"/><polyline points="${Cp.map(p=>p[0].toFixed(1)+','+p[1]).join(' ')}" stroke="#F0CE7E" stroke-width="2" stroke-dasharray="1 14" fill="none" opacity="0.7"/>`;
  VIS.forEach((w,i)=>{const y=170+i*STEP,x=xc(y);const made=w.made,unlocked=w.open;
    s+=`<g class="boulder ${unlocked?'':'sealed'}" onclick="${unlocked?`openWeek(${w.n})`:'showSeatModal()'}"><ellipse cx="${x}" cy="${y}" rx="30" ry="20" fill="${made?'#D9A441':'#111E45'}" stroke="${made?'#F0CE7E':'#1E3060'}" stroke-width="1.5"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" font-weight="600" fill="${made?'#050B1B':'#5A6A8F'}">${w.n}</text></g>`;
    [[x-235,w.a,'A'],[x+235,w.b,'B']].forEach(([bx,label,tr])=>{const solid=unlocked;const fill=solid?(tr==='A'?'url(#rockA)':'url(#rockB)'):'url(#glassy)';
      s+=`<g class="boulder ${solid?'':'sealed'}" onclick="${solid?`openStory('${tr}',${w.n})`:'showSeatModal()'}"><path d="${rockPath(bx,y,58,w.n*3+(tr==='A'?1:2))}" fill="${fill}" stroke="${solid?(tr==='A'?'#F0CE7E':'#D3E0FC'):'#1E3060'}" stroke-width="${solid?1.6:1}" stroke-dasharray="${solid?'none':'5 5'}"/>
       <text x="${bx}" y="${y+86}" text-anchor="middle" font-size="12.5" fill="${solid?(tr==='A'?'#F0CE7E':'#D3E0FC'):'#4a5670'}" font-style="italic" font-family="Cormorant Garamond,serif" font-weight="600">${esc(label.length>26?label.slice(0,25)+'…':label)}</text>
       <text x="${bx}" y="${y+103}" text-anchor="middle" font-size="9.5" letter-spacing="1.5" fill="${solid?'#7385A8':'#3d4a63'}">${tr==='A'?'GOLDEN LINE':'ROYAL BLUE LINE'} · WK ${w.n}</text></g>`;});
    s+=`<text x="${x}" y="${y+40}" text-anchor="middle" font-size="11.5" fill="${made?'#A7B4D1':'#3d4a63'}">${esc(w.title)}</text>`;});
  const ey=170+VIS.length*STEP-40;
  s+=`<rect x="0" y="${ey-20}" width="${W}" height="${H-ey+20}" fill="url(#mist)"/><text x="${xc(ey+60)}" y="${ey+70}" text-anchor="middle" font-size="14" font-style="italic" font-family="Cormorant Garamond,serif" fill="#A7B4D1" opacity="0.9">the trail goes on…</text>`;
  return s+`</svg>`;}
function weekList(weeks){return `<div class="weeklist">${weeks.map(w=>`<div class="wk ${w.open?'':'sealed'}"><div class="n">${w.n}</div><div class="t"><b>${esc(w.title)}</b><small>${w.made?(w.open?'open — click a line to read it':'take a seat to open this week'):'still ahead — sealed until its lesson exists'}</small></div>
   <div class="lines"><button class="lg" onclick="${w.open?`openStory('A',${w.n})`:'showSeatModal()'}">${esc(w.a||LINE.A.short)}</button><button class="lb" onclick="${w.open?`openStory('B',${w.n})`:'showSeatModal()'}">${esc(w.b||LINE.B.short)}</button>${w.open?`<button class="btn sm" onclick="openWeek(${w.n})">Open week ${w.n}</button>`:''}</div></div>`).join('')}</div>`;}

/* ---------------- render ---------------- */
function render(){
  nav();
  if(trail){trail.dispose();trail=null;trailWeeksKey='';}   // the page is rebuilt below; the scene is remounted on the new canvas
  syncSound();
  const w=WEEKS[view.week]||WEEKS[CONFIG.currentWeek];
  const A=el('app');
  if(view.page==='home'){const weeks=trailWeeks();
    A.innerHTML=`
     <div class="hero"><div class="kicker">a series from Good evening, friends</div><h1>The Kingdom <i>Journey</i></h1>
      <div class="tag">Two kingdoms. One King.</div><div class="rule"></div>
      <div class="always">Tracing the earthly throne and the heavenly kingdom, side by side. You were always part of this Kingdom.</div></div>
     <div id="trailWrap"><div class="trailhead"><b>THE TRAIL</b><span class="mono">${user?'drag or scroll to walk · click a stone to read that line · click a number to open the week':'walk the road freely — take a seat to open the lessons'}</span><div class="ctl" id="trailCtl"></div></div>
      <canvas id="trail3d" aria-label="The trail — a night road with a milestone for each week"></canvas><div id="trailFallback" style="display:none"></div><div id="hoverTip"></div>
      <div class="trailfoot"><span class="legend"><i class="g"></i>${LINE.A.name} — ${LINE.A.sub}<i class="b"></i>${LINE.B.name} — ${LINE.B.sub}</span><span>It is evening on the road. The sky turns toward morning as the journey goes on.</span></div></div>
     ${weekList(weeks)}
     <div class="notice">Left stone = the <b style="color:var(--gold-300)">Golden Line</b> chapter · right stone = the <b style="color:var(--blue-300)">Royal Blue Line</b> chapter. Glass stones are the next few weeks — visible, sealed until their lesson exists. The road keeps going past the last lantern.</div>
     <div class="panel" style="margin-top:18px"><h2>Find the road wherever you are</h2><p class="sub">one journey, every platform — the lessons live on YouTube, everything else carries the breadcrumbs</p>
      <div class="findus">${PLATFORMS.map(([k,l,d])=>`<a class="tile" href="${LINKS[k]}" target="_blank" rel="noopener"><img src="/assets/tile_${k}.png" alt="${l}" loading="lazy"><span>${l}</span><small>${d}</small></a>`).join('')}</div></div>`;
    drawTrailCtl();mountTrail();
  }
  if(view.page==='story'){
    if(!user){A.innerHTML=`<div class="lockmsg"><div class="big">🔒</div><p>The lines open when you take a seat.</p><br><button class="btn" onclick="showSeatModal()">Take a seat</button></div>`;return;}
    const tr=view.story;let chapters='';
    for(let n=1;n<=CONFIG.currentWeek;n++){if(!canSee(n))continue;const wk=WEEKS[n];if(!wk)continue;
      chapters+=`<div id="ch${n}" class="panel" style="margin-bottom:14px"><div class="mono" style="font-size:11px;color:var(--mist-dim);letter-spacing:.14em">CHAPTER ${n} · ${esc(wk.title).toUpperCase()}</div><p class="serif" style="line-height:1.75;margin-top:8px;font-size:19px">${tr==='A'?wk.storyA:wk.storyB}</p></div>`;}
    A.innerHTML=`<div class="hero"><h1 style="font-size:30px;color:${LINE[tr].col}">${LINE[tr].name}</h1><div class="tag" style="font-size:19px">${LINE[tr].sub} — ${tr==='A'?'blood history, running to the Cross, then Israel to the crown':'Spirit history, running from the Cross to the City'}</div></div>${chapters}<div class="lockmsg" style="padding:22px">— the line continues as the weeks unlock —</div><center><button class="btn ghost" onclick="go('home')">↩ Back to the trail</button></center>`;
  }
  if(view.page==='week'){
    if(!user){A.innerHTML=`<div class="lockmsg"><div class="big">🔒</div><p>The lessons open when you take a seat. Until then, walk the trail.</p><br><button class="btn" onclick="showSeatModal()">Take a seat</button> <button class="btn ghost" onclick="go('home')">Back to the trail</button></div>`;return;}
    if(!canSee(view.week)||!w){A.innerHTML=`<div class="lockmsg"><div class="big">🔒</div><p>That week is still ahead.</p><br><button class="btn ghost" onclick="go('home')">Back to the trail</button></div>`;return;}
    const quizReady=visited.parable&&visited.ta&&visited.tb;
    const tabs=[['overview','Overview',''],['parable','Parable',''],['ta',LINE.A.short,'g'],['tb',LINE.B.short,'b'],['quiz',quizReady?'Quiz':'Quiz 🔒',''],['flash','Flashcards',''],['snips','Snippets',''],['notes','My Notes',''],['poll','Poll','']];
    A.innerHTML=`<h2 class="disp" style="margin-top:8px;font-size:20px">Week ${w.n} — ${esc(w.title)}</h2><div class="serif" style="color:var(--gold-300);font-style:italic;font-size:18px">${esc(w.psalm)}</div>
     <div class="tabs">${tabs.map(([k,l,c])=>`<button class="${view.tab===k?'on':''} ${c} ${k==='quiz'&&!quizReady?'lockt':''}" onclick="setTab('${k}')">${l}</button>`).join('')}</div><div class="panel" id="tabPanel"></div>`;
    renderTab(w);
  }
  if(view.page==='conversations')renderConversations();
  if(view.page==='profile')renderProfile();
  if(view.page==='credits')renderCredits();
  if(view.page==='admin')renderAdmin();
}

function creditsBlock(w){
  const L={bible:'Scripture',msg:'The Message — paraphrased',out:'History & context',int:'Open question'};
  const secs=(w.parable&&w.parable.sections||[]).map(s=>`<li><b>${esc(s.h)}</b> — ${L[s.lbl]||s.lbl}</li>`).join('');
  const extra=(w.credits||[]).map(c=>`<li>${esc(c)}</li>`).join('');
  return `<details class="credits"><summary>Sources &amp; labels for this week</summary><ul>${secs}${extra}<li>Scripture references and full source notes live on the <a href="#credits" onclick="go('credits');return false">Credits &amp; sources</a> page.</li></ul></details>`;
}
const LBL={bible:'The Bible',msg:'The Message',out:'Outside sources',int:'Open question'};
function renderTab(w){
  const P=el('tabPanel'),t=view.tab;
  if(t==='overview')P.innerHTML=`<h2>Overview</h2><p class="sub">the week at a glance</p>
   ${w.videoUrl?`<p><a class="btn blue" href="${w.videoUrl}" target="_blank" rel="noopener">▶ Watch the lesson</a></p><br>`:`<div class="notice">The video appears here when the episode premieres. Until then, follow the road on <a href="${LINKS.youtube}" target="_blank" rel="noopener">YouTube</a>.</div>`}
   <div class="study"><p>${w.overview}</p></div><div class="vq">${w.snippets[0].x}<span>${esc(cleanRef(w.snippets[0].r))}</span></div>
   <div class="notice"><b>Action of the week:</b> ${esc(w.action)}</div><div class="notice">Path to the quiz: read the <b>Parable</b> → walk the <b style="color:var(--gold-300)">${LINE.A.name}</b> → walk the <b style="color:var(--blue-300)">${LINE.B.name}</b> → the Quiz unlocks.</div>${creditsBlock(w)}`;
  if(t==='parable')P.innerHTML=`<h2>${esc(w.parable.name)}</h2><p class="sub">the in-depth study — deeper than the broadcast</p><div class="study">${w.parable.sections.map(s=>`<h3><span class="lbl ${s.lbl}">${LBL[s.lbl]||s.lbl}</span>${esc(s.h)}</h3><p>${s.t}</p>`).join('')}</div>${creditsBlock(w)}`;
  if(t==='ta')P.innerHTML=`<h2 style="color:var(--gold-300)">${LINE.A.name} — ${esc(w.trackA.title)}</h2><p class="sub">${LINE.A.sub} · this week's stretch of the road</p><div class="study"><p>${w.trackA.t}</p></div><center><button class="btn ghost" onclick="openStory('A',${w.n})">Read the whole Golden Line so far →</button></center>`;
  if(t==='tb')P.innerHTML=`<h2 style="color:var(--blue-300)">${LINE.B.name} — ${esc(w.trackB.title)}</h2><p class="sub">${LINE.B.sub} · this week's stretch of the road</p><div class="study"><p>${w.trackB.t}</p></div><center><button class="btn ghost" style="border-color:rgba(134,170,245,.5);color:var(--blue-300)" onclick="openStory('B',${w.n})">Read the whole Royal Blue Line so far →</button></center>`;
  if(t==='quiz'){window._q={i:0,score:0};P.innerHTML=`<h2>Quiz</h2><p class="sub">retake any time — your highest score is kept</p><div id="quizBox"></div>`;drawQuiz(w);}
  if(t==='flash')P.innerHTML=`<h2>Flashcards</h2><p class="sub">terms, names, verses — tap to flip</p><div class="fcgrid">${w.flash.map(c=>`<div class="fc" onclick="this.classList.toggle('fl')"><div class="in"><div class="f">${esc(c.f)}</div><div class="b">${esc(c.b)}</div></div></div>`).join('')}</div>`;
  if(t==='snips')P.innerHTML=`<h2>Snippets</h2><p class="sub">the shareable moments — pass them on</p>${w.snippets.map((s,i)=>`<div class="snip"><b>${esc(s.t)}</b><div class="x">${s.x}</div><div style="font-size:11.5px;color:var(--mist-dim);letter-spacing:.06em">${esc(cleanRef(s.r))}</div>
   <div class="sharebar"><button class="btn ghost sm" onclick="shareSnip(${i})">Share ↗</button><button class="btn ghost sm" onclick="copySnip(${i})">Copy</button>${s.short?`<a class="btn blue sm" href="${s.short}" target="_blank" rel="noopener">▶ Watch the Short</a>`:''}</div></div>`).join('')}`;
  if(t==='notes')renderNotes(w);
  if(t==='poll')drawPoll(w);
  window.shareSnip=async i=>{const s=w.snippets[i];const txt=`${s.x} — ${cleanRef(s.r)}\n${LINKS.hub}`;if(navigator.share){try{await navigator.share({text:txt});}catch(e){}}else{await navigator.clipboard.writeText(txt);alert('Copied — paste it anywhere.');}};
  window.copySnip=async i=>{const s=w.snippets[i];await navigator.clipboard.writeText(`${s.x} — ${cleanRef(s.r)}`);alert('Copied.');};
}
/* quiz */
function drawQuiz(w){const s=window._q,box=el('quizBox');
  if(s.i>=w.quiz.length){box.innerHTML=`<div class="score">You scored ${s.score} / ${w.quiz.length}${s.score===w.quiz.length?' — perfect. The trail remembers.':' — well walked. Flip the flashcards and take it again; only your best survives.'}</div><br><button class="btn ghost" onclick="setTab('quiz')">Retake</button>`;if(user&&fb)saveScore(w.n,s.score,w.quiz.length);return;}
  const q=w.quiz[s.i];box.innerHTML=`<div class="q"><b>${s.i+1}. ${esc(q.q)}</b>${q.opts.map((o,j)=>`<button class="opt" onclick="answer(${j})">${esc(o)}</button>`).join('')}</div><div style="font-size:12px;color:var(--mist-dim)">Question ${s.i+1} of ${w.quiz.length}</div>`;
  window.answer=j=>{const btns=box.querySelectorAll('.opt');btns.forEach((b,k)=>{if(k===q.a)b.classList.add('correct');else if(k===j)b.classList.add('wrong');b.disabled=true;});if(j===q.a)s.score++;setTimeout(()=>{s.i++;drawQuiz(w);},850);};}
async function saveScore(n,score,total){const {doc,getDoc,setDoc}=fb.fsM;const ref=doc(db,'users',user.uid,'scores','week'+n);const prev=await getDoc(ref);const best=prev.exists()?Math.max(prev.data().score,score):score;await setDoc(ref,{score:best,total,at:Date.now()},{merge:true});}
/* notes */
let demoNotes=[];
function renderNotes(w){const P=el('tabPanel');if(!user){P.innerHTML='<div class="lockmsg">🔒 Take a seat to keep your study notes.</div>';return;}
  P.innerHTML=`<h2>My Notes — Week ${w.n}</h2><p class="sub">indexed, printable, shareable</p><input type="text" id="nTitle" placeholder="Note title (e.g., The soil test)"><br><br><input type="text" id="nRefs" placeholder="Scripture references (e.g., Mark 4:13; 1 Samuel 8:7)"><br><br><textarea id="nText" rows="4" placeholder="What did God underline for you?"></textarea><br><br>
   <button class="btn" onclick="addNote(${w.n})">Save note</button> <button class="btn ghost" onclick="window.print()">Print</button> <button class="btn ghost" onclick="shareNotes(${w.n})">Share ↗</button><div id="noteList" style="margin-top:16px">Loading…</div>`;loadNotes(w.n);}
window.addNote=async n=>{const note={title:el('nTitle').value||'Untitled',refs:el('nRefs').value,text:el('nText').value,week:n,at:Date.now()};if(!note.text.trim())return;
  if(fb&&user){const {collection,addDoc}=fb.fsM;await addDoc(collection(db,'users',user.uid,'notes'),note);}else demoNotes.push(note);
  el('nTitle').value='';el('nRefs').value='';el('nText').value='';loadNotes(n);};
async function fetchNotes(n){let notes=[];if(fb&&user){const {collection,getDocs,query,where}=fb.fsM;const qs=await getDocs(n?query(collection(db,'users',user.uid,'notes'),where('week','==',n)):collection(db,'users',user.uid,'notes'));qs.forEach(d=>notes.push(d.data()));}else notes=demoNotes.filter(x=>!n||x.week===n);return notes.sort((a,b)=>b.at-a.at);}
async function loadNotes(n){const notes=await fetchNotes(n);el('noteList').innerHTML=notes.map(x=>`<div class="noteCard"><b>${esc(x.title)}</b>${x.refs?`<div class="refs">${esc(x.refs)}</div>`:''}<div style="font-size:14.5px;margin-top:4px;white-space:pre-wrap">${esc(x.text)}</div></div>`).join('')||'<div class="notice">No notes yet this week.</div>';}
window.shareNotes=async n=>{const notes=await fetchNotes(n);const txt=`My Kingdom Journey notes — Week ${n}\n\n`+notes.map(x=>`• ${x.title}${x.refs?` (${x.refs})`:''}\n${x.text}`).join('\n\n')+`\n\n${LINKS.hub}`;if(navigator.share){try{await navigator.share({text:txt});}catch(e){}}else{await navigator.clipboard.writeText(txt);alert('Notes copied.');}};
/* polls */
function drawPoll(w){const P=el('tabPanel');P.innerHTML=`<h2>Polls</h2><p class="sub">when a question is asked on the lesson, answer it here</p><div id="pollList">Loading…</div>`;
  if(fb)loadPolls();else{const demo=[38,24,21,17];el('pollList').innerHTML=`<div class="noteCard"><b>${esc(w.poll.q)}</b><div style="margin-top:10px">${w.poll.opts.map((o,i)=>`<div class="pollopt"><button class="btn ghost" style="min-width:250px;text-align:left">${esc(o)}</button><div class="bar" style="width:${demo[i]*3}px"></div><span style="font-size:11px;color:var(--mist-dim)">${demo[i]}%</span></div>`).join('')}</div></div>`;}}
async function loadPolls(){const {collection,getDocs,query,where}=fb.fsM;const qs=await getDocs(query(collection(db,'polls'),where('active','==',true)));let h='';
  for(const d of qs.docs){const pl=d.data();h+=`<div class="noteCard"><b>${esc(pl.q)}</b><div style="margin-top:10px">${pl.opts.map((o,i)=>`<div class="pollopt"><button class="btn ghost" style="min-width:250px;text-align:left" onclick="votePoll('${d.id}',${i})">${esc(o)}</button><span id="pv-${d.id}-${i}" style="font-size:11px;color:var(--mist-dim)"></span></div>`).join('')}</div></div>`;}
  el('pollList').innerHTML=h||'<div class="notice">No open polls right now — they appear live during the lesson.</div>';}
window.votePoll=async(pid,i)=>{if(!user){showSeat();return;}const {doc,setDoc,collection,getDocs}=fb.fsM;await setDoc(doc(db,'polls',pid,'votes',user.uid),{opt:i,at:Date.now()});
  const qs=await getDocs(collection(db,'polls',pid,'votes'));const counts={};let tot=0;qs.forEach(d=>{counts[d.data().opt]=(counts[d.data().opt]||0)+1;tot++;});Object.keys(counts).forEach(k=>{const e=el(`pv-${pid}-${k}`);if(e)e.textContent=Math.round(100*counts[k]/tot)+'%';});};

/* ============================================================
   CONVERSATIONS — private threads with Jonathan, with attachments
   ============================================================ */
let CONVS=[],activeConv=null,unsubList=null,unsubMsgs=null,unsubUnread=null,pending=[];
const FILE_CAP=700000;
function stopWatches(){[unsubList,unsubMsgs,unsubUnread].forEach(u=>u&&u());unsubList=unsubMsgs=unsubUnread=null;CONVS=[];activeConv=null;UNREAD={user:0,admin:0};}
function watchUnread(){if(!fb||!user)return;const {collection,query,where,onSnapshot}=fb.fsM;if(unsubUnread)unsubUnread();
  const q=isAdmin()?query(collection(db,'conversations'),where('unreadAdmin','==',true)):query(collection(db,'conversations'),where('uid','==',user.uid),where('unreadUser','==',true));
  unsubUnread=onSnapshot(q,qs=>{if(isAdmin())UNREAD.admin=qs.size;else UNREAD.user=qs.size;nav();},()=>{});}
function renderConversations(){
  const A=el('app');
  if(!user){A.innerHTML=`<div class="lockmsg"><div class="big">✉</div><p>Take a seat to message Jonathan — questions, testimonies, something you'd like to share. Attach a photo or a file if it helps.</p><br><button class="btn" onclick="showSeatModal()">Take a seat</button></div>`;return;}
  A.innerHTML=`<div class="hero" style="padding-top:12px"><h1 style="font-size:24px">Messages</h1><div class="always">A private line to the teacher's desk — one thread per subject, so nothing gets lost. Jonathan reads every message, yes, even the long ones.</div></div>
   <div class="cgrid ${activeConv?'threadOpen':''}" id="cgrid">
    <div class="clist"><div class="top"><b>SUBJECTS</b><button class="btn sm" onclick="newConversation()">+ New subject</button></div><div id="convList" style="flex:1;overflow-y:auto"><div class="notice" style="margin:12px">Loading…</div></div></div>
    <div class="cthread" id="cthread"><div class="lockmsg" style="padding:60px 20px"><div class="big">💬</div><p>Pick a thread, or start a new one.</p></div></div></div>`;
  if(fb)listenConvList();else el('convList').innerHTML='<div class="notice" style="margin:12px">(demo) Messages activate on the live site.</div>';
  if(activeConv)openConv(activeConv.id);
}
function listenConvList(){const {collection,query,where,orderBy,limit,onSnapshot}=fb.fsM;if(unsubList)unsubList();
  const q=isAdmin()&&view.page==='admin'?query(collection(db,'conversations'),orderBy('updatedAt','desc'),limit(200)):query(collection(db,'conversations'),where('uid','==',user.uid));
  unsubList=onSnapshot(q,qs=>{CONVS=[];qs.forEach(d=>CONVS.push({id:d.id,...d.data()}));CONVS.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));drawConvList();},e=>{const L=el('convList');if(L)L.innerHTML=`<div class="notice" style="margin:12px">Could not load threads (${esc(e.code||e.message)}).</div>`;});}
function drawConvList(){const L=el('convList');if(!L)return;const admin=isAdmin()&&view.page==='admin';
  L.innerHTML=CONVS.map(c=>{const unread=admin?c.unreadAdmin:c.unreadUser;const nm=admin?(c.name||c.email||'Friend'):(c.topic||'Conversation');
    return `<div class="citem ${activeConv&&activeConv.id===c.id?'on':''}" onclick="openConv('${c.id}')">${c.photo?`<img class="av" src="${c.photo}" alt="">`:`<div class="av">${esc((nm||'?').charAt(0).toUpperCase())}</div>`}<div class="t"><b>${esc(nm)}</b><span>${admin?esc(c.topic||''):''}${admin&&c.topic?' · ':''}${esc(c.lastText||'')}</span></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="when">${when(c.updatedAt)}</span>${unread?'<span class="unread"></span>':''}</div></div>`;}).join('')||`<div class="notice" style="margin:12px">${admin?'No conversations yet.':'No subjects yet — start one with <b>+ New subject</b>.'}</div>`;}
window.newConversation=async()=>{const topic=prompt('What is this message about? (a few words — one subject per thread)');if(topic===null)return;if(!fb){alert('Demo mode.');return;}
  const {collection,addDoc}=fb.fsM;const ref=await addDoc(collection(db,'conversations'),{uid:user.uid,name:(PROFILE&&PROFILE.name)||user.displayName||'',email:user.email||'',photo:(PROFILE&&PROFILE.photo)||'',topic:topic.trim()||'Conversation',createdAt:Date.now(),updatedAt:Date.now(),lastText:'',lastFrom:'user',unreadAdmin:false,unreadUser:false});
  openConv(ref.id);};
window.openConv=async id=>{const c=CONVS.find(x=>x.id===id);if(!c)return;activeConv=c;pending=[];const g=el('cgrid');if(g)g.classList.add('threadOpen');drawConvList();
  const admin=isAdmin()&&view.page==='admin';const T=el('cthread');if(!T)return;
  T.innerHTML=`<div class="top"><button class="iconbtn" onclick="closeConv()" title="Back">←</button>${c.photo?`<img class="av" src="${c.photo}" style="width:34px;height:34px;border-radius:50%;object-fit:cover" alt="">`:''}<div><b>${esc(admin?(c.name||c.email):(c.topic||'Conversation'))}</b><small>${esc(admin?(c.topic||''):'with Jonathan')}</small></div></div>
   <div class="chat" id="chatBox"><div class="notice">Loading…</div></div>
   <div class="composer"><div class="chips" id="pendingChips"></div><div class="row"><button class="iconbtn" onclick="el('attFile').click()" title="Attach a photo or file">📎</button><input type="file" id="attFile" multiple style="display:none" onchange="stageFiles(event)"><textarea id="chatText" rows="1" placeholder="${admin?'Reply as Jonathan…':'Write to Jonathan…'}" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg();}"></textarea><button class="btn" onclick="sendMsg()">Send</button></div><div style="font-size:11px;color:var(--mist-dim)">Photos are resized automatically. Other files up to ~600 KB.</div></div>`;
  const {collection,query,orderBy,onSnapshot,doc,updateDoc}=fb.fsM;if(unsubMsgs)unsubMsgs();
  unsubMsgs=onSnapshot(query(collection(db,'conversations',id,'messages'),orderBy('at')),qs=>{let h='';qs.forEach(d=>{const m=d.data();const mine=admin?m.from==='jonathan':m.from==='user';
      const files=(m.files||[]).map(f=>f.type&&f.type.startsWith('image/')?`<img class="att" src="${f.data}" alt="${esc(f.name)}" onclick="openLightbox(this.src,'${esc(f.name)}')">`:`<a class="file" href="${f.data}" download="${esc(f.name)}">📄 ${esc(f.name)} <span style="color:var(--mist-dim)">${Math.round((f.size||0)/1024)} KB</span></a>`).join('');
      h+=`<div class="msg ${mine?'me':'jn'}"><div class="who">${m.from==='jonathan'?'Jonathan':(admin?esc(c.name||'Friend'):'You')}</div>${esc(m.text).replace(/\n/g,'<br>')}${files}<div class="when">${when(m.at)}</div></div>`;});
    const box=el('chatBox');if(box){box.innerHTML=h||`<div class="notice">${admin?'No messages yet.':'Say good evening — Jonathan reads every message.'}</div>`;box.scrollTop=box.scrollHeight;}});
  try{await updateDoc(doc(db,'conversations',id),admin?{unreadAdmin:false}:{unreadUser:false});}catch(e){}};
window.closeConv=()=>{activeConv=null;if(unsubMsgs)unsubMsgs();unsubMsgs=null;const g=el('cgrid');if(g)g.classList.remove('threadOpen');const T=el('cthread');if(T)T.innerHTML=`<div class="lockmsg" style="padding:60px 20px"><div class="big">💬</div><p>Pick a thread, or start a new one.</p></div>`;drawConvList();};
window.stageFiles=async ev=>{const files=[...(ev.target.files||[])];ev.target.value='';
  for(const f of files){if(pending.length>=3){alert('Up to 3 attachments per message.');break;}
    let data;if(f.type.startsWith('image/'))data=await resizeImage(f,1400,420000);else{if(f.size>620000){alert(`${f.name} is too large (${Math.round(f.size/1024)} KB). Files up to ~600 KB — or send a photo of it.`);continue;}data=await new Promise(r=>{const rd=new FileReader();rd.onload=()=>r(rd.result);rd.readAsDataURL(f);});}
    pending.push({name:f.name,type:f.type||'application/octet-stream',size:data.length,data});}
  drawPending();};
function drawPending(){const P=el('pendingChips');if(!P)return;P.innerHTML=pending.map((f,i)=>`<span class="chip">${f.type.startsWith('image/')?'🖼':'📄'} ${esc(f.name)} <button onclick="dropPending(${i})" title="Remove">✕</button></span>`).join('');}
window.dropPending=i=>{pending.splice(i,1);drawPending();};
window.sendMsg=async()=>{const ta=el('chatText');const t=(ta?ta.value:'').trim();if(!t&&!pending.length)return;if(!fb||!activeConv){alert('Demo mode.');return;}
  const total=pending.reduce((a,f)=>a+f.size,0);if(total>FILE_CAP){alert('Attachments are too large for one message — send them in separate messages.');return;}
  const admin=isAdmin()&&view.page==='admin';const {collection,addDoc,doc,updateDoc}=fb.fsM;const from=admin?'jonathan':'user';
  await addDoc(collection(db,'conversations',activeConv.id,'messages'),{from,text:t,at:Date.now(),files:pending});
  await updateDoc(doc(db,'conversations',activeConv.id),{updatedAt:Date.now(),lastText:t||(pending.length?'📎 attachment':''),lastFrom:from,...(admin?{unreadUser:true}:{unreadAdmin:true})});
  if(ta)ta.value='';pending=[];drawPending();};

/* ============================================================
   MY JOURNEY — who you are, how you hear from us, the road settings,
   how far you've walked, invitations, your data
   ============================================================ */
let acctPhoto=null;
const DAYS=['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
async function renderProfile(){const A=el('app');
  if(!user){A.innerHTML=`<div class="lockmsg"><div class="big">🚶</div><p>Your journey lives behind your seat at the table.</p><br><button class="btn" onclick="showSeatModal()">Take a seat</button></div>`;return;}
  acctPhoto=(PROFILE&&PROFILE.photo)||'';const P=PROFILE||{};
  const sw=(id,label,small,on)=>`<div class="switch"><div class="t">${label}<small>${small}</small></div><div class="toggle ${on?'on':''}" id="${id}" role="switch" aria-checked="${on}" onclick="flipPref('${id}')"></div></div>`;
  A.innerHTML=`<div class="hero" style="padding-top:12px"><h1 style="font-size:24px">My Journey</h1><div class="always">Your seat at the table — how you appear, how you hear from us, how the road behaves, and how far you've walked.</div></div>
  <div class="pgrid">
   <div>
    <div class="panel"><h2>Who you are here</h2><p class="sub">this is how you appear on your notes and in conversations</p>
     <div style="display:flex;align-items:center;gap:14px;margin:6px 0 12px" id="acctAvaRow"></div>
     <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" onclick="el('avaFile').click()">Upload picture</button><button class="btn ghost sm" onclick="useGooglePhoto()">Use my Google photo</button><button class="btn ghost sm" onclick="useInitial()">Just my initial</button><input type="file" id="avaFile" accept="image/*" style="display:none" onchange="pickPhoto(event)"></div>
     <div class="field"><label>Display name</label><input type="text" id="acctName" maxlength="40" value="${esc(P.name||user.displayName||'')}" oninput="drawAcctAva()"></div>
     <div class="field"><label>Email (from your Google sign-in)</label><div class="mono" style="font-size:13px;color:var(--blue-100)">${esc(P.email||user.email||'')}</div></div>
     <div class="field"><label>Where you keep your notes</label><input type="text" id="acctNotebook" maxlength="60" placeholder="e.g. the brown notebook, or right here on the site" value="${esc(P.notebook||'')}"></div>
     <div class="field"><label>Your usual study day</label><select id="acctDay">${DAYS.map((d,i)=>`<option value="${i||''}" ${String(P.studyDay)===String(i||'')?'selected':''}>${d||'— whenever the lesson lands —'}</option>`).join('')}</select></div>
     <div id="acctStatus" style="font-size:11.5px;color:var(--mist-dim);min-height:16px;margin:4px 0;letter-spacing:.06em"></div>
     <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap"><button class="btn" onclick="saveAcct()">Save</button><button class="btn ghost" onclick="signOutU()">Sign out</button></div></div>
    <div class="panel" style="margin-top:14px"><h2>How you hear from us</h2><p class="sub">only what you ask for — never spam, never a countdown timer</p>
     <div class="optrow"><input type="checkbox" id="acctEmailOpt" ${P.emailOptIn!==false?'checked':''}><div class="t">Email me about new lessons &amp; events<small>Occasional updates from Good evening, friends.</small></div></div>
     <div class="field"><label>Mobile number (for the Daily Scripture)</label><input type="tel" id="acctPhone" placeholder="e.g. 817-555-0123" maxlength="18" value="${esc(P.phone||'')}"></div>
     <div class="optrow"><input type="checkbox" id="acctSmsOpt" ${P.smsOptIn?'checked':''}><div class="t">Text me <b>the Daily Scripture</b> — one verse a day<small>English · US numbers · msg &amp; data rates may apply · uncheck anytime to stop.</small></div></div>
     <div style="display:flex;gap:10px;margin-top:8px"><button class="btn" onclick="saveAcct()">Save</button></div></div>
   </div>
   <div>
    <div class="panel"><h2>The road</h2><p class="sub">how the trail behaves on this device</p>
     ${sw('pfSound','Night sounds &amp; birdsong','Crickets, wind and an owl tonight; birds as the morning comes. Only on the trail page.',PREFS.sound)}
     <div class="field" style="margin-top:4px"><label>Sound level</label><input type="range" min="0" max="1" step="0.05" value="${PREFS.volume}" oninput="setVolume(this.value)"></div>
     ${sw('pfMotion','Animation','Stars twinkle, the stones breathe, the camera sways. Off = a still picture that still walks when you scroll.',PREFS.motion)}
     ${sw('pfBig','Larger text','Bigger reading text across the whole site.',PREFS.bigtext)}
     <div class="notice" style="margin-bottom:0">The trumpets on the front door play once, on your first tap — the browser rule, not ours.</div></div>
    <div class="panel" style="margin-top:14px"><h2>How far you've walked</h2><p class="sub">everything can be retaken — your best score is kept</p><div class="stat" id="pStats"><div><b>…</b><span>weeks quizzed</span></div><div><b>…</b><span>notes kept</span></div><div><b>…</b><span>best average</span></div></div><div id="myScores">Loading…</div>
     <div style="font-size:12.5px;color:var(--mist-dim);margin-top:8px">Seated since ${new Date(P.joinedAt||Date.now()).toLocaleDateString([],{month:'long',day:'numeric',year:'numeric'})}${P.restarts?` · restarted ${P.restarts}×`:''}${P.lastView?` · last read: week ${P.lastView.week}`:''}</div>
     <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${P.lastView?`<button class="btn sm" onclick="resumeLast()">Continue where I left off</button>`:''}<button class="btn ghost sm" onclick="downloadNotes()">Download all my notes</button><button class="btn danger sm" onclick="restartJourney()">Restart my journey</button></div>
     <div class="notice" style="margin-top:12px">Restarting clears your quiz scores and notes so you can walk the road again from Week 1. Your account, your seat and your conversations stay.</div></div>
    <div class="panel" style="margin-top:14px"><h2>Invite friends</h2><p class="sub">the road is better walked together</p><p style="font-size:14px;color:var(--mist);margin-bottom:12px">Send a friend your link. When they take a seat, it is set beside yours.</p>
     <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="inviteFriend()">Share my invite ↗</button><button class="btn ghost" onclick="copyInvite()">Copy the link</button></div>
     <div class="mono" style="font-size:11.5px;color:var(--mist-dim);margin-top:10px;word-break:break-all">${esc(inviteLink())}</div></div>
    <div class="panel" style="margin-top:14px"><h2>Your data</h2><p class="sub">it is yours</p>
     <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" onclick="downloadData()">Download everything I've saved</button><button class="btn danger sm" onclick="deleteSeat()">Delete my seat</button></div>
     <div class="notice" style="margin-top:12px">Deleting your seat removes your profile, scores, notes and sign-in from this site. Messages you sent stay with the teacher's desk unless you ask for them to be removed.</div></div>
   </div></div>`;
  drawAcctAva();loadProgress();
}
window.flipPref=id=>{const k={pfSound:'sound',pfMotion:'motion',pfBig:'bigtext'}[id];PREFS[k]=!PREFS[k];savePrefs();const t=el(id);if(t){t.classList.toggle('on',PREFS[k]);t.setAttribute('aria-checked',PREFS[k]);}
  if(k==='sound'){if(PREFS.sound)startSound();syncSound();}if(k==='motion'&&trail)trail.setAnimate(PREFS.motion);};
window.setVolume=v=>{PREFS.volume=parseFloat(v);savePrefs();if(ambStarted)amb.setVolume(PREFS.volume);};
window.resumeLast=()=>{const lv=PROFILE&&PROFILE.lastView;if(!lv)return;view.page='week';view.week=lv.week;view.tab=lv.tab||'overview';visited={parable:true,ta:true,tb:true};pushRoute();window.scrollTo({top:0});render();};
function inviteLink(){return `${LINKS.hub}/?ref=${user?user.uid.slice(0,8):''}`;}
window.inviteFriend=async()=>{const text=`Good evening, friend — I'm walking through the whole Bible on one map, two kingdoms side by side. Come take a seat at the table with me: ${inviteLink()}`;
  if(navigator.share){try{await navigator.share({title:'The Kingdom Journey',text,url:inviteLink()});return;}catch(e){}}await navigator.clipboard.writeText(text);alert('Invite copied — paste it into a text or a message.');};
window.copyInvite=async()=>{await navigator.clipboard.writeText(inviteLink());alert('Link copied.');};
function drawAcctAva(){const R=el('acctAvaRow');if(!R)return;const nm=(el('acctName')&&el('acctName').value)||' ';R.innerHTML=(acctPhoto?`<img class="avaBig" src="${acctPhoto}" alt="">`:`<span class="avaBig init">${esc((nm.trim().charAt(0)||'?').toUpperCase())}</span>`)+`<div style="font-size:13px;color:var(--mist)">Your seat at the table.<br>Change the picture or keep your initial.</div>`;}
window.useGooglePhoto=()=>{acctPhoto=(user&&user.photoURL)||'';drawAcctAva();};
window.useInitial=()=>{acctPhoto='';drawAcctAva();};
window.pickPhoto=async ev=>{const f=ev.target.files&&ev.target.files[0];ev.target.value='';if(!f)return;acctPhoto=await resizeImage(f,192,140000);drawAcctAva();};
window.saveAcct=async()=>{const name=el('acctName').value.trim();let phone=el('acctPhone').value.replace(/[^0-9+]/g,'');const sms=el('acctSmsOpt').checked;
  if(sms&&phone.replace(/\D/g,'').length<10){el('acctStatus').textContent='ENTER A VALID MOBILE NUMBER (10 DIGITS) FOR THE DAILY TEXT — OR UNCHECK THE BOX.';return;}
  el('acctStatus').textContent='SAVING…';PROFILE={...(PROFILE||{}),email:user.email||'',name:name||user.displayName||'',photo:acctPhoto,emailOptIn:el('acctEmailOpt').checked,phone,smsOptIn:sms,notebook:el('acctNotebook').value.trim(),studyDay:el('acctDay').value};
  try{if(fb){const {doc,setDoc}=fb.fsM;await setDoc(doc(db,'users',user.uid),PROFILE,{merge:true});try{if(name&&fb.auth.currentUser)await fb.authM.updateProfile(fb.auth.currentUser,{displayName:name});}catch(e){}}
    el('acctStatus').textContent='SAVED.'+(sms?' YOU ARE ON THE DAILY SCRIPTURE LIST.':'');nav();}catch(e){el('acctStatus').textContent='COULD NOT SAVE — TRY AGAIN.';}};
async function loadProgress(){if(!fb){const M=el('myScores');if(M)M.innerHTML='<div class="notice">(demo) Scores appear here on the live site.</div>';return;}
  const {collection,getDocs}=fb.fsM;const qs=await getDocs(collection(db,'users',user.uid,'scores'));const notes=await fetchNotes(0);
  let h='',n=0,sum=0;qs.forEach(d=>{const v=d.data();n++;sum+=v.score/v.total;h+=`<div class="noteCard"><b>${d.id.replace('week','Week ')}</b> — best ${v.score}/${v.total}</div>`;});
  const S=el('pStats');if(S)S.innerHTML=`<div><b>${n}</b><span>weeks quizzed</span></div><div><b>${notes.length}</b><span>notes kept</span></div><div><b>${n?Math.round(100*sum/n)+'%':'—'}</b><span>best average</span></div>`;
  const M=el('myScores');if(M)M.innerHTML=h||'<div class="notice">No quizzes yet — this week is waiting for you.</div>';}
window.downloadNotes=async()=>{const notes=await fetchNotes(0);if(!notes.length)return alert('No notes yet.');
  const txt=`MY KINGDOM JOURNEY NOTES\n${new Date().toLocaleDateString()}\n\n`+notes.sort((a,b)=>a.week-b.week||a.at-b.at).map(x=>`WEEK ${x.week} · ${x.title}${x.refs?` (${x.refs})`:''}\n${x.text}`).join('\n\n— — —\n\n')+`\n\n${LINKS.hub}`;
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));a.download='kingdom-journey-notes.txt';a.click();};
window.downloadData=async()=>{if(!fb)return alert('Demo mode.');const {collection,getDocs}=fb.fsM;const out={profile:PROFILE,scores:[],notes:[]};
  (await getDocs(collection(db,'users',user.uid,'scores'))).forEach(d=>out.scores.push({week:d.id,...d.data()}));(await getDocs(collection(db,'users',user.uid,'notes'))).forEach(d=>out.notes.push(d.data()));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}));a.download='kingdom-journey-my-data.json';a.click();};
window.restartJourney=async()=>{if(!confirm('Restart your journey? Your quiz scores and notes will be cleared. Your account and conversations stay.'))return;if(!confirm('Last check — this cannot be undone. Restart now?'))return;
  if(!fb){alert('Demo mode.');return;}const {collection,getDocs,deleteDoc,doc,setDoc}=fb.fsM;
  for(const sub of ['scores','notes']){const qs=await getDocs(collection(db,'users',user.uid,sub));for(const d of qs.docs)await deleteDoc(d.ref);}
  await setDoc(doc(db,'users',user.uid),{startedAt:Date.now(),restarts:((PROFILE&&PROFILE.restarts)||0)+1,lastView:null},{merge:true});if(PROFILE){PROFILE.restarts=(PROFILE.restarts||0)+1;PROFILE.lastView=null;}
  alert('Your journey starts again at Week 1. Good evening, friend.');go('home');};
window.deleteSeat=async()=>{if(!fb)return alert('Demo mode.');if(!confirm('Delete your seat? Your profile, scores, notes and sign-in on this site will be removed. This cannot be undone.'))return;if(!confirm('Last check — delete everything now?'))return;
  try{const {collection,getDocs,deleteDoc,doc}=fb.fsM;for(const sub of ['scores','notes']){const qs=await getDocs(collection(db,'users',user.uid,sub));for(const d of qs.docs)await deleteDoc(d.ref);}await deleteDoc(doc(db,'users',user.uid));
    await fb.authM.deleteUser(fb.auth.currentUser);alert('Your seat is cleared. The door stays open.');user=null;PROFILE=null;go('home');}
  catch(e){if(e&&e.code==='auth/requires-recent-login'){alert('For safety, sign out and sign in again, then delete your seat.');}else alert('Could not delete right now — write to Jonathan and it will be done by hand.');}};

/* ============================================================
   CREDITS & SOURCES — the closing credits
   ============================================================ */
async function renderCredits(){const A=el('app');
  A.innerHTML=`<div class="hero" style="padding-top:12px"><h1 style="font-size:24px">Credits &amp; Sources</h1><div class="always">The lessons are made to be watched like a story. Everything they lean on is listed here, the way a film lists its credits at the end.</div></div>
  <div class="panel"><h2>Scripture</h2><p class="sub">the text the whole journey stands on</p><p style="color:var(--mist);font-size:14.5px">Quotations are from the King James Version. Where a passage is paraphrased for the story, the wording is ours; the meaning is held to the text, two or three witnesses first.</p></div>
  <div class="panel" style="margin-top:14px"><h2>How the studies are built</h2><p class="sub">what carries weight, in order</p><ul style="margin-left:18px;color:var(--mist);font-size:14.5px;line-height:1.7"><li><b style="color:var(--parchment)">The Bible</b> controls doctrine and context.</li><li><b style="color:var(--parchment)">The Message</b> is brought in as teaching, in our own words — what it says, never a quotation, never a date — and only where the Bible carries it.</li><li><b style="color:var(--parchment)">Outside sources</b> — harmonies of Samuel, Kings and Chronicles, archaeology, chronology — provide structure and history, never doctrine.</li><li>Anything still unresolved is said out loud and labelled an <b style="color:var(--parchment)">open question</b>.</li></ul></div>
  <div class="panel" style="margin-top:14px"><h2>Images</h2><p class="sub">real depictions, drawn from open collections</p><div id="imgCredits">Loading…</div></div>
  <div class="panel" style="margin-top:14px"><h2>Music &amp; sound</h2><p class="sub">listed as the series grows</p><div id="musicCredits" style="color:var(--mist);font-size:14.5px">${(CONFIG.credits&&CONFIG.credits.music||[]).map(m=>`<div>${esc(m)}</div>`).join('')||'The theme and the daily readings will be credited here.'}</div></div>`;
  const box=el('imgCredits');if(!fb){box.innerHTML='<div class="notice">(demo) Image credits load on the live site.</div>';return;}
  try{const {collection,getDocs,query,orderBy}=fb.fsM;const qs=await getDocs(query(collection(db,'vault'),orderBy('savedAt','desc')));let h='';
    qs.forEach(d=>{const v=d.data();h+=`<div style="display:flex;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"><img src="${v.thumb||v.src}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:6px;cursor:zoom-in" onclick="openLightbox('${v.src}','${esc(v.title)}')"><div style="font-size:13.5px"><b>${esc(v.title||'Untitled')}</b><div style="color:var(--mist)">${esc([v.artist,v.date].filter(Boolean).join(' · '))}</div><div style="color:var(--mist-dim);font-size:12px">${esc([v.source,v.license].filter(Boolean).join(' · '))}${v.week?` · Week ${v.week}`:''}</div></div></div>`;});
    box.innerHTML=h||'<div class="notice">Image credits will appear here as the lessons are illustrated.</div>';}catch(e){box.innerHTML='<div class="notice">Image credits will appear here as the lessons are illustrated.</div>';}
}

/* ============================================================
   ADMIN — the teacher's desk
   ============================================================ */
let MEMBERS=[];
function renderAdmin(){const A=el('app');if(!isAdmin()){A.innerHTML='<div class="lockmsg">Teacher only.</div>';return;}
  const t=view.tab&&['inbox','members','vault','tools'].includes(view.tab)?view.tab:'inbox';
  A.innerHTML=`<div class="hero" style="padding-top:12px"><h1 style="font-size:24px">Teacher's Desk</h1></div>
   <div class="tabs">${[['inbox','Messages'],['members','Members'],['vault','Image Vault'],['tools','Tools']].map(([k,l])=>`<button class="${t===k?'on':''}" onclick="adminTab('${k}')">${l}${k==='inbox'&&UNREAD.admin?' ●':''}</button>`).join('')}</div><div id="adminPanel"></div>`;
  const P=el('adminPanel');
  if(t==='inbox'){P.innerHTML=`<div class="cgrid ${activeConv?'threadOpen':''}" id="cgrid"><div class="clist"><div class="top"><b>ALL THREADS</b><span style="font-size:11px;color:var(--mist-dim)">newest first</span></div><div id="convList" style="flex:1;overflow-y:auto"><div class="notice" style="margin:12px">Loading…</div></div></div><div class="cthread" id="cthread"><div class="lockmsg" style="padding:60px 20px"><div class="big">💬</div><p>Pick a thread.</p></div></div></div>`;
    if(fb)listenConvList();if(activeConv)openConv(activeConv.id);}
  if(t==='members'){P.innerHTML=`<div class="panel"><h2>Members</h2><p class="sub">who has taken a seat</p><div id="mStats" class="notice">Loading…</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px"><button class="btn ghost sm" onclick="copyEmails()">Copy email list (opted-in)</button><button class="btn ghost sm" onclick="copySms()">Copy the Daily Scripture SMS list</button></div><div id="members"></div>
     <h3 style="margin-top:22px;color:var(--gold-300);font-family:var(--ff-display);font-size:14px;letter-spacing:.06em">Daily Scripture — send helper</h3><p class="sub">paste today's verse, copy it, and send it from the sender's phone to the SMS list</p><textarea id="dailyTxt" rows="3" placeholder="THE DAILY SCRIPTURE · 'for they have not rejected thee, but they have rejected me…' — 1 Samuel 8:7. This week: Two Kingdoms, One King."></textarea><br><br><button class="btn" onclick="copyDaily()">Copy today's text message</button></div>`;if(fb)loadMembers();}
  if(t==='vault')renderVault(P);
  if(t==='tools'){const ph=journeyPhase();P.innerHTML=`<div class="panel"><h2>Tools</h2><p class="sub">the levers</p>
    <div class="notice">Current week: <b>${CONFIG.currentWeek}</b>. To unlock the next week: add <code>content/weekNN.json</code>, raise <code>currentWeek</code> in <code>content/config.json</code>, and push — the site redeploys itself. Titles for the sealed weeks ahead come from <code>content/trail.json</code>.</div>
    <div class="notice">The hour on the road: <b>${ph===0?'deep night':ph<0.5?'toward dawn':ph<0.92?'morning':'full day'}</b> (${Math.round(ph*100)}%). It follows <code>dawn.nightUntil</code> / <code>dawn.dayFrom</code> in <code>config.json</code>; set <code>journeyComplete: true</code> when the road is walked and it becomes day for everyone.<br><label style="display:block;margin-top:8px;font-size:12px;color:var(--mist-dim)">Preview the hour (this device only, not saved)</label><input type="range" min="0" max="1" step="0.01" value="${phaseNow()}" oninput="previewPhase(this.value)"> <button class="btn ghost sm" onclick="previewPhase(null)">Back to the real hour</button> <button class="btn sm" onclick="go('home')">See the trail</button></div>
    <div class="notice">Short links, all pointing at the real accounts: <b>/yt</b> <b>/tt</b> <b>/ig</b> <b>/fb</b> <b>/tw</b> <b>/th</b> <b>/live</b>. Change a handle once in <code>vercel.json</code> and <code>kj.js</code>; every bio on every platform keeps working.</div>
    <div class="notice">Polls: create a document in <code>polls</code> with <code>q</code>, <code>opts</code> (array) and <code>active: true</code>; it appears on the week's Poll tab immediately.</div></div>
    <div class="panel" style="margin-top:14px"><h2>Admins</h2><p class="sub">who else can open the Teacher's Desk — add someone by their Google email when the time comes</p><div id="adminList">Loading…</div>
     <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><input type="email" id="newAdmin" placeholder="name@gmail.com" style="flex:1;min-width:220px"><button class="btn" onclick="addAdmin()">Add admin</button></div>
     <div class="notice" style="margin-top:12px">Admins see every conversation, the members list, the Image Vault and these tools. The two root admins cannot be removed. Nobody else ever sees the Admin tab.</div></div>`;drawAdmins();}
}
window.adminTab=k=>{view.tab=k;pushRoute();render();};
window.previewPhase=v=>{phaseOverride=v===null?null:parseFloat(v);if(trail)trail.setPhase(phaseNow());if(ambStarted)amb.setPhase(phaseNow());};
function drawAdmins(){const L=el('adminList');if(!L)return;L.innerHTML=ADMINS.map(e=>`<div class="mrow" style="grid-template-columns:1fr auto"><span class="mono" style="font-size:12.5px">${esc(e)}${ROOT_ADMINS.includes(e)?' <span class="srcpill">root</span>':''}</span><span>${ROOT_ADMINS.includes(e)?'':`<button class="btn danger sm" onclick="removeAdmin('${esc(e)}')">Remove</button>`}</span></div>`).join('');}
async function saveAdmins(){if(!fb)return;const {doc,setDoc}=fb.fsM;const extra=ADMINS.filter(e=>!ROOT_ADMINS.includes(e));await setDoc(doc(db,'settings','admins'),{emails:extra,updatedAt:Date.now(),by:user.email},{merge:false});}
window.addAdmin=async()=>{const e=(el('newAdmin').value||'').trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))return alert('Enter a valid email.');if(ADMINS.includes(e))return alert('Already an admin.');
  if(!confirm(`Give ${e} the keys to the Teacher's Desk?`))return;ADMINS.push(e);try{await saveAdmins();el('newAdmin').value='';drawAdmins();}catch(x){ADMINS=ADMINS.filter(a=>a!==e);alert('Could not save — '+(x.message||x));}};
window.removeAdmin=async e=>{if(!confirm(`Remove ${e} from the admins?`))return;const before=[...ADMINS];ADMINS=ADMINS.filter(a=>a!==e);try{await saveAdmins();drawAdmins();}catch(x){ADMINS=before;alert('Could not save — '+(x.message||x));}};
async function loadMembers(){try{const {collection,getDocs}=fb.fsM;const qs=await getDocs(collection(db,'users'));MEMBERS=[];qs.forEach(d=>MEMBERS.push(d.data()));MEMBERS.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const em=MEMBERS.filter(m=>m.emailOptIn&&m.email).length,sm=MEMBERS.filter(m=>m.smsOptIn&&m.phone).length;
    el('mStats').innerHTML=`<b>${MEMBERS.length}</b> member${MEMBERS.length===1?'':'s'} · <b>${em}</b> email opt-in · <b>${sm}</b> on the Daily Scripture SMS list`;
    let h=`<div class="mrow head"><span>Name</span><span>Email</span><span>Phone</span><span>✉</span><span>📱</span></div>`;MEMBERS.forEach(m=>{h+=`<div class="mrow"><span>${esc(m.name||'—')}${m.studyDay?`<br><small style="color:var(--mist-dim)">${DAYS[m.studyDay]||''}</small>`:''}</span><span class="mono" style="font-size:11.5px">${esc(m.email||'—')}</span><span class="mono" style="font-size:11.5px">${esc(m.phone||'—')}</span><span>${m.emailOptIn?'✅':'—'}</span><span>${m.smsOptIn&&m.phone?'✅':'—'}</span></div>`;});el('members').innerHTML=h;
  }catch(e){el('mStats').textContent='Could not load members: '+(e.message||e);}}
function copyTxt(t,msg){navigator.clipboard.writeText(t).then(()=>alert(msg)).catch(()=>prompt('Copy:',t));}
window.copyEmails=()=>{const L=MEMBERS.filter(m=>m.emailOptIn&&m.email).map(m=>m.email);if(!L.length)return alert('No opted-in emails yet.');copyTxt(L.join(', '),L.length+' email(s) copied — paste into BCC.');};
window.copySms=()=>{const L=MEMBERS.filter(m=>m.smsOptIn&&m.phone).map(m=>m.phone);if(!L.length)return alert('No one on the SMS list yet.');copyTxt(L.join(', '),L.length+' number(s) copied for the Daily Scripture.');};
window.copyDaily=()=>{const t=el('dailyTxt').value.trim();if(!t)return alert("Paste today's verse first.");copyTxt(t,'Message copied — now copy the SMS list and send.');};

/* ---------------- Image Vault: real depictions from open collections ---------------- */
let VAULT=[];
function renderVault(P){P.innerHTML=`<div class="panel"><h2>Image Vault</h2><p class="sub">search the open collections of the world's museums — real paintings, engravings, photographs, artefacts — and keep the ones the lessons will use. Credits are stored here and shown only on the Credits page.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input type="text" id="vq" placeholder="e.g. David Goliath, Ark of the Covenant, Solomon temple, Jerusalem 19th century…" style="flex:1;min-width:240px" onkeydown="if(event.key==='Enter')vaultSearch()"><select id="vsrc" style="width:auto"><option value="all">All sources</option><option value="met">The Met</option><option value="aic">Art Institute of Chicago</option><option value="wiki">Wikimedia Commons</option></select><button class="btn" onclick="vaultSearch()">Search</button></div>
  <div style="font-size:11.5px;color:var(--mist-dim);margin-top:8px">Only public-domain and open-licence results are shown. Museum images are served from the museum; nothing is copied here except the credit line.</div><div id="vres" class="vgrid"></div></div>
  <div class="panel" style="margin-top:14px"><h2>Kept for the lessons</h2><p class="sub">what the Credits page will list</p><div id="vkept" class="vgrid">Loading…</div></div>`;loadVault();}
async function loadVault(){if(!fb)return;const {collection,getDocs,query,orderBy}=fb.fsM;const qs=await getDocs(query(collection(db,'vault'),orderBy('savedAt','desc')));VAULT=[];qs.forEach(d=>VAULT.push({id:d.id,...d.data()}));
  el('vkept').innerHTML=VAULT.map(v=>vcard(v,true)).join('')||'<div class="notice">Nothing kept yet.</div>';}
function vcard(v,kept){return `<div class="vcard"><img src="${v.thumb||v.src}" alt="" loading="lazy" onclick="openLightbox('${v.src}','${esc(v.title)} — ${esc(v.artist||'')}')"><div class="m"><b title="${esc(v.title)}">${esc(v.title||'Untitled')}</b><i>${esc([v.artist,v.date].filter(Boolean).join(' · '))}</i><span class="srcpill">${esc(v.source)}</span> <span class="srcpill">${esc(v.license||'')}</span></div>
  <div class="a">${kept?`<input type="text" placeholder="week" value="${v.week||''}" style="width:64px;padding:4px 8px;font-size:12px" onchange="vaultWeek('${v.id}',this.value)"><button class="btn danger sm" onclick="vaultDrop('${v.id}')">Remove</button>`:`<button class="btn sm" onclick='vaultKeep(${JSON.stringify(v).replace(/'/g,"&#39;")})'>Keep</button>`}</div></div>`;}
window.vaultSearch=async()=>{const q=el('vq').value.trim();if(!q)return;const src=el('vsrc').value;const R=el('vres');R.innerHTML='<div class="notice">Searching…</div>';let out=[];
  const jobs=[];
  if(src==='all'||src==='met')jobs.push((async()=>{try{const s=await (await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(q)}`)).json();const ids=(s.objectIDs||[]).slice(0,14);
    for(const id of ids){try{const o=await (await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)).json();if(o.isPublicDomain&&o.primaryImageSmall)out.push({src:o.primaryImage||o.primaryImageSmall,thumb:o.primaryImageSmall,title:o.title,artist:o.artistDisplayName,date:o.objectDate,source:'The Met',license:'Public domain',url:o.objectURL});}catch(e){}}}catch(e){}})());
  if(src==='all'||src==='aic')jobs.push((async()=>{try{const s=await (await fetch(`https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&limit=14&fields=id,title,artist_display,date_display,image_id,is_public_domain`)).json();
    (s.data||[]).forEach(o=>{if(o.is_public_domain&&o.image_id)out.push({src:`https://www.artic.edu/iiif/2/${o.image_id}/full/1686,/0/default.jpg`,thumb:`https://www.artic.edu/iiif/2/${o.image_id}/full/400,/0/default.jpg`,title:o.title,artist:(o.artist_display||'').split('\n')[0],date:o.date_display,source:'Art Institute of Chicago',license:'Public domain (CC0)',url:`https://www.artic.edu/artworks/${o.id}`});});}catch(e){}})());
  if(src==='all'||src==='wiki')jobs.push((async()=>{try{const s=await (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=14&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&origin=*`)).json();
    Object.values((s.query||{}).pages||{}).forEach(p=>{const ii=(p.imageinfo||[])[0];if(!ii)return;const m=ii.extmetadata||{};const lic=(m.LicenseShortName||{}).value||'';if(!/public domain|cc0|cc by(?!-nc)/i.test(lic))return;if(!/\.(jpe?g|png)$/i.test(ii.url))return;
      out.push({src:ii.url,thumb:ii.thumburl||ii.url,title:(p.title||'').replace(/^File:/,'').replace(/\.[a-z]+$/i,''),artist:((m.Artist||{}).value||'').replace(/<[^>]+>/g,'').slice(0,80),date:((m.DateTimeOriginal||{}).value||'').slice(0,20),source:'Wikimedia Commons',license:lic,url:ii.descriptionurl});});}catch(e){}})());
  await Promise.all(jobs);R.innerHTML=out.map(v=>vcard(v,false)).join('')||'<div class="notice">Nothing open-licence found for that. Try a painter (Tissot, Doré, Rembrandt) or a place.</div>';};
window.vaultKeep=async v=>{if(!fb)return;const {collection,addDoc}=fb.fsM;await addDoc(collection(db,'vault'),{...v,savedAt:Date.now(),week:''});loadVault();};
window.vaultWeek=async(id,w)=>{const {doc,updateDoc}=fb.fsM;await updateDoc(doc(db,'vault',id),{week:w.trim()});};
window.vaultDrop=async id=>{if(!confirm('Remove this image from the vault?'))return;const {doc,deleteDoc}=fb.fsM;await deleteDoc(doc(db,'vault',id));loadVault();};

boot();
