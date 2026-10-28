export type SoundKind='rapid'|'cannon'|'explosion'|'hit'|'clear'|'warning'|'mission';
const SOUNDS:Record<SoundKind,{length:number;start:number;end:number;wave:OscillatorType;gain:number}>={
  rapid:{length:.045,start:180,end:25,wave:'square',gain:.3},
  cannon:{length:.12,start:100,end:25,wave:'square',gain:.3},
  explosion:{length:.45,start:65,end:25,wave:'sawtooth',gain:.3},
  hit:{length:.06,start:600,end:340,wave:'sine',gain:.13},
  clear:{length:.14,start:960,end:480,wave:'sine',gain:.18},
  warning:{length:.18,start:140,end:80,wave:'triangle',gain:.18},
  mission:{length:.3,start:520,end:1040,wave:'sine',gain:.2},
};
/** Synthesized game cues share an eight-voice cap; audio availability never gates combat. */
export class WeaponAudio {
  muted=true;error='';private level=1;
  private context:AudioContext|undefined;private master:GainNode|undefined;
  private readonly voices=new Map<OscillatorNode,GainNode>();private disposed=false;
  get activeVoices(){return this.voices.size;}
  get volume(){return this.level;}
  setVolume(value:number){if(!Number.isFinite(value)||value<0||value>1)throw new Error('Volume must be between 0 and 1');if(this.disposed)return;this.level=value;if(this.master)this.master.gain.value=.12*value;if(value===0)this.stop();}
  get state(){return this.error||(this.muted?'Muted':this.context?.state==='running'?'Enabled':'Audio blocked; toggle sound to retry');}
  async toggle(){
    if(this.disposed)return;
    if(!this.muted){this.muted=true;this.stop();return;}
    try{
      if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.12*this.level;this.master.connect(this.context.destination);}
      await this.context.resume();if(this.disposed)return;this.muted=this.context.state!=='running';this.error='';
    }catch{this.error='Audio unavailable; weapons remain active';this.muted=true;}
  }
  private release(voice:OscillatorNode,gain:GainNode,stop=false){
    this.voices.delete(voice);voice.onended=null;
    if(stop)try{voice.stop();}catch{/* Optional audio may already have ended. */}
    try{voice.disconnect();}catch{/* Closed context. */}try{gain.disconnect();}catch{/* Closed context. */}
  }
  play(kind:SoundKind){
    const ctx=this.context,master=this.master;if(this.disposed||this.muted||!this.level||!ctx||!master||ctx.state!=='running'||this.voices.size>=8)return;
    let voice:OscillatorNode|undefined,gain:GainNode|undefined;
    try{
      const sound=SOUNDS[kind];voice=ctx.createOscillator();gain=ctx.createGain();
      voice.type=sound.wave;voice.frequency.setValueAtTime(sound.start,ctx.currentTime);voice.frequency.exponentialRampToValueAtTime(sound.end,ctx.currentTime+sound.length);
      gain.gain.setValueAtTime(sound.gain,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+sound.length);voice.connect(gain);gain.connect(master);this.voices.set(voice,gain);
      const activeVoice=voice,activeGain=gain;voice.onended=()=>this.release(activeVoice,activeGain);voice.start();voice.stop(ctx.currentTime+sound.length);
    }catch{if(voice&&gain)this.release(voice,gain,true);else{try{voice?.disconnect();}catch{/* Closed context. */}}this.error='Audio unavailable; weapons remain active';this.muted=true;this.stop();}
  }
  stop(){for(const [voice,gain] of this.voices)this.release(voice,gain,true);}
  dispose(){if(this.disposed)return;this.disposed=true;this.stop();this.master?.disconnect();void this.context?.close().catch(()=>{});}
}
