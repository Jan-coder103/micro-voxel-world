import { BoxGeometry,Color,ConeGeometry,Group,InstancedMesh,Mesh,MeshBasicMaterial,MeshStandardMaterial,Object3D } from 'three';
import type { Point } from '../flight/flight';
import { airbaseParts } from '../world/airbase';

export function createBaseView(seed:number){
  const group=new Group(),geometry=new BoxGeometry(),material=new MeshStandardMaterial({roughness:.95}),parts=airbaseParts(seed),mesh=new InstancedMesh(geometry,material,parts.length),dummy=new Object3D();
  group.name='fortified-apocalypse-base';mesh.castShadow=mesh.receiveShadow=true;
  parts.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new Color(p.color));});group.add(mesh);
  return {group,dispose(){mesh.dispose();geometry.dispose();material.dispose();group.removeFromParent();}};
}
export function createEngineExhaust(){
  const group=new Group(),geometry=new ConeGeometry(1,1,12),flameMaterial=new MeshBasicMaterial({color:'#ff9b38',transparent:true,opacity:.75,depthWrite:false}),coreMaterial=new MeshBasicMaterial({color:'#d4edff',transparent:true,opacity:.9,depthWrite:false}),gasMaterial=new MeshBasicMaterial({color:'#c5cfcb',transparent:true,opacity:.09,depthWrite:false});
  const plume=new Mesh(geometry,flameMaterial),core=new Mesh(geometry,coreMaterial);plume.rotation.x=core.rotation.x=Math.PI/2;group.add(plume,core);group.position.set(0,.1,7.8);
  return {group,update(throttle:number,time:number,enabled:boolean){group.visible=enabled&&throttle>.01;const burning=throttle>=.9,length=burning?7+Math.sin(time*47)*.7:3+throttle*3;plume.material=burning?flameMaterial:gasMaterial;plume.scale.set(burning?.8:.6,length,burning?.8:.6);plume.position.z=length/2;core.visible=burning;core.scale.set(.35,length*.6,.35);core.position.z=length*.3;},dispose(){geometry.dispose();flameMaterial.dispose();coreMaterial.dispose();gasMaterial.dispose();group.removeFromParent();}};
}
/** Two pooled rescue aircraft; routes and landing height are cosmetic only. */
export function createRescueView(){
  const group=new Group(),geometry=new BoxGeometry(),material=new MeshStandardMaterial({color:'#64775f',roughness:.9}),glass=new MeshStandardMaterial({color:'#263b44',roughness:.35}),rotorMaterial=new MeshBasicMaterial({color:'#303830'}),helicopters:{body:Group;rotor:Group;tailRotor:Mesh}[]=[];
  for(let i=0;i<2;i++){
    const body=new Group(),rotor=new Group();group.add(body);helicopters.push({body,rotor,tailRotor:new Mesh(geometry,rotorMaterial)});
    const box=(x:number,y:number,z:number,w:number,h:number,d:number,mat=material)=>{const m=new Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;body.add(m);return m;};
    box(0,0,0,3,2.7,7);box(0,.25,-2.6,2.8,1.7,2,glass);box(0,.6,5.7,.65,.8,6);box(0,1.8,8,.3,2.4,1.4);box(0,2,0,.35,1.7,.35);
    for(const side of [-1,1]){box(side*1.8,-1.8,0,.2,.2,7);for(const z of [-2,2])box(side*1.3,-1.35,z,1.2,.15,.2);box(side*1.52,0,.8,.05,1.5,2.3,glass);}
    rotor.position.y=2.8;body.add(rotor);for(const angle of [0,Math.PI/2]){const blade=new Mesh(geometry,rotorMaterial);blade.scale.set(15,.08,.35);blade.rotation.y=angle;rotor.add(blade);}
    const tail=helicopters[i].tailRotor;tail.position.set(.5,1.8,8);tail.scale.set(.08,3,.2);body.add(tail);
  }
  return {group,update(position:Point,age:number,ground:(x:number,z:number)=>number,visible:boolean){group.visible=visible;if(!visible)return;helicopters.forEach(({body,rotor,tailRotor},i)=>{
    const side=i===0?-1:1,u=Math.min(1,age/8),ease=1-(1-u)**2,x=position.x+side*(240*(1-ease)+24),z=position.z+38+180*(1-ease),land=ground(x,z)+2;
    body.position.set(x,land+90*(1-ease),z);body.rotation.y=side*.35;rotor.rotation.y=age*38;tailRotor.rotation.x=age*48;
  });},dispose(){geometry.dispose();material.dispose();glass.dispose();rotorMaterial.dispose();group.removeFromParent();group.clear();}};
}

export function speedWindOpacity(speed:number,grounded:boolean,paused:boolean,effects:boolean,crashed:boolean){return effects&&!paused&&!grounded&&!crashed?Math.min(.8,Math.max(0,(speed-65)/100)):0;}
