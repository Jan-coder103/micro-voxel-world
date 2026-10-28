import { BoxGeometry,Group,Mesh,MeshStandardMaterial } from 'three';

/** Original block-built lab airframe; metre-scale geometry, not an imported source asset. */
export function createRotorcraft(){
  const group=new Group(),rotor=new Group(),geometry=new BoxGeometry(1,1,1);
  const body=new MeshStandardMaterial({color:'#476b69',roughness:.9}),glass=new MeshStandardMaterial({color:'#253c48',roughness:.65}),metal=new MeshStandardMaterial({color:'#b4aa80',roughness:.9});
  const box=(parent:Group,size:number[],position:number[],material=body)=>{const mesh=new Mesh(geometry,material);mesh.scale.set(size[0],size[1],size[2]);mesh.position.set(position[0],position[1],position[2]);parent.add(mesh);};
  box(group,[2.4,2,5.8],[0,0,0]);box(group,[2.2,1.2,1.8],[0,.35,-2.2],glass);
  box(group,[.6,.6,5],[0,.2,4.4]);box(group,[.3,2,1.4],[0,1,6.4]);
  box(group,[7,.2,1],[0,-.2,.7]);
  for(const x of [-1.5,1.5]){box(group,[.2,.2,5],[x,-1.5,0],metal);box(group,[.15,1,.15],[x,-1,1]);box(group,[.15,1,.15],[x,-1,-1]);}
  box(group,[.25,1,.25],[0,1.4,0],metal);rotor.position.y=1.9;
  box(rotor,[13,.12,.35],[0,0,0],metal);box(rotor,[.35,.12,13],[0,0,0],metal);group.add(rotor);
  let disposed=false;
  return {group,update(ticks:number){rotor.rotation.y=ticks*.45;},dispose(){if(disposed)return;disposed=true;group.removeFromParent();group.clear();geometry.dispose();body.dispose();glass.dispose();metal.dispose();}};
}
export function createWeaponMount(){
  const geometry=new BoxGeometry(.22,.22,1),material=new MeshStandardMaterial({color:'#ceac61',roughness:.8}),group=new Group(),barrel=new Mesh(geometry,material);
  barrel.position.z=.5;group.add(barrel);let disposed=false;
  return {group,dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometry.dispose();material.dispose();group.clear();}};
}
