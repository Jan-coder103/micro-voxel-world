/** Small synthesized placeholders. Damage never depends on audio availability. */
export class WeaponAudio {
  muted=true;
  error='';
  private context:AudioContext|undefined;
  private master:GainNode|undefined;
  private readonly voices=new Map<OscillatorNode,GainNode>();
  private disposed=false;
  get activeVoices(){return this.voices.size;}
  get state(){return this.error|| (this.muted?'Muted':this.context?.state==='running'?'Enabled':'Audio blocked; toggle sound to retry');}
  async toggle(){
    if(this.disposed)return;
    if(!this.muted){this.muted=true;this.stop();return;}
    try {
      if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.12;this.master.connect(this.context.destination);}
      await this.context.resume();if(this.disposed)return;this.muted=this.context.state!=='running';this.error='';
    }catch{this.error='Audio unavailable; weapons remain active';this.muted=true;}
  }
  play(kind:'rapid'|'cannon'|'explosion'){
    const ctx=this.context,master=this.master;if(this.disposed||this.muted||!ctx||!master||ctx.state!=='running'||this.voices.size>=8)return;
    const voice=ctx.createOscillator(),gain=ctx.createGain(),length=kind==='explosion'?.45:kind==='cannon'?.12:.045;
    voice.type=kind==='explosion'?'sawtooth':'square';voice.frequency.setValueAtTime(kind==='rapid'?180:kind==='cannon'?100:65,ctx.currentTime);voice.frequency.exponentialRampToValueAtTime(25,ctx.currentTime+length);
    gain.gain.setValueAtTime(.3,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+length);voice.connect(gain);gain.connect(master);this.voices.set(voice,gain);
    voice.onended=()=>{this.voices.delete(voice);voice.disconnect();gain.disconnect();};voice.start();voice.stop(ctx.currentTime+length);
  }
  stop(){for(const [voice,gain] of this.voices){voice.onended=null;voice.stop();voice.disconnect();gain.disconnect();}this.voices.clear();}
  dispose(){if(this.disposed)return;this.disposed=true;this.stop();this.master?.disconnect();void this.context?.close().catch(()=>{});}
}
