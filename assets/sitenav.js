/* Good evening, friends — the shared tabs (front door, home, series, family tree, legal).
   Usage: <div id="sitenav" data-here="home"></div> anywhere near the top of the page. */
(function(){
  const HERE=(document.getElementById('sitenav')||{}).dataset?.here||'';
  const YT='https://www.youtube.com/@Goodeveningfriends7';
  const SERIES=[['The Kingdom Journey','/kingdom-journey','now'],
    ['The Story of Redemption','https://www.youtube.com/playlist?list=PLwTZqGxvZwdUgWUmwLLlQCPET7-vAtaRC'],
    ['Living in the Spirit','https://www.youtube.com/playlist?list=PLwTZqGxvZwdWaXu0y-WJdWaVm3FaT4sbJ'],
    ['History & Authenticity of the Bible','https://www.youtube.com/playlist?list=PLwTZqGxvZwdUn8NFRdmuGHMvxjF2_l-Jv'],
    ['Christ — the collection','https://www.youtube.com/playlist?list=PLwTZqGxvZwdU53y7E0mIlLsC5dZPivQKD'],
    ['All series','/series']];
  const BIBLE=[['Blue Letter Bible','https://www.blueletterbible.org/'],['ScriptureMark canvas','https://www.scripturemark.org/canvas']];
  const ext=h=>h.startsWith('http')?' target="_blank" rel="noopener"':'';
  const dd=(label,items)=>`<div class="dd"><button type="button" aria-haspopup="true">${label} ▾</button><div class="menu">${items.map(([l,h,k])=>`<a href="${h}"${ext(h)} class="${k||''}">${l}</a>`).join('')}</div></div>`;
  const mark=`<svg viewBox="0 0 74 74" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="snG" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#A2761F"/><stop offset="42%" stop-color="#F0CE7E"/><stop offset="100%" stop-color="#D9A441"/></linearGradient><linearGradient id="snB" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#21458F"/><stop offset="42%" stop-color="#86AAF5"/><stop offset="100%" stop-color="#3B6FE0"/></linearGradient><radialGradient id="snBg" cx="42%" cy="26%" r="82%"><stop offset="0%" stop-color="#1C3370"/><stop offset="100%" stop-color="#070F26"/></radialGradient></defs><circle cx="37" cy="37" r="37" fill="url(#snBg)"/><circle cx="37" cy="37" r="35.5" fill="none" stroke="#D9A441" stroke-width="1.5" opacity=".48"/><path d="M 13 45.5 Q 37 18 61 32" fill="none" stroke="url(#snG)" stroke-width="6.4" stroke-linecap="round"/><path d="M 13 60.3 Q 37 32.9 61 47" fill="none" stroke="url(#snB)" stroke-width="6.4" stroke-linecap="round"/></svg>`;
  const css=`
  .gefnav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 20px;position:sticky;top:0;z-index:70;background:rgba(5,11,27,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(30,48,96,.7)}
  .gefnav .brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#F0CE7E;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:20px;font-weight:600;line-height:1}
  .gefnav .brand svg{width:34px;height:34px}
  .gefnav nav{display:flex;align-items:center;gap:2px;flex-wrap:wrap;justify-content:flex-end}
  .gefnav nav a,.gefnav nav .dd>button{color:#A7B4D1;font:500 13.5px Inter,system-ui,sans-serif;padding:7px 11px;border-radius:8px;border:1px solid transparent;background:none;cursor:pointer;text-decoration:none;white-space:nowrap}
  .gefnav nav a:hover,.gefnav nav .dd>button:hover{color:#F6F1E6}
  .gefnav nav a.on{color:#F0CE7E;border-color:rgba(217,164,65,.45);background:rgba(217,164,65,.08)}
  .gefnav nav a.cta{color:#050B1B;background:#F0CE7E;font-weight:600;margin-left:4px}
  .gefnav .dd{position:relative}
  .gefnav .dd .menu{display:none;position:absolute;top:calc(100% + 4px);right:0;min-width:250px;background:rgba(10,19,48,.98);border:1px solid #1E3060;border-radius:12px;padding:6px;box-shadow:0 14px 40px rgba(0,0,0,.45)}
  .gefnav .dd:hover .menu,.gefnav .dd.open .menu{display:block}
  .gefnav .dd .menu a{display:block;padding:8px 12px;color:#F6F1E6;white-space:normal}
  .gefnav .dd .menu a:hover{background:rgba(217,164,65,.1);color:#F0CE7E}
  .gefnav .dd .menu a.now{color:#F0CE7E}
  .gefnav .dd .menu a.now::after{content:' · the road now';font-size:11px;color:#7385A8}
  @media(max-width:720px){.gefnav{padding:8px 12px}.gefnav .brand span{display:none}.gefnav nav a.cta{display:none}.gefnav nav a,.gefnav nav .dd>button{font-size:12.5px;padding:6px 8px}}`;
  const on=k=>HERE===k?' class="on"':'';
  const html=`<style>${css}</style><header class="gefnav"><a class="brand" href="/" title="Good evening, friends — home">${mark}<span>Good evening, friends</span></a>
   <nav aria-label="Site"><a href="/kingdom-journey#profile"${on('profile')}>Profile</a><a href="/kingdom-journey#home"${on('trail')}>The Trail</a>${dd('Series',SERIES)}<a href="/family-tree/"${on('tree')}>The Family Tree</a>${dd('Bible',BIBLE)}<a class="cta" href="${YT}" target="_blank" rel="noopener">Watch on YouTube</a></nav></header>`;
  const host=document.getElementById('sitenav');if(host){host.outerHTML=html;}else{document.body.insertAdjacentHTML('afterbegin',html);}
  document.addEventListener('click',e=>{const b=e.target.closest('.gefnav .dd>button');document.querySelectorAll('.gefnav .dd.open').forEach(d=>{if(!b||d!==b.parentNode)d.classList.remove('open');});if(b){b.parentNode.classList.toggle('open');}});
})();
