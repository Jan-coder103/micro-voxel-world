import { afterEach,it,expect,vi } from 'vitest';
import { WeaponAudio } from '../../src/combat/audio';
afterEach(()=>vi.unstubAllGlobals());
it('caps voices, mutes/stops/disconnects and closes its context exactly once',async()=>{
  const nodes:{disconnect:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>}[]=[],close=vi.fn(async()=>{});
  class Context {
    state='running';currentTime=0;destination={};resume=vi.fn(async()=>{});close=close;
    createGain(){const g={gain:{value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()};return g;}
    createOscillator(){const o={frequency:{setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},type:'',connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};nodes.push(o);return o;}
  }
  vi.stubGlobal('AudioContext',Context);const audio=new WeaponAudio();audio.play('rapid');expect(audio.activeVoices).toBe(0);await audio.toggle();expect(audio.state).toBe('Enabled');for(let i=0;i<100;i++)audio.play('explosion');expect(audio.activeVoices).toBe(8);await audio.toggle();expect(audio.activeVoices).toBe(0);expect(audio.state).toBe('Muted');nodes.forEach(n=>expect(n.disconnect).toHaveBeenCalledOnce());audio.dispose();audio.dispose();expect(close).toHaveBeenCalledOnce();
});
it('audio creation failure remains a visible optional presentation failure',async()=>{
  vi.stubGlobal('AudioContext',class {constructor(){throw new Error('denied');}});const audio=new WeaponAudio();await audio.toggle();expect(audio.muted).toBe(true);expect(audio.state).toContain('Audio unavailable');expect(()=>audio.play('cannon')).not.toThrow();audio.dispose();
});
it('master volume and gameplay cues share the eight-voice budget and playback failures are optional',async()=>{
  const gains:{gain:{value:number};disconnect:ReturnType<typeof vi.fn>}[]=[],frequencies:number[]=[];let fail=false;
  class Context {
    state='running';currentTime=0;destination={};resume=async()=>{};close=async()=>{};
    createGain(){const g={gain:{value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()};gains.push(g);return g;}
    createOscillator(){if(fail)throw new Error('device lost');return {frequency:{setValueAtTime:(n:number)=>frequencies.push(n),exponentialRampToValueAtTime:vi.fn()},type:'',connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};}
  }
  vi.stubGlobal('AudioContext',Context);const audio=new WeaponAudio();audio.setVolume(.5);expect(audio.volume).toBe(.5);expect(()=>audio.setVolume(NaN)).toThrow();expect(()=>audio.setVolume(2)).toThrow();expect(audio.volume).toBe(.5);
  await audio.toggle();expect(gains[0].gain.value).toBeCloseTo(.06);for(const kind of ['hit','clear','warning','mission'] as const)audio.play(kind);expect(new Set(frequencies).size).toBe(4);for(let i=0;i<20;i++)audio.play('rapid');expect(audio.activeVoices).toBe(8);
  audio.setVolume(0);expect(audio.activeVoices).toBe(0);audio.play('hit');expect(audio.activeVoices).toBe(0);audio.setVolume(.25);expect(gains[0].gain.value).toBeCloseTo(.03);fail=true;expect(()=>audio.play('clear')).not.toThrow();expect(audio.state).toContain('Audio unavailable');expect(audio.muted).toBe(true);audio.dispose();
});
