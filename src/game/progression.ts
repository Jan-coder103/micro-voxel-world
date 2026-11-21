import { PLANES,isPlaneId,planeDefinition,type PlaneId } from './aircraft-roster';
import type { StorageLike } from '../persistence/chunk-deltas';
export type Upgrade='engine'|'bounty'|'weapons';
const upgrades:Upgrade[]=['engine','bounty','weapons'];
export type GearSlot='engine'|'weapon'|'airframe'|'utility';
export interface Bonuses { engine:number;damage:number;rate:number;range:number;blast:number;cash:number;xp:number;handling:number;brakes:number;speed:number;boss:number }
const defaults=():Bonuses=>({engine:1,damage:1,rate:1,range:1,blast:1,cash:1,xp:1,handling:1,brakes:1,speed:1,boss:1});
export interface Skill { id:string;name:string;branch:'Flight'|'Gunnery'|'Operations';description:string;requires?:string;max:number;effect:Partial<Bonuses> }
export const SKILLS:readonly Skill[]=[
  {id:'thrust',name:'Power management',branch:'Flight',description:'+6% acceleration per rank',max:3,effect:{engine:.06}},
  {id:'control',name:'Control surfaces',branch:'Flight',description:'+5% steering response',requires:'thrust',max:3,effect:{handling:.05}},
  {id:'brakes',name:'Landing discipline',branch:'Flight',description:'+20% wheel braking',requires:'thrust',max:3,effect:{brakes:.2}},
  {id:'cruise',name:'High-speed flight',branch:'Flight',description:'+4% maximum speed',requires:'control',max:3,effect:{speed:.04}},
  {id:'turbine',name:'Turbine specialist',branch:'Flight',description:'+10% acceleration',requires:'cruise',max:3,effect:{engine:.1}},
  {id:'ace',name:'Ace pilot',branch:'Flight',description:'+5% handling and +3% speed',requires:'brakes',max:3,effect:{handling:.05,speed:.03}},
  {id:'ballistics',name:'Ballistics',branch:'Gunnery',description:'+8% weapon damage',max:3,effect:{damage:.08}},
  {id:'feed',name:'Rapid cycling',branch:'Gunnery',description:'+8% fire rate',requires:'ballistics',max:3,effect:{rate:.08}},
  {id:'optics',name:'Long-range optics',branch:'Gunnery',description:'+10% weapon / lock range',requires:'ballistics',max:3,effect:{range:.1}},
  {id:'blast',name:'Demolitions',branch:'Gunnery',description:'+10% explosive radius',requires:'feed',max:3,effect:{blast:.1}},
  {id:'hunter',name:'Mutant hunter',branch:'Gunnery',description:'+20% damage against mutants',requires:'optics',max:3,effect:{boss:.2}},
  {id:'arsenal',name:'Master armorer',branch:'Gunnery',description:'+12% damage and +5% fire rate',requires:'hunter',max:3,effect:{damage:.12,rate:.05}},
  {id:'contracts',name:'Field contracts',branch:'Operations',description:'+8% money from all kills',max:3,effect:{cash:.08}},
  {id:'recon',name:'Combat analysis',branch:'Operations',description:'+10% XP from all kills',requires:'contracts',max:3,effect:{xp:.1}},
  {id:'salvage',name:'Salvage specialist',branch:'Operations',description:'+10% kill money',requires:'contracts',max:3,effect:{cash:.1}},
  {id:'veteran',name:'Veteran instructor',branch:'Operations',description:'+15% XP',requires:'recon',max:3,effect:{xp:.15}},
  {id:'logistics',name:'Combat logistics',branch:'Operations',description:'+5% fire rate and +5% engine power',requires:'salvage',max:3,effect:{rate:.05,engine:.05}},
  {id:'commission',name:'High command',branch:'Operations',description:'+15% money and +10% XP',requires:'veteran',max:3,effect:{cash:.15,xp:.1}},
];
export interface ShopItem { id:string;name:string;slot:GearSlot;cost:number;description:string;requires?:string;effect:Partial<Bonuses> }
export const SHOP:readonly ShopItem[]=[
  {id:'engine-1',name:'Tuned injection',slot:'engine',cost:250,description:'+15% acceleration',effect:{engine:.15}},
  {id:'engine-2',name:'Turboprop conversion',slot:'engine',cost:900,requires:'engine-1',description:'+35% acceleration, +8% speed',effect:{engine:.35,speed:.08}},
  {id:'engine-3',name:'Afterburning turbine',slot:'engine',cost:2800,requires:'engine-2',description:'+60% acceleration, +18% speed',effect:{engine:.6,speed:.18}},
  {id:'engine-4',name:'Naval launch package',slot:'engine',cost:1600,requires:'engine-1',description:'+50% acceleration, +20% brakes',effect:{engine:.5,brakes:.2}},
  {id:'gun-1',name:'Armor-piercing rounds',slot:'weapon',cost:300,description:'+25% weapon damage',effect:{damage:.25}},
  {id:'gun-2',name:'Rotary feed system',slot:'weapon',cost:800,requires:'gun-1',description:'+40% fire rate',effect:{rate:.4}},
  {id:'gun-3',name:'High-yield shells',slot:'weapon',cost:1500,requires:'gun-1',description:'+35% damage, +35% blast radius',effect:{damage:.35,blast:.35}},
  {id:'gun-4',name:'Titan penetrators',slot:'weapon',cost:3200,requires:'gun-3',description:'+120% mutant damage, +30% all damage',effect:{boss:1.2,damage:.3}},
  {id:'gun-5',name:'Siege arsenal',slot:'weapon',cost:6500,requires:'gun-4',description:'+90% damage, +25% rate, +25% blast',effect:{damage:.9,rate:.25,blast:.25}},
  {id:'frame-1',name:'Precision servos',slot:'airframe',cost:350,description:'+15% handling response',effect:{handling:.15}},
  {id:'frame-2',name:'Carrier landing gear',slot:'airframe',cost:700,description:'+80% wheel braking',effect:{brakes:.8}},
  {id:'frame-3',name:'Aerodynamic fairings',slot:'airframe',cost:1700,requires:'frame-1',description:'+15% speed, +10% handling',effect:{speed:.15,handling:.1}},
  {id:'frame-4',name:'Naval airframe',slot:'airframe',cost:3000,requires:'frame-2',description:'+50% braking, +25% handling, +8% speed',effect:{brakes:.5,handling:.25,speed:.08}},
  {id:'utility-1',name:'Bounty transponder',slot:'utility',cost:400,description:'+25% money rewards',effect:{cash:.25}},
  {id:'utility-2',name:'Flight recorder',slot:'utility',cost:400,description:'+30% XP rewards',effect:{xp:.3}},
  {id:'utility-3',name:'Targeting radar',slot:'utility',cost:1000,description:'+35% weapon / lock range',effect:{range:.35}},
  {id:'utility-4',name:'Command uplink',slot:'utility',cost:2200,requires:'utility-1',description:'+40% money and +30% XP',effect:{cash:.4,xp:.3}},
  {id:'utility-5',name:'Hunter fire control',slot:'utility',cost:4000,requires:'utility-3',description:'+60% mutant damage and +50% range',effect:{boss:.6,range:.5}},
];
export interface RunDebrief {number:number;outcome:'landed'|'crashed';plane:PlaneId;kills:number;seconds:number;baseMoney:number;baseXP:number;money:number;xp:number;bonus:number}
interface Progress {schema:3;planes:PlaneId[];selectedPlane:PlaneId;runs:number;lastRun?:RunDebrief;money:number;xp:number;levels:Record<Upgrade,number>;skills:Record<string,number>;owned:string[];equipped:Partial<Record<GearSlot,string>>}
const fresh=():Progress=>({schema:3,planes:['kestrel'],selectedPlane:'kestrel',runs:0,money:0,xp:0,levels:{engine:0,bounty:0,weapons:0},skills:{},owned:[],equipped:{}});
const KEY='mvw:frontier:pilot:v3',PREVIOUS='mvw:frontier:pilot:v2',LEGACY='mvw:frontier:pilot:v1';
export class PilotProgress {
  data=fresh();error='';revision=0;private writable=true;
  constructor(private storage?:StorageLike){
    try{if(!storage)throw new Error('Storage unavailable');const text=storage.getItem(KEY)??storage.getItem(PREVIOUS)??storage.getItem(LEGACY);if(text===null)return;if(text.length>32768)throw new Error('Invalid pilot record');const v=JSON.parse(text);
      if(!v||![1,2,3].includes(v.schema)||!Number.isSafeInteger(v.money)||v.money<0||!Number.isSafeInteger(v.xp)||v.xp<0||!v.levels||Object.keys(v.levels).sort().join(',')!=='bounty,engine,weapons'||!upgrades.every(k=>Number.isInteger(v.levels[k])&&v.levels[k]>=0&&v.levels[k]<=5))throw new Error('Invalid pilot record');
      if(v.schema===1){if(Object.keys(v).sort().join(',')!=='levels,money,schema,xp')throw new Error('Invalid legacy pilot');this.data={...fresh(),money:v.money,xp:v.xp,levels:v.levels};}
      else {if((v.schema===2?Object.keys(v).sort().join(',')!=='equipped,levels,money,owned,schema,skills,xp':Object.keys(v).some(k=>!['schema','planes','selectedPlane','runs','lastRun','money','xp','levels','skills','owned','equipped'].includes(k)))||!v.skills||typeof v.skills!=='object'||Array.isArray(v.skills)||!Object.entries(v.skills).every(([id,rank])=>{const s=SKILLS.find(s=>s.id===id);return s&&Number.isInteger(rank)&&Number(rank)>=0&&Number(rank)<=s.max;})||!Array.isArray(v.owned)||new Set(v.owned).size!==v.owned.length||!v.owned.every((id:unknown)=>SHOP.some(s=>s.id===id))||!v.equipped||typeof v.equipped!=='object'||Array.isArray(v.equipped)||!Object.entries(v.equipped).every(([slot,id])=>v.owned.includes(id)&&SHOP.some(s=>s.id===id&&s.slot===slot)))throw new Error('Invalid pilot loadout');this.data={...fresh(),...v,schema:3};if(this.skillPoints<0||SKILLS.some(s=>(v.skills[s.id]??0)>0&&s.requires&&!(v.skills[s.requires]>0)))throw new Error('Invalid skill allocation');
        if(v.schema===3){
          if(!Array.isArray(v.planes)||v.planes.length<1||v.planes.length>5||new Set(v.planes).size!==v.planes.length||!v.planes.includes('kestrel')||!v.planes.every(isPlaneId)||PLANES.some(p=>v.planes.includes(p.id)&&p.requires&&!v.planes.includes(p.requires))||!isPlaneId(v.selectedPlane)||!v.planes.includes(v.selectedPlane)||!Number.isSafeInteger(v.runs)||v.runs<0)throw new Error('Invalid aircraft progression');
          if(v.lastRun!==undefined){const r=v.lastRun;if(!r||Object.keys(r).sort().join(',')!=='baseMoney,baseXP,bonus,kills,money,number,outcome,plane,seconds,xp'||!['landed','crashed'].includes(r.outcome)||!isPlaneId(r.plane)||!v.planes.includes(r.plane)||!Number.isSafeInteger(r.number)||r.number!==v.runs||r.number<1||![r.kills,r.seconds,r.baseMoney,r.baseXP,r.money,r.xp].every(n=>Number.isSafeInteger(n)&&n>=0)||r.bonus!==(r.outcome==='landed'?100:0)||r.money!==r.baseMoney*(r.outcome==='landed'?2:1)||r.xp!==r.baseXP*(r.outcome==='landed'?2:1))throw new Error('Invalid sortie record');}
        }
      }
    }catch(e){this.data=fresh();this.error=String(e);this.writable=false;}
  }
  private save(){this.revision++;if(!this.writable)return;try{this.storage!.setItem(KEY,JSON.stringify(this.data));}catch(e){this.error=String(e);this.writable=false;}}
  bank(money:number,xp:number){if(!Number.isSafeInteger(money)||money<0||!Number.isSafeInteger(xp)||xp<0||!Number.isSafeInteger(this.data.money+money)||!Number.isSafeInteger(this.data.xp+xp))throw new Error('Invalid reward');this.data.money+=money;this.data.xp+=xp;this.save();}
  get plane(){return planeDefinition(this.data.selectedPlane);}
  unlockPlane(id:string){const p=PLANES.find(p=>p.id===id);if(!p||this.data.planes.includes(p.id)||p.requires&&!this.data.planes.includes(p.requires)||this.data.xp<p.xp||this.data.money<p.cost)return false;this.data.money-=p.cost;this.data.planes.push(p.id);this.save();return true;}
  selectPlane(id:string){if(!isPlaneId(id)||!this.data.planes.includes(id))return false;this.data.selectedPlane=id;this.save();return true;}
  finishRun(outcome:RunDebrief['outcome'],kills:number,seconds:number,baseMoney:number,baseXP:number){
    const multiplier=outcome==='landed'?2:1,money=baseMoney*multiplier,xp=baseXP*multiplier;
    if(!['landed','crashed'].includes(outcome)||![kills,seconds,baseMoney,baseXP,money,xp,this.data.runs+1,this.data.money+money,this.data.xp+xp].every(n=>Number.isSafeInteger(n)&&n>=0))throw new Error('Invalid sortie reward');
    this.data.runs++;this.data.lastRun={number:this.data.runs,outcome,plane:this.data.selectedPlane,kills,seconds,baseMoney,baseXP,money,xp,bonus:outcome==='landed'?100:0};this.data.money+=money;this.data.xp+=xp;this.save();return this.data.lastRun;
  }
  cost(id:Upgrade){return 100*(this.data.levels[id]+1);}
  buy(id:Upgrade){if(!upgrades.includes(id)||this.data.levels[id]>=5||this.data.money<this.cost(id))return false;this.data.money-=this.cost(id);this.data.levels[id]++;this.save();return true;}
  get skillPoints(){return Math.floor(this.data.xp/300)-Object.values(this.data.skills).reduce((sum,n)=>sum+n,0);}
  learn(id:string){const s=SKILLS.find(s=>s.id===id);if(!s||this.skillPoints<1||(this.data.skills[id]??0)>=s.max||s.requires&&!(this.data.skills[s.requires]>0))return false;this.data.skills[id]=(this.data.skills[id]??0)+1;this.save();return true;}
  purchase(id:string){const item=SHOP.find(i=>i.id===id);if(!item||this.data.owned.includes(id)||this.data.money<item.cost||item.requires&&!this.data.owned.includes(item.requires))return false;this.data.money-=item.cost;this.data.owned.push(id);this.save();return true;}
  equip(slot:GearSlot,id:string){if(!['engine','weapon','airframe','utility'].includes(slot)||id&&(!this.data.owned.includes(id)||!SHOP.some(i=>i.id===id&&i.slot===slot)))return false;if(id)this.data.equipped[slot]=id;else delete this.data.equipped[slot];this.save();return true;}
  get bonuses(){const b=defaults();for(const s of SKILLS)for(const [k,v] of Object.entries(s.effect))b[k as keyof Bonuses]+=v*(this.data.skills[s.id]??0);for(const id of Object.values(this.data.equipped)){const item=SHOP.find(i=>i.id===id);if(item)for(const [k,v] of Object.entries(item.effect))b[k as keyof Bonuses]+=v;}return b;}
}
