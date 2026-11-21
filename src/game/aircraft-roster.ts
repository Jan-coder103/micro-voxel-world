export type PlaneId='kestrel'|'mule'|'comet'|'frontier'|'spectre';
export interface PlaneDefinition {id:PlaneId;tier:number;name:string;role:string;description:string;cost:number;xp:number;requires?:PlaneId;engine:number;speed:number;handling:number;damage:number;span:number;length:number;pivot:number;propellers:readonly number[]}
export const PLANES:readonly PlaneDefinition[]=[
  {id:'kestrel',tier:1,name:'Kestrel S-1',role:'Single-prop scout',description:'A salvaged high-wing bush plane. Center propeller, strut-braced wings and field repairs: your first way out.',cost:0,xp:0,engine:.7,speed:.8,handling:1.08,damage:.65,span:11.8,length:9.6,pivot:2.4,propellers:[0]},
  {id:'mule',tier:2,name:'Mule T-2',role:'Twin-prop gunship',description:'Two wing-mounted propellers, a larger armored cabin and increased firepower. Built for longer hunting runs.',cost:600,xp:600,requires:'kestrel',engine:.85,speed:.9,handling:1,damage:.8,span:16.8,length:12.8,pivot:2.4,propellers:[-3.4,3.4]},
  {id:'comet',tier:3,name:'Comet J-3',role:'First-generation jet',description:'A swept-wing interceptor with a nose intake, bubble canopy and one turbojet. Your first jet-powered combat aircraft.',cost:2500,xp:2500,requires:'mule',engine:.95,speed:.98,handling:1.08,damage:.9,span:12.8,length:14.8,pivot:2.4,propellers:[]},
  {id:'frontier',tier:4,name:'Frontier A-4',role:'Modern attack jet',description:'The original Frontier attacker: twin engines, heavy weapon pylons and a broad combat wing.',cost:8000,xp:8000,requires:'comet',engine:1,speed:1,handling:1.15,damage:1,span:17.4,length:16.4,pivot:2.4,propellers:[]},
  {id:'spectre',tier:5,name:'Spectre X-5',role:'Advanced fighter',description:'A radical twin-engine fighter with cranked delta wings, canards, twin fins and precision strike hardware.',cost:24000,xp:24000,requires:'frontier',engine:1.22,speed:1.18,handling:1.3,damage:1.5,span:16.8,length:19.8,pivot:2.4,propellers:[]},
];
export function planeDefinition(id:string){const plane=PLANES.find(p=>p.id===id);if(!plane)throw new Error('Unknown plane');return plane;}
export const isPlaneId=(id:unknown):id is PlaneId=>PLANES.some(p=>p.id===id);
