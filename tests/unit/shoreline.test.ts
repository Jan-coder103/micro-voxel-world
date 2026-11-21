import { expect,it } from 'vitest';
import { regionalSample,regionLayout,regionalHeightCeiling } from '../../src/world/regional-terrain';
import { airbaseSample,airbaseHeightCeiling } from '../../src/world/airbase';
import { generateTerrain } from '../../src/streaming/terrain-data';
const surface=(s:{height:number;water:number|null})=>Math.max(s.height,s.water??-Infinity);

it('contains river and lake water with continuous banks across the old hard cutoffs',()=>{
  let shores=0;
  for(const seed of [0,103,12012,4294967295]){
    const l=regionLayout(seed);
    for(const x of [-900,-500,0,300,500,900,1200])for(const side of [-1,1]){
      const z=l.riverZ(x),a=regionalSample(seed,x,z+side*41.99),b=regionalSample(seed,x,z+side*42.01);
      expect(Math.abs(surface(a)-surface(b)),JSON.stringify({seed,x,side})).toBeLessThan(.15);
      for(let d=0;d<160;d+=.25){
        const wet=regionalSample(seed,x,z+side*d),next=regionalSample(seed,x,z+side*(d+.25));
        if(wet.water!==null&&next.water===null){shores++;expect(wet.water-wet.height).toBeLessThan(.2);}
      }
    }
    const lakeZ=l.riverZ(l.lakeX)+65;
    for(let i=0;i<24;i++){
      const angle=i*Math.PI/12,at=(r:number)=>regionalSample(seed,l.lakeX+Math.cos(angle)*155*r,lakeZ+Math.sin(angle)*110*r);
      expect(Math.abs(surface(at(1.2999))-surface(at(1.3001)))).toBeLessThan(.15);
    }
  }
  expect(shores).toBeGreaterThan(16);
});

it('blends water and land together at the airfield instead of leaving an elevated water shelf',()=>{
  for(const seed of [0,103,12012,4294967295]){
    const l=regionLayout(seed);
    for(const [x,z,dx,dz] of [[82,l.riverZ(82),.001,0],[-82,l.riverZ(-82),.001,0],[0,70,0,.001],[178,l.riverZ(178),.001,0]]){
      const a=airbaseSample(seed,x-dx,z-dz),b=airbaseSample(seed,x+dx,z+dz);
      expect(Math.abs(surface(a)-surface(b))).toBeLessThan(.11);
    }
    for(let z=-80;z<220;z+=10)for(let x=-200;x<220;x+=10){
      const b={minX:x,maxX:x+8,minZ:z,maxZ:z+8},top=airbaseHeightCeiling(seed,b);
      for(const dx of [0,4,8])for(const dz of [0,4,8])expect(surface(airbaseSample(seed,x+dx,z+dz))).toBeLessThanOrEqual(top);
    }
  }
});

it('keeps shaped banks under collision bounds and avoids vertical blue shoreline faces in streamed meshes',()=>{
  const seed=103,l=regionLayout(seed);let waterTriangles=0;
  for(const x of [-500,0,300,500,900])for(const side of [-1,1]){
    const z=l.riverZ(x)+side*42,b={minX:x-10,maxX:x+10,minZ:z-10,maxZ:z+10},top=regionalHeightCeiling(seed,b);
    for(let px=b.minX;px<=b.maxX;px+=2)for(let pz=b.minZ;pz<=b.maxZ;pz+=2)expect(surface(regionalSample(seed,px,pz))).toBeLessThanOrEqual(top);
    const data=generateTerrain({seed,x:Math.floor(x/32),z:Math.floor(z/32),lod:0,generator:'regional-v2',airbase:true});
    expect(data.waterDepth?.length).toBe(data.positions.length/3);
    for(let i=0;i<data.positions.length;i+=9){
      // Test water triangles, excluding the brown/green decoration cuboids.
      if([0,3,6].every(j=>data.colors[i+j+2]>data.colors[i+j]*1.5)){
        waterTriangles++;
        for(const j of [0,1,2])expect(data.waterDepth![i/3+j]).toBeGreaterThanOrEqual(0);
        expect(data.normals[i+1]).toBeGreaterThan(.9);
      }
    }
  }
  expect(waterTriangles).toBeGreaterThan(0);
});


it('keeps the river connected across the home approach apron while retaining a dry runway',()=>{
  const seed=103,layout=regionLayout(seed);
  for(let x=-200;x<=200;x+=4){const s=airbaseSample(seed,x,layout.riverZ(x));expect(s.water).not.toBeNull();}
  for(let z=120;z<=600;z+=20)for(const x of [-22,0,22])expect(airbaseSample(seed,x,z).water).toBeNull();
});
