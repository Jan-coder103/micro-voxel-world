import type { EffectsLevel } from '../game/feedback';
import { BoxGeometry, type BufferGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import type { Combat } from '../combat/weapons';
/** Fixed presentation allocations, owned by this adapter. No per-shot geometry/materials. */
export function createCombatView(combat:Combat) {
  const group=new Group(),sphere=new SphereGeometry(1,8,6),box=new BoxGeometry(1,1,1);
  const targetMaterial=new MeshStandardMaterial({color:'#d2a34b',roughness:1,flatShading:true});
  const smokeMaterial=new MeshBasicMaterial({color:'#5a6263',transparent:true,opacity:.16,depthWrite:false}),reducedBlast=new MeshBasicMaterial({color:'#bc9b62',wireframe:true});
  const tracerMaterial=new MeshBasicMaterial({color:'#ffe3a0'}),impactMaterial=new MeshBasicMaterial({color:'#ffae48'}),blastMaterial=new MeshBasicMaterial({color:'#ed9d53',transparent:true,opacity:.2,depthWrite:false});
  const targetMeshes=combat.targets.map(t=>{const m=new Mesh(sphere,targetMaterial);m.position.set(t.position.x,t.position.y,t.position.z);m.scale.setScalar(t.radius);group.add(m);return m;});
  const effects=combat.effects.map(()=>{const mesh=new Mesh<BufferGeometry,MeshBasicMaterial>(box,tracerMaterial);mesh.visible=false;group.add(mesh);return mesh;});
  const smoke=Array.from({length:16},()=>{const mesh=new Mesh(sphere,smokeMaterial);mesh.visible=false;group.add(mesh);return {mesh,age:2,radius:1};});
  const seen=new Float64Array(combat.effects.length).fill(-1);let previousTick=combat.ticks,previousBlasts=combat.blasts,droppedSmoke=0;
  const direction=new Vector3(),mid=new Vector3(),axis=new Vector3(0,0,1);
  let disposed=false;
  return {group,get activeSmoke(){return disposed?0:smoke.filter(p=>p.age<1.2).length;},get smokeCapacity(){return smoke.length;},get droppedSmoke(){return droppedSmoke;},update(options:{effects?:EffectsLevel;smoke?:boolean;flashes?:boolean}={}){
    if(disposed)return;
    const level=options.effects??'full',smoking=level==='full'&&(options.smoke??true),flashes=level==='full'&&(options.flashes??true);
    if(combat.ticks<previousTick||combat.blasts<previousBlasts){seen.fill(-1);for(const p of smoke)p.age=2;}
    const elapsed=Math.max(0,combat.ticks-previousTick)/60;previousTick=combat.ticks;previousBlasts=combat.blasts;
    for(const p of smoke){p.age=smoking?p.age+elapsed:2;p.mesh.visible=smoking&&p.age<1.2;if(p.mesh.visible){p.mesh.position.y+=elapsed*3;p.mesh.scale.setScalar(p.radius*(.3+p.age*.7));}}

    targetMeshes.forEach((mesh,i)=>{const t=combat.targets[i];mesh.visible=t.health>0;});
    effects.forEach((mesh,i)=>{const e=combat.effects[i];
      const fresh=e.active&&e.kind==='blast'&&(seen[i]<0||e.age<seen[i]);seen[i]=e.active&&e.kind==='blast'?e.age:-1;
      if(fresh&&smoking){const puff=smoke.find(p=>p.age>=1.2);if(puff){puff.age=0;puff.radius=Math.min(e.radius*.5,6);puff.mesh.position.set(e.to.x,e.to.y,e.to.z);puff.mesh.scale.setScalar(puff.radius*.3);puff.mesh.visible=true;}else droppedSmoke++;}
      mesh.visible=e.active&&level!=='off'&&(flashes||e.kind==='tracer'||e.kind==='blast');if(!mesh.visible)return;
      mesh.quaternion.identity();
      if(e.kind==='tracer') {direction.set(e.to.x-e.from.x,e.to.y-e.from.y,e.to.z-e.from.z);const length=direction.length();mid.set((e.from.x+e.to.x)/2,(e.from.y+e.to.y)/2,(e.from.z+e.to.z)/2);mesh.position.copy(mid);mesh.geometry=box;mesh.scale.set(level==='reduced'?.035:.08,level==='reduced'?.035:.08,Math.max(.01,length));if(length>0)mesh.quaternion.setFromUnitVectors(axis,direction.normalize());mesh.material=tracerMaterial;}
      else {mesh.geometry=e.kind==='blast'?sphere:box;mesh.position.set(e.to.x,e.to.y,e.to.z);mesh.scale.setScalar(e.kind==='blast'?e.radius*(.15+.85*e.age/e.lifetime):e.radius);mesh.material=e.kind==='blast'?(flashes?blastMaterial:reducedBlast):impactMaterial;}
    });
  },dispose(){if(disposed)return;disposed=true;group.removeFromParent();group.clear();sphere.dispose();box.dispose();targetMaterial.dispose();tracerMaterial.dispose();impactMaterial.dispose();blastMaterial.dispose();smokeMaterial.dispose();reducedBlast.dispose();}};
}
