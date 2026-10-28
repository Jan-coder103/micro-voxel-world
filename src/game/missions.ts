export type MissionId='clearpass'|'relief';
export interface MissionDefinition {
  readonly id:MissionId;readonly title:string;readonly brief:string;
  readonly groups:readonly (readonly [number,number])[];
  readonly sector:{readonly x:number;readonly z:number};
  readonly stars:number;readonly requires?:MissionId;readonly defenseSeconds?:number;
}
export const MISSIONS:Readonly<Record<MissionId,MissionDefinition>>=Object.freeze({
  clearpass:Object.freeze({id:'clearpass',title:'Operation Clearpass',brief:'Clear three marked hordes. Make a sector flyover. Return to base.',groups:Object.freeze([[-1,0],[0,0],[1,0]] as const),sector:Object.freeze({x:16,z:16}),stars:1}),
  relief:Object.freeze({id:'relief',title:'Relief Watch',brief:'Protect the supply post: surviving marked hordes drain its integrity. Clear them, fly over the post and return to base.',groups:Object.freeze([[-1,2],[0,2],[1,2]] as const),sector:Object.freeze({x:16,z:80}),stars:2,requires:'clearpass',defenseSeconds:75}),
});
export function missionId(value:string):MissionId{if(!Object.hasOwn(MISSIONS,value))throw new Error('Unknown mission');return value as MissionId;}
