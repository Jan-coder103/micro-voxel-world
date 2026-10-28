export interface FeedbackCounters {ticks:number;shots:number;hits:number;kills:number;blasts:number}
/** Bounded presentation history follows simulation ticks, never wall time or cosmetic capacity. */
export class CombatFeedback {
  private previous:FeedbackCounters={ticks:0,shots:0,hits:0,kills:0,blasts:0};
  private hitAt=-Infinity;private killAt=-Infinity;private impulseAt=-Infinity;private strength=0;
  newHits=0;newKills=0;newBlasts=0;hit=false;cleared=false;
  reset(c?:FeedbackCounters){this.previous={ticks:c?.ticks??0,shots:c?.shots??0,hits:c?.hits??0,kills:c?.kills??0,blasts:c?.blasts??0};this.hitAt=this.killAt=this.impulseAt=-Infinity;this.strength=0;this.newHits=this.newKills=this.newBlasts=0;this.hit=this.cleared=false;}
  update(c:FeedbackCounters){
    if(c.ticks<this.previous.ticks||c.hits<this.previous.hits||c.shots<this.previous.shots||c.kills<this.previous.kills||c.blasts<this.previous.blasts)this.reset();
    this.newHits=c.hits-this.previous.hits;this.newKills=c.kills-this.previous.kills;this.newBlasts=c.blasts-this.previous.blasts;
    if(this.newHits)this.hitAt=c.ticks;if(this.newKills)this.killAt=c.ticks;
    if(c.shots>this.previous.shots||this.newBlasts){this.impulseAt=c.ticks;this.strength=this.newBlasts?.18:.06;}
    this.hit=c.ticks-this.hitAt<18;this.cleared=c.ticks-this.killAt<28;
    this.previous.ticks=c.ticks;this.previous.shots=c.shots;this.previous.hits=c.hits;this.previous.kills=c.kills;this.previous.blasts=c.blasts;
  }
  offset(enabled:boolean,running:boolean){
    const age=this.previous.ticks-this.impulseAt,amount=enabled&&running?this.strength*Math.max(0,1-age/12):0;
    if(amount===0)return {x:0,y:0};
    return {x:Math.sin(this.previous.ticks*2.17)*amount,y:Math.cos(this.previous.ticks*1.73)*amount*.6};
  }
}
export type EffectsLevel='full'|'reduced'|'off';
export interface ComfortSettings {effects:EffectsLevel;smoke:boolean;flashes:boolean;shake:boolean;contrast:boolean;fog:boolean;volume:number}
export function comfortDefaults(reducedMotion=false):ComfortSettings{return {effects:reducedMotion?'reduced':'full',smoke:!reducedMotion,flashes:!reducedMotion,shake:false,contrast:true,fog:true,volume:.65};}
