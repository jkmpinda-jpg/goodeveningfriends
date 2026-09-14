/* The Herald — trumpets at the front door of goodeveningfriends.com.
   Browsers refuse to play sound until the visitor touches the page, so the door
   opens on a tap: a short curtain with the mark and "Come in". Once per session.
   "Come in quietly" and the ♪ control in the corner keep the sound off for good. */
(function(){
  var SEEN='gef-herald-seen', OFF='gef-sound-off';
  var store=function(k,v,s){try{(s?sessionStorage:localStorage).setItem(k,v);}catch(e){}};
  var read=function(k,s){try{return (s?sessionStorage:localStorage).getItem(k);}catch(e){return null;}};
  var audio=document.createElement('audio');audio.preload='auto';
  var o=document.createElement('source');o.src='/assets/audio/herald.ogg';o.type='audio/ogg';var m=document.createElement('source');m.src='/assets/audio/herald.mp3';m.type='audio/mpeg';
  audio.appendChild(o);audio.appendChild(m);audio.volume=0.85;document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(audio);});
  function play(){try{audio.currentTime=0;var p=audio.play();if(p&&p.catch)p.catch(function(){});}catch(e){}}
  function arrive(){document.body.classList.add('arrived');}
  var soundOff=read(OFF)==='1';

  /* the corner control: replay or silence the herald */
  function control(){
    var b=document.createElement('button');b.id='heraldCtl';b.type='button';b.setAttribute('aria-label','Sound');
    b.style.cssText='position:fixed;right:16px;bottom:16px;z-index:60;background:rgba(17,30,69,.72);border:1px solid #1E3060;color:#A7B4D1;font:600 11px Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;padding:8px 12px;border-radius:100px;cursor:pointer;backdrop-filter:blur(6px)';
    function paint(){b.textContent=soundOff?'♪ sound off':'♪ hear the herald';}
    b.addEventListener('click',function(){if(soundOff){soundOff=false;store(OFF,'0');play();}else{if(audio.paused){play();}else{audio.pause();soundOff=true;store(OFF,'1');}}paint();});
    paint();document.body.appendChild(b);
  }

  /* the curtain */
  function curtain(){
    var c=document.createElement('div');c.id='heraldCurtain';c.setAttribute('role','dialog');c.setAttribute('aria-label','Come in');
    c.style.cssText='position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;background:radial-gradient(120% 90% at 50% 8%,#1B3068 0%,transparent 58%),linear-gradient(178deg,#0A1330 0%,#050B1B 55%,#080F27 100%);color:#F6F1E6;transition:opacity .9s ease;cursor:pointer';
    c.innerHTML='<svg viewBox="0 0 74 74" width="92" height="92" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#A2761F"/><stop offset="42%" stop-color="#F0CE7E"/><stop offset="100%" stop-color="#D9A441"/></linearGradient><linearGradient id="cb" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#21458F"/><stop offset="42%" stop-color="#86AAF5"/><stop offset="100%" stop-color="#3B6FE0"/></linearGradient><radialGradient id="cbg" cx="42%" cy="26%" r="82%"><stop offset="0%" stop-color="#1C3370"/><stop offset="100%" stop-color="#070F26"/></radialGradient></defs><circle cx="37" cy="37" r="37" fill="url(#cbg)"/><circle cx="37" cy="37" r="35.5" fill="none" stroke="#D9A441" stroke-width="1.5" opacity=".48"/><path d="M 13 45.5 Q 37 18 61 32" fill="none" stroke="url(#cg)" stroke-width="6.4" stroke-linecap="round"/><path d="M 13 60.3 Q 37 32.9 61 47" fill="none" stroke="url(#cb)" stroke-width="6.4" stroke-linecap="round"/></svg>'+
      '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-style:italic;font-weight:600;font-size:clamp(34px,7vw,64px);line-height:1.05;margin-top:22px">Good evening, friends<span style="color:#F0CE7E">.</span></div>'+
      '<div style="height:1px;width:min(320px,60vw);background:linear-gradient(90deg,transparent,#D9A441,transparent);margin:24px 0 22px"></div>'+
      '<button type="button" id="heraldEnter" style="background:#F0CE7E;color:#050B1B;border:0;border-radius:100px;font:700 12px Cinzel,Georgia,serif;letter-spacing:.3em;text-transform:uppercase;padding:16px 34px;cursor:pointer;box-shadow:0 0 0 6px rgba(240,206,126,.12),0 18px 50px rgba(0,0,0,.5)">Come in</button>'+
      '<button type="button" id="heraldQuiet" style="background:none;border:0;color:#7385A8;font:500 12px Inter,system-ui,sans-serif;letter-spacing:.08em;margin-top:18px;cursor:pointer;text-decoration:underline;text-underline-offset:3px">come in quietly</button>';
    function open(withSound){if(withSound){soundOff=false;store(OFF,'0');play();}else{soundOff=true;store(OFF,'1');}store(SEEN,'1',true);c.style.opacity='0';c.style.pointerEvents='none';arrive();setTimeout(function(){if(c.parentNode)c.parentNode.removeChild(c);},950);var ctl=document.getElementById('heraldCtl');if(ctl)ctl.textContent=soundOff?'♪ sound off':'♪ hear the herald';}
    c.addEventListener('click',function(e){if(e.target.id==='heraldQuiet'){open(false);return;}open(true);});
    document.addEventListener('keydown',function(e){if(!c.parentNode)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();open(true);}});
    document.body.appendChild(c);setTimeout(function(){var b=document.getElementById('heraldEnter');if(b)b.focus();},50);
  }

  document.addEventListener('DOMContentLoaded',function(){
    control();
    if(read(SEEN,true)==='1'||soundOff){arrive();return;}
    curtain();
  });
})();
