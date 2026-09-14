/* ============================================================
   AMBIENCE — the night, then the morning.
   Everything here is synthesised in the browser with the Web Audio API:
   wind, crickets, an owl, and — as the phase turns toward day — birdsong.
   No samples, no downloads, no licences. Starts only on a user gesture.
   ============================================================ */
export class Ambience {
  constructor(){
    this.ctx=null; this.master=null; this.enabled=false; this.phase=0; this.volume=0.7;
    this.layers={}; this._timers=[]; this._built=false;
  }
  /* must be called from a click/tap */
  async start(){
    if(!this.ctx){
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return false;
      this.ctx=new AC();
      this.master=this.ctx.createGain(); this.master.gain.value=0; this.master.connect(this.ctx.destination);
      this._build();
    }
    if(this.ctx.state==='suspended'){try{await this.ctx.resume();}catch(e){}}
    return true;
  }
  setEnabled(on){
    this.enabled=!!on;
    if(!this.ctx)return;
    const t=this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.enabled?this.volume:0,t,this.enabled?1.2:0.4);
    if(!this.enabled){ /* let the tail fade, then suspend to save battery */
      clearTimeout(this._suspendT); this._suspendT=setTimeout(()=>{if(!this.enabled&&this.ctx&&this.ctx.state==='running')this.ctx.suspend();},2500);
    }else{ clearTimeout(this._suspendT); if(this.ctx.state==='suspended')this.ctx.resume(); }
  }
  setVolume(v){this.volume=Math.max(0,Math.min(1,v));if(this.ctx&&this.enabled)this.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,0.3);}
  /* 0 = deep night · 0.5 = dawn · 1 = full day */
  setPhase(p){
    this.phase=Math.max(0,Math.min(1,p)); if(!this.ctx)return;
    const t=this.ctx.currentTime,L=this.layers,ph=this.phase;
    const crick=ph<0.35?1:ph>0.62?0:1-(ph-0.35)/0.27;
    const birds=ph<0.38?0:ph>0.78?1:(ph-0.38)/0.40;
    const wind=0.9-0.35*ph;
    L.wind.gain.gain.setTargetAtTime(0.22*wind,t,2);
    L.crickets.gain.gain.setTargetAtTime(0.55*crick,t,2);
    L.birds.gain.gain.setTargetAtTime(0.5*birds,t,2);
    L.owl.gain.gain.setTargetAtTime(ph<0.4?0.6:0,t,2);
  }
  dispose(){this._timers.forEach(clearInterval);this._timers=[];if(this.ctx){try{this.ctx.close();}catch(e){}this.ctx=null;}}

  /* ---------- construction ---------- */
  _noiseBuffer(seconds,kind){
    const sr=this.ctx.sampleRate,n=Math.floor(sr*seconds),b=this.ctx.createBuffer(1,n,sr),d=b.getChannelData(0);
    let last=0;
    for(let i=0;i<n;i++){const w=Math.random()*2-1;
      if(kind==='brown'){last=(last+0.02*w)/1.02;d[i]=last*3.5;}else d[i]=w;}
    return b;
  }
  _build(){
    const c=this.ctx;
    const layer=(g)=>{const gain=c.createGain();gain.gain.value=0;gain.connect(this.master);return {gain};};
    /* WIND — brown noise, band-passed, breathing slowly */
    {
      const L=layer();const src=c.createBufferSource();src.buffer=this._noiseBuffer(6,'brown');src.loop=true;
      const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=380;bp.Q.value=0.45;
      const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1200;
      const swell=c.createGain();swell.gain.value=0.6;
      const lfo=c.createOscillator();lfo.frequency.value=0.07;const lfoG=c.createGain();lfoG.gain.value=0.35;lfo.connect(lfoG);lfoG.connect(swell.gain);
      const lfo2=c.createOscillator();lfo2.frequency.value=0.023;const lfo2G=c.createGain();lfo2G.gain.value=180;lfo2.connect(lfo2G);lfo2G.connect(bp.frequency);
      src.connect(bp);bp.connect(lp);lp.connect(swell);swell.connect(L.gain);src.start();lfo.start();lfo2.start();
      this.layers.wind=L;
    }
    /* CRICKETS — four voices, high tones pulsed in short trains */
    {
      const L=layer();const voices=[];
      for(let v=0;v<4;v++){
        const osc=c.createOscillator();osc.type='sine';osc.frequency.value=3900+v*260+Math.random()*120;
        const osc2=c.createOscillator();osc2.type='sine';osc2.frequency.value=osc.frequency.value*2.01;const g2=c.createGain();g2.gain.value=0.35;osc2.connect(g2);
        const env=c.createGain();env.gain.value=0;
        const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=osc.frequency.value;bp.Q.value=3;
        const pan=c.createStereoPanner();pan.pan.value=(v-1.5)/2.2;
        osc.connect(env);g2.connect(env);env.connect(bp);bp.connect(pan);pan.connect(L.gain);osc.start();osc2.start();
        voices.push({env,next:c.currentTime+Math.random()*2,rate:0.32+Math.random()*0.5,vel:0.5+Math.random()*0.5});
      }
      const schedule=()=>{const now=c.currentTime;
        voices.forEach(vc=>{while(vc.next<now+2.5){const t0=Math.max(vc.next,now);const pulses=2+Math.floor(Math.random()*3);
            for(let p=0;p<pulses;p++){const ts=t0+p*0.036;vc.env.gain.setValueAtTime(0,ts);vc.env.gain.linearRampToValueAtTime(vc.vel,ts+0.006);vc.env.gain.linearRampToValueAtTime(0,ts+0.02);}
            vc.next=t0+0.12+vc.rate*(0.8+Math.random()*0.6)+(Math.random()<0.08?2+Math.random()*3:0);}});};
      schedule();this._timers.push(setInterval(schedule,1200));
      this.layers.crickets=L;
    }
    /* OWL — two soft hoots, now and then */
    {
      const L=layer();const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;lp.connect(L.gain);
      const hoot=(t0,f0,len,vel)=>{const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f0*0.86,t0+len);
        const o2=c.createOscillator();o2.type='triangle';o2.frequency.setValueAtTime(f0*2,t0);o2.frequency.exponentialRampToValueAtTime(f0*1.72,t0+len);const g2=c.createGain();g2.gain.value=0.12;o2.connect(g2);
        const g=c.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vel,t0+0.06);g.gain.setValueAtTime(vel,t0+len*0.55);g.gain.exponentialRampToValueAtTime(0.001,t0+len);
        o.connect(g);g2.connect(g);g.connect(lp);o.start(t0);o2.start(t0);o.stop(t0+len+0.05);o2.stop(t0+len+0.05);};
      const call=()=>{const t0=c.currentTime+0.5+Math.random()*3;const f=330+Math.random()*60;hoot(t0,f,0.32,0.5);hoot(t0+0.38,f*0.94,0.42,0.42);if(Math.random()<0.5)hoot(t0+0.95,f*0.9,0.55,0.38);};
      this._timers.push(setInterval(()=>{if(this.enabled&&this.phase<0.4&&Math.random()<0.55)call();},14000));
      this.layers.owl=L;
    }
    /* BIRDS — five singers, quick frequency sweeps in little phrases */
    {
      const L=layer();const singers=[];
      for(let v=0;v<5;v++){const pan=c.createStereoPanner();pan.pan.value=(Math.random()*2-1)*0.8;const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=1500;pan.connect(hp);hp.connect(L.gain);
        singers.push({pan,base:2200+Math.random()*1800,next:c.currentTime+Math.random()*4,vel:0.35+Math.random()*0.35});}
      const chirp=(s,t0,f1,f2,len,vel)=>{const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(f1,t0);o.frequency.exponentialRampToValueAtTime(f2,t0+len*0.7);o.frequency.exponentialRampToValueAtTime(f1*0.9,t0+len);
        const g=c.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vel,t0+len*0.25);g.gain.linearRampToValueAtTime(0,t0+len);o.connect(g);g.connect(s.pan);o.start(t0);o.stop(t0+len+0.02);};
      const schedule=()=>{const now=c.currentTime;
        singers.forEach(s=>{while(s.next<now+3){const t0=Math.max(s.next,now);const notes=2+Math.floor(Math.random()*5);let t=t0;
            for(let i=0;i<notes;i++){const f1=s.base*(0.8+Math.random()*0.5),f2=f1*(1.2+Math.random()*0.8),len=0.06+Math.random()*0.12;chirp(s,t,f1,f2,len,s.vel*(0.7+Math.random()*0.3));t+=len+0.03+Math.random()*0.09;}
            s.next=t+0.8+Math.random()*4;}});};
      schedule();this._timers.push(setInterval(schedule,1500));
      this.layers.birds=L;
    }
    this._built=true;this.setPhase(this.phase);
  }
}
