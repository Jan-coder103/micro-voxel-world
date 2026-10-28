import type { WeaponId } from '../combat/weapons.ts';
import type { Point } from './flight.ts';
export type AircraftId='fixed-wing'|'helicopter';
export type LoadoutId='multirole'|'precision'|'siege';
export type MountId='nose'|'port'|'starboard';
export const LOADOUTS:Readonly<Record<LoadoutId,readonly WeaponId[]>>=Object.freeze({
  multirole:Object.freeze(['minigun','autocannon','shell'] as WeaponId[]),
  precision:Object.freeze(['minigun','autocannon'] as WeaponId[]),
  siege:Object.freeze(['autocannon','shell'] as WeaponId[]),
});
export function aircraftId(value:string):AircraftId {
  if(value!=='fixed-wing'&&value!=='helicopter')throw new Error('Unknown aircraft');return value;
}
/** Session configuration only. Never shares keys or storage with world casualties. */
export class AircraftSetup {
  aircraft:AircraftId='fixed-wing';loadout:LoadoutId='multirole';mount:MountId='nose';
  setAircraft(value:string){this.aircraft=aircraftId(value);}
  setLoadout(value:string){if(!Object.hasOwn(LOADOUTS,value))throw new Error('Unknown loadout');this.loadout=value as LoadoutId;}
  setMount(value:string){if(!['nose','port','starboard'].includes(value))throw new Error('Unknown mount');this.mount=value as MountId;}
  get weapons(){return LOADOUTS[this.loadout];}
  allows(weapon:WeaponId){return this.weapons.includes(weapon);}
  /** Rotation agrees with the renderer's YXZ pitch/yaw/roll. Positive local fore points -Z. */
  muzzle(position:Point,heading:number,pitch:number,bank:number,scale=1):Point {
    const side=this.mount==='nose'?0:this.mount==='port'?-3.5:3.5;
    const fore=this.mount==='nose'?4.5:2.5,up=this.mount==='nose'?0:-.4;
    const sh=Math.sin(heading),ch=Math.cos(heading),sp=Math.sin(pitch),cp=Math.cos(pitch),sb=Math.sin(bank),cb=Math.cos(bank);
    const right={x:ch*cb+sh*sp*sb,y:-cp*sb,z:sh*cb-ch*sp*sb};
    const lift={x:ch*sb-sh*sp*cb,y:cp*cb,z:sh*sb+ch*sp*cb};
    return {x:position.x+scale*(right.x*side+lift.x*up+sh*cp*fore),y:position.y+scale*(right.y*side+lift.y*up+sp*fore),z:position.z+scale*(right.z*side+lift.z*up-ch*cp*fore)};
  }
}
