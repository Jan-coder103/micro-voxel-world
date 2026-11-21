import type { Object3D,WebGLRenderer } from 'three';
import { FrameProfile } from './frame-profile';
export type DrawCategory='Terrain chunks'|'Terrain coverage'|'Trees'|'Clouds'|'Settlements'|'Roads'|'Naval'|'Zombies'|'Mutants'|'Aircraft'|'Base'|'Effects'|'Sky'|'Other';
/** Bounded categories, no retained mesh/geometry references beyond registered roots. */
export class DrawProfile {
  readonly cpu=new FrameProfile();readonly counts=new FrameProfile();
  private roots=new WeakMap<Object3D,DrawCategory>();
  register(root:Object3D,category:DrawCategory){this.roots.set(root,category);}
  category(object:Object3D){
    for(let o:Object3D|null=object;o;o=o.parent){const category=this.roots.get(o);if(category)return category;if(o.name.startsWith('chunk:'))return 'Terrain chunks';}
    return 'Other';
  }
  record(name:string,ms:number,before:WebGLRenderer['info']['render'],after:WebGLRenderer['info']['render']){
    this.cpu.add(name,ms);
    for(const key of ['calls','triangles','lines','points'] as const)this.counts.add(`${name} / ${key}`,Math.max(0,after[key]-before[key]));
  }
  finish(){this.cpu.finish();this.counts.finish();}
  reset(){this.cpu.reset();this.counts.reset();}
  report(){const counts=this.counts.report();return Object.entries(this.cpu.report()).map(([name,cpu])=>({name,cpu,calls:counts[`${name} / calls`],triangles:counts[`${name} / triangles`],lines:counts[`${name} / lines`],points:counts[`${name} / points`]})).sort((a,b)=>b.cpu.mean-a.cpu.mean);}
}
