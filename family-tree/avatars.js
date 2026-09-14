/* Procedural cartoon avatars for the Family Tree — placeholders until each name gets its 3D character.
   Everything is drawn from the person's id (so the same person always looks the same), the zone colour, and the tags. */
function rng(seed){let s=0;for(let i=0;i<seed.length;i++)s=(s*31+seed.charCodeAt(i))>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const SKIN=['#F1C9A5','#E0AC7E','#C68B59','#A76B45','#7E4E30','#5C3A22'];
const HAIR=['#1A1410','#2E1F14','#4A2E19','#6B4A2B','#8C6A3F','#B8B0A6','#D9D2C8'];
const TUNIC=['#6B7F9E','#7C6A9E','#9E6B6B','#6B9E85','#9E8A5A','#5A7A9E','#8A5A7A'];
export function avatar(p,color){
  const r=rng(p.id);const t=new Set(p.tags||[]);const woman=t.has('w');const king=t.has('k');const fallen=t.has('u');
  const skin=SKIN[Math.floor(r()*SKIN.length)];const hair=HAIR[Math.floor(r()*HAIR.length)];
  const tunic=fallen?'#5a4a4a':TUNIC[Math.floor(r()*TUNIC.length)];
  const beard=!woman&&r()<0.72;const long=r()<0.5;const bald=!woman&&r()<0.12;
  const gold=t.has('g'),blue=t.has('b');
  const ring=gold&&blue?'url(#ringGB)':gold?'#F0CE7E':blue?'#86AAF5':fallen?'#8B3A4B':'rgba(167,180,209,.5)';
  const blinkDelay=(r()*5).toFixed(2);const bobDelay=(r()*3).toFixed(2);
  let hairShape='';
  if(woman){hairShape=`<path d="M11 21 C10 8 34 8 33 21 L33 30 C33 34 30 34 29 30 L29 20 C29 13 15 13 15 20 L15 30 C14 34 11 34 11 30 Z" fill="${hair}"/>`;}
  else if(!bald){hairShape=long?`<path d="M11 20 C10 8 34 8 33 20 L32 27 C31 21 13 21 12 27 Z" fill="${hair}"/>`:`<path d="M12 19 C12 9 32 9 32 19 C28 15 16 15 12 19 Z" fill="${hair}"/>`;}
  const beardShape=beard?`<path d="M14 24 C14 34 30 34 30 24 C28 30 16 30 14 24 Z" fill="${hair}" opacity=".95"/>`:'';
  let hat='';
  if(king)hat=`<path d="M12 14 L15 6 L19 12 L22 4 L25 12 L29 6 L32 14 Z" fill="#F0CE7E" stroke="#A2761F" stroke-width=".8"/><circle cx="22" cy="6" r="1.3" fill="#3B6FE0"/>`;
  else if(p.group==='levi'&&!woman)hat=`<path d="M11 15 C11 8 33 8 33 15 L33 17 L11 17 Z" fill="#F6F1E6" stroke="#6D4C9F" stroke-width=".8"/>`;
  else if(woman)hat=`<path d="M9 22 C9 6 35 6 35 22 L35 26 C33 20 11 20 9 26 Z" fill="${color}" opacity=".85"/>`;
  else if(r()<0.45)hat=`<path d="M10 20 C10 9 34 9 34 20 L34 22 C30 17 14 17 10 22 Z" fill="${color}" opacity=".9"/><path d="M10 20 L34 20" stroke="#F6F1E6" stroke-width="1.2" opacity=".5"/>`;
  return `<g class="ava" style="animation-delay:${bobDelay}s">
   <circle cx="22" cy="22" r="21" fill="${color}" opacity=".18"/>
   <circle cx="22" cy="22" r="21" fill="none" stroke="${ring}" stroke-width="2"/>
   <clipPath id="c-${p.id}"><circle cx="22" cy="22" r="20"/></clipPath>
   <g clip-path="url(#c-${p.id})">
    <path d="M6 44 C6 30 38 30 38 44 Z" fill="${tunic}"/>
    <path d="M6 44 C6 30 38 30 38 44 Z" fill="${color}" opacity=".35"/>
    <rect x="19" y="26" width="6" height="6" fill="${skin}"/>
    <g class="head"><ellipse cx="22" cy="21" rx="8.5" ry="9.5" fill="${skin}"/>
     ${beardShape}${hairShape}${hat}
     <g class="eyes"><ellipse class="eye" cx="18.8" cy="21" rx="1.1" ry="1.3" fill="#1a1410" style="animation-delay:${blinkDelay}s"/><ellipse class="eye" cx="25.2" cy="21" rx="1.1" ry="1.3" fill="#1a1410" style="animation-delay:${blinkDelay}s"/></g>
     <path d="M19.5 25.5 Q22 27.5 24.5 25.5" stroke="#5a2e1e" stroke-width=".9" fill="none" opacity=".8"/>
     ${fallen?`<path d="M17 18 L20.5 19.5 M27 18 L23.5 19.5" stroke="#3a1a1a" stroke-width=".9"/>`:''}
    </g>
   </g>
  </g>`;
}
