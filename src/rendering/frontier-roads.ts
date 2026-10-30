import { BufferAttribute,BufferGeometry,Group,Mesh,MeshStandardMaterial } from 'three';
import { airbaseReserved,airbaseSample } from '../world/airbase';
import { cropFields,FARM_BLOCK_SIZE } from '../world/regional-terrain';
import type { Road,SettlementWorld } from '../world/settlements';

/** World-anchored road tiles reach 1.5 km, independently of the 32 m terrain stream. */
export function createFrontierRoads(world:SettlementWorld,wake=()=>{}){
  const group=new Group(),material=new MeshStandardMaterial({vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  group.name='regional-road-network';
  const tiles=new Map<string,Mesh<BufferGeometry,MeshStandardMaterial>>();let queue:{x:number;z:number}[]=[],anchor='',timer:ReturnType<typeof setTimeout>|undefined,disposed=false;
  const build=(tx:number,tz:number)=>{
    const ox=tx*512,oz=tz*512,positions:number[]=[],colors:number[]=[],roads:Road[]=[];
    const s=world.region(tx,tz);if(s)roads.push(...s.roads);
    for(let bz=Math.floor(oz/FARM_BLOCK_SIZE);bz<=Math.floor((oz+512)/FARM_BLOCK_SIZE);bz++)for(let bx=Math.floor(ox/FARM_BLOCK_SIZE);bx<=Math.floor((ox+512)/FARM_BLOCK_SIZE);bx++)for(const f of cropFields(world.seed,bx,bz)){
      roads.push({minX:f.minX-2.5,maxX:f.maxX+2.5,minZ:f.minZ-2.5,maxZ:f.minZ-.2,id:'farm-lane',kind:'driveway',surface:'dirt',from:'farm',to:'farm'});
    }
    for(const r of roads){
      const x0=Math.max(ox,r.minX),x1=Math.min(ox+512,r.maxX),z0=Math.max(oz,r.minZ),z1=Math.min(oz+512,r.maxZ);if(x1<=x0||z1<=z0)continue;
      const nx=Math.ceil((x1-x0)/8),nz=Math.ceil((z1-z0)/8);
      for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
        const corners=[[x0+(x1-x0)*ix/nx,z0+(z1-z0)*iz/nz],[x0+(x1-x0)*ix/nx,z0+(z1-z0)*(iz+1)/nz],[x0+(x1-x0)*(ix+1)/nx,z0+(z1-z0)*(iz+1)/nz],[x0+(x1-x0)*(ix+1)/nx,z0+(z1-z0)*iz/nz]];
        const samples=corners.map(([x,z])=>airbaseSample(world.seed,x,z));
        if(corners.some(([x,z],i)=>airbaseReserved(x,z)||samples[i].water!==null))continue;
        for(const i of [0,1,2,0,2,3]){const [x,z]=corners[i];positions.push(x-ox,samples[i].height+.16,z-oz);colors.push(...(r.surface==='dirt'||r.id==='farm-lane'?[.38,.28,.16]:r.kind==='driveway'?[.34,.33,.29]:[.12,.15,.16]));}
      }
    }
    const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));geometry.setAttribute('color',new BufferAttribute(new Float32Array(colors),3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const mesh=new Mesh(geometry,material);mesh.position.set(ox,0,oz);group.add(mesh);tiles.set(`${tx},${tz}`,mesh);
  };
  const pump=()=>{timer=undefined;if(disposed)return;const tile=queue.shift();if(tile)build(tile.x,tile.z);wake();if(queue.length)timer=setTimeout(pump,12);};
  return {group,get pending(){return queue.length>0||timer!==undefined;},get count(){return tiles.size;},
    update(x:number,z:number){if(disposed)return;const cx=Math.floor(x/512),cz=Math.floor(z/512),key=`${cx},${cz}`;if(key===anchor)return;anchor=key;
      const wanted=new Set<string>();queue=[];for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){const key=`${cx+dx},${cz+dz}`;wanted.add(key);if(!tiles.has(key))queue.push({x:cx+dx,z:cz+dz});}
      queue.sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz));
      for(const [key,mesh] of tiles)if(!wanted.has(key)){mesh.removeFromParent();mesh.geometry.dispose();tiles.delete(key);}
      if(queue.length&&timer===undefined)timer=setTimeout(pump,0);
    },dispose(){if(disposed)return;disposed=true;if(timer!==undefined)clearTimeout(timer);timer=undefined;queue=[];for(const mesh of tiles.values())mesh.geometry.dispose();tiles.clear();material.dispose();group.removeFromParent();group.clear();}};
}
